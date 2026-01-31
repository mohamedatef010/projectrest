export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = "/admin/login"; // ✅ تغيير المسار
  }, 500);
}

// ✅ أضف هذه الدوال المساعدة الجديدة
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
}

export function getBackendUrl(path: string): string {
  const base = getApiBaseUrl();
  // إزالة الـ / المكررة
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function checkAuthStatus(): Promise<boolean> {
  return fetch(getBackendUrl('auth/user'), {
    credentials: 'include',
  })
    .then(res => {
      if (res.ok) {
        return res.json().then(data => data.success);
      }
      return false;
    })
    .catch(() => false);
}

export function handleApiError(error: any, toast?: any): void {
  console.error('API Error:', error);
  
  if (toast) {
    toast({
      title: "Error",
      description: error.message || "An error occurred",
      variant: "destructive",
    });
  }
  
  if (isUnauthorizedError(error)) {
    redirectToLogin(toast);
  }
}

// ✅ أضف wrapper لـ fetch مع معالجة الأخطاء
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  toast?: any
): Promise<Response> {
  const fullUrl = url.startsWith('http') ? url : getBackendUrl(url);
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText || response.statusText}`);
    }
    
    return response;
  } catch (error) {
    handleApiError(error, toast);
    throw error;
  }
}

// ✅ أضف دالة لفحص اتصال API
export async function checkApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(getBackendUrl('test'), {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}