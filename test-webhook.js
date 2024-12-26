import fetch from 'node-fetch';

const testWebhook = async () => {
  try {
    const response = await fetch('https://microgrants-streamer.vercel.app/api/docusign/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: 'envelope-completed',
        apiVersion: 'v2.1',
        uri: '/restapi/v2.1/accounts/test-account/envelopes/test-envelope',
        retryCount: 0,
        configurationId: 12345,
        generatedDateTime: new Date().toISOString(),
        data: {
          accountId: 'test-account',
          userId: 'test-user',
          envelopeId: 'b823ec9f-fe53-4107-a3a3-1832bf2d88af'
        }
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