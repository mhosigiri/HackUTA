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
  };
  fileName: string;
}

const ExtractedDataView: React.FC<ExtractedDataProps> = ({ data, fileName }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Extracted Data</h2>
        <p className="text-blue-100">{fileName}</p>
        {data.confidence && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Overall Confidence</span>
              <span className="font-semibold">{(data.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-blue-400 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all"
                style={{ width: `${data.confidence * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Key-Value Pairs */}
      {data.key_value_pairs && data.key_value_pairs.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            Form Fields ({data.key_value_pairs.length})
          </h3>
          <div className="space-y-3">
            {data.key_value_pairs.map((pair, index) => (
              <div key={index} className="flex items-start border-b border-gray-100 pb-3 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-600 mb-1">{pair.key || 'Unnamed Field'}</div>
                  <div className="text-base text-gray-900">{pair.value || '-'}</div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    pair.confidence > 0.9 ? 'bg-green-100 text-green-800' :
                    pair.confidence > 0.7 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {(pair.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entities */}
      {data.entities && data.entities.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            Detected Entities ({data.entities.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.entities.map((entity, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-600 uppercase">{entity.type}</span>
                  <span className="text-xs text-gray-500">{(entity.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-sm text-gray-900 font-medium">{entity.mention_text}</div>
                {entity.normalized_value && (
                  <div className="text-xs text-gray-600 mt-1">→ {entity.normalized_value.text}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tables */}
      {data.tables && data.tables.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z" clipRule="evenodd" />
            </svg>
            Tables ({data.tables.length})
          </h3>
          {data.tables.map((table, tableIndex) => (
            <div key={tableIndex} className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 border border-gray-200">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Raw Text (collapsible) */}
      {data.text && (
        <details className="bg-white rounded-xl shadow-lg border border-gray-100">
          <summary className="cursor-pointer p-6 font-semibold text-gray-900 hover:bg-gray-50">
            Full Extracted Text
          </summary>
          <div className="px-6 pb-6 text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {data.text}
          </div>
        </details>
      )}
    </div>
  );
};

export default ExtractedDataView;
