/**
 * 通用 API 工具
 * 提供分页查询等基础功能
 */

import type { GoPageModel } from '@ay-shared-core/types/api'
import type { PageQueryDTO, FilterSortOption } from '@ay-shared-core/utils/page_query'
import { ayPost } from '@/http/ay_http'

// 导出筛选器工具函数
export {
  createLikeFilter,
  createStringFilter,
  createNumberFilter,
  createStartsWithFilter,
  createEndsWithFilter,
  FILTER_OPERATORS,
  DEFAULT_SORT_OPTION,
} from '@ay-shared-core/utils/page_query'

/**
 * 通用分页查询方法
 * @param url API路径（会自动拼接 API_PATH）
 * @param queryParams 分页查询参数
 * @returns 分页数据
 */
export function getListPage<T>(
  url: string,
  queryParams?: Partial<PageQueryDTO>,
): Promise<GoPageModel<T>> {
  // 默认分页参数
  const defaultQuery: PageQueryDTO = {
    page: 1,
    page_size: 10,
    filters: [],
    sort_option: {
      sort_field: 'id',
      sort_order: 'desc',
    },
  }

  // 合并参数
  const finalQuery: PageQueryDTO = {
    ...defaultQuery,
    ...queryParams,
    sort_option: {
      ...defaultQuery.sort_option,
      ...(queryParams?.sort_option || {}),
    },
  }

  // 发起 POST 请求
  return ayPost<GoPageModel<T>>(url, finalQuery)
}
