import jwt from "jsonwebtoken";

/**
 * Generate a JWT and set it as an httpOnly cookie.
 * Token payload: { id, email, name, planType, role }
 */
export default function generateTokenAndSetCookies(res, id, email, name, planType = 'basic', role = 'user') {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET environment variable is missing.");
    }
    const tokenEx = (process.env.TOKEN_EX || '15m').trim();

    const token = jwt.sign(
      { id, email, name, planType, role },
      secret,
      { expiresIn: tokenEx }
    );

    const refreshToken = jwt.sign(
      { id, type: 'refresh' },
      secret,
      { expiresIn: '30d' }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const tokenObj = new String(token);
    tokenObj.refreshToken = refreshToken;
    tokenObj.token = token;

    return tokenObj;
  } catch (err) {
    console.error(`[JWT ERROR] Failed to sign token: ${err.message}`);
    throw err;
  }
}
