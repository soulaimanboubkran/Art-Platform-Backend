import { Request, Response, NextFunction } from 'npm:express';
import { DataSource, Repository, Like, FindOptionsWhere, In, Not } from "npm:typeorm@0.3.20";
import { Product } from "../../entity/Product.ts";
import { Order } from "../../entity/Order.ts";
import { OrderItem } from "../../entity/OrderItem.ts";
import { OrderStatusHistory } from "../../entity/OrderStatusHistory.ts";
import { Inventory } from "../../entity/Inventory.ts";
import { Bid } from "../../entity/Bid.ts";
import { AppDataSource } from '../../database.ts';
import { User } from "../../entity/Auth/User.ts";

interface OrderItemRequest {
  product_id: string;
  quantity: number;
  is_auction_win: boolean;
  bid_id?: number;
}

interface CreateOrderRequest {
  user_id: string;
  shipping_address_id: number;
  billing_address_id: number;
  items: OrderItemRequest[];
  notes?: string;
  currency: string;
  source: string;
}

export class OrderController {
    private productRepository = AppDataSource.getRepository(Product);
    private orderRepository = AppDataSource.getRepository(Order);
    private orderItemRepository = AppDataSource.getRepository(OrderItem);
    private orderStatusHistoryRepository = AppDataSource.getRepository(OrderStatusHistory);
    private inventoryRepository = AppDataSource.getRepository(Inventory);
    private bidRepository = AppDataSource.getRepository(Bid);
    private userRepository = AppDataSource.getRepository(User);

    async createOrder(req: Request, res: Response, next: NextFunction) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        let isTransactionActive = false;

        try {
            // Validate request body
            const orderData = req.body as CreateOrderRequest;
            
            if (!orderData.items || !orderData.items.length) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Order must contain at least one item" 
                });
            }
            
            // Start transaction
            await queryRunner.startTransaction();
            isTransactionActive = true;
            
            // Verify user exists
            const userId = (req as any).user?.userId;
            if (!userId) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Unauthorized" 
                });
            }
            
            // Create new order
            const newOrder = new Order();
            newOrder.user_id = userId;
            newOrder.status = "pending";
            newOrder.shipping_address_id = orderData.shipping_address_id;
            newOrder.billing_address_id = orderData.billing_address_id;
            newOrder.payment_status = "awaiting_payment";
            newOrder.currency = orderData.currency;
            newOrder.notes = orderData.notes || null;
            newOrder.source = orderData.source;
            newOrder.shipping_cost = 0; // Will be calculated
            newOrder.tax_amount = 0; // Will be calculated
            newOrder.total_amount = 0; // Will be calculated
            
            // Save order to get ID
            const savedOrder = await queryRunner.manager.save(newOrder);
            
            // Process order items
            let totalAmount = 0;
            let taxAmount = 0;
            
            for (const item of orderData.items) {
                // Get product
                const product = await queryRunner.manager.findOne(Product, {
                    where: { product_id: item.product_id }
                });
                
                if (!product) {
                    throw new Error(`Product not found: ${item.product_id}`);
                }
                
                let price: number;
                let orderItem = new OrderItem();
                orderItem.order_id = savedOrder.order_id;
                orderItem.product_id = product.product_id;
                orderItem.quantity = item.quantity;
                orderItem.is_auction_win = item.is_auction_win;
                orderItem.status = "pending";
                
                // Handle auction win vs regular purchase
                if (item.is_auction_win) {
                    if (!item.bid_id) {
                        throw new Error("Bid ID required for auction purchases");
                    }
                    
                    const bid = await queryRunner.manager.findOne(Bid, {
                        where: { bid_id: item.bid_id }
                    });
                    
                    if (!bid) {
                        throw new Error(`Bid not found: ${item.bid_id}`);
                    }
                    
                    // Verify this is the winning bid
                    // Additional auction verification logic here
                    
                    orderItem.bid_id = item.bid_id;
                    price = bid.bid_amount;
                } else {
                    // Regular purchase - check inventory
                    const inventory = await queryRunner.manager.findOne(Inventory, {
                        where: { product_id: product.product_id, quantity: In([item.quantity, Not(0)]) }
                    });
                    
                    if (!inventory || inventory.quantity < item.quantity) {
                        throw new Error(`Insufficient inventory for product: ${product.title}`);
                    }
                    
                    // Update inventory
                    inventory.quantity -= item.quantity;
                    await queryRunner.manager.save(inventory);
                    
                    // Store inventory reference
                    orderItem.inventory_id = inventory.inventory_id;
                    price = product.base_price;
                }
                
                // Calculate item amounts
                orderItem.price_at_purchase = price;
                orderItem.subtotal = price * item.quantity;
                
                // Calculate tax (e.g., 8%)
                const itemTax = orderItem.subtotal * 0.08;
                orderItem.tax_amount = itemTax;
                orderItem.discount_amount = 0; // Apply discounts if any
                
                // Save order item
                await queryRunner.manager.save(orderItem);
                
                // Update totals
                totalAmount += orderItem.subtotal;
                taxAmount += itemTax;
            }
            
            // Calculate shipping cost (simplified example)
            const shippingCost = 15; // Could be based on weight, location, etc.
            
            // Update order with totals
            savedOrder.shipping_cost = shippingCost;
            savedOrder.tax_amount = taxAmount;
            savedOrder.total_amount = totalAmount + taxAmount + shippingCost;
            
            await queryRunner.manager.save(savedOrder);
            
            // Create order status history
            const statusHistory = new OrderStatusHistory();
            statusHistory.order_id = savedOrder.order_id;
            statusHistory.status = "created";
            statusHistory.changed_at = new Date();
            statusHistory.changed_by_user_id = userId;
            statusHistory.notes = "Order created";
            
            await queryRunner.manager.save(statusHistory);
            
            // Commit transaction
            await queryRunner.commitTransaction();
            
            return res.status(201).json({
                success: true,
                message: "Order created successfully",
                data: {
                    order_id: savedOrder.order_id,
                    total_amount: savedOrder.total_amount,
                    status: savedOrder.status,
                    payment_status: savedOrder.payment_status
                }
            });
            
        } catch (error) {
            // Rollback transaction on error
            if (isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            
            console.error("Error creating order:", error);
            
            return res.status(500).json({
                success: false,
                message: "Failed to create order",
                error: error.message
            });
            
        } finally {
            // Release query runner
            await queryRunner.release();
        }
    }

    // Add more methods for order management
    async getOrders(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.params.userId || (req.user as any).user_id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const status = req.query.status as string;
            
            const skip = (page - 1) * limit;
            
            const whereClause: any = { user_id: userId };
            
            if (status) {
                whereClause.status = status;
            }
            
            const [orders, total] = await this.orderRepository.findAndCount({
                where: whereClause,
                skip,
                take: limit,
                order: { created_at: "DESC" }
            });
            
            return res.json({
                success: true,
                data: orders,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            });
            
        } catch (error) {
            console.error("Error fetching orders:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch orders",
                error: error.message
            });
        }
    }
    
    async getOrderById(req: Request, res: Response, next: NextFunction) {
        try {
            const orderId = parseInt(req.params.orderId);
            const userId = (req.user as any).user_id;
            
            const order = await this.orderRepository.findOne({
                where: { order_id: orderId, user_id: userId }
            });
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }
            
            // Get order items
            const orderItems = await this.orderItemRepository.find({
                where: { order_id: orderId },
                relations: ["product"]
            });
            
            // Get order history
            const orderHistory = await this.orderStatusHistoryRepository.find({
                where: { order_id: orderId },
                order: { changed_at: "DESC" }
            });
            
            return res.json({
                success: true,
                data: {
                    ...order,
                    items: orderItems,
                    history: orderHistory
                }
            });
            
        } catch (error) {
            console.error("Error fetching order:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch order details",
                error: error.message
            });
        }
    }
}