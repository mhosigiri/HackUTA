import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
// Removed custom Auth component; we redirect to Auth0 Universal Login when needed
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const { loginWithRedirect, isAuthenticated, isLoading, error, getAccessTokenSilently } = useAuth0();
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthenticated, isLoading, loginWithRedirect]);

  React.useEffect(() => {
    const upsertUser = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE,
            scope: (process.env.REACT_APP_AUTH0_SCOPE as string) || 'openid profile email offline_access'
          }
        });
        const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
        await fetch(`${apiBaseUrl}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // no-op: user will still be created when visiting profile/save
      }
    };
    if (isAuthenticated) {
      upsertUser();
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem',
        fontFamily: 'Inter, sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.25rem',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Authentication Error</div>
          <div style={{ opacity: 0.9 }}>{error.message}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem',
        fontFamily: 'Inter, sans-serif'
      }}>
        Redirecting to login...
      </div>
    );
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
