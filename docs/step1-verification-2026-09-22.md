# 第 1 步：手机端整体 UI 框架与验证记录

日期：2026-09-22。仅完成第 1 步；未开始独立商品详情页、数据库搜索、AI 搜索、数据库购物车或支付开发。

## 本步完成内容

- 根首页及四语首页增加白底、黑灰文字、蓝色操作强调的手机优先商品界面。保留原有询盘入口、联系信息、语言选择、照片墙和韩语业务说明。
- 增加 Home / Search / Cart / Orders / Account 固定底部导航，适配 safe-area；Cart 数量复用原有本地询盘车事件。
- 首页提供 Search products、相机按钮、Search by Text / Search by Image 两个入口；图片搜索只说明尚未开放，不上传图片，不调用 AI。
- 七个首页分类映射到已有数据库分类，复用分类树匹配，不建分类记录。没有商品图的分类显示普通占位图标。
- Popular Products 按最近最多 1000 条询盘明细的数量汇总排序；服务器只传商品 ID 排名，不传客户或订单明细。New Products 使用已有 created_at 排序；Recently Viewed 只保存实际打开的商品 ID 到本机 localStorage。
- 商品卡片使用真实图片、名称、规格 SKU、数据库价格和库存状态；统一正方形图片。价格不明显示 Ask for price，规格不足显示 Check availability，不生成假库存。
- 商品预览复用原 ProductCard 的图片/规格选择和本地询盘车，尚不是第 2 步的独立详情页。
- 收藏按钮显示未来功能说明，不伪造收藏成功。Orders/Account 是本阶段可访问的框架页，有明确说明及现有询盘入口，不显示虚构账户或订单。
- Search 页复用原 contains 匹配和分类树；页面加载后在已有数据内过滤，URL 可分享，浏览器前后退可恢复。数据库搜索、全文索引和高级过滤保留到第 3 步。
- 增加搜索加载状态。首页改为动态读取数据库，避免 build 时价格长期固定在首页 HTML。
- 修正复用卡片里硬编码 MOQ=1 的展示，改读已存在 moq 字段，缺值提示确认；价格展示复用已有规则并按已有 currency 格式化。没有更改数据库或订单金额算法。
- 修复原有 lint 的内部链接问题和遗漏虚拟环境排除配置，同时将不存在的 /en/samples 等入口修正为已有 /samples。

## 修改的现有文件

| 文件 | 变化 |
|---|---|
| `src/app/page.tsx` | 根首页接入新界面，保留旧询盘内容，动态读取真实商品 |
| `src/app/[locale]/page.tsx` | 四语首页接入相同框架，保留原多语言业务内容 |
| `src/app/[locale]/layout.tsx` | 客户区底部导航和底部安全间距 |
| `src/components/ProductCard.tsx` | 复用价格摘要；读取现有 MOQ/currency，去除虚构 MOQ=1 |
| `src/components/ProductCatalog.tsx` | 原文字匹配逻辑提取为共享函数，旧页面行为保留 |
| `src/lib/types.ts` | 补充线上已存在 moq/currency 的可空 TypeScript 类型 |
| `src/styles/globals.css` | 底部导航、dialog、焦点、safe-area 和触摸尺寸；新样式按类名限定 |
| `src/app/sample-catalog/page.tsx` | 内部链接使用 Link，修正样本页面路径 |
| `eslint.config.mjs` | 忽略 Python 虚拟环境，排除非项目 JS 解析错误 |

`next-env.d.ts` 在本步开始前已经有修改；未把已有修改归入本步业务改动。mobile/.claude 和 mobile/CLAUDE.md 同样保留原状。

## 新增文件

- `src/components/storefront/ShopIcon.tsx`：轻量 SVG 图标。
- `src/components/storefront/ShopNavigation.tsx`：顶部标识、底部导航、购物车数量。
- `src/components/storefront/Storefront.tsx`：首页、卡片、基础搜索、分类和说明/商品预览弹窗。
- `src/lib/storefront.ts`：复用商品读取，服务端计算询盘商品排名，只向浏览器传公共字段。
- `src/lib/storefrontCategories.ts`：首页显示名称与现有分类映射。
- `src/lib/productSearch.ts`：从原 ProductCatalog 提取的文字匹配函数。
- `src/app/[locale]/search/page.tsx`：文字搜索入口页。
- `src/app/[locale]/search/loading.tsx`：初次加载提示。
- `src/app/[locale]/orders/page.tsx`：订单框架/联系入口。
- `src/app/[locale]/account/page.tsx`：账户框架/原询盘入口/语言入口。
- `docs/step1-verification-2026-09-22.md`：本记录。
- `docs/verification-step1/home-mobile.png`：390×844 首页截图。
- `docs/verification-step1/home-desktop.png`：1440×1000 首页截图。
- `docs/verification-step1/search-mobile.png`：390×844 搜索截图。

## 数据库变化

**无。** 没有建表、改字段、执行 migration、写测试订单、扣库存、发送邮件或操作支付。查询现有分类/商品/规格/询盘明细，只用查询结果展示；浏览器验证加车只改变隔离验证浏览器的 localStorage。

## 已执行验证

| 项目 | 结果和范围 |
|---|---|
| 主站 TypeScript | `tsc --noEmit --incremental false` 通过；最终 build 中 TypeScript 再次通过 |
| lint | 通过退出码 0：0 errors、2 个既有 HomePhotoWall img 优化 warnings |
| build | Next.js 16.2.7 生产构建通过；49 个静态页面生成完成，新动态路由正常列出 |
| 原有测试 | Node 测试 26/26 通过，覆盖原购物车、订单 SQL、分类等；未用测试替代浏览器检查 |
| 390px 首页 | 真实商品/分类/搜索入口显示；底部 fixed；document scrollWidth=390，无横向溢出 |
| 1440px 桌面 | 内容居中、多列排列；scrollWidth=1440，无横向溢出，截图已检查 |
| 搜索框 | 输入 Loro，返回 2 个实际商品 |
| 分类 | 搜索页点击 Rubber Sheets，URL 和标题更新，返回 2 个实际商品 |
| 浏览器返回 | 从 Rubber Sheets 后退，恢复 q=Loro 和 2 个商品 |
| 商品卡片 | 打开真实 Loro Piana 商品，复用原规格表；预览宽 366px，390px 屏幕不溢出 |
| 触摸规格按钮 | 最终生产构建中 Increase 42 宽 44px；样式设置高 44px |
| 原购物车衔接 | 选择 42 码、数量 1 后加入原本地询盘车；导航数量更新，/en/cart 显示真实商品/尺码/数量；未提交订单 |
| 最近浏览 | 实际打开商品后 Recently Viewed 出现该商品；仅存商品 ID，展示仍使用本次数据库读取的商品信息 |
| Orders / Account | 导航可访问对应页面；明确标注未来能力，没有虚构登录/报价/付款状态 |
| 图片搜索 | 相机入口弹窗说明 Photo search is coming soon；关闭正常；不请求 AI 或上传 |
| 浏览器错误 | 最终生产构建的 agent-browser errors 未返回脚本错误；首页及搜索未发现框架错误覆盖层 |
| 图片 | 最终页面检查 broken images=0；仍有 lazy 图片按需加载，不代表检查了全站所有图片 |
| diff 格式 | git diff --check 通过 |

开发阶段发现旧 Turbopack 缓存未加载新增自定义 CSS，导致导航暂时不固定；已将生成缓存移到 /tmp 后重启，并使用生产构建复测 fixed 样式。没有改动业务数据。

## 测试方法

本机默认 Homebrew Node 缺失动态库，继续用第 0 步已找到的现成 Node 运行时；没有升级项目依赖。

```sh
export PATH="/Users/chiwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
npm run lint
node node_modules/typescript/bin/tsc --noEmit --incremental false
node --experimental-strip-types --test tests/*.test.mjs tests/*.test.mts
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

浏览器打开 `http://127.0.0.1:3100/en`，切换 390×844 与 1440×1000：检查底部导航、七类入口、三组商品区；搜索 Loro，点击 Rubber Sheets，再后退；打开商品、增减规格数量、加到询盘车；检查 Orders、Account 和相机入口。验证不要点击 Submit Inquiry，避免写入生产订单或发邮件。

## 尚未完成 / 限制

- 收藏持久化、账户密码登录、客户订单列表、多地址、AI 图片搜索没有在本步实现；这是后续步骤范围，入口已明确说明。
- 原有询盘车仍为 localStorage，不应误认为第 6 步数据库购物车已完成。
- 本步复用原商品预览，不代表第 2 步完整商品详情验收。
- 首次进入动态页面时远程数据/图片加载出现过等待超过 25 秒的情况，自动化导航曾超时后才完成；静态 Orders 页面请求正常，独立 Supabase 只读探测约 1.8 秒。本阶段尚未完成该首访延迟的全面根因定位或生产性能验收。页内文字/分类切换已避免重复读取整份远程数据，验证完成。
- 新框架导航及提示依照需求使用英文；已有四语商品/旧业务内容保留，新文案全量四语翻译未在本步扩展。
- 没有部署 Vercel，本地可预览；没有验证 PayPal、线上账户权限或其他后续步骤能力。

下一步：第 2 步，在保留 products/product_variants 和现有预览基础上建立独立商品详情页；开始前再次核对线上字段，不重建数据库。
