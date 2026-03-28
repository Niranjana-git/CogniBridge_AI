# Quick Start

## What This App Does

CogniBridge AI helps with:

- live speech-to-text transcription
- speech-to-sign translation
- text-to-speech playback
- AI study assistance
- reading uploaded PDF and text files

## Run It

1. Open the project with a local static server or deploy it as a static site.
2. Open `index.html` in a Chromium-based browser.
3. Add your Gemini API key in `js/config.js` if you want AI tutor features.

## Main Workflow

1. Start a classroom session.
2. Use speech-to-text to capture the transcript.
3. Watch the Sign Translator panel render matched ISL signs or fingerspelled letters.
4. Read the transcript aloud with text-to-speech if needed.
5. Ask the AI tutor for summaries, quizzes, or key points.
6. Upload study material in the Reader tab when needed.

## Troubleshooting

- If speech recognition does not start, check microphone permissions.
- If sign output looks empty, make sure `ISL_Gifs/`, `letters/`, and `data/isl-manifest.json` are present.
- If AI tutor fails, verify the API key in `js/config.js`.
- If PDF reading fails, confirm the file is a supported PDF or text file.
