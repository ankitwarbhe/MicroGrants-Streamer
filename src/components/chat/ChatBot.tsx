import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { GeminiChatService, ChatMessage } from '../../services/gemini';

interface ChatBotProps {
  userId: string;
  isAdmin: boolean;
}

// Create service instance outside component to prevent recreation
let chatServiceRef: GeminiChatService | null = null;

export function ChatBot({ userId, isAdmin }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat service
  useEffect(() => {
    try {
      if (!chatServiceRef) {
        chatServiceRef = new GeminiChatService();
      }
      chatServiceRef.setUser(userId, isAdmin);
      setError(null);
    } catch (err) {
      console.error('Error initializing chat service:', err);
      setError('Failed to initialize chat service. Please check your API key configuration.');
    }
  }, [userId, isAdmin]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !chatServiceRef) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatServiceRef.sendMessage(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setError('Failed to get response from AI. Please try again.');
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-[400px] bg-white rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold text-gray-800">
              {isAdmin ? 'Admin AI Assistant' : 'AI Assistant'}
            </h3>
            <button
              onClick={toggleChat}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {error && (
              <div className="bg-red-50 text-red-700 p-2 rounded-md text-xs">
                {error}
              </div>
            )}
            {!error && messages.length === 0 && (
              <div className="text-center text-gray-500 mt-2">
                <p className="text-xs">
                  {isAdmin 
                    ? "Hello Admin! I can help you review applications and provide insights. Ask me anything about the applications."
                    : "Hello! I can help you with your grant applications. Ask me anything about your applications."}
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-2 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={!chatServiceRef || !!error}
                className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent min-h-[36px] max-h-24 disabled:opacity-50 disabled:bg-gray-50"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim() || !chatServiceRef || !!error}
                className="bg-indigo-600 text-white rounded-lg p-1.5 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleChat}
        className={`p-3 rounded-full shadow-lg transition-colors ${
          isOpen
            ? 'bg-gray-200 text-gray-800'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  );
} 