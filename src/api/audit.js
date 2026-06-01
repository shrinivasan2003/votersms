import { get } from './client';

function _qs(params) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
  return q ? `?${q}` : '';
}

export const auditApi = {
  organizations: ()                     => get('/api/admin/audit/organizations'),
  orgSummary: (customerId)              => get(`/api/admin/audit/organizations/${customerId}/summary`),
  orgEntities: (customerId)             => get(`/api/admin/audit/organizations/${customerId}/entities`),
  orgLogs: (customerId, params = {})    => get(`/api/admin/audit/organizations/${customerId}/logs` + _qs(params)),
};
