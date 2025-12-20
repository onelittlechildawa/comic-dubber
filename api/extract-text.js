const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI, setDefaultBaseUrls } = require('@google/genai');
const { config: loadEnv } = require('dotenv');
const wav = require('wav');
const { PassThrough } = require('stream');

loadEnv();

// --- Basic Setup ---
const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing

if (process.env.GENAI_API_BASE_URL) {
    setDefaultBaseUrls({ geminiUrl: process.env.GENAI_API_BASE_URL });
}

// --- Google AI Setup with Multiple API Keys ---
if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}

const apiKeys = process.env.GEMINI_API_KEY.split(',').map(key => key.trim()).filter(key => key.length > 0);

if (apiKeys.length === 0) {
    throw new Error('No valid GEMINI_API_KEY found.');
}

console.log(`Loaded ${apiKeys.length} API key(s)`);

function getRandomApiKey() {
    const randomIndex = Math.floor(Math.random() * apiKeys.length);
    return apiKeys[randomIndex];
}

// --- Multer Setup for Image Uploads ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Helper Functions ---

async function createWaveBuffer(pcmData, channels = 1, rate = 24000, sampleWidth = 2) {
    return new Promise((resolve, reject) => {
        const outputStream = new PassThrough();
        const chunks = [];

        outputStream.on('data', (chunk) => chunks.push(chunk));
        outputStream.on('finish', () => resolve(Buffer.concat(chunks)));
        outputStream.on('error', reject);

        const writer = new wav.Writer({
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
        });

        writer.pipe(outputStream);
        writer.write(pcmData);
        writer.end();
    });
}

// --- API Endpoints ---

// 1. Extract Text
app.post('/api/extract-text', upload.single('comicImage'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No image file uploaded.');
    }

    const selectedApiKey = getRandomApiKey();
    const genAI = new GoogleGenAI({ apiKey: selectedApiKey });
    console.log(`[Extract] Using API key: ${selectedApiKey.substring(0, 8)}...`);

    try {
        const visionPrompt = `
Read the following comic image and extract the text from the speech bubbles in the correct reading order.
Use the original language in the comic.
IMPORTANT FORMAT REQUIREMENTS:
- Every sentence MUST start with either "Male:" or "Female:" prefix to indicate the speaker.
- Identify the gender of each speaker based on visual cues.
- Maintain the natural reading order.
- Add more emotion tags where appropriate: [sigh] [laugh] etc.
- Add more brief emotion/tone directions in brackets: (cheerfully) etc.

Example output:
Male: Hi there!
Female: (cheerfully) I'm doing great! [laugh]
`;

        const visionContents = [
            {
                inlineData: {
                    data: req.file.buffer.toString('base64'),
                    mimeType: req.file.mimetype,
                },
            },
            { text: visionPrompt },
        ];

        const visionResponse = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: visionContents,
        });

        const extractedText = visionResponse.text;
        if (!extractedText) throw new Error('No text extracted');

        res.json({ text: extractedText });

    } catch (error) {
        console.error('[Extract] Error:', error);
        res.status(500).send('Failed to extract text.');
    }
});


// --- Vercel Handler ---
module.exports = async (req, res) => {
    return app(req, res);
};

// --- Local Dev Server ---
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });