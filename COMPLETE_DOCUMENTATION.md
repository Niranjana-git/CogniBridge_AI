# CogniBridge AI Documentation

## Overview

CogniBridge AI is a classroom support app with live transcription, text-to-speech, AI tutor support, and reading tools.

## Core Modules

- `index.html`: main classroom interface
- `reader.html`: reader-focused interface
- `js/speech.js`: speech recognition logic
- `js/tts.js`: text-to-speech logic
- `js/chatbot.js`: AI tutor logic
- `js/reader.js`: PDF/text reading logic
- `js/app.js`: shared app state and UI controls
- `tools/verify_system.py`: lightweight local verification script

## User Flow

1. Start a session from the main interface.
2. Capture live transcript text from speech input.
3. Use text-to-speech for playback of typed or transcribed content.
4. Use AI Tutor to ask questions, summarize, or quiz from the transcript.
5. Upload files for reading support.

## Accessibility Features

- adjustable font size
- contrast and theme controls
- dyslexia mode
- keyboard-friendly browser UI

## Verification

Run:

```bash
python tools/verify_system.py
```

This checks that the main app files are present and readable.

## Local Config

- Keep the public Gemini placeholder in `js/config.js`.
- Store your real Gemini key in `js/config.local.js`.
- Add Firebase web app config in `js/firebase.local.js` if you want Firestore-backed Query Center storage.
