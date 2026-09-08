import UserModel from "../models/User.js";

/**
 * Global Jurisdiction Context Manager
 * Centralized service to manage legal jurisdictions, inject prompts before AI requests,
 * and support future country additions seamlessly.
 */
class JurisdictionManager {
  constructor() {
    this.temporaryOverrides = new Map(); // userId -> countryName
  }

  /**
   * Reads a user's selected country/jurisdiction from the database.
   * Falls back to "India" if not set or if database lookup fails.
   */
  async getActiveJurisdiction(userId, reqOrOptions = null) {
    if (reqOrOptions && typeof reqOrOptions === 'object') {
      const headerJurisdiction = reqOrOptions.jurisdiction || reqOrOptions.country || reqOrOptions.headers?.['x-legal-jurisdiction'] || reqOrOptions.headers?.['X-Legal-Jurisdiction'] || reqOrOptions.body?.jurisdiction || reqOrOptions.body?.country;
      if (headerJurisdiction && typeof headerJurisdiction === 'string') {
        return headerJurisdiction;
      }
    }
    if (!userId) {
      return "India";
    }
    // Check temporary override cache first
    const uIdStr = userId.toString();
    if (this.temporaryOverrides.has(uIdStr)) {
      return this.temporaryOverrides.get(uIdStr);
    }
    try {
      const user = await UserModel.findById(userId);
      return user?.jurisdiction || user?.country || user?.personalizations?.general?.jurisdiction || user?.personalizations?.general?.country || "India";
    } catch (err) {
      console.error(`[JurisdictionManager] Error reading user ${userId} jurisdiction:`, err.message);
      return "India";
    }
  }

  setTemporaryOverride(userId, country) {
    this.temporaryOverrides.set(userId.toString(), country);
  }

  removeTemporaryOverride(userId) {
    this.temporaryOverrides.delete(userId.toString());
  }

  getTemporaryOverride(userId) {
    return this.temporaryOverrides.get(userId.toString()) || null;
  }

  /**
   * Generates the prompt injection block for a given country.
   */
  getJurisdictionPrompt(country) {
    const activeCountry = country || "India";
    return `
Active Legal Jurisdiction:
${activeCountry}

You are an expert legal AI specializing in the laws, legal procedures, terminology, court system, legal drafting standards, penal statutes, procedural codes, section references, and legal framework of ${activeCountry}.

Use ONLY the selected country's (${activeCountry}) legal system and laws.

Do NOT cite or default to Indian laws, Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), or Indian precedents unless the selected country is India or unless the user explicitly requests an international comparative analysis.

If regional laws differ (such as US States, Canadian Provinces, Australian States, UAE Emirates, etc.), politely ask the user for the relevant state/region before giving a final legal answer.

Always maintain this jurisdiction (${activeCountry}) strictly across all generated text and outputs until the user changes it.
`;
  }

  /**
   * Injects the active jurisdiction prompt block into systemInstruction.
   */
  async injectJurisdictionPrompt(systemInstruction, userId, reqOrOptions = null) {
    const country = await this.getActiveJurisdiction(userId, reqOrOptions);
    const promptBlock = this.getJurisdictionPrompt(country);

    if (!systemInstruction) {
      return promptBlock.trim();
    }

    // Prepend the jurisdiction prompt block before the active systemInstruction
    return `${promptBlock.trim()}\n\n${systemInstruction.trim()}`;
  }
}

export const jurisdictionManager = new JurisdictionManager();
