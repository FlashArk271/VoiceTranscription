# 🎙️ SubSpace Voice

A clean, minimal, production-ready **Voice-to-Text Desktop Application** built with Tauri + React + Deepgram.

Push-to-talk voice transcription with real-time streaming - a functional clone of Wispr Flow's core workflow.



## ✨ Features

- **Push-to-Talk Recording** - Press and hold to record, release to stop
- **Real-Time Transcription** - Live streaming via Deepgram WebSocket API
- **Low Latency** - Immediate feedback with interim results
- **Secure API Key Storage** - Keys stored in environment, never exposed to frontend
- **Cross-Platform** - Runs on macOS, Windows, and Linux
- **Clean UI** - Minimal, focused interface with visual recording feedback

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SubSpace Voice                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │   React UI  │◄──►│  Web Audio   │───►│  Deepgram WS API  │  │
│  │  (Frontend) │    │   Capture    │    │  (Speech-to-Text) │  │
│  └─────────────┘    └──────────────┘    └───────────────────┘  │
│         │                                          ▲            │
│         ▼                                          │            │
│  ┌─────────────┐                                   │            │
│  │ Tauri Core  │───────────────────────────────────┘            │
│  │   (Rust)    │  Secure API Key Management                     │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| Desktop Shell | Tauri 2.0 (Rust) | Native app wrapper, secure key storage |
| Frontend | React + TypeScript | UI components, state management |
| Audio Capture | Web Audio API | Microphone access, PCM conversion |
| Transcription | Deepgram Nova-2 | Real-time speech-to-text streaming |
| Styling | Pure CSS | Minimal, responsive design |

### Key Files

```
subspace-voice/
├── src/                      # React frontend
│   ├── App.tsx              # Main app component
│   ├── App.css              # Styling
│   └── hooks/
│       ├── useAudioRecorder.ts  # Microphone & PCM capture
│       └── useDeepgram.ts       # WebSocket streaming
├── src-tauri/               # Rust backend
│   └── src/
│       └── lib.rs           # Secure API key commands
├── .env.example             # Environment template
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18+)
2. **Rust** (latest stable) - [Install Rust](https://www.rust-lang.org/tools/install)
3. **Tauri Prerequisites** - [Platform-specific setup](https://tauri.app/start/prerequisites/)
4. **Deepgram API Key** - [Get free API key](https://console.deepgram.com/)

### Installation

```bash
# Clone/navigate to the project
cd subspace-voice

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Deepgram API key to .env
# DEEPGRAM_API_KEY=your_actual_api_key_here
```

### Running the App

```bash
# Development mode (with hot reload)
npm run tauri dev

# Build for production
npm run tauri build
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Required: Your Deepgram API key
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Deepgram Settings

The following Deepgram parameters are configured in `src/hooks/useDeepgram.ts`:

| Parameter | Value | Description |
|-----------|-------|-------------|
| model | nova-2 | Latest, most accurate model |
| language | en | English language |
| smart_format | true | Auto-punctuation and formatting |
| interim_results | true | Show results while speaking |
| sample_rate | 16000 | 16kHz audio quality |

## 📖 How It Works

### 1. Push-to-Talk Flow

```
User Press → Connect WebSocket → Start Mic → Stream Audio → Show Transcription
User Release → Stop Mic → Close WebSocket → Display Final Text
```

### 2. Audio Processing Pipeline

1. **Microphone Access** - Request permission, get MediaStream
2. **Audio Context** - Create Web Audio context at 16kHz
3. **Script Processor** - Capture raw Float32 audio data
4. **PCM Conversion** - Convert to Int16 (linear16) format
5. **WebSocket Stream** - Send chunks to Deepgram in real-time

### 3. Security Model

- API key stored in environment variable
- Tauri backend reads key securely
- Frontend requests key via IPC command
- Key never hardcoded or bundled

## 🔒 Security Considerations

| Aspect | Implementation |
|--------|----------------|
| API Key Storage | Environment variable, loaded by Rust backend |
| Key Access | Tauri command (IPC), not exposed in JS bundle |
| CSP Policy | Strict, only allows Deepgram WebSocket domain |
| Audio Data | Processed locally, streamed only to Deepgram |

## 🛠️ Development

### Project Scripts

```bash
npm run dev        # Start Vite dev server
npm run build      # Build frontend
npm run tauri dev  # Run Tauri in development
npm run tauri build # Build production app
```

### Tech Stack

- **Frontend Framework**: React 19
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 7
- **Desktop Framework**: Tauri 2.0
- **Backend Language**: Rust (2021 edition)
- **Speech API**: Deepgram Nova-2

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "API Key not configured" | Create `.env` file with `DEEPGRAM_API_KEY` |
| "Microphone permission denied" | Allow mic access in system settings |
| "WebSocket error" | Check internet connection, verify API key |
| Rust not found | Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

### Debug Mode

Enable detailed logging in the browser console:
- Open DevTools in the Tauri window
- Check Console tab for WebSocket and audio processing logs

## 📝 License

MIT License - feel free to use this in your projects!

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Cross-platform desktop framework
- [Deepgram](https://deepgram.com/) - Excellent speech-to-text API
- [Wispr Flow](https://wispr.ai/) - Inspiration for the UX
