import { get, post, put, patch, del } from './client';

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

export const emailAttachmentsApi = {
  list:   (jobId)              => get(`/api/email-jobs/${jobId}/attachments`),
  remove: (jobId, attachId)    => del(`/api/email-jobs/${jobId}/attachments/${attachId}`),
  upload: (jobId, file)        => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`/api/email-jobs/${jobId}/attachments`, {
      method: 'POST',
      body: fd,
    }).then(async res => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
      return body;
    });
  },
};

export const emailTemplateAttachmentsApi = {
  list:   (templateId)              => get(`/api/email-templates/${templateId}/attachments`),
  remove: (templateId, attachId)    => del(`/api/email-templates/${templateId}/attachments/${attachId}`),
  upload: (templateId, file)        => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`/api/email-templates/${templateId}/attachments`, {
      method: 'POST',
      body: fd,
    }).then(async res => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
      return body;
    });
  },
};

export const emailRepliesApi = {
  list: (params = {})    => get('/api/email-replies' + _qs(params)),
  markRead: (id)         => patch(`/api/email-replies/${id}/read`, {}),
  remove: (id)           => del(`/api/email-replies/${id}`),
};

export const emailAnalyticsApi = {
  list: ()       => get('/api/email-analytics'),
  get: (jobId)   => get(`/api/email-analytics/${jobId}`),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
