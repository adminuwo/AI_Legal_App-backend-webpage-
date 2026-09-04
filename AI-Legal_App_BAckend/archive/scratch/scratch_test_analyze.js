import axios from 'axios';

const runTest = async () => {
  const payload = {
    actionType: 'intelligence_report',
    precedentData: {
      case_name: "Pioneer Urban Land & Infrastructure Ltd. v. Govindan Raghavan",
      court: "Supreme Court",
      year: 2019,
      citation: "(2019) 5 SCC 725",
      text: "A landmark judgment regarding builder buyer agreement and delayed possession."
    },
    projectId: null,
    language: 'English'
  };

  console.log('Sending request to /api/precedents/analyze with payload:', JSON.stringify(payload, null, 2));
  
  try {
    const res = await axios.post('http://localhost:8080/api/precedents/analyze', payload, {
      timeout: 60000
    });
    console.log('✅ Response status:', res.status);
    console.log('Response body keys:', Object.keys(res.data));
    console.log('Analysis preview:', res.data.analysis ? res.data.analysis.substring(0, 500) + '...' : 'No analysis returned');
  } catch (err) {
    console.error('❌ Request failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error message:', err.message);
    }
  }
};

runTest();
