export const API = {
  LOGIN: '/api/login',
  FORGOT_PASSWORD: '/api/forgot-password',
  RESET_PASSWORD: '/api/reset-password',
  CUSTOMERS: '/api/customers',
  CUSTOMER_ACTION: (id, action) => `/api/customers/users/${id}/${action}`,
  CUSTOMER_DELETE: (id) => `/api/customers/users/${id}`,
  ADMIN_SETTINGS: '/api/admin/settings',
};

export const CACHE_KEYS = {
  CUSTOMERS: 'customers_list',
  ADMIN_SETTINGS: 'admin_settings',
};
