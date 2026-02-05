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
- `/api-tools` - 查看所有可用工具的文档
- `/health` - 健康检查

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
pnpm install
```

### 4. 启动开发服务器
```bash
pnpm run dev
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

### 网络配置
项目支持以下TRON网络：
- `mainnet`: 主网 (https://api.trongrid.io)
- `testnet`: 测试网 (https://api.shasta.trongrid.io)  
- `nile`: Nile测试网 (https://nile.trongrid.io)

### 构建部署
```bash
# 构建生产版本
pnpm run build

# 启动生产服务器
pnpm start
```

## 使用示例

### 作为MCP服务端
服务端已启用MCP Streamable HTTP传输，MCP客户端可连接到：
`http://localhost:3000/mcp`

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
