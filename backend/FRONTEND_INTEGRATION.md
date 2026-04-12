# Integração Frontend-Backend

## Configuração do Frontend React

### 1. Variáveis de Ambiente (.env / .env.local)

```env
VITE_API_URL=http://localhost:8080
```

### 2. Cliente API Recomendado

Você pode usar a biblioteca `axios` ou `fetch` nativo. Aqui está um exemplo com fetch:

```typescript
// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  signup(name: string, email: string, password: string) {
    return this.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  login(email: string, password: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  // Services
  getServices() {
    return this.request("/api/services");
  }

  getService(id: number) {
    return this.request(`/api/services/${id}`);
  }

  createService(name: string, description: string, icon: string) {
    return this.request("/api/services", {
      method: "POST",
      body: JSON.stringify({ name, description, icon }),
    });
  }

  // Contacts
  createContact(name: string, email: string, phone: string, message: string) {
    return this.request("/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, message }),
    });
  }
}

export const apiClient = new APIClient();
```

### 3. Usar no Componente React

```typescript
// src/components/LoginForm.tsx
import { apiClient } from "@/services/api";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiClient.login(email, password);
      localStorage.setItem("token", response.token);
      apiClient.setToken(response.token);
      // Redirecionar ou atualizar estado
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### 4. Context para Autenticação (Opcional)

```typescript
// src/context/AuthContext.tsx
import { createContext, ReactNode, useState, useEffect } from "react";
import { apiClient } from "@/services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiClient.setToken(token);
      setIsAuthenticated(true);
      // Opcional: validar token com o servidor
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    localStorage.setItem("token", response.token);
    apiClient.setToken(response.token);
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("token");
    apiClient.setToken("");
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## CORS

O backend já está configurado para aceitar requisições do frontend.

- **Desenvolvimento:** `http://localhost:5173` (Vite default)
- **Produção:** Configure `CORS_ORIGINS` no `.env` do backend

## Diferenças de Ambiente

### Desenvolvimento

```bash
# Backend rodando com Docker
docker-compose up

# Frontend rodando com Vite
npm run dev

# Frontend faz requisições para http://localhost:8080
```

### Produção

1. Build o React: `npm run build`
2. Deploy da API Go em servidor VPS/Cloud
3. Configurar `CORS_ORIGINS` com domínio da produção
4. Adicionar `VITE_API_URL` na build do React

## Troubleshooting

### CORS Error

Se receber erro de CORS, verifique:

1. Backend em `/api/services` retorna `Access-Control-Allow-Origin`?
2. `CORS_ORIGINS` no `.env` inclui a origem do frontend?
3. Método HTTP correto sendo usado?

### Teste rápido com curl

```bash
# Health check
curl http://localhost:8080/health

# Signup
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
