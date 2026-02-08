import { MCPTool, MCPResource } from './mcp/types';
import { z } from 'zod';
import TronApiService from './tronApiService';
import TronscanApiService from './tronscanApiService';
import { TronConfig } from './types';
import { assertTronBase58Address, sunToTrx, tronBase58ToHex } from './utils/tron';

class TronTools {
  private apiService: TronApiService;
  private tronscanService: TronscanApiService;
  private config: TronConfig;

  constructor(config: TronConfig) {
    this.config = config;
    this.apiService = new TronApiService(config);
    const tronscanBaseUrl =
      process.env.TRONSCAN_BASE_URL || TronscanApiService.getDefaultBaseUrl(config.network);
    const cacheTtlMs = process.env.TRONSCAN_CACHE_TTL_MS
      ? Number(process.env.TRONSCAN_CACHE_TTL_MS)
      : undefined;
    this.tronscanService = new TronscanApiService({
      baseUrl: tronscanBaseUrl,
      ...(cacheTtlMs && Number.isFinite(cacheTtlMs) ? { cacheTtlMs } : {}),
    });
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

  getAddressLabelsTool(): MCPTool {
    const tronscanService = this.tronscanService;
    return {
      name: 'get_address_labels',
      description: '查询 TRONSCAN 地址标签（交易所/服务商/风险标注等，字段依赖 TRONSCAN 标签库）',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'TRON账户地址' },
          includeRaw: { type: 'boolean', description: '是否返回 TRONSCAN 原始响应（默认 false，可能非常大）' },
        },
        required: ['address'],
      },
      async execute(input: any) {
        return tronscanService.getAddressLabel(input.address, { includeRaw: !!input.includeRaw });
      },
    };
  }

  assessAddressRiskTool(): MCPTool {
    const tronscanService = this.tronscanService;
    const network = this.config.network;
    return {
      name: 'assess_address_risk',
      description:
        '链上安全监测：结合 TRONSCAN 标签库 + 简单启发式规则，评估地址风险并给出风险提示与建议',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: '待评估的 TRON 地址' },
        },
        required: ['address'],
      },
      async execute(input: any) {
        const address = input.address;
        assertTronBase58Address(address, 'address');
        const label = await tronscanService.getAddressLabel(address);
        const tag = (label.addressTag || '').toLowerCase();

        const reasons: string[] = [];
        const recommendations: string[] = [];
        let score = 0;

        if (label.addressTag) {
          reasons.push(`TRONSCAN addressTag: ${label.addressTag}`);
          // Not always "risk", but it's a strong signal to show to users.
          score += 10;
        }

        const riskyKeywords = [
          'scam',
          'fraud',
          'phishing',
          'hack',
          'malicious',
          'black',
          'suspicious',
          'ponzi',
          'gambling',
          'mixer',
          'launder',
          'dark',
          'illegal',
        ];
        if (tag && riskyKeywords.some((k) => tag.includes(k))) {
          score += 80;
          reasons.push('地址标签包含可疑关键词（scam/phishing/blacklist 等）');
        }

        // Account type hint from TRONSCAN:
        // 0 = normal account (commonly), other values may indicate contracts/others.
        if (typeof label.accountType === 'number' && label.accountType !== 0) {
          score += 20;
          reasons.push(`accountType=${label.accountType}（可能为合约/特殊账户，建议谨慎）`);
        }

        let level: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
        if (score >= 80) level = 'high';
        else if (score >= 40) level = 'medium';
        else if (score > 0) level = 'low';
        else level = 'unknown';

        if (level === 'high') {
          recommendations.push('建议不要直接大额转账；若必须交互，请先小额测试并核验对方身份。');
          recommendations.push('在 TronScan 打开地址页面，检查标签/历史交易/是否为可疑合约。');
        } else if (level === 'medium') {
          recommendations.push('建议先小额测试，确认收款方身份；必要时让对方提供额外证明。');
        } else {
          recommendations.push('如进行转账，仍建议核验收款方身份并核对地址。');
        }

        return {
          address,
          network,
          tronscan: {
            tronscanBaseUrl: label.tronscanBaseUrl,
            addressTag: label.addressTag,
            addressTagLogo: label.addressTagLogo,
            accountType: label.accountType,
            totalTransactionCount: label.totalTransactionCount,
            transactions_in: label.transactions_in,
            transactions_out: label.transactions_out,
            warning: label.warning,
          },
          risk: {
            level,
            score,
            safeToTransfer: level !== 'high',
            reasons,
            recommendations,
            note:
              '风险结果基于 TRONSCAN 标签库与启发式规则，仅供辅助判断；并不构成安全/合规保证。',
          },
        };
      },
    };
  }

  assessTransferRiskTool(): MCPTool {
    const tronscanService = this.tronscanService;
    const network = this.config.network;
    const assessOne = async (address: string) => {
      assertTronBase58Address(address, 'address');
      const label = await tronscanService.getAddressLabel(address);
      const tag = (label.addressTag || '').toLowerCase();
      const riskyKeywords = [
        'scam',
        'fraud',
        'phishing',
        'hack',
        'malicious',
        'black',
        'suspicious',
        'ponzi',
        'gambling',
        'mixer',
        'launder',
        'dark',
        'illegal',
      ];
      const risky = tag && riskyKeywords.some((k) => tag.includes(k));
      return {
        address,
        addressTag: label.addressTag,
        accountType: label.accountType,
        riskyByTag: !!risky,
        tronscanBaseUrl: label.tronscanBaseUrl,
      };
    };

    return {
      name: 'assess_transfer_risk',
      description:
        '链上安全监测：在转账前对 from/to（以及可选合约地址）做 TRONSCAN 标签风险检查，输出可执行的风险提示',
      inputSchema: {
        type: 'object',
        properties: {
          fromAddress: { type: 'string', description: '转出地址' },
          toAddress: { type: 'string', description: '转入地址（重点检查）' },
          contractAddress: { type: 'string', description: '可选，TRC20 合约地址（也会做风险提示）' },
        },
        required: ['fromAddress', 'toAddress'],
      },
      async execute(input: any) {
        const { fromAddress, toAddress, contractAddress } = input;

        const targets = [fromAddress, toAddress, ...(contractAddress ? [contractAddress] : [])];
        const results = await Promise.all(targets.map((a) => assessOne(a)));

        const byAddress = Object.fromEntries(results.map((r) => [r.address, r]));
        const risky = results.filter((r) => r.riskyByTag);
        const level: 'low' | 'medium' | 'high' =
          risky.length > 0 ? 'high' : contractAddress ? 'medium' : 'low';

        const recommendations: string[] = [];
        if (level === 'high') {
          recommendations.push('检测到可疑标签：建议停止/改为小额测试，并进一步核验地址/合约。');
        } else if (level === 'medium') {
          recommendations.push('涉及合约交互：建议核验合约地址、token 信息，并先小额测试。');
        } else {
          recommendations.push('未命中可疑标签，但仍建议核对地址与收款方身份。');
        }

        return {
          network,
          level,
          safeToProceed: level !== 'high',
          targets: { fromAddress, toAddress, contractAddress: contractAddress || null },
          tronscanBaseUrls: Array.from(new Set(results.map((r) => r.tronscanBaseUrl))),
          labels: byAddress,
          recommendations,
          note:
            '该检查主要依赖 TRONSCAN 标签库；测试网标签通常不完整。建议结合业务背景与链上行为综合判断。',
        };
      },
    };
  }

  analyzeAccountActivityTool(): MCPTool {
    const apiService = this.apiService;
    const tronscanService = this.tronscanService;
    const network = this.config.network;

    function normalizeHex21(addr: any): string | null {
      if (!addr) return null;
      const s = String(addr);
      try {
        if (s.startsWith('T')) return tronBase58ToHex(s).toLowerCase();
      } catch {
        // ignore
      }
      const hex = s.startsWith('0x') ? s.slice(2) : s;
      if (/^[0-9a-fA-F]{42}$/.test(hex)) return hex.toLowerCase();
      return null;
    }

    return {
      name: 'analyze_account_activity',
      description:
        '复杂查询增强：聚合账户 TRX/TRC20 资产、最近交易、TRX 转账流入/流出统计、Top 对手方，并尽可能补充 TRONSCAN 统计/标签信息',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'TRON账户地址' },
          txLimit: { type: 'number', description: '最近交易数量（默认30，最大200）', minimum: 1, maximum: 200 },
          tokenLimit: { type: 'number', description: 'TRC20余额返回数量（默认50，最大200）', minimum: 1, maximum: 200 },
          includeRaw: { type: 'boolean', description: '是否包含原始交易/代币数组（默认 false，建议保持 false 以免返回过大）' },
        },
        required: ['address'],
      },
      async execute(input: any) {
        const address = input.address;
        assertTronBase58Address(address, 'address');
        const txLimit = typeof input.txLimit === 'number' ? input.txLimit : 30;
        const tokenLimit = typeof input.tokenLimit === 'number' ? input.tokenLimit : 50;
        const includeRaw = !!input.includeRaw;

        const [accInfo, txs, tokens, usdt, tronscanLabel] = await Promise.all([
          apiService.getAccountInfo(address),
          apiService.getAccountTransactions(address, txLimit),
          apiService.getAccountTokens(address, tokenLimit),
          apiService.getUsdtBalance({ address }),
          tronscanService.getAddressLabel(address).catch((e) => ({ error: String(e?.message || e) })),
        ]);

        const acc0 = (accInfo as any)?.data?.[0] ?? (accInfo as any)?.data ?? accInfo;
        const balanceSun =
          typeof acc0?.balance === 'number' ? acc0.balance : typeof acc0?.balance === 'string' ? Number(acc0.balance) : 0;
        const balanceTrx = sunToTrx(balanceSun);

        const addrHex = tronBase58ToHex(address).toLowerCase();

        let inboundSun = 0n;
        let outboundSun = 0n;
        let trxTransferCount = 0;
        const byType: Record<string, number> = {};
        const counterparty = new Map<string, bigint>();

        const simplifiedTxs: any[] = [];

        for (const tx of txs || []) {
          const raw = tx as any;
          const txid = raw.txID || raw.txid || raw.hash || raw.id || raw.transaction_id || raw.transactionId;
          const ts =
            raw.block_timestamp || raw.timestamp || raw.blockTimeStamp || raw.blockTime || raw.time || null;
          const contract0 = raw.raw_data?.contract?.[0];
          const type = contract0?.type || raw.type || raw.contract_type || 'Unknown';
          byType[type] = (byType[type] || 0) + 1;

          let direction: 'in' | 'out' | 'unknown' = 'unknown';
          let amountSun: string | null = null;
          let from: string | null = null;
          let to: string | null = null;

          if (type === 'TransferContract') {
            const v = contract0?.parameter?.value || {};
            const owner = v.owner_address;
            const toAddr = v.to_address;
            const ownerHex = normalizeHex21(owner);
            const toHex = normalizeHex21(toAddr);

            const amt = v.amount;
            if (typeof amt === 'number' || typeof amt === 'string') {
              amountSun = String(amt);
            }

            if (ownerHex && ownerHex === addrHex) direction = 'out';
            else if (toHex && toHex === addrHex) direction = 'in';

            from = typeof owner === 'string' ? owner : ownerHex;
            to = typeof toAddr === 'string' ? toAddr : toHex;

            if (amountSun) {
              trxTransferCount += 1;
              const amtBig = BigInt(amountSun);
              if (direction === 'in') {
                inboundSun += amtBig;
                const cp = from || ownerHex || 'unknown';
                counterparty.set(cp, (counterparty.get(cp) || 0n) + amtBig);
              } else if (direction === 'out') {
                outboundSun += amtBig;
                const cp = to || toHex || 'unknown';
                counterparty.set(cp, (counterparty.get(cp) || 0n) + amtBig);
              }
            }
          }

          simplifiedTxs.push({
            txid,
            timestamp: ts,
            type,
            direction,
            amount_sun: amountSun,
            amount_trx: amountSun ? sunToTrx(amountSun) : null,
            from,
            to,
          });
        }

        const topCounterparties = [...counterparty.entries()]
          .sort((a, b) => (a[1] > b[1] ? -1 : a[1] < b[1] ? 1 : 0))
          .slice(0, 10)
          .map(([addr, amt]) => ({ address: addr, amount_sun: amt.toString(), amount_trx: sunToTrx(amt) }));

        const tokenTop = (tokens || [])
          .slice()
          .sort((a: any, b: any) => {
            try {
              return BigInt(String(b.balance || '0')) > BigInt(String(a.balance || '0')) ? 1 : -1;
            } catch {
              return 0;
            }
          })
          .slice(0, 10)
          .map((t: any) => {
            const decimals = Number(t?.token_info?.decimals ?? 0);
            const balRaw = String(t?.balance ?? '0');
            let bal = null;
            try {
              bal = decimals >= 0 && decimals <= 30 ? (BigInt(balRaw) / (10n ** BigInt(decimals))).toString() : null;
            } catch {
              bal = null;
            }
            return {
              token_address: t.token_address,
              symbol: t?.token_info?.symbol,
              name: t?.token_info?.name,
              decimals,
              balance_raw: balRaw,
              balance_approx: bal,
            };
          });

        const result: any = {
          address,
          network,
          tronGrid: {
            trx_balance_sun: balanceSun,
            trx_balance: balanceTrx,
            account: includeRaw ? acc0 : undefined,
          },
          tronscan: tronscanLabel,
          usdt,
          activity: {
            tx_sample_size: simplifiedTxs.length,
            by_type: byType,
            trx_transfer_count: trxTransferCount,
            inbound_trx: sunToTrx(inboundSun),
            outbound_trx: sunToTrx(outboundSun),
            net_trx: sunToTrx(inboundSun - outboundSun),
            top_counterparties: topCounterparties,
            recent_transactions: simplifiedTxs.slice(0, 20),
          },
          tokens: {
            token_count: (tokens || []).length,
            top: tokenTop,
          },
          next_steps: [
            '如要转账：先调用 assess_transfer_risk 检查 from/to 风险标签',
            '生成未签名交易：build_unsigned_trx_transfer / build_unsigned_trc20_transfer',
            '广播后用 get_transaction_confirmation_status 查询确认状态',
          ],
        };

        if (includeRaw) {
          result.raw = { transactions: txs, tokens };
        }

        return result;
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
      this.getAddressLabelsTool(),
      this.assessAddressRiskTool(),
      this.assessTransferRiskTool(),
      this.analyzeAccountActivityTool(),
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

    server.registerTool(
      'get_address_labels',
      {
        description: '查询 TRONSCAN 地址标签（交易所/服务商/风险标注等）',
        inputSchema: z.object({
          address: z.string(),
          includeRaw: z.boolean().optional(),
        }),
      },
      async ({ address, includeRaw }: { address: string; includeRaw?: boolean }) => {
        const result = await this.getAddressLabelsTool().execute({ address, includeRaw });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'assess_address_risk',
      {
        description: '链上安全监测：评估单个地址风险（TRONSCAN 标签 + 启发式规则）',
        inputSchema: z.object({
          address: z.string(),
        }),
      },
      async ({ address }: { address: string }) => {
        const result = await this.assessAddressRiskTool().execute({ address });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'assess_transfer_risk',
      {
        description: '链上安全监测：转账前对 from/to/合约地址进行标签风险检查并给出提示',
        inputSchema: z.object({
          fromAddress: z.string(),
          toAddress: z.string(),
          contractAddress: z.string().optional(),
        }),
      },
      async ({
        fromAddress,
        toAddress,
        contractAddress,
      }: {
        fromAddress: string;
        toAddress: string;
        contractAddress?: string;
      }) => {
        const result = await this.assessTransferRiskTool().execute({
          fromAddress,
          toAddress,
          contractAddress,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        };
      }
    );

    server.registerTool(
      'analyze_account_activity',
      {
        description: '复杂查询增强：聚合资产+最近交易+TRX 流入流出统计+Top 对手方（可选包含原始数据）',
        inputSchema: z.object({
          address: z.string(),
          txLimit: z.number().min(1).max(200).optional(),
          tokenLimit: z.number().min(1).max(200).optional(),
          includeRaw: z.boolean().optional(),
        }),
      },
      async ({
        address,
        txLimit,
        tokenLimit,
        includeRaw,
      }: {
        address: string;
        txLimit?: number;
        tokenLimit?: number;
        includeRaw?: boolean;
      }) => {
        const result = await this.analyzeAccountActivityTool().execute({
          address,
          txLimit,
          tokenLimit,
          includeRaw,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
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
