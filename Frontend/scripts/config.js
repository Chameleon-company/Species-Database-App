// scripts/config.js - API Configuration
export const API_CONFIG = {
  baseUrl: "http://127.0.0.1:5000",
  endpoints: {
    bundle: "/api/bundle",
    login: "/api/login",
  },
};

console.log("[config.js] API Config loaded:", API_CONFIG.baseUrl);