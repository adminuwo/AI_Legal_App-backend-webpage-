/**
 * Payment & Billing Service Interface Contract Template
 */
export const IPaymentService = {
  createPaymentOrder: async (userId, planId) => {},
  verifyPaymentSignature: async (paymentDetails) => {},
  getUserSubscription: async (userId) => {}
};

export default IPaymentService;
