import axios from 'axios';
import { TronConfig, AccountInfo, Transaction, TokenInfo, NetworkStatus } from './types';

class TronApiService {
  private config: TronConfig;

  constructor(config: Partial<TronConfig> = {}) {
    this.config = { ...{ apiKey: '', network: 'mainnet', baseUrl: 'https://api.trongrid.io' }, ...config };
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/accounts/${address}`, {
        headers: {
          'TRON-PRO-API-KEY': this.config.apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  async getAccountTransactions(address: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/accounts/${address}/transactions`, {
        params: { limit },
        headers: {
          'TRON-PRO-API-KEY': this.config.apiKey,
        },
      });
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get account transactions: ${error.message}`);
    }
  }

  async getAccountTokens(address: string): Promise<TokenInfo[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/accounts/${address}/tokens`, {
        headers: {
          'TRON-PRO-API-KEY': this.config.apiKey,
        },
      });
      return response.data.tokens;
    } catch (error: any) {
      throw new Error(`Failed to get account tokens: ${error.message}`);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/contracts/${tokenAddress}`, {
        headers: {
          'TRON-PRO-API-KEY': this.config.apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const [blockResponse, statsResponse] = await Promise.all([
        axios.get(`${this.config.baseUrl}/v1/blocks/latest`, {
          headers: {
            'TRON-PRO-API-KEY': this.config.apiKey,
          },
        }),
        axios.get(`${this.config.baseUrl}/v1/network/stats`, {
          headers: {
            'TRON-PRO-API-KEY': this.config.apiKey,
          },
        }),
      ]);

      return {
        current_block: blockResponse.data.block_header.raw_data.number,
        total_accounts: statsResponse.data.account_count,
        total_transactions: statsResponse.data.transaction_count,
        transaction_per_second: statsResponse.data.tps,
        energy_used: statsResponse.data.energy_usage,
        bandwidth_used: statsResponse.data.bandwidth_usage,
      };
    } catch (error: any) {
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  async getBlockInfo(blockNumber: number): Promise<any> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/v1/blocks/${blockNumber}`, {
        headers: {
          'TRON-PRO-API-KEY': this.config.apiKey,
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get block info: ${error.message}`);
    }
  }
}

export default TronApiService;
