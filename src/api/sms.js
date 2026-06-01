import { get, post, put, del } from './client';

export const smsProvidersApi = {
  list: ()         => get('/api/sms-providers'),
  create: (data)   => post('/api/sms-providers', data),
  update: (id, data) => put(`/api/sms-providers/${id}`, data),
  remove: (id)     => del(`/api/sms-providers/${id}`),
};

export const smsTemplatesApi = {
  list: (params = {}) => get('/api/sms-templates' + _qs(params)),
  create: (data)       => post('/api/sms-templates', data),
  update: (id, data)   => put(`/api/sms-templates/${id}`, data),
  remove: (id)         => del(`/api/sms-templates/${id}`),
};

export const smsJobsApi = {
  list: (params = {}) => get('/api/sms-jobs' + _qs(params)),
  create: (data)       => post('/api/sms-jobs', data),
  update: (id, data)   => put(`/api/sms-jobs/${id}`, data),
  remove: (id)         => del(`/api/sms-jobs/${id}`),
};

export const smsDeliveryApi = {
  stats: () => get('/api/sms-delivery-stats'),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
