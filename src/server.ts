import express from 'express';
import cors from 'cors';
import { MCPServer, MCPTool, MCPResource } from './mcp/types';
import { TronTools } from './tronTools';
import { TronConfig } from './types';

class TronMCPServer {
  private app: express.Application;
  private port: number;
  private mcpServer: MCPServer;
  private tronTools: TronTools;

  constructor(config: TronConfig, port: number = 3000) {
    this.app = express();
    this.port = port;
    this.tronTools = new TronTools(config);
    this.mcpServer = new MCPServer();
    
    this.initializeMiddleware();
    this.initializeMCPServer();
    this.initializeRoutes();
  }

  private initializeMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeMCPServer() {
    const tools = this.tronTools.getAllTools();
    tools.forEach((tool) => {
      this.mcpServer.registerTool(tool);
      console.log(`Registered tool: ${tool.name}`);
    });
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

    this.app.post('/mcp/execute', async (req, res) => {
      try {
        const { toolName, inputs } = req.body;
        const result = await this.mcpServer.executeTool(toolName, inputs);
        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    });

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
        const { address } = req.body;
        const result = await this.tronTools.getAccountTokensTool().execute({ address });
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
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 TRON MCP Server is running on port ${this.port}`);
      console.log(`📚 API Documentation: http://localhost:${this.port}/api-tools`);
      console.log(`🌐 Health Check: http://localhost:${this.port}/health`);
      console.log(`⚡ MCP Endpoint: http://localhost:${this.port}/mcp/execute`);
    });
  }
}

export default TronMCPServer;
