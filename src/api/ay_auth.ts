/**
 * 认证相关 API
 * 符合商城.md规范 + uni-app 多端兼容
 */

import { ayGet, ayPost, ayPut } from '@/http/ay_http'
import type { UserModel } from '@ay-shared-core/types/user'
import type { TokenResponse } from '@ay-shared-core/types/token'
import type { Code2SessionResponse, PhoneLoginRequest } from '@ay-shared-core/types/wxmp'

// ========== 导出共享类型 ==========
export type { TokenResponse, Code2SessionResponse, PhoneLoginRequest }

// ========== 微信小程序登录流程 ==========

/**
 * 微信小程序 - 获取 openid
 * POST /user/wxmp/login/code2-session
 * @param code 微信登录凭证
 */
export function wxmpCode2Session(code: string) {
  return ayPost<Code2SessionResponse>('/user/wxmp/login/code2-session', { code })
}

/**
 * 微信小程序 - 快速登录（手机号）
 * POST /user/wxmp/login/quick-phone
 * @param params { code: 手机号授权code, openid: openid }
 */
export function wxmpQuickPhoneLogin(params: PhoneLoginRequest) {
  return ayPost<TokenResponse>('/user/wxmp/login/quick-phone', params)
}

/**
 * uni-app 微信小程序登录（完整流程）
 * 1. 调用 wx.login 获取 code
 * 2. 使用 code 换取 openid
 * 3. 调用 getPhoneNumber 获取手机号 code
 * 4. 使用 openid + 手机号 code 完成登录
 */
export async function wxmpLogin() {
  // #ifdef MP-WEIXIN
  try {
    // 步骤1：获取微信登录 code
    const loginRes = await uni.login({ provider: 'weixin' })
    if (!loginRes.code) {
      throw new Error('微信登录失败')
    }

    // 步骤2：换取 openid
    const sessionRes = await wxmpCode2Session(loginRes.code)
    const { openid } = sessionRes

    // 步骤3：返回 openid，等待用户授权手机号
    return {
      openid,
      needPhoneAuth: true, // 需要前端调用 getPhoneNumber
    }
  }
  catch (err: any) {
    throw new Error(err.message || '微信登录失败')
  }
  // #endif

  // #ifndef MP-WEIXIN
  throw new Error('当前环境不支持微信小程序登录')
  // #endif
}

/**
 * uni-app 完成微信手机号登录
 * @param phoneCode 手机号授权 code（从 getPhoneNumber 回调获取）
 * @param openid openid
 */
export function wxmpPhoneLogin(phoneCode: string, openid: string) {
  return wxmpQuickPhoneLogin({
    code: phoneCode,
    openid,
  })
}

/**
 * 刷新 Token
 * POST /auth/refresh
 * 注意：此方法需要在 header 中携带 Token-Refresh
 */
export async function refreshToken(refresh_token: string) {
  try {
    const res = await uni.request({
      url: `${import.meta.env.VITE_SERVER_BASEURL}/api/v1/auth/refresh`,
      method: 'POST',
      header: {
        'Token-Refresh': refresh_token,
      },
      timeout: 60000,
    })

    if (res.statusCode === 200 && res.data) {
      const responseData = res.data as any
      if (responseData.code === 0 || responseData.code === 200) {
        return responseData.data as TokenResponse
      }
    }

    throw new Error('刷新令牌失败')
  }
  catch (err: any) {
    throw new Error(err.message || '刷新令牌失败')
  }
}

/**
 * 退出登录
 * POST /auth/logout
 */
export function logout() {
  return ayPost<void>('/auth/logout')
}

// ========== 用户信息 ==========

/**
 * 获取用户信息
 * GET /user/profile
 */
export function getUserProfile() {
  return ayGet<Partial<UserModel>>('/user/profile')
}

/**
 * 更新用户信息
 * PUT /user/profile
 * @param data 用户信息（如 nick_name）
 */
export function updateUserProfile(data: Partial<UserModel>) {
  return ayPut<void>('/user/profile', data)
}

// ========== 账号绑定 ==========

/**
 * 绑定邮箱（发送验证码）
 * POST /user/bind/email
 */
export function bindEmail(email: string) {
  return ayPost<void>('/user/bind/email', { email })
}

/**
 * 验证邮箱
 * POST /user/bind/email/verify
 */
export function verifyEmail(email: string, code: string) {
  return ayPost<void>('/user/bind/email/verify', { email, code })
}
