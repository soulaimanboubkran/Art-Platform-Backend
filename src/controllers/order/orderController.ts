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
import { Payment } from "../../entity/Payment.ts";
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
    private paymentRepository = AppDataSource.getRepository(Payment);

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
                    price = bid.amount;
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
            statusHistory.status = "pending";
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
                order: { created_at: "DESC" },
                relations: ["orderItems"]
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

    async updateOrder(req: Request, res: Response, next: NextFunction) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        let isTransactionActive = false;
        
        try {
            const orderId =req.params.orderId;
            const userId = (req.user as any).userId;
            
            // Start transaction
            await queryRunner.startTransaction();
            isTransactionActive = true;
            
            // Find the order
            const order = await queryRunner.manager.findOne(Order, {
                where: { order_id: orderId, user_id: userId }
            });
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }
            
            // Determine which fields can be updated based on current status
            const updateableStatuses = ["pending", "processing", "awaiting_payment"];
            if (!updateableStatuses.includes(order.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Order in '${order.status}' status cannot be updated`
                });
            }
            
            // Extract updatable fields from request body
            const updateData = req.body;
            const allowedFields = ["notes", "shipping_address_id", "billing_address_id"];
            const updateFields: Record<string, any> = {};
            let hasChanges = false;
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined && updateData[field] !== order[field]) {
                    updateFields[field] = updateData[field];
                    hasChanges = true;
                }
            }
            
            if (!hasChanges) {
                return res.status(400).json({
                    success: false,
                    message: "No valid changes submitted"
                });
            }
            
            // Update order
            updateFields.updated_at = new Date();
            await queryRunner.manager.update(Order, orderId, updateFields);
            
            // Create status history entry
            const statusHistory = new OrderStatusHistory();
            statusHistory.order_id = orderId;
            statusHistory.status = order.status; // Same status, just updating details
            statusHistory.changed_at = new Date();
            statusHistory.changed_by_user_id = userId;
            statusHistory.notes =  "Order details updated";
            
            await queryRunner.manager.save(statusHistory);
            
            // Commit transaction
            await queryRunner.commitTransaction();
            
            return res.status(200).json({
                success: true,
                message: "Order updated successfully",
                data: {
                    order_id: orderId,
                    ...updateFields
                }
            });
            
        } catch (error) {
            // Rollback transaction on error
            if (isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            
            console.error("Error updating order:", error);
            
            return res.status(500).json({
                success: false,
                message: "Failed to update order",
                error: error.message
            });
            
        } finally {
            // Release query runner
            await queryRunner.release();
        }
    }

    async requestCancelOrder(req: Request, res: Response, next: NextFunction) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        let isTransactionActive = false;
        
        try {
            const orderId = parseInt(req.params.orderId);
            const userId = (req.user as any).userId;
            const cancelReason = req.body.reason || "Customer requested cancellation";
            
            // Start transaction
            await queryRunner.startTransaction();
            isTransactionActive = true;
            
            // Find the order
            const order = await queryRunner.manager.findOne(Order, {
                where: { order_id: orderId, user_id: userId }
            });
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }
            
            // Check if order can be cancelled
            const cancellableStatuses = ["pending", "processing", "awaiting_payment"];
            if (!cancellableStatuses.includes(order.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Order in '${order.status}' status cannot be cancelled`
                });
            }
            
            // For recently created orders with no payment, allow automatic cancellation
            const orderCreatedTime = new Date(order.created_at).getTime();
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - orderCreatedTime;
            const isRecentOrder = timeDifference < 15 * 60 * 1000; // 15 minutes
            
            if (isRecentOrder && order.payment_status === "awaiting_payment") {
                // Update order status directly
                await queryRunner.manager.update(Order, orderId, {
                    status: "cancelled",
                    updated_at: new Date()
                });
                
                // Create status history entry
                const statusHistory = new OrderStatusHistory();
                statusHistory.order_id = orderId;
                statusHistory.status = "cancelled";
                statusHistory.changed_at = new Date();
                statusHistory.changed_by_user_id = userId;
                statusHistory.notes = cancelReason;
                
                await queryRunner.manager.save(statusHistory);
                
                // Handle inventory restoration
                const orderItems = await queryRunner.manager.find(OrderItem, {
                    where: { order_id: orderId, is_auction_win: false }
                });
                
                for (const item of orderItems) {
                    if (item.inventory_id) {
                        // Restore inventory for regular purchases
                        await queryRunner.manager.increment(
                            Inventory,
                            { inventory_id: item.inventory_id },
                            "quantity",
                            item.quantity
                        );
                    }
                }
                
                // Commit transaction
                await queryRunner.commitTransaction();
                
                return res.status(200).json({
                    success: true,
                    message: "Order cancelled successfully",
                    data: {
                        order_id: orderId,
                        status: "cancelled",
                        reason: cancelReason
                    }
                });
            } else {
                // Update order status to cancellation_requested
                await queryRunner.manager.update(Order, orderId, {
                    status: "cancellation_requested",
                    updated_at: new Date()
                });
                
                // Create status history entry
                const statusHistory = new OrderStatusHistory();
                statusHistory.order_id = orderId;
                statusHistory.status = "cancellation_requested";
                statusHistory.changed_at = new Date();
                statusHistory.changed_by_user_id = userId;
                statusHistory.notes = cancelReason;
                
                await queryRunner.manager.save(statusHistory);
                
                // Commit transaction
                await queryRunner.commitTransaction();
                
                return res.status(200).json({
                    success: true,
                    message: "Cancellation requested. Awaiting seller review.",
                    data: {
                        order_id: orderId,
                        status: "cancellation_requested",
                        reason: cancelReason
                    }
                });
            }
            
        } catch (error) {
            // Rollback transaction on error
            if (isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            
            console.error("Error requesting order cancellation:", error);
            
            return res.status(500).json({
                success: false,
                message: "Failed to request order cancellation",
                error: error.message
            });
            
        } finally {
            // Release query runner
            await queryRunner.release();
        }
    }
    
    // Admin/Seller endpoint to approve or reject cancellation requests
    async processCancellationRequest(req: Request, res: Response, next: NextFunction) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        
        let isTransactionActive = false;
        
        try {
            const orderId = req.params.orderId;
            const sellerId = (req.user as any).userId;
            const { approved, notes } = req.body;
            
            // Start transaction
            await queryRunner.startTransaction();
            isTransactionActive = true;
            
            // Find the order with a more efficient query
            const order = await queryRunner.manager.findOne(Order, {
                where: { order_id: orderId, status: "cancellation_requested" },
                select: ["order_id", "user_id", "status"] // Only select fields we need
            });
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found or not in cancellation_requested status"
                });
            }
            
            if (approved) {
                // Approve cancellation
                await queryRunner.manager.update(Order, orderId, {
                    status: "cancelled",
                    updated_at: new Date()
                });
                
                // Create status history entry
                const statusHistory = new OrderStatusHistory();
                statusHistory.order_id = orderId;
                statusHistory.status = "cancelled";
                statusHistory.changed_at = new Date();
                statusHistory.changed_by_user_id = sellerId;
                statusHistory.notes = notes || "Cancellation request approved by seller";
                
                await queryRunner.manager.save(statusHistory);
                
                // Handle inventory restoration
                const orderItems = await queryRunner.manager.find(OrderItem, {
                    where: { order_id: orderId, is_auction_win: false }
                });
                
                for (const item of orderItems) {
                    if (item.inventory_id) {
                        // Restore inventory for regular purchases
                        await queryRunner.manager.increment(
                            Inventory,
                            { inventory_id: item.inventory_id },
                            "quantity",
                            item.quantity
                        );
                    }
                }
                
                // Process refunds if payment was made
                const payments = await queryRunner.manager.find(Payment, {
                    where: { order_id: orderId, status: "completed" }
                });
                
                for (const payment of payments) {
                    // Create refund record
                    const refund = new Payment();
                    refund.order_id = orderId;
                    refund.user_id = order.user_id;
                    refund.amount = payment.amount;
                    refund.currency = payment.currency;
                    refund.payment_method = payment.payment_method;
                    refund.transaction_type = "refund";
                    refund.reference_id = payment.payment_id.toString();
                    refund.status = "processing";
                    refund.notes = `Refund for cancelled order #${orderId}`;
                    
                    await queryRunner.manager.save(refund);
                }
                
                // Commit transaction
                await queryRunner.commitTransaction();
                
                return res.status(200).json({
                    success: true,
                    message: "Cancellation request approved",
                    data: {
                        order_id: orderId,
                        status: "cancelled",
                        refunds_initiated: payments?.length > 0
                    }
                });
            } else {
                // Reject cancellation
                await queryRunner.manager.update(Order, orderId, {
                    status: order.previous_status || "processing", // Revert to previous status
                    updated_at: new Date()
                });
                
                // Create status history entry
                const statusHistory = new OrderStatusHistory();
                statusHistory.order_id = orderId;
                statusHistory.status = "cancellation_rejected";
                statusHistory.changed_at = new Date();
                statusHistory.changed_by_user_id = sellerId;
                statusHistory.notes = notes || "Cancellation request rejected by seller";
                
                await queryRunner.manager.save(statusHistory);
                
                // Commit transaction
                await queryRunner.commitTransaction();
                
                return res.status(200).json({
                    success: true,
                    message: "Cancellation request rejected",
                    data: {
                        order_id: orderId,
                        status: order.previous_status || "processing"
                    }
                });
            }
            
        } catch (error) {
            // Rollback transaction on error
            if (isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            
            console.error("Error processing cancellation request:", error);
            
            return res.status(500).json({
                success: false,
                message: "Failed to process cancellation request",
                error: error.message
            });
            
        } finally {
            // Release query runner
            await queryRunner.release();
        }
    }
}