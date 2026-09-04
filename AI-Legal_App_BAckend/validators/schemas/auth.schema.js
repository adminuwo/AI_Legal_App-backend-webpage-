import { isEmail, isString } from '../helpers.js';

export const registerSchema = {
  body: (body) => {
    const errors = [];
    if (!body?.email || !isEmail(body.email)) errors.push({ field: 'email', message: 'Valid email address is required' });
    if (!body?.password || !isString(body.password) || body.password.length < 6) errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
    return errors.length > 0 ? errors : null;
  }
};

export const loginSchema = {
  body: (body) => {
    const errors = [];
    if (!body?.email || !isEmail(body.email)) errors.push({ field: 'email', message: 'Valid email address is required' });
    if (!body?.password || !isString(body.password)) errors.push({ field: 'password', message: 'Password is required' });
    return errors.length > 0 ? errors : null;
  }
};

export default {
  registerSchema,
  loginSchema
};
