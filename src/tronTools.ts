import { MCPTool, MCPResource, MCPServer } from './mcp/types';
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
      description: '获取TRON账户持有的代币信息',
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
        return apiService.getAccountTokens(input.address);
      },
    };
  }

  getTokenInfoTool(): MCPTool {
    const apiService = this.apiService;
    return {
      name: 'get_token_info',
      description: '获取TRC20/TRC721代币的详细信息',
      inputSchema: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: '代币合约地址',
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
      description: '获取TRON网络的状态信息',
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
      description: '获取TRON区块链指定区块的详细信息',
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

  getAllTools(): MCPTool[] {
    return [
      this.getAccountInfoTool(),
      this.getAccountTransactionsTool(),
      this.getAccountTokensTool(),
      this.getTokenInfoTool(),
      this.getNetworkStatusTool(),
      this.getBlockInfoTool(),
    ];
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
}

export { TronTools, TronResources };
