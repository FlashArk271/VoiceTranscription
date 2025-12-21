/**
 * SubSpace Voice - Voice-to-Text Desktop Application
 * Main application component with push-to-talk functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAudioRecorder, RecordingState } from './hooks/useAudioRecorder';
import { useDeepgram, ConnectionState } from './hooks/useDeepgram';
import './App.css';

function App() {
  // Check if API key is configured
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState<boolean | null>(null);
  
  // Recording state from audio hook
  const { 
    state: recordingState, 
    error: recordingError, 
    startRecording, 
    stopRecording 
  } = useAudioRecorder();

  // Deepgram transcription state
  const {
    connectionState,
    error: deepgramError,
    interimTranscript,
    finalTranscript,
    connect,
    disconnect,
    sendAudio,
    clearTranscript,
  } = useDeepgram();

  // Check API key on mount
  useEffect(() => {
    async function checkApiKey() {
      try {
        const configured = await invoke<boolean>('is_api_key_configured');
        setIsApiKeyConfigured(configured);
      } catch {
        setIsApiKeyConfigured(false);
      }
    }
    checkApiKey();
  }, []);

  // Combined error message
  const errorMessage = recordingError || deepgramError;

  // Check if currently recording
  const isRecording = recordingState === 'recording' && connectionState === 'connected';
  const isStarting = recordingState === 'requesting' || connectionState === 'connecting';

  /**
   * Handle push-to-talk button press (start recording)
   */
  const handleStartRecording = useCallback(async () => {
    if (isRecording || isStarting) return;

    // Connect to Deepgram first
    await connect();
    
    // Start audio capture and stream to Deepgram
    await startRecording((audioData) => {
      sendAudio(audioData);
    });
  }, [isRecording, isStarting, connect, startRecording, sendAudio]);

  /**
   * Handle push-to-talk button release (stop recording)
   */
  const handleStopRecording = useCallback(() => {
    stopRecording();
    disconnect();
  }, [stopRecording, disconnect]);

  /**
   * Get status text for UI display
   */
  const getStatusText = (): string => {
    if (errorMessage) return 'Error';
    if (isStarting) return 'Connecting...';
    if (isRecording) return 'Recording...';
    return 'Ready';
  };

  /**
   * Get status indicator class
   */
  const getStatusClass = (): string => {
    if (errorMessage) return 'status-error';
    if (isRecording) return 'status-recording';
    if (isStarting) return 'status-connecting';
    return 'status-idle';
  };

  // Show API key setup message if not configured
  if (isApiKeyConfigured === false) {
    return (
      <main className="container">
        <div className="setup-message">
          <h1>🎙️ SubSpace Voice</h1>
          <div className="error-box">
            <h2>⚠️ API Key Required</h2>
            <p>To use SubSpace Voice, you need to configure your Deepgram API key.</p>
            <ol>
              <li>Get a free API key from <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer">console.deepgram.com</a></li>
              <li>Create a <code>.env</code> file in the project root</li>
              <li>Add: <code>DEEPGRAM_API_KEY=your_key_here</code></li>
              <li>Restart the application</li>
            </ol>
          </div>
        </div>
      </main>
    );
  }

  // Show loading while checking API key
  if (isApiKeyConfigured === null) {
    return (
      <main className="container">
        <div className="loading">
          <h1>🎙️ SubSpace Voice</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      {/* Header */}
      <header className="header">
        <h1>🎙️ SubSpace Voice</h1>
        <p className="subtitle">Push-to-talk voice transcription</p>
      </header>

      {/* Status Indicator */}
      <div className={`status-indicator ${getStatusClass()}`}>
        <span className="status-dot"></span>
        <span className="status-text">{getStatusText()}</span>
      </div>

      {/* Error Display */}
      {errorMessage && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Push-to-Talk Button */}
      <div className="ptt-container">
        <button
          className={`ptt-button ${isRecording ? 'recording' : ''} ${isStarting ? 'starting' : ''}`}
          onMouseDown={handleStartRecording}
          onMouseUp={handleStopRecording}
          onMouseLeave={handleStopRecording}
          onTouchStart={handleStartRecording}
          onTouchEnd={handleStopRecording}
          disabled={!!errorMessage && !isRecording}
          aria-label={isRecording ? 'Release to stop recording' : 'Press and hold to record'}
        >
          <span className="ptt-icon">{isRecording ? '🔴' : '🎤'}</span>
          <span className="ptt-label">
            {isStarting ? 'Connecting...' : isRecording ? 'Recording...' : 'Hold to Talk'}
          </span>
        </button>
        <p className="ptt-hint">Press and hold to record, release to stop</p>
      </div>

      {/* Transcription Display */}
      <div className="transcription-container">
        <div className="transcription-header">
          <h2>Transcription</h2>
          {(finalTranscript || interimTranscript) && (
            <button className="clear-button" onClick={clearTranscript}>
              Clear
            </button>
          )}
        </div>
        <div className="transcription-box">
          {finalTranscript || interimTranscript ? (
            <>
              <span className="final-text">{finalTranscript}</span>
              {interimTranscript && (
                <span className="interim-text">{interimTranscript}</span>
              )}
            </>
          ) : (
            <span className="placeholder-text">
              Your transcription will appear here...
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>Powered by Deepgram Nova-2</p>
      </footer>
    </main>
  );
}

export default App;

