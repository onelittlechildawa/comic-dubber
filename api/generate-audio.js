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
// 3. Generate Audio
app.post('/api/generate-audio', async (req, res) => {
    const { text } = req.body;

    if (!text) return res.status(400).send('No text provided.');

    const selectedApiKey = getRandomApiKey();
    const genAI = new GoogleGenAI({ apiKey: selectedApiKey });
    console.log(`[TTS] Using API key: ${selectedApiKey.substring(0, 8)}...`);

    console.log(`[TTS] Using text: ${text}`);

    try {
        const ttsContents = [{ parts: [{ text: 'TTS the following conversation between Male and Female, be emotional:' + text }] }];
        const ttsResponse = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: ttsContents,
            config: {
                // systemInstruction: { parts: [{ text: "Please read the following text verbatim. Do not generate text output." }] },
                responseModalities: ['AUDIO'],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Male', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
                            { speaker: 'Female', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Leda' } } }
                        ]
                    }
                },
            },
        });

        const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!audioData || !audioData.data) throw new Error('No audio data');

        const rawPcmData = Buffer.from(audioData.data, 'base64');
        const waveFileBuffer = await createWaveBuffer(rawPcmData);
        const base64Audio = waveFileBuffer.toString('base64');
        const dataUri = `data:audio/wav;base64,${base64Audio}`;

        res.json({ audioDataUri: dataUri });

    } catch (error) {
        console.error('[TTS] Error:', error);
        res.status(500).send('Failed to generate audio.');
    }
});

// --- Vercel Handler ---
module.exports = async (req, res) => {
    return app(req, res);
};

// --- Local Dev Server ---
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${ PORT } `);
// });