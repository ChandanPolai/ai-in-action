export const STORAGE_KEYS = {
  ADMIN_TOKEN: 'adminToken',
  ADMIN_DATA: 'adminData',
  ADMIN_ACTIVE_TAB: 'adminActiveTab'
};

export const getAdminToken = () => localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || null;

export const setAdminToken = (token) => {
  if (token) localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
};

export const removeAdminToken = () => localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);

export const getAdminData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADMIN_DATA);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setAdminData = (data) => {
  if (data) localStorage.setItem(STORAGE_KEYS.ADMIN_DATA, JSON.stringify(data));
};

export const removeAdminData = () => localStorage.removeItem(STORAGE_KEYS.ADMIN_DATA);

export const getStoredActiveTab = () => localStorage.getItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB) || 'dashboard';

export const setStoredActiveTab = (tabId) => {
  if (tabId) localStorage.setItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB, tabId);
};

export const clearAdminSession = () => {
  removeAdminToken();
  removeAdminData();
  localStorage.removeItem(STORAGE_KEYS.ADMIN_ACTIVE_TAB);
};

export default {
  STORAGE_KEYS,
  getAdminToken,
  setAdminToken,
  getAdminData,
  setAdminData,
  clearAdminSession,
  getStoredActiveTab,
  setStoredActiveTab
};
