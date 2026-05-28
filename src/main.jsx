import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import toast from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'

// ── Global fetch interceptor ──────────────────────────────────────────────────
// 1. Attaches JWT Bearer token to every /api request automatically.
// 2. Intercepts 429 responses globally and shows a toast — covers pages that
//    use raw fetch() directly, not just those going through client.js.
const _originalFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isApi = typeof url === 'string' && url.includes('/api');

  if (isApi) {
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

  const res = await _originalFetch(input, init);

  // Show a prominent toast whenever any /api call hits a rate limit (429)
  if (isApi && res.status === 429) {
    // Clone so the original response body can still be read by the caller
    res.clone().json()
      .then((body) => {
        const detail = body.detail || body.message || 'Usage limit reached.';
        toast.error(
          `You have reached your limit!\n${detail}`,
          {
            duration: 4000,
            style: {
              maxWidth: '440px',
              fontWeight: '500',
              whiteSpace: 'pre-line',
            },
          }
        );
      })
      .catch(() => {
        toast.error(
          'You have reached your usage limit.\nPlease contact your administrator to increase it.',
          { duration: 4000, style: { maxWidth: '440px', whiteSpace: 'pre-line' } }
        );
      });
  }

  return res;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
