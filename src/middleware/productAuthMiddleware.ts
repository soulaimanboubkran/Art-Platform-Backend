// productAuthMiddleware.ts
import { Request, Response, NextFunction } from "npm:express";
import { getRepository } from "npm:typeorm@0.3.20";
import { Product } from "../entity/Product.ts";
import { UserRole } from "../entity/Auth/User.ts";

export class ProductAuthMiddleware {
  /**
   * Middleware to verify if the product belongs to the authenticated seller
   * This middleware expects the product_id to be in the URL parameters and
   * the authenticated user information to be in req.user
   */
  static async isProductOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is authenticated
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ message: "Unauthorized: Please log in" });
        return;
      }

      // Get the product ID from params
      const productId = req.params.product_id || req.params.id;
      
      if (!productId) {
        res.status(400).json({ message: "Product ID is required" });
        return;
      }

      // Admin users can access any product
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }
      
      // For sellers, verify product ownership
      if (user.role === UserRole.SELLER) {
        const productRepository = getRepository(Product);
        const product = await productRepository.findOne({ 
          where: { product_id: productId } 
        });
        
        if (!product) {
          res.status(404).json({ message: "Product not found" });
          return;
        }
        
        // Check if the product belongs to the seller
        if (product.seller_id === user.userId) {
          next(); // Continue to the next middleware/handler
        } else {
          res.status(403).json({ 
            message: "Forbidden: You don't have permission to access this product" 
          });
        }
        return;
      }
      
      // If user is not a seller or admin
      res.status(403).json({ message: "Forbidden: Only sellers can manage products" });
      
    } catch (error) {
      console.error("Error in product authorization middleware:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}