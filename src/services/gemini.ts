import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';

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
      
      // Add role context
      context += this.isAdmin 
        ? 'You are an AI assistant helping an admin review grant applications. Format your responses in markdown with proper headings, lists, and emphasis where appropriate. '
        : 'You are an AI assistant helping a grant applicant. Format your responses in markdown with proper headings, lists, and emphasis where appropriate. ';

      // Add page context
      context += `You are currently on the ${this.currentPage} page. `;

      // Add document context if available
      if (this.documentContent) {
        context += `\n\nHere is the relevant document content to reference:\n${this.documentContent}\n\n`;
      }

      // Add formatting instructions
      context += `\nFormat your response using markdown syntax:
      - Use ## for section headings
      - Use * or ** for emphasis
      - Use - or * for bullet points
      - Use > for important quotes or notes
      - Use \`code\` for technical terms or values
      - Structure your response clearly with proper spacing\n\n`;

      // Add the user's message
      const fullPrompt = `${context}\n\nUser: ${message}`;

      const result = await this.chat.sendMessage(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
} 