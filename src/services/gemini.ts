import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class GeminiChatService {
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  private chat;
  private userId: string | null = null;
  private isAdmin: boolean = false;

  constructor() {
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
  }

  setUser(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  private async getApplicationsContext(): Promise<string> {
    try {
      let query = supabase.from('applications').select('*');
      
      // If not admin, only show user's own applications
      if (!this.isAdmin && this.userId) {
        query = query.eq('user_id', this.userId);
      }

      const { data: applications, error } = await query;

      if (error) throw error;

      if (!applications || applications.length === 0) {
        return 'No applications found in the database.';
      }

      // Format applications into a readable context string
      const contextStr = applications.map(app => `
        Application ID: ${app.id}
        Title: ${app.title}
        Status: ${app.status}
        Amount: $${app.amount_requested}
        Description: ${app.description}
        Created: ${new Date(app.created_at).toLocaleDateString()}
      `).join('\n---\n');

      return `Here are the relevant applications:\n${contextStr}`;
    } catch (error) {
      console.error('Error fetching applications context:', error);
      return 'Unable to fetch applications data.';
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Get current context
      const context = await this.getApplicationsContext();
      
      // Prepare system context based on user role
      const systemContext = this.isAdmin 
        ? "You are an AI assistant with access to all grant applications. You can help review applications and provide insights. You can analyze trends, suggest improvements, and help with the review process."
        : "You are an AI assistant that can help users with their grant applications. You can only see applications belonging to the current user. You can provide guidance on improving applications, explain the process, and answer questions about their submission when asked about applications. reply with name price and status  along with user email.";

      // Combine context and user message
      const fullMessage = `
        ${systemContext}
        
        Current Database Context:
        ${context}
        
        User Question:
        ${message}
        
        Please provide a helpful response based on the available data. If you need to reference specific applications, use their IDs. Keep your responses concise and focused on the user's question.
      `;

      const result = await this.chat.sendMessage(fullMessage);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw new Error('Failed to get response from AI. Please try again.');
    }
  }

  resetChat() {
    this.chat = this.model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
  }
} 