const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface AdminLoginResponse {
  token: string;
  message: string;
}

export const adminLogin = async (
  password: string
): Promise<AdminLoginResponse> => {
  const response = await fetch(`${API_URL}/api/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Admin login failed");
  }

  return data;
};

export const saveAdminToken = (token: string) => {
  localStorage.setItem("admin_token", token);
};

export const getAdminToken = () => {
  return localStorage.getItem("admin_token");
};

export const removeAdminToken = () => {
  localStorage.removeItem("admin_token");
};