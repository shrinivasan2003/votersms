import { get, post, put, del } from './client';

export const emailProvidersApi = {
  list: ()           => get('/api/email-providers'),
  create: (data)     => post('/api/email-providers', data),
  update: (id, data) => put(`/api/email-providers/${id}`, data),
  remove: (id)       => del(`/api/email-providers/${id}`),
};

export const emailTemplatesApi = {
  list: (params = {}) => get('/api/email-templates' + _qs(params)),
  create: (data)       => post('/api/email-templates', data),
  update: (id, data)   => put(`/api/email-templates/${id}`, data),
  remove: (id)         => del(`/api/email-templates/${id}`),
};

export const emailJobsApi = {
  list: (params = {}) => get('/api/email-jobs' + _qs(params)),
  create: (data)       => post('/api/email-jobs', data),
  update: (id, data)   => put(`/api/email-jobs/${id}`, data),
  remove: (id)         => del(`/api/email-jobs/${id}`),
};

export const emailRepliesApi = {
  list: (params = {})    => get('/api/email-replies' + _qs(params)),
  markRead: (id)         => put(`/api/email-replies/${id}/read`, {}),
  remove: (id)           => del(`/api/email-replies/${id}`),
};

export const emailAnalyticsApi = {
  get: (jobId) => get(`/api/email-analytics/${jobId}`),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
