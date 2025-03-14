import { Router } from 'npm:express';
import { body, param } from 'npm:express-validator';

import { AuthController } from '../controllers/auth/auth.ts';
import { checkForUnexpectedFields, validateRequest } from '../middleware/validationResult.ts';
import { AuthMiddleware } from '../middleware/authMiddleware.ts';

const router = Router();
const authController = new AuthController();

router.post(
    '/auth/sign-up',
    [
        body('firstName')
            .isString().withMessage('First name is required')
            .trim()
            .notEmpty().withMessage('First name cannot be empty'),
        
        body('lastName')
            .isString().withMessage('Last name is required')
            .trim()
            .notEmpty().withMessage('Last name cannot be empty'),
        
        body('email')
            .isEmail().withMessage('Invalid email address')
            .trim(),
        
        body('password')
            .isString().withMessage('Password is required'),
            //.isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
            //.matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
            //.matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
            //.matches(/[0-9]/).withMessage('Password must contain at least one number')
            //.matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
        
        body('phone_number')
            .optional()
            .isString().withMessage('Phone number must be a string')
            .matches(/^\+?[0-9\s-()]{10,20}$/).withMessage('Invalid phone number format')
    ],
    checkForUnexpectedFields(['firstName', 'lastName', 'email', 'password', 'phone_number']), // Updated allowed fields

    validateRequest,
    authController.register.bind(authController)
);
router.post(
    '/auth/verify-email',
    [body('code').isString().withMessage('Verification code is required')],
    checkForUnexpectedFields(['code']), // Pass the allowed fields

    validateRequest,
    authController.verifyEmail.bind(authController)
);
router.post(
    '/auth/sign-in',
    [
        body('email').isEmail().withMessage('Invalid email address'),
        body('password').isString().withMessage('Password is required'),
    ],
    checkForUnexpectedFields(['email','password']), // Pass the allowed fields

    validateRequest,
    authController.login.bind(authController)
);

router.post(
    '/auth/forgot-password',
    [body('email').isEmail().withMessage('Invalid email address')],
    validateRequest,
    authController.forgotPassword.bind(authController)
);

router.post(
    '/auth/reset-password/:token',
    [
        param('token').isString().withMessage('Reset token is required'),
        body('password').isString().withMessage('Password is required'),
    ],
    validateRequest,
    authController.resetPassword.bind(authController)
);

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: Operations related to user authentication
 */

/**
 * @swagger
 * /auth/sign-up:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign up a new user
 *     description: Register a new user by providing first name, last name, age, email, and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               age:
 *                 type: integer
 *                 example: 25
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Successful registration
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /auth/userName:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Set or update the username
 *     description: Set or update the username of the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: johnny_doe
 *     responses:
 *       200:
 *         description: Username updated successfully
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify email and create a profile
 *     description: Verify the email using a code and create either a normal or business profile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: 123456
 *               profileType:
 *                 type: string
 *                 example: normal
 *     responses:
 *       200:
 *         description: Email verified and profile created
 *       400:
 *         description: Invalid input or verification code
 *     security:
 *       - bearerAuth: []  # This specifies that the Bearer token is required in the Authorization header
 */

/**
 * @swagger
 * /auth/sign-in:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Sign in a user
 *     description: Login a user by providing email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Successful login
 *         headers:
 *           Set-Cookie:
 *             description: A cookie with the JWT token is set in the response.
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid email or password
 *       401:
 *         description: Unauthorized - Invalid token or missing authorization header
 *     security:
 *       - bearerAuth: []  # This specifies that the Bearer token is required in the Authorization header
 */

/**
 * @swagger
 * /auth/sign-in2:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Finalize sign-in with profile ID
 *     description: Complete the login process by providing a profile ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileId:
 *                 type: string
 *                 example: profile_123
 *     responses:
 *       200:
 *         description: Login finalized
 *       400:
 *         description: Invalid profile ID
 *       401:
 *         description: Unauthorized - Invalid token or missing authorization header
 *     security:
 *       - bearerAuth: []  # This specifies that the Bearer token is required in the Authorization header
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: Initiate a password reset by providing the email address.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Password reset request successful
 *       400:
 *         description: Invalid email
 */

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password
 *     description: Reset the user's password using the provided token.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           example: reset_token_123
 *         description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token or password
 */

export default router;
