# CogniBridge AI

CogniBridge AI is a browser-based classroom assistant with live transcription, speech-to-sign translation, text-to-speech, AI Tutor support, and reading tools.

## Features

- Live speech-to-text transcription for classroom sessions
- Speech-to-sign translation using imported ISL GIF and letter assets
- Text-to-speech for custom text and transcript playback
- AI tutor tools for summaries, quizzes, and key points
- PDF and text reader for study materials
- Accessibility controls for themes, contrast, font size, and dyslexia mode

## Tech Stack

- HTML, CSS, JavaScript
- Web Speech API
- Web Speech Synthesis API
- Imported ISL GIF and alphabet assets
- Google Gemini API
- PDF.js

## Setup

1. Open the project in a local static server or deploy it as a static site.
2. Keep `js/config.js` public-safe and add your local Gemini API key in `js/config.local.js`.
3. Add your Firebase web app config in `js/firebase.local.js` if you want Firestore-backed Query Center storage.
4. Use a Chromium-based browser for the best speech support.

## Structure

```text
CogniBridge_AI/
|-- index.html
|-- reader.html
|-- css/
|-- js/
|-- assets/
|-- data/
`-- tools/
```

## Notes

- Speech features depend on browser support and microphone permissions.
- PDF reading is handled client-side in the browser.
