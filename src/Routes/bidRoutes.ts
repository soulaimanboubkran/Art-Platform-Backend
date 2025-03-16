import { Router } from 'npm:express';
import { body } from 'npm:express-validator';
import { UserRole } from "../entity/Auth/User.ts";
import { BidController } from '../controllers/bid/bidController.ts'; // Assuming you have a BidController
import { checkForUnexpectedFields, validateRequest } from '../middleware/validationResult.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';

const router = Router();
const bidController = new BidController();

router.post(
    '/bid',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.SELLER, UserRole.ADMIN, UserRole.USER),
    [
        // Required fields
        body('auction_id').isUUID().withMessage('Auction ID must be a valid UUID'),
        body('product_id').isUUID().withMessage('Product ID must be a valid UUID'),
        body('user_id').isUUID().withMessage('User ID must be a valid UUID'),
        body('amount').isDecimal().withMessage('Amount must be a valid decimal number'),

        // Optional fields with validation
        body('is_auto_bid').optional().isBoolean().withMessage('is_auto_bid must be a boolean'),
        body('max_auto_bid_amount').optional().isDecimal().withMessage('max_auto_bid_amount must be a valid decimal number'),
        body('ip_address').optional().isIP().withMessage('ip_address must be a valid IP address'),
        body('device_info').optional().isString().withMessage('device_info must be a string'),

        // Fields with default values (no validation needed as they are set server-side)
        // is_winning, outbid_notified, bid_time are managed by the server
    ],
    checkForUnexpectedFields([
        'auction_id', 'product_id', 'user_id', 'amount', 'is_auto_bid', 
        'max_auto_bid_amount', 'ip_address', 'device_info'
    ]),
    validateRequest,
    (req, res, next) => bidController.createBid(req, res, next)
);

export default router;