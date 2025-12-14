# 本地API测试 - 快速指南

## 🎉 已完成设置

你的API本地测试环境已经配置完成并且测试通过！

## 🚀 快速开始

### 启动开发服务器

```bash
cd /Users/onelittlechild/Desktop/soul/api
npm run dev
```

你将看到:
```
✨ 开发服务器已启动！
📡 地址: http://localhost:3000
```

### 运行测试

在另一个终端运行:

```bash
cd /Users/onelittlechild/Desktop/soul/api

# 测试所有API
npm test

# 测试特定API
node test-apis.js chat
node test-apis.js draw-comic
```

## ✅ 当前测试结果

所有API测试已通过：
- ✅ `/api/chat` - 聊天和文本修改
- ✅ `/api/draw-comic` - 漫画生成

## 📝 使用浏览器测试

打开浏览器开发者工具（F12），在控制台运行：

### 测试聊天API：
```javascript
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '请把文字改得更有趣' }],
    currentText: 'Male: 你好\nFemale: 你好啊'
  })
})
.then(r => r.json())
.then(data => {
  console.log('API响应:', data);
  console.log('解析后:', JSON.parse(data.text));
})
```

### 测试漫画生成API：
```javascript
fetch('http://localhost:3000/api/draw-comic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '一只可爱的小猫在玩耍' })
})
.then(r => r.json())
.then(data => console.log('生成的图片:', data.imageUri))
```

## 📂 相关文件

- [`dev-server.js`](file:///Users/onelittlechild/Desktop/soul/api/dev-server.js) - 本地开发服务器
- [`test-apis.js`](file:///Users/onelittlechild/Desktop/soul/api/test-apis.js) - 自动化测试脚本
- [`README.md`](file:///Users/onelittlechild/Desktop/soul/api/README.md) - 完整文档

## 💡 调试技巧

服务器日志会显示详细信息：
```
[Chat] Using API key: AIzaSyAb...
[Draw] Using prompt: "一只可爱的小猫"
```

## 🛠️ 常见问题

**问题：API返回500错误**
- 检查 `.env` 文件中的 `GEMINI_API_KEY` 是否有效
- 查看服务器终端的错误日志

**问题：连接失败**
- 确保开发服务器正在运行：`npm run dev`
- 检查端口3000是否被占用

## 下一步

现在你可以：
1. 继续开发和测试其他API端点（如 `extract-text.js`, `generate-audio.js`）
2. 连接前端应用到本地API进行集成测试
3. 根据需要修改API逻辑并实时测试

查看 [`api/README.md`](file:///Users/onelittlechild/Desktop/soul/api/README.md) 了解更多详细信息。
