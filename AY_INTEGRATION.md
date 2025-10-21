# ay-unibest 标准化集成文档

## 概述

已成功集成 `@ay-shared-core` 到 ay-unibest 项目，所有新文件使用 `ay_` 前缀命名，与现有代码并存。

**架构特点**：
- ✅ **API 与 Store 分离** - Store 只负责状态管理，API 调用在独立文件
- ✅ **符合商城.md规范** - 实现微信小程序登录流程（code2Session + 手机号授权）
- ✅ **uni-app 多端兼容** - 条件编译支持微信小程序和其他平台

---

## 文件清单

### 新建文件

1. **配置文件**
   - `src/config/index.ts` - API_PATH 和全局配置

2. **HTTP 客户端**
   - `src/http/ay_http.ts` - 标准化 HTTP 客户端
   - 特性：Token-Access/Token-Refresh header、401 自动刷新、统一弹窗

3. **认证 API**
   - `src/api/ay_auth.ts` - 认证相关 API（登录、注册、用户资料）
   - 支持：微信小程序登录、用户名密码登录、Token 刷新

4. **状态管理**
   - `src/store/ay_token.ts` - Token 管理（纯状态，调用 ay_auth API）
   - `src/store/ay_user.ts` - 用户资料管理（纯状态，调用 ay_auth API）

5. **API 工具**
   - `src/api/ay_base.ts` - 分页查询和筛选器工具
   - `src/api/ay_demo.ts` - 完整使用示例（包含微信登录）

### 修改文件

1. `package.json` - 添加 `@ay-shared-core` 依赖
2. `env/.env.development` - 配置后端地址

---

## 环境配置

### 开发环境 (`env/.env.development`)

```env
VITE_SERVER_BASEURL = 'http://127.0.0.1:8080'
VITE_SERVER_HAS_API_PREFIX = 'true'
```

- `VITE_SERVER_BASEURL`: 后端服务地址
- `VITE_SERVER_HAS_API_PREFIX`: 是否自动添加 `/api/v1` 前缀

---

## 核心特性

### 1. HTTP 请求

**自动处理**：
- ✅ 自动拼接 `baseURL + API_PATH + 你的路径`
- ✅ 自动注入 `Token-Access` 和 `Token-Refresh` headers（双 token 同时发送）
- ✅ 401 自动刷新 token（使用 Token-Refresh）
- ✅ 网络错误自动弹窗
- ✅ 业务错误自动弹窗（显示 msg 字段）

**基础用法**：

```typescript
import { ayGet, ayPost, ayPut, ayDelete } from '@/http/ay_http'

// GET 请求
const userProfile = await ayGet<UserModel>('/user/profile')

// POST 请求
await ayPost('/user/update', { nick_name: '新昵称' })

// 带 query 参数
await ayGet('/user/list', { page: 1, size: 20 })

// 自定义 header
await ayPost('/upload', formData, {}, { 'Content-Type': 'multipart/form-data' })
```

### 2. 分页查询

**使用 getListPage**：

```typescript
import { getListPage, createLikeFilter } from '@/api/ay_base'
import type { UserModel } from '@ay-shared-core/types/user'

// 简单分页
const res = await getListPage<UserModel>('/user/list', {
  page: 1,
  page_size: 20,
})

// 带筛选条件
const res = await getListPage<UserModel>('/user/list', {
  page: 1,
  page_size: 20,
  filters: [
    createLikeFilter('nick_name', '张三'),
  ],
  sort_option: {
    sort_field: 'created_at',
    sort_order: 'desc',
  },
})

console.log(res.list)    // 数据列表
console.log(res.total)   // 总数
console.log(res.page)    // 当前页
```

### 3. 微信小程序登录（符合商城.md规范）

**登录流程**：
1. 调用 `wx.login` 获取 code
2. 后端 `/user/wxmp/login/code2-session` 返回 openid
3. 用户点击授权，调用 `getPhoneNumber` 获取手机号 code
4. 后端 `/user/wxmp/login/quick-phone` 完成登录，返回 token

**前端实现**：

```vue
<template>
  <view>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAyTokenStore } from '@/store/ay_token'

const tokenStore = useAyTokenStore()
const openid = ref('')

// 微信小程序登录 - 步骤1
async function handleWxmpLogin() {
  try {
    const res = await tokenStore.wxmpLoginStep1()
    openid.value = res.openid
    uni.showToast({ title: '请授权手机号', icon: 'none' })
  } catch (error: any) {
    uni.showToast({ title: error.message, icon: 'none' })
  }
}

// 微信小程序登录 - 步骤2
async function handleGetPhoneNumber(e: any) {
  if (e.detail.code) {
    try {
      await tokenStore.wxmpLoginStep2(e.detail.code, openid.value)
      uni.showToast({ title: '登录成功', icon: 'success' })
    } catch (error: any) {
      uni.showToast({ title: error.message, icon: 'none' })
    }
  }
}

// 用户名密码登录
const loginForm = ref({ username: '', password: '' })
async function handlePasswordLogin() {
  try {
    await tokenStore.login(loginForm.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (error) {
    // 错误已自动弹窗
  }
}

// 退出登录
async function handleLogout() {
  await tokenStore.logout()
  // 自动跳转登录页
}
</script>
```

**API 调用路径**：
- `POST /user/wxmp/login/code2-session` - 获取 openid
- `POST /user/wxmp/login/quick-phone` - 手机号登录
- `GET /user/profile` - 获取用户资料
- `PUT /user/profile` - 更新用户资料（如 nick_name）

### 4. Token 管理

**特性**：
- 只存储 `access_token` 和 `refresh_token`
- 无过期时间判断
- Header 格式：`Token-Access` 和 `Token-Refresh`
- Store 只负责状态管理，API 调用在 `ay_auth.ts`

**判断登录状态**：

```vue
<script setup lang="ts">
import { useAyTokenStore } from '@/store/ay_token'

const tokenStore = useAyTokenStore()

if (tokenStore.hasLogin) {
  console.log('已登录')
}
</script>
```

### 5. 用户资料管理

**使用 UserModel**：

```vue
<script setup lang="ts">
import { useAyUserStore } from '@/store/ay_user'

const userStore = useAyUserStore()

// 获取用户资料
await userStore.fetchUserProfile()

// 使用用户资料
console.log(userStore.userProfile.nick_name)
console.log(userStore.userProfile.avatar_url)

// 更新头像
userStore.setUserAvatar('https://xxx.com/avatar.jpg')
</script>
```

---

## API 开发示例

### 创建新的 API 文件

```typescript
// src/api/product.ts
import { ayGet, ayPost } from '@/http/ay_http'
import { getListPage, createLikeFilter } from './ay_base'

// 产品模型（定义在 @ay-shared-core 或本地）
export interface ProductModel {
  id: number
  name: string
  price: number
  description: string
}

// 获取产品列表
export function getProductList(keyword?: string, page = 1) {
  return getListPage<ProductModel>('/product/list', {
    page,
    page_size: 20,
    filters: keyword ? [createLikeFilter('name', keyword)] : [],
  })
}

// 获取产品详情
export function getProductDetail(id: number) {
  return ayGet<ProductModel>(`/product/${id}`)
}

// 创建产品
export function createProduct(data: Partial<ProductModel>) {
  return ayPost<void>('/product/create', data)
}
```

### 在组件中使用

```vue
<template>
  <view>
    <view v-for="item in productList" :key="item.id">
      {{ item.name }} - ¥{{ item.price }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getProductList } from '@/api/product'

const productList = ref([])
const loading = ref(false)

async function loadProducts() {
  loading.value = true
  try {
    const res = await getProductList('手机', 1)
    productList.value = res.list

    uni.showToast({
      title: `加载成功，共 ${res.total} 条`,
      icon: 'success',
    })
  } catch (error) {
    // 错误已自动弹窗
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})
</script>
```

---

## 筛选器工具

### 可用的筛选器

```typescript
import {
  createLikeFilter,          // 模糊搜索
  createStringFilter,        // 字符串比较
  createNumberFilter,        // 数字比较
  createStartsWithFilter,    // 前缀匹配
  createEndsWithFilter,      // 后缀匹配
  FILTER_OPERATORS,          // 所有操作符
  DEFAULT_SORT_OPTION,       // 默认排序
} from '@/api/ay_base'

// 模糊搜索
createLikeFilter('nick_name', '张三')

// 精确匹配
createStringFilter('phone', 'eq', '13800138000')

// 数字范围
createNumberFilter('age', 'gte', 18)

// 组合使用
const filters = [
  createLikeFilter('nick_name', '张'),
  createNumberFilter('age', 'gte', 18),
]
```

### 可用的操作符

```typescript
FILTER_OPERATORS.EQUAL           // 等于
FILTER_OPERATORS.NOT_EQUAL       // 不等于
FILTER_OPERATORS.GT              // 大于
FILTER_OPERATORS.GTE             // 大于等于
FILTER_OPERATORS.LT              // 小于
FILTER_OPERATORS.LTE             // 小于等于
FILTER_OPERATORS.BETWEEN         // 区间
FILTER_OPERATORS.LIKE            // 包含
FILTER_OPERATORS.NOT_LIKE        // 不包含
FILTER_OPERATORS.STARTS_WITH     // 前缀
FILTER_OPERATORS.ENDS_WITH       // 后缀
FILTER_OPERATORS.IN              // 在集合中
FILTER_OPERATORS.NOT_IN          // 不在集合中
FILTER_OPERATORS.IS_NULL         // 是空
FILTER_OPERATORS.IS_NOT_NULL     // 不是空
```

---

## 类型系统

### 共享类型（来自 @ay-shared-core）

**类型命名规范**：
- 模型相关：`[ModelName]+[Action]Request/Response`（如 `UserRegisterRequest`）
- 非模型相关：`[Action]Request/Response`（如 `TokenResponse`, `PhoneLoginRequest`）

**常用类型**：

```typescript
// 用户模型
import type { UserModel } from '@ay-shared-core/types/user'

// 认证类型
import type { TokenResponse, LoginRequest } from '@ay-shared-core/types/auth'

// 微信小程序类型
import type { Code2SessionResponse, PhoneLoginRequest } from '@ay-shared-core/types/wxmp'

// API 响应
import type { ApiResponse, GoPageModel } from '@ay-shared-core/types/api'

// 分页查询
import type { PageQueryDTO, FilterQuery } from '@ay-shared-core/utils/page_query'

// 使用示例
const response: ApiResponse<UserModel> = {
  code: 0,
  msg: '成功',
  data: {
    id: 1,
    nick_name: '张三',
    phone: '13800138000',
    // ...
  },
}

const pageData: GoPageModel<UserModel> = {
  list: [],
  total: 100,
  page: 1,
  pageSize: 20,
}
```

---

## 弹窗规范

### 自动弹窗场景

1. **网络错误**：自动显示"网络错误，换个网络试试"
2. **401 错误**：静默刷新 token，失败则提示并跳转登录
3. **业务错误**：自动显示后端返回的 `msg` 字段

### 手动弹窗

```typescript
// 成功提示
uni.showToast({
  title: '操作成功',
  icon: 'success',
})

// 错误提示
uni.showToast({
  title: '操作失败',
  icon: 'none',
})

// 加载中
uni.showLoading({ title: '加载中...' })
uni.hideLoading()

// 确认对话框
uni.showModal({
  title: '提示',
  content: '确定要删除吗？',
  success: (res) => {
    if (res.confirm) {
      // 用户点击确定
    }
  },
})
```

---

## 与现有代码的关系

### 并存策略

- ✅ 新功能使用 `ay_` 前缀的文件
- ✅ 老功能保持不变
- ✅ 逐步迁移，无需一次性替换

### 两套系统对比

| 特性 | 原有系统 | ay_ 系统 |
|------|---------|----------|
| HTTP 客户端 | `http.ts` | `ay_http.ts` |
| Token 管理 | `store/token.ts` | `store/ay_token.ts` |
| 用户资料管理 | `store/user.ts` | `store/ay_user.ts` |
| Token Header | `Authorization: Bearer` | `Token-Access` + `Token-Refresh` |
| 过期时间 | 需要判断 | 无需判断 |
| 类型定义 | 本地定义 | `@ay-shared-core` |
| 分页查询 | 无统一封装 | `getListPage` |
| API/Store 分离 | 未分离 | 完全分离 |

---

## 注意事项

1. **Token 刷新**：只在双 token 模式下有效，刷新失败会跳转登录页
2. **类型安全**：所有 API 都应该提供泛型类型参数
3. **错误处理**：业务层可以 try-catch，但弹窗已自动处理
4. **环境变量**：修改 `.env` 文件后需要重启开发服务器

---

## 常见问题

### Q: 如何禁用自动弹窗？

```typescript
await ayGet('/user/profile', {}, { hideErrorToast: true })
```

### Q: 如何自定义 header？

```typescript
await ayPost('/upload', formData, {}, {
  'Content-Type': 'multipart/form-data',
  'Custom-Header': 'value',
})
```

### Q: 分页查询如何处理空筛选？

```typescript
// 空数组会被后端忽略，相当于不筛选
filters: []
```

### Q: 如何切换回老的 HTTP 客户端？

```typescript
// 老的方式
import { http } from '@/http/http'
const data = await http.get('/user/profile')

// 新的方式
import { ayGet } from '@/http/ay_http'
const data = await ayGet('/user/profile')
```

---

## 下一步

1. 安装依赖：`pnpm install --ignore-scripts`（已完成）
2. 重启开发服务器
3. 查看示例：`src/api/ay_demo.ts`
4. 开始使用新的 API 系统

---

**生成时间**：2025-10-21
**版本**：v1.0.0
