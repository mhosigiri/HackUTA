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
    <div className="spidey-card p-8 web-pattern comic-explode" 
         style={{background: 'linear-gradient(135deg, #ffffff 0%, #e6f3ff 100%)'}}>
      <div className="spider-web-corner"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="w-16 h-16 spidey-gradient-blue rounded-lg flex items-center justify-center mr-4 border-4 border-black rotate-3"
               style={{boxShadow: '4px 4px 0 black'}}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} 
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold comic-heading" 
                style={{color: '#2B37B4', textShadow: '3px 3px 0 black'}}>
              🕷️ SPIDER-SENSE ASSISTANT
            </h2>
            <p className="text-sm font-semibold mt-1 comic-subheading" style={{color: '#B11313'}}>
              YOUR DOCS • POLICIES • POWERED BY AI SPIDER-TECH
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* TTS Toggle - Spider-Verse Style */}
          <div className="flex items-center bg-white px-4 py-2 rounded-lg border-3 border-black spidey-badge"
               style={{boxShadow: '3px 3px 0 #DF1F2D'}}>
            <input
              type="checkbox"
              id="tts-toggle"
              checked={ttsEnabled}
              onChange={(e) => setTtsEnabled(e.target.checked)}
              className="w-5 h-5 spidey-checkbox border-2 border-black rounded"
              style={{accentColor: '#DF1F2D'}}
            />
            <label htmlFor="tts-toggle" className="ml-2 text-sm font-bold cursor-pointer flex items-center comic-subheading">
              🔊 VOICE {playingAudio ? '⚡' : ''}
            </label>
          </div>
          
          {stats && (
            <div className="bg-yellow-300 px-4 py-2 rounded-lg border-3 border-black spidey-badge">
              <p className="text-xs font-bold">KNOWLEDGE BASE</p>
              <p className="text-sm font-bold text-black">
                {stats.policy_chunks || 0} + {stats.user_chunks || 0} DOCS
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Query Input - Spider-Verse Style */}
      <div className="mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ASK ABOUT POLICIES, DOCUMENTS, REQUIREMENTS..."
            disabled={loading}
            className="flex-1 spidey-input font-semibold disabled:opacity-50"
          />
          <button
            onClick={handleQuery}
            disabled={loading || !query.trim()}
            className="spidey-button flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="spider-spinner w-5 h-5"></div>
                ANALYZING...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                SEARCH
              </>
            )}
          </button>
        </div>

        {/* Suggested Questions - Comic Style */}
        <div className="mt-4">
          <p className="text-sm font-bold mb-3 comic-subheading" style={{color: '#B11313'}}>⚡ QUICK QUESTIONS:</p>
          <div className="flex flex-wrap gap-3">
            {suggestedQuestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(suggestion)}
                className="text-xs font-bold px-4 py-2 bg-white border-3 border-black rounded-lg hover:transform hover:-translate-y-1 transition-all comic-subheading"
                style={{boxShadow: '3px 3px 0 #447BBE'}}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Response Display - Speech Bubble Style */}
      {response && (
        <div className="speech-bubble mt-6">
          <div className="flex items-start">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 border-3 border-black"
                 style={{background: '#DF1F2D', boxShadow: '3px 3px 0 black'}}>
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-bold comic-heading" style={{color: '#2B37B4', textShadow: '2px 2px 0 rgba(0,0,0,0.1)'}}>
                  SPIDER-ANSWER:
                </h3>
                {ttsEnabled && audioUrl && (
                  <button
                    onClick={() => {
                      const audio = new Audio(audioUrl);
                      setPlayingAudio(true);
                      audio.play();
                      audio.onended = () => setPlayingAudio(false);
                    }}
                    disabled={playingAudio}
                    className="spidey-button-blue spidey-button text-sm"
                  >
                    🔊 {playingAudio ? 'PLAYING...' : 'PLAY AUDIO'}
                  </button>
                )}
              </div>
              <p className="text-black font-medium leading-relaxed text-lg">{response.answer}</p>

              {/* Sources - Spider-Verse Style */}
              {response.sources && response.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t-4 border-black">
                  <p className="text-lg font-bold mb-4 comic-heading" style={{color: '#DF1F2D', textShadow: '2px 2px 0 rgba(0,0,0,0.1)'}}>
                    🕸️ SOURCES ({response.documents_found} WEB-STRANDS FOUND):
                  </p>
                  <div className="space-y-3">
                    {response.sources.map((source, idx) => (
                      <div key={idx} 
                           className="p-4 rounded-lg border-3 border-black font-semibold"
                           style={{
                             background: source.type === 'user_document' 
                               ? 'linear-gradient(135deg, #EBF5FF 0%, #D1E9FF 100%)' 
                               : 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 100%)',
                             boxShadow: source.type === 'user_document'
                               ? '4px 4px 0 #447BBE'
                               : '4px 4px 0 #DF1F2D'
                           }}>
                        {source.type === 'user_document' ? (
                          <>
                            <p className="text-sm font-bold flex items-center comic-subheading" style={{color: '#2B37B4'}}>
                              📄 {source.filename}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 mt-1">
                              YOUR UPLOAD • CHUNK {source.chunk}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-bold flex items-center comic-subheading" style={{color: '#B11313'}}>
                              📚 {source.pdf_name}
                            </p>
                            <p className="text-xs font-semibold text-gray-700 mt-1">
                              POLICY DOC • PAGE {source.page}
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

      {/* Info Box - Comic Panel Style */}
      <div className="mt-8 bg-yellow-100 border-4 border-black rounded-lg p-5" 
           style={{boxShadow: '6px 6px 0 #DF1F2D'}}>
        <div className="flex items-start">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-sm text-black">
            <p className="font-bold mb-2 comic-subheading text-base" style={{color: '#B11313'}}>⚡ SPIDER-POWERS:</p>
            <p className="mb-2 font-semibold">
              <span className="comic-subheading" style={{color: '#2B37B4'}}>📄 1-PAGE DOCS</span> (invoices, IDs) → Key-value extraction
            </p>
            <p className="mb-2 font-semibold">
              <span className="comic-subheading" style={{color: '#DF1F2D'}}>📚 MULTI-PAGE DOCS</span> (agreements) → RAG + Gemini AI
            </p>
            <p className="font-semibold">
              🕷️ Query your uploads OR official policies (Fannie Mae, FHA, USDA)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageKnowledgeBase;
