require('dotenv').config({ path: 'd:/AI Legal/AI_Legal_App-backend-webpage-/AI-Legal_App_BAckend/.env' });
const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
  try {
    const userId = '6a30fac276e1c8026477a8cd';
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    const token = jwt.sign({ id: userId, email: 'test@user.com', role: 'advocate' }, process.env.JWT_SECRET);

    console.log('Testing Mobile GET /api/chat with mobile headers:');
    const mobileRes = await axios.get('http://127.0.0.1:8080/api/chat', {
      headers: {
        Authorization: 'Bearer ' + token,
        'X-Device-Platform': 'mobile',
        'X-User-Role': 'advocate',
        'x-user-role': 'advocate',
        'X-Active-Workspace-Id': 'personal_practice',
        'x-active-workspace-id': 'personal_practice',
        'x-workspace-id': 'personal_practice',
        'x-workspace-type': 'personal'
      },
      params: {
        preferred_response_language: 'English',
        language: 'English'
      }
    });

    console.log('Status:', mobileRes.status);
    console.log('Mobile returned data:', mobileRes.data);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
})();
