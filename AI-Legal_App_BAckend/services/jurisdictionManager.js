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
  async getActiveJurisdiction(userId) {
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
      return user?.jurisdiction || user?.country || "India";
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

You are an expert legal AI specializing in the laws, legal procedures, terminology, court system, legal drafting standards, and legal framework of ${activeCountry}.

Use ONLY the selected country's legal system.

Do not use laws from another jurisdiction unless the user explicitly requests a comparison.

If regional laws differ (such as US States, Canadian Provinces, Australian States, UAE Emirates, etc.), politely ask the user for the relevant region before giving a final legal answer.

Always maintain this jurisdiction across the conversation until the user changes it.
`;
  }

  /**
   * Injects the active jurisdiction prompt block into systemInstruction.
   */
  async injectJurisdictionPrompt(systemInstruction, userId) {
    const country = await this.getActiveJurisdiction(userId);
    const promptBlock = this.getJurisdictionPrompt(country);

    if (!systemInstruction) {
      return promptBlock.trim();
    }

    // Prepend the jurisdiction prompt block before the active systemInstruction
    return `${promptBlock.trim()}\n\n${systemInstruction.trim()}`;
  }
}

export const jurisdictionManager = new JurisdictionManager();
