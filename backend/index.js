const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const serverless = require('serverless-http');

// --- Basic Setup ---
const app = express();
app.use(cors());

// --- Google AI Setup ---
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const ttsModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-tts' });

// --- Multer Setup for Image Uploads ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- API Endpoint ---
app.post('/api/dub', upload.single('comicImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image file uploaded.');
  }

  console.log('Image received. Extracting text with Gemini 2.5 Flash...');

  try {
    // 1. Get text from the comic image
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };
    const visionPrompt = "Read the following comic image and extract the text from the speech bubbles in the correct reading order. Only return the text content, with each bubble's text on a new line. Do not add any extra commentary or formatting.";
    
    const visionResult = await visionModel.generateContent([visionPrompt, imagePart]);
    const extractedText = visionResult.response.text();

    if (!extractedText || extractedText.trim() === '') {
      console.log('Gemini did not return any text.');
      return res.status(500).send('Could not extract any text from the image.');
    }

    console.log('Extracted Text:', extractedText);
    console.log('Synthesizing audio with Gemini 2.5 TTS...');

    // 2. Convert the extracted text to speech
    const ttsResponse = await ttsModel.generateContent({
        contents: [{ parts: [{ text: extractedText }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' }, // You can change the voice here
                },
            },
        },
    });

    const audioData = ttsResponse.response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioData) {
        console.error('TTS response did not contain audio data.');
        return res.status(500).send('Failed to generate audio.');
    }

    console.log('Audio synthesized. Sending to client.');
    res.json({
      audio: audioData,
      mimeType: 'audio/wav',
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('An error occurred while processing the comic.');
  }
});

// --- Serverless Handler ---
module.exports.handler = serverless(app);
