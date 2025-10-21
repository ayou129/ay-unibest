/**
 * 全局配置文件
 */

// API 基础路径
export const API_PATH = import.meta.env.VITE_SERVER_HAS_API_PREFIX === 'true'
  ? '/api/v1'
  : ''

// 应用配置
export const APP_CONFIG = {
  title: import.meta.env.VITE_APP_TITLE || 'unibest',
  timeout: 60000, // 请求超时时间 (ms)
}
