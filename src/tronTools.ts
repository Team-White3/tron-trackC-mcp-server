import { MCPTool, MCPResource } from './mcp/types';
import { z } from 'zod';
import TronApiService from './tronApiService';
import { TronConfig } from './types';

class TronTools {
  private apiService: TronApiService;

  constructor(config: TronConfig) {
    this.apiService = new TronApiService(config);
  }

  getAccountInfoTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_account_info',
      description: '获取TRON账户的详细信息，包括余额、带宽、能量等资源',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'TRON账户地址',
          },
        },
        required: ['address'],
      },
      async execute(input: any) {
        return apiService.getAccountInfo(input.address);
      },
    };
  }

  getAccountTransactionsTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_account_transactions',
      description: '获取TRON账户的交易历史记录',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'TRON账户地址',
          },
          limit: {
            type: 'number',
            description: '返回的交易数量限制，默认50',
            minimum: 1,
            maximum: 200,
          },
        },
        required: ['address'],
      },
      async execute(input: any) {
        return apiService.getAccountTransactions(
          input.address,
          input.limit || 50
        );
      },
    };
  }

  getAccountTokensTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_account_tokens',
      description: '获取TRON账户的TRC20代币余额',
      inputSchema: {
        type: 'object',
        properties: {
          address: {
            type: 'string',
            description: 'TRON账户地址',
          },
          contractAddress: {
            type: 'string',
            description: '可选，TRC20合约地址，用于过滤单个代币',
          },
          limit: {
            type: 'number',
            description: '返回数量限制（可选）',
            minimum: 1,
            maximum: 200,
          },
        },
        required: ['address'],
      },
      async execute(input: any) {
        return apiService.getAccountTokens(
          input.address,
          input.limit,
          input.contractAddress
        );
      },
    };
  }

  getTokenInfoTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_token_info',
      description: '获取TRC20代币持有人余额列表',
      inputSchema: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'TRC20代币合约地址',
          },
        },
        required: ['tokenAddress'],
      },
      async execute(input: any) {
        return apiService.getTokenInfo(input.tokenAddress);
      },
    };
  }

  getNetworkStatusTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_network_status',
      description: '获取TRON网络的状态信息（基于最新区块事件和区块统计）',
      inputSchema: {},
      async execute() {
        return apiService.getNetworkStatus();
      },
    };
  }

  getBlockInfoTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_block_info',
      description: '获取TRON指定区块的统计信息',
      inputSchema: {
        type: 'object',
        properties: {
          blockNumber: {
            type: 'number',
            description: '区块号',
          },
        },
        required: ['blockNumber'],
      },
      async execute(input: any) {
        return apiService.getBlockInfo(input.blockNumber);
      },
    };
  }

  getLatestBlockTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_latest_block',
      description: '获取TRON最新区块事件信息',
      inputSchema: {},
      async execute() {
        return apiService.getLatestBlock();
      },
    };
  }

  getFeeParametersTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_fee_parameters',
      description: '获取TRON网络链参数/费率参数（如 Energy Fee、Transaction Fee 等）',
      inputSchema: {},
      async execute() {
        return apiService.getFeeParameters();
      },
    };
  }

  getTransactionConfirmationStatusTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_transaction_confirmation_status',
      description: '查询交易是否已上链确认、所在区块与确认数',
      inputSchema: {
        type: 'object',
        properties: {
          txid: { type: 'string', description: '交易ID（64位hex）' },
        },
        required: ['txid'],
      },
      async execute(input: any) {
        return apiService.getTransactionConfirmationStatus(input.txid);
      },
    };
  }

  getUsdtBalanceTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_usdt_balance',
      description: '查询指定地址的 USDT(TRC20) 余额（返回原始余额与人类可读余额）',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'TRON账户地址' },
          usdtContractAddress: {
            type: 'string',
            description: '可选，自定义USDT合约地址（默认主网USDT）',
          },
        },
        required: ['address'],
      },
      async execute(input: any) {
        return apiService.getUsdtBalance({
          address: input.address,
          usdtContractAddress: input.usdtContractAddress,
        });
      },
    };
  }

  buildUnsignedTrxTransferTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'build_unsigned_trx_transfer',
      description:
        '构建TRX转账未签名交易对象（用于 TronLink/本地签名器签名后广播）。不会接触私钥。',
      inputSchema: {
        type: 'object',
        properties: {
          fromAddress: { type: 'string', description: '发送者地址（需与TronLink当前账户一致）' },
          toAddress: { type: 'string', description: '接收者地址' },
          amountTrx: { type: 'string', description: '转账金额（单位 TRX，最多6位小数）' },
        },
        required: ['fromAddress', 'toAddress', 'amountTrx'],
      },
      async execute(input: any) {
        const result = await apiService.buildUnsignedTrxTransfer({
          fromAddress: input.fromAddress,
          toAddress: input.toAddress,
          amountTrx: input.amountTrx,
        });

        // Provide a ready-to-open local signing page URL (short form; avoids URL truncation)
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const qs = new URLSearchParams({
          type: 'trx',
          from: input.fromAddress,
          to: input.toAddress,
          amountTrx: input.amountTrx,
        });
        const host = process.env.TRONLINK_SIGN_HOST || '127.0.0.1';
        return {
          ...result,
          tronlinkSignUrl: `http://${host}:${port}/tronlink-sign?${qs.toString()}`,
          note:
            '请把 tronlinkSignUrl 原样提供给用户并让用户在浏览器打开；TronLink 弹窗确认签名/广播后，把 txid 发回，再用 get_transaction_confirmation_status 查询确认状态。',
        };
      },
    };
  }

  buildUnsignedTrc20TransferTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'build_unsigned_trc20_transfer',
      description:
        '构建TRC20转账未签名交易对象（transfer(address,uint256)），用于 TronLink/本地签名器签名后广播。amountRaw 为最小单位整数。',
      inputSchema: {
        type: 'object',
        properties: {
          fromAddress: { type: 'string', description: '发送者地址（需与TronLink当前账户一致）' },
          contractAddress: { type: 'string', description: 'TRC20合约地址' },
          toAddress: { type: 'string', description: '接收者地址' },
          amountRaw: { type: 'string', description: '转账数量（最小单位整数，例如 USDT 6位小数则 1 USDT = 1000000）' },
          feeLimitSun: { type: 'number', description: '可选，fee_limit（sun），默认 10000000（约10 TRX）' },
        },
        required: ['fromAddress', 'contractAddress', 'toAddress', 'amountRaw'],
      },
      async execute(input: any) {
        const result = await apiService.buildUnsignedTrc20Transfer({
          fromAddress: input.fromAddress,
          contractAddress: input.contractAddress,
          toAddress: input.toAddress,
          amountRaw: input.amountRaw,
          feeLimitSun: input.feeLimitSun,
        });
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const qs = new URLSearchParams({
          type: 'trc20',
          from: input.fromAddress,
          to: input.toAddress,
          contract: input.contractAddress,
          amountRaw: input.amountRaw,
          ...(input.feeLimitSun ? { feeLimitSun: String(input.feeLimitSun) } : {}),
        });
        const host = process.env.TRONLINK_SIGN_HOST || '127.0.0.1';
        return {
          ...result,
          tronlinkSignUrl: `http://${host}:${port}/tronlink-sign?${qs.toString()}`,
          note:
            '请把 tronlinkSignUrl 原样提供给用户并让用户在浏览器打开；TronLink 弹窗确认签名/广播后，把 txid 发回，再用 get_transaction_confirmation_status 查询确认状态。',
        };
      },
    };
  }

  getAllTools(): MCPTool[] {
    return [
      this.getAccountInfoTool(),
      this.getAccountTransactionsTool(),
      this.getAccountTokensTool(),
      this.getTokenInfoTool(),
      this.getNetworkStatusTool(),
      this.getBlockInfoTool(),
      this.getLatestBlockTool(),
      this.getFeeParametersTool(),
      this.getTransactionConfirmationStatusTool(),
      this.getUsdtBalanceTool(),
      this.buildUnsignedTrxTransferTool(),
      this.buildUnsignedTrc20TransferTool(),
    ];
  }

  // Claude Desktop uses stdio transport; we keep MCP server typing as `any`
  // to avoid pulling in heavy SDK type definitions during `tsc` builds.
  registerMcpTools(server: any) {
    server.registerTool(
      'get_account_info',
      {
        description: '获取TRON账户的详细信息，包括余额、带宽、能量等资源',
        inputSchema: z.object({
          address: z.string().describe('TRON账户地址'),
        }),
      },
      async ({ address }: { address: string }) => {
        const result = await this.apiService.getAccountInfo(address);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_account_transactions',
      {
        description: '获取TRON账户的交易历史记录',
        inputSchema: z.object({
          address: z.string(),
          limit: z.number().min(1).max(200).optional(),
        }),
      },
      async ({ address, limit }: { address: string; limit?: number }) => {
        const result = await this.apiService.getAccountTransactions(
          address,
          limit ?? 50
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_account_tokens',
      {
        description: '获取TRON账户的TRC20代币余额',
        inputSchema: z.object({
          address: z.string(),
          contractAddress: z.string().optional(),
          limit: z.number().min(1).max(200).optional(),
        }),
      },
      async ({
        address,
        limit,
        contractAddress,
      }: {
        address: string;
        limit?: number;
        contractAddress?: string;
      }) => {
        const result = await this.apiService.getAccountTokens(
          address,
          limit,
          contractAddress
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_token_info',
      {
        description: '获取TRC20代币持有人余额列表',
        inputSchema: z.object({
          tokenAddress: z.string(),
        }),
      },
      async ({ tokenAddress }: { tokenAddress: string }) => {
        const result = await this.apiService.getTokenInfo(tokenAddress);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_network_status',
      {
        description: '获取TRON网络的状态信息（基于最新区块事件和区块统计）',
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.apiService.getNetworkStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_block_info',
      {
        description: '获取TRON指定区块的统计信息',
        inputSchema: z.object({
          blockNumber: z.number(),
        }),
      },
      async ({ blockNumber }: { blockNumber: number }) => {
        const result = await this.apiService.getBlockInfo(blockNumber);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_latest_block',
      {
        description: '获取TRON最新区块事件信息',
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.apiService.getLatestBlock();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );

    server.registerTool(
      'get_fee_parameters',
      {
        description: '获取TRON网络链参数/费率参数（如 Energy Fee、Transaction Fee 等）',
        inputSchema: z.object({}),
      },
      async () => {
        const result = await this.apiService.getFeeParameters();
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'get_transaction_confirmation_status',
      {
        description: '查询交易是否已上链确认、所在区块与确认数',
        inputSchema: z.object({
          txid: z.string().describe('交易ID（64位hex）'),
        }),
      },
      async ({ txid }: { txid: string }) => {
        const result = await this.apiService.getTransactionConfirmationStatus(txid);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'get_usdt_balance',
      {
        description: '查询指定地址的 USDT(TRC20) 余额（返回原始余额与人类可读余额）',
        inputSchema: z.object({
          address: z.string().describe('TRON账户地址'),
          usdtContractAddress: z.string().optional(),
        }),
      },
      async ({
        address,
        usdtContractAddress,
      }: {
        address: string;
        usdtContractAddress?: string;
      }) => {
        const result = await this.apiService.getUsdtBalance({ address, usdtContractAddress });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'build_unsigned_trx_transfer',
      {
        description: '构建TRX转账未签名交易对象（用于 TronLink/本地签名器签名后广播）',
        inputSchema: z.object({
          fromAddress: z.string(),
          toAddress: z.string(),
          amountTrx: z.string(),
        }),
      },
      async ({
        fromAddress,
        toAddress,
        amountTrx,
      }: {
        fromAddress: string;
        toAddress: string;
        amountTrx: string;
      }) => {
        const result = await this.apiService.buildUnsignedTrxTransfer({
          fromAddress,
          toAddress,
          amountTrx,
        });

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const qs = new URLSearchParams({
          type: 'trx',
          from: fromAddress,
          to: toAddress,
          amountTrx,
        });
        const host = process.env.TRONLINK_SIGN_HOST || '127.0.0.1';
        const tronlinkSignUrl = `http://${host}:${port}/tronlink-sign?${qs.toString()}`;

        return {
          content: [
            {
              type: 'text',
              text:
                `tronlinkSignUrl: ${tronlinkSignUrl}\n\n` +
                `下一步：\n` +
                `1) 用浏览器打开上面的 tronlinkSignUrl（TronLink 会弹窗签名并广播）\n` +
                `2) 广播完成得到 txid 后，调用 MCP 工具 get_transaction_confirmation_status（参数 txid）确认交易。\n\n` +
                JSON.stringify({ ...result, tronlinkSignUrl }),
            },
          ],
        };
      }
    );

    server.registerTool(
      'build_unsigned_trc20_transfer',
      {
        description: '构建TRC20转账未签名交易对象（transfer(address,uint256)）',
        inputSchema: z.object({
          fromAddress: z.string(),
          contractAddress: z.string(),
          toAddress: z.string(),
          amountRaw: z.string(),
          feeLimitSun: z.number().optional(),
        }),
      },
      async ({
        fromAddress,
        contractAddress,
        toAddress,
        amountRaw,
        feeLimitSun,
      }: {
        fromAddress: string;
        contractAddress: string;
        toAddress: string;
        amountRaw: string;
        feeLimitSun?: number;
      }) => {
        const result = await this.apiService.buildUnsignedTrc20Transfer({
          fromAddress,
          contractAddress,
          toAddress,
          amountRaw,
          feeLimitSun,
        });

        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        const qs = new URLSearchParams({
          type: 'trc20',
          from: fromAddress,
          to: toAddress,
          contract: contractAddress,
          amountRaw,
          ...(feeLimitSun ? { feeLimitSun: String(feeLimitSun) } : {}),
        });
        const host = process.env.TRONLINK_SIGN_HOST || '127.0.0.1';
        const tronlinkSignUrl = `http://${host}:${port}/tronlink-sign?${qs.toString()}`;

        return {
          content: [
            {
              type: 'text',
              text:
                `tronlinkSignUrl: ${tronlinkSignUrl}\n\n` +
                `下一步：\n` +
                `1) 用浏览器打开上面的 tronlinkSignUrl（TronLink 会弹窗签名并广播）\n` +
                `2) 广播完成得到 txid 后，调用 MCP 工具 get_transaction_confirmation_status（参数 txid）确认交易。\n\n` +
                JSON.stringify({ ...result, tronlinkSignUrl }),
            },
          ],
        };
      }
    );
  }
}

class TronResources {
  private apiService: TronApiService;

  constructor(config: TronConfig) {
    this.apiService = new TronApiService(config);
  }

  getAccountResource(address: string): MCPResource {
    const apiService = this.apiService;
    return {
      name: 'account_info',
      description: 'TRON账户信息',
      async data() {
        return apiService.getAccountInfo(address);
      },
    };
  }

  getNetworkResource(): MCPResource {
    const apiService = this.apiService;
    return {
      name: 'network_status',
      description: 'TRON网络状态',
      async data() {
        return apiService.getNetworkStatus();
      },
    };
  }

  getLatestBlockResource(): MCPResource {
    const apiService = this.apiService;
    return {
      name: 'latest_block',
      description: '最新区块信息',
      async data() {
        return apiService.getLatestBlock();
      },
    };
  }
}

export { TronTools, TronResources };
