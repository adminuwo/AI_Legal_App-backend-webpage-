import axios from "axios";
import crypto from "crypto";
import { uploadToGCS, gcsFilename } from "../services/gcs.service.js";

/**
 * Robustly fetches an avatar from various sources and persists it to GCS (aisa_objects).
 * @param {string} email User email
 * @param {string} name User name (for initials fallback)
 * @returns {Promise<string>} Permanent Cloudinary URL or initials fallback URL
 */
export const getSmartAvatar = async (email, name) => {
  if (!email) return "/User.jpeg";
  const normalizedEmail = email.trim().toLowerCase();
  const initials = name ? name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) : normalizedEmail.slice(0, 2).toUpperCase();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials || "U")}&background=random&color=fff&size=512`;

  // Sources to try (DIRECT only, bypassing rate-limited proxies)
  const sources = [
    normalizedEmail.endsWith('@gmail.com') ? `https://www.google.com/s2/photos/profile/${normalizedEmail}?sz=512` : null,
    `https://www.gravatar.com/avatar/${crypto.createHash('md5').update(normalizedEmail).digest('hex')}?d=404`
  ].filter(Boolean);

  for (const source of sources) {
    try {
      const response = await axios.get(source, {
        responseType: 'arraybuffer',
        timeout: 4000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (response.status === 200 && response.data.length > 1000) { 
        const buffer = Buffer.from(response.data);
        const result = await uploadToGCS(buffer, {
          folder: 'user_avatars',
          filename: gcsFilename(`avatar_${normalizedEmail.split('@')[0]}`),
          mimeType: response.headers['content-type'] || 'image/jpeg',
        });
        return result.publicUrl;
      }
    } catch (e) {
      continue;
    }
  }

  return fallbackUrl;
};

/**
 * Checks if a given avatar URL appears to be a generated placeholder.
 */
export const isGeneratedAvatar = (avatar) => {
  return !avatar || 
         avatar === '/User.jpeg' || 
         avatar === '' || 
         avatar.includes('unavatar.io') || 
         avatar.includes('ui-avatars.com');
};
