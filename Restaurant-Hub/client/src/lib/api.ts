/**
 * API Configuration
 * Handles API URL based on environment (development vs production)
 */

// Get API URL from environment variable or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (e.g., '/categories', '/menu-items')
 * @returns Full API URL
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // In development with Vite proxy, use relative URLs
  if (import.meta.env.DEV) {
    return `/${cleanEndpoint}`;
  }
  
  // In production, use full API URL
  // Remove /api from API_URL if endpoint already starts with api/
  const baseUrl = API_URL.replace(/\/api\/?$/, '');
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * Make an API request with proper URL handling
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function apiRequest(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = getApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  return fetch(url, { ...defaultOptions, ...options });
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiRequest(endpoint, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * PUT request helper
 */
export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiRequest(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Upload file helper
 */
export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = getApiUrl(endpoint);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    // Don't set Content-Type header - browser will set it with boundary
  });
  
  if (!response.ok) {
    throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export default {
  getApiUrl,
  apiRequest,
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  upload: apiUpload,
};
