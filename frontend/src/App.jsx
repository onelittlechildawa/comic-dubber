import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('messages');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentComicText, setCurrentComicText] = useState(() => {
    return localStorage.getItem('currentComicText') || '';
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDrawInput, setShowDrawInput] = useState(false);
  const [drawPrompt, setDrawPrompt] = useState('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [characterVoices, setCharacterVoices] = useState(() => {
    const saved = localStorage.getItem('characterVoices');
    return saved ? JSON.parse(saved) : {
      'Male': 'Fenrir',
      'Female': 'Leda'
    };
  });

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const DEMO_IMAGE_PATH = '/demo.webp';

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist messages and comic text
  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('currentComicText', currentComicText);
  }, [currentComicText]);

  useEffect(() => {
    localStorage.setItem('characterVoices', JSON.stringify(characterVoices));
  }, [characterVoices]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    loadDemoImage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadDemoImage = async () => {
    try {
      const response = await fetch(DEMO_IMAGE_PATH);
      const blob = await response.blob();
      const file = new File([blob], 'demo.webp', { type: blob.type });
      handleFileSelection(file);
    } catch (error) {
      console.error('Failed to load demo image:', error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) handleFileSelection(file);
  };


  const handleFileSelection = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMessages([]); // Reset chat
      setCurrentComicText('');
      setShowDrawInput(false);
    }
  };

  const handleDrawComic = async () => {
    if (!drawPrompt.trim()) return;

    setIsLoading(true);
    addMessage('system', '正在绘制漫画...');

    try {
      const response = await fetch('/api/draw-comic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: drawPrompt })
      });

      if (!response.ok) throw new Error('Drawing failed');

      const data = await response.json();

      // Convert bas64 data URI to a File object
      const res = await fetch(data.imageUri);
      const blob = await res.blob();
      const file = new File([blob], "generated-comic.png", { type: "image/png" });

      handleFileSelection(file);
      addMessage('system', '漫画绘制完成！你可以点击“Start Analysis”来配音。');

    } catch (error) {
      console.error(error);
      addMessage('system', '绘图失败，请重试。');
    } finally {
      setIsLoading(false);
      setDrawPrompt('');
    }
  };

  const extractText = async () => {
    if (!selectedFile) return;

    // Clear previous chat and text
    setMessages([]);
    setCurrentComicText('');

    setIsLoading(true);
    addMessage('system', '分析中...');

    const formData = new FormData();
    formData.append('comicImage', selectedFile);

    try {
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to extract text');

      const data = await response.json();
      setCurrentComicText(data.text);
      addMessage('model', '我已经分析了漫画文本，现在你可以开始修改了。', data.text);
    } catch (error) {
      console.error(error);
      addMessage('system', 'Error extracting text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg = inputMessage;
    setInputMessage('');
    addMessage('user', userMsg);
    setIsLoading(true);

    const newMessages = [...messages, { role: 'user', content: userMsg }];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          currentText: currentComicText
        }),
      });

      if (!response.ok) throw new Error('Chat request failed');

      const responseBody = await response.json();
      let data;
      try {
        data = JSON.parse(responseBody.text);
      } catch (e) {
        console.error("Failed to parse inner JSON", e);
        data = { reply: responseBody.text };
      }
      console.info(data);
      // Update current text if it changed
      if (data.updatedText && data.updatedText !== currentComicText) {
        setCurrentComicText(data.updatedText);
        addMessage('model', data.reply, data.updatedText);
      } else {
        addMessage('model', data.reply);
      }

    } catch (error) {
      console.error(error);
      addMessage('system', 'Error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAudio = async (textToDub) => {
    setIsLoading(true);
    addMessage('system', '生成中...');

    try {
      const voicesConfig = Object.entries(characterVoices).map(([name, voice]) => ({
        speaker: name,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
      }));

      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToDub, voices: voicesConfig }),
      });

      if (!response.ok) throw new Error('Audio generation failed');

      const data = await response.json();
      addMessage('audio', 'Audio generated!', null, data.audioDataUri);

    } catch (error) {
      console.error(error);
      addMessage('system', 'Error generating audio.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (role, content, comicText = null, audioUrl = null) => {
    setMessages(prev => [...prev, { role, content, comicText, audioUrl }]);
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>听见你的漫画！</h1>
          <div className="header-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={theme === 'dark' ? '切换到白天模式' : '切换到夜间模式'}
            >
              {theme === 'dark' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <a
              href="https://github.com/onelittlechildawa/comic-dubber"
              target="_blank"
              rel="noopener noreferrer"
              className="github-link"
              title="View on GitHub"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="image-preview-container">
          {previewUrl ? (
            <img src={previewUrl} alt="Comic Preview" className="preview-image" />
          ) : (
            <div className="placeholder">No Image Selected</div>
          )}
        </div>
        <div className="controls">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          <button onClick={() => fileInputRef.current.click()} className="btn">
            上传新漫画
          </button>

          <button onClick={() => setShowDrawInput(!showDrawInput)} className="btn secondary">
            AI 绘制漫画
          </button>

          <button onClick={() => setShowVoiceSettings(!showVoiceSettings)} className="btn secondary">
            配置角色音色
          </button>

          {showVoiceSettings && (
            <div className="voice-settings-panel">
              <h3>音色配置</h3>
              {Object.entries(characterVoices).map(([char, voice]) => (
                <div key={char} className="voice-setting-item">
                  <label>{char === 'Male' ? '🙋‍♂️ 男声' : char === 'Female' ? '🙋‍♀️ 女声' : char}:</label>
                  <select
                    value={voice}
                    onChange={(e) => setCharacterVoices({ ...characterVoices, [char]: e.target.value })}
                  >
                    <option value="Fenrir">Fenrir (深沉男声)</option>
                    <option value="Leda">Leda (温柔女声)</option>
                    <option value="Aoede">Aoede (清亮女声)</option>
                    <option value="Puck">Puck (活泼男声)</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {showDrawInput && (
            <div className="draw-input-area">
              <textarea
                value={drawPrompt}
                onChange={(e) => setDrawPrompt(e.target.value)}
                placeholder="描述你想画的漫画场景..."
                disabled={isLoading}
              />
              <button onClick={handleDrawComic} disabled={isLoading || !drawPrompt} className="btn small">
                生成
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (currentComicText) {
                // Reset content when ending dubbing
                setMessages([]);
                setCurrentComicText('');
              } else {
                // Start extraction when beginning dubbing
                extractText();
              }
            }}
            className="btn primary"
            disabled={!selectedFile || isLoading}
          >
            {currentComicText ? '配音结束' : '开始配音'}
          </button>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-list">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content && <p>{msg.content}</p>}

                {msg.comicText && (
                  <div className="comic-text-block">
                    <pre>{msg.comicText}</pre>
                    <button
                      className="btn small"
                      onClick={() => handleGenerateAudio(msg.comicText)}
                      disabled={isLoading}
                    >
                      用这个版本配音
                    </button>
                  </div>
                )}

                {msg.audioUrl && (
                  <div className="audio-player-v2">
                    <div className="audio-info">
                      <span className="audio-icon">🎵</span>
                      <span className="audio-label">生成的配音</span>
                    </div>
                    <audio controls src={msg.audioUrl} />
                    <a
                      href={msg.audioUrl}
                      download="comic-dub.wav"
                      className="download-link"
                      title="下载音频"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className="message system"><p>Thinking...</p></div>}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="输入修改意见…… (e.g., 'Translate to Spanish', 'Make it funnier')..."
            disabled={isLoading || !currentComicText}
          />
          <button onClick={handleSendMessage} disabled={isLoading || !currentComicText}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;