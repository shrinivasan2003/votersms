import { get, post, put, patch, del } from './client';
import { API } from '../config/constants';

export const customersApi = {
  list: () => get(API.CUSTOMERS),
  create: (data) => post(API.CUSTOMERS, data),
  pause: (id) => patch(API.CUSTOMER_ACTION(id, 'pause')),
  activate: (id) => patch(API.CUSTOMER_ACTION(id, 'activate')),
  deactivate: (id) => patch(API.CUSTOMER_ACTION(id, 'deactivate')),
  remove: (id) => del(API.CUSTOMER_DELETE(id)),
  getMySettings: () => get('/api/customers/my-settings'),
  updateMySettings: (data) => put('/api/customers/my-settings', data),
};
