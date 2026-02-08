# TRON MCP Server - AI Agent 链上操作服务

一个基于TRON网络的MCP（Model Context Protocol）服务端原型，为AI Agent提供TRON链上数据查询和交易构建能力。

## 题目
### 任务C: 构建基于TRON网络的MCP服务端，赋能AIAgent链上操作能力
![Problem Screenshot](problem.png)


## 项目概述

该项目是一个符合MCP标准的服务端，封装了TRON网络的核心功能，让AI Agent能够：
- 实时获取TRON账户信息（余额、资源、历史记录等）
- 查询TRC20/TRC721代币信息
- 获取TRON网络状态和区块信息
- 构建可由用户确认的TRON交易

## 技术架构

### 核心依赖
- **Express**: Web服务器框架
- **Axios**: HTTP请求库
- **dotenv**: 环境变量管理
- **MCP Server/Node/Express**: MCP服务端与Streamable HTTP传输
- **Zod**: MCP输入校验
- **TRONGrid API**: TRON网络数据接口
- **TypeScript**: 类型安全的开发语言

### 项目结构
```
src/
├── index.ts          # 项目入口文件
├── server.ts         # Express服务器和MCP服务端
├── tronTools.ts      # MCP工具和资源实现
├── tronApiService.ts # TRON API服务层
├── mcp/
│   └── types.ts      # MCP协议类型定义
└── types.ts          # TypeScript类型定义
```

## 功能特性

### MCP工具（Tools）

#### 1. 账户信息查询
- **工具名称**: `get_account_info`
- **功能**: 获取TRON账户的详细信息，包括余额、带宽、能量等资源
- **参数**: `address` (TRON账户地址)

#### 2. 账户交易历史
- **工具名称**: `get_account_transactions`
- **功能**: 获取TRON账户的交易历史记录
- **参数**: `address`, `limit` (数量限制，默认50条)

#### 3. 账户代币信息
- **工具名称**: `get_account_tokens`
- **功能**: 获取TRON账户持有的代币信息
- **参数**: `address`

#### 4. 代币详情查询
- **工具名称**: `get_token_info`
- **功能**: 获取TRC20/TRC721代币的详细信息
- **参数**: `tokenAddress` (代币合约地址)

#### 5. 网络状态查询
- **工具名称**: `get_network_status`
- **功能**: 获取TRON网络的状态信息
- **参数**: 无

#### 6. 区块信息查询
- **工具名称**: `get_block_info`
- **功能**: 获取TRON区块链指定区块的详细信息
- **参数**: `blockNumber`

### API接口

除了MCP接口外，还提供了HTTP API接口：
- `/api/account-info` - 获取账户信息
- `/api/account-transactions` - 获取账户交易历史
- `/api/account-tokens` - 获取账户代币信息
- `/api/token-info` - 获取代币详情
- `/api/network-status` - 获取网络状态
- `/api/block-info` - 获取区块信息
- `/api/fee-parameters` - 获取链参数/费率参数（Energy Fee、Transaction Fee 等）
- `/api/transaction-confirmation` - 查询交易确认状态（txid -> confirmed/confirmations）
- `/api/usdt-balance` - 查询指定地址的 USDT 余额（raw + human readable）
- `/api/build-unsigned-trx-transfer` - 构建 TRX 未签名转账交易（用于 TronLink 签名）
- `/api/build-unsigned-trc20-transfer` - 构建 TRC20 未签名转账交易（用于 TronLink 签名）
- `/api-tools` - 查看所有可用工具的文档
- `/health` - 健康检查
- `/tronlink-sign` - TronLink 签名/广播演示页面（配合未签名交易工具）

## 快速开始

### 1. 获取TRON API密钥

1. 访问 [TRONGrid官网](https://www.trongrid.io)
2. 注册账户或登录
3. 进入 Dashboard
4. 创建新的API Key或使用已有的API Key
5. 记住你的API Key

### 2. 配置API密钥

将`.env.example`复制为`.env`：
```bash
cp .env.example .env
```

编辑`.env`文件：
```env
TRON_API_KEY=YOUR_TRON_API_KEY_HERE
TRON_NETWORK=mainnet
TRON_BASE_URL=https://api.trongrid.io
PORT=3000
```

### 3. 安装依赖
```bash
# 推荐：使用 npm
npm install

# 或者使用 pnpm
# pnpm install
```

### 4. 启动开发服务器
```bash
# npm
npm run dev

# 或者 pnpm
# pnpm run dev
```

### 5. 访问API文档
- 主页: http://localhost:3000
- API工具文档: http://localhost:3000/api-tools
- 健康检查: http://localhost:3000/health

### 6. 测试API
可以使用curl或Postman测试API。例如，查询TRON官方账户信息：
```bash
curl -X POST http://localhost:3000/api/account-info \
  -H "Content-Type: application/json" \
  -d '{"address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}'
```

查询网络状态：
```bash
curl http://localhost:3000/api/network-status
```

## 开发指南

### 环境变量
- `TRON_API_KEY`: TRON API密钥
- `TRON_NETWORK`: 网络类型 (mainnet/testnet/nile)
- `TRON_BASE_URL`: API基础URL
- `PORT`: 服务器端口，默认3000
- `MCP_ALLOWED_ORIGINS`: 可选，逗号分隔的MCP允许来源
- `TRON_USDT_CONTRACT_ADDRESS`: 可选，自定义 USDT 合约地址（默认主网 USDT）
- `TRONLINK_SIGN_HOST`: 可选，TronLink 签名页 URL 的 host（默认 `127.0.0.1`；如果你希望显示为 `localhost` 可设置为 `localhost`）
- `TRONSCAN_BASE_URL`: 可选，TRONSCAN API Base URL（默认会根据 `TRON_NETWORK` 选择：mainnet=`https://apilist.tronscan.org`，nile=`https://nileapi.tronscan.org`）
- `TRONSCAN_CACHE_TTL_MS`: 可选，TRONSCAN 响应缓存时间（毫秒，默认 60000）

### 网络配置
项目支持以下TRON网络：
- `mainnet`: 主网 (https://api.trongrid.io)
- `testnet`: 测试网 (https://api.shasta.trongrid.io)  
- `nile`: Nile测试网 (https://nile.trongrid.io)

### 构建部署
```bash
# 构建生产版本
npm run build
# 或 pnpm run build

# 启动生产服务器
npm start
# 或 pnpm start
```

## 使用示例

### 作为 MCP 服务端（Claude Desktop 推荐：stdio）

Claude Desktop 的 MCP 连接方式是 **stdio**（通过本地命令启动进程），请使用 `src/stdio.ts`。

macOS 配置文件路径：
- `~/Library/Application Support/Claude/claude_desktop_config.json`

示例（把路径和 API Key 换成你自己的）：

```json
{
  "mcpServers": {
    "tron": {
      "command": "/bin/zsh",
      "args": [
        "-lc",
        "cd /Users/ke/Documents/tron-trackC-mcp-server && ./node_modules/.bin/tsx src/stdio.ts"
      ],
      "env": {
        "TRON_API_KEY": "YOUR_TRON_API_KEY_HERE",
        "TRON_NETWORK": "nile",
        "TRON_BASE_URL": "https://nile.trongrid.io"
      }
    }
  }
}
```

> 本项目也提供 HTTP `/mcp`（Streamable HTTP）端点，适合其他支持 HTTP transport 的 MCP 客户端；Claude Desktop 目前不支持直接通过 URL 连接 HTTP MCP。

### AI 交易助手 Demo（未签名交易 → TronLink 签名 → 上链确认）

1. 启动 HTTP 服务（用于提供 `/tronlink-sign` 页面）：

```bash
npm run dev
```

2. （推荐安全前置）让 Claude 先调用 Tool：`assess_transfer_risk` 对 `fromAddress/toAddress`（以及 TRC20 场景的 `contractAddress`）做风险预检。  
若命中高风险，先向用户展示风险提示并确认是否继续。

3. 在 Claude Desktop 对话中让 Claude 调用 Tool：`build_unsigned_trx_transfer`（或 `build_unsigned_trc20_transfer`）。  
Tool 会返回 `tronlinkSignUrl`，在浏览器打开后，TronLink 会弹窗让用户确认签名与广播。

> 说明：`build_unsigned_*` 工具内部也会执行一次风险预检；若命中高风险会默认阻止生成，需传 `force=true` 才能继续。

4. 广播完成得到 `txid` 后，再让 Claude 调用 `get_transaction_confirmation_status` 查询确认数与上链状态。

### 复杂查询增强 Demo（高级聚合/分析）

你可以让 Claude 调用 Tool：`analyze_account_activity`，它会聚合：
- TRX/TRC20 资产概览（含 USDT 余额）
- 最近交易样本（简化字段）
- TRX 转账流入/流出/净流量统计 + Top 对手方
- 尽可能补充 TRONSCAN 统计/标签字段（测试网标签可能不完整）

示例：

```bash
curl -X POST http://localhost:3000/api/analyze-account-activity \
  -H "Content-Type: application/json" \
  -d '{"address":"TEpj2zD2CLn1NGqrSzehkhcpAY1qy5xeUe","txLimit":20,"tokenLimit":20}'
```

### 链上安全监测 Demo（TRONSCAN 标签库 + 风险提示）

1) 查询地址标签（TRONSCAN）：

```bash
curl -X POST http://localhost:3000/api/address-labels \
  -H "Content-Type: application/json" \
  -d '{"address":"TEpj2zD2CLn1NGqrSzehkhcpAY1qy5xeUe"}'
```

2) 评估单个地址风险（返回 risk level/score/reasons/recommendations）：

```bash
curl -X POST http://localhost:3000/api/address-risk \
  -H "Content-Type: application/json" \
  -d '{"address":"TEpj2zD2CLn1NGqrSzehkhcpAY1qy5xeUe"}'
```

3) 转账前风险预检（建议在 build_unsigned_* 之前调用）：

```bash
curl -X POST http://localhost:3000/api/transfer-risk \
  -H "Content-Type: application/json" \
  -d '{"fromAddress":"TEpj2zD2CLn1NGqrSzehkhcpAY1qy5xeUe","toAddress":"TTAUuT3Mjwwp17FGZk2LyDQMwCu6opvfyq"}'
```

> 提示：TRONSCAN 测试网（Nile）标签库通常不完整。如果你想在主网看到更丰富的标签，可设置 `TRONSCAN_BASE_URL=https://apilist.tronscan.org`（并使用主网地址）。

### 作为HTTP API
可以直接使用HTTP接口：
```typescript
import axios from 'axios';

const response = await axios.post('http://localhost:3000/api/account-info', {
  address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
});
```

## 项目特点

1. **符合MCP标准**: 严格遵循Model Context Protocol规范
2. **模块化设计**: 清晰的架构分离，易于扩展和维护
3. **类型安全**: 完整的TypeScript类型定义
4. **错误处理**: 完善的错误处理和响应格式
5. **API文档**: 自动生成的工具文档
6. **跨域支持**: 支持CORS跨域请求
7. **环境变量**: 支持使用.env文件配置
8. **网络配置**: 支持主网、测试网、Nile测试网

## 扩展建议

### 添加新功能
1. 在 `types.ts` 中添加类型定义
2. 在 `tronApiService.ts` 中实现API调用
3. 在 `tronTools.ts` 中创建工具函数
4. 在 `server.ts` 中添加路由

### 交易构建功能
可以扩展支持：
- 转账TRX和TRC20代币
- 智能合约交互
- 交易签名和广播
- 交易状态查询

### 高级功能
- 添加WebSocket支持实时通知
- 集成缓存机制提高性能
- 添加API文档UI (Swagger/OpenAPI)
- 实现API限流和认证
- 添加JWT认证
- 集成数据库存储

## 注意事项

- 需要TRON API密钥才能正常使用，免费用户有请求次数限制
- API响应速度取决于TRONGrid的响应时间
- 建议在生产环境中添加适当的错误处理和日志记录
- 交易签名和广播功能需要额外的安全措施
- 在生产环境中，建议使用HTTPS
- 定期更新依赖包以保持安全性

## 许可证

MIT License
