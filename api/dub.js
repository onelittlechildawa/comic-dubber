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
- Add emotion tags where appropriate: [sigh] [laugh] etc.
- Add brief emotion/tone directions in brackets: (cheerfully) etc.

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
      model: 'gemini-2.5-flash',
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

// 2. Chat / Modify Text
app.post('/api/chat', async (req, res) => {
  const { messages, currentText } = req.body;
  // messages: [{ role: 'user'|'model', content: '...' }]
  // currentText: string (the current state of the comic text)

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

// 3. Generate Audio
app.post('/api/generate-audio', async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).send('No text provided.');

  const selectedApiKey = getRandomApiKey();
  const genAI = new GoogleGenAI({ apiKey: selectedApiKey });
  console.log(`[TTS] Using API key: ${selectedApiKey.substring(0, 8)}...`);

  try {
    const ttsContents = [{ parts: [{ text: text }] }];
    const ttsResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: ttsContents,
      config: {
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
//   console.log(`Server is running on port ${PORT}`);
// });