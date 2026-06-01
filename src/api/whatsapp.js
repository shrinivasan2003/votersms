import { get, post, put, del } from './client';

export const whatsappProvidersApi = {
  list: ()           => get('/api/whatsapp-providers'),
  create: (data)     => post('/api/whatsapp-providers', data),
  update: (id, data) => put(`/api/whatsapp-providers/${id}`, data),
  remove: (id)       => del(`/api/whatsapp-providers/${id}`),
};

export const whatsappTemplatesApi = {
  list: (params = {}) => get('/api/whatsapp-templates' + _qs(params)),
  create: (data)       => post('/api/whatsapp-templates', data),
  update: (id, data)   => put(`/api/whatsapp-templates/${id}`, data),
  remove: (id)         => del(`/api/whatsapp-templates/${id}`),
};

export const whatsappJobsApi = {
  list: (params = {}) => get('/api/whatsapp-jobs' + _qs(params)),
  create: (data)       => post('/api/whatsapp-jobs', data),
  update: (id, data)   => put(`/api/whatsapp-jobs/${id}`, data),
  remove: (id)         => del(`/api/whatsapp-jobs/${id}`),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
