import { get, put } from './client';
import { API } from '../config/constants';

export const adminApi = {
  getSettings: () => get(API.ADMIN_SETTINGS),
  saveSettings: (data) => put(API.ADMIN_SETTINGS, data),
};
