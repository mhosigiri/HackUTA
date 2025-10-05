import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth0();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MortgageDoc AI
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            <Link
              to="/dashboard"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/dashboard')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/activities"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/activities')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Activities
            </Link>
            <Link
              to="/profile"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive('/profile')
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Profile
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <img
                src={user?.picture || 'https://via.placeholder.com/40'}
                alt={user?.name}
                className="w-8 h-8 rounded-full border-2 border-gray-200"
              />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{user?.name}</p>
              </div>
            </div>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
