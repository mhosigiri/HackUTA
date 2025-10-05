import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="spidey-gradient-red border-b-4 border-black sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Spider Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center border-4 border-white shadow-lg relative spider-icon">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                <path d="M12 4L8 8v8l4 4 4-4V8l-4-4z" opacity="0.5"/>
              </svg>
              <div className="absolute inset-0 rounded-full border-2 border-white opacity-30 animate-ping"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white comic-heading" style={{textShadow: '3px 3px 0 black, -1px -1px 0 #FFD700'}}>
                DocuSpider
              </h1>
              <p className="text-xs text-white opacity-90 comic-subheading">Into the Mortgage-Verse</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-2">
            <Link
              to="/dashboard"
              className={`px-6 py-2 rounded-lg font-bold transition-all border-3 comic-subheading ${
                isActive('/dashboard')
                  ? 'bg-white text-red-600 border-4 border-black shadow-lg transform scale-105'
                  : 'bg-black bg-opacity-20 text-white border-2 border-white hover:bg-white hover:text-red-600 hover:border-black'
              }`}
            >
              DASHBOARD
            </Link>
          </nav>

          {/* HackUTA Badge */}
          <div className="flex items-center space-x-3">
            <div className="spidey-badge bg-yellow-400 text-black spider-pulse">
              🕷️ HackUTA 2025
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
