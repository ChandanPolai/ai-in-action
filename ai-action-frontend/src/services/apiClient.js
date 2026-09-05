import { getUserToken, clearUserSession } from '../utils/storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const forceLogoutToLogin = () => {
  clearUserSession();
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const loginPath = `${base}/login`;
  if (!window.location.pathname.endsWith('/login')) {
    window.location.assign(loginPath);
  }
};

export const postRequest = async (endpoint, data = {}, customHeaders = {}) => {
  try {
    const userToken = getUserToken();
    const isFormData = data instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(userToken ? { usertoken: userToken, Authorization: `Bearer ${userToken}` } : {}),
      ...customHeaders
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      const message = result.message || 'API Request Failed';
      const deactivated =
        response.status === 401 &&
        userToken &&
        /deactivated|not found/i.test(message);

      if (deactivated) {
        forceLogoutToLogin();
      }

      const err = new Error(message);
      err.data = result.data || null;
      err.code = result.data?.code || null;
      err.status = response.status;
      throw err;
    }

    return result;
  } catch (error) {
    console.error(`[API ERROR] Endpoint: ${endpoint}`, error.message);
    throw error;
  }
};

export const imageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000';
  return `${base}${path}`;
};

export default { postRequest, imageUrl };
