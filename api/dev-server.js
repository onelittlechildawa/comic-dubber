const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GoogleGenAI, setDefaultBaseUrls } = require('@google/genai');
const { config: loadEnv } = require('dotenv');

// 加载环境变量 - 从项目根目录加载
loadEnv({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// 配置自定义API URL（如果有）
if (process.env.GENAI_API_BASE_URL) {
    setDefaultBaseUrls({ geminiUrl: process.env.GENAI_API_BASE_URL });
}

// 验证API Key
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
}

const apiKeys = process.env.GEMINI_API_KEY.split(',').map(key => key.trim()).filter(key => key.length > 0);
console.log(`Loaded ${apiKeys.length} API key(s)`);

function getRandomApiKey() {
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
}

// Multer 配置
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ============================================
// API 路由
// ============================================

// 1. 绘制漫画 API
app.post('/api/draw-comic', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).send('Prompt is required.');

    const selectedApiKey = getRandomApiKey();
    const client = new GoogleGenAI({ apiKey: selectedApiKey });

    console.log(`[Draw] Using prompt: "${prompt}"`);

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `A 4-panel comic strip about: ${prompt}. Cartoon style, flat colors, clear outlines, with proper ENGLISH dialogue.`,
        });

        const part = response.candidates?.[0]?.content?.parts;

        // console.log(part);
        if (!part) {
            throw new Error('No image generated (no inlineData found)');
        }
        const base64Image = part?.[1]?.inlineData?.data;
        const dataUri = `data:image/png;base64,${base64Image}`;
        res.json({ imageUri: dataUri });

    } catch (error) {
        console.error('[Draw] Error:', error);
        res.status(500).send('Failed to generate comic.');
    }
});

// 2. 聊天 / 修改文本 API
app.post('/api/chat', async (req, res) => {
    const { messages, currentText } = req.body;

    const selectedApiKey = getRandomApiKey();
    const genAI = new GoogleGenAI({ apiKey: selectedApiKey });
    console.log(`[Chat] Using API key: ${selectedApiKey.substring(0, 8)}...`);

    try {
        const systemPrompt = `
You are a helpful assistant helping a user edit comic scripts.
A Chinese user wants to modify the following comic text:
"""
${currentText}
"""

Your goal is to:
1. Understand the user's request.
2. Modify the comic text accordingly.
3. Return the response ONLY in JSON format with two fields,no \`\`\`json:
   - "reply": A short conversational reply to the user.
   - "updatedText": The full modified comic text (keeping the Male/Female format).

If the user just says "hello" or asks a question unrelated to the text, just reply and keep "updatedText" same as original.
`;

        const chatContents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
        ];

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatContents,
            config: { responseMimeType: 'application/json' }
        });

        const extractedText = response.text;
        if (!extractedText) throw new Error('No text extracted');

        res.json({ text: extractedText });
        console.info(extractedText);

    } catch (error) {
        console.error('[Chat] Error:', error);
        res.status(500).send('Failed to process chat.');
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 列出所有可用的API端点
app.get('/', (req, res) => {
    res.json({
        message: 'Comic Dubber API 本地测试服务器',
        endpoints: [
            { method: 'POST', path: '/api/draw-comic', description: '生成漫画图片' },
            { method: 'POST', path: '/api/chat', description: '聊天和文本修改' },
            { method: 'GET', path: '/health', description: '健康检查' },
        ]
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✨ 开发服务器已启动！`);
    console.log(`📡 地址: http://localhost:${PORT}`);
    console.log(`\n可用的API端点:`);
    console.log(`  POST http://localhost:${PORT}/api/draw-comic`);
    console.log(`  POST http://localhost:${PORT}/api/chat`);
    console.log(`  GET  http://localhost:${PORT}/health\n`);
});
