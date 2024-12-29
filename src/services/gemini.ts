import { GoogleGenerativeAI, GenerativeModel, ChatSession, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { getApplicationById } from './applications';
import type { DisbursementStep } from '../types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Gemini API key is missing. Please check your .env file.');
}

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(API_KEY || '');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class GeminiChatService {
  private model: GenerativeModel;
  private chat: ChatSession | null = null;
  private userId: string = '';
  private isAdmin: boolean = false;
  private currentPage: string = '';
  private documentContent: string = '';
  private applicationData: string = '';

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
        generationConfig: {
        maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
      }
      });
    this.resetChat();
  }

  setUser(userId: string, isAdmin: boolean) {
    console.log('👤 Setting user context:', { userId, isAdmin });
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  setCurrentPage(page: string, applicationId?: string | null) {
    console.log('📍 Setting current page:', page);
    this.currentPage = page;

    // If applicationId is provided directly, use it
    if (applicationId) {
      console.log('🔄 Using provided application ID:', applicationId);
      this.fetchApplicationData(applicationId);
      return;
    }

    // Otherwise try to extract from page path
    if (page.includes('applications/')) {
      const match = page.match(/applications\/([^\/]+)/);
      const extractedId = match ? match[1] : null;
      
      if (extractedId) {
        console.log('🔄 Fetching application data for ID:', extractedId);
        this.fetchApplicationData(extractedId);
      } else {
        console.warn('⚠️ Could not extract application ID from path:', page);
      }
    }
  }

  private async fetchApplicationData(applicationId: string) {
    try {
      console.log('🔍 Attempting to fetch application data for ID:', applicationId);
      const application = await getApplicationById(applicationId);
      
      if (!application) {
        console.warn('⚠️ No application found for ID:', applicationId);
        this.applicationData = '';
        return;
      }

      console.log('📊 Raw application data:', application);
      console.log('✅ Application data fetched:', {
        id: application.id,
        status: application.status,
        hasPaymentDetails: !!application.payment_details,
        hasDisbursementSteps: !!application.disbursement_steps
      });
      
      try {
        this.applicationData = `
## Application Details
- ID: ${application.id}
- Title: ${application.title || 'N/A'}
- Description: ${application.description || 'N/A'}
- Amount Requested: ${application.amount_requested || 'N/A'}
- Currency: ${application.currency || 'N/A'}
- Status: ${application.status || 'N/A'}
- Applicant: ${application.first_name || ''} ${application.last_name || ''}
- Email: ${application.user_email || 'N/A'}
- Created: ${application.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
${application.feedback ? `- Feedback: ${application.feedback}` : ''}
${application.payment_details ? `
## Payment Details
- Beneficiary Name: ${application.payment_details.beneficiary_name || 'N/A'}
- Bank Branch: ${application.payment_details.bank_branch || 'N/A'}
- Account Type: ${application.payment_details.account_type || 'N/A'}
- IFSC Code: ${application.payment_details.ifsc_code || 'N/A'}
- UPI ID: ${application.payment_details.upi_id || 'N/A'}` : ''}
${application.disbursement_steps ? `
## Disbursement Status
${application.disbursement_steps.map((step: DisbursementStep) => `- ${step.label}: ${step.status}`).join('\n')}` : ''}`;

        console.log('📄 Application data formatted:', {
          dataLength: this.applicationData.length,
          preview: this.applicationData.substring(0, 100) + '...'
        });
        
        this.resetChat(); // Reset chat with new application data
      } catch (formatError) {
        console.error('❌ Error formatting application data:', formatError);
        console.log('🔍 Application object structure:', JSON.stringify(application, null, 2));
        this.applicationData = '';
      }
    } catch (error) {
      console.error('❌ Error fetching application data:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      this.applicationData = '';
    }
  }

  setDocumentContent(content: string | null | undefined) {
    try {
      if (!content) {
        console.log('⚠️ No document content provided, chat will use application data only');
        this.documentContent = '';
        return;
      }
      
      if (typeof content !== 'string' || content.trim() === '') {
        console.log('⚠️ Empty document content provided, chat will use application data only');
        this.documentContent = '';
        return;
      }

      // Try to extract meaningful text from the content
      let processedContent = content;
      
      // If it looks like PDF content, try to extract text
      if (content.includes('%PDF') || content.includes('%%EOF')) {
        console.log('📄 Detected PDF-like content, extracting text...');
        // Extract text between PDF markers, remove binary data
        processedContent = content
          .replace(/%PDF[^]*%%EOF/g, '') // Remove PDF wrapper
          .replace(/[\x00-\x1F\x7F-\xFF]/g, ' ') // Remove binary characters
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }
      
      console.log('📄 Setting document content:', {
        originalLength: content.length,
        processedLength: processedContent.length,
        preview: processedContent.substring(0, 100) + '...'
      });

      this.documentContent = processedContent;
      this.resetChat(); // Reset chat when document content changes
    } catch (error) {
      console.error('❌ Error setting document content:', error);
      console.log('⚠️ Continuing with application data only');
      this.documentContent = '';
    }
  }

  private resetChat() {
    try {
      console.log('🔄 Resetting chat session with Gemini 1.5 Flash model');
      this.chat = this.model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });
      console.log('✅ Chat session reset successfully');
    } catch (error) {
      console.error('❌ Error resetting chat:', error);
      throw new Error('Failed to reset chat service');
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      if (!this.chat) {
        throw new Error('Chat service not initialized');
      }

      // Create context for the message
      let context = '';
      
      // Add strict instruction about using only provided information
      context += `You are an AI assistant that can ONLY answer questions using the information provided below. 
      For every response:
      1. Start with "## Answer" heading
      2. Clearly state which source you found the information in (Application Data or Document Content)
      3. If information is not found, respond with:
         "> Note: This information is not available in the provided application data or documents."
      4. If you find partial information, clearly state what was found and what was missing
      5. Use quotes when directly referencing content
      
      DO NOT make assumptions or provide information from outside these sources.
      `;

      // Add role context
      context += this.isAdmin 
        ? 'You are helping an admin review grant applications. '
        : 'You are helping a grant applicant with their application. ';

      // Add page context
      context += `You are currently on the ${this.currentPage} page.\n\n`;

      // Add available data sources explanation
      context += `Available information sources:\n`;
      if (this.applicationData) {
        context += `1. Application Database Data\n`;
      }
      if (this.documentContent) {
        context += `2. Document Content\n`;
      } else {
        context += `Note: Document content is not yet available.\n`;
      }
      context += `\n`;

      // Add application data if available
      if (this.applicationData) {
        context += `\n=== APPLICATION DATABASE DATA ===\n${this.applicationData}\n\n`;
      }

      // Add document content if available
      if (this.documentContent) {
        context += `\n=== DOCUMENT CONTENT ===\n${this.documentContent}\n\n`;
      }

      // Add formatting instructions
      context += `\nFormat your response using markdown:
      - Always start with "## Answer"
      - Use "> Source: ..." to cite where information was found
      - Use bullet points for listing information
      - Use quotes for direct references
      - If information is missing, use "> Note: ..." format
      - Keep responses concise and focused\n\n`;

      // Add the user's message
      const fullPrompt = `${context}\n\nUser Query: ${message}\n\nRemember: Only answer using the information provided above. Always cite your source.`;

      // Log the full prompt in a readable format
      console.group('📝 Full Prompt Details');
      console.log('%c=== SYSTEM INSTRUCTIONS ===', 'color: #2563eb; font-weight: bold');
      console.log(context.split('\n\n')[0]); // Instructions part
      
      console.log('%c=== ROLE CONTEXT ===', 'color: #2563eb; font-weight: bold');
      console.log(`Role: ${this.isAdmin ? 'Admin' : 'User'}`);
      console.log(`Page: ${this.currentPage}`);
      
      console.log('%c=== AVAILABLE DATA SOURCES ===', 'color: #2563eb; font-weight: bold');
      if (this.applicationData) console.log('- Application Database Data');
      if (this.documentContent) console.log('- Document Content');
      
      if (this.applicationData) {
        console.log('%c=== APPLICATION DATA ===', 'color: #2563eb; font-weight: bold');
        console.log(this.applicationData);
      }
      
      if (this.documentContent) {
        console.log('%c=== DOCUMENT CONTENT ===', 'color: #2563eb; font-weight: bold');
        console.log(this.documentContent);
      }
      
      console.log('%c=== USER QUERY ===', 'color: #2563eb; font-weight: bold');
      console.log(message);
      
      console.log('%c=== FULL RAW PROMPT ===', 'color: #2563eb; font-weight: bold');
      console.log(fullPrompt);
      console.groupEnd();

      console.log('📤 Sending prompt to Gemini:', {
        messageLength: message.length,
        contextLength: context.length,
        fullPromptLength: fullPrompt.length,
        availableDataSources: {
          hasApplicationData: !!this.applicationData,
          hasDocumentContent: !!this.documentContent
        },
        timestamp: new Date().toISOString()
      });

      const result = await this.chat.sendMessage(fullPrompt);
      const response = await result.response;
      
      console.log('📥 Received response from Gemini:', {
        responseLength: response.text().length,
        preview: response.text().substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      return response.text();
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw new Error('Failed to send message. Please try again.');
    }
  }
} 