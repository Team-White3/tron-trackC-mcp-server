import axios, { AxiosInstance } from 'axios';
import {
  TronConfig,
  AccountInfo,
  Transaction,
  Trc20Balance,
  Trc20HolderBalance,
  NetworkStatus,
} from './types';

class TronApiService {
  private config: TronConfig;
  private client: AxiosInstance;

  constructor(config: Partial<TronConfig> = {}) {
    this.config = { 
      ...{ apiKey: '', network: 'mainnet', baseUrl: 'https://api.trongrid.io' }, 
      ...config 
    };
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'TRON-PRO-API-KEY': this.config.apiKey,
      },
    });
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const response = await this.client.get(`/v1/accounts/${address}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  async getAccountTransactions(address: string, limit: number = 50): Promise<Transaction[]> {
    try {
      const response = await this.client.get(`/v1/accounts/${address}/transactions`, {
        params: { limit },
      });
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get account transactions: ${error.message}`);
    }
  }

  async getAccountTokens(
    address: string,
    limit?: number,
    contractAddress?: string
  ): Promise<Trc20Balance[]> {
    try {
      const response = await this.client.get(`/v1/accounts/${address}/trc20/balance`, {
        params: {
          ...(limit ? { limit } : {}),
          ...(contractAddress ? { contract_address: contractAddress } : {}),
        },
      });
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get account tokens: ${error.message}`);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<Trc20HolderBalance[]> {
    try {
      const response = await this.client.get(`/v1/contracts/${tokenAddress}/tokens`);
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const latestEventsResponse = await this.client.get(`/v1/blocks/latest/events`);
      const latestBlockNumber = latestEventsResponse.data?.data?.[0]?.block_number ?? 0;
      const statsResponse = latestBlockNumber
        ? await this.client.get(`/v1/blocks/${latestBlockNumber}/stats`)
        : null;
      const feeStat = statsResponse?.data?.data?.[0]?.feeStat || {};
      return {
        current_block: latestBlockNumber,
        total_accounts: 0,
        total_transactions: 0,
        transaction_per_second: 0,
        energy_used: feeStat.energyUsage || 0,
        bandwidth_used: feeStat.netUsage || 0,
      };
    } catch (error: any) {
      console.error('Failed to get network status:', error);
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  async getBlockInfo(blockNumber: number): Promise<any> {
    try {
      const response = await this.client.get(`/v1/blocks/${blockNumber}/stats`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get block info: ${error.message}`);
    }
  }

  // 获取最新区块信息（简单版本）
  async getLatestBlock(): Promise<any> {
    try {
      const response = await this.client.get(`/v1/blocks/latest/events`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get latest block: ${error.message}`);
    }
  }
}

export default TronApiService;
