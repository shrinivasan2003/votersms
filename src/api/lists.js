import { get, post, put, del, getText } from './client';

export const listsApi = {
  list: (params = {})          => get('/api/contact-lists' + _qs(params)),
  masterCount: ()               => get('/api/contact-lists/master-count'),
  create: (data)                => post('/api/contact-lists', data),
  update: (id, data)            => put(`/api/contact-lists/${id}`, data),
  remove: (id)                  => del(`/api/contact-lists/${id}`),
  members: (id, params = {})    => get(`/api/contact-lists/${id}/members` + _qs(params)),
  addMember: (id, data)         => post(`/api/contact-lists/${id}/members`, data),
  removeMember: (listId, voterId) => del(`/api/contact-lists/${listId}/members/${voterId}`),
  bulkImport: (id, rows)          => post(`/api/contact-lists/${id}/members/bulk`, rows),
  metaTags: (id)                  => get(`/api/contact-lists/${id}/meta-tags`),
  saveMetaTag: (id, data)         => post(`/api/contact-lists/${id}/meta-tags`, data),
  deleteMetaTag: (id, key)        => del(`/api/contact-lists/${id}/meta-tags/${key}`),
  csvTemplate: (id)               => getText(`/api/contact-lists/${id}/csv-template`),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
