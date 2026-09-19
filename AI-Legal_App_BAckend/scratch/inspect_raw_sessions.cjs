require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const webSession = await mongoose.connection.collection('chatsessions').findOne({ sessionId: 'mu82hknwggsfii4ie0w' });
  const mobileSession = await mongoose.connection.collection('chatsessions').findOne({ sessionId: 'session_1789802884067' });

  console.log('Web Session raw:');
  console.log(JSON.stringify(webSession, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  console.log('\nMobile Session raw:');
  console.log(JSON.stringify(mobileSession, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  console.log('\nField types for Web Session:');
  for (let k in webSession) {
    console.log(k, ':', typeof webSession[k], Object.prototype.toString.call(webSession[k]));
  }

  console.log('\nField types for Mobile Session:');
  for (let k in mobileSession) {
    console.log(k, ':', typeof mobileSession[k], Object.prototype.toString.call(mobileSession[k]));
  }

  await mongoose.disconnect();
})();
