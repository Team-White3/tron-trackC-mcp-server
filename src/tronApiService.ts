import axios, { AxiosInstance } from 'axios';
import {
  TronConfig,
  AccountInfo,
  Transaction,
  Trc20Balance,
  Trc20HolderBalance,
  NetworkStatus,
} from './types';
import {
  abiEncodeAddressParam,
  abiEncodeUint256Param,
  assertTronBase58Address,
  assertTxId,
  formatBigIntDecimal,
  tronBase58ToHex,
  trxToSun,
} from './utils/tron';

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
      // Avoid unexpected corporate proxy/env proxy issues (redirect loops, 503, etc.)
      // If you *need* a proxy, configure it explicitly at the axios layer instead.
      proxy: false,
      timeout: 20_000,
      headers: {
        'TRON-PRO-API-KEY': this.config.apiKey,
      },
    });
  }

  private formatAxiosError(error: any): string {
    const status: number | undefined = error?.response?.status;
    const retryAfter = error?.response?.headers?.['retry-after'];
    const data = error?.response?.data;
    const dataMsg =
      (data && typeof data === 'object' && (data.Error || data.error || data.message)) ||
      (typeof data === 'string' ? data : null);
    const msg = String(dataMsg || error?.message || error);

    if (status === 429) {
      return `TRONGrid rate limited (HTTP 429)${retryAfter ? `, Retry-After: ${retryAfter}` : ''}: ${msg}`;
    }
    if (status) {
      return `TRONGrid HTTP ${status}: ${msg}`;
    }
    return msg;
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    assertTronBase58Address(address, 'address');
    try {
      const response = await this.client.get(`/v1/accounts/${address}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get account info: ${this.formatAxiosError(error)}`);
    }
  }

  async getAccountTransactions(address: string, limit: number = 50): Promise<Transaction[]> {
    assertTronBase58Address(address, 'address');
    try {
      const response = await this.client.get(`/v1/accounts/${address}/transactions`, {
        params: { limit },
      });
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get account transactions: ${this.formatAxiosError(error)}`);
    }
  }

  async getAccountTokens(
    address: string,
    limit?: number,
    contractAddress?: string
  ): Promise<Trc20Balance[]> {
    assertTronBase58Address(address, 'address');
    if (contractAddress) assertTronBase58Address(contractAddress, 'contractAddress');
    try {
      const response = await this.client.get(`/v1/accounts/${address}/trc20/balance`, {
        params: {
          ...(limit ? { limit } : {}),
          ...(contractAddress ? { contract_address: contractAddress } : {}),
        },
      });
      // TRONGrid may return different shapes across networks:
      // - mainnet: { data: [ { token_address, balance, token_info? }, ... ] }
      // - testnet (observed on Nile): { data: [ { [tokenAddress]: balance }, ... ] }
      const raw = response.data?.data ?? response.data ?? [];

      const normalized: Trc20Balance[] = [];

      const pushEntry = (token_address: any, balance: any, token_info?: any) => {
        const addr = String(token_address || '').trim();
        if (!addr) return;
        normalized.push({
          token_address: addr,
          balance: String(balance ?? '0'),
          token_info:
            token_info && typeof token_info === 'object'
              ? {
                  symbol: token_info.symbol,
                  name: token_info.name,
                  decimals: token_info.decimals,
                  address: token_info.address || addr,
                }
              : { address: addr },
        });
      };

      if (Array.isArray(raw)) {
        for (const item of raw) {
          if (!item || typeof item !== 'object') continue;

          // canonical shape
          if ('token_address' in item && 'balance' in item) {
            // @ts-ignore
            pushEntry((item as any).token_address, (item as any).balance, (item as any).token_info);
            continue;
          }

          // mapping object(s): { [tokenAddress]: balance }
          for (const [k, v] of Object.entries(item as any)) {
            pushEntry(k, v);
          }
        }
        return normalized;
      }

      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw as any)) {
          pushEntry(k, v);
        }
        return normalized;
      }

      return [];
    } catch (error: any) {
      throw new Error(`Failed to get account tokens: ${this.formatAxiosError(error)}`);
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<Trc20HolderBalance[]> {
    assertTronBase58Address(tokenAddress, 'tokenAddress');
    try {
      const response = await this.client.get(`/v1/contracts/${tokenAddress}/tokens`);
      return response.data.data || [];
    } catch (error: any) {
      throw new Error(`Failed to get token info: ${this.formatAxiosError(error)}`);
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
      throw new Error(`Failed to get block info: ${this.formatAxiosError(error)}`);
    }
  }

  // 获取最新区块信息（简单版本）
  async getLatestBlock(): Promise<any> {
    try {
      const response = await this.client.get(`/v1/blocks/latest/events`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get latest block: ${this.formatAxiosError(error)}`);
    }
  }

  async getFeeParameters(): Promise<{
    baseUrl: string;
    network: TronConfig['network'];
    energyFeeSunPerEnergy?: number;
    energyFeeTrxPerEnergy?: string;
    transactionFeeSun?: number;
    createAccountFeeSun?: number;
    raw: any;
  }> {
    try {
      // Fullnode-style endpoint exposed by TRONGrid
      const response = await this.client.post(`/wallet/getchainparameters`, {});
      const raw = response.data;
      const list = raw?.chainParameter ?? raw?.chain_parameter ?? raw?.chainParameters ?? [];
      const params = new Map<string, any>();
      for (const item of list) {
        if (item?.key) params.set(String(item.key), item.value);
      }

      const energyFeeSunPerEnergy = params.get('getEnergyFee');
      const transactionFeeSun = params.get('getTransactionFee');
      const createAccountFeeSun =
        params.get('getCreateAccountFee') ?? params.get('getCreateNewAccountFeeInSystemContract');

      return {
        baseUrl: this.config.baseUrl,
        network: this.config.network,
        energyFeeSunPerEnergy:
          typeof energyFeeSunPerEnergy === 'number' ? energyFeeSunPerEnergy : undefined,
        energyFeeTrxPerEnergy:
          typeof energyFeeSunPerEnergy === 'number'
            ? formatBigIntDecimal(BigInt(energyFeeSunPerEnergy), 6)
            : undefined,
        transactionFeeSun: typeof transactionFeeSun === 'number' ? transactionFeeSun : undefined,
        createAccountFeeSun: typeof createAccountFeeSun === 'number' ? createAccountFeeSun : undefined,
        raw,
      };
    } catch (error: any) {
      throw new Error(`Failed to get fee parameters: ${this.formatAxiosError(error)}`);
    }
  }

  async buildUnsignedTrxTransfer(params: {
    fromAddress: string;
    toAddress: string;
    amountTrx: string;
  }): Promise<{
    unsignedTransaction: any;
    summary: {
      from: string;
      from_hex: string;
      to: string;
      to_hex: string;
      amount_trx: string;
      amount_sun: string;
      baseUrl: string;
      network: TronConfig['network'];
    };
  }> {
    const { fromAddress, toAddress, amountTrx } = params;
    assertTronBase58Address(fromAddress, 'fromAddress');
    assertTronBase58Address(toAddress, 'toAddress');

    const amountSun = trxToSun(amountTrx);
    const amountSunBig = BigInt(amountSun);
    if (amountSunBig <= 0n) throw new Error('amountTrx must be > 0');
    if (amountSunBig > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('amountTrx is too large (exceeds JS safe integer in SUN)');
    }

    try {
      const response = await this.client.post(`/wallet/createtransaction`, {
        owner_address: fromAddress,
        to_address: toAddress,
        amount: Number(amountSun),
        visible: true,
      });
      if (response.data?.Error) {
        throw new Error(String(response.data.Error));
      }
      return {
        unsignedTransaction: response.data,
        summary: {
          from: fromAddress,
          from_hex: tronBase58ToHex(fromAddress),
          to: toAddress,
          to_hex: tronBase58ToHex(toAddress),
          amount_trx: amountTrx,
          amount_sun: amountSun,
          baseUrl: this.config.baseUrl,
          network: this.config.network,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to build unsigned TRX transfer: ${this.formatAxiosError(error)}`);
    }
  }

  async buildUnsignedTrc20Transfer(params: {
    fromAddress: string;
    contractAddress: string;
    toAddress: string;
    amountRaw: string; // smallest unit (integer)
    feeLimitSun?: number; // default ~10 TRX (10_000_000)
  }): Promise<{
    unsignedTransaction: any;
    summary: Record<string, any>;
  }> {
    const { fromAddress, contractAddress, toAddress, amountRaw } = params;
    assertTronBase58Address(fromAddress, 'fromAddress');
    assertTronBase58Address(contractAddress, 'contractAddress');
    assertTronBase58Address(toAddress, 'toAddress');
    if (!/^\d+$/.test(amountRaw)) throw new Error('amountRaw must be an integer string');

    const feeLimitSun = params.feeLimitSun ?? 10_000_000;
    if (!Number.isFinite(feeLimitSun) || feeLimitSun <= 0) throw new Error('feeLimitSun must be > 0');

    const parameter = abiEncodeAddressParam(toAddress) + abiEncodeUint256Param(BigInt(amountRaw));
    const toHex21 = tronBase58ToHex(toAddress);
    const toHex20 = toHex21.slice(2);

    try {
      const response = await this.client.post(`/wallet/triggersmartcontract`, {
        owner_address: fromAddress,
        contract_address: contractAddress,
        function_selector: 'transfer(address,uint256)',
        parameter,
        fee_limit: feeLimitSun,
        call_value: 0,
        visible: true,
      });

      if (response.data?.Error) {
        throw new Error(String(response.data.Error));
      }
      if (response.data?.result && response.data.result.result === false) {
        // `message` might be hex/base64; keep raw.
        throw new Error(`TriggerSmartContract failed: ${JSON.stringify(response.data.result)}`);
      }

      const unsignedTransaction = response.data?.transaction ?? response.data;
      return {
        unsignedTransaction,
        summary: {
          from: fromAddress,
          from_hex: tronBase58ToHex(fromAddress),
          to: toAddress,
          to_hex_21bytes: toHex21,
          to_hex_20bytes: toHex20,
          contract: contractAddress,
          contract_hex: tronBase58ToHex(contractAddress),
          amount_raw: amountRaw,
          fee_limit_sun: feeLimitSun,
          abi_parameter: parameter,
          function_selector: 'transfer(address,uint256)',
          baseUrl: this.config.baseUrl,
          network: this.config.network,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to build unsigned TRC20 transfer: ${this.formatAxiosError(error)}`);
    }
  }

  async getTransactionConfirmationStatus(txid: string): Promise<{
    txid: string;
    status: 'not_found' | 'pending' | 'confirmed';
    confirmed: boolean;
    blockNumber?: number;
    confirmations?: number;
    blockTimeISO?: string;
    feeSun?: number;
    raw: any;
  }> {
    assertTxId(txid);
    try {
      const [latestBlockEvents, txInfoResp] = await Promise.all([
        this.getLatestBlock(),
        this.client.post(`/wallet/gettransactioninfobyid`, { value: txid }),
      ]);

      const latestBlockNumber = latestBlockEvents?.data?.[0]?.block_number ?? 0;
      const txInfo = txInfoResp.data;

      const blockNumber = typeof txInfo?.blockNumber === 'number' ? txInfo.blockNumber : undefined;
      const blockTimeStamp =
        typeof txInfo?.blockTimeStamp === 'number' ? txInfo.blockTimeStamp : undefined;

      if (!txInfo || (Object.keys(txInfo).length === 0 && txInfo.constructor === Object)) {
        return { txid, status: 'not_found', confirmed: false, raw: txInfo };
      }

      if (!blockNumber) {
        return { txid, status: 'pending', confirmed: false, raw: txInfo };
      }

      const confirmations =
        typeof latestBlockNumber === 'number' && latestBlockNumber >= blockNumber
          ? latestBlockNumber - blockNumber + 1
          : undefined;

      return {
        txid,
        status: 'confirmed',
        confirmed: true,
        blockNumber,
        confirmations,
        blockTimeISO: blockTimeStamp ? new Date(blockTimeStamp).toISOString() : undefined,
        feeSun: typeof txInfo?.fee === 'number' ? txInfo.fee : undefined,
        raw: txInfo,
      };
    } catch (error: any) {
      throw new Error(`Failed to get transaction confirmation status: ${this.formatAxiosError(error)}`);
    }
  }

  async getUsdtBalance(params: { address: string; usdtContractAddress?: string }): Promise<{
    address: string;
    contract: string;
    balanceRaw: string;
    balance: string; // human-readable
    decimals: number;
    tokenSymbol: string;
    warning?: string;
    raw: any;
  }> {
    const address = params.address;
    assertTronBase58Address(address, 'address');
    // Network-aware defaults (can be overridden by params or env).
    const defaultMainnetUsdt = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
    // Nile testnet USDT (TRONSCAN tokenId "TXYZop..." shows USDT with 6 decimals)
    const defaultNileUsdt = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
    const defaultByNetwork: Record<TronConfig['network'], string> = {
      mainnet: defaultMainnetUsdt,
      nile: defaultNileUsdt,
      // Shasta/testnet varies; recommend explicit override.
      testnet: defaultMainnetUsdt,
    };

    const contract =
      params.usdtContractAddress ||
      process.env.TRON_USDT_CONTRACT_ADDRESS ||
      defaultByNetwork[this.config.network] ||
      defaultMainnetUsdt;

    // USDT on TRON is typically 6 decimals
    const decimals = 6;
    const tokenSymbol = 'USDT';

    const balances = await this.getAccountTokens(address, 1, contract);
    const raw = balances?.[0] ?? null;
    const balanceRaw = raw?.balance ? String(raw.balance) : '0';

    return {
      address,
      contract,
      balanceRaw,
      balance: formatBigIntDecimal(BigInt(balanceRaw), decimals),
      decimals,
      tokenSymbol,
      warning:
        contract === defaultMainnetUsdt && this.config.network !== 'mainnet'
          ? `当前网络为 ${this.config.network}，但使用的是主网 USDT 合约地址；请通过 usdtContractAddress/TRON_USDT_CONTRACT_ADDRESS 指定对应网络的 USDT 合约。Nile 常用 USDT: ${defaultNileUsdt}`
          : undefined,
      raw,
    };
  }
}

export default TronApiService;
