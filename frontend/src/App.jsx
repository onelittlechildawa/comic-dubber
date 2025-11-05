import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);

  const fileInputRef = useRef(null);

  // 默认 demo 图片路径（放在 public 目录下）
  const DEMO_IMAGE_PATH = '/demo.webp';

  // 组件加载时设置默认图片
  useEffect(() => {
    loadDemoImage();
  }, []);

  // 加载默认示例图片
  const loadDemoImage = async () => {
    try {
      const response = await fetch(DEMO_IMAGE_PATH);
      const blob = await response.blob();
      const file = new File([blob], 'demo.webp', { type: blob.type });
      setSelectedFile(file);
      setPreviewUrl(DEMO_IMAGE_PATH);
    } catch (error) {
      console.error('Failed to load demo image:', error);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAudioSrc(null); // Reset audio on new file selection
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDubClick = async () => {
    if (!selectedFile) {
      alert('Please select an image file first.');
      return;
    }

    setIsLoading(true);
    setAudioSrc(null);

    const formData = new FormData();
    formData.append('comicImage', selectedFile);

    try {
      const response = await fetch('/api/dub', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      if (!data.audioDataUri) {
        throw new Error('Server did not return audio data.');
      }
      const audioUrl = `${data.audioDataUri}`;
      setAudioSrc(audioUrl);

    } catch (error) {
      console.error('Error dubbing comic:', error);
      alert(`Failed to dub the comic. ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>AI 配音你的漫画！</h1>
      <p>请让我们来给你的漫画配音！</p>

      <div className="controls-container">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
        />
        <button onClick={() => fileInputRef.current.click()}>
          {selectedFile ? "更换漫画" : "Select Image"}
        </button>
        
        <button onClick={loadDemoImage}>
          Use Demo Image
        </button>
        
        <button onClick={handleDubClick} disabled={!selectedFile || isLoading}>
          {isLoading ? '配音中...请等待大约 30-60 秒...' : '开始配音！'}
        </button>
      </div>

      {audioSrc && (
        <audio controls src={audioSrc}>
          Your browser does not support the audio element.
        </audio>
      )}
      
      {previewUrl && (
        <img src={previewUrl} alt="Selected comic preview" className="image-preview" />
      )}

      
    </div>
  );
}

export default App;