import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  first_name?: string;
  last_name?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const url = getApiUrl("auth/user");
      const response = await fetch(url, { credentials: "include" });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const url = getApiUrl("login");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({
        success: false,
        message: response.ok ? "Invalid response" : "Server error",
      }));
      if (data.success) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message ?? "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Network error" };
    }
  };

  const logout = async () => {
    try {
      const url = getApiUrl("logout");
      await fetch(url, { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
    }
  };

  return { user, isLoading, login, logout, checkAuth };
}