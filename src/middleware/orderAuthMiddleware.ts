// orderAuthMiddleware.ts
import { Request, Response, NextFunction } from "npm:express";
import { getRepository } from "npm:typeorm@0.3.20";
import { Order } from "../entity/Order.ts";
import { Product } from "../entity/Product.ts";
import { OrderItem } from "../entity/OrderItem.ts";
import { UserRole } from "../entity/Auth/User.ts";

export class OrderAuthMiddleware {
  /**
   * Middleware to verify if the order belongs to the authenticated seller
   * This middleware checks if any products in the order belong to the seller
   */
  static async isOrderSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: "Unauthorized: Please log in" });
        return;
      }
      
      // Get the order ID from params
      const orderId = req.params.orderId || req.params.order_id;
      
      if (!orderId) {
        res.status(400).json({ message: "Order ID is required" });
        return;
      }
      
      // Admin users can access any order
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }
      
      // For sellers, verify order belongs to them
      if (user.role === UserRole.SELLER) {
        // Use a more efficient query to check if any products in the order belong to this seller
        const orderItemRepository = getRepository(OrderItem);
        const count = await orderItemRepository
          .createQueryBuilder("orderItem")
          .innerJoin("orderItem.product", "product")
          .where("orderItem.order_id = :orderId", { orderId })
          .andWhere("product.seller_id = :sellerId", { sellerId: user.userId })
          .getCount();
        
        if (count > 0) {
          // At least one product in the order belongs to this seller
          next();
        } else {
          res.status(403).json({ 
            message: "Forbidden: You don't have permission to manage this order" 
          });
        }
        return;
      }
      
      // If user is not a seller or admin
      res.status(403).json({ message: "Forbidden: Only sellers can manage orders" });
      
    } catch (error) {
      console.error("Error in order authorization middleware:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}