import axios from "axios";

const BASE = (process.env.REACT_APP_BACKEND_URL || window.location.origin).replace(/\/$/, "");
export const API = `${BASE}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("tb_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const formatINR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  const abs = Math.abs(Number(n));
  if (abs >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(n/100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(n/1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export const formatNum = (n) => Number(n||0).toLocaleString("en-IN");
