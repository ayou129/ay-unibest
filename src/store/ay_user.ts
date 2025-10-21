/**
 * 标准化 User Store
 * 使用 @ay-shared-core 的 UserModel
 *
 * 职责：仅负责用户信息状态管理，业务逻辑在 API 层
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserModel } from '@ay-shared-core/types/user'
import * as authApi from '@/api/ay_auth'

// 初始用户资料
const initialUserProfile: Partial<UserModel> = {
  id: 0,
  nick_name: '',
  avatar_url: '/static/images/default-avatar.png',
  phone: '',
  email: '',
  real_name: '',
}

export const useAyUserStore = defineStore(
  'ay_user',
  () => {
    // ========== 状态 ==========
    const userProfile = ref<Partial<UserModel>>({ ...initialUserProfile })

    // ========== 基础方法 ==========

    /**
     * 设置用户资料
     */
    const setUserProfile = (profile: Partial<UserModel>) => {
      // 保留默认头像
      if (!profile.avatar_url) {
        profile.avatar_url = initialUserProfile.avatar_url
      }
      userProfile.value = profile
    }

    /**
     * 设置头像
     */
    const setUserAvatar = (avatar_url: string) => {
      userProfile.value.avatar_url = avatar_url
    }

    /**
     * 清除用户资料
     */
    const clearUserProfile = () => {
      userProfile.value = { ...initialUserProfile }
      uni.removeStorageSync('ay_user')
    }

    // ========== 业务方法 ==========

    /**
     * 获取用户资料（从服务器）
     */
    const fetchUserProfile = async () => {
      const res = await authApi.getUserProfile()
      setUserProfile(res)
      return res
    }

    /**
     * 更新用户资料
     * @param data 要更新的字段（如 nick_name）
     */
    const updateUserProfile = async (data: Partial<UserModel>) => {
      await authApi.updateUserProfile(data)
      // 更新本地状态
      setUserProfile({
        ...userProfile.value,
        ...data,
      })
    }

    return {
      // 状态
      userProfile,

      // 方法
      setUserProfile,
      setUserAvatar,
      clearUserProfile,
      fetchUserProfile,
      updateUserProfile,
    }
  },
  {
    persist: true,
  },
)
