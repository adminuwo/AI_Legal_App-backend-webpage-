import fetch from 'node-fetch';

async function checkFavicon() {
  try {
    const res = await fetch('https://ai-legal-app-webapp-743928421487.asia-south1.run.app/favicon.png');
    console.log('Live favicon.png HTTP status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Length:', res.headers.get('content-length'));
  } catch (err) {
    console.error('Error fetching live favicon:', err.message);
  }
}

checkFavicon();
