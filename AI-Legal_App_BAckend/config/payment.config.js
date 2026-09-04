import dotenv from 'dotenv';
dotenv.config();

export const paymentConfig = {
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  applePayMerchantId: process.env.APPLE_PAY_MERCHANT_ID,
  googlePayMerchantId: process.env.GOOGLE_PAY_MERCHANT_ID,
  currency: 'INR'
};

export default paymentConfig;
