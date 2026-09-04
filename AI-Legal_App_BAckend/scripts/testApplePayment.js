import fetch from 'node-fetch';

const testPayment = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/subscription/apple/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptData: 'SANDBOX_MOCK_RECEIPT_TOKEN_TEST',
        productId: 'advocate_pro',
        workspace: 'advocate',
        billingCycle: 'monthly',
        email: 'testuser@aisa.legal'
      }),
    });

    const data = await response.json();
    console.log('✅ Response from backend:', data);
  } catch (err) {
    console.error('❌ Test payment request failed:', err.message);
  }
};

testPayment();
