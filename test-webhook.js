import fetch from 'node-fetch';

const testWebhook = async () => {
  try {
    const response = await fetch('https://microgrants-streamer.vercel.app/api/docusign/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        envelopeId: '36af9994-fb53-46f6-b89d-76f9baa1fb91',
        status: 'completed',
        emailSubject: 'Test Document'
      })
    });

    const data = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testWebhook(); 