import { get, post, put, del } from './client';

export const usersApi = {
  list: (params = {})  => get('/api/users' + _qs(params)),
  me: ()                => get('/api/users/me'),
  get: (id)             => get(`/api/users/${id}`),
  create: (data)        => post('/api/users', data),
  update: (id, data)    => put(`/api/users/${id}`, data),
  remove: (id)          => del(`/api/users/${id}`),
};

export const rolesApi = {
  list: ()           => get('/api/roles'),
  create: (data)     => post('/api/roles', data),
  update: (id, data) => put(`/api/roles/${id}`, data),
  remove: (id)       => del(`/api/roles/${id}`),
};

export const permissionsApi = {
  list: ()           => get('/api/permissions'),
  create: (data)     => post('/api/permissions', data),
  update: (id, data) => put(`/api/permissions/${id}`, data),
  remove: (id)       => del(`/api/permissions/${id}`),
  assign: (data)     => post('/api/permissions/assign', data),
};

function _qs(params) {
  const q = new URLSearchParams(params).toString();
  return q ? `?${q}` : '';
}
