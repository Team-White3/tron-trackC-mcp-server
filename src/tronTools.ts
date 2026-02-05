import { MCPTool, MCPResource } from './mcp/types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
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

  getAllTools(): MCPTool[] {
    return [
      this.getAccountInfoTool(),
      this.getAccountTransactionsTool(),
      this.getAccountTokensTool(),
      this.getTokenInfoTool(),
      this.getNetworkStatusTool(),
      this.getBlockInfoTool(),
      this.getLatestBlockTool(),
    ];
  }

  registerMcpTools(server: McpServer) {
    server.registerTool(
      'get_account_info',
      {
        description: '获取TRON账户的详细信息，包括余额、带宽、能量等资源',
        inputSchema: z.object({
          address: z.string().describe('TRON账户地址'),
        }),
      },
      async ({ address }): Promise<CallToolResult> => {
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
      async ({ address, limit }): Promise<CallToolResult> => {
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
      async ({ address, limit, contractAddress }): Promise<CallToolResult> => {
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
      async ({ tokenAddress }): Promise<CallToolResult> => {
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
      async (): Promise<CallToolResult> => {
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
      async ({ blockNumber }): Promise<CallToolResult> => {
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
      async (): Promise<CallToolResult> => {
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
