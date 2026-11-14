# 第 3 步：传统商品文字搜索

日期：2026-09-23。范围仅为文字搜索、筛选、排序；未接入 AI、embedding 或图片搜索。

## 实现

搜索页通过 /api/products/search 调用 PostgreSQL 只读 RPC，读取数据库匹配结果。复用第 1 步商品列表、分类树、商品卡片、快速预览及第 2 步详情页。

支持商品名称、翻译名称/描述、slug、商品与规格 SKU、分类、description、材料、颜色、尺码、keywords。已有 schema 无 brand/model 独立字段，品牌及适配型号继续从商品名、分类、描述搜索，不重复建字段。

多个关键词均须匹配，顺序可不同；使用 PostgreSQL 英文词形处理（sole/soles、sheet/sheets）和文字子串匹配，数字用全文词项匹配，避免 42 误中 142。忽略英文 size/sizes 标签。精确 SKU、精确商品名和名称短语优先。无大模型或人工生成商品属性。

筛选：Category、Color、Size、Material、Availability。分类复用现有父子分类判断；其余筛选在数据库进行。颜色/尺码/库存必须同一 variant 同时满足，搜索词也在同一规格候选内匹配。

排序：相关性、最新、名称、价格升序/降序。价格依据筛选后规格的最低已知价格；缺价排最后，零价不当缺价，不同币种分组而不自行换算。仅排序比较，不计算订单金额。筛选后的卡片展示对应规格 SKU、价格与库存；详情链接仍显示完整商品。

URL 保存关键词、筛选与排序，支持刷新和后退恢复。搜索中隐藏旧结果，旧请求取消以避免覆盖新结果。失败显示 Retry，空结果独立提示。关键词限 200 字符，过长 URL 返回 400，服务端数据库请求限时 12 秒。

## 修改文件（相对第 2 步）

- src/components/storefront/Storefront.tsx：搜索请求、加载/失败/空结果、筛选、排序及匹配规格卡片。
- src/lib/types.ts：复用现有 products.size 的可选类型。
- src/lib/storefront.ts：公开商品投影加入 size。

## 新增文件

- src/components/storefront/SearchFilters.tsx
- src/lib/searchOptions.ts
- src/app/api/products/search/route.ts
- supabase/migrations/20260923064727_product_text_search.sql
- tests/productSearch.test.mjs
- tests/searchOptions.test.mts
- docs/step3-verification-2026-09-23.md
- docs/verification-step3/search-mobile.png
- docs/verification-step3/search-desktop.png

旧 ProductCatalog 和其 matchesSearch 保留原有行为；新底部 Search 与首页搜索入口使用新数据库搜索。

## 数据库变化

修改前复核 products、product_variants、categories、product_translations 字段和相关索引；未发现已有全文搜索索引或 keywords 字段。

migration 已应用到现有 Supabase 项目：

1. products.keywords text[] NOT NULL DEFAULT '{}'，不猜测或批量填充关键词。
2. product_variants_product_id_idx 关联索引。
3. search_storefront_products(text,text,text,text,text) 只读 STABLE、SECURITY INVOKER 函数，固定空 search_path，显式表路径，无动态 SQL。
4. RPC 仅授予 service_role 执行；anon/authenticated 不可直接执行，通过公开服务端搜索接口得到商品 ID 和相关性。

无删表、删列、删数据，无价格/库存/订单改写。关键词维护 UI 不在本步新增，后续可复用后台编辑流程接入此字段。

## 自动验证

- 隔离 PGlite 数据库先执行 migration，再验证四组用户示例词、词序/词形、精确 SKU、跨规格误匹配、数值尺码、草稿不可见、输入含 SQL/通配符、空查询、keywords、材料和匿名执行权限。
- 排序测试：缺价、零价、升/降序、相关性、不同币种、原数组不被修改。
- 全部 tests/*.test.mts 和 tests/*.test.mjs：33/33 通过。
- 最终 npm run build：通过（含 TypeScript 检查）。
- 最终 npm run lint：0 错误，2 个原有 HomePhotoWall img 警告。
- git diff --check：通过。

## 真实数据库 / HTTP 验证

| 查询 | 结果 |
| --- | --- |
| Loro Piana sole | 2 个 |
| Loro Piana sole + size=42 + in_stock | 2 个 |
| White 颜色筛选 | 20 个 |
| Rubber 材料筛选 | 2 个 |
| nonexistent-audit-product | 0 个 |
| SQL/通配符样式输入 | 0 个，无数据库异常 |
| URL 长度超过 2000 | HTTP 400 |

另外三个示例 white sneaker sole、black heel rubber、size 42 white outsole 在当前真实数据中均无完整匹配。隔离样本已验证搜索逻辑；真实商品字段/用词不足不会自动补全，不能据此虚报找到商品。清空条件读取到当前 136 个在售商品（实时数据会变化）。

权限查询确认 anon_execute=false、authenticated_execute=false、server_execute=true。

## 浏览器验证

生产构建，390×844 与 1440×1000：无横向溢出，筛选控件手指可点击，截图已保存并目视检查。

搜索 Loro Piana sole → 42 → In stock → Price high to low，结果为对应 42 码 SKU，USD 11.50 在 USD 9.50 前。清空条件恢复 136 项；浏览器后退恢复关键词、42 码、现货及降序，两项结果恢复。重新提交不存在词显示 No matching products，无卡片。浏览器 errors 为空。

未发送邮件、提交订单或触发付款。

## 复测命令

```sh
export PATH=/Users/chiwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
node --experimental-strip-types --test tests/*.test.mts tests/*.test.mjs
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

打开 /en/search?q=Loro+Piana+sole，选择 Size=42、Availability=In stock，再切换价格排序。测试清空、后退、空结果及详情链接。

## 限制和后续

- 当前沿用全目录加载与客户端分类/排序，数据库按需计算全文匹配；没有新增持久化 tsvector 或 GIN。当前 136 商品规模已实测，未来目录显著扩大应增加分页和专用搜索索引；现有 Supabase 默认返回上限仍需在扩大目录前处理。
- 商品词库没有语义同义词扩展，outsole/sole 等不同词不保证互通；AI 语义搜索属于第 4 步。
- 某些 size 字段本身混合颜色和规格，筛选按真实字段值展示，不擅自改写存量规格；字段规范化和信息补齐需要后台后续整理。
- 价格数据沿用页面加载的数据库快照，排序不代表锁价；最终订单继续由服务端读取数据库。
- 安全 Advisor 在迁移前后均存在原有告警，未发现新搜索函数相关告警：20 张表 RLS 无 policy、3 个旧函数 search_path 未固定、rls_auto_enable 对 anon/authenticated 可执行。未扩大本阶段范围修改这些旧权限，完整安全审查仍属第 15 步。参考 [RLS 无策略](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)、[函数 search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)、[匿名可执行 SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)。

实现前核对了 [Supabase RPC 官方文档](https://supabase.com/docs/reference/javascript/rpc) 与 changelog；沿用项目现有 SDK，无依赖升级。
