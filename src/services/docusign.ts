import { Buffer } from 'buffer';

interface SignatureRequest {
  documentPath: string;
  signerEmail: string;
  signerName: string;
  documentName?: string;
  applicationId: string;
}

interface DocuSignError {
  message: string;
  errorCode?: string;
  response?: any;
}

interface RequestInterceptor {
  (request: { headers?: Record<string, string> }): { headers?: Record<string, string> };
}

// Environment variables
const env = {
  authServer: import.meta.env.VITE_DOCUSIGN_AUTH_SERVER || 'https://demo.docusign.net/restapi',
  integrationKey: import.meta.env.VITE_DOCUSIGN_INTEGRATION_KEY,
  userId: import.meta.env.VITE_DOCUSIGN_USER_ID,
  accountId: import.meta.env.VITE_DOCUSIGN_ACCOUNT_ID,
  privateKey: import.meta.env.VITE_DOCUSIGN_PRIVATE_KEY
};

// Make Buffer available globally
window.Buffer = Buffer;

// Helper function to format private key
function formatPrivateKey(key: string): string {
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
    throw new Error(`Failed to format private key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to find available auth server
async function findAuthServer(startPort: number = 3001, maxPort: number = 3010): Promise<string> {
  for (let port = startPort; port <= maxPort; port++) {
    try {
      const response = await fetch(`http://localhost:${port}/api/docusign/auth`, {
        method: 'HEAD'
      });
      if (response.ok || response.status === 404) { // 404 is ok because the endpoint exists but requires POST
        return `http://localhost:${port}`;
      }
    } catch (error) {
      // Continue to next port
      continue;
    }
  }
  throw new Error('Could not find running authentication server');
}

export class DocuSignService {
  private authServerUrl: string | null = null;

  constructor() {
    console.log('Initializing DocuSign service...');
  }

  async getAuthServerUrl(): Promise<string> {
    if (this.authServerUrl) {
      return this.authServerUrl;
    }

    // Use environment variable for server URL
    this.authServerUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return this.authServerUrl;
  }

  async sendDocumentForSignature({
    documentPath,
    signerEmail,
    signerName,
    documentName = 'Document for Signature',
    applicationId
  }: SignatureRequest) {
    try {
      const authServerUrl = await this.getAuthServerUrl();

      // First, get an access token
      const authResponse = await fetch(`${authServerUrl}/api/docusign/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integrationKey: env.integrationKey,
          userId: env.userId,
          privateKey: env.privateKey
        })
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || 'Failed to authenticate');
      }

      const { access_token } = await authResponse.json();

      // Create envelope
      const envelopeResponse = await fetch(`${authServerUrl}/api/docusign/envelopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: env.accountId,
          accessToken: access_token,
          applicationId,
          envelope: {
            emailSubject: `Please sign the grant agreement for: ${documentName.replace(' - Grant Agreement.pdf', '')}`,
            documents: [{
              documentBase64: documentPath,
              name: documentName,
              fileExtension: 'pdf',
              documentId: '1'
            }],
            recipients: {
              signers: [{
                email: signerEmail,
                name: signerName,
                recipientId: '1',
                tabs: {
                  signHereTabs: [{
                    anchorString: '/sig1/',
                    anchorUnits: 'pixels',
                    anchorXOffset: '0',
                    anchorYOffset: '0'
                  }]
                }
              }]
            },
            status: 'sent'
          }
        })
      });

      if (!envelopeResponse.ok) {
        const error = await envelopeResponse.json();
        throw new Error(error.message || 'Failed to create envelope');
      }

      return await envelopeResponse.json();
    } catch (error) {
      console.error('DocuSign error:', error);
      throw error;
    }
  }

  async getSignedDocument(envelopeId: string): Promise<string> {
    try {
      const authServerUrl = await this.getAuthServerUrl();

      // First, get an access token
      const authResponse = await fetch(`${authServerUrl}/api/docusign/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integrationKey: env.integrationKey,
          userId: env.userId,
          privateKey: env.privateKey
        })
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.message || 'Failed to authenticate');
      }

      const { access_token } = await authResponse.json();

      // Get the signed document
      const documentResponse = await fetch(`${authServerUrl}/api/docusign/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: env.accountId,
          accessToken: access_token,
          envelopeId
        })
      });

      if (!documentResponse.ok) {
        const error = await documentResponse.json();
        throw new Error(error.message || 'Failed to get signed document');
      }

      const { documentBase64 } = await documentResponse.json();
      return documentBase64;
    } catch (error) {
      console.error('DocuSign error:', error);
      throw error;
    }
  }
}

export const docuSignService = new DocuSignService(); 