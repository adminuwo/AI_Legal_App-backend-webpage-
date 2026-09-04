/**
 * Reusable Prompt Template Builder
 */
export class PromptTemplate {
  constructor(templateString = '', defaultVariables = {}) {
    this.templateString = templateString;
    this.defaultVariables = defaultVariables;
  }

  format(variables = {}) {
    const mergedVars = { ...this.defaultVariables, ...variables };
    let formatted = this.templateString;

    for (const [key, value] of Object.entries(mergedVars)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      formatted = formatted.replace(placeholder, value !== undefined ? String(value) : '');
    }

    return formatted;
  }
}

export default PromptTemplate;
