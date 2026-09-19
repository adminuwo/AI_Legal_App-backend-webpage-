import mongoose from 'mongoose';
import 'dotenv/config';

await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
const userId = new mongoose.Types.ObjectId('6aae1fcb4e70eb150c890167');

const mobileQuery = {
  userId: { $in: [userId, String(userId)] },
  conversationType: { $in: ['global', null] },
  projectId: { $in: [null, undefined] },
  assistantType: { $ne: 'legal_tutor' },
  workspaceType: { $ne: 'student' },
  $or: [
    { workspaceId: 'personal_practice' },
    { workspaceId: { $exists: false } },
    { workspaceId: null },
    { workspaceId: '' }
  ]
};
const mobileRes = await mongoose.connection.collection('chatsessions').find(mobileQuery).toArray();
console.log('Mobile query results count:', mobileRes.length);

const webQuery = {
  userId: { $in: [userId, String(userId)] },
  conversationType: { $in: ['global', null] },
  projectId: { $in: [null, undefined] },
  assistantType: { $ne: 'legal_tutor' },
  workspaceType: { $ne: 'student' }
};
const webRes = await mongoose.connection.collection('chatsessions').find(webQuery).toArray();
console.log('Web query results count:', webRes.length);

const allUserSessions = await mongoose.connection.collection('chatsessions').find({ userId }).toArray();
console.log('All sessions for user:', allUserSessions.map(s => ({
  sessionId: s.sessionId,
  title: s.title,
  activeTool: s.activeTool,
  conversationType: s.conversationType,
  workspaceId: s.workspaceId,
  workspaceType: s.workspaceType,
  assistantType: s.assistantType,
  messageCount: s.messages?.length
})));

await mongoose.disconnect();
