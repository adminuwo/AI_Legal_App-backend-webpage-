import dotenv from 'dotenv';
dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'default_jwt_secret_dev_only'),
  expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  cookieName: 'token',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
};

export default jwtConfig;
