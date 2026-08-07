export const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  USER_ACTIVE_TAB: 'userActiveTab'
};

export const getUserToken = () => localStorage.getItem(STORAGE_KEYS.USER_TOKEN) || null;

export const setUserToken = (token) => {
  if (token) localStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
};

export const removeUserToken = () => localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);

export const getUserData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setUserData = (data) => {
  if (data) localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
};

export const removeUserData = () => localStorage.removeItem(STORAGE_KEYS.USER_DATA);

export const getStoredActiveTab = () => localStorage.getItem(STORAGE_KEYS.USER_ACTIVE_TAB) || 'dashboard';

export const setStoredActiveTab = (tabId) => {
  if (tabId) localStorage.setItem(STORAGE_KEYS.USER_ACTIVE_TAB, tabId);
};

export const clearUserSession = () => {
  removeUserToken();
  removeUserData();
  localStorage.removeItem(STORAGE_KEYS.USER_ACTIVE_TAB);
};

export default {
  getUserToken,
  setUserToken,
  getUserData,
  setUserData,
  clearUserSession,
  getStoredActiveTab,
  setStoredActiveTab
};
