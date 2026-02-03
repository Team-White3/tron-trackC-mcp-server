export interface TronConfig {
  apiKey: string;
  network: 'mainnet' | 'testnet' | 'nile';
  baseUrl: string;
}

export const DEFAULT_CONFIG: TronConfig = {
  apiKey: '',
  network: 'mainnet',
  baseUrl: 'https://api.trongrid.io',
};

export interface AccountInfo {
  address: string;
  balance: number;
  create_time: number;
  trx_power: number;
  bandwidth: number;
  account_resource: any;
  asset_v2?: any;
}

export interface Transaction {
  hash: string;
  timestamp: number;
  block: number;
  from: string;
  to: string;
  amount: number;
  token_info?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  contract_result?: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: number;
  is_verified: boolean;
}

export interface NetworkStatus {
  current_block: number;
  total_accounts: number;
  total_transactions: number;
  transaction_per_second: number;
  energy_used: number;
  bandwidth_used: number;
}
