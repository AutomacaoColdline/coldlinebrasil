// Arquivo: src/config/api.ts (no projeto React)

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const api = {
  auth: {
    signup: async (name: string, email: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      return response.json();
    },

    login: async (email: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },
  },

  services: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/api/services`);
      return response.json();
    },

    getById: async (id: number) => {
      const response = await fetch(`${API_URL}/api/services/${id}`);
      return response.json();
    },

    create: async (token: string, name: string, description: string, icon: string) => {
      const response = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, icon }),
      });
      return response.json();
    },

    update: async (
      token: string,
      id: number,
      name: string,
      description: string,
      icon: string
    ) => {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, icon }),
      });
      return response.json();
    },

    delete: async (token: string, id: number) => {
      const response = await fetch(`${API_URL}/api/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  },

  contacts: {
    create: async (name: string, email: string, phone: string, message: string) => {
      const response = await fetch(`${API_URL}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      return response.json();
    },

    getAll: async (token: string) => {
      const response = await fetch(`${API_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    },
  },
};
