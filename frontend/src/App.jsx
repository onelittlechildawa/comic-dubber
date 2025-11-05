import { useState, useRef } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState(null);

  const fileInputRef = useRef(null);

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
      <h1>Comic Dubber AI</h1>
      <p>Upload a comic strip image and let AI dub it for you.</p>

      <div className="controls-container">
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
        />
        <button onClick={() => fileInputRef.current.click()}>
          {selectedFile ? "Change Image" : "Select Image"}
        </button>
        
        <button onClick={handleDubClick} disabled={!selectedFile || isLoading}>
          {isLoading ? 'Dubbing...' : 'Dub it!'}
        </button>
      </div>

      {previewUrl && (
        <img src={previewUrl} alt="Selected comic preview" className="image-preview" />
      )}

      {audioSrc && (
        <audio controls src={audioSrc}>
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}

export default App;