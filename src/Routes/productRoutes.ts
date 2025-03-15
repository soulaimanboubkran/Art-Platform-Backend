import { Router } from 'npm:express';
import { body, param } from 'npm:express-validator';
import { UserRole } from "../entity/Auth/User.ts";
import { ProductController } from '../controllers/product/productController.ts';
import { checkForUnexpectedFields, validateRequest } from '../middleware/validationResult.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';
import { AppDataSource } from '../database.ts';

const router = Router();

// Fix: Use the imported class name with correct capitalization
const productController = new ProductController();
  router.post(
    '/products',
  
  AuthMiddleware.verifyToken,
  AuthMiddleware.authorizeRole(UserRole.SELLER, UserRole.ADMIN),
    [
      // Basic product information
      body('title')
        .isString().withMessage('Title is required')
        .trim()
        .notEmpty().withMessage('Title cannot be empty')
        .isLength({ max: 255 }).withMessage('Title cannot exceed 255 characters'),
      
      body('description')
        .isString().withMessage('Description is required')
        .trim()
        .notEmpty().withMessage('Description cannot be empty'),
      
      body('base_price')
        .isNumeric().withMessage('Base price must be a number')
        .isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
      
      // Auction related fields
      body('is_auction')
        .isBoolean().withMessage('is_auction must be a boolean'),
      
      body('auction_end_time')
        .optional({ nullable: true })
        .isISO8601().withMessage('Auction end time must be a valid date')
        .custom((value, { req }) => {
          if (req.body.is_auction && !value) {
            throw new Error('Auction end time is required for auctions');
          }
          return true;
        }),
      
      body('min_bid_increment')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Minimum bid increment must be a positive number')
        .custom((value, { req }) => {
          if (req.body.is_auction && !value) {
            throw new Error('Minimum bid increment is required for auctions');
          }
          return true;
        }),
      
      body('reserve_price')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Reserve price must be a positive number'),
      
      // Artwork details
      body('year_created')
        .optional({ nullable: true })
        .isInt().withMessage('Year created must be an integer'),
      
      body('medium')
        .isString().withMessage('Medium is required')
        .trim()
        .notEmpty().withMessage('Medium cannot be empty'),
      
      body('style')
        .isString().withMessage('Style is required')
        .trim()
        .notEmpty().withMessage('Style cannot be empty'),
      
      // Dimensions
      body('width')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Width must be a positive number'),
      
      body('height')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Height must be a positive number'),
      
      body('depth')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Depth must be a positive number'),
      
      body('dimensions_unit')
        .optional({ nullable: true })
        .isString().withMessage('Dimensions unit must be a string'),
      
      // Product condition and properties
      body('condition')
        .isString().withMessage('Condition is required')
        .trim()
        .notEmpty().withMessage('Condition cannot be empty'),
      
      body('is_original')
        .isBoolean().withMessage('is_original must be a boolean'),
      
      body('is_framed')
        .isBoolean().withMessage('is_framed must be a boolean'),
      
      body('keywords')
        .optional({ nullable: true })
        .isString().withMessage('Keywords must be a string'),
      
      // Categories relationship
      body('categories')
        .isArray().withMessage('Categories must be an array')
        .optional({ nullable: true }),
      
      body('categories.*')
        .isInt().withMessage('Each category must be an integer ID'),
      
      // Images relationship
      body('images')
        .isArray().withMessage('Images must be an array'),
      
      body('images.*.image_url')
        .isString().withMessage('Image URL is required')
        .trim()
        .notEmpty().withMessage('Image URL cannot be empty')
        .isURL().withMessage('Invalid image URL format'),
      
      body('images.*.thumbnail_url')
        .optional()
        .isString().withMessage('Thumbnail URL must be a string')
        .isURL().withMessage('Invalid thumbnail URL format'),
      
      body('images.*.alt_text')
        .optional()
        .isString().withMessage('Alt text must be a string'),
      
      body('images.*.display_order')
        .optional()
        .isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
      
      // Inventory relationship
      body('inventory')
        .optional()
        .isObject().withMessage('Inventory must be an object'),
      
      body('inventory.quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
      
      body('inventory.sku')
        .optional()
        .isString().withMessage('SKU must be a string')
        .trim()
        .notEmpty().withMessage('SKU cannot be empty'),
      
      body('inventory.location')
        .optional()
        .isString().withMessage('Location must be a string'),
      
      // Auction details (if is_auction is true)
      body('auction')
        .optional()
        .isObject().withMessage('Auction must be an object')
        .custom((value, { req }) => {
          if (req.body.is_auction && !value) {
            throw new Error('Auction details are required when is_auction is true');
          }
          return true;
        }),
      
      body('auction.start_time')
        .optional()
        .isISO8601().withMessage('Auction start time must be a valid date'),
      
      body('auction.starting_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Starting price must be a positive number'),
      
      body('auction.auto_extend')
        .optional()
        .isBoolean().withMessage('Auto extend must be a boolean'),
      
      body('auction.auto_extend_minutes')
        .optional()
        .isInt({ min: 1 }).withMessage('Auto extend minutes must be a positive integer'),
      
      body('auction.deposit_required')
        .optional()
        .isBoolean().withMessage('Deposit required must be a boolean'),
      
      body('auction.deposit_percentage')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('Deposit percentage must be between 0 and 100'),
      
      // Bid increments for auctions
      body('auction.bid_increments')
        .optional()
        .isArray().withMessage('Bid increments must be an array'),
      
      body('auction.bid_increments.*.price_from')
        .optional()
        .isFloat({ min: 0 }).withMessage('Price from must be a positive number'),
      
      body('auction.bid_increments.*.price_to')
        .optional()
        .isFloat({ min: 0 }).withMessage('Price to must be a positive number'),
      
      body('auction.bid_increments.*.increment_amount')
        .optional()
        .isFloat({ min: 0 }).withMessage('Increment amount must be a positive number')
    ],
    checkForUnexpectedFields([
      'title', 'description', 'base_price', 'is_auction', 'auction_end_time', 
      'min_bid_increment', 'reserve_price', 'year_created', 'medium', 'style',
      'width', 'height', 'depth', 'dimensions_unit', 'condition', 'is_original',
      'is_framed', 'keywords', 'categories', 'images', 'inventory', 'auction'
    ]),
    validateRequest,
    (req, res, next) => productController.createProduct(req, res, next)
  );

  export default router;