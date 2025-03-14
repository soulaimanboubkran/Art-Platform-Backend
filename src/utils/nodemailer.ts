import nodemailer from 'npm:nodemailer';
import dotenv from 'npm:dotenv';
dotenv.config()
// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hightllevel@gmail.com',
    pass: process.env.mailPass,
  },

});

export default transporter;
