import { Request, Response, NextFunction } from 'npm:express';
import { DataSource, Repository, Like, FindOptionsWhere, In, Not } from "npm:typeorm@0.3.20";
import { Auction } from "../../entity/Auction.ts";

import slugify from "npm:slugify@1.6.6";
import { AppDataSource } from '../../database.ts';

export class AuctionController {

    private productAuctionRepository = AppDataSource.getRepository(Auction);

    async getAuctionsByProductId(req: Request, res: Response, next: NextFunction) {
        const { product_id } = req.params;
        const { page = 1, limit = 10 } = req.query; // Default: page 1, limit 10
    
        try {
            const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
            const take = Number(limit); // Number of records per page
    
            const [auctions, total] = await this.productAuctionRepository.findAndCount({
                where: { product_id }, 
                relations: ["product", "highestBidder"],
                skip,
                take,
            });
    
            if (auctions.length === 0) {
                return res.status(404).json({ message: "No auctions found for this product" });
            }
    
            return res.status(200).json({
                auctions,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            });
        } catch (error) {
            console.error("Error fetching auctions by product ID:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    async getAuctionsByUserId(req: Request, res: Response, next: NextFunction) {
        const { user_id } = req.params;
        const { page = 1, limit = 10 } = req.query; // Default: page 1, limit 10
    
        try {
            const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
            const take = Number(limit); // Number of records per page
    
            const [auctions, total] = await this.productAuctionRepository.findAndCount({
                where: { current_highest_bidder: user_id },
                relations: ["product", "highestBidder"],
                skip,
                take,
            });
    
            if (auctions.length === 0) {
                return res.status(404).json({ message: "No auctions found for this user" });
            }
    
            return res.status(200).json({
                auctions,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            });
        } catch (error) {
            console.error("Error fetching auctions by user ID:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    async getAllAuctions(req: Request, res: Response, next: NextFunction) {
        const { page = 1, limit = 10 } = req.query; // Default: page 1, limit 10
    
        try {
            const skip = (Number(page) - 1) * Number(limit); // Calculate skip value
            const take = Number(limit); // Number of records per page
    
            const [auctions, total] = await this.productAuctionRepository.findAndCount({
                relations: ["product", "highestBidder"],
                skip,
                take,
            });
    
            if (auctions.length === 0) {
                return res.status(404).json({ message: "No auctions found" });
            }
    
            return res.status(200).json({
                auctions,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            });
        } catch (error) {
            console.error("Error fetching all auctions:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

}