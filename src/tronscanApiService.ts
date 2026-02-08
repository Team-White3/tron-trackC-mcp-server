import axios, { AxiosInstance } from 'axios';
import { TronConfig } from './types';
import { assertTronBase58Address } from './utils/tron';

export interface TronscanConfig {
  baseUrl: string;
  cacheTtlMs?: number;
}

type CacheEntry<T> = { expiresAt: number; value: T };

class TronscanApiService {
  private client: AxiosInstance;
  private cache = new Map<string, CacheEntry<any>>();
  private cacheTtlMs: number;
  private baseUrl: string;

  static getDefaultBaseUrl(network?: TronConfig['network']): string {
    const n = network === 'testnet' ? 'nile' : network;
    if (n === 'nile') return 'https://nileapi.tronscan.org';
    return 'https://apilist.tronscan.org';
  }

  constructor(config: Partial<TronscanConfig> = {}) {
    const baseUrl = config.baseUrl || TronscanApiService.getDefaultBaseUrl('mainnet');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.cacheTtlMs = config.cacheTtlMs ?? 60_000; // 60s
    this.client = axios.create({
      baseURL: this.baseUrl,
      proxy: false,
      timeout: 20_000,
      headers: {
        'User-Agent': 'tron-mcp-server/1.0 (+https://github.com/)',
      },
      // TRONSCAN sometimes returns very large payloads (token balances).
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    });
  }

  private cacheGet<T>(key: string): T | undefined {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  private cacheSet<T>(key: string, value: T) {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  async getAccountRaw(address: string): Promise<any> {
    assertTronBase58Address(address, 'address');
    const cacheKey = `account:${address}`;
    const cached = this.cacheGet<any>(cacheKey);
    if (cached) return cached;

    const resp = await this.client.get(`/api/account`, { params: { address } });
    this.cacheSet(cacheKey, resp.data);
    return resp.data;
  }

  async getAddressLabel(
    address: string,
    options: { includeRaw?: boolean } = {}
  ): Promise<{
    address: string;
    tronscanBaseUrl: string;
    addressTag?: string;
    addressTagLogo?: string;
    accountType?: number;
    totalTransactionCount?: number;
    transactions_in?: number;
    transactions_out?: number;
    warning?: string;
    raw?: any;
  }> {
    const raw = await this.getAccountRaw(address);
    const addressTag =
      typeof raw?.addressTag === 'string' && raw.addressTag.trim() ? raw.addressTag.trim() : undefined;
    const addressTagLogo =
      typeof raw?.addressTagLogo === 'string' && raw.addressTagLogo.trim()
        ? raw.addressTagLogo.trim()
        : undefined;

    return {
      address,
      tronscanBaseUrl: this.baseUrl,
      addressTag,
      addressTagLogo,
      accountType: typeof raw?.accountType === 'number' ? raw.accountType : undefined,
      totalTransactionCount:
        typeof raw?.totalTransactionCount === 'number' ? raw.totalTransactionCount : undefined,
      transactions_in: typeof raw?.transactions_in === 'number' ? raw.transactions_in : undefined,
      transactions_out: typeof raw?.transactions_out === 'number' ? raw.transactions_out : undefined,
      warning:
        addressTag === undefined && this.baseUrl.includes('nileapi')
          ? '提示：TRONSCAN 测试网(Nile)的地址标签库通常不完整，可能无法返回 addressTag。'
          : undefined,
      raw: options.includeRaw ? raw : undefined,
    };
  }
}

export default TronscanApiService;

