import { Request, Response, NextFunction } from 'npm:express';
import { validationResult } from 'npm:express-validator';
import { AppDataSource } from '../../database.ts';
import { User, UserRole } from '../../entity/Auth/User.ts';
import bcrypt from 'npm:bcryptjs';
import { sendVerificationEmail, sendWelcomeEmail,sendPasswordResetEmail, sendResetSuccessEmail } from '../../utils/emails.ts';
import { generateTokenAndSetCookie } from '../../utils/generateTokenAndSetCookie.ts';
import { MoreThan } from 'npm:typeorm@0.3.20';
import * as mod from "node:crypto";
const crypto = mod;
interface RegisterRequestBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone_number?: string;
}

export class AuthController {
  private userRepo = AppDataSource.getRepository(User);

  async register(req: Request<{}, {}, RegisterRequestBody>, res: Response, next: NextFunction): Promise<any> {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, password, phone_number } = req.body;

    try {
      // Check if user already exists
      const userAlreadyExists = await this.userRepo.findOne({
        where: { email }
      });

      if (userAlreadyExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      // Hash password
      const saltRounds = process.env.NODE_ENV === 'production' ? 10 : 8;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      

      // Generate verification token
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

      // Create new user instance
      const user = new User();
      user.first_name = firstName;
      user.last_name = lastName;
      user.email = email;
      user.password_hash = hashedPassword;
      user.verificationToken = verificationToken;
      user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
      user.user_role = UserRole.PENDING;
      user.is_verified = false;
      user.phone_number = phone_number || null;
      
      // Save user to the database
      const savedUser = await this.userRepo.save(user);

      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      res.status(201).json({
        success: true,
        message: "User created successfully. Please verify your email to activate your account.",
        user: {
          id: savedUser.user_id,
          email: savedUser.email,
          firstName: savedUser.first_name,
          lastName: savedUser.last_name,
          role: savedUser.user_role
        },
      });

    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  }

  async verifyEmailCode(code: string): Promise<User | null> {
    try {
        // Verify the email and retrieve the user
        const user = await this.userRepo.findOne({
            where: {
                verificationToken: code,
                verificationTokenExpiresAt: MoreThan(new Date()), // Check if the token is not expired
            },
        });

        if (!user) {
            return null;
        }

        // Update user verification status
        user.is_verified = true;
        user.user_role = UserRole.USER; // Change from PENDING to USER
        user.verificationToken = null;
        user.verificationTokenExpiresAt = null;

        // Save the updated user
        await this.userRepo.save(user);

        return user;
    } catch (error) {
        console.log("Error in verifyEmailCode", error);
        throw new Error("Server error");
    }
}

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { code } = req.body; 

    try {
        // Step 1: Verify the email
        const user = await this.verifyEmailCode(code);
        
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired verification code" });
        }

        // Send welcome email and set JWT token
        await sendWelcomeEmail(user.email, user.first_name);
        generateTokenAndSetCookie(res, user.user_id, user.user_role);

        // Respond with success
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user: {
              id: user.user_id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.user_role
            },
        });
    } catch (error) {
        console.log("Error in verifyEmail", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { email, password } = req.body;
    

    try {
      const user = await this.userRepo.findOne({
        where: { email },
        select: ['user_id', 'password_hash', 'user_role'] // Only fetch required fields
    });
    

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        generateTokenAndSetCookie(res, user.user_id,user.user_role);
    
         user.last_login = new Date();

        await this.userRepo.save(user);
       
        res.status(200).json({
            success: true,
            message: 'Logged in successfully',
            user: {
              id: user.user_id,
              
              role: user.user_role
            },
        });
    } catch (error) {
        console.log('Error in finalizing login', error);
        next(error);
    }
}
async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { email } = req.body;

  try {
    const user = await this.userRepo.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiry

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    // Save the updated user (this will not touch the password_hash field)
    await this.userRepo.save(user);

    // Send email
    await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

    res.status(200).json({ success: true, message: "Password reset link sent to your email" });
  } catch (error) {
    console.log("Error in forgotPassword", error);
    next(error);
  }
}

async resetPassword(req: Request, res: Response, next: NextFunction): Promise<any> {
    const { token } = req.params;
    const { password } = req.body;
  try {
   

      const user = await this.userRepo.findOne({ 
          where: {
              resetPasswordToken: token,
              resetPasswordExpiresAt: MoreThan(new Date()), // Check if the token has not expired
          }
      });
      if (!user) {
          return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
      }

      // update password
      const hashedPassword = await bcrypt.hash(password, 10);

      user.password_hash = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpiresAt = null;
      await this.userRepo.save(user);

      await sendResetSuccessEmail(user.email);

      res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
      console.log("Error in resetPassword ", error);
      next(error);       }
}

}