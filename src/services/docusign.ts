import { Buffer } from 'buffer';

interface SignatureRequest {
  documentPath?: string;
  signerEmail: string;
  signerName: string;
  documentName?: string;
  applicationId: string;
  templateId?: string;
  templateRoles?: {
    email: string;
    name: string;
    roleName: string;
    tabs?: Record<string, any>;
  }[];
  reminderSettings?: {
    reminderEnabled: boolean;
    reminderDelay: number; // Days before first reminder
    reminderFrequency: number; // Days between reminders
  };
  expirationSettings?: {
    expirationEnabled: boolean;
    expirationDays: number; // Days until envelope expires
    warningDays: number; // Days before expiration to warn signers
  };
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

// Helper function to create email subject
function createEmailSubject(title: string): string {
  const prefix = 'Please sign the grant agreement for: ';
  const maxTitleLength = 100 - prefix.length - 3; // 3 characters for ellipsis
  const cleanTitle = title.replace(' - Grant Agreement.pdf', '').replace(' - Grant Agreement', '');
  
  if (cleanTitle.length > maxTitleLength) {
    return `${prefix}${cleanTitle.substring(0, maxTitleLength)}...`;
  }
  return `${prefix}${cleanTitle}`;
}

export class DocuSignService {
  private authServerUrl: string = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  constructor() {
    console.log('Initializing DocuSign service...');
  }

  async getAuthServerUrl(): Promise<string> {
    return this.authServerUrl;
  }

  async sendDocumentForSignature({
    documentPath,
    signerEmail,
    signerName,
    documentName = 'Document for Signature',
    applicationId,
    templateId,
    templateRoles,
    reminderSettings = {
      reminderEnabled: true,
      reminderDelay: 2, // First reminder after 2 days
      reminderFrequency: 2, // Remind every 2 days
    },
    expirationSettings = {
      expirationEnabled: true,
      expirationDays: 14, // Expire after 14 days
      warningDays: 3, // Warn 3 days before expiration
    }
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

      // Create envelope with reminder and expiration settings
      const envelopeResponse = await fetch(`${authServerUrl}/api/docusign/envelopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: env.accountId,
          accessToken: access_token,
          applicationId,
          envelope: templateId ? {
            // Template-based envelope
            templateId,
            emailSubject: createEmailSubject(documentName),
            status: 'sent',
            templateRoles: templateRoles || [{
              email: signerEmail,
              name: signerName,
              roleName: 'signer'
            }],
            // Add notification configuration
            notification: {
              reminders: reminderSettings.reminderEnabled ? {
                reminderEnabled: 'true',
                reminderDelay: reminderSettings.reminderDelay.toString(),
                reminderFrequency: reminderSettings.reminderFrequency.toString()
              } : undefined,
              expirations: expirationSettings.expirationEnabled ? {
                expirationEnabled: 'true',
                expirationDays: expirationSettings.expirationDays.toString(),
                expireWarn: expirationSettings.warningDays.toString()
              } : undefined
            }
          } : {
            // Document-based envelope
            emailSubject: createEmailSubject(documentName),
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
            status: 'sent',
            // Add notification configuration
            notification: {
              reminders: reminderSettings.reminderEnabled ? {
                reminderEnabled: 'true',
                reminderDelay: reminderSettings.reminderDelay.toString(),
                reminderFrequency: reminderSettings.reminderFrequency.toString()
              } : undefined,
              expirations: expirationSettings.expirationEnabled ? {
                expirationEnabled: 'true',
                expirationDays: expirationSettings.expirationDays.toString(),
                expireWarn: expirationSettings.warningDays.toString()
              } : undefined
            }
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

      // Get the document content
      const documentResponse = await fetch(`${authServerUrl}/api/docusign/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Transfer-Encoding': 'base64'  // Request base64 encoding
        },
        body: JSON.stringify({
          accountId: env.accountId,
          accessToken: access_token,
          envelopeId,
          includeContent: true
        })
      });

      if (!documentResponse.ok) {
        const error = await documentResponse.json();
        throw new Error(error.message || 'Failed to get document content');
      }

      const response = await documentResponse.json();
      
      console.log('📄 Raw document response:', {
        hasResponse: !!response,
        keys: response ? Object.keys(response) : [],
        hasDocumentBase64: !!response?.documentBase64,
        preview: response?.documentBase64 ? response.documentBase64.substring(0, 100) + '...' : 'No content'
      });

      if (!response?.documentBase64) {
        console.warn('⚠️ No documentBase64 found in response');
        return '';
      }

      // Try to decode base64 to text
      try {
        const decodedBytes = Buffer.from(response.documentBase64, 'base64');
        const decodedText = decodedBytes.toString('utf-8');
        
        console.log('📄 Decoded document content:', {
          decodedLength: decodedText.length,
          preview: decodedText.substring(0, 100) + '...'
        });
        
        return decodedText;
      } catch (decodeError) {
        console.warn('⚠️ Failed to decode base64, returning raw content');
        return response.documentBase64;
      }
    } catch (error) {
      console.error('❌ Error fetching signed document:', error);
      throw error;
    }
  }

  async getDocumentContent(envelopeId: string): Promise<string> {
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

      // Get the document content
      const documentResponse = await fetch(`${authServerUrl}/api/docusign/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: env.accountId,
          accessToken: access_token,
          envelopeId,
          includeContent: true,
          format: 'text'  // Request text format instead of base64
        })
      });

      if (!documentResponse.ok) {
        const error = await documentResponse.json();
        throw new Error(error.message || 'Failed to get document content');
      }

      const response = await documentResponse.json();
      
      console.log('📄 Raw document response:', {
        hasResponse: !!response,
        keys: response ? Object.keys(response) : [],
        hasDocumentBase64: !!response?.documentBase64,
        preview: response?.documentBase64 ? response.documentBase64.substring(0, 100) + '...' : 'No content'
      });

      // Check for documentBase64 in response
      if (response?.documentBase64) {
        try {
          const decodedBytes = Buffer.from(response.documentBase64, 'base64');
          const decodedText = decodedBytes.toString('utf-8');
          console.log('📄 Document content decoded successfully:', {
            decodedLength: decodedText.length,
            preview: decodedText.substring(0, 100) + '...'
          });
          return decodedText;
        } catch (decodeError) {
          console.error('❌ Error decoding documentBase64:', decodeError);
          // Return the original base64 content if decoding fails
          return response.documentBase64;
        }
      }
      
      // If no documentBase64, check for content field
      if (response?.content) {
        return response.content;
      }
      
      console.warn('⚠️ No document content found in response');
      return '';
    } catch (error) {
      console.error('❌ Error fetching document content:', error);
      throw error;
    }
  }
}

export const docuSignService = new DocuSignService(); 