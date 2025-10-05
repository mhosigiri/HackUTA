import React from 'react';
import DocumentUpload from '../components/DocumentUpload';

const Dashboard: React.FC = () => {

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
          <DocumentUpload />
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
