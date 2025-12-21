/**
 * Custom hook for Deepgram WebSocket streaming transcription
 * Handles connection, audio streaming, and transcript parsing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Connection state type
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// Deepgram transcription response types
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramResponse {
  type: 'Results' | 'Metadata' | 'UtteranceEnd' | 'SpeechStarted';
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: DeepgramChannel;
}

interface UseDeepgramReturn {
  connectionState: ConnectionState;
  error: string | null;
  interimTranscript: string;
  finalTranscript: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (audioData: ArrayBuffer) => void;
  clearTranscript: () => void;
}

// Deepgram API configuration - simpler params for debugging
const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen';

export function useDeepgram(): UseDeepgramReturn {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Connect to Deepgram WebSocket API
   */
  const connect = useCallback(async () => {
    try {
      setConnectionState('connecting');
      setError(null);

      // Get API key from Tauri backend (secure)
      const apiKey = await invoke<string>('get_deepgram_api_key');
      
      console.log('API key retrieved, length:', apiKey?.length);

      // Build WebSocket URL with parameters
      const params = new URLSearchParams({
        model: 'nova-2',
        language: 'en',
        smart_format: 'true',
        interim_results: 'true',
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
      });
      
      // Include API key directly in URL for browser WebSocket (no header support)
      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      console.log('Connecting to Deepgram WebSocket...');

      // Create WebSocket - try with Authorization in subprotocol first
      let ws: WebSocket;
      try {
        // Method 1: Use token subprotocol (Deepgram's documented approach)
        ws = new WebSocket(wsUrl, ['token', apiKey]);
      } catch (e) {
        console.log('Subprotocol failed, trying direct connection...');
        // Method 2: Fallback - some browsers may not support subprotocol auth
        const urlWithKey = `wss://api.deepgram.com/v1/listen?${params.toString()}&token=${apiKey}`;
        ws = new WebSocket(urlWithKey);
      }
      
      websocketRef.current = ws;
      
      // Set binary type for audio data
      ws.binaryType = 'arraybuffer';

      // Handle connection opened
      ws.onopen = () => {
        console.log('Deepgram WebSocket connected successfully!');
        setConnectionState('connected');
        setError(null);
      };

      // Handle incoming messages (transcriptions)
      ws.onmessage = (event) => {
        try {
          const response: DeepgramResponse = JSON.parse(event.data);

          if (response.type === 'Results' && response.channel) {
            const alternative = response.channel.alternatives[0];
            if (alternative) {
              const transcript = alternative.transcript;

              if (response.is_final) {
                // Final result - append to final transcript
                if (transcript.trim()) {
                  setFinalTranscript(prev => {
                    const separator = prev && !prev.endsWith(' ') ? ' ' : '';
                    return prev + separator + transcript;
                  });
                  setInterimTranscript('');
                }
              } else {
                // Interim result - show as preview
                setInterimTranscript(transcript);
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse Deepgram response:', parseError);
        }
      };

      // Handle errors
      ws.onerror = (event) => {
        console.error('Deepgram WebSocket error:', event);
        setError('WebSocket connection error. Please check your internet connection.');
        setConnectionState('error');
      };

      // Handle connection closed
      ws.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', event.code, event.reason);
        
        if (event.code === 1000) {
          // Normal closure
          setConnectionState('disconnected');
        } else if (event.code === 1008) {
          // Policy violation (usually auth error)
          setError('Authentication failed. Please check your Deepgram API key.');
          setConnectionState('error');
        } else if (event.code === 1011) {
          // Server error
          setError('Deepgram server error. Please try again later.');
          setConnectionState('error');
        } else {
          // Unexpected closure
          setError(`Connection closed unexpectedly (code: ${event.code})`);
          setConnectionState('error');
        }
        
        websocketRef.current = null;
      };

    } catch (err) {
      console.error('Failed to connect to Deepgram:', err);
      
      if (err instanceof Error && err.message.includes('DEEPGRAM_API_KEY')) {
        setError('API key not configured. Please set DEEPGRAM_API_KEY in your .env file.');
      } else {
        setError(`Failed to connect: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      setConnectionState('error');
    }
  }, []);

  /**
   * Disconnect from Deepgram WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (websocketRef.current) {
      websocketRef.current.close(1000, 'User stopped recording');
      websocketRef.current = null;
    }

    setConnectionState('disconnected');
    setInterimTranscript('');
  }, []);

  /**
   * Send audio data to Deepgram
   * @param audioData - PCM audio data as ArrayBuffer
   */
  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(audioData);
    }
  }, []);

  /**
   * Clear all transcripts
   */
  const clearTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    error,
    interimTranscript,
    finalTranscript,
    connect,
    disconnect,
    sendAudio,
    clearTranscript,
  };
}
