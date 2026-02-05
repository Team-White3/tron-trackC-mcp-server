#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const WALLET_ADDRESS = process.env.TEST_WALLET_ADDRESS || 'TTAUuT3Mjwwp17FGZk2LyDQMwCu6opvfyq';

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

    // 测试获取最新区块事件信息
    console.log('\n3. 测试获取最新区块事件信息:');
    const latestBlockResponse = await axios.get(`${BASE_URL}/api/latest-block`);

    if (latestBlockResponse.data.error) {
      console.log('⚠️  获取最新区块事件信息失败:', latestBlockResponse.data.error);
    } else {
      const latestEvent = latestBlockResponse.data.data?.[0];
      console.log('✅ 最新区块事件信息获取成功');
      console.log(`   区块高度: ${latestEvent?.block_number || 'N/A'}`);
      console.log(`   区块时间: ${latestEvent?.block_timestamp || 'N/A'}`);
    }

    // 测试账户相关接口
    console.log('\n4. 测试账户信息:');
    const accountInfoResponse = await axios.post(`${BASE_URL}/api/account-info`, {
      address: WALLET_ADDRESS
    });
    console.log('✅ 账户信息获取成功');
    console.log(`   地址: ${WALLET_ADDRESS}`);

    console.log('\n5. 测试账户交易历史:');
    const txResponse = await axios.post(`${BASE_URL}/api/account-transactions`, {
      address: WALLET_ADDRESS,
      limit: 10
    });
    console.log(`✅ 交易历史获取成功, 条数: ${(txResponse.data?.length || 0)}`);

    console.log('\n6. 测试账户TRC20余额:');
    const tokenResponse = await axios.post(`${BASE_URL}/api/account-tokens`, {
      address: WALLET_ADDRESS,
      limit: 10
    });
    console.log(`✅ TRC20余额获取成功, 条数: ${(tokenResponse.data?.length || 0)}`);

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
