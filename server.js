import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { accountId, envelope, accessToken, applicationId } = req.body;
    console.log('Creating envelope for account:', accountId);
    console.log('Request data:', {
      applicationId,
      accountId,
      envelopeSubject: envelope.emailSubject,
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
      envelopeId: data.envelopeId,
      error: data.error
    });

    if (!response.ok) {
      console.error('DocuSign error details:', data);
      throw new Error(`DocuSign error: ${JSON.stringify(data)}`);
    }

    // Store the envelope ID with the application
    if (applicationId && data.envelopeId) {
      console.log('Updating application in database:', {
        applicationId,
        envelopeId: data.envelopeId
      });

      const { data: updateData, error: updateError } = await supabase
        .from('applications')
        .update({
          envelope_id: data.envelopeId,
          status: 'pending_signature'
        })
        .eq('id', applicationId)
        .select();

      console.log('Supabase update response:', {
        data: updateData,
        error: updateError,
        query: {
          table: 'applications',
          id: applicationId,
          updates: {
            envelope_id: data.envelopeId,
            status: 'pending_signature'
          }
        }
      });

      if (updateError) {
        console.error('Error updating application:', updateError);
        throw new Error('Failed to update application status');
      }
      
      console.log(`Successfully updated application ${applicationId} with envelope ${data.envelopeId}`);
    } else {
      console.warn('Missing required data for database update:', {
        hasApplicationId: !!applicationId,
        hasEnvelopeId: !!data.envelopeId
      });
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

// DocuSign Connect webhook endpoint
app.post('/api/docusign/connect', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received DocuSign Connect webhook:', {
      envelopeId: data.envelopeId,
      status: data.status
    });

    // Verify the webhook is from DocuSign using HMAC validation
    // You should set up HMAC validation in DocuSign Connect settings
    // and verify the signature here

    // Check if this is a completed envelope
    if (data.status === 'completed') {
      const { data: applications, error: queryError } = await supabase
        .from('applications')
        .select('id, status')
        .eq('envelope_id', data.envelopeId)
        .single();

      if (queryError) {
        console.error('Error finding application:', queryError);
        throw new Error('Failed to find application');
      }

      if (applications) {
        const { error: updateError } = await supabase
          .from('applications')
          .update({ status: 'signed' })
          .eq('id', applications.id);

        if (updateError) {
          console.error('Error updating application:', updateError);
          throw new Error('Failed to update application status');
        }

        console.log(`Updated application ${applications.id} status to signed`);
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error.message 
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
      .fontSize(20)
      .text('Grant Agreement', { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(12)
      .text('Application Details', { underline: true })
      .moveDown();

    doc
      .text(`Title: ${title}`)
      .moveDown()
      .text(`Description: ${description}`)
      .moveDown()
      .text(`Amount Requested: $${amount.toLocaleString()}`)
      .moveDown()
      .text(`Submission Date: ${submissionDate}`)
      .moveDown(2);

    doc
      .text('Terms and Conditions', { underline: true })
      .moveDown()
      .text('By signing this document, you agree to:')
      .moveDown()
      .text('1. Use the grant funds solely for the purpose described in the application')
      .text('2. Provide progress reports as requested')
      .text('3. Return any unused funds')
      .text('4. Acknowledge the grantor in any public communications about the funded project')
      .moveDown(2);

    doc
      .text('Signature', { underline: true })
      .moveDown()
      .text('/sig1/', { align: 'center' })
      .moveDown()
      .text('Date: ' + new Date().toLocaleDateString(), { align: 'center' });

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