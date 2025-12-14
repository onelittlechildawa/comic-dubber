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
        const response = await client.models.generateImage({
            model: 'gemini-2.5-flash-image',
            prompt: `A 4-panel comic strip about: ${prompt}. Cartoon style, flat colors, clear outlines.`,
            config: {
                number_of_images: 1,
                aspect_ratio: '16:9',
            }
        });

        // The SDK returns a response object with specific data structure
        // Usually response.image.imageBytes (base64) or similar
        // Let's assume standard response format for this SDK

        let base64Image = null;

        if (response && response.image && response.image.imageBytes) {
            base64Image = response.image.imageBytes;
        } else if (response && response.candidates && response.candidates[0]) {
            // Fallback or different structure check
            // Some versions return raw base64 in different content parts
            // But generateImage usually returns wrapper
            console.log("Response structure:", JSON.stringify(Object.keys(response)));
        }

        // If direct image bytes property exists (likely for generateImage)
        if (response.image) {
            base64Image = response.image.imageBytes;
        }

        if (!base64Image) {
            // Logic for checking candidates if typical structure fails
            // But let's rely on the client.models.generateImage returning an object with image data
            // If the SDK returns a GenerateImageResponse, it likely has 'image' or 'images'
            if (response.images && response.images.length > 0) {
                base64Image = response.images[0].imageBytes;
            }
        }

        if (!base64Image) throw new Error('No image generated');

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
