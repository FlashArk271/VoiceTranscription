/**
 * Custom hook for audio recording using Web Audio API
 * Captures PCM audio and provides it as ArrayBuffer chunks for streaming
 */

import { useState, useCallback, useRef } from 'react';

// Recording state type
export type RecordingState = 'idle' | 'requesting' | 'recording' | 'error';

// Audio configuration for Deepgram
const SAMPLE_RATE = 16000; // 16kHz sample rate for speech recognition
const BUFFER_SIZE = 4096;  // Size of audio buffer chunks

interface UseAudioRecorderReturn {
  state: RecordingState;
  error: string | null;
  startRecording: (onAudioData: (data: ArrayBuffer) => void) => Promise<void>;
  stopRecording: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Refs to hold audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  /**
   * Start recording audio from the microphone
   * @param onAudioData - Callback function that receives PCM audio data chunks
   */
  const startRecording = useCallback(async (onAudioData: (data: ArrayBuffer) => void) => {
    try {
      setState('requesting');
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,           // Mono audio
          sampleRate: SAMPLE_RATE,   // 16kHz for speech
          echoCancellation: true,    // Reduce echo
          noiseSuppression: true,    // Reduce background noise
          autoGainControl: true,     // Normalize volume
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context with target sample rate
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      // Create source from microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create script processor for raw PCM access
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // AudioWorklet would be the modern alternative
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      // Process audio data
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM 16-bit)
        // Deepgram expects linear16 encoding
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp values to [-1, 1] and scale to 16-bit range
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Send PCM data to callback
        onAudioData(pcmData.buffer);
      };

      // Connect the audio graph: microphone -> processor -> destination
      source.connect(processor);
      processor.connect(audioContext.destination);

      setState('recording');
    } catch (err) {
      console.error('Failed to start recording:', err);
      
      // Handle specific error types
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Microphone permission denied. Please allow access in your browser settings.');
            break;
          case 'NotFoundError':
            setError('No microphone found. Please connect a microphone and try again.');
            break;
          case 'NotReadableError':
            setError('Microphone is already in use by another application.');
            break;
          default:
            setError(`Microphone error: ${err.message}`);
        }
      } else {
        setError('Failed to access microphone. Please try again.');
      }
      
      setState('error');
    }
  }, []);

  /**
   * Stop recording and clean up resources
   */
  const stopRecording = useCallback(() => {
    // Disconnect and clean up processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setState('idle');
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
  };
}
