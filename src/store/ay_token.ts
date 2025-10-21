/**
 * 标准化 Token Store
 * 符合 @ay-shared-core 规范
 * 使用 Token-Access 和 Token-Refresh header
 *
 * 职责：仅负责 Token 状态管理，业务逻辑在 API 层
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TokenResponse } from '@ay-shared-core/types/token'
import * as authApi from '@/api/ay_auth'

const initialTokenInfo: TokenResponse = {
  access_token: '',
  refresh_token: '',
}

export const useAyTokenStore = defineStore(
  'ay_token',
  () => {
    // ========== 状态 ==========
    const tokenInfo = ref<TokenResponse>({ ...initialTokenInfo })

    // ========== 计算属性 ==========

    // 是否已登录
    const hasLogin = computed(() => {
      return !!tokenInfo.value.access_token
    })

    // 访问 token（供 HTTP 拦截器使用）
    const access_token = computed(() => tokenInfo.value.access_token)

    // 刷新 token（供刷新接口使用）
    const refresh_token = computed(() => tokenInfo.value.refresh_token)

    // ========== 基础方法 ==========

    /**
     * 设置 Token 信息
     */
    const setTokenInfo = (info: TokenResponse) => {
      tokenInfo.value = info
    }

    /**
     * 清除 Token 信息
     */
    const clearTokenInfo = () => {
      tokenInfo.value = { ...initialTokenInfo }
      uni.removeStorageSync('ay_token')
    }

    // ========== 业务方法 ==========

    /**
     * 用户名密码登录
     */
    const login = async (loginForm: { username: string, password: string }) => {
      const res = await authApi.login(loginForm)
      setTokenInfo(res)

      // 登录成功后获取用户信息
      const { useAyUserStore } = await import('./ay_user')
      const userStore = useAyUserStore()
      await userStore.fetchUserInfo()

      return res
    }

    /**
     * 微信小程序登录（第一步：获取 openid）
     * 返回 openid，前端需要调用 wx.getPhoneNumber 获取手机号授权
     */
    const wxmpLoginStep1 = async () => {
      return await authApi.wxmpLogin()
    }

    /**
     * 微信小程序登录（第二步：完成手机号登录）
     * @param phoneCode 手机号授权 code
     * @param openid openid
     */
    const wxmpLoginStep2 = async (phoneCode: string, openid: string) => {
      const res = await authApi.wxmpPhoneLogin(phoneCode, openid)
      setTokenInfo(res)

      // 登录成功后获取用户信息
      const { useAyUserStore } = await import('./ay_user')
      const userStore = useAyUserStore()
      await userStore.fetchUserInfo()

      return res
    }

    /**
     * 刷新 Token
     */
    const refreshToken = async () => {
      if (!tokenInfo.value.refresh_token) {
        throw new Error('无刷新令牌')
      }

      try {
        const newTokenInfo = await authApi.refreshToken(tokenInfo.value.refresh_token)
        setTokenInfo(newTokenInfo)
        return newTokenInfo
      }
      catch (err: any) {
        // 刷新失败，清除 token
        clearTokenInfo()
        throw err
      }
    }

    /**
     * 退出登录
     */
    const logout = async () => {
      try {
        await authApi.logout()
      }
      finally {
        clearTokenInfo()

        // 清除用户信息
        const { useAyUserStore } = await import('./ay_user')
        const userStore = useAyUserStore()
        userStore.clearUserInfo()

        // 跳转到登录页
        uni.reLaunch({ url: '/pages-fg/login/login' })
      }
    }

    return {
      // 状态
      tokenInfo,
      access_token,
      refresh_token,
      hasLogin,

      // 方法
      setTokenInfo,
      clearTokenInfo,
      login,
      wxmpLoginStep1,
      wxmpLoginStep2,
      refreshToken,
      logout,
    }
  },
  {
    persist: true,
  },
)
