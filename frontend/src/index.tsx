import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
const missingDomain = !process.env.REACT_APP_AUTH0_DOMAIN;
const missingClientId = !process.env.REACT_APP_AUTH0_CLIENT_ID;

root.render(
  missingDomain || missingClientId ? (
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
      padding: '1rem'
    }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Missing Auth0 configuration</div>
        <div>Please set REACT_APP_AUTH0_DOMAIN and REACT_APP_AUTH0_CLIENT_ID in your environment.</div>
      </div>
    </div>
  ) : (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN as string}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID as string}
      authorizationParams={{
        redirect_uri: (process.env.REACT_APP_AUTH0_REDIRECT_URI as string) || window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        scope: (process.env.REACT_APP_AUTH0_SCOPE as string) || 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens
    >
      <App />
    </Auth0Provider>
  )
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

