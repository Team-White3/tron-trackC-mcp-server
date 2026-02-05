import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { TronTools } from './tronTools';
import { TronConfig } from './types';

class TronMCPServer {
  private app: express.Application;
  private port: number;
  private tronTools: TronTools;
  private mcpTransports: Record<string, StreamableHTTPServerTransport>;

  constructor(config: TronConfig, port: number = 3000) {
    this.app = createMcpExpressApp();
    // this.app = express();
    this.port = port;
    this.tronTools = new TronTools(config);
    this.mcpTransports = {};

    this.initializeMiddleware();
    this.initializeRoutes();
  }

  private initializeMiddleware() {
    this.app.use(
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

    const transport = this.mcpTransports[sessionId] as StreamableHTTPServerTransport;
    await transport.handleRequest(req, res);
  }

  private async handleMcpDelete(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.mcpTransports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = this.mcpTransports[sessionId] as StreamableHTTPServerTransport;
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
