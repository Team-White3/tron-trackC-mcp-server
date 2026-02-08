# 开发指南

## 快速启动

### 1. 环境准备
- Node.js 18+ 
- npm 或 yarn
- 一个有效的TRON API密钥（可从 https://www.trongrid.io 免费获取）

### 2. 配置过程

1. 复制环境变量文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，添加你的TRON API密钥：
```env
TRON_API_KEY=your_actual_api_key_here
TRON_NETWORK=mainnet
TRON_BASE_URL=https://api.trongrid.io
PORT=3000
TRONLINK_SIGN_HOST=127.0.0.1
# 可选：TRONSCAN API（用于地址标签/风险提示）
# mainnet: https://apilist.tronscan.org
# nile:    https://nileapi.tronscan.org
TRONSCAN_BASE_URL=https://nileapi.tronscan.org
TRONSCAN_CACHE_TTL_MS=60000
```

3. 安装项目依赖：
```bash
npm install
```

4. 启动开发服务器：
```bash
npm run dev
```

### 3. Claude Desktop（MCP stdio）集成

Claude Desktop 目前通过 **stdio** 启动 MCP Server。请使用 `src/stdio.ts` 作为入口。

macOS 配置文件路径：
- `~/Library/Application Support/Claude/claude_desktop_config.json`

示例（替换路径与 API Key）：

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
        "TRON_BASE_URL": "https://nile.trongrid.io",
        "TRONLINK_SIGN_HOST": "127.0.0.1",
        "TRONSCAN_BASE_URL": "https://nileapi.tronscan.org",
        "TRONSCAN_CACHE_TTL_MS": "60000"
      }
    }
  }
}
```

### 4. AI 交易助手（TronLink 签名）演示

本项目提供未签名交易构建工具（例如 `build_unsigned_trx_transfer`）+ 浏览器签名页（`/tronlink-sign`），可演示闭环：

1. 保持 `npm run dev` 运行（用于提供 `http://localhost:3000/tronlink-sign`）
2. （推荐安全前置）在 Claude Desktop 中先调用 `assess_transfer_risk` 对 from/to（以及 TRC20 的 contract）做风险预检，并把风险提示展示给用户确认
3. 调用 `build_unsigned_trx_transfer`（或 `build_unsigned_trc20_transfer`），拿到 `tronlinkSignUrl`  
   > `build_unsigned_*` 工具内部也会做一次风险预检；若命中高风险会默认阻止生成，需传 `force=true` 才能继续
4. 浏览器打开 `tronlinkSignUrl`，TronLink 弹窗确认签名并广播
5. 拿到 `txid` 后调用 `get_transaction_confirmation_status` 查询确认状态

### 5. 复杂查询增强 & 链上安全监测（可选扩展）

新增 MCP Tools：
- `analyze_account_activity`：聚合账户资产+最近交易+TRX 流入/流出统计+Top 对手方，并尽可能补充 TRONSCAN 统计/标签
- `get_address_labels`：查询 TRONSCAN 地址标签（测试网可能不完整）
- `assess_address_risk`：评估单地址风险（TRONSCAN 标签 + 启发式规则）
- `assess_transfer_risk`：转账前对 from/to/合约地址做风险预检（建议在 build_unsigned_* 前调用）

HTTP API 对应测试：
- `POST /api/analyze-account-activity`
- `POST /api/address-labels`
- `POST /api/address-risk`
- `POST /api/transfer-risk`

## 项目架构

### 核心文件说明

| 文件/目录 | 功能 |
|---------|------|
| `src/index.ts` | 项目入口，处理配置和服务器启动 |
| `src/server.ts` | Express服务器和MCP服务端实现 |
| `src/tronTools.ts` | MCP工具和资源的封装 |
| `src/tronApiService.ts` | TRON API服务层，直接调用TRONGrid |
| `src/tronscanApiService.ts` | TRONSCAN API服务层（标签/统计，用于风险提示与增强分析） |
| `src/mcp/types.ts` | MCP协议的类型定义和实现 |
| `src/types.ts` | TRON API相关的TypeScript类型 |

### 数据流

```
请求 -> Express路由 -> TronMCPServer -> MCP工具 -> TronApiService -> TRONGrid API -> 返回响应
```

## 开发流程

### 添加新功能

1. 在 `src/types.ts` 中定义新的类型
2. 在 `src/tronApiService.ts` 中实现API调用
3. 在 `src/tronTools.ts` 中创建新的MCP工具
4. 在 `src/server.ts` 中添加对应的API路由

### 示例：添加新工具

假设我们要添加一个查询合约信息的工具：

1. 在 `src/types.ts` 中添加类型定义：
```typescript
export interface ContractInfo {
  address: string;
  name: string;
  symbol: string;
  abi: any;
  bytecode: string;
}
```

2. 在 `src/tronApiService.ts` 中添加API方法：
```typescript
async getContractInfo(address: string): Promise<ContractInfo> {
  const response = await axios.get(`${this.config.baseUrl}/v1/contracts/${address}`, {
    headers: { 'TRON-PRO-API-KEY': this.config.apiKey }
  });
  return response.data;
}
```

3. 在 `src/tronTools.ts` 中创建工具：
```typescript
getContractInfoTool(): MCPTool {
  return {
    name: 'get_contract_info',
    description: '获取TRON智能合约的详细信息',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '合约地址' }
      },
      required: ['address']
    },
    async execute(input: any) {
      return this.apiService.getContractInfo(input.address);
    }
  };
}
```

4. 更新 `getAllTools()` 方法，添加新工具：
```typescript
getAllTools(): MCPTool[] {
  return [
    // 现有工具...
    this.getContractInfoTool()
  ];
}
```

5. 在 `src/server.ts` 中添加API路由：
```typescript
this.app.post('/api/contract-info', async (req, res) => {
  try {
    const { address } = req.body;
    const result = await this.tronTools.getContractInfoTool().execute({ address });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
```

## 测试

### 运行测试脚本

项目提供了两个测试脚本：

1. `test-api.js` - 测试API功能
2. `test-setup.js` - 验证项目配置

运行测试：
```bash
node test-api.js
```

### 手动测试API

使用curl命令测试API：
```bash
curl -X POST http://localhost:3000/api/account-info \
  -H "Content-Type: application/json" \
  -d '{"address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}'
```

## 常见问题

### 1. API密钥无效

- 确保你的TRON API密钥是有效的
- 检查API密钥是否已正确添加到 `.env` 文件
- 验证TRONGrid官网是否正常访问

### 2. 网络连接问题

- 检查你的网络连接
- 验证TRONGrid API服务是否可用
- 尝试切换到不同的网络（如testnet或nile）

### 3. CORS错误

- 服务器已配置CORS支持，但浏览器可能仍会阻止请求
- 在开发环境中，可以使用浏览器插件或代理服务器

### 4. 响应慢

- TRONGrid API响应时间取决于网络状况
- 可以考虑添加缓存机制来提高性能
- 限制请求频率以避免API限制

## 部署

### 开发部署

```bash
npm run dev
```

### 生产部署

```bash
# 1. 编译TypeScript
npm run build

# 2. 启动生产服务器
npm start
```

### Docker部署

可以创建Dockerfile：
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY .env .env
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## 性能优化

- 添加缓存机制（如Redis）
- 实现API限流
- 使用CDN加速
- 启用压缩中间件
- 优化数据库查询

## 安全注意事项

- 不要在代码中硬编码API密钥
- 使用环境变量管理敏感信息
- 实现API访问控制
- 定期更新依赖包
- 使用HTTPS在生产环境

## 版本管理

项目使用语义化版本控制：
- 主版本号(MAJOR): 不兼容的API变更
- 次版本号(MINOR): 向后兼容的功能性新增
- 修订号(PATCH): 向后兼容的问题修正

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request
5. 代码审查
6. 合并到主分支

## 许可证

MIT License - 详见 LICENSE 文件
