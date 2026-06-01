import { get, post, put, del } from './client';

export const votersApi = {
  list: (params = {})    => get('/api/voters' + _qs(params)),
  create: (data)          => post('/api/voters', data),
  update: (id, data)      => put(`/api/voters/${id}`, data),
  remove: (id)            => del(`/api/voters/${id}`),
  bulkUpload: (rows)      => post('/api/voters/bulk', rows),
};

export const countiesApi = {
  list: ()           => get('/api/counties'),
  create: (data)     => post('/api/counties', data),
  update: (id, data) => put(`/api/counties/${id}`, data),
  remove: (id)       => del(`/api/counties/${id}`),
};

export const precinctsApi = {
  list: (params = {})  => get('/api/precincts' + _qs(params)),
  detailed: ()          => get('/api/precincts-detailed'),
  create: (data)        => post('/api/precincts', data),
  update: (id, data)    => put(`/api/precincts/${id}`, data),
  remove: (id)          => del(`/api/precincts/${id}`),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
