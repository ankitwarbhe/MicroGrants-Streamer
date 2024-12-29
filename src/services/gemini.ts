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
  private userId: string = '';
  private isAdmin: boolean = false;
  private currentPage: string = '';
  private documentContent: string = '';

  setUser(userId: string, isAdmin: boolean) {
    this.userId = userId;
    this.isAdmin = isAdmin;
  }

  setCurrentPage(page: string) {
    this.currentPage = page;
  }

  setDocumentContent(content: string) {
    this.documentContent = content;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Include document content in context if available
      const context = this.documentContent 
        ? `Document content: ${this.documentContent}\n\nUser query: ${message}`
        : message;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: context,
          userId: this.userId,
          isAdmin: this.isAdmin,
          currentPage: this.currentPage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
} 