import React, { useState, useRef, useEffect } from 'react';
import { API_CONFIG, UI_CONFIG } from '../config/constants';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: string[];
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Hi! I\'m your mortgage assistant powered by Gemini AI. I can help you with:\n\n• General mortgage questions and advice\n• Document requirements and explanations\n• Analyzing your uploaded documents\n• Extracting information from your files\n\nFeel free to ask me anything!',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ragQueryUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RAG_QUERY}`;
      const response = await fetch(ragQueryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input,
          n_results: UI_CONFIG.RAG_DEFAULT_RESULTS_COUNT,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 'I couldn\'t find an answer to that question.',
        sender: 'bot',
        timestamp: new Date(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again or rephrase your question.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedQuestions = [
    'What documents do I need for a mortgage application?',
    'What is a good credit score for a mortgage?',
    'Explain the difference between pre-approval and pre-qualification',
    'What are closing costs?',
    'How much down payment do I need?',
  ];

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
        <div className="flex items-center">
          <svg
            className="w-8 h-8 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <div>
            <h2 className="text-xl font-bold">Document Assistant</h2>
            <p className="text-sm text-purple-100">
              Powered by Gemini AI
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
              
              {/* Show sources if available */}
              {message.sources && message.sources.length > 0 && (
                <details className="mt-3 pt-3 border-t border-gray-200">
                  <summary className="text-sm text-purple-600 cursor-pointer hover:text-purple-700">
                    View {message.sources.length} source(s)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {message.sources.slice(0, 2).map((source, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 p-2 rounded text-xs text-gray-600 border-l-2 border-purple-300"
                      >
                        {source.substring(0, 150)}...
                      </div>
                    ))}
                  </div>
                </details>
              )}
              
              <p
                className={`text-xs mt-2 ${
                  message.sender === 'user'
                    ? 'text-blue-100'
                    : 'text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (only show when no messages or few messages) */}
      {messages.length <= 1 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(question)}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about mortgages, documents, or your uploaded files..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
