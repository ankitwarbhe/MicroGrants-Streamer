import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get private key from environment variable or file
let privateKey;
try {
  // First try to get from environment variable
  privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  
  // If not in env, try to read from file
  if (!privateKey) {
    const privateKeyPath = path.join(__dirname, 'private.pem');
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('Private key loaded from file system');
  } else {
    console.log('Private key loaded from environment variable');
  }
} catch (error) {
  console.error('Error loading private key:', error);
  privateKey = null;
}

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
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'node-ver', 'x-docusign-sdk', 'Origin', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: true
}));

// Handle preflight requests for all routes
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, node-ver, x-docusign-sdk, Origin, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

app.use(express.json({
  limit: '50mb'  // Increase payload size limit for base64 encoded documents
}));

// Helper function to format private key
function formatPrivateKey(key) {
  try {
    // If no key provided, use the environment/file-based private key
    const keyToUse = key || privateKey;
    
    if (!keyToUse) {
      throw new Error('Private key is empty or undefined');
    }

    // Clean up the key if it's from environment variable
    // This handles cases where the key might have been minified
    const cleanKey = keyToUse
      .replace(/\\n/g, '\n')  // Replace literal \n with newlines
      .trim();

    return cleanKey;
  } catch (error) {
    console.error('Error formatting private key:', error);
    throw new Error(`Failed to format private key: ${error.message}`);
  }
}

// DocuSign authentication endpoint
app.post('/api/docusign/auth', async (req, res) => {
  try {
    const { integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY, userId = process.env.DOCUSIGN_USER_ID } = req.body;
    
    if (!integrationKey || !userId || !privateKey) {
      throw new Error('Missing required DocuSign credentials');
    }

    // Create JWT token payload
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'account-d.docusign.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: 'signature impersonation'
    };

    // Sign the JWT token using the PEM file
    const assertion = jwt.sign(payload, privateKey, { 
      algorithm: 'RS256'
    });

    console.log('JWT assertion created successfully');

    // Get access token from DocuSign
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('DocuSign authentication failed:', data);
      throw new Error(`DocuSign error: ${data.error || 'Unknown error'}`);
    }

    console.log('DocuSign authentication successful');
    res.json(data);
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
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
    // Log raw request details
    console.log('=== DocuSign Connect Webhook Received ===');
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    // Parse and validate the data
    const data = req.body;
    console.log('\n=== Webhook Data Validation ===');
    console.log('Has Body:', !!data);
    console.log('Body Type:', typeof data);
    console.log('EnvelopeId:', data?.envelopeId);
    console.log('Status:', data?.status);
    
    // Basic validation
    if (!data) {
      console.error('Error: Empty request body');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is empty',
        timestamp: new Date().toISOString()
      });
    }

    if (!data.envelopeId) {
      console.error('Error: Missing envelopeId in payload:', data);
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Missing required field: envelopeId',
        receivedPayload: data,
        timestamp: new Date().toISOString()
      });
    }

    console.log('\n=== Processing Envelope Status ===');
    console.log('Envelope ID:', data.envelopeId);
    console.log('Current Status:', data.status);

    // Process completed envelopes
    if (data.status === 'completed') {
      console.log('\n=== Querying Supabase ===');
      
      // Query Supabase for the application
      const { data: applications, error: queryError } = await supabase
        .from('applications')
        .select('id, status, envelope_id')
        .eq('envelope_id', data.envelopeId)
        .single();

      // Log Supabase query results
      console.log('Supabase Query Results:', {
        success: !queryError,
        error: queryError,
        applicationFound: !!applications,
        applicationData: applications
      });

      if (queryError) {
        console.error('Supabase Query Error:', queryError);
        throw new Error(`Database query failed: ${queryError.message}`);
      }

      if (!applications) {
        console.warn('No matching application found for envelope:', data.envelopeId);
        return res.status(404).json({
          warning: 'Application not found',
          envelopeId: data.envelopeId,
          timestamp: new Date().toISOString()
        });
      }

      console.log('\n=== Updating Application Status ===');
      console.log('Application ID:', applications.id);
      console.log('Current Status:', applications.status);
      
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          status: 'signed',
          updated_at: new Date().toISOString()
        })
        .eq('id', applications.id);

      if (updateError) {
        console.error('Status Update Error:', updateError);
        throw new Error(`Failed to update status: ${updateError.message}`);
      }

      console.log('Successfully updated application status to signed');
      
      return res.status(200).json({
        message: 'Webhook processed successfully',
        envelopeId: data.envelopeId,
        applicationId: applications.id,
        newStatus: 'signed',
        timestamp: new Date().toISOString()
      });
    }

    // Handle non-completed status
    console.log('Envelope not completed, no action needed');
    return res.status(200).json({
      message: 'Webhook received, no action needed',
      envelopeId: data.envelopeId,
      status: data.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n=== Webhook Processing Error ===');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', req.body);
    
    return res.status(500).json({
      error: 'Webhook processing failed',
      type: error.constructor.name,
      message: error.message,
      timestamp: new Date().toISOString()
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

// Add a root route handler
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'MicroGrants API Server is running',
    endpoints: {
      auth: '/api/docusign/auth',
      envelopes: '/api/docusign/envelopes',
      connect: '/api/docusign/connect',
      generatePdf: '/api/generate-pdf'
    }
  });
});

// Add a catch-all route for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Add OPTIONS handler for CORS
app.options('*', (req, res) => {
  console.log('Handling OPTIONS request for:', req.url);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-DocuSign-Signature-1');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// Export the Express API
export default app; 