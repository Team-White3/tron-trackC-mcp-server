import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
// NOTE: We intentionally `require()` MCP SDK modules to avoid TypeScript
// type-checker OOM issues in some environments when importing the SDK types.
// Runtime behavior is unchanged.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
import { TronTools } from './tronTools';
import { TronConfig } from './types';

function getTronscanTxBaseUrl(network: string | undefined) {
  switch (network) {
    case 'nile':
      return 'https://nile.tronscan.org/#/transaction/';
    case 'testnet':
      // Shasta
      return 'https://shasta.tronscan.org/#/transaction/';
    case 'mainnet':
    default:
      return 'https://tronscan.org/#/transaction/';
  }
}

class TronMCPServer {
  private app: express.Application;
  private port: number;
  private tronTools: TronTools;
  private mcpTransports: Record<string, any>;

  constructor(config: TronConfig, port: number = 3000) {
    // Use a plain Express app for maximum compatibility.
    // (Some environments hit body-parser issues when mixing different Express major versions.)
    this.app = express();
    this.port = port;
    this.tronTools = new TronTools(config);
    this.mcpTransports = {};

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware() {
    // CORS:
    // - For /api (and the TronLink signing demo page), we allow all origins.
    // - For /mcp, you can restrict origins via MCP_ALLOWED_ORIGINS.
    this.app.use('/api', cors());
    this.app.use(
      '/mcp',
      cors({
        exposedHeaders: [
          'WWW-Authenticate',
          'Mcp-Session-Id',
          'Last-Event-Id',
          'Mcp-Protocol-Version',
        ],
        origin: (origin, callback) => {
          const allowlist = (process.env.MCP_ALLOWED_ORIGINS || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

          if (!origin || allowlist.length === 0 || allowlist.includes(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error('Origin not allowed'));
        },
      })
    );

    // Body parsing for our HTTP APIs
    this.app.use('/mcp', express.json());
    this.app.use('/mcp', express.urlencoded({ extended: true }));
    this.app.use('/api', express.json());
    this.app.use('/api', express.urlencoded({ extended: true }));
  }

  private createMcpServer() {
    const server = new McpServer({
      name: 'tron-mcp-server',
      version: '1.0.0',
    });
    // console.log("==E== Create MCP Server")

    this.tronTools.registerMcpTools(server);
    return server;
  }

  private async handleMcpPost(req: Request, res: Response) {
    // const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const server = this.createMcpServer();
    try {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator:  undefined
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        res.on('close', () => {
            // console.log('Request closed');
            transport.close();
            server.close();
        });
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32_603,
                    message: 'Internal server error'
                },
                id: null
            });
        }
    }
  }

  private async handleMcpGet(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.mcpTransports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = this.mcpTransports[sessionId] as any;
    await transport.handleRequest(req, res);
  }

  private async handleMcpDelete(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.mcpTransports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = this.mcpTransports[sessionId] as any;
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  }

  private initializeRoutes() {
    this.app.get('/', (req, res) => {
      res.json({
        message: 'TRON MCP Server is running',
        version: '1.0.0',
        documentation: '/api-tools',
        mcp_endpoint: '/mcp',
      });
    });

    // Simple TronLink signing/broadcasting demo page.
    // This is used together with MCP tools that generate unsigned transactions.
    this.app.get('/tronlink-sign', (_req, res) => {
      const tronscanTxBaseUrl = getTronscanTxBaseUrl(process.env.TRON_NETWORK);
      res.type('html').send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TRON MCP - TronLink 签名/广播演示</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 12px 0; }
      textarea { width: 100%; min-height: 180px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono"; font-size: 12px; }
      button { padding: 10px 14px; border-radius: 10px; border: 1px solid #d1d5db; background: #111827; color: white; cursor: pointer; }
      button.secondary { background: white; color: #111827; }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; }
      .muted { color: #6b7280; font-size: 12px; }
      .ok { color: #059669; }
      .err { color: #dc2626; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>
    <h2>TRON MCP - TronLink 签名/广播演示</h2>
    <p class="muted">
      用途：把 MCP 工具生成的 <b>未签名交易对象</b>（unsigned tx）交给 TronLink 让用户确认签名并广播。
    </p>

    <div class="card">
      <div class="row">
        <button id="btnConnect" class="secondary">1) 连接 TronLink</button>
        <button id="btnSign" disabled>2) 签名交易</button>
        <button id="btnBroadcast" disabled>3) 广播交易</button>
      </div>
      <p class="muted">当前账户：<span id="addr">未连接</span></p>
      <p class="muted">FullNode：<span id="fullnode">-</span></p>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">未签名交易 JSON</h3>
      <p class="muted">
        推荐方式：直接打开 MCP 工具返回的 <code>tronlinkSignUrl</code>（短参数模式，如 <code>?type=trx&amp;from=...&amp;to=...&amp;amountTrx=1</code>），页面会自动从本地服务构建并填充未签名交易。
        <br/>
        兼容方式：仍支持 <code>?tx=base64url(JSON)</code> 自动填充，但如果 URL 被聊天窗口截断会导致解析失败。
      </p>
      <textarea id="unsignedTx" placeholder="{ ... }"></textarea>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">签名结果 / 广播结果</h3>
      <pre id="out" class="muted" style="white-space:pre-wrap; margin:0;"></pre>
    </div>

    <script>
      const tronscanTxBaseUrl = ${JSON.stringify(tronscanTxBaseUrl)};
      let signedTx = null;

      function log(obj, isError=false) {
        const out = document.getElementById('out');
        out.className = isError ? 'err' : 'muted';
        out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
      }

      function decodeBase64UrlToText(b64url) {
        const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
        const bin = atob(b64 + pad);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      }

      function getUnsignedTxFromTextarea() {
        const v = document.getElementById('unsignedTx').value.trim();
        if (!v) throw new Error('请先粘贴未签名交易 JSON');
        return JSON.parse(v);
      }

      function getUnsignedTx() {
        // Prefer the tx object fetched from server to avoid JSON parse/copy issues
        if (window.__unsignedTx) return window.__unsignedTx;
        return getUnsignedTxFromTextarea();
      }

      async function connectTronLink() {
        if (window.tronLink && window.tronLink.request) {
          await window.tronLink.request({ method: 'tron_requestAccounts' });
        }

        // Wait for tronWeb injection
        for (let i = 0; i < 20; i++) {
          if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) break;
          await new Promise(r => setTimeout(r, 150));
        }

        if (!window.tronWeb || !window.tronWeb.defaultAddress || !window.tronWeb.defaultAddress.base58) {
          throw new Error('未检测到 TronLink / tronWeb。请确认已安装 TronLink 浏览器插件并解锁。');
        }

        document.getElementById('addr').textContent = window.tronWeb.defaultAddress.base58;
        document.getElementById('fullnode').textContent = window.tronWeb.fullNode && window.tronWeb.fullNode.host ? window.tronWeb.fullNode.host : '-';
        document.getElementById('btnSign').disabled = false;
        log('✅ 已连接 TronLink', false);
      }

      async function signTx() {
        const tx = getUnsignedTx();
        if (!window.tronWeb) throw new Error('TronLink 未连接');
        signedTx = await window.tronWeb.trx.sign(tx);
        document.getElementById('btnBroadcast').disabled = false;
        log({ signedTx }, false);
      }

      async function broadcastTx() {
        if (!signedTx) throw new Error('请先签名交易');
        const result = await window.tronWeb.trx.sendRawTransaction(signedTx);
        const txid = result && (result.txid || result.txID);
        if (txid) {
          log({
            broadcastResult: result,
            tronscan: tronscanTxBaseUrl + txid
          }, false);
        } else {
          log({ broadcastResult: result }, false);
        }
      }

      document.getElementById('btnConnect').addEventListener('click', async () => {
        try { await connectTronLink(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnSign').addEventListener('click', async () => {
        try { await signTx(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnBroadcast').addEventListener('click', async () => {
        try { await broadcastTx(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });

      // Prefill tx from URL
      (function prefill() {
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');

        async function prefillFromServer(endpoint, body) {
          try {
            log({ status: '正在从本地服务生成未签名交易...', endpoint, request: body }, false);
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            const text = await resp.text();
            let data = null;
            try { data = JSON.parse(text); } catch (e) { /* ignore */ }
            if (!resp.ok) {
              throw new Error((data && data.error) ? data.error : (text || ('HTTP ' + resp.status)));
            }

            if (!data || !data.unsignedTransaction) {
              log({ warning: '未从服务端响应中找到 unsignedTransaction 字段', response: data }, true);
              return;
            }

            window.__unsignedTx = data.unsignedTransaction;
            document.getElementById('unsignedTx').value = JSON.stringify(window.__unsignedTx, null, 2);
            log({ ok: true, prefilled: true }, false);
          } catch (e) {
            log(String(e && e.message ? e.message : e), true);
          }
        }

        // New short-link mode: build unsigned tx from server using query params
        if (type === 'trx') {
          const from = params.get('from');
          const to = params.get('to');
          const amountTrx = params.get('amountTrx');
          if (from && to && amountTrx) {
            prefillFromServer('/api/build-unsigned-trx-transfer', { fromAddress: from, toAddress: to, amountTrx });
            return;
          }
        }

        if (type === 'trc20') {
          const from = params.get('from');
          const to = params.get('to');
          const contract = params.get('contract');
          const amountRaw = params.get('amountRaw');
          const feeLimitSun = params.get('feeLimitSun');
          if (from && to && contract && amountRaw) {
            prefillFromServer('/api/build-unsigned-trc20-transfer', {
              fromAddress: from,
              toAddress: to,
              contractAddress: contract,
              amountRaw,
              feeLimitSun: feeLimitSun ? Number(feeLimitSun) : undefined,
            });
            return;
          }
        }

        const tx = params.get('tx');
        if (!tx) {
          log('未检测到自动填充参数：请使用 MCP 返回的 tronlinkSignUrl（推荐），或粘贴 unsignedTransaction JSON。', false);
          return;
        }
        try {
          const json = decodeBase64UrlToText(tx);
          document.getElementById('unsignedTx').value = json;
          try {
            window.__unsignedTx = JSON.parse(json);
          } catch (e) {
            log('tx 参数解码成功但不是合法 JSON：很可能 URL 被截断，请回到 Claude 重新复制完整的 tronlinkSignUrl。', true);
          }
        } catch (e) {
          log('tx 参数解析失败：' + (e && e.message ? e.message : String(e)), true);
        }
      })();
    </script>
  </body>
</html>`);
    });

    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    });

    this.app.get('/api-tools', (req, res) => {
      const tools = this.tronTools.getAllTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      res.json({
        tools,
        count: tools.length,
      });
    });

    this.app.post('/mcp', (req, res) => this.handleMcpPost(req, res));
    this.app.get('/mcp', (req, res) => this.handleMcpGet(req, res));
    this.app.delete('/mcp', (req, res) => this.handleMcpDelete(req, res));

    this.app.post('/api/account-info', async (req, res) => {
      try {
        const { address } = req.body;
        const result = await this.tronTools.getAccountInfoTool().execute({ address });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/account-transactions', async (req, res) => {
      try {
        const { address, limit } = req.body;
        const result = await this.tronTools.getAccountTransactionsTool().execute({ address, limit });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/account-tokens', async (req, res) => {
      try {
        const { address, limit, contractAddress } = req.body;
        const result = await this.tronTools.getAccountTokensTool().execute({
          address,
          limit,
          contractAddress,
        });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/token-info', async (req, res) => {
      try {
        const { tokenAddress } = req.body;
        const result = await this.tronTools.getTokenInfoTool().execute({ tokenAddress });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/network-status', async (req, res) => {
      try {
        const result = await this.tronTools.getNetworkStatusTool().execute({});
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/block-info', async (req, res) => {
      try {
        const { blockNumber } = req.body;
        const result = await this.tronTools.getBlockInfoTool().execute({ blockNumber });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/latest-block', async (req, res) => {
      try {
        const result = await this.tronTools.getLatestBlockTool().execute({});
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/fee-parameters', async (_req, res) => {
      try {
        const result = await this.tronTools.getFeeParametersTool().execute({});
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/transaction-confirmation', async (req, res) => {
      try {
        const { txid } = req.body;
        const result = await this.tronTools.getTransactionConfirmationStatusTool().execute({ txid });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/usdt-balance', async (req, res) => {
      try {
        const { address, usdtContractAddress } = req.body;
        const result = await this.tronTools.getUsdtBalanceTool().execute({ address, usdtContractAddress });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/build-unsigned-trx-transfer', async (req, res) => {
      try {
        const { fromAddress, toAddress, amountTrx } = req.body;
        const result = await this.tronTools.buildUnsignedTrxTransferTool().execute({
          fromAddress,
          toAddress,
          amountTrx,
        });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/build-unsigned-trc20-transfer', async (req, res) => {
      try {
        const { fromAddress, contractAddress, toAddress, amountRaw, feeLimitSun } = req.body;
        const result = await this.tronTools.buildUnsignedTrc20TransferTool().execute({
          fromAddress,
          contractAddress,
          toAddress,
          amountRaw,
          feeLimitSun,
        });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 TRON MCP Server is running on port ${this.port}`);
      console.log(`📚 API Documentation: http://localhost:${this.port}/api-tools`);
      console.log(`🌐 Health Check: http://localhost:${this.port}/health`);
      console.log(`⚡ MCP Endpoint: http://localhost:${this.port}/mcp`);
    });
  }
}

export default TronMCPServer;
