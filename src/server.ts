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
      :root {
        --bg0: #0b1020;
        --bg1: #0d1b2a;
        --card: rgba(17,24,39,.72);
        --border: rgba(148,163,184,.18);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --good: #34d399;
        --bad: #fb7185;
        --accent: #7c3aed;
        --accent2: #06b6d4;
      }
      * { box-sizing: border-box; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        margin: 0;
        color: var(--text);
        background:
          radial-gradient(800px 400px at 20% -10%, rgba(124,58,237,.45), transparent 60%),
          radial-gradient(700px 350px at 110% 10%, rgba(6,182,212,.35), transparent 60%),
          linear-gradient(180deg, var(--bg0), var(--bg1));
        min-height: 100vh;
      }
      .container { max-width: 980px; margin: 0 auto; padding: 28px 18px 64px; }
      .header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
      .title { font-size: 20px; font-weight: 750; letter-spacing: .2px; }
      .subtitle { color: var(--muted); font-size: 13px; margin-top: 6px; line-height: 1.4; }
      .meta { text-align: right; color: var(--muted); font-size: 12px; }
      .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin: 12px 0; backdrop-filter: blur(10px); }
      .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      button {
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid rgba(148,163,184,.25);
        background: linear-gradient(135deg, rgba(124,58,237,.92), rgba(6,182,212,.86));
        color: white;
        cursor: pointer;
        font-weight: 650;
      }
      button.secondary { background: rgba(255,255,255,.06); border: 1px solid rgba(148,163,184,.25); color: var(--text); }
      button:disabled { opacity: 0.45; cursor: not-allowed; }
      textarea {
        width: 100%;
        min-height: 190px;
        background: rgba(2,6,23,.55);
        border: 1px solid rgba(148,163,184,.25);
        border-radius: 14px;
        padding: 10px 12px;
        color: var(--text);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono";
        font-size: 12px;
      }
      pre { background: rgba(2,6,23,.55); border: 1px solid rgba(148,163,184,.22); border-radius: 14px; padding: 12px; overflow: auto; }
      .muted { color: var(--muted); font-size: 12px; line-height: 1.45; }
      .ok { color: var(--good); }
      .err { color: var(--bad); }
      code { background: rgba(148,163,184,.12); padding: 2px 6px; border-radius: 8px; }
      a { color: #60a5fa; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .stepper { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
      .step { padding: 8px 10px; border-radius: 999px; border: 1px solid rgba(148,163,184,.22); color: var(--muted); font-size: 12px; display: flex; align-items: center; gap: 8px; }
      .step .dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(148,163,184,.35); }
      .step.done { color: var(--text); border-color: rgba(52,211,153,.25); }
      .step.done .dot { background: rgba(52,211,153,.9); }
      .step.active { color: var(--text); border-color: rgba(124,58,237,.35); }
      .step.active .dot { background: rgba(124,58,237,.9); }
      .step.error { color: var(--bad); border-color: rgba(251,113,133,.35); }
      .step.error .dot { background: rgba(251,113,133,.9); }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; margin-top: 10px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .meta { text-align: left; } .header { flex-direction: column; align-items: flex-start; } }
      .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(148,163,184,.22); color: var(--muted); font-size: 12px; }
      .pill.good { border-color: rgba(52,211,153,.25); color: var(--good); }
      .pill.bad { border-color: rgba(251,113,133,.25); color: var(--bad); }
      .pill.spin::before { content: ''; width: 10px; height: 10px; border-radius: 999px; border: 2px solid rgba(148,163,184,.35); border-top-color: rgba(124,58,237,.9); display: inline-block; animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .hint { background: rgba(124,58,237,.10); border: 1px solid rgba(124,58,237,.25); border-radius: 14px; padding: 10px 12px; }
      .txidBox { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
      .txidBox .label { color: var(--muted); font-size: 12px; }
      .txidBig { font-size: 14px; font-weight: 750; letter-spacing: .2px; }
      .next { margin-top: 12px; border-top: 1px solid rgba(148,163,184,.18); padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div>
          <div class="title">TRON MCP · TronLink 签名/广播</div>
          <div class="subtitle">AI 交易助手 Demo：构建未签名交易 → TronLink 弹窗签名/广播 → 用 TXID 通过 MCP 确认交易状态</div>
        </div>
        <div class="meta">
          <div>Network: <code id="netLabel"></code></div>
          <div class="muted">Server: <code id="serverOrigin"></code></div>
        </div>
      </div>

      <div class="card">
        <div class="stepper" id="stepper">
          <div class="step active" data-step="connect"><span class="dot"></span>1 连接钱包</div>
          <div class="step" data-step="tx"><span class="dot"></span>2 加载交易</div>
          <div class="step" data-step="sign"><span class="dot"></span>3 签名</div>
          <div class="step" data-step="broadcast"><span class="dot"></span>4 广播</div>
          <div class="step" data-step="confirm"><span class="dot"></span>5 确认</div>
        </div>

        <div class="row">
          <button id="btnConnect" class="secondary">连接 TronLink</button>
          <button id="btnReload" class="secondary" disabled>重新加载交易</button>
          <button id="btnSign" disabled>签名交易</button>
          <button id="btnBroadcast" disabled>广播交易</button>
          <button id="btnCheck" class="secondary" disabled>查询确认状态</button>
        </div>

        <div class="grid">
          <div class="muted">当前账户：<code id="addr">未连接</code></div>
          <div class="muted">FullNode：<code id="fullnode">-</code></div>
          <div class="muted">自动填充：<span id="autofill" class="pill">未开始</span></div>
          <div class="muted">预期 From：<code id="expectedFrom">-</code></div>
        </div>

        <div id="preview" class="hint" style="margin-top:12px; display:none;">
          <div style="font-weight:750; margin-bottom:8px;">交易预览</div>
          <div class="muted">From: <code id="pFrom"></code></div>
          <div class="muted">To: <code id="pTo"></code></div>
          <div class="muted">Amount: <code id="pAmount"></code></div>
          <div class="muted">Unsigned TxID: <code id="pUnsignedTxid"></code></div>
          <div id="warnFromMismatch" class="muted" style="margin-top:8px;"></div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">未签名交易 JSON</h3>
        <p class="muted">
          推荐：直接打开 MCP 工具返回的 <code>tronlinkSignUrl</code>（短参数模式，如 <code>?type=trx&amp;from=...&amp;to=...&amp;amountTrx=1</code>），页面会自动从本地服务构建并填充。
          <br/>
          兼容：仍支持 <code>?tx=base64url(JSON)</code>，但 URL 被聊天窗口截断会导致解析失败。
        </p>
        <textarea id="unsignedTx" placeholder="{ ... }"></textarea>
      </div>

      <div class="card" id="txCard" style="display:none;">
        <h3 style="margin-top:0;">交易已广播</h3>
        <div class="txidBox">
          <div class="label">TXID</div>
          <code id="txid" class="txidBig">-</code>
          <button id="btnCopyTxid" class="secondary">复制 TXID</button>
          <a id="tronscanLink" href="#" target="_blank" rel="noreferrer">在 TronScan 查看</a>
        </div>
        <div class="next">
          <div style="font-weight:750; margin-bottom:8px;">下一步（回到 Claude Desktop 用 MCP 确认）</div>
          <ol class="muted" style="margin:0; padding-left:18px;">
            <li>复制上面的 <code>TXID</code></li>
            <li>回到 Claude Desktop：让 Claude 调用 <code>get_transaction_confirmation_status</code>，参数为这个 txid</li>
          </ol>
          <pre id="mcpSnippet" class="muted" style="margin-top:10px; white-space:pre-wrap;"></pre>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">日志</h3>
        <pre id="out" class="muted" style="white-space:pre-wrap; margin:0;"></pre>
      </div>
    </div>

    <script>
      const tronscanTxBaseUrl = ${JSON.stringify(tronscanTxBaseUrl)};
      const tronNetworkLabel = ${JSON.stringify(process.env.TRON_NETWORK || 'mainnet')};
      const tronBaseUrl = ${JSON.stringify(process.env.TRON_BASE_URL || 'https://api.trongrid.io')};

      let signedTx = null;
      let broadcastTxid = null;
      let intent = null; // { type, ... }

      const $ = (id) => document.getElementById(id);

      function log(obj, isError=false) {
        const out = document.getElementById('out');
        out.className = isError ? 'err' : 'muted';
        out.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
      }

      function setPill(state, text) {
        const pill = $('autofill');
        if (!pill) return;
        pill.className = 'pill';
        if (state === 'loading') pill.classList.add('spin');
        if (state === 'ok') pill.classList.add('good');
        if (state === 'error') pill.classList.add('bad');
        pill.textContent = text;
      }

      function setStep(stepKey, status) {
        const steps = document.querySelectorAll('.stepper .step');
        steps.forEach((s) => {
          if (s.getAttribute('data-step') !== stepKey) return;
          s.classList.remove('active', 'done', 'error');
          if (status) s.classList.add(status);
        });
      }

      function updateButtons() {
        const connected = !!(window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58);
        const txLoaded = !!window.__unsignedTx;
        const expectedFrom = intent && intent.from ? intent.from : null;
        const connectedAddr = connected ? window.tronWeb.defaultAddress.base58 : null;
        const fromOk = !expectedFrom || !connectedAddr || expectedFrom === connectedAddr;

        $('btnReload').disabled = !intent;
        $('btnSign').disabled = !(connected && txLoaded && fromOk);
        $('btnBroadcast').disabled = !(connected && !!signedTx);
        $('btnCheck').disabled = !broadcastTxid;
      }

      function renderPreview() {
        const preview = $('preview');
        if (!preview || !intent || !window.__unsignedTx) {
          if (preview) preview.style.display = 'none';
          return;
        }
        preview.style.display = 'block';

        $('expectedFrom').textContent = intent.from || '-';
        $('pFrom').textContent = intent.from || '-';
        $('pTo').textContent = intent.to || '-';
        $('pAmount').textContent =
          intent.type === 'trx'
            ? (intent.amountTrx + ' TRX')
            : (intent.amountRaw + ' (raw)');
        $('pUnsignedTxid').textContent = window.__unsignedTx.txID || window.__unsignedTx.txid || '-';

        const warn = $('warnFromMismatch');
        const connectedAddr = window.tronWeb && window.tronWeb.defaultAddress ? window.tronWeb.defaultAddress.base58 : null;
        if (connectedAddr && intent.from && connectedAddr !== intent.from) {
          warn.className = 'muted err';
          warn.innerHTML =
            '⚠️ 当前 TronLink 账户 <code>' +
            connectedAddr +
            '</code> 与交易 From <code>' +
            intent.from +
            '</code> 不一致。请切换 TronLink 到正确账户后再签名。';
        } else {
          warn.className = 'muted';
          warn.textContent = '';
        }

        updateButtons();
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

      async function prefillFromServer(endpoint, body, type) {
        try {
          intent = {
            type,
            from: body.fromAddress,
            to: body.toAddress,
            amountTrx: body.amountTrx,
            contract: body.contractAddress,
            amountRaw: body.amountRaw,
          };

          // reset state
          signedTx = null;
          broadcastTxid = null;
          $('txCard').style.display = 'none';

          setPill('loading', '加载中');
          setStep('tx', 'active');
          log({ status: '正在从本地服务生成未签名交易...', endpoint, request: body }, false);
          updateButtons();

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
            throw new Error('服务端响应缺少 unsignedTransaction');
          }

          window.__unsignedTx = data.unsignedTransaction;
          $('unsignedTx').value = JSON.stringify(window.__unsignedTx, null, 2);

          setPill('ok', '已加载');
          setStep('tx', 'done');
          $('btnReload').disabled = false;
          log('✅ 未签名交易已自动填充。下一步：连接 TronLink → 签名 → 广播。', false);
          renderPreview();
        } catch (e) {
          setPill('error', '失败');
          setStep('tx', 'error');
          log(String(e && e.message ? e.message : e), true);
        }
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
        setStep('connect', 'done');
        if (window.__unsignedTx) setStep('tx', 'done');
        log('✅ 已连接 TronLink。', false);
        renderPreview();
      }

      async function signTx() {
        const tx = getUnsignedTx();
        if (!window.tronWeb) throw new Error('TronLink 未连接');
        setStep('sign', 'active');
        signedTx = await window.tronWeb.trx.sign(tx);
        document.getElementById('btnBroadcast').disabled = false;
        setStep('sign', 'done');
        log('✅ 已签名。下一步：点击“广播交易”。', false);
        updateButtons();
      }

      async function broadcastTx() {
        if (!signedTx) throw new Error('请先签名交易');
        setStep('broadcast', 'active');
        const result = await window.tronWeb.trx.sendRawTransaction(signedTx);
        const txid = result && (result.txid || result.txID);
        if (txid) {
          broadcastTxid = txid;
          setStep('broadcast', 'done');
          setStep('confirm', 'active');

          $('txCard').style.display = 'block';
          $('txid').textContent = txid;
          $('tronscanLink').href = tronscanTxBaseUrl + txid;
          $('mcpSnippet').textContent =
            'Tool: get_transaction_confirmation_status\\nArguments: {\"txid\":\"' +
            txid +
            '\"}\\n\\n' +
            '提示词示例：请调用 MCP 工具 get_transaction_confirmation_status，txid = ' +
            txid;

          log({ broadcastResult: result, next: '复制 TXID → 回到 Claude Desktop 调用 get_transaction_confirmation_status' }, false);
          updateButtons();
        } else {
          log({ broadcastResult: result }, false);
        }
      }

      async function checkConfirmation() {
        if (!broadcastTxid) throw new Error('请先广播交易以获得 txid');
        setStep('confirm', 'active');
        log({ status: '正在查询确认状态...', txid: broadcastTxid }, false);
        const resp = await fetch('/api/transaction-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txid: broadcastTxid }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error((data && data.error) ? data.error : ('HTTP ' + resp.status));
        if (data && data.confirmed) setStep('confirm', 'done');
        log({ confirmation: data }, false);
      }

      async function copyTxid() {
        if (!broadcastTxid) return;
        try {
          await navigator.clipboard.writeText(broadcastTxid);
          log('✅ 已复制 TXID。回到 Claude Desktop 调用 get_transaction_confirmation_status 即可确认交易。', false);
        } catch (e) {
          log('复制失败，请手动复制 TXID。', true);
        }
      }

      document.getElementById('btnConnect').addEventListener('click', async () => {
        try { await connectTronLink(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnReload').addEventListener('click', async () => {
        try {
          if (!intent) throw new Error('没有可重载的交易意图（请从 tronlinkSignUrl 进入）');
          if (intent.type === 'trx') {
            await prefillFromServer('/api/build-unsigned-trx-transfer', { fromAddress: intent.from, toAddress: intent.to, amountTrx: intent.amountTrx }, 'trx');
          } else if (intent.type === 'trc20') {
            await prefillFromServer('/api/build-unsigned-trc20-transfer', { fromAddress: intent.from, toAddress: intent.to, contractAddress: intent.contract, amountRaw: intent.amountRaw }, 'trc20');
          }
        } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnSign').addEventListener('click', async () => {
        try { await signTx(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnBroadcast').addEventListener('click', async () => {
        try { await broadcastTx(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnCheck').addEventListener('click', async () => {
        try { await checkConfirmation(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });
      document.getElementById('btnCopyTxid').addEventListener('click', async () => {
        try { await copyTxid(); } catch (e) { log(String(e && e.message ? e.message : e), true); }
      });

      // Prefill tx from URL
      (function prefill() {
        $('netLabel').textContent = tronNetworkLabel + ' · ' + tronBaseUrl;
        $('serverOrigin').textContent = window.location.origin;

        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');

        // New short-link mode: build unsigned tx from server using query params
        if (type === 'trx') {
          const from = params.get('from');
          const to = params.get('to');
          const amountTrx = params.get('amountTrx');
          if (from && to && amountTrx) {
            $('expectedFrom').textContent = from;
            prefillFromServer('/api/build-unsigned-trx-transfer', { fromAddress: from, toAddress: to, amountTrx }, 'trx');
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
            $('expectedFrom').textContent = from;
            prefillFromServer('/api/build-unsigned-trc20-transfer', {
              fromAddress: from,
              toAddress: to,
              contractAddress: contract,
              amountRaw,
              feeLimitSun: feeLimitSun ? Number(feeLimitSun) : undefined,
            }, 'trc20');
            return;
          }
        }

        const tx = params.get('tx');
        if (!tx) {
          setPill('idle', '未开始');
          log('未检测到自动填充参数：请使用 MCP 返回的 tronlinkSignUrl（推荐），或粘贴 unsignedTransaction JSON。', false);
          return;
        }
        try {
          setPill('loading', '解析中');
          setStep('tx', 'active');
          const json = decodeBase64UrlToText(tx);
          document.getElementById('unsignedTx').value = json;
          try {
            window.__unsignedTx = JSON.parse(json);
            setPill('ok', '已加载');
            setStep('tx', 'done');
            log('✅ 已从 ?tx 参数加载未签名交易。下一步：连接 TronLink → 签名 → 广播。', false);
          } catch (e) {
            setPill('error', '失败');
            setStep('tx', 'error');
            log('tx 参数解码成功但不是合法 JSON：很可能 URL 被截断，请回到 Claude 重新复制完整的 tronlinkSignUrl。', true);
          }
        } catch (e) {
          setPill('error', '失败');
          setStep('tx', 'error');
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

    // === Optional Extensions ===
    // Complex query enhancement
    this.app.post('/api/analyze-account-activity', async (req, res) => {
      try {
        const { address, txLimit, tokenLimit, includeRaw } = req.body;
        const result = await this.tronTools.analyzeAccountActivityTool().execute({
          address,
          txLimit,
          tokenLimit,
          includeRaw,
        });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // On-chain security monitoring (TRONSCAN labels)
    this.app.post('/api/address-labels', async (req, res) => {
      try {
        const { address, includeRaw } = req.body;
        const result = await this.tronTools.getAddressLabelsTool().execute({ address, includeRaw });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/address-risk', async (req, res) => {
      try {
        const { address } = req.body;
        const result = await this.tronTools.assessAddressRiskTool().execute({ address });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/transfer-risk', async (req, res) => {
      try {
        const { fromAddress, toAddress, contractAddress } = req.body;
        const result = await this.tronTools.assessTransferRiskTool().execute({
          fromAddress,
          toAddress,
          contractAddress,
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
