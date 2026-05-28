const request = async (url, { headers: callerHeaders = {}, ...rest } = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...callerHeaders },
    ...rest,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || body.message || `HTTP ${res.status}`);
  return body;
};

export const get = (url, options) => request(url, { method: 'GET', ...options });
export const post = (url, data, options) => request(url, { method: 'POST', body: JSON.stringify(data), ...options });
export const put = (url, data, options) => request(url, { method: 'PUT', body: JSON.stringify(data), ...options });
export const patch = (url, options) => request(url, { method: 'PATCH', ...options });
export const del = (url, options) => request(url, { method: 'DELETE', ...options });
