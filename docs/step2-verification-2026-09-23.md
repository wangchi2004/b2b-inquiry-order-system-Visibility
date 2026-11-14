# 第 2 步：商品详情页与验证

完成日期：2026-09-23。仅实现第 2 步，未进入文字搜索、数据库购物车或支付阶段。

## 实现内容

- 新增 /[locale]/products/[slug] 独立详情页，复用现有 Header、底部导航与购物车。
- 展示数据库图片、名称、分类、规格 SKU、价格、库存状态、描述、材料、颜色、尺码和 MOQ。
- 图片缩略图、前后切换、触摸滑动、放大弹窗；规格选择同步 SKU、价格和状态。
- 数量加减和整数校验；缺价、缺货、未知库存状态或无规格禁止加车。
- 手机固定加车栏、桌面双栏布局；首页/搜索卡片链接详情页，保留 Quick view。
- 商品询问使用邮件撰写入口，携带当前规格信息。验证未发送邮件。
- 复用浏览器购物车及最近浏览记录。收藏按钮明确说明暂未开放，数据库收藏属于第 6 步。

## Schema 复核与数据库变化

数据库变化：无。未新增表、字段、migration，未修改权限或业务记录。

已读取 products、product_variants、product_images 的现有字段。现有 product_variants 已有 size、color、sku、price、unit、stock_status，直接复用，不新建 variants。
products 已有 moq、currency 及三张图片字段。当前商品 MOQ 为空时显示 Confirm with seller；输入下限 1 是数量校验，不冒充 MOQ。
当前 schema 没有重量或阶梯价格结构，不编造这些数据，也不显示硬编码阶梯价。

验证发现 product_images 对当前服务端角色返回 42501 permission denied。最小处理：附加图片独立查询，失败时继续使用 products.image_url / image_url_2 / image_url_3，避免整个详情页失效。该表在第 0 步审计时为空；未来若在该表保存图片，需要通过单独 migration 审核补齐权限。本阶段未修改权限。

## 修改文件（相对第 1 步）

- src/components/storefront/Storefront.tsx：详情链接、保留快速预览、共享最近浏览逻辑。
- src/components/storefront/ShopNavigation.tsx：商品详情对应 Search 导航状态。
- src/styles/globals.css：响应式加车栏。

## 新增文件

- src/app/[locale]/products/[slug]/page.tsx
- src/app/[locale]/products/[slug]/loading.tsx
- src/app/[locale]/products/[slug]/not-found.tsx
- src/components/storefront/ProductDetailView.tsx
- src/lib/productDetail.ts
- src/lib/productDetailSelection.ts
- src/lib/recentProducts.ts
- tests/productDetailSelection.test.mts
- docs/step2-verification-2026-09-23.md
- docs/verification-step2/detail-mobile.png
- docs/verification-step2/detail-selection-mobile.png
- docs/verification-step2/detail-desktop.png

未覆盖用户原有 next-env.d.ts、mobile/.claude/、mobile/CLAUDE.md 改动。前阶段文件仍在同一工作区，以上只列本阶段范围。

## 验证结果

- 单元测试：现有 26 项和新增 4 项，合计 30/30 通过。新增覆盖精确规格匹配、不可售状态、缺价/零价、MOQ、非法数量、合并数量上限、颜色回退。
- TypeScript：显式 tsc 检查通过；最终 npm run build 内 TypeScript 检查也通过。
- npm run build：成功。
- npm run lint：0 错误、2 个原有 HomePhotoWall img 警告。
- git diff --check：通过。
- 生产服务器浏览器：390×844、1440×1000 无横向溢出；桌面加车栏为 static。
- Loro Piana Summer Walk：3 张图片正常；切换第 2 张并打开/关闭放大弹窗。
- 选择 42 码、数量 2：保存 SKU LORO-PIANA-SUMMER-WALK-SOLES-42、quantity=2、数据库单价 9.50 到隔离浏览器购物车，最近浏览同步保存。
- 输入 0：aria-invalid=true，加车按钮禁用。
- Sheepskin shoe lining：切换 White 后 SKU 为 SHEEPSKIN-SHOE-LINING-2-WHITE，显示 USD 40.50；无价格规格显示 Ask for price 并禁用加车。
- 收藏弹窗清楚显示 coming soon，没有虚报保存成功。
- 不存在的 slug 显示 Product not available；查询失败与找不到商品分别处理。
- 浏览器 errors 输出为空。未提交真实订单、发送邮件、写数据库、上传图片或触发付款。

## 复测方法

使用可用 Node 运行时（当前机器系统 Node 有动态库问题）：

```sh
export PATH=/Users/chiwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
node --experimental-strip-types --test tests/mobileOrders.test.mjs tests/mobileCart.test.mjs tests/variantDimensionImage.test.mjs tests/productDetailSelection.test.mts
npx tsc --noEmit
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3100
```

打开 /en/products/loro-piana-summer-walk-soles，按上述规格、数量、图片路径复测；打开 /en/products/sheepskin-shoe-lining 验证颜色和缺价状态。

## 限制与后续

购物车继续使用原有 localStorage，价格是本次读取的数据库显示值，已有服务端下单流程仍需重新查价；本阶段没有实现第 6 步的数据库购物车及实时价格刷新。详情页不是库存预留或报价确认。
收藏、客户登录、阶梯价数据维护、统一货币引擎按后续阶段处理。未增加 AI 功能。缺失页 Browse products 当前回到英文搜索页。
