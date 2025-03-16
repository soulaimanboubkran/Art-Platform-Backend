import { Request, Response, NextFunction } from 'npm:express';
import { DataSource, Repository, Like, FindOptionsWhere, In, Not } from "npm:typeorm@0.3.20";
import { Product } from "../../entity/Product.ts";
import { Auction } from "../../entity/Auction.ts";
import { Bid } from "../../entity/Bid.ts";
import slugify from "npm:slugify@1.6.6";
import { AppDataSource } from '../../database.ts';

export class BidController {
    private productRepository = AppDataSource.getRepository(Product);
    private bidRepository = AppDataSource.getRepository(Bid);
    private productAuctionRepository = AppDataSource.getRepository(Auction);
    async createBid(req: Request, res: Response, next: NextFunction) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        let isTransactionActive = false;
        
        try {
            await queryRunner.startTransaction();
            isTransactionActive = true;
            
            const userId = (req as any).user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }
            
            const {
                auction_id,
                product_id,
                amount,
                is_auto_bid,
                max_auto_bid_amount,
                ip_address,
                device_info
            } = req.body;
            
            // Parse amounts as numbers upfront with validation
            const numericAmount = Number(amount);
            const numericMaxAmount = is_auto_bid ? Number(max_auto_bid_amount) : null;
            
            if (isNaN(numericAmount)) {
                return res.status(400).json({ 
                    message: "Bid amount must be a valid number" 
                });
            }
            
            if (is_auto_bid && (numericMaxAmount === null || isNaN(numericMaxAmount))) {
                return res.status(400).json({ 
                    message: "For auto-bidding, a valid maximum amount must be specified" 
                });
            }
            
            // Validate auction and product
            const auction = await this.productAuctionRepository.findOne({ 
                where: { auction_id } 
            });
            
            if (!auction) {
                return res.status(404).json({ message: "Auction not found" });
            }
            
            // Check if the auction has ended
            if (auction.end_time < new Date()) {
                return res.status(400).json({ message: "Auction has ended" });
            }
            
            const product = await this.productRepository.findOne({ 
                where: { product_id, is_auction: true } 
            });
            
            if (!product) {
                return res.status(404).json({ message: "Product not found or is not available for auction" });
            }
            
            if (auction.product_id !== product_id) {
                return res.status(400).json({ message: "Product is not part of this auction" });
            }
            
            // Get current highest bid
            const highestBid = await this.bidRepository.findOne({
                where: { product_id, is_winning: true },
                order: { amount: "DESC" }
            });
            
            const currentHighestAmount = highestBid ? Number(highestBid.amount) : 0;
            const minimumBidAmount = highestBid 
                ? currentHighestAmount + Number(auction.min_bid_increment)
                : Number(auction.starting_price);
            
            // Validate bid amount - must be at least the minimum
            if (numericAmount < minimumBidAmount) {
                return res.status(400).json({ 
                    message: `Bid amount must be at least ${minimumBidAmount}`,
                    current_highest_bid: currentHighestAmount || null,
                    minimum_bid_required: minimumBidAmount
                });
            }
            
            // Validate auto-bid setup
            if (is_auto_bid && numericAmount > numericMaxAmount) {
                return res.status(400).json({ 
                    message: "Initial bid amount cannot exceed the maximum auto-bid amount" 
                });
            }
            
            // Check if this is the user's own highest bid
            if (highestBid && highestBid.user_id === userId) {
                // Handle updating max auto-bid amount for existing bids
                if (is_auto_bid && highestBid.is_auto_bid) {
                    const currentMaxAmount = Number(highestBid.max_auto_bid_amount);
                    
                    if (numericMaxAmount > currentMaxAmount) {
                        highestBid.max_auto_bid_amount = numericMaxAmount;
                        await queryRunner.manager.save(highestBid);
                        
                        await queryRunner.commitTransaction();
                        isTransactionActive = false;
                        
                        return res.status(200).json({ 
                            message: "Auto-bid maximum amount updated successfully",
                            is_winning: true,
                            bid_id: highestBid.bid_id
                        });
                    }
                }
                
                return res.status(400).json({ 
                    message: "You already have the highest bid for this product" 
                });
            }
            
            // Find or create user bid
            const existingBid = await this.bidRepository.findOne({
                where: {
                    auction_id,
                    product_id,
                    user_id: userId
                }
            });
    
            // Prepare user's bid (update existing or create new) with EXACT amount
            let userBid;
            if (existingBid) {
                existingBid.amount = numericAmount; // Use exact amount provided by user
                existingBid.is_auto_bid = is_auto_bid;
                existingBid.max_auto_bid_amount = is_auto_bid ? numericMaxAmount : null;
                existingBid.ip_address = ip_address;
                existingBid.device_info = device_info;
                existingBid.is_winning = true;
                userBid = existingBid;
            } else {
                userBid = this.bidRepository.create({
                    auction_id,
                    product_id,
                    user_id: userId,
                    amount: numericAmount, // Use exact amount provided by user
                    is_auto_bid,
                    max_auto_bid_amount: is_auto_bid ? numericMaxAmount : null,
                    ip_address,
                    device_info,
                    is_winning: true
                });
            }
            
            // Mark previous highest bid as not winning
            if (highestBid) {
                highestBid.is_winning = false;
                highestBid.outbid_notified = false;
                await queryRunner.manager.save(highestBid);
            }
            
            // Save the new or updated bid with EXACT amount
            await queryRunner.manager.save(userBid);
            
            // Update the auction with the new highest bid information
            auction.current_highest_bid = numericAmount; // Use exact amount
            auction.current_highest_bidder = userId;
            auction.bid_count = auction.bid_count ? auction.bid_count + 1 : 1;
            await queryRunner.manager.save(auction);
            
            // Commit the transaction
            await queryRunner.commitTransaction();
            isTransactionActive = false;
            
            // Send response immediately with exact bid amount
            res.status(201).json({ 
                message: "Bid placed successfully.",
                is_winning: true,
                bid_id: userBid.bid_id,
                bid_amount: numericAmount // Return exact amount back to client
            });
            
            // Notify the user if they reached their max auto-bid amount
            if (is_auto_bid && numericAmount >= numericMaxAmount) {
                this.notifyUser(userId, "You have reached your maximum auto-bid amount.");
            }
            
        } catch (error) {
            console.error("Error in createBid:", error);
            if (isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            
            // Avoid sending response if it's already sent
            if (!res.headersSent) {
                res.status(500).json({ message: "Internal server error" });
            }
        } finally {
            await queryRunner.release();
        }
    }

    async checkBidStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req as any).user?.userId;
            if (!userId) {
                return res.status(401).json({ message: "Authentication required" });
            }

            const { bid_id } = req.params;

            const bid = await this.bidRepository.findOne({
                where: { bid_id, user_id: userId }
            });

            if (!bid) {
                return res.status(404).json({ message: "Bid not found" });
            }

            // Get highest bid for product
            const highestBid = await this.bidRepository.findOne({
                where: { product_id: bid.product_id, is_winning: true }
            });

            const isWinning = highestBid?.bid_id === bid.bid_id;

            res.status(200).json({
                bid_id: bid.bid_id,
                product_id: bid.product_id,
                amount: bid.amount,
                is_auto_bid: bid.is_auto_bid,
                max_auto_bid_amount: bid.max_auto_bid_amount,
                is_winning: isWinning,
                bid_time: bid.bid_time,
                highest_bid: highestBid ? highestBid.amount : null,
                highest_bidder_id: highestBid ? highestBid.user_id : null
            });
        } catch (error) {
            console.error(error);
            next(error);
        }
    }

    async declareWinner(auction_id: string) {
        const auction = await this.productAuctionRepository.findOne({ where: { auction_id } });

        if (!auction) {
            throw new Error("Auction not found");
        }

        const highestBid = await this.bidRepository.findOne({
            where: { auction_id, is_winning: true },
            order: { amount: "DESC" }
        });

        if (highestBid) {
            auction.winner_id = highestBid.user_id;
            auction.is_closed = true;
            await this.productAuctionRepository.save(auction);

            // Notify the winner and seller
            this.notifyWinner(highestBid.user_id, auction_id);
            this.notifySeller(auction.seller_id, auction_id);
        } else {
            auction.winner_id = null; // No winner
            auction.is_closed = true;
            await this.productAuctionRepository.save(auction);
        }
    }

    // Method for background job to process all pending auto-bids 
    async processAllPendingAutoBids() {
        try {
            // Get all products with active auctions that may need auto-bid processing
            const activeAuctions = await this.productAuctionRepository.find({
                where: { end_time: { $gt: new Date() } }
            });

            let processedCount = 0;

            for (const auction of activeAuctions) {
                // Get products in this auction
                const products = await this.productRepository.find({
                    where: { auction_id: auction.auction_id, is_auction: true }
                });

                for (const product of products) {
                    // Process auto-bids for this product
                    await this.processAutoBids(product.product_id, auction.auction_id);
                    processedCount++;
                }
            }

            return { processedCount };
        } catch (error) {
            console.error("Error processing pending auto-bids:", error);
            throw error;
        }
    }

    async getBidsByUserId(req: Request, res: Response, next: NextFunction) {
        const { user_id } = req.params;
        const { page = 1, limit = 10, active } = req.query; // Default: page 1, limit 10

        try {
            const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
            const take = Number(limit); // Number of records per page

            // Define the base query
            const where: any = { user_id };

            // If "active" is true, filter for active bids (where is_winning is true)
            if (active === "true") {
                where.is_winning = true;
                where.is_auto_bid = true; 
            }

            const [bids, total] = await this.bidRepository.findAndCount({
                where,
                skip,
                take,
            });

            if (bids.length === 0) {
                return res.status(404).json({ message: "No bids found for this user" });
            }

            return res.status(200).json({
                bids,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            });
        } catch (error) {
            console.error("Error fetching bids by user ID:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    async getBidsByProductId(req: Request, res: Response, next: NextFunction) {
        const { product_id } = req.params;
        const { page = 1, limit = 10 } = req.query; // Default: page 1, limit 10
    
        try {
            const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
            const take = Number(limit); // Number of records per page
    
            const [bids, total] = await this.bidRepository.findAndCount({
                where: { product_id },
                skip,
                take,
            });
    
            if (bids.length === 0) {
                return res.status(404).json({ message: "No bids found for this product" });
            }
    
            return res.status(200).json({
                bids,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            });
        } catch (error) {
            console.error("Error fetching bids by product ID:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    // Get a single bid with relations (auction, product, user)
    async getBidWithRelations(req: Request, res: Response, next: NextFunction) {
        const { bid_id } = req.params;
    
        try {
            const bid = await this.bidRepository.findOne({
                where: { bid_id },
                relations: ["auction", "product", "user"], // Load relations here
                select: ["auction", "product", "user"], // Select only the relations
            });
    
            if (!bid) {
                return res.status(404).json({ message: "Bid not found" });
            }
    
            // Extract and return only the relations
            const { auction, product, user } = bid;
            return res.status(200).json({ auction, product, user });
        } catch (error) {
            console.error("Error fetching bid relations:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}