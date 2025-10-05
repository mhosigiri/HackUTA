import React from 'react';

interface ExtractedDataProps {
  data: {
    text?: string;
    entities?: Array<{
      type: string;
      mention_text: string;
      confidence: number;
      normalized_value?: {
        text: string;
      };
    }>;
    key_value_pairs?: Array<{
      key: string;
      value: string;
      confidence: number;
    }>;
    tables?: Array<{
      rows: string[][];
      header_rows?: any[];
    }>;
    pages?: number;
    confidence?: number;
    extraction_method?: string;
    rag_enhanced?: boolean;
    rag_extraction?: any;
  };
  fileName: string;
}

const ExtractedDataView: React.FC<ExtractedDataProps> = ({ data, fileName }) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        No extracted data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">File:</span>
            <p className="font-semibold text-gray-900">{fileName}</p>
          </div>
          {data.pages && (
            <div>
              <span className="text-gray-600">Pages:</span>
              <p className="font-semibold text-gray-900">{data.pages}</p>
            </div>
          )}
          {data.confidence && (
            <div>
              <span className="text-gray-600">Confidence:</span>
              <p className="font-semibold text-gray-900">
                {(data.confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {data.extraction_method && (
            <div>
              <span className="text-gray-600">Method:</span>
              <p className="font-semibold text-gray-900">
                {data.extraction_method}
                {data.rag_enhanced && ' + RAG'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Key-Value Pairs */}
      {data.key_value_pairs && data.key_value_pairs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Key-Value Pairs ({data.key_value_pairs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.key_value_pairs.map((pair, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pair.key}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {pair.value}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${pair.confidence * 100}%` }}
                          ></div>
                        </div>
                        {(pair.confidence * 100).toFixed(0)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entities */}
      {data.entities && data.entities.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Detected Entities ({data.entities.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.entities.map((entity, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-600 uppercase">
                      {entity.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(entity.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">
                    {entity.mention_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full Text */}
      {data.text && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Full Text</h3>
          </div>
          <div className="p-6">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {data.text}
            </pre>
          </div>
        </div>
      )}

      {/* RAG Enhancement Info */}
      {data.rag_enhanced && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
            <h4 className="text-sm font-semibold text-purple-900">
              RAG Enhanced Extraction
            </h4>
          </div>
          <p className="text-sm text-purple-700">
            This document has been indexed in the vector database and is available for intelligent Q&A queries.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExtractedDataView;
