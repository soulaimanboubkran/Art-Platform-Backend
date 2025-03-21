import { Router } from 'npm:express';
import { body, checkSchema, param } from 'npm:express-validator';
import { UserRole } from "../entity/Auth/User.ts";
import { OrderController } from '../controllers/order/orderController.ts';
import { checkForUnexpectedFields, validateRequest } from '../middleware/validationResult.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';
import { ProductAuthMiddleware } from '../middleware/productAuthMiddleware.ts';
import { OrderAuthMiddleware } from '../middleware/orderAuthMiddleware.ts';
const router = Router();
const orderController = new OrderController();

// Create Order
router.post(
    '/orders',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.SELLER, UserRole.ADMIN, UserRole.USER),
    [
        // Basic order validation
       
        
        body('shipping_address_id')
            .isUUID().withMessage('shipping_address_id must be a string')
            .notEmpty().withMessage('shipping_address_id is required'),
        
        body('billing_address_id')
            .isUUID().withMessage('billing_address_id must be a string')
            .notEmpty().withMessage('billing_address_id is required'),
        
        body('currency')
            .isString().withMessage('currency must be a string')
            .isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-character code')
            .notEmpty().withMessage('currency is required'),
        
        body('source')
            .isString().withMessage('source must be a string')
            .isIn(['web', 'mobile', 'api', 'admin']).withMessage('source must be one of: web, mobile, api, admin')
            .notEmpty().withMessage('source is required'),
        
        body('notes')
            .optional()
            .isString().withMessage('notes must be a string')
            .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters'),
        
        // Order items validation
        body('items')
            .isArray().withMessage('items must be an array')
            .notEmpty().withMessage('At least one item is required')
            .custom((items) => {
                if (items.length === 0) {
                    throw new Error('At least one item is required');
                }
                return true;
            }),
        
        body('items.*.product_id')
            .isUUID().withMessage('product_id must be a valid UUID')
            .notEmpty().withMessage('product_id is required for each item'),
        
        body('items.*.quantity')
            .isInt({ min: 1 }).withMessage('quantity must be a positive integer')
            .notEmpty().withMessage('quantity is required for each item'),
        body('items.*.is_auction_win')
            .isBoolean().withMessage('is_auction_win must be a boolean value')
            .notEmpty().withMessage('is_auction_win is required for each item'),
        // Conditional validation for auction wins
        body('items.*.bid_id')
        .custom((bidId, { req, path }) => {
            const pathParts = path.split('.');
            const index = parseInt(pathParts[1]);
            
            // Safely check if items array and index exist
            if (req.body.items && req.body.items[index]) {
                const isAuctionWin = req.body.items[index].is_auction_win;
                
                if (isAuctionWin && !bidId) {
                    throw new Error('bid_id is required when is_auction_win is true');
                }
            }
            return true;
        })
        .optional({ nullable: false })
        .isUUID().withMessage('bid_id must be a valid UUID'),
    ],
    checkForUnexpectedFields([
        'user_id', 
        'shipping_address_id', 
        'billing_address_id', 
        'items', 
        'notes', 
        'currency', 
        'source',
        'items.*.product_id',
        'items.*.quantity',
        'items.*.is_auction_win',
        'items.*.bid_id'
    ]),
    validateRequest,
    (req, res, next) => orderController.createOrder(req, res, next)
);

// Update Order
router.patch(
    '/orders/:orderId',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.USER, UserRole.SELLER, UserRole.ADMIN),
    [
        param('orderId')
        .isUUID().withMessage('orderId must be an integer')
            .notEmpty().withMessage('orderId is required'),
        
        body('shipping_address_id')
            .optional()
            .isUUID().withMessage('shipping_address_id must be a valid UUID'),
            
        body('billing_address_id')
            .optional()
            .isUUID().withMessage('billing_address_id must be a valid UUID'),
            
        body('notes')
            .optional()
            .isString().withMessage('notes must be a string')
            .isLength({ max: 1000 }).withMessage('notes cannot exceed 1000 characters'),
            
       
    ],
    checkForUnexpectedFields([
        'shipping_address_id', 
        'billing_address_id', 
        'notes'
    ]),
    validateRequest,
    (req, res, next) => orderController.updateOrder(req, res, next)
);

// Request Order Cancellation (User)
router.patch(
    '/orders/:orderId/cancel',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.USER),
    [
        param('orderId')
            .isUUID().withMessage('orderId must be an integer')
            .notEmpty().withMessage('orderId is required'),
            
        body('reason')
            .optional()
            .isString().withMessage('reason must be a string')
            .isLength({ max: 500 }).withMessage('reason cannot exceed 500 characters'),
    ],
    checkForUnexpectedFields(['reason']),
    validateRequest,
    (req, res, next) => orderController.requestCancelOrder(req, res, next)
);

// Process Cancellation Request (Seller/Admin)
router.patch(
    '/admin/orders/:orderId/cancellation',
    AuthMiddleware.verifyToken,
    OrderAuthMiddleware.isOrderSeller,
 
    [
        param('orderId')
            .isUUID().withMessage('orderId must be an integer')
            .notEmpty().withMessage('orderId is required'),
            
        body('approved')
            .isBoolean().withMessage('approved must be a boolean value')
            .notEmpty().withMessage('approved is required'),
            
        body('notes')
            .optional()
            .isString().withMessage('notes must be a string')
            .isLength({ max: 500 }).withMessage('notes cannot exceed 500 characters'),
    ],
    checkForUnexpectedFields(['approved', 'notes']),
    validateRequest,
    (req, res, next) => orderController.processCancellationRequest(req, res, next)
);

// Get All Orders (with pagination and filtering)
router.get(
    '/orders',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.USER, UserRole.SELLER, UserRole.ADMIN),
    (req, res, next) => orderController.getOrders(req, res, next)
);

// Get Single Order Details
router.get(
    '/orders/:orderId',
    AuthMiddleware.verifyToken,
    AuthMiddleware.authorizeRole(UserRole.USER, UserRole.SELLER, UserRole.ADMIN),
    [
        param('orderId')
             .isUUID().withMessage('orderId must be an integer')
            .notEmpty().withMessage('orderId is required'),
    ],
    validateRequest,
    (req, res, next) => orderController.getOrderById(req, res, next)
);

export default router;