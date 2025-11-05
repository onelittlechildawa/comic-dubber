const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const { config: loadEnv } = require('dotenv');

// --- Basic Setup ---
const app = express();
app.use(cors());

// --- Google AI Setup with Multiple API Keys ---
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in the environment variables.');
}

// 解析多个 API 密钥（支持逗号分隔）
const apiKeys = process.env.GEMINI_API_KEY.split(',').map(key => key.trim()).filter(key => key.length > 0);

if (apiKeys.length === 0) {
  throw new Error('No valid GEMINI_API_KEY found.');
}

console.log(`Loaded ${apiKeys.length} API key(s)`);

// 随机选择一个 API 密钥
function getRandomApiKey() {
  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
}

// --- Multer Setup for Image Uploads ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 工具函数：在内存中创建 WAV 文件 Buffer ---
/**
 * 在内存中创建完整的 WAV 文件 Buffer
 * @param {Buffer} pcmData - 原始 PCM 音频数据
 * @returns {Promise<Buffer>} - 完整的 WAV 文件 Buffer
 */
async function createWaveBuffer(
    pcmData,
    channels = 1,
    rate = 24000,
    sampleWidth = 2, // 16-bit = 2 bytes
) {
    return new Promise((resolve, reject) => {
        // 1. 创建一个 PassThrough 流来捕获 wav.FileWriter 的输出
        const outputStream = new PassThrough();
        const chunks = [];

        outputStream.on('data', (chunk) => chunks.push(chunk));
        outputStream.on('finish', () => {
            // 2. 流结束时，合并所有块，得到完整的 WAV 文件 Buffer
            resolve(Buffer.concat(chunks));
        });
        outputStream.on('error', reject);

        // 3. 创建 wav.FileWriter，将其输出管道连接到内存流
        const writer = new wav.Writer({
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
        });

        writer.pipe(outputStream);

        // 4. 写入原始 PCM 数据
        writer.write(pcmData);
        writer.end();
    });
}

async function saveWaveFile(
   filename,
   pcmData,
   channels = 1,
   rate = 24000,
   sampleWidth = 2,
) {
   return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filename, {
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      writer.write(pcmData);
      writer.end();
   });
}


// --- API Endpoint ---
app.post('/api/dub', upload.single('comicImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No image file uploaded.');
  }

  // 为本次请求随机选择一个 API 密钥
  const selectedApiKey = getRandomApiKey();
  const genAI = new GoogleGenAI({ apiKey: selectedApiKey });
  console.log(`Using API key: ${selectedApiKey.substring(0, 8)}...`);

  console.log('Image received. Extracting text with Gemini 2.5 Flash...');

  try {
    // 1. Get text from the comic image (Vision part remains the same)
    const visionPrompt = `
Read the following comic image and extract the text from the speech bubbles in the correct reading order.

IMPORTANT FORMAT REQUIREMENTS:
- Every sentence MUST start with either "Male:" or "Female:" prefix to indicate the speaker
- Identify the gender of each speaker based on visual cues in the comic
- Maintain the natural reading order of the comic panels

Optional enhancements:
- You should add emotion tags where appropriate: [sigh] [laugh] [uhm] [gasp] [whisper]
- You should add brief emotion/tone directions in brackets, e.g., (cheerfully), (sadly), (angrily)

Example output format:
Male: Hi there! How are you doing?
Female: (cheerfully) I'm doing great, thanks for asking![laugh]
Male: [sigh] That's good to hear...

Remember: EVERY line must start with "Male:" or "Female:"`;

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

    if (!extractedText || extractedText.trim() === '') {
      console.log('Gemini did not return any text.');
      return res.status(500).send('Could not extract any text from the image.');
    }

    console.log('Extracted Text:', extractedText);
    console.log('Synthesizing audio with Gemini 2.5 TTS...');

    // 2. Convert the extracted text to speech (TTS part remains the same)
    const ttsContents = [{ parts: [{ text: extractedText }] }];
    const ttsResponse = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: ttsContents,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                    {
                        speaker: 'Male',
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Fenrir' }
                        }
                    },
                    {
                        speaker: 'Female',
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Leda' }
                        }
                    }
              ]
            }
        },
      },
    });
    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioData || !audioData.data) {
        console.error('TTS response did not contain audio data.');
        return res.status(500).send('Failed to generate audio.');
    }
    
    // 3. 【关键修改】将原始 PCM 数据转换为完整的 WAV Data URI
    
    // Base64 解码原始 PCM 数据
    const rawPcmData = Buffer.from(audioData.data, 'base64');
    
    // 在内存中生成带有 WAV 头的完整文件 Buffer
    const waveFileBuffer = await createWaveBuffer(rawPcmData);
    // await saveWaveFile('output.wav', rawPcmData);
    // 将完整的 WAV Buffer 转换为 Base64 字符串
    const base64Audio = waveFileBuffer.toString('base64');

    // 构建 Data URI 字符串
    const dataUri = `data:audio/wav;base64,${base64Audio}`;

    console.log('Audio synthesized and converted to WAV Data URI. Sending to client.');
    
    // 4. 将 Data URI 发送回客户端
    res.json({
      // 客户端可以直接使用这个字符串作为 <audio> 标签的 src
      audioDataUri: dataUri, 
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('An error occurred while processing the comic.');
  }
});

// --- Vercel Serverless Function Handler ---
// Vercel 需要默认导出一个函数
module.exports = async (req, res) => {
  // 让 Express 应用处理请求
  return app(req, res);
};

// -----------------------------------------------------------------------
// 注意：如果您本地测试，请取消注释以下代码：
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });