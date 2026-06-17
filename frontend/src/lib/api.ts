import axios, { type AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('cl_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      if (
        err.response?.status === 401 &&
        err.response?.data?.code === 'TOKEN_EXPIRED' &&
        !original._retry
      ) {
        original._retry = true;
        const refreshToken = localStorage.getItem('cl_refresh_token');
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
            localStorage.setItem('cl_access_token', data.accessToken);
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(original);
          } catch {
            localStorage.removeItem('cl_access_token');
            localStorage.removeItem('cl_refresh_token');
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const api = createClient();

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string; fullName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateMe: (data: Partial<{ fullName: string; bio: string; avatarUrl: string }>) =>
    api.patch('/auth/me', data),
  githubLoginUrl: () => `${BASE_URL}/auth/github`,
};

// ── Repositories ──────────────────────────────────────────────────────────────
export const reposApi = {
  list: () => api.get('/repos'),
  listGitHub: (page = 1) => api.get(`/repos/github?page=${page}`),
  connect: (data: { githubOwner: string; githubName: string; autoSync?: boolean }) =>
    api.post('/repos', data),
  get: (id: string) => api.get(`/repos/${id}`),
  reanalyze: (id: string) => api.post(`/repos/${id}/reanalyze`),
  update: (id: string, data: Partial<{ autoSync: boolean; syncIntervalHours: number }>) =>
    api.patch(`/repos/${id}`, data),
  remove: (id: string) => api.delete(`/repos/${id}`),
};

// ── Documentation ─────────────────────────────────────────────────────────────
export const docsApi = {
  list: (params?: { status?: string; page?: number }) =>
    api.get('/docs', { params }),
  listPublic: (params?: { page?: number }) => api.get('/docs/public', { params }),
  get: (id: string) => api.get(`/docs/${id}`),
  getByRepo: (repoId: string) => api.get(`/docs/repo/${repoId}`),
  update: (
    id: string,
    data: Partial<{
      isPublic: boolean;
      title: string;
      description: string;
      autoRegenerate: boolean;
      section: { id: string; content?: string; title?: string };
    }>
  ) => api.patch(`/docs/${id}`, data),
  remove: (id: string) => api.delete(`/docs/${id}`),
};
