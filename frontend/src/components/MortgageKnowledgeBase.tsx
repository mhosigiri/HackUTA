import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/constants';

interface Source {
  type?: string;
  pdf_name?: string;
  page?: number | string;
  path?: string;
  filename?: string;
  document_id?: string;
  chunk?: string;
}

interface KBResponse {
  answer: string;
  sources: Source[];
  context_snippets?: string[];
  documents_found: number;
}

const MortgageKnowledgeBase: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<KBResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ policy_chunks: number; user_chunks: number; total_chunks: number } | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch stats on mount
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MORTGAGE_KB_STATS}`);
      const data = await res.json();
      if (data.available) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch KB stats:', error);
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MORTGAGE_KB_QUERY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          n_results: 3,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to query knowledge base');
      }

      const data = await res.json();
      setResponse(data);
      
      // Generate TTS if enabled
      if (ttsEnabled && data.answer) {
        generateTTS(data.answer);
      }
    } catch (error) {
      console.error('KB query error:', error);
      setResponse({
        answer: 'Failed to query mortgage knowledge base. Please try again.',
        sources: [],
        documents_found: 0,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const generateTTS = async (text: string) => {
    try {
      setPlayingAudio(true);
      
      // Clear previous audio
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.MORTGAGE_KB_TTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) {
        throw new Error('TTS generation failed');
      }
      
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Auto-play
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingAudio(false);
    } catch (error) {
      console.error('TTS error:', error);
      setPlayingAudio(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const suggestedQuestions = [
    'What are Fannie Mae debt-to-income requirements?',
    'What is the loan amount in my application?',
    'Explain FHA loan requirements',
    'Summarize my uploaded loan agreement',
    'What are the key terms in my documents?',
  ];

  return (
    <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-2xl shadow-xl p-8 border border-green-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg
            className="w-10 h-10 text-green-600 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document & Policy Assistant</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ask questions about your uploaded documents & official mortgage policies (Fannie Mae, FHA, USDA, etc.)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* TTS Toggle */}
          <div className="flex items-center bg-white px-3 py-2 rounded-lg border border-purple-300 shadow-sm">
            <input
              type="checkbox"
              id="tts-toggle"
              checked={ttsEnabled}
              onChange={(e) => setTtsEnabled(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="tts-toggle" className="ml-2 text-xs text-gray-700 cursor-pointer flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              TTS {playingAudio ? '🔊' : ''}
            </label>
          </div>
          
          {stats && (
            <div className="bg-white px-4 py-2 rounded-lg border border-green-300 shadow-sm">
              <p className="text-xs text-gray-600">Knowledge Base</p>
              <p className="text-sm font-bold text-green-600">
                {stats.policy_chunks || 0} policy + {stats.user_chunks || 0} user docs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Query Input */}
      <div className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about mortgage policies, guidelines, requirements..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleQuery}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Searching...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                Search Policies
              </>
            )}
          </button>
        </div>

        {/* Suggested Questions */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(suggestion)}
                className="text-sm px-3 py-1 bg-white border border-gray-300 rounded-full hover:border-green-400 hover:text-green-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Response Display */}
      {response && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Policy Answer:</h3>
                {ttsEnabled && audioUrl && (
                  <button
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      setPlayingAudio(true);
                      audio.play();
                      audio.onended = () => setPlayingAudio(false);
                    }}
                    disabled={playingAudio}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                    {playingAudio ? 'Playing...' : 'Play Audio'}
                  </button>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{response.answer}</p>

              {/* Sources */}
              {response.sources && response.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    📚 Sources ({response.documents_found} relevant sections found):
                  </p>
                  <div className="space-y-2">
                    {response.sources.map((source, idx) => (
                      <div key={idx} className={`p-3 rounded border-l-4 ${
                        source.type === 'user_document' 
                          ? 'bg-blue-50 border-blue-400' 
                          : 'bg-green-50 border-green-400'
                      }`}>
                        {source.type === 'user_document' ? (
                          <>
                            <p className="text-sm font-medium text-gray-900">
                              📄 {source.filename}
                            </p>
                            <p className="text-xs text-gray-600">
                              Your uploaded document • Chunk {source.chunk}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-900">
                              📚 {source.pdf_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              Page {source.page} • {source.path}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Context Snippets */}
                  {response.context_snippets && response.context_snippets.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-green-600 cursor-pointer hover:text-green-700 font-medium">
                        View policy excerpts
                      </summary>
                      <div className="mt-2 space-y-2">
                        {response.context_snippets.map((snippet, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded text-sm text-gray-600 border-l-2 border-green-300">
                            {snippet.substring(0, 300)}...
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How This Works</p>
            <p className="mb-2">
              <strong>📄 Single-page documents</strong> (invoices, IDs): Key-value extraction only
            </p>
            <p className="mb-2">
              <strong>📚 Multi-page documents</strong> (loan agreements, policies): Added to RAG system for intelligent querying with Gemini 2.5 Pro
            </p>
            <p>
              Ask questions about your uploaded documents OR query official mortgage policy documents (Fannie Mae, FHA, USDA, Freddie Mac, etc.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageKnowledgeBase;
