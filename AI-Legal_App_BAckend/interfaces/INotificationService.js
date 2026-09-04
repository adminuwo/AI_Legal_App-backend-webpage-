/**
 * Notification Service Interface Contract Template
 */
export const INotificationService = {
  sendPushNotification: async (userId, payload) => {},
  scheduleHearingReminder: async (reminderData) => {}
};

export default INotificationService;
