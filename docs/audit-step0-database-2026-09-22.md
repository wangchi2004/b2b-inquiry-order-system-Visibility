# 第 0 步：线上数据库结构附录

审计日期：2026-09-22。来源：与本地环境配置匹配的 Supabase 项目 shoe-repair-b2b，public schema，只读查询。不是本地 schema.sql 的推测。共 26 张表，均已启用 RLS；启用 RLS 不等于所有权限配置均安全。下列包含全部字段、主键、出站外键和入站关系，不包含业务记录或密钥。表统计接口的 rows 是估计值，精确计数见主报告。

## public.categories

用途：树形商品分类。

主键：`id`。

外键：`parent_id` → `public.categories(id)`。

被引用关系：`public.products(category_id)`；`public.categories(parent_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 否 |  |
| slug | text | 否 | unique |
| description | text | 是 |  |
| created_at | timestamptz | 是 | now() |
| parent_id | uuid | 是 |  |
| sort_order | int4 | 否 | 0 |
| status | text | 否 | 'active'::text; status = ANY (ARRAY['active'::text, 'inactive'::text]) |
| updated_at | timestamptz | 否 | now() |

## public.products

用途：商品主档。

主键：`id`。

外键：`category_id` → `public.categories(id)`。

被引用关系：`public.sole_favorites(product_id)`；`public.email_template_products(product_id)`；`public.sample_clicks(product_id)`；`public.product_translations(product_id)`；`public.order_items(product_id)`；`public.product_variants(product_id)`；`public.inquiries(product_id)`；`public.product_images(product_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| category_id | uuid | 是 |  |
| name | text | 否 |  |
| slug | text | 否 | unique |
| sku | text | 是 |  |
| description | text | 是 |  |
| material | text | 是 |  |
| color | text | 是 |  |
| size | text | 是 |  |
| moq | int4 | 是 |  |
| price | numeric | 是 |  |
| currency | text | 是 | 'USD'::text |
| status | text | 是 | 'active'::text |
| created_at | timestamptz | 是 | now() |
| image_url | text | 是 |  |
| category | text | 是 |  |
| updated_at | timestamptz | 是 | now() |
| image_url_2 | text | 是 |  |
| image_url_3 | text | 是 |  |

## public.product_images

用途：商品图片关系表；目前为空，主站尚未使用。

主键：`id`。

外键：`product_id` → `public.products(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| product_id | uuid | 是 |  |
| image_url | text | 否 |  |
| sort_order | int4 | 是 | 0 |
| created_at | timestamptz | 是 | now() |

## public.contacts

用途：联系人线索；当前主站未接入。

主键：`id`。

外键：无。

被引用关系：`public.inquiries(contact_id)`；`public.deals(contact_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 是 |  |
| email | text | 是 |  |
| company | text | 是 |  |
| country | text | 是 |  |
| city | text | 是 |  |
| whatsapp | text | 是 |  |
| instagram | text | 是 |  |
| lead_score | int4 | 是 | 0 |
| created_at | timestamptz | 是 | now() |

## public.inquiries

用途：单商品询盘；当前主站实际询盘写入 orders。

主键：`id`。

外键：`product_id` → `public.products(id)`；`contact_id` → `public.contacts(id)`。

被引用关系：`public.deals(inquiry_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| product_id | uuid | 是 |  |
| contact_id | uuid | 是 |  |
| quantity | int4 | 是 |  |
| message | text | 是 |  |
| status | text | 是 | 'new'::text |
| created_at | timestamptz | 是 | now() |

## public.deals

用途：联系人商机跟进。

主键：`id`。

外键：`inquiry_id` → `public.inquiries(id)`；`contact_id` → `public.contacts(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| contact_id | uuid | 是 |  |
| inquiry_id | uuid | 是 |  |
| stage | text | 是 | 'new'::text |
| follow_up_date | date | 是 |  |
| created_at | timestamptz | 是 | now() |

## public.product_variants

用途：可购买规格，当前 SKU、价格和库存状态来源。

主键：`id`。

外键：`product_id` → `public.products(id)`。

被引用关系：`public.order_items(variant_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| product_id | uuid | 否 |  |
| sku | text | 否 | unique |
| size | text | 是 |  |
| color | text | 是 |  |
| unit | text | 否 | 'piece'::text |
| price | numeric | 是 |  |
| stock_status | text | 否 | 'in_stock'::text |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |
| dimension_image_url | text | 是 |  |

## public.customers

用途：主站客户与 CRM、默认收货资料。

主键：`id`。

外键：无。

被引用关系：`public.email_send_logs(customer_id)`；`public.order_links(customer_id)`；`public.orders(customer_id)`；`public.customer_tags(customer_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 否 |  |
| email | text | 否 | unique |
| country | text | 是 |  |
| whatsapp | text | 是 |  |
| company | text | 是 |  |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |
| shipping_recipient_name | text | 是 |  |
| shipping_phone | text | 是 |  |
| shipping_country | text | 是 |  |
| shipping_address | text | 是 |  |
| shipping_note | text | 是 |  |
| phone | text | 是 |  |
| customer_note | text | 是 |  |
| instagram | text | 是 |  |
| website | text | 是 |  |
| shop_name | text | 是 |  |
| city | text | 是 |  |
| business_type | text | 是 |  |
| source | text | 是 |  |
| source_url | text | 是 |  |
| status | text | 否 | 'prospecting'::text |
| stage | text | 是 |  |
| score | int4 | 否 | 0 |
| owner | text | 是 |  |
| last_contacted_at | date | 是 |  |
| email_valid | bool | 否 | true |
| unsubscribed | bool | 否 | false |

## public.order_links

用途：客户专属订货链接。

主键：`id`。

外键：`customer_id` → `public.customers(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| customer_id | uuid | 否 |  |
| token | text | 否 | unique |
| status | text | 否 | 'active'::text |
| expires_at | timestamptz | 是 |  |
| created_at | timestamptz | 否 | now() |

## public.orders

用途：主站及 Expo 订单、报价和物流。

主键：`id`。

外键：`customer_id` → `public.customers(id)`；`mobile_user_id` → `auth.users(id)`。

被引用关系：`public.mobile_order_events(order_id)`；`public.order_items(order_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| customer_id | uuid | 是 |  |
| customer_email | text | 否 |  |
| country | text | 是 |  |
| whatsapp | text | 是 |  |
| note | text | 是 |  |
| status | text | 否 | 'new'::text |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |
| product_subtotal | numeric | 是 |  |
| shipping_fee | numeric | 是 |  |
| grand_total | numeric | 是 |  |
| paypal_fee | numeric | 是 |  |
| paypal_collection | numeric | 是 |  |
| paypal_fee_rate | numeric | 否 | 0.05 |
| shipping_recipient_name | text | 是 |  |
| shipping_phone | text | 是 |  |
| shipping_country | text | 是 |  |
| shipping_address | text | 是 |  |
| shipping_note | text | 是 |  |
| quote_updated_at | timestamptz | 是 |  |
| inquiry_image_url_1 | text | 是 |  |
| inquiry_image_url_2 | text | 是 |  |
| inquiry_image_url_3 | text | 是 |  |
| locale | text | 否 | 'en'::text |
| mobile_user_id | uuid | 是 |  |
| mobile_request_key | text | 是 |  |
| mobile_request_items | jsonb | 是 |  |
| shipping_carrier | text | 是 |  |
| tracking_number | text | 是 |  |

## public.order_items

用途：订单商品、规格及成交单价快照。

主键：`id`。

外键：`variant_id` → `public.product_variants(id)`；`order_id` → `public.orders(id)`；`product_id` → `public.products(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| order_id | uuid | 否 |  |
| product_id | uuid | 是 |  |
| variant_id | uuid | 是 |  |
| product_name | text | 否 |  |
| sku | text | 是 |  |
| size | text | 是 |  |
| color | text | 是 |  |
| quantity | int4 | 否 | quantity > 0 |
| unit | text | 是 |  |
| created_at | timestamptz | 否 | now() |
| unit_price | numeric | 是 |  |

## public.product_translations

用途：商品多语言文案。

主键：`id`。

外键：`product_id` → `public.products(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| product_id | uuid | 否 |  |
| locale | text | 否 |  |
| name | text | 否 |  |
| description | text | 是 |  |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |

## public.category_translations

用途：分类多语言名称；category_id 为文本，无数据库外键。

主键：`id`。

外键：无。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| category_id | text | 否 |  |
| locale | text | 否 |  |
| name | text | 否 |  |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |

## public.visitor_sessions

用途：按邮箱统计访客。

主键：`id`。

外键：无。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| email | text | 否 | unique |
| country | text | 是 |  |
| locale | text | 否 | 'en'::text |
| visit_count | int4 | 否 | 1 |
| first_seen_at | timestamptz | 否 | now() |
| last_seen_at | timestamptz | 否 | now() |

## public.sample_visitors

用途：样本页匿名访问统计。

主键：`id`。

外键：无。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| visitor_id | text | 否 | unique |
| locale | text | 否 | 'en'::text |
| page_path | text | 是 |  |
| visit_count | int4 | 否 | 1 |
| first_seen_at | timestamptz | 否 | now() |
| last_seen_at | timestamptz | 否 | now() |

## public.sample_clicks

用途：样本点击统计。

主键：`id`。

外键：`product_id` → `public.products(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| visitor_id | text | 否 |  |
| locale | text | 否 | 'en'::text |
| event_name | text | 否 |  |
| product_id | uuid | 是 |  |
| product_name | text | 是 |  |
| page_path | text | 是 |  |
| click_count | int4 | 否 | 1 |
| first_clicked_at | timestamptz | 否 | now() |
| last_clicked_at | timestamptz | 否 | now() |

## public.customer_tags

用途：客户标签。

主键：`id`。

外键：`customer_id` → `public.customers(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| customer_id | uuid | 否 |  |
| tag | text | 否 |  |
| created_at | timestamptz | 否 | now() |

## public.suppression_list

用途：邮件禁发名单。

主键：`id`。

外键：无。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| email | text | 否 | unique |
| reason | text | 否 |  |
| created_at | timestamptz | 否 | now() |

## public.email_templates

用途：按国家选择的营销邮件模板。

主键：`id`。

外键：无。

被引用关系：`public.email_template_products(template_id)`；`public.email_send_logs(template_id)`。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| name | text | 否 |  |
| country_matches | _text | 否 | '{}'::text[] |
| locale | text | 否 | 'en'::text |
| subject | text | 否 |  |
| greeting | text | 否 |  |
| body | text | 否 |  |
| website_button_label | text | 否 | 'Visit Website'::text |
| closing | text | 否 | 'Best regards'::text |
| signature | text | 否 | 'Wang Chi'::text |
| is_default | bool | 否 | false |
| status | text | 否 | 'active'::text; status = ANY (ARRAY['active'::text, 'inactive'::text]) |
| created_at | timestamptz | 否 | now() |
| updated_at | timestamptz | 否 | now() |

## public.email_template_products

用途：邮件模板推荐商品。

主键：`id`。

外键：`template_id` → `public.email_templates(id)`；`product_id` → `public.products(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| template_id | uuid | 否 |  |
| product_id | uuid | 否 |  |
| sort_order | int4 | 否 | 0; sort_order >= 0 |
| created_at | timestamptz | 否 | now() |

## public.email_send_logs

用途：邮件发送记录及内容快照，部分承担 communications 功能。

主键：`id`。

外键：`template_id` → `public.email_templates(id)`；`customer_id` → `public.customers(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| customer_id | uuid | 是 |  |
| template_id | uuid | 是 |  |
| recipient_email | text | 否 |  |
| country | text | 是 |  |
| template_name | text | 否 |  |
| subject_snapshot | text | 否 |  |
| html_snapshot | text | 否 |  |
| text_snapshot | text | 否 |  |
| status | text | 否 | 'sending'::text; status = ANY (ARRAY['sending'::text, 'success'::text, 'failed'::text]) |
| provider_message_id | text | 是 |  |
| error_message | text | 是 |  |
| created_at | timestamptz | 否 | now() |
| sent_at | timestamptz | 是 |  |
| updated_at | timestamptz | 否 | now() |

## public.mobile_customer_profiles

用途：Expo 客户资料，关联 Supabase Auth。

主键：`user_id`。

外键：`user_id` → `auth.users(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| user_id | uuid | 否 |  |
| name | text | 否 |  |
| company | text | 否 | ''::text |
| country | text | 否 |  |
| phone | text | 否 | ''::text |
| address | text | 否 |  |

## public.mobile_order_events

用途：主站 App 订单状态历史。

主键：`id`。

外键：`order_id` → `public.orders(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| order_id | uuid | 否 |  |
| status | text | 否 |  |
| created_at | timestamptz | 否 | now() |

## public.sole_profiles

用途：另一套 Auth 客户资料；当前仓库未找到调用。

主键：`user_id`。

外键：`user_id` → `auth.users(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| user_id | uuid | 否 |  |
| name | text | 否 | ''::text |
| company | text | 否 | ''::text |
| phone | text | 否 | ''::text |
| country | text | 否 | ''::text |
| address | text | 否 | ''::text |

## public.sole_favorites

用途：已有收藏表；当前仓库未找到调用。

主键：`user_id, product_id`。

外键：`product_id` → `public.products(id)`；`user_id` → `auth.users(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| user_id | uuid | 否 |  |
| product_id | uuid | 否 |  |

## public.sole_orders

用途：另一套 JSON 明细订单；已有数据库校验触发器，当前仓库未找到调用。

主键：`id`。

外键：`user_id` → `auth.users(id)`。

被引用关系：该表元数据未列出入站外键。

| 字段 | 类型 | 可空 | 默认值 / 约束 |
|---|---|---|---|
| id | uuid | 否 | gen_random_uuid() |
| user_id | uuid | 否 |  |
| request_key | uuid | 否 |  |
| customer_email | text | 否 | ''::text |
| items | jsonb | 否 |  |
| shipping_address | jsonb | 否 |  |
| status | text | 否 | 'Shipping Quote Pending'::text; status = ANY (ARRAY['Submitted'::text, 'Shipping Quote Pending'::text, 'Payment Pending'::text, 'Paid'::text, 'Preparing'::text, 'Shipped'::text, 'Completed'::text, 'Cancelled'::text]) |
| subtotal | numeric | 否 | 0 |
| shipping | numeric | 否 | 0; shipping >= 0::numeric |
| discount | numeric | 否 | 0; discount >= 0::numeric |
| paypal_fee | numeric | 否 | 0; paypal_fee >= 0::numeric |
| total | numeric | 否 | 0; total >= 0::numeric |
| note | text | 否 | ''::text |
| payment_url | text | 否 | ''::text |
| carrier | text | 否 | ''::text |
| tracking | text | 否 | ''::text |
| events | jsonb | 否 | '[]'::jsonb |
| revision | int4 | 否 | 1 |
| created_at | timestamptz | 否 | now() |


