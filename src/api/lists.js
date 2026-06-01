import { get, post, put, del } from './client';

export const listsApi = {
  list: (params = {})          => get('/api/contact-lists' + _qs(params)),
  masterCount: ()               => get('/api/contact-lists/master-count'),
  create: (data)                => post('/api/contact-lists', data),
  update: (id, data)            => put(`/api/contact-lists/${id}`, data),
  remove: (id)                  => del(`/api/contact-lists/${id}`),
  members: (id, params = {})    => get(`/api/contact-lists/${id}/members` + _qs(params)),
  addMember: (id, data)         => post(`/api/contact-lists/${id}/members`, data),
  removeMember: (listId, voterId) => del(`/api/contact-lists/${listId}/members/${voterId}`),
  importCsv: (id, rows)         => post(`/api/contact-lists/${id}/import`, rows),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
