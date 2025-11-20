import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentComicText, setCurrentComicText] = useState('');

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const DEMO_IMAGE_PATH = '/demo.webp';

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
      // Auto-start extraction REMOVED
      // extractText(file); 
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
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToDub }),
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
        <h1>听见你的漫画！</h1>
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
                  <div className="audio-player">
                    <audio controls src={msg.audioUrl} autoPlay />
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