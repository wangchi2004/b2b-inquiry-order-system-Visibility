# 第 4 步：AI 语义文字搜索（代码就绪，真实效果待验收）

日期：2026-09-23。

## 当前状态

实现与数据库 migration 已完成，自动测试、TypeScript、build、lint 和无密钥降级验证已通过。但 OPENAI_API_KEY 尚未配置，不能生成真实商品向量或验证自然语言搜索效果。本阶段尚未完成端到端验收，不进入图片搜索。

已向用户询问 embedding 服务偏好；当前适配器按 OpenAI text-embedding-3-small、1536 维实现。没有发送真实付费 embedding 请求，没有生成或保存模拟向量。136 个在售商品保持 pending，ready=0。

## 实现范围

- PostgreSQL pgvector，未引入 Pinecone。
- product_embeddings 关联现有 products，保存 embedding、embedding_model、updated_at，以及后台任务的 revision、status、attempts、next_attempt_at、lease_until、lease_token、last_error。
- 商品新增/文字属性修改，规格 SKU/颜色/尺码修改及翻译修改通过数据库触发器入队。价格和库存变化不触发向量重算；检索时仍使用数据库当前商品状态及规格筛选。
- 管理后台商品操作完成后，Next after 后台处理最多 5 个待处理商品；Vercel 每日 03:00 UTC 补偿任务处理最多 10 个。本地可用 npm run embeddings:backfill 做首次批量生成。
- 后台任务租约防止重复领取，revision + lease_token 防止旧任务覆盖新数据。生成失败退回 pending，指数退避；中断任务租约到期后可再领取。pending 向量不参与搜索。
- 向量输入只包含公开商品描述、分类、材料、颜色、尺码、关键词和 SKU；排除价格、成本、库存数量、MOQ、客户和订单资料，文本限制约 6000 UTF-8 字节。
- 用户查询生成 embedding → pgvector 余弦相似度 → 最多 20 个商品；传统关键词匹配优先、语义结果补充、按 product_id 去重。分类与规格筛选继续生效。
- 返回前仅合并数据库商品 ID 和排序分数，页面仍使用现有数据库商品卡片。AI 无法创建或修改 SKU、价格、库存或订单金额。
- 无密钥、无已生成索引或服务异常时保留传统结果；页面分别显示 Keyword search、索引准备中或语义服务暂不可用，不虚报 AI 成功。
- 查询向量使用有界进程缓存，进程内提供请求间隔限制。不是分布式限流，公开上线前需结合流量及服务预算完善额度控制。

## 修改文件（相对第 3 步）

- .env.example：仅新增空配置说明，未写入密钥。
- package.json / package-lock.json：固定版本测试依赖 @electric-sql/pglite-pgvector@0.0.9，增加 embeddings:backfill 命令。
- tsconfig.json：允许带 .ts 扩展名的导入，供 Next 与 Node 后台脚本复用；保留 noEmit。
- src/app/admin/products/actions.ts：原业务操作成功后安排后台任务；失败不影响商品保存。
- src/app/api/products/search/route.ts：传统匹配与语义匹配合并及状态返回。
- src/components/storefront/Storefront.tsx：显示实际搜索模式/降级状态。

## 新增文件

- supabase/migrations/20260923070230_product_semantic_search.sql
- src/lib/embeddings/core.ts
- src/lib/embeddings/provider.ts
- src/lib/embeddings/worker.ts
- src/lib/embeddings/search.ts
- src/app/api/cron/product-embeddings/route.ts
- scripts/product-embeddings.mts
- vercel.json
- tests/productEmbeddings.test.mjs
- tests/embeddingCore.test.mts
- tests/embeddingProvider.test.mts
- docs/step4-verification-2026-09-23.md
- docs/verification-step4/keyword-fallback-mobile.png

## 数据库变化

修改前读取现有 schema，确认无向量/任务表，vector 可用但未启用。通过 migration：

1. 启用 extensions.vector，线上验证版本 0.8.0。
2. 新建 product_embeddings，一商品一行，FK 到 products，删除商品时自动清理对应索引记录。
3. 启用 RLS；anon/authenticated 无表权限；仅 service_role 读写。
4. 新增 queue_product_embedding、claim_product_embeddings、match_product_embeddings 函数，均 SECURITY INVOKER、固定空 search_path，撤销公开执行权限。
5. 新增商品/规格/翻译变更触发器及 pending 队列索引。
6. 现有 136 个在售商品入队，无产品、价格、库存或订单数据改写。

当前小目录采用 pgvector 精确距离检索，未新增近似向量索引。后续目录增大再结合实测添加 HNSW。

## 已通过的验证

- 使用真实 pgvector 扩展的隔离 PGlite：migration、入队、租约互斥、商品修改使旧任务失效、向量距离检索、颜色筛选、价格变更不重算、规格/翻译变更使向量失效、匿名权限拒绝。
- 文本构造：不包含价格/库存等业务数字；向量维数、有限数值及非零验证。
- 混合结果：精确匹配优先、去重、低相似度过滤。
- provider 使用模拟 HTTP 响应：缺密钥、正常向量、错误模型、HTTP 429。模拟结果仅在测试进程中使用，未写入生产数据库。
- 全部 tests/*.test.mts 和 tests/*.test.mjs：37/37 通过。
- npx tsc --noEmit：通过。
- 最终 npm run build：通过，含 TypeScript。
- 最终 npm run lint：0 错误、2 个原有 HomePhotoWall img 警告。
- git diff --check：通过。
- 真实数据库 pgvector RPC 可调用；未建立索引时返回 0 项，未写入测试向量。
- HTTP 搜索 Loro Piana sole：200、2 项、semanticStatus=disabled，普通搜索正常。
- 后台任务端点缺 Authorization / 伪造 Bearer undefined：均 401。
- 本地 backfill 命令缺密钥时退出码 1、configured=false、processed=0，不伪装完成。
- 390px 浏览器显示 Keyword search 和真实结果，无横向溢出，errors 为空，截图已目视检查。

## 待完成的验收与配置

1. 在本地 .env.local 配置 OPENAI_API_KEY；不要通过聊天发送密钥。线上启用时还需在 Vercel 配置同名服务器变量。
2. 运行 npm run embeddings:backfill，确认现有商品变为 ready，失败任务可重试。
3. 重启应用，用 I need black rubber for repairing heels. 验证真实自然语言结果；基于实际商品标注评估 0.35 阈值，而不是把相似度当作正确率。
4. 修改一个获授权的测试商品，验证真实生成任务与更新后的检索结果。现阶段没有为测试修改真实商品。
5. 配置随机 CRON_SECRET 并部署后，验证定时任务。当前只写入 vercel.json，没有部署；本地服务器不会自动执行 Vercel cron。每日补偿一次只处理 10 项，首次索引必须使用 backfill；需要更及时的外部批量导入更新时再调整计划。

以上缺密钥部分不能通过模拟测试替代，当前不得宣称完整语义搜索已上线。

## 复测命令

```sh
export PATH=/Users/chiwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH
node --experimental-strip-types --test tests/*.test.mts tests/*.test.mjs
npx tsc --noEmit
npm run lint
npm run build
# 配置 OPENAI_API_KEY 后：
npm run embeddings:backfill
```

## 已知风险 / 上线前事项

- 安全 Advisor 新表提示 RLS 无 policy：本表有意仅服务端访问并撤销客户角色权限；未出现新函数 search_path / SECURITY DEFINER 告警。[说明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- npm audit 当前报告 8 个已有依赖漏洞（1 moderate、6 high、1 critical，其中 next 为 critical）；本次 lockfile 仅增加 pgvector 测试依赖，没有改变这些既有包。需单独评估修复后再上线，不在本步盲目升级整个项目。
- 混合搜索等待语义服务可能增加延迟；已限制上游请求时间并提供失败降级，真实延迟/命中质量仍待密钥验收。
- 不实施价格/库存 AI 推断，不实现第 5 步图片搜索。

参考：[OpenAI embeddings 文档](https://developers.openai.com/api/docs/guides/embeddings)、[Supabase vector columns](https://supabase.com/docs/guides/ai/vector-columns)。
