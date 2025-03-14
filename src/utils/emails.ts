import nodemailer, { Transporter, SendMailOptions } from 'npm:nodemailer';
import dotenv from 'npm:dotenv';
import {
    PASSWORD_RESET_REQUEST_TEMPLATE,
    PASSWORD_RESET_SUCCESS_TEMPLATE,
    VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.ts";

// Load environment variables
dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter: Transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hightllevel@gmail.com',
        pass: process.env.mailPass,
    },
});

// Define the sender
const sender = {
    email: 'hightllevel@gmail.com',
    name: 'Auth Company',
};

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export const sendVerificationEmail = async (email: string, verificationToken: string): Promise<void> => {
    const mailOptions: SendMailOptions = {
        from: sender.email,
        to: email,
        subject: 'Verify your email',
        html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
    };

    try {
        await transporter.sendMail(mailOptions);
       // console.log("Verification email sent successfully", response);
    } catch (error) {
        console.error(`Error sending verification email`, error);
        throw new Error(`Error sending verification email: ${error}`);
    }
};

export const sendWelcomeEmail = async (email: string, name: string): Promise<void> => {
    const mailOptions: SendMailOptions = {
        from: sender.email,
        to: email,
        subject: 'Welcome!',
        html: `<p>Welcome to newHub Company, ${name}!</p>`, // Adjust this to your actual welcome template
    };

    try {
        await transporter.sendMail(mailOptions);
       // console.log("Welcome email sent successfully", response);
    } catch (error) {
        console.error(`Error sending welcome email`, error);
        throw new Error(`Error sending welcome email: ${error}`);
    }
};

export const sendPasswordResetEmail = async (email: string, resetURL: string): Promise<void> => {
    const mailOptions: SendMailOptions = {
        from: sender.email,
        to: email,
        subject: 'Reset your password',
        html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
    };

    try {
        const response = await transporter.sendMail(mailOptions);
       // console.log("Password reset email sent successfully", response);
    } catch (error) {
        console.error(`Error sending password reset email`, error);
        throw new Error(`Error sending password reset email: ${error}`);
    }
};

export const sendResetSuccessEmail = async (email: string): Promise<void> => {
    const mailOptions: SendMailOptions = {
        from: sender.email,
        to: email,
        subject: 'Password Reset Successful',
        html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    };

    try {
        const response = await transporter.sendMail(mailOptions);
       // console.log("Password reset success email sent successfully", response);
    } catch (error) {
        console.error(`Error sending password reset success email`, error);
        throw new Error(`Error sending password reset success email: ${error}`);
    }
};
