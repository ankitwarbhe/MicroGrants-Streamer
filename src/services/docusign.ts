import { ApiClient, EnvelopesApi } from 'docusign-esign';
import { Buffer } from 'buffer';

interface SignatureRequest {
  documentPath: string;
  signerEmail: string;
  signerName: string;
  documentName?: string;
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
  private client: ApiClient;
  private envelopesApi: EnvelopesApi;
  private authServerUrl: string | null = null;
  
  constructor() {
    console.log('Initializing DocuSign service...');
    console.log('Auth server:', env.authServer);
    
    // Initialize DocuSign client with minimal configuration
    this.client = new ApiClient({
      basePath: env.authServer,
      oAuthBasePath: 'https://account-d.docusign.com'
    });

    // Only set essential headers
    this.client.addDefaultHeader('Content-Type', 'application/json');
    
    this.envelopesApi = new EnvelopesApi(this.client);
  }

  private async authenticate() {
    console.log('Starting authentication...');
    const { privateKey, integrationKey, userId } = env;

    if (!privateKey || !integrationKey || !userId) {
      console.error('Missing credentials:', { 
        hasPrivateKey: !!privateKey,
        hasIntegrationKey: !!integrationKey,
        hasUserId: !!userId 
      });
      throw new Error('DocuSign credentials not configured');
    }

    try {
      // Format the private key
      const formattedKey = formatPrivateKey(privateKey);
      console.log('Private key formatted successfully');

      // Find the authentication server if we haven't already
      if (!this.authServerUrl) {
        console.log('Looking for authentication server...');
        this.authServerUrl = await findAuthServer();
        console.log('Found authentication server at:', this.authServerUrl);
      }

      // Log the authentication attempt
      console.log('Attempting authentication via local server...');

      // Call our authentication server
      const response = await fetch(`${this.authServerUrl}/api/docusign/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          integrationKey,
          userId,
          privateKey: formattedKey
        })
      });

      console.log('Auth server response status:', response.status);
      const data = await response.json();

      if (!response.ok || !data.access_token) {
        console.error('Auth server error response:', data);
        throw new Error(data.error || 'Failed to get access token');
      }

      this.client.addDefaultHeader('Authorization', `Bearer ${data.access_token}`);
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to authenticate with DocuSign: ${errorMessage}`);
    }
  }

  async sendDocumentForSignature({
    documentPath,
    signerEmail,
    signerName,
    documentName = 'Document for Signature'
  }: SignatureRequest) {
    try {
      console.log('Starting document signature process...');
      await this.authenticate();

      if (!env.accountId) {
        throw new Error('DocuSign account ID not configured');
      }

      console.log('Creating envelope with:', {
        documentName,
        signerEmail,
        signerName
      });

      // Create the envelope definition
      const envelope: any = {
        emailSubject: `Please sign: ${documentName}`,
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
            routingOrder: '1',
            tabs: {
              signHereTabs: [{
                anchorString: '/sig1/',
                anchorUnits: 'pixels',
                anchorXOffset: '20',
                anchorYOffset: '10'
              }]
            }
          }]
        },
        status: 'sent'
      };

      console.log('Sending envelope...', {
        documentName,
        signerEmail,
        signerName,
        documentSize: documentPath.length
      });
      // Get the current access token from the Authorization header
      const accessToken = (this.client as any).defaultHeaders['Authorization']?.replace('Bearer ', '');
      
      if (!accessToken) {
        throw new Error('No access token available. Please authenticate first.');
      }

      // Use our proxy endpoint instead of calling DocuSign directly
      const response = await fetch(`${this.authServerUrl}/api/docusign/envelopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: env.accountId,
          envelope,
          accessToken
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Server error details:', data);
        throw new Error(data.error || data.docusignError?.message || 'Failed to create envelope');
      }

      console.log('Envelope sent successfully:', data);
      return {
        envelopeId: data.envelopeId,
        status: data.status
      };
    } catch (error) {
      console.error('Error sending document for signature:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to send document: ${errorMessage}`);
    }
  }
}

export const docuSignService = new DocuSignService(); 