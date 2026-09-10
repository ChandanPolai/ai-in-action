import { getAdminToken } from '../utils/storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const postRequest = async (endpoint, data = {}, customHeaders = {}) => {
  try {
    const adminToken = getAdminToken();
    const isFormData = data instanceof FormData;

    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(adminToken ? { admintoken: adminToken, Authorization: `Bearer ${adminToken}` } : {}),
      ...customHeaders
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      throw new Error(result.message || 'API Request Failed');
    }

    return result;
  } catch (error) {
    console.error(`[API ERROR] Endpoint: ${endpoint}`, error.message);
    throw error;
  }
};

/** POST that returns a Blob (e.g. PDF preview stream). */
export const postBlobRequest = async (endpoint, data = {}, customHeaders = {}) => {
  const adminToken = getAdminToken();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(adminToken ? { admintoken: adminToken, Authorization: `Bearer ${adminToken}` } : {}),
      ...customHeaders
    },
    body: JSON.stringify(data)
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || contentType.includes('application/json')) {
    let message = 'Failed to load file';
    try {
      const result = await response.json();
      message = result.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.blob();
};

export const imageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:5000';
  return `${base}${path}`;
};

export default { postRequest, postBlobRequest, imageUrl };
