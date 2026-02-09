# TRON MCP Server 项目报告

## 项目概述

- 项目名称：TRON MCP Server（面向 AI Agent 的 TRON 链上操作服务）
- 目标能力：账户信息与交易查询、TRC20 资产查询、网络状态、区块信息、交易确认状态、USDT 余额、人机协同的未签名交易构建与 TronLink 签名广播、安全风险评估与增强分析
- 通信形态：MCP 标准（stdio 与 Streamable HTTP）+ REST HTTP 接口
- 技术栈：TypeScript、Node.js、Express、axios、zod、@modelcontextprotocol/sdk

## 目录结构

- 核心源文件
  - [index.ts](file:///d:/tron-trackC-mcp-server/src/index.ts) 项目入口，加载环境配置并启动服务器
  - [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts) Express 服务、MCP HTTP 传输、API 路由、签名页面
  - [tronTools.ts](file:///d:/tron-trackC-mcp-server/src/tronTools.ts) MCP 工具聚合、扩展工具与资源
  - [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts) TRONGrid API 适配层
  - [tronscanApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronscanApiService.ts) TRONSCAN 标签与统计适配层（含缓存）
  - [types.ts](file:///d:/tron-trackC-mcp-server/src/types.ts) 类型定义（TronConfig、AccountInfo、Transaction、Trc20Balance、NetworkStatus 等）
  - MCP 类型： [mcp/types.ts](file:///d:/tron-trackC-mcp-server/src/mcp/types.ts)
- 说明与测试
  - [README.md](file:///d:/tron-trackC-mcp-server/README.md) 项目说明与用法
  - [DEVELOPMENT.md](file:///d:/tron-trackC-mcp-server/DEVELOPMENT.md) 开发指南与集成示例
  - [test-api.js](file:///d:/tron-trackC-mcp-server/test-api.js)、[test-setup.js](file:///d:/tron-trackC-mcp-server/test-setup.js)

## 运行与配置

- 环境变量（示例）：TRON_API_KEY、TRON_NETWORK、TRON_BASE_URL、PORT、TRONLINK_SIGN_HOST、TRONSCAN_BASE_URL、TRONSCAN_CACHE_TTL_MS
- 启动命令
  - 开发：`npm run dev`
  - 生产：`npm run build` → `npm start`
  - MCP stdio：`npm run stdio`
- 入口与配置加载
  - [index.ts](file:///d:/tron-trackC-mcp-server/src/index.ts#L1-L19) 从 .env 注入配置，打印关键参数并启动服务
  - [stdio.ts](file:///d:/tron-trackC-mcp-server/src/stdio.ts#L19-L32) 以 stdio 方式连接 MCP Server

## MCP 工具集

- 账户与资产
  - get_account_info、get_account_transactions、get_account_tokens、get_token_info
- 网络与区块
  - get_network_status、get_block_info、get_latest_block、get_fee_parameters
- 交易与确认
  - get_transaction_confirmation_status、get_usdt_balance
  - build_unsigned_trx_transfer、build_unsigned_trc20_transfer（内置风险预检及本地签名页 URL）
- 安全与分析
  - get_address_labels、assess_address_risk、assess_transfer_risk
  - analyze_account_activity（资产概览、交易样本、TRX 流量统计、Top 对手方、TRONSCAN 标签整合）
- 注册与暴露
  - 统一在 [registerMcpTools](file:///d:/tron-trackC-mcp-server/src/tronTools.ts#L793-L1238) 中注册，HTTP 传输由 [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L82-L107) 处理

## HTTP API 路由

- 信息与查询
  - POST /api/account-info → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L709-L717)
  - POST /api/account-transactions → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L719-L727)
  - POST /api/account-tokens → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L729-L741)
  - POST /api/token-info → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L743-L751)
  - GET /api/network-status → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L753-L760)
  - POST /api/block-info → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L762-L770)
  - GET /api/latest-block → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L772-L779)
  - GET /api/fee-parameters → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L781-L788)
- 交易与确认
  - POST /api/transaction-confirmation → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L790-L798)
  - POST /api/usdt-balance → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L800-L808)
  - POST /api/build-unsigned-trx-transfer → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L810-L823)
  - POST /api/build-unsigned-trc20-transfer → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L825-L840)
- 安全与增强
  - POST /api/analyze-account-activity → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L842-L857)
  - POST /api/address-labels → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L859-L868)
  - POST /api/address-risk → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L870-L878)
  - POST /api/transfer-risk → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L880-L892)
- 健康与工具概览
  - GET /health → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L685-L691)
  - GET /api-tools → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L692-L703)
  - MCP HTTP：/mcp（POST/GET/DELETE）→ [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L705-L707)

## 交易构建与签名流程

- 未签名交易生成
  - TRX：`build_unsigned_trx_transfer` → `/wallet/createtransaction` → 返回 `unsignedTransaction` + `tronlinkSignUrl`
  - TRC20：`build_unsigned_trc20_transfer` → `/wallet/triggersmartcontract` → 返回 `unsignedTransaction` + `tronlinkSignUrl`
- 风险预检
  - 内部调用 `assess_transfer_risk`，命中 high 风险则返回 `blocked`，需要 `force=true` 才继续
- 签名与广播
  - 打开 [签名页 /tronlink-sign](file:///d:/tron-trackC-mcp-server/src/server.ts#L160-L173)，页面自动拉取并填充交易，触发 TronLink 弹窗
- 确认状态查询
  - 广播得到 `txid` 后，调用 `get_transaction_confirmation_status` → 计算确认数与区块信息（见 [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts#L367-L417)）

## 类型与数据模型

- TronConfig 与默认值 → [types.ts](file:///d:/tron-trackC-mcp-server/src/types.ts#L1-L11)
- AccountInfo / Transaction / Trc20Balance / Trc20HolderBalance → [types.ts](file:///d:/tron-trackC-mcp-server/src/types.ts#L13-L52)
- NetworkStatus（含能量与带宽统计）→ [types.ts:L54-L61](file:///d:/tron-trackC-mcp-server/src/types.ts#L54-L61)
  - network status 生成逻辑：latest events → stats → `feeStat.energyUsage/netUsage` → [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts#L162-L177)

## 工具与校验

- 地址校验与转换
  - Base58Check、T 前缀校验、21字节 hex 转换 → [utils/tron.ts](file:///d:/tron-trackC-mcp-server/src/utils/tron.ts#L96-L121)
- 单位换算
  - `trxToSun`/`sunToTrx`、decimal BigInt 格式化 → [utils/tron.ts](file:///d:/tron-trackC-mcp-server/src/utils/tron.ts#L163-L171)
- ABI 参数编码
  - `address`/`uint256` 编码（用于智能合约触发）→ [utils/tron.ts](file:///d:/tron-trackC-mcp-server/src/utils/tron.ts#L173-L184)

## 错误处理与健壮性

- axios 统一错误格式化（含 429 限流提示与 Retry-After）→ [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts#L41-L57)
- 输入校验
  - MCP 工具 zod schema、工具内 `assertTronBase58Address`/`assertTxId`
- 边界与兼容
  - TRONGrid 各网络返回 shape 差异的归一化处理（TRC20 余额）→ [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts#L95-L147)
- CORS 与 MCP HTTP 头暴露、来源白名单 → [server.ts](file:///d:/tron-trackC-mcp-server/src/server.ts#L45-L73)

## 安全与风控

- 地址标签查询与风险等级评估（关键词与 `accountType` 启发式）→ [tronTools.ts](file:///d:/tron-trackC-mcp-server/src/tronTools.ts#L396-L493)
- 转账前多目标风险预检（from/to/+contract）→ [tronTools.ts](file:///d:/tron-trackC-mcp-server/src/tronTools.ts#L495-L573)
- USDT 主网/测试网合约选择与提示 → [tronApiService.ts](file:///d:/tron-trackC-mcp-server/src/tronApiService.ts#L419-L469)

## 增强分析

- `analyze_account_activity` 聚合
  - 资产、交易样本、TRX 流入/流出/净值、Top 对手方、TRONSCAN 标签与 next steps → [tronTools.ts](file:///d:/tron-trackC-mcp-server/src/tronTools.ts#L575-L768)

## 测试与示例

- 一键 API 测试脚本 → [test-api.js](file:///d:/tron-trackC-mcp-server/test-api.js)
- 项目环境与脚本检查 → [test-setup.js](file:///d:/tron-trackC-mcp-server/test-setup.js)
- curl/axios 调用示例见 [README.md](file:///d:/tron-trackC-mcp-server/README.md)

## 关键点总结

- 双通道暴露：MCP（stdio/HTTP）+ REST API，方便 AI 代理与外部系统集成
- 风险预检贯穿交易链路，默认阻断高风险生成，需显式 `force` 才能继续
- 适配 TRONGrid/TRONSCAN 的数据 shape 与网络差异，增强实用性与健壮性
- 本地签名页（`/tronlink-sign`）缩短交互距离，避免长 URL 截断问题
- 类型与工具函数完善，便于扩展新工具与新能力

