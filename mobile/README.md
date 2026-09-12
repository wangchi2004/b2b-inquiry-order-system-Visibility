# 客户订货 App（开发版）

Expo / React Native 原生客户端，共用现有 Next.js 网站服务和 Supabase 产品数据库。
临时名称为 Repair Supply。当前仅提供英文，所有价格为 USD。现有网站的多语言功能不受影响。

## 已完成

- 产品分类、名称/SKU 搜索、图片和规格选择。
- 购物车数量、金额、设备持久化；登录后合并访客购物车。
- 邮箱验证码登录，原生设备使用 SecureStore 保存会话。
- 客户配送资料、本人 App 订单、报价确认、物流查询、按当前价格再次购买。
- 服务端统一核价、价格快照、事务写入、重复请求去重。
- 后台订单详情新增发布报价、备货、发货、完成、取消操作。
- 邮件地址不作为历史订单授权依据；旧网站订单不会自动出现在 App 中。

## 本地预览（不需要数据库）

```sh
cd mobile
npm ci
npm run web
```

不配置环境变量时显示明确标记的示例商品，允许测试购物车和英文页面，禁用真实下单。
预览商品和品牌为演示内容，不会写入线上数据库。

## 接入测试环境

1. 在独立的 Supabase 测试项目执行现有 schema 和现有项目需要的 SQL 补丁，特别是 `order_quote_fields.sql`、客户配送字段等。
2. 审查并执行 `supabase/migrations/20260909232335_customer_mobile_orders.sql`。迁移增加 App 资料/订单归属/状态记录和服务端专用事务函数，并撤销匿名及普通登录角色对客户/订单表的直接访问。**不要在没有备份、权限审查与回归验证的情况下直接用于生产。**
3. Next.js 测试服务配置该项目的 URL、公开 key、服务端 key，运行 `npm run dev`。手机端只能配置公开 key。
4. Supabase Auth 启用 Email 登录，并将 Magic Link 邮件模板正文改为展示 `{{ .Token }}`，让用户直接在 App 输入验证码。配置用于真实客户的 SMTP 发件服务。
5. 复制 `.env.example` 为 `.env.local`，填写测试服务地址、Supabase URL 和公开 key。真机访问开发电脑时使用局域网 IP，不要使用 localhost；生产必须使用 HTTPS。
6. `npm start` 后在匹配 SDK 的 Expo Go 或开发构建中打开。Web 模式主要用于离线界面预览，跨域连接真实 API 需另外配置严格的允许来源和 OPTIONS 响应。

## 验证

仓库根目录：

```sh
npm run test:mobile
npm run build
```

mobile 目录：

```sh
npm run typecheck
npx expo export --platform ios --platform android
npm run export:preview
```

数据库测试使用隔离的 PGlite PostgreSQL 引擎，不访问生产。覆盖权限拒绝、价格快照、失效价格回滚、重复请求、未验证身份、报价确认与状态流转。
原生 JS 导出成功不等于已完成 Xcode/Gradle 编译或真机测试。

## 2026-09-12 接入进度

- 已备份正式数据库并在本地恢复演练，两份迁移均已执行到正式项目 `lehktqynqqufmvddxcnq`。
- 本地 App 环境已配置 `https://www.wangchi2004.com`；公开 key 与网站使用同一项目，私密环境文件不提交。
- 网页预览允许 `http://localhost:8087` 与 `http://127.0.0.1:8087`，其他预览域名通过网站 `MOBILE_WEB_ORIGINS` 配置（逗号分隔）。原生 App 不需要浏览器跨域设置。
- 正式接口发布及真实邮件测试结果见本次部署记录；SMTP、邮件收件和真机流程仍需验证。

## 上线前仍需完成

- 在真实测试项目验证邮件验证码登录、下单和后台处理全过程；两份正式迁移已完成，尚未向客户发送测试邮件。
- 确认正式 App 名称、图标、客服联系方式、隐私政策、账号删除流程与历史数据保留规则。
- 当前 App 新订单显示于后台；报价/物流信息通过打开订单页或刷新获取，尚未接入主动推送和 App 订单邮件通知。
- 订单列表当前显示最近 100 笔；大客户分页与自动刷新可继续扩展。
- 现有后台仍使用共享 URL 密码，正式客户推广前应升级正式管理员登录。旧网站订单接口尚未改为事务与请求去重；App 接口已实现。
- 使用韩国、日本、欧美真实设备与网络测试。保留现有前台国家限制策略，App API 不经过该页面限制。
- 配置 Apple/Google 开发者账户、唯一 bundle/package ID、EAS project ID 与签名证书，再使用 `eas.json` 生成安装包并提交审核。当前未创建开发者账户、未签名、未上架。

## 接口

- `GET /api/mobile/products?locale=en` — 公开产品目录。
- `GET/PUT /api/mobile/profile` — 当前客户收货资料。
- `GET/POST /api/mobile/orders` — 当前客户订单/提交订单。
- `POST /api/mobile/orders/confirm` — 使用报价版本号确认当前客户的报价。

除产品外均要求 `Authorization: Bearer <access_token>`。提交订单同时要求稳定的 `Idempotency-Key`；遇到超时重用原 key 和原请求，直到结果确定。返回 `PRICE_CHANGED` 时更新购物车后重新确认提交。

## 型号尺寸图

商品仍保留最多三张通用图片。每个规格（SKU / 尺码 / 颜色组合）另有一张可选尺寸图，字段 `product_variants.dimension_image_url`。例如 41 型号可单独上传标注真实尺寸的照片/图纸；没有上传时不显示，不能用通用商品图冒充尺寸图。

先执行 `supabase/migrations/20260910001328_variant_dimension_image.sql`，再在后台产品规格的 SKU 下上传。新规格先保存，再上传尺寸图。支持 JPG/PNG/WebP，最大 8 MB，保留原始分辨率。上传替换只影响该规格，原三张商品图片不变。App 可点开大图并放大、滚动查看；屏幕显示并非实物等比例。真实尺寸必须来自你提供的图片标注。

移除/替换尺寸图保留旧存储对象，避免影响仍在加载的页面；后续可统一清理未引用图片。此迁移已应用至生产，未上传任何真实尺寸图片。
