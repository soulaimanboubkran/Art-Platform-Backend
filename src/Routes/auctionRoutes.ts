import { Router } from 'npm:express';
import { body } from 'npm:express-validator';
import { UserRole } from "../entity/Auth/User.ts";
import { checkForUnexpectedFields, validateRequest } from '../middleware/validationResult.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';
import { AuctionController } from '../controllers/auction/auctionController.ts';
const router = Router();
const auctionController = new AuctionController();


router.get('/auctions', 
    AuthMiddleware.verifyToken,
     AuthMiddleware.authorizeRole(UserRole.ADMIN, UserRole.USER, UserRole.SELLER),
      (req, res, next) => auctionController.getAllAuctions(req, res, next));

      router.get('/auctions/product/:product_id', 
        AuthMiddleware.verifyToken,
         AuthMiddleware.authorizeRole(UserRole.ADMIN, UserRole.USER, UserRole.SELLER),
          (req, res, next) => auctionController.getAuctionsByProductId(req, res, next));

          router.get('/auctions/user/:user_id', 
            AuthMiddleware.verifyToken,
             AuthMiddleware.authorizeRole(UserRole.ADMIN, UserRole.USER, UserRole.SELLER),
              (req, res, next) => auctionController.getAuctionsByUserId(req, res, next));
export default router;