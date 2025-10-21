/**
 * API 使用示例
 * 展示如何使用标准化的 HTTP 客户端、分页查询和认证
 */

import { ayGet, ayPost, ayPut, ayDelete } from '@/http/ay_http'
import { getListPage, createLikeFilter, createStringFilter } from './ay_base'
import type { UserModel } from '@ay-shared-core/types/user'
import type { GoPageModel } from '@ay-shared-core/types/api'

// ========== 基础 CRUD 示例 ==========

/**
 * 获取用户资料
 */
export function getUserProfile() {
  return ayGet<Partial<UserModel>>('/user/profile')
}

/**
 * 更新用户资料
 */
export function updateUserProfile(data: Partial<UserModel>) {
  return ayPut<void>('/user/profile', data)
}

/**
 * 删除用户
 */
export function deleteUser(id: number) {
  return ayDelete<void>(`/user/${id}`)
}

// ========== 分页查询示例 ==========

/**
 * 获取用户列表（分页）
 * @param keyword 搜索关键词（昵称模糊搜索）
 * @param page 页码
 * @param pageSize 每页数量
 */
export function getUserList(keyword?: string, page = 1, pageSize = 20) {
  return getListPage<UserModel>('/user/list', {
    page,
    page_size: pageSize,
    filters: keyword
      ? [createLikeFilter('nick_name', keyword)]
      : [],
    sort_option: {
      sort_field: 'created_at',
      sort_order: 'desc',
    },
  })
}

/**
 * 获取用户列表（多条件筛选）
 */
export function getUserListAdvanced(params: {
  keyword?: string
  phone?: string
  page?: number
  pageSize?: number
}) {
  const { keyword, phone, page = 1, pageSize = 20 } = params

  const filters = []
  if (keyword) {
    filters.push(createLikeFilter('nick_name', keyword))
  }
  if (phone) {
    filters.push(createStringFilter('phone', 'eq', phone))
  }

  return getListPage<UserModel>('/user/list', {
    page,
    page_size: pageSize,
    filters,
  })
}

// ========== 组件中使用示例 ==========

/*
<template>
  <view class="container">
    <!-- 微信小程序登录示例 -->
    <view v-if="!tokenStore.hasLogin" class="login-section">
      <!-- #ifdef MP-WEIXIN -->
      <button @click="handleWxmpLogin">微信一键登录</button>
      <button
        v-if="openid"
        open-type="getPhoneNumber"
        @getphonenumber="handleGetPhoneNumber"
      >
        授权手机号
      </button>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <input v-model="loginForm.username" placeholder="用户名" />
      <input v-model="loginForm.password" type="password" placeholder="密码" />
      <button @click="handlePasswordLogin">登录</button>
      <!-- #endif -->
    </view>

    <!-- 用户资料展示 -->
    <view v-else class="user-section">
      <image :src="userStore.userProfile.avatar_url" mode="aspectFill" />
      <text>{{ userStore.userProfile.nick_name }}</text>
      <button @click="handleUpdateNickname">修改昵称</button>
      <button @click="handleLogout">退出登录</button>
    </view>

    <!-- 用户列表示例 -->
    <view class="user-list">
      <input v-model="keyword" placeholder="搜索用户" @input="loadUsers" />
      <view v-for="item in userList" :key="item.id" class="user-item">
        {{ item.nick_name }} - {{ item.phone }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAyTokenStore } from '@/store/ay_token'
import { useAyUserStore } from '@/store/ay_user'
import { getUserList } from '@/api/ay_demo'

const tokenStore = useAyTokenStore()
const userStore = useAyUserStore()

// ========== 微信小程序登录 ==========

const openid = ref('')

// 步骤1：获取 openid
async function handleWxmpLogin() {
  try {
    const res = await tokenStore.wxmpLoginStep1()
    openid.value = res.openid
    uni.showToast({
      title: '请授权手机号',
      icon: 'none',
    })
  } catch (error: any) {
    uni.showToast({
      title: error.message || '登录失败',
      icon: 'none',
    })
  }
}

// 步骤2：手机号授权回调
async function handleGetPhoneNumber(e: any) {
  if (e.detail.code) {
    try {
      await tokenStore.wxmpLoginStep2(e.detail.code, openid.value)
      uni.showToast({
        title: '登录成功',
        icon: 'success',
      })
    } catch (error: any) {
      uni.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      })
    }
  }
}

// ========== 用户名密码登录 ==========

const loginForm = ref({
  username: '',
  password: '',
})

async function handlePasswordLogin() {
  try {
    await tokenStore.login(loginForm.value)
    uni.showToast({
      title: '登录成功',
      icon: 'success',
    })
  } catch (error) {
    // 错误已自动弹窗
  }
}

// ========== 用户操作 ==========

async function handleUpdateNickname() {
  try {
    await userStore.updateUserProfile({ nick_name: '新昵称' })
    uni.showToast({
      title: '更新成功',
      icon: 'success',
    })
  } catch (error) {
    // 错误已自动弹窗
  }
}

async function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: async (res) => {
      if (res.confirm) {
        await tokenStore.logout()
      }
    },
  })
}

// ========== 用户列表 ==========

const userList = ref([])
const keyword = ref('')

async function loadUsers() {
  try {
    const res = await getUserList(keyword.value, 1, 20)
    userList.value = res.list
  } catch (error) {
    // 错误已自动弹窗
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.container {
  padding: 32rpx;
}

.login-section,
.user-section {
  margin-bottom: 40rpx;
}

button {
  margin-top: 20rpx;
}

.user-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
}
</style>
*/
