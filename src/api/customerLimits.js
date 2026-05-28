import { get, put } from './client';

const BASE = (customerId) => `/api/customers/${customerId}/limits`;

export const customerLimitsApi = {
  /** Returns { limits: {...}, usage: {...} } */
  get: (customerId) => get(BASE(customerId)),
  /** Pass a partial object of limit keys → values to update */
  update: (customerId, updates) => put(BASE(customerId), updates),
};
