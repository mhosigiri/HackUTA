import React, { useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Dashboard: React.FC = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadStatus('Uploading documents...');

    try {
      const token = await getAccessTokenSilently();
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));

      // TODO: Replace with actual backend endpoint
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setUploadStatus('Documents uploaded successfully!');
        setSelectedFiles([]);
      } else {
        setUploadStatus('Upload failed. Please try again.');
      }
    } catch (error) {
      setUploadStatus('Upload error. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Document Upload & Analysis
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your mortgage documents and let our AI extract and organize the information you need
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Documents</h2>

          <div
            className={`border-3 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center">
              <svg
                className="w-16 h-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Drop your documents here
              </h3>
              <p className="text-gray-500 mb-4">or</p>
              <label className="cursor-pointer">
                <span className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all inline-block">
                  Browse Files
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </label>
              <p className="text-sm text-gray-400 mt-4">
                Supported formats: PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        className="w-5 h-5 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload & Analyze Documents'}
              </button>
              {uploadStatus && (
                <p
                  className={`mt-3 text-center font-medium ${
                    uploadStatus.includes('success')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {uploadStatus}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Document Requirements Guide */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Required Documents Checklist
            </h2>
            <p className="text-gray-600">
              Make sure you have these documents ready for a smooth mortgage application process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentCategories.map((category, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="flex items-center mb-4">
                  <span className="text-4xl mr-3">{category.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900">
                    {category.title}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How to Use Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
          <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Documents</h3>
              <p className="text-blue-100">
                Drag and drop or browse to upload your mortgage-related documents
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-blue-100">
                Our AI extracts and organizes key information from your documents
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Results</h3>
              <p className="text-blue-100">
                Review extracted data and complete your mortgage application faster
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
