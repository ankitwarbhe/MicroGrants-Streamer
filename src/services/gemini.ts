import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';

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
  private model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  private chat;
  private userId: string | null = null;
  private isAdmin: boolean = false;
  private currentPage: string = '';

  constructor() {
    try {
      if (!API_KEY) {
        throw new Error('Gemini API key is missing');
      }
      
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
      console.error('Error initializing GeminiChatService:', error);
      throw new Error('Failed to initialize chat service');
    }
  }

  setUser(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  setCurrentPage(page: string) {
    this.currentPage = page;
    this.resetChat(); // Reset chat when page changes to ensure context-specific responses
  }

  private getPageContext(): string {
    const page = this.currentPage.toLowerCase();
    console.log('Current page context:', page);
    
    switch (page) {
      case 'about':
        return `You are currently on the About page. This page provides information about the MicroGrants platform, 
        its mission to support individuals and small projects through micro-grants, and how the platform works. 
        Focus on explaining the platform's purpose, eligibility criteria, and application process.`;
      
      case 'dashboard':
        return `You are currently on the Dashboard page. This is where users can view their applications, 
        track their status, and manage their grant requests. For admins, this page shows all applications 
        and provides management tools.`;
      
      case 'application':
        return `You are currently on the Application page. This is where users can submit new grant applications 
        or view/edit existing ones. Focus on helping with application requirements, guidelines, and best practices 
        for submitting a strong application.`;
      
      default:
        return `You are on the ${this.currentPage} page.`;
    }
  }

  private async getApplicationsContext(): Promise<string> {
    try {
      let query = supabase.from('applications').select('*');
      
      // If not admin, only show user's own applications
      if (!this.isAdmin && this.userId) {
        query = query.eq('user_id', this.userId);
      }

      const { data: applications, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

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
      if (!this.chat) {
        throw new Error('Chat service not initialized');
      }

      // Get current contexts
      const pageContext = this.getPageContext();
      console.log('Page context:', pageContext);
      
      const applicationsContext = await this.getApplicationsContext();
      console.log('Applications context loaded');
      
      // Prepare system context based on user role and current page
      const systemContext = this.isAdmin 
        ? `You are an AI assistant with access to all grant applications. You can help review applications and provide insights. 
           You can analyze trends, suggest improvements, and help with the review process.`
        : `You are an AI assistant that can help users with their grant applications. You can only see applications belonging 
           to the current user. You can provide guidance on improving applications, explain the process, and answer questions 
           about their submissions.`;

      // Combine all contexts and user message
      const fullMessage = `
        ${systemContext}
        
        Current Page Context:
        ${pageContext}
        
        Current Database Context:
        ${applicationsContext}
        
        User Question:
        ${message}
        
        Please provide a helpful response based on the current page context and available data. Keep your responses focused 
        on the current page's purpose and the user's question.
      `;

      console.log('Sending message to Gemini...');
      const result = await this.chat.sendMessage(fullMessage);
      const response = await result.response;
      console.log('Received response from Gemini');
      return response.text();
    } catch (error) {
      console.error('Detailed error in sendMessage:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get response from AI: ${error.message}`);
      }
      throw new Error('Failed to get response from AI. Please try again.');
    }
  }

  resetChat() {
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
} 