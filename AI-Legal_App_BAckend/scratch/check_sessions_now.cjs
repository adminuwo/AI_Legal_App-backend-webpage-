require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    const sessions = await mongoose.connection.collection('chatsessions')
      .find({})
      .sort({ lastModified: -1 })
      .limit(10)
      .toArray();

    console.log('--- Last 10 Sessions in DB ---');
    sessions.forEach(s => {
      console.log({
        sessionId: s.sessionId,
        userId: s.userId,
        title: s.title,
        activeTool: s.activeTool,
        workspaceType: s.workspaceType,
        conversationType: s.conversationType,
        msgCount: s.messages ? s.messages.length : 0,
        lastModified: new Date(s.lastModified).toLocaleString()
      });
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
})();
