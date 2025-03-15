import { Request, Response, NextFunction } from "npm:express";
import jwt from "npm:jsonwebtoken";
import { UserRole } from "../entity/Auth/User.ts"; // Make sure to import UserRole from your entity
export class AuthMiddleware {
  static verifyToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }
  
    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded: any) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }
  
      // Attach the decoded user information to req.user
      (req as any).user = decoded;
      console.log("Decoded user:", (req as any).user); // Debugging
      next();
    });
  }

  static authorizeRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): any => {
      const user = (req as any).user;

      if (!user || !allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "You do not have permission to perform this action" });
      }

      next();
    };
  }
}