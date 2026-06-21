# B2B 外贸询盘订货系统

这是一个面向 B2B 外贸客户的询盘订货系统。客户通过专属链接进入订货页，浏览产品，选择型号、颜色、尺码和数量，加入询盘车，最后提交订单请求。系统不做在线支付，订单提交后会保存到 Supabase，并通过 Resend 给管理员和客户发送邮件。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase 数据库
- Resend 邮件服务
- Cloudflare R2 图片存储
- Vercel 部署兼容

## 已实现功能

- 客户专属订货页：`/order/[token]`
- 产品分类栏、关键词搜索、分类 + 搜索组合筛选
- 移动端分类折叠
- 产品图片预览、大图查看、大图翻页
- 产品多规格、多尺码数量选择
- localStorage 询盘车，无需客户登录
- 购物车按商品合并不同型号/尺码
- 购物车显示图片、数量、单价、合计、总合计
- 客户信息表单校验
- 订单提交接口：`POST /api/orders`
- Supabase 保存客户、专属链接、订单、订单明细
- Resend 发送管理员订单邮件和客户确认邮件
- 邮件发送失败不影响订单保存
- 后台订单列表和订单详情
- 后台产品管理、规格管理、上下架
- 后台产品图片上传到 Cloudflare R2
- 国家邮件模板管理、邮件预览、手动确认发送和发送记录
- 按客户国家自动匹配模板，没有匹配时回退默认英文模板
- 成功发送后 15 天防重复发送（测试邮箱除外）

## 安装依赖

```bash
npm install
```

## 环境变量

复制环境变量示例文件：

```bash
cp .env.example .env.local
```

需要配置：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ADMIN_ORDER_EMAIL=
ORDER_EMAIL_FROM=
ADMIN_PASSWORD=
ADMIN_ACCESS_KEY=
NEXT_PUBLIC_SITE_URL=
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=
CLOUDFLARE_R2_PUBLIC_BASE_URL=
```

变量说明：

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL，例如 `https://xxxxx.supabase.co`。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 前端匿名 key。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 服务端 key，只能在服务端使用，不能暴露到前端。
- `RESEND_API_KEY`：Resend 邮件 API key。
- `ADMIN_ORDER_EMAIL`：管理员接收订单邮件的邮箱。
- `ORDER_EMAIL_FROM`：Resend 已验证的发件人，例如 `B2B Inquiry Order <chi@chinashoerepairmaterials.com>`。
- `ADMIN_PASSWORD`：第一版后台简单密码。
- `ADMIN_ACCESS_KEY`：可选，前台国家拦截的白名单参数。配置后可用 `?allow=YOUR_KEY` 临时放行。
- `NEXT_PUBLIC_SITE_URL`：网站正式访问地址，例如 `https://your-domain.com`。
- `CLOUDFLARE_R2_ACCOUNT_ID`：Cloudflare 账户 ID。
- `CLOUDFLARE_R2_ACCESS_KEY_ID`：R2 API Token 的 Access Key ID。
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`：R2 API Token 的 Secret Access Key。
- `CLOUDFLARE_R2_BUCKET_NAME`：R2 存储桶名称，例如 `shoe-repair-images`。
- `CLOUDFLARE_R2_PUBLIC_BASE_URL`：图片公开访问域名，例如 `https://images.your-domain.com`。

## 配置 Supabase

1. 创建 Supabase 项目。
2. 打开 Supabase SQL Editor。
3. 执行数据库表结构：

```sql
-- supabase/schema.sql
```

4. 插入测试产品数据：

```sql
-- supabase/seed.sql
```

5. 如果你的数据库是早期版本，没有副图字段，执行：

```sql
-- supabase/product_images.sql
```

6. 启用国家邮件模板、主推产品和发送记录，执行：

```sql
-- supabase/email_campaign_templates.sql
```

7. 把 Supabase URL、anon key、service role key 填入 `.env.local`。

主要数据表：

- `products`：产品表
- `product_variants`：产品规格表
- `customers`：客户表
- `order_links`：客户专属链接表
- `orders`：订单主表
- `order_items`：订单明细表
- `email_templates`：按国家匹配的邮件模板
- `email_template_products`：每个模板选择的 1–6 个主推产品
- `email_send_logs`：邮件发送状态、Resend ID 和内容快照

第一版为了 MVP 跑通，没有做复杂 RLS。前台读取产品数据，服务端接口和后台页面使用 `SUPABASE_SERVICE_ROLE_KEY` 写入数据。

## 配置 Resend 邮件

1. 创建或打开 Resend 账号。
2. 添加并验证你的发件域名。
3. 创建 API Key。
4. 配置：

```env
RESEND_API_KEY=你的 Resend API Key
ADMIN_ORDER_EMAIL=你的管理员邮箱
ORDER_EMAIL_FROM=B2B Inquiry Order <你的已验证发件邮箱>
```

邮件行为：

- 管理员收到：`New B2B Inquiry Order`
- 客户收到：`We received your order request`
- 如果邮件发送失败，订单仍然会保存，接口会返回 `warning`。
- 后台国家邮件模板页使用同一 Resend 配置手动发送开发邮件。
- 后台发送前会显示收件邮箱和模板名称进行二次确认。
- 同一邮箱成功发送后 15 天内不能重复发送；失败发送不进入冷却期。
- `wangchi.2004@gmail.com` 是唯一的冷却期测试例外。

## 配置 Cloudflare R2 图片存储

1. 创建或打开 R2 存储桶，例如：

```text
shoe-repair-images
```

2. 创建 R2 API Token，权限需要允许对该存储桶上传对象。
3. 给 R2 存储桶绑定一个公开访问域名，例如：

```text
https://images.your-domain.com
```

4. 配置环境变量：

```env
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=shoe-repair-images
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://images.your-domain.com
```

注意：

- `CLOUDFLARE_R2_PUBLIC_BASE_URL` 应该是公开图片访问域名。
- 不要填 S3 API endpoint。
- S3 API endpoint 是给程序上传用的，不适合直接作为前台图片地址。

后台产品页：

```text
/admin/products?password=YOUR_ADMIN_PASSWORD
```

上传图片后，系统会自动写入：

- 主图 -> `image_url`
- 副图1 -> `image_url_2`
- 副图2 -> `image_url_3`

## 本地运行

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

常用页面：

- 客户订货页：`http://localhost:3000/order/sample-buyer-token`
- 询盘车：`http://localhost:3000/cart`
- 后台订单：`http://localhost:3000/admin/orders?password=YOUR_ADMIN_PASSWORD`
- 后台产品：`http://localhost:3000/admin/products?password=YOUR_ADMIN_PASSWORD`
- 国家邮件模板与发送：`http://localhost:3000/admin/email-template?password=YOUR_ADMIN_PASSWORD`

## 检查和构建

```bash
npm run lint
npm run build
```

## 部署到 Vercel

1. 把项目推送到 GitHub。
2. 在 Vercel 导入该 GitHub 仓库。
3. 在 Vercel Project Settings 里添加所有环境变量。
4. `NEXT_PUBLIC_SITE_URL` 填正式域名。
5. 点击部署。

部署后建议测试：

- `/order/sample-buyer-token`
- `/cart`
- `/admin/orders?password=YOUR_ADMIN_PASSWORD`
- `/admin/products?password=YOUR_ADMIN_PASSWORD`
- 提交一笔测试订单
- 管理员邮件是否收到
- 客户确认邮件是否收到
- 产品图片是否能正常显示

## 目录结构

```text
src/
  app/
    admin/
      email-template/
      orders/
      products/
    api/orders/
    cart/
    order/[token]/
    success/
  components/
  lib/
  styles/
supabase/
  schema.sql
  seed.sql
  product_images.sql
```

## 重要说明

仓库里仍保留了一些早期 PHP/MySQL 原型文件。当前 Next.js 系统不依赖这些文件，后续可以统一归档或删除。

## 后续可优化

- 后台改成正式登录系统，不再用 URL password。
- 增加后台订单状态修改。
- 增加客户管理和专属链接重新生成。
- 增加产品分页，适合大量 SKU。
- 分类做成独立数据表，可后台维护。
- 图片增加删除、替换和压缩。
- 增加自动化测试。
- 增加更严格的 Supabase RLS 权限规则。
