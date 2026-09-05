import fetch from 'node-fetch';

async function testLiveCors() {
  console.log('Testing OPTIONS request to live Cloud Run backend with Origin: https://ailegal.aisa24.com ...');
  try {
    const res = await fetch('https://ai-legal-app-backend-743928421487.asia-south1.run.app/api/auth/google', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://ailegal.aisa24.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    });

    console.log('Response status:', res.status);
    console.log('Response headers:');
    for (const [key, value] of res.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testLiveCors();
