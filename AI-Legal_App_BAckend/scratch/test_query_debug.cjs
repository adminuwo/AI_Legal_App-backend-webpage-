require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  const userId = '6a30fac276e1c8026477a8cd';
  const uIdObj = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  const userQueries = [userId, String(userId)];
  if (uIdObj) userQueries.push(uIdObj);

  console.log('userQueries:', userQueries);

  const query = {};
  query.userId = { $in: userQueries };

  const reqWorkspaceId = 'personal_practice';
  if (reqWorkspaceId) {
    if (reqWorkspaceId === 'personal_practice') {
      query.$or = [
        { workspaceId: 'personal_practice' },
        { workspaceId: { $exists: false } },
        { workspaceId: null },
        { workspaceId: '' }
      ];
    } else {
      query.workspaceId = reqWorkspaceId;
    }
  }

  // Global Scope
  query.projectId = { $in: [null, undefined] };
  query.assistantType = { $ne: 'legal_tutor' };
  query.workspaceType = { $ne: 'student' };

  console.log('Query:', JSON.stringify(query, null, 2));

  const count = await mongoose.connection.collection('chatsessions').countDocuments(query);
  console.log('Found count:', count);

  const found = await mongoose.connection.collection('chatsessions').find(query).toArray();
  console.log('Found sessionIds:', found.map(s => s.sessionId));

  await mongoose.disconnect();
})();
