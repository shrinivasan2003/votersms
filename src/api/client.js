const request = async (url, { headers: callerHeaders = {}, ...rest } = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...callerHeaders },
    ...rest,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  // 429 toast is handled globally in main.jsx interceptor — no duplicate needed here
  if (!res.ok) throw new Error(body.detail || body.message || `HTTP ${res.status}`);
  return body;
};

export const get = (url, options) => request(url, { method: 'GET', ...options });
export const post = (url, data, options) => request(url, { method: 'POST', body: JSON.stringify(data), ...options });
export const put = (url, data, options) => request(url, { method: 'PUT', body: JSON.stringify(data), ...options });
export const patch = (url, data, options) => request(url, { method: 'PATCH', body: JSON.stringify(data), ...options });
export const del = (url, options) => request(url, { method: 'DELETE', ...options });

// For endpoints that return plain text (e.g. CSV downloads)
export const getText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
};
