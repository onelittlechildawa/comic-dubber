# API 本地测试指南

## 快速开始

### 1. 安装依赖

```bash
cd /Users/onelittlechild/Desktop/soul/api
npm install
```

### 2. 配置环境变量

复制 `.env.example` 并创建 `.env` 文件:

```bash
cp ../.env.example ../.env
```

然后编辑 `.env` 文件，填入你的 Gemini API Key:

```
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. 启动开发服务器

```bash
npm run dev
```

你应该会看到:

```
✨ 开发服务器已启动！
📡 地址: http://localhost:3000

可用的API端点:
  POST http://localhost:3000/api/draw-comic
  POST http://localhost:3000/api/chat
  GET  http://localhost:3000/health
```

### 4. 测试API

在另一个终端窗口运行:

```bash
# 测试所有API
npm test

# 或测试特定API
node test-apis.js draw-comic
node test-apis.js chat
```

## API端点说明

### POST /api/draw-comic

生成漫画图片。

**请求体:**
```json
{
  "prompt": "一只可爱的小猫在玩耍"
}
```

**响应:**
```json
{
  "imageUri": "data:image/png;base64,..."
}
```

**测试命令:**
```bash
curl -X POST http://localhost:3000/api/draw-comic \
  -H "Content-Type: application/json" \
  -d '{"prompt":"一只可爱的小猫"}'
```

### POST /api/chat

聊天和修改文本。

**请求体:**
```json
{
  "messages": [
    { "role": "user", "content": "请把文字改得更有趣" }
  ],
  "currentText": "Male: 你好\nFemale: 你好啊"
}
```

**响应:**
```json
{
  "text": "{\"reply\":\"好的，我来帮你改得更有趣\",\"updatedText\":\"Male: 嘿！\\nFemale: 嗨呀！\"}"
}
```

**测试命令:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "改得更有趣"}],
    "currentText": "Male: 你好\nFemale: 你好啊"
  }'
```

### GET /health

健康检查端点。

**响应:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-14T07:47:42.000Z"
}
```

## 使用Postman或其他工具测试

### 使用浏览器开发者工具

1. 打开浏览器，按 F12 打开开发者工具
2. 切换到 Console 标签
3. 粘贴以下代码并运行:

**测试 draw-comic:**
```javascript
fetch('http://localhost:3000/api/draw-comic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '一只可爱的小猫' })
})
.then(r => r.json())
.then(data => console.log(data))
```

**测试 chat:**
```javascript
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: '改得更有趣' }],
    currentText: 'Male: 你好\nFemale: 你好啊'
  })
})
.then(r => r.json())
.then(data => {
  console.log('原始响应:', data);
  console.log('解析后:', JSON.parse(data.text));
})
```

## 调试技巧

### 查看日志

服务器会在控制台输出详细的日志:

```
[Draw] Using prompt: "一只可爱的小猫"
[Chat] Using API key: AIzaSyAb...
```

### 常见问题

**问题: `GEMINI_API_KEY is not set`**
- 解决: 确保 `.env` 文件存在且配置了 API Key

**问题: 连接失败**
- 解决: 确保开发服务器正在运行 (`npm run dev`)

**问题: API返回500错误**
- 解决: 检查API Key是否有效，查看服务器日志了解详细错误

## 目录结构

```
api/
├── dev-server.js      # 本地开发服务器
├── test-apis.js       # API测试脚本
├── draw-comic.js      # 漫画生成API
├── chat.js            # 聊天API
├── extract-text.js    # 文本提取API
├── generate-audio.js  # 音频生成API
└── package.json       # 依赖配置
```
