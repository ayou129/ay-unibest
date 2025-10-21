/**
 * 标准化 HTTP 客户端
 * 符合 @ay-shared-core 规范
 */

import type { ApiResponse } from '@ay-shared-core/types/api'
import { API_PATH, APP_CONFIG } from '@/config'

// 自定义请求选项
export type AyRequestOptions = UniApp.RequestOptions & {
  query?: Record<string, any>
  hideErrorToast?: boolean
}

// 请求队列（用于 401 刷新 token 后重试）
let refreshing = false
let taskQueue: Array<() => void> = []

/**
 * 核心请求方法
 */
export function ayHttp<T>(options: AyRequestOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const { useAyTokenStore } = require('@/store/ay_token')
    const tokenStore = useAyTokenStore()

    // 1. 处理 query 参数
    if (options.query) {
      const queryString = Object.entries(options.query)
        .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
        .join('&')
      options.url += options.url.includes('?') ? `&${queryString}` : `?${queryString}`
      delete options.query
    }

    // 2. 自动拼接 baseURL + API_PATH
    if (!options.url.startsWith('http')) {
      const baseUrl = import.meta.env.VITE_SERVER_BASEURL || ''
      // #ifdef H5
      if (JSON.parse(import.meta.env.VITE_APP_PROXY_ENABLE || 'false')) {
        options.url = import.meta.env.VITE_APP_PROXY_PREFIX + API_PATH + options.url
      }
      else {
        options.url = baseUrl + API_PATH + options.url
      }
      // #endif
      // #ifndef H5
      options.url = baseUrl + API_PATH + options.url
      // #endif
    }

    // 3. 设置超时
    options.timeout = options.timeout || APP_CONFIG.timeout

    // 4. 注入 Token（同时注入 access 和 refresh）
    if (!options.header)
      options.header = {}

    const accessToken = tokenStore.access_token
    const refreshToken = tokenStore.refresh_token

    if (accessToken) {
      options.header['Token-Access'] = accessToken
    }
    if (refreshToken) {
      options.header['Token-Refresh'] = refreshToken
    }

    // 5. 发起请求
    uni.request({
      ...options,
      dataType: 'json',
      success: async (res) => {
        const responseData = res.data as ApiResponse<T>
        const { code, data, msg } = responseData

        // 401 处理：刷新 token
        if (res.statusCode === 401 || code === 401) {
          // 添加到重试队列
          taskQueue.push(() => {
            resolve(ayHttp<T>(options))
          })

          // 如果没有在刷新中，发起刷新
          if (!refreshing) {
            refreshing = true
            try {
              await tokenStore.refreshToken()
              // 刷新成功，执行队列
              taskQueue.forEach(task => task())
              taskQueue = []
            }
            catch (err: any) {
              // 刷新失败，清空队列并跳转登录
              taskQueue = []
              uni.showToast({
                icon: 'none',
                title: err.message || 'Token 刷新失败',
              })
              uni.reLaunch({ url: '/pages-fg/login/login' })
              reject(err)
            }
            finally {
              refreshing = false
            }
          }
          return
        }

        // 业务错误处理
        if (code !== 0 && code !== 200) {
          if (!options.hideErrorToast) {
            uni.showToast({
              icon: 'none',
              title: msg || `请求错误[${code}]`,
            })
          }
          return reject(new Error(msg || `请求错误[${code}]`))
        }

        // 成功返回
        resolve(data)
      },
      fail(err) {
        // 网络错误
        uni.showToast({
          icon: 'none',
          title: '网络错误，换个网络试试',
        })
        reject(err)
      },
    })
  })
}

// GET 请求
export function ayGet<T>(url: string, query?: Record<string, any>, header?: Record<string, any>): Promise<T> {
  return ayHttp<T>({
    url,
    method: 'GET',
    query,
    header,
  })
}

// POST 请求
export function ayPost<T>(url: string, data?: any, query?: Record<string, any>, header?: Record<string, any>): Promise<T> {
  return ayHttp<T>({
    url,
    method: 'POST',
    data,
    query,
    header,
  })
}

// PUT 请求
export function ayPut<T>(url: string, data?: any, query?: Record<string, any>, header?: Record<string, any>): Promise<T> {
  return ayHttp<T>({
    url,
    method: 'PUT',
    data,
    query,
    header,
  })
}

// DELETE 请求
export function ayDelete<T>(url: string, data?: any, query?: Record<string, any>, header?: Record<string, any>): Promise<T> {
  return ayHttp<T>({
    url,
    method: 'DELETE',
    data,
    query,
    header,
  })
}

// 导出默认对象（兼容不同调用风格）
export default {
  http: ayHttp,
  get: ayGet,
  post: ayPost,
  put: ayPut,
  delete: ayDelete,
}
