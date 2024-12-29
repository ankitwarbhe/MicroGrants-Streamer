import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { GeminiChatService, ChatMessage } from '../../services/gemini';
import { useLocation } from 'react-router-dom';
import { docuSignService } from '../../services/docusign';
import ReactMarkdown from 'react-markdown';

// Sample greetings that will rotate
const GREETINGS = [
  "👋 Welcome! How can I assist you today?",
  "Hello there! Ready to help you with your application!",
  "Hi! Let's explore your application details together.",
  "Greetings! I'm here to help answer your questions.",
  "Welcome back! What would you like to know about the application?"
];

// Sample questions that will rotate
const SAMPLE_QUESTIONS = [
  [
    "What is the current status of this application?",
    "What is the total amount requested in this grant?",
    "What is the project's main objective?"
  ],
  [
    "Can you show me the payment details for this application?",
    "What is the applicant's full name and contact information?",
    "When was the last update made to this application?"
  ],
  [
    "What is the current stage of disbursement?",
    "Has the admin provided any feedback on this application?",
    "What are the complete bank account details?"
  ],
  [
    "What is the status of document signatures?",
    "What is the beneficiary's UPI ID?",
    "What is the IFSC code provided?"
  ],
  [
    "What is the project timeline mentioned?",
    "What are the specific deliverables listed?",
    "What is the current completion status?"
  ],
  [
    "What supporting documents have been submitted?",
    "Are there any pending requirements?",
    "What is the bank branch name provided?"
  ],
  [
    "What type of bank account is specified?",
    "What is the exact disbursement progress?",
    "When was the document signed?"
  ],
  [
    "What is the applicant's preferred payment method?",
    "Has the payment been completed?",
    "What is the grant agreement status?"
  ],
  [
    "What specific feedback was given by reviewers?",
    "Are there any conditions attached to the approval?",
    "What is the currency of the requested amount?"
  ],
  [
    "What is the complete payment information?",
    "Has the document been fully executed?",
    "What are the next steps in the process?"
  ]
];

interface ChatBotProps {
  userId: string;
  isAdmin: boolean;
  envelopeId?: string;
  documentContent?: string;
}

// Create service instance outside component to prevent recreation
let chatServiceRef: GeminiChatService | null = null;

export function ChatBot({ userId, isAdmin, envelopeId, documentContent }: ChatBotProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [currentQuestions, setCurrentQuestions] = useState(() => 
    SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)]
  );
  const [greeting] = useState(() => 
    GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
  );

  // Add state for showing suggested questions
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Get current page from pathname
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path.startsWith('/applications/')) {
      const match = path.match(/\/applications\/([^\/]+)/);
      return match ? `application/${match[1]}` : 'application';
    }
    if (path === '/dashboard') return 'dashboard';
    if (path === '/about') return 'about';
    return path.replace('/', '');
  };

  // Check if chatbot should be visible
  const shouldShowChatbot = () => {
    const currentPage = getCurrentPage();
    // Hide on user dashboard
    if (currentPage === 'dashboard' && !isAdmin) {
      return false;
    }
    return true;
  };

  // Initialize chat service with document content
  useEffect(() => {
    if (!shouldShowChatbot()) return;

    try {
      if (!chatServiceRef) {
        console.log('🚀 Creating new GeminiChatService instance');
        chatServiceRef = new GeminiChatService();
      }
      const currentPage = getCurrentPage();
      console.log('📍 Context Setup:', { 
        userId, 
        isAdmin, 
        currentPage,
        hasDocumentContent: !!documentContent,
        hasEnvelopeId: !!envelopeId 
      });

      // Extract application ID from the current page
      const applicationId = currentPage.startsWith('application/') ? currentPage.split('/')[1] : null;
      console.log('🔍 Extracted application ID:', applicationId);

      chatServiceRef.setUser(userId, isAdmin);
      chatServiceRef.setCurrentPage(currentPage, applicationId);

      // If we have document content, set it in the chat service
      if (documentContent) {
        try {
          console.log('📄 Setting document content:', {
            contentLength: documentContent?.length || 0,
            preview: documentContent ? documentContent.substring(0, 100) + '...' : 'No content'
          });
          chatServiceRef.setDocumentContent(documentContent);
        } catch (err) {
          console.error('❌ Error setting document content:', err);
          console.warn('Will continue without document content');
        }
      }

      setError(null);
    } catch (err) {
      console.error('❌ Error initializing chat service:', err);
      setError('Failed to initialize chat service. Please try again.');
    }
  }, [userId, isAdmin, location.pathname, envelopeId, documentContent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const refreshQuestions = () => {
    let newQuestions;
    do {
      newQuestions = SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)];
    } while (newQuestions === currentQuestions);
    console.log('🔄 New questions selected:', newQuestions);
    setCurrentQuestions(newQuestions);
    setShowSuggestions(true);
  };

  const handleQuestionClick = async (question: string) => {
    console.log('👆 Question clicked:', question);
    setInputMessage(question);
    setShowSuggestions(false);
    await handleSubmit(null, question);
    console.log('🔄 Refreshing questions after answer');
    refreshQuestions();
  };

  const handleSubmit = async (e: React.FormEvent | null, forcedMessage?: string) => {
    if (e) e.preventDefault();
    const messageToSend = forcedMessage || inputMessage;
    if (!messageToSend.trim() || isLoading || !chatServiceRef) return;

    console.log('📤 Sending message:', {
      message: messageToSend,
      isForced: !!forcedMessage,
      timestamp: new Date().toISOString()
    });

    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend.trim() }]);
    setIsLoading(true);
    setError(null);

    try {
      console.time('⏱️ Chat Response Time');
      const response = await chatServiceRef.sendMessage(messageToSend.trim());
      console.timeEnd('⏱️ Chat Response Time');
      
      console.log('📥 Received response:', {
        responseLength: response.length,
        preview: response.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('❌ Chat error:', error);
      let errorMessage = 'An unexpected error occurred. Please try again later.';
      
      // Check if it's a quota exceeded error
      if (error instanceof Error && error.message.includes('quota')) {
        errorMessage = `## API Quota Exceeded

> **Service Temporarily Unavailable**

The AI service is currently unavailable due to high demand. This typically happens when:
- The daily API quota has been reached
- Too many requests were made in a short time
- The service is experiencing heavy load

**What you can do:**
1. Wait a few minutes and try again
2. Try refreshing the page
3. If the issue persists, please try again later or contact support

We apologize for any inconvenience. Your application data is safe and will be available when the service resumes.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: errorMessage }
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
    console.log(`${isOpen ? '🔒 Closing' : '🔓 Opening'} chat window`);
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Don't render if chatbot should not be visible
  if (!shouldShowChatbot()) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[500px] bg-white rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold text-gray-800">
              {isAdmin ? 'Admin Assistant' : 'Grant Assistant'}
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
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-800 mb-1">{greeting}</p>
                  <p className="text-xs text-gray-500">
                    {isAdmin 
                      ? "I'll help you review this application using the available data and documents."
                      : "I'll help you with your application using the available data and documents."}
                  </p>
                </div>
                {/* Show initial questions */}
                <div className="bg-gray-50 rounded-lg p-3 mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Quick Questions:</p>
                  <div className="space-y-2">
                    {currentQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuestionClick(question)}
                        className="w-full text-left p-2 rounded-md text-xs bg-white border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-150 ease-in-out"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
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
                  className={`max-w-[90%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
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

          {/* Suggested Questions - Show after each answer */}
          {showSuggestions && messages.length > 0 && (
            <div className="border-t border-gray-100 p-3 bg-gray-50">
              <p className="text-xs font-medium text-gray-700 mb-2">Suggested Questions:</p>
              <div className="space-y-2">
                {currentQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(question)}
                    className="w-full text-left p-2 rounded-md text-xs bg-white border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 transition-colors duration-150 ease-in-out"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                className="flex-1 resize-none rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent min-h-[36px] max-h-24 disabled:opacity-50 disabled:bg-gray-50"
                rows={1}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim() || !chatServiceRef || !!error}
                className="bg-indigo-600 text-white rounded-lg p-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
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