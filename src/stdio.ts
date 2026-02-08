/*
 * @Author: fx-k admin@fxit.top
 * @Date: 2026-02-08 11:46:00
 * @LastEditors: fx-k admin@fxit.top
 * @LastEditTime: 2026-02-08 11:46:02
 * @FilePath: /tron-trackC-mcp-server/src/stdio.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import "dotenv/config";
import { TronTools } from "./tronTools";

// NOTE: We intentionally `require()` MCP SDK modules to avoid TypeScript
// type-checker OOM issues in some environments when importing the SDK types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

async function main() {
  const config = {
    apiKey: process.env.TRON_API_KEY || "",
    network: (process.env.TRON_NETWORK as "mainnet" | "testnet" | "nile") || "mainnet",
    baseUrl: process.env.TRON_BASE_URL || "https://api.trongrid.io",
  };

  const server = new McpServer({ name: "tron-mcp-server", version: "1.0.0" });
  new TronTools(config).registerMcpTools(server);

  // 注意：stdio 模式不要 console.log（会污染协议输出）
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});