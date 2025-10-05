import React, { useState, useEffect } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import ExtractedDataView from '../components/ExtractedDataView';
import MortgageKnowledgeBase from '../components/MortgageKnowledgeBase';
import { API_CONFIG, DOCUMENT_STATUS } from '../config/constants';

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  status: string;
  extractedData?: any;
}

const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const documentsUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.DOCUMENTS}`;
      const response = await fetch(documentsUrl);
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadComplete = () => {
    fetchDocuments();
  };

  const documentCategories = [
    {
      icon: '🆔',
      title: 'Personal Identification',
      items: [
        'Government-issued photo ID (Driver\'s license or Passport)',
        'Social Security card or proof of SSN',
        'Proof of residence (utility bill or lease agreement)'
      ]
    },
    {
      icon: '💰',
      title: 'Income Verification',
      items: [
        'W-2 forms from the last 2 years',
        'Pay stubs from the last 30-60 days',
        'Tax returns for the last 2-3 years',
        'Employer contact information'
      ]
    },
    {
      icon: '💼',
      title: 'Employment Documentation',
      items: [
        'Letter of employment verification',
        'Business license (if self-employed)',
        'Profit & loss statements (if self-employed)',
        'Business tax returns (last 2 years for self-employed)'
      ]
    },
    {
      icon: '🏦',
      title: 'Asset & Bank Statements',
      items: [
        'Bank statements from last 2-3 months',
        '401(k), IRA, or retirement account statements',
        'Investment account statements',
        'Gift letters (if receiving down payment assistance)'
      ]
    },
    {
      icon: '💳',
      title: 'Debt & Credit Information',
      items: [
        'Credit card statements',
        'Auto loan statements',
        'Student loan statements',
        'Other monthly debt obligations'
      ]
    },
    {
      icon: '🏠',
      title: 'Property Documents',
      items: [
        'Purchase agreement (signed contract)',
        'Property appraisal',
        'Homeowners insurance quote or proof',
        'HOA documents (if applicable)'
      ]
    }
  ];

  return (
    <div className="min-h-screen halftone-bg py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section - Spider-Verse Style */}
        <div className="text-center mb-12 slide-up">
          <div className="inline-block mb-4">
            <h1 className="text-6xl font-bold text-white comic-heading neon-glow mb-2" 
                style={{textShadow: '5px 5px 0 black, -2px -2px 0 #FFD700, 0 0 20px #DF1F2D'}}>
              DOCUMENT COMMAND CENTER
            </h1>
            <div className="h-2 spidey-gradient-mixed"></div>
          </div>
          <p className="text-xl text-white font-semibold max-w-2xl mx-auto comic-subheading" 
             style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
            🕷️ SWING INTO ACTION • UPLOAD • EXTRACT • ANALYZE 🕸️
          </p>
        </div>

        {/* Upload Section - Comic Panel Style */}
        <div className="spidey-card mb-12 p-8 web-pattern slide-up">
          <div className="spider-web-corner"></div>
          <h2 className="text-3xl font-bold mb-6 comic-heading" 
              style={{color: '#DF1F2D', textShadow: '3px 3px 0 black'}}>
            ⚡ UPLOAD DOCUMENTS
          </h2>
          <DocumentUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Unified Document & Policy Assistant */}
        <div className="mb-12">
          <MortgageKnowledgeBase />
        </div>

        {/* Uploaded Documents Section - Spider-Verse Style */}
        {documents.length > 0 && (
          <div className="spidey-card p-8 mb-12 slide-up">
            <h2 className="text-3xl font-bold mb-6 comic-heading" 
                style={{color: '#2B37B4', textShadow: '3px 3px 0 black'}}>
              🕸️ YOUR DOCUMENTS ({documents.length})
            </h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="spider-spinner w-16 h-16 mx-auto"></div>
                <p className="mt-4 comic-subheading text-gray-600">LOADING...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    className="bg-white border-4 border-black rounded-xl p-5 hover:transform hover:-translate-y-1 transition-all cursor-pointer spidey-zoom"
                    style={{
                      boxShadow: '6px 6px 0 #DF1F2D, -2px -2px 0 #447BBE',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-black truncate comic-subheading">
                          📄 {doc.name}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`ml-2 spidey-badge ${
                          doc.status === DOCUMENT_STATUS.PROCESSED
                            ? 'bg-green-400 text-black'
                            : doc.status === DOCUMENT_STATUS.PROCESSING
                            ? 'bg-yellow-400 text-black'
                            : 'bg-gray-300 text-black'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-semibold">{doc.size}</p>
                    {doc.extractedData?.key_value_pairs && (
                      <p className="text-xs font-bold mt-2" style={{color: '#DF1F2D'}}>
                        ⚡ {doc.extractedData.key_value_pairs.length} FIELDS EXTRACTED
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Extracted Data View - Comic Panel */}
        {selectedDocument && selectedDocument.extractedData && (
          <div className="spidey-card p-8 mb-12 comic-explode">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold comic-heading" 
                  style={{color: '#447BBE', textShadow: '3px 3px 0 black'}}>
                📊 EXTRACTED DATA: {selectedDocument.name}
              </h2>
              <button
                onClick={() => setSelectedDocument(null)}
                className="w-10 h-10 bg-black text-white rounded-full hover:bg-red-600 transition-all border-2 border-black hover:rotate-90 hover:scale-110"
              >
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ExtractedDataView data={selectedDocument.extractedData} fileName={selectedDocument.name} />
          </div>
        )}

        {/* Document Requirements Guide - Spider-Verse Cards */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-5xl font-bold mb-4 comic-heading text-white neon-glow">
              REQUIRED DOCUMENTS CHECKLIST
            </h2>
            <p className="text-lg text-white font-semibold comic-subheading" 
               style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
              🕷️ GEAR UP FOR YOUR MORTGAGE MISSION 🕸️
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {documentCategories.map((category, index) => (
              <div
                key={index}
                className="spidey-card p-6 hover:transform hover:-translate-y-2 transition-all slide-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  background: index % 2 === 0 
                    ? 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' 
                    : 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)'
                }}
              >
                <div className="flex items-center mb-4">
                  <span className="text-5xl mr-3">{category.icon}</span>
                  <h3 className="text-xl font-bold comic-heading" 
                      style={{color: index % 2 === 0 ? '#2B37B4' : '#DF1F2D', textShadow: '2px 2px 0 black'}}>
                    {category.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <div className="w-6 h-6 rounded-full mr-2 mt-0.5 flex-shrink-0 flex items-center justify-center"
                           style={{backgroundColor: '#DF1F2D', border: '2px solid black'}}>
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm text-black font-semibold">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works - Spider-Verse Comic Style */}
        <div className="spidey-gradient-mixed rounded-2xl p-10 text-white comic-panel border-8 border-black mb-8">
          <h2 className="text-5xl font-bold mb-10 text-center comic-heading text-yellow-300" 
              style={{textShadow: '4px 4px 0 black, -2px -2px 0 #DF1F2D'}}>
            HOW IT WORKS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black relative"
                   style={{boxShadow: '0 0 0 4px #DF1F2D, 0 0 20px rgba(223, 31, 45, 0.5)'}}>
                <span className="text-4xl font-bold comic-heading" style={{color: '#DF1F2D'}}>1</span>
                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-40 animate-ping"></div>
              </div>
              <h3 className="text-2xl font-bold mb-3 comic-subheading">UPLOAD</h3>
              <p className="text-white font-semibold text-sm">
                📤 Drag and drop or browse to upload mortgage documents
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black relative"
                   style={{boxShadow: '0 0 0 4px #447BBE, 0 0 20px rgba(68, 123, 190, 0.5)'}}>
                <span className="text-4xl font-bold comic-heading" style={{color: '#2B37B4'}}>2</span>
                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-40 animate-ping" style={{animationDelay: '0.3s'}}></div>
              </div>
              <h3 className="text-2xl font-bold mb-3 comic-subheading">ANALYZE</h3>
              <p className="text-white font-semibold text-sm">
                🤖 AI extracts and organizes key information automatically
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black relative"
                   style={{boxShadow: '0 0 0 4px #FFD700, 0 0 20px rgba(255, 215, 0, 0.5)'}}>
                <span className="text-4xl font-bold comic-heading" style={{color: '#B11313'}}>3</span>
                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 opacity-40 animate-ping" style={{animationDelay: '0.6s'}}></div>
              </div>
              <h3 className="text-2xl font-bold mb-3 comic-subheading">RESULTS</h3>
              <p className="text-white font-semibold text-sm">
                ⚡ Review data and complete your application faster
              </p>
            </div>
          </div>
          
          {/* Comic-style action burst */}
          <div className="text-center mt-10">
            <span className="comic-pow">POW!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
