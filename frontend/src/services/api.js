import axios from "axios";

// On Render: API is same origin. In dev: proxy via vite.config.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 90_000,  // AI calls can be slow
});

// ── Attach JWT to every request ────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iq_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ────────────────────────────────────────────────────
let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = (async () => {
          try {
            const refresh = localStorage.getItem("iq_refresh_token");
            const { data } = await axios.post("/api/auth/refresh", {
              refresh_token: refresh,
            });
            localStorage.setItem("iq_access_token", data.access_token);
            localStorage.setItem("iq_refresh_token", data.refresh_token);
            return data.access_token;
          } catch {
            localStorage.clear();
            window.location.href = "/";
          } finally {
            refreshing = null;
          }
        })();
      }
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
