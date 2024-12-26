import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Enable CORS and JSON parsing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'node-ver', 'x-docusign-sdk']
}));
app.use(express.json({
  limit: '50mb'  // Increase payload size limit for base64 encoded documents
}));

// Helper function to format private key
function formatPrivateKey(key) {
  try {
    // Log the input key for debugging
    console.log('Input key format:', {
      length: key?.length,
      sample: key?.substring(0, 50) + '...'
    });

    if (!key) {
      throw new Error('Private key is empty or undefined');
    }

    // If the key already has headers, extract just the content
    if (key.includes('-----BEGIN RSA PRIVATE KEY-----')) {
      key = key
        .replace('-----BEGIN RSA PRIVATE KEY-----', '')
        .replace('-----END RSA PRIVATE KEY-----', '')
        .replace(/[\r\n\s]/g, '');
    }

    // Split the key content into 64-character chunks
    const chunks = key.match(/.{1,64}/g) || [];
    
    // Reconstruct the key with proper PEM format
    const formattedKey = [
      '-----BEGIN RSA PRIVATE KEY-----',
      ...chunks,
      '-----END RSA PRIVATE KEY-----'
    ].join('\n');

    // Log the formatted key details
    console.log('Private key format:', {
      chunks: chunks.length,
      totalLines: formattedKey.split('\n').length
    });

    return formattedKey;
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error(`Failed to format private key: ${error.message}`);
  }
}

// DocuSign authentication endpoint
app.post('/api/docusign/auth', async (req, res) => {
  try {
    const { integrationKey, userId, privateKey } = req.body;
    console.log('Received auth request for user:', userId);

    // Create JWT token payload
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'account-d.docusign.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: 'signature impersonation'
    };

    console.log('Creating JWT with payload:', { ...payload, iss: '***', sub: '***' });

    // Format the private key
    const formattedKey = formatPrivateKey(privateKey);

    // Sign the JWT token
    const assertion = jwt.sign(payload, formattedKey, { 
      algorithm: 'RS256'
    });
    console.log('JWT token created successfully');

    // Get access token from DocuSign
    console.log('Requesting access token from DocuSign...');
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'docusign-node-client',
        'X-DocuSign-SDK': 'Node'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      })
    });

    const data = await response.json();
    console.log('DocuSign response:', {
      status: response.status,
      statusText: response.statusText,
      data: data.error ? data : '***'
    });

    if (!response.ok) {
      throw new Error(`DocuSign error: ${data.error || 'Unknown error'}`);
    }

    res.json(data);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// DocuSign envelope creation endpoint
app.post('/api/docusign/envelopes', async (req, res) => {
  try {
    const { accountId, envelope, accessToken } = req.body;
    console.log('Creating envelope for account:', accountId);
    console.log('Envelope data:', {
      subject: envelope.emailSubject,
      documentName: envelope.documents?.[0]?.name,
      signerEmail: envelope.recipients?.signers?.[0]?.email
    });

    // Forward the request to DocuSign
    const response = await fetch(`https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'docusign-node-client',
        'X-DocuSign-SDK': 'Node'
      },
      body: JSON.stringify(envelope)
    });

    const data = await response.json();
    console.log('DocuSign envelope response:', {
      status: response.status,
      statusText: response.statusText,
      data: data.error ? data : '***'
    });

    if (!response.ok) {
      console.error('DocuSign error details:', data);
      throw new Error(`DocuSign error: ${JSON.stringify(data)}`);
    }

    res.json(data);
  } catch (error) {
    console.error('Envelope creation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: error.message,
      details: error.stack,
      docusignError: error.response?.data
    });
  }
});

// PDF Generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { title, description, amount, submissionDate } = req.body;
    
    // Create a new PDF document
    const doc = new PDFDocument();
    const chunks = [];

    // Collect PDF data chunks
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const base64String = pdfBuffer.toString('base64');
      res.json({ pdfBase64: base64String });
    });

    // Add content to the PDF
    doc
      .fontSize(16)
      .text('Micro-Grants Program Agreement', { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(10)
      .text('This Agreement ("Agreement") is entered into as of the date of the last signature below ("Effective Date") by and between [Grant Microsystems by Ankit] ("Grantor"), and the applicant identified below ("Recipient").', { align: 'justify' })
      .moveDown(2);

    // Section 1
    doc
      .fontSize(12)
      .text('1. Purpose of the Grant', { underline: true })
      .fontSize(10)
      .text('The Grantor agrees to provide the Recipient with a micro-grant for the purpose of funding the project described in the application submitted by the Recipient. The grant is intended solely for the approved project and must align with the mission of the Grantor.')
      .moveDown();

    // Section 2
    doc
      .fontSize(12)
      .text('2. Grant Amount and Disbursement', { underline: true })
      .fontSize(10)
      .text(`Grantor shall provide the Recipient with a grant in the amount of $${amount.toLocaleString()}, subject to the terms and conditions of this Agreement. Funds will be disbursed to the Recipient upon:`)
      .moveDown(0.5)
      .text('• Approval of the application.')
      .text('• Submission of any required banking or payment details.')
      .moveDown();

    // Section 3
    doc
      .fontSize(12)
      .text('3. Use of Funds', { underline: true })
      .fontSize(10)
      .text('The Recipient agrees to use the grant funds exclusively for the purposes outlined in the approved application. Any deviation from the approved use must be pre-approved in writing by the Grantor.')
      .moveDown();

    // Section 4
    doc
      .fontSize(12)
      .text('4. Reporting Requirements', { underline: true })
      .fontSize(10)
      .text('The Recipient shall provide the Grantor with:')
      .moveDown(0.5)
      .text('• A progress report within 6 months of receiving funds.')
      .text('• A final report upon project completion, detailing outcomes, expenditures, and impact.')
      .moveDown();

    // Section 5
    doc
      .fontSize(12)
      .text('5. Compliance with Laws', { underline: true })
      .fontSize(10)
      .text('The Recipient agrees to comply with all applicable laws, regulations, and guidelines in the implementation of the project.')
      .moveDown();

    // Section 6
    doc
      .fontSize(12)
      .text('6. Termination of Agreement', { underline: true })
      .fontSize(10)
      .text('Grantor reserves the right to terminate this Agreement and demand a return of funds if:')
      .moveDown(0.5)
      .text('• The funds are used for purposes other than those approved.')
      .text('• The Recipient provides false or misleading information.')
      .text('• The project is abandoned or substantially altered without approval.')
      .moveDown();

    // Section 7
    doc
      .fontSize(12)
      .text('7. Liability', { underline: true })
      .fontSize(10)
      .text('The Grantor is not responsible for any liabilities, damages, or losses incurred by the Recipient in connection with the project.')
      .moveDown();

    // Section 8
    doc
      .fontSize(12)
      .text('8. Publicity and Acknowledgment', { underline: true })
      .fontSize(10)
      .text('The Recipient agrees to acknowledge the Grantor\'s support in all public communications about the project and grants the Grantor permission to use the project details for promotional purposes.')
      .moveDown();

    // Section 9
    doc
      .fontSize(12)
      .text('9. Confidentiality', { underline: true })
      .fontSize(10)
      .text('Both parties agree to maintain the confidentiality of any non-public information exchanged as part of this Agreement.')
      .moveDown();

    // Section 10
    doc
      .fontSize(12)
      .text('10. Governing Law', { underline: true })
      .fontSize(10)
      .text('This Agreement shall be governed by the laws of the India.')
      .moveDown();

    // Section 11
    doc
      .fontSize(12)
      .text('11. Entire Agreement', { underline: true })
      .fontSize(10)
      .text('This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements, whether written or oral.')
      .moveDown(2);

    // Recipient Information
    doc
      .fontSize(12)
      .text('Project Information', { underline: true })
      .moveDown();
    
    doc
      .fontSize(10)
      .text(`Project Title: ${title}`)
      .moveDown()
      .text(`Grant Amount: $${amount.toLocaleString()}`)
      .moveDown(2);

    // Acknowledgment
    doc
      .fontSize(12)
      .text('Acknowledgment', { underline: true })
      .moveDown();
    
    doc
      .fontSize(10)
      .text('I, the undersigned Recipient, agree to the terms and conditions outlined in this Agreement and certify that the information provided is accurate to the best of my knowledge.')
      .moveDown(2);

    doc
      .text('Signature: /sig1/')
      .moveDown()

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('PDF Generation error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// Add a test endpoint to verify the server is running
app.head('/api/docusign/auth', (req, res) => {
  res.sendStatus(200);
});

// Function to try different ports
async function startServer(initialPort) {
  let port = initialPort;
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const server = createServer(app);
      
      await new Promise((resolve, reject) => {
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            server.close();
            port++;
          } else {
            reject(error);
          }
        });

        server.listen(port, () => {
          console.log(`Server running on port ${port}`);
          console.log(`DocuSign auth endpoint: http://localhost:${port}/api/docusign/auth`);
          resolve(server);
        });
      });

      // If we get here, the server started successfully
      return port;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
      }
      // Continue to next attempt
      port++;
    }
  }
}

// Start the server
startServer(3001).then(port => {
  // Update the DocuSign service with the correct port
  console.log(`Server is ready on port ${port}`);
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
}); 