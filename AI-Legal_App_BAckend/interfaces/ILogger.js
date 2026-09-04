/**
 * Logger Service Interface Contract Template
 */
export const ILogger = {
  info: (message, meta) => {},
  error: (message, error) => {},
  warn: (message, meta) => {},
  debug: (message, meta) => {}
};

export default ILogger;
