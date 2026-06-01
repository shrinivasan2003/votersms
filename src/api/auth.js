import { post } from './client';
import { API } from '../config/constants';

export const authApi = {
  login: (username, password) => post(API.LOGIN, { username, password }),
  logout: () => post('/api/logout', {}),
  forgotPassword: (username, email) => post(API.FORGOT_PASSWORD, { username, email }),
  resetPassword: (token, new_password) => post(API.RESET_PASSWORD, { token, new_password }),
};
