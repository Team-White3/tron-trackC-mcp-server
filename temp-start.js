
const TronMCPServer = require('./dist/server').default;
require('dotenv/config');

const config = {
  apiKey: process.env.TRON_API_KEY || '',
  network: process.env.TRON_NETWORK || 'mainnet',
  baseUrl: process.env.TRON_BASE_URL || 'https://api.trongrid.io',
};

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log('🚀 TRON MCP Server Configuration:');
console.log('   API Key:', config.apiKey ? 'Set' : 'Not Set');
console.log('   Network:', config.network);
console.log('   Base URL:', config.baseUrl);
console.log('   Port:', port);

try {
  const server = new TronMCPServer(config, port);
  server.start();
  
  console.log('✅ Server started successfully');
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
