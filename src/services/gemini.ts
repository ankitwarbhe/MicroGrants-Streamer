import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
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
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.resetChat();
  }

  setUser(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  setCurrentPage(page: string) {
    this.currentPage = page;
    if (page.includes('applications/')) {
      const applicationId = page.split('applications/')[1];
      if (applicationId) {
        this.fetchApplicationData(applicationId);
      }
    }
  }

  private async fetchApplicationData(applicationId: string) {
    try {
      const application = await getApplicationById(applicationId);
      if (application) {
        this.applicationData = `
## Application Details
- ID: ${application.id}
- Title: ${application.title}
- Description: ${application.description}
- Amount Requested: ${application.amount_requested}
- Currency: ${application.currency}
- Status: ${application.status}
- Applicant: ${application.first_name} ${application.last_name}
- Email: ${application.user_email}
- Created: ${new Date(application.created_at).toLocaleDateString()}
${application.feedback ? `- Feedback: ${application.feedback}` : ''}
${application.payment_details ? `
## Payment Details
- Beneficiary Name: ${application.payment_details.beneficiary_name}
- Bank Branch: ${application.payment_details.bank_branch}
- Account Type: ${application.payment_details.account_type}
- IFSC Code: ${application.payment_details.ifsc_code}
- UPI ID: ${application.payment_details.upi_id}` : ''}
${application.disbursement_steps ? `
## Disbursement Status
${application.disbursement_steps.map((step: DisbursementStep) => `- ${step.label}: ${step.status}`).join('\n')}` : ''}`;
        
        this.resetChat(); // Reset chat with new application data
      }
    } catch (error) {
      console.error('Error fetching application data:', error);
    }
  }

  setDocumentContent(content: string) {
    this.documentContent = content;
    this.resetChat(); // Reset chat when document content changes
  }

  private resetChat() {
    try {
      this.chat = this.model.startChat({
        history: [],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });
    } catch (error) {
      console.error('Error resetting chat:', error);
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
      If the answer cannot be found in the provided information, respond with "I apologize, but I can only answer based on the information in the application data and documents, and I don't see that information in the provided content."
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
      context += `\nFormat your response using markdown syntax:
      - Use ## for section headings
      - Use * or ** for emphasis
      - Use - or * for bullet points
      - Use > for important quotes or notes
      - Use \`code\` for technical terms or values
      - Structure your response clearly with proper spacing
      - Always cite whether your answer comes from the application data or document content\n\n`;

      // Add the user's message
      const fullPrompt = `${context}\n\nUser Query: ${message}\n\nRemember: Only answer using the information provided above. If the information isn't in the sources provided, say so.`;

      const result = await this.chat.sendMessage(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
} 