import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface ProfileData {
  // Personal Information
  legalFirstName: string;
  legalMiddleName: string;
  legalLastName: string;
  dateOfBirth: string;
  ssn: string;
  email: string;
  phone: string;

  // Address
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;

  // Employment
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired';
  employerName: string;
  jobTitle: string;
  annualIncome: string;
  employmentStartDate: string;

  // Additional Information
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  numberOfDependents: string;
  veteranStatus: boolean;
  firstTimeHomeBuyer: boolean;
}

const Profile: React.FC = () => {
  const { user, getAccessTokenSilently } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    legalFirstName: '',
    legalMiddleName: '',
    legalLastName: '',
    dateOfBirth: '',
    ssn: '',
    email: user?.email || '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    employmentStatus: 'employed',
    employerName: '',
    jobTitle: '',
    annualIncome: '',
    employmentStartDate: '',
    maritalStatus: 'single',
    numberOfDependents: '0',
    veteranStatus: false,
    firstTimeHomeBuyer: false
  });
  const [isEditing, setIsEditing] = useState(true);
  const [savedProfile, setSavedProfile] = useState<ProfileData | null>(null);

  const isCompleteProfile = (pd: ProfileData) => {
    return !!(
      pd.legalFirstName &&
      pd.legalLastName &&
      pd.dateOfBirth &&
      pd.ssn &&
      pd.email &&
      pd.phone &&
      pd.streetAddress &&
      pd.city &&
      pd.state &&
      pd.zipCode &&
      pd.employmentStatus &&
      pd.employerName &&
      pd.jobTitle &&
      pd.annualIncome &&
      pd.employmentStartDate &&
      pd.maritalStatus
    );
  };

  const maskSSN = (value: string) => {
    if (!value) return '';
    const last4 = value.slice(-4);
    return `***-**-${last4}`;
  };

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: (process.env.REACT_APP_AUTH0_SCOPE as string) || 'openid profile email offline_access'
        }
      });
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setProfileData(prev => {
            const next = { ...prev, ...data, email: data.email || (user?.email || '') } as ProfileData;
            setSavedProfile(next);
            setIsEditing(!isCompleteProfile(next));
            return next;
          });
        } else {
          setProfileData(prev => {
            const next = { ...prev, email: user?.email || '' } as ProfileData;
            setSavedProfile(null);
            setIsEditing(true);
            return next;
          });
        }
      } else if (response.status !== 404) {
        // 404 just means profile not created yet, ignore
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Prefill email from Auth0 if backend call fails
      setProfileData(prev => ({ ...prev, email: user?.email || '' }));
      setIsEditing(true);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently, user?.email]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setProfileData(prev => ({ ...prev, [name]: checked }));
    } else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: (process.env.REACT_APP_AUTH0_SCOPE as string) || 'openid profile email offline_access'
        }
      });
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

      const response = await fetch(`${apiBaseUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully! AI will use this data for auto-filling forms.' });
        setSavedProfile(profileData);
        setIsEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (savedProfile) {
      setProfileData(savedProfile);
    } else {
      setProfileData(prev => ({ ...prev, email: user?.email || '' }));
    }
    setMessage(null);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Profile</h1>
            <p className="text-lg text-gray-600">
              Complete your profile for faster mortgage applications. Our AI will auto-fill this information when needed.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Edit
            </button>
          )}
        </div>

        {/* AI Auto-fill Notice */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <div>
              <h3 className="font-semibold text-lg mb-1">AI-Powered Auto-Fill</h3>
              <p className="text-blue-100">
                Once saved, our AI will automatically extract and use this information when processing your mortgage documents, saving you time on future applications.
              </p>
            </div>
          </div>
        </div>

        {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">
                1
              </span>
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal First Name *
                </label>
                <input
                  type="text"
                  name="legalFirstName"
                  value={profileData.legalFirstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="legalMiddleName"
                  value={profileData.legalMiddleName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Last Name *
                </label>
                <input
                  type="text"
                  name="legalLastName"
                  value={profileData.legalLastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={profileData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Social Security Number *
                </label>
                <input
                  type="password"
                  name="ssn"
                  value={profileData.ssn}
                  onChange={handleInputChange}
                  required
                  placeholder="XXX-XX-XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="(XXX) XXX-XXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">
                2
              </span>
              Current Address
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={profileData.streetAddress}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={profileData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={profileData.state}
                    onChange={handleInputChange}
                    required
                    placeholder="TX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={profileData.zipCode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">
                3
              </span>
              Employment Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employment Status *
                </label>
                <select
                  name="employmentStatus"
                  value={profileData.employmentStatus}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              {(profileData.employmentStatus === 'employed' || profileData.employmentStatus === 'self-employed') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employer Name *
                      </label>
                      <input
                        type="text"
                        name="employerName"
                        value={profileData.employerName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={profileData.jobTitle}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Annual Income *
                      </label>
                      <input
                        type="text"
                        name="annualIncome"
                        value={profileData.annualIncome}
                        onChange={handleInputChange}
                        required
                        placeholder="$XX,XXX"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employment Start Date *
                      </label>
                      <input
                        type="date"
                        name="employmentStartDate"
                        value={profileData.employmentStartDate}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">
                4
              </span>
              Additional Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status *
                  </label>
                  <select
                    name="maritalStatus"
                    value={profileData.maritalStatus}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Dependents
                  </label>
                  <input
                    type="number"
                    name="numberOfDependents"
                    value={profileData.numberOfDependents}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="veteranStatus"
                    checked={profileData.veteranStatus}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I am a U.S. Veteran
                  </span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="firstTimeHomeBuyer"
                    checked={profileData.firstTimeHomeBuyer}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I am a first-time home buyer
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              * Required fields
            </div>
            <div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="mr-3 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}
        </form>
        ) : (
          <div className="space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Legal First Name</div>
                  <div className="text-gray-900 font-medium">{profileData.legalFirstName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Middle Name</div>
                  <div className="text-gray-900 font-medium">{profileData.legalMiddleName || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Legal Last Name</div>
                  <div className="text-gray-900 font-medium">{profileData.legalLastName || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Date of Birth</div>
                  <div className="text-gray-900 font-medium">{profileData.dateOfBirth || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Social Security Number</div>
                  <div className="text-gray-900 font-medium">{maskSSN(profileData.ssn)}</div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Current Address
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Street Address</div>
                  <div className="text-gray-900 font-medium">{profileData.streetAddress || '-'}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">City</div>
                    <div className="text-gray-900 font-medium">{profileData.city || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">State</div>
                    <div className="text-gray-900 font-medium">{profileData.state || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">ZIP Code</div>
                    <div className="text-gray-900 font-medium">{profileData.zipCode || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment Information */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                Employment Information
              </h2>
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Employment Status</div>
                  <div className="text-gray-900 font-medium">{profileData.employmentStatus || '-'}</div>
                </div>
                {(profileData.employmentStatus === 'employed' || profileData.employmentStatus === 'self-employed') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Employer Name</div>
                        <div className="text-gray-900 font-medium">{profileData.employerName || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Job Title</div>
                        <div className="text-gray-900 font-medium">{profileData.jobTitle || '-'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Annual Income</div>
                        <div className="text-gray-900 font-medium">{profileData.annualIncome || '-'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Employment Start Date</div>
                        <div className="text-gray-900 font-medium">{profileData.employmentStartDate || '-'}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                Additional Information
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Marital Status</div>
                    <div className="text-gray-900 font-medium">{profileData.maritalStatus || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Number of Dependents</div>
                    <div className="text-gray-900 font-medium">{profileData.numberOfDependents || '0'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Veteran Status</div>
                    <div className="text-gray-900 font-medium">{profileData.veteranStatus ? 'Yes' : 'No'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">First-Time Home Buyer</div>
                    <div className="text-gray-900 font-medium">{profileData.firstTimeHomeBuyer ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
