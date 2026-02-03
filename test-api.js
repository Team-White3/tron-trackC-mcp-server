#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🔍 测试TRON MCP Server API...');
  console.log('================================');

  try {
    // 测试健康检查
    console.log('\n1. 测试健康检查:');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ 健康状态:', healthResponse.data.status);
    console.log('   时间:', healthResponse.data.timestamp);

    // 测试API工具文档
    console.log('\n2. 测试API工具文档:');
    const toolsResponse = await axios.get(`${BASE_URL}/api-tools`);
    console.log(`✅ 可用工具数量: ${toolsResponse.data.count}`);
    console.log('   工具列表:');
    toolsResponse.data.tools.forEach((tool, index) => {
      console.log(`     ${index + 1}. ${tool.name} - ${tool.description}`);
    });

    // 测试获取TRON官方账户信息
    console.log('\n3. 测试获取TRON官方账户信息:');
    const accountResponse = await axios.post(`${BASE_URL}/api/account-info`, {
      address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    });
    
    if (accountResponse.data.error) {
      console.log('⚠️  获取账户信息失败:', accountResponse.data.error);
    } else {
      console.log('✅ 账户信息获取成功');
      console.log(`   账户地址: ${accountResponse.data.address}`);
      console.log(`   TRX余额: ${(accountResponse.data.balance / 1e6).toFixed(6)} TRX`);
    }

    // 测试MCP执行接口
    console.log('\n4. 测试MCP执行接口:');
    const mcpResponse = await axios.post(`${BASE_URL}/mcp/execute`, {
      toolName: 'get_network_status',
      inputs: {}
    });

    if (mcpResponse.data.success) {
      console.log('✅ MCP执行成功');
      console.log(`   当前区块: ${mcpResponse.data.data.current_block}`);
      console.log(`   总账户数: ${mcpResponse.data.data.total_accounts}`);
      console.log(`   总交易数: ${mcpResponse.data.data.total_transactions}`);
      console.log(`   TPS: ${mcpResponse.data.data.transaction_per_second}`);
    } else {
      console.log('⚠️  MCP执行失败:', mcpResponse.data.error);
    }

    console.log('\n================================');
    console.log('🎉 所有API测试完成！');
    console.log('\n📝 注意: 如果API密钥未配置，部分测试会失败');
    console.log('   请确保已在 .env 文件中配置正确的 TRON_API_KEY');

  } catch (error) {
    console.error('❌ 测试失败:');
    if (error.response) {
      console.error('   状态码:', error.response.status);
      console.error('   响应:');
      console.error(error.response.data);
    } else if (error.request) {
      console.error('   无响应，请检查服务器是否正在运行');
    } else {
      console.error('   错误:', error.message);
    }

    console.log('\n💡 可能的解决方法:');
    console.log('   1. 确保服务器正在运行: npm run dev');
    console.log('   2. 检查 .env 文件中的API密钥配置');
    console.log('   3. 验证TRON API密钥是否有效');
  }
}

testAPI();
