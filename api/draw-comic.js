const express = require('express');
const cors = require('cors');
const { GoogleGenAI, setDefaultBaseUrls } = require('@google/genai');
const { config: loadEnv } = require('dotenv');

loadEnv();

// --- Basic Setup ---
const app = express();
app.use(cors());
app.use(express.json());

if (process.env.GENAI_API_BASE_URL) {
    setDefaultBaseUrls({ geminiUrl: process.env.GENAI_API_BASE_URL });
}

// --- API Key Setup ---
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
}

const apiKeys = process.env.GEMINI_API_KEY.split(',').map(key => key.trim()).filter(key => key.length > 0);

function getRandomApiKey() {
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
}

// --- Draw Endpoint ---
app.post('/api/draw-comic', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).send('Prompt is required.');

    const selectedApiKey = getRandomApiKey();
    const client = new GoogleGenAI({ apiKey: selectedApiKey });

    console.log(`[Draw] Using prompt: "${prompt}"`);

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `A 4-panel comic strip about: ${prompt}. Cartoon style, flat colors, clear outlines.`,
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (!part || !part.inlineData || !part.inlineData.data) {
            throw new Error('No image generated (no inlineData found)');
        }

        const base64Image = part.inlineData.data;
        const dataUri = `data:image/png;base64,${base64Image}`;
        res.json({ imageUri: dataUri });

    } catch (error) {
        console.error('[Draw] Error:', error);
        res.status(500).send('Failed to generate comic.');
    }
});

module.exports = async (req, res) => {
    return app(req, res);
};
