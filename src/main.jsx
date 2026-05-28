import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'

// ── Global fetch interceptor ──────────────────────────────────────────────────
// Automatically attaches the JWT Bearer token to every /api request so that
// individual pages don't each need to call getAuthHeaders() on every fetch.
const _originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (typeof url === 'string' && url.startsWith('/api')) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      init = {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...init.headers,          // caller-supplied headers win (e.g. Content-Type)
        },
      };
    }
  }
  return _originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
