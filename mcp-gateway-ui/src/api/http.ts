import axios from "axios"

/** 共享 axios 实例：后端 baseURL 为 /api，由 Vite 代理到 http://localhost:8082 */
export const http = axios.create({
  baseURL: "/api",
  timeout: 10000,
})
