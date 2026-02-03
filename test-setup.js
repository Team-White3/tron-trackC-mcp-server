#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');

console.log('🚀 测试TRON MCP Server...');

// 安装依赖
console.log('📦 安装项目依赖...');
const npmInstall = spawn('npm', ['install'], { stdio: 'inherit' });

npmInstall.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ 依赖安装失败');
    process.exit(1);
  }
  
  console.log('✅ 依赖安装成功');
  
  // 编译TypeScript
  console.log('🔨 编译TypeScript代码...');
  const tsc = spawn('npx', ['tsc', '--noEmit'], { stdio: 'inherit' });
  
  tsc.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ TypeScript编译失败');
      process.exit(1);
    }
    
    console.log('✅ TypeScript编译成功');
    
    // 检查package.json的脚本配置
    const fs = require('fs');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    console.log('📋 项目信息:');
    console.log(`   名称: ${packageJson.name}`);
    console.log(`   版本: ${packageJson.version}`);
    console.log(`   描述: ${packageJson.description}`);
    
    console.log('🔧 可用的npm脚本:');
    Object.keys(packageJson.scripts).forEach((script) => {
      console.log(`   npm run ${script}`);
    });
    
    console.log('\n🎉 TRON MCP Server项目创建成功！');
    console.log('\n📝 下一步：');
    console.log('1. 修改 src/index.ts 中的API密钥');
    console.log('2. 运行 npm run dev 启动开发服务器');
    console.log('3. 访问 http://localhost:3000 查看主页');
    console.log('4. 访问 http://localhost:3000/api-tools 查看API文档');
    
    console.log('\n📚 使用说明:');
    console.log('需要配置TRON API密钥，请访问 https://trongrid.io 获取');
  });
});
