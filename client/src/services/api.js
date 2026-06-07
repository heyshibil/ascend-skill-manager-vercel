import axios from "axios";

export const API = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api",
  withCredentials: true,
});

API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If user is blocked (403) or unauthorized (401), kick them out
    if (error.response?.status === 401 || error.response?.status === 403) {
      import("../store/useAuthStore").then((module) => {
        const store = module.default;
        if (store.getState().isAuthenticated) {
          store.getState().logout();
          window.location.href = "/";
        }
      });
    }
    return Promise.reject(error);
  }
);