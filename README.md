# Zeno

**Think beyond the obvious.**

Zeno is an early-stage, general-purpose AI assistant for asking questions, exploring ideas, working with supported files, writing, and coding. It includes a Windows desktop app and local Offline Notes.

## Windows desktop app

The Windows installer has been built and tested locally. The goal is to let everyday users install Zeno without separately installing Node.js. Node.js is still needed on a developer computer to build the app.

### Build the Windows installer

1. Install Node.js 22 or newer (LTS recommended).
2. Download and extract this repository.
3. Open a terminal in the Zeno project folder (the folder containing `package.json`).
4. Install dependencies with `npm install`.
5. Run `npm run desktop` to launch the Electron app during development.
6. Run `npm run dist:win` to create the Windows installer in the `dist` folder.

On Windows PowerShell, if `npm` is blocked by the script execution policy, use `npm.cmd` instead (for example, `npm.cmd run dist:win`). If npm reports that it cannot find `package.json`, first change the terminal to the project folder.

The generated installer is named `Zeno Setup 0.3.0.exe`. Treat it as an early-stage build, not a finished public release.

## Run the web version locally

1. Install Node.js 22 or newer.
2. Copy `.env.example` to a new file named `.env`.
3. Add your provider key: `OPENAI_API_KEY=` or `GEMINI_API_KEY=`.
4. Run `npm start` in the Zeno folder.
5. Open `http://127.0.0.1:3000` in your browser.

Do not open `index.html` directly; AI chat requires the local server.

## Current features

- **Offline Notes:** create, edit, and delete notes; notes are stored locally on this device and remain available after closing and reopening the desktop app.
- Notes do not require an API key or internet connection.
- Responsive chat interface with dark/light themes.
- Model selection for configured OpenAI and Google Gemini credentials.
- Server-side AI requests; keys are not sent to browser JavaScript.
- Supported image, PDF, text, and code attachments.
- Short conversation context while the page remains open.

**Note storage limitation:** Offline Notes are local to this app profile on this computer. They are not synced to other devices or automatically backed up. Removing app data may remove saved notes, so keep separate copies of anything important.

## Current limitations

- Easy in-app API-key settings are not implemented yet.
- A hosted Zeno cloud service is not implemented yet.
- AI chat still needs an OpenAI or Google Gemini API key configured for the server, or a separately configured compatible local AI setup.
- Chat history is not saved to a database yet.

## Security and costs

- Never commit `.env` or put API keys in browser files.
- Never paste an API key into a chat or send it to anyone.
- Provider API usage may have limits or costs. Check provider terms and usage, and ask a parent/guardian for help before enabling billing.
- The server binds to `127.0.0.1` by default. Do not deploy it publicly until authentication, request limits, and usage controls are added.

## Roadmap

- [x] Create the interface and server-side provider requests
- [x] Add an initial Electron desktop shell and Windows installer configuration
- [x] Build and test a Windows installer locally
- [x] Add local offline notes and verify notes persist after restarting the desktop app
- [ ] Add easy in-app personal API-key settings
- [ ] Add a hosted cloud backend with authentication and usage limits
- [ ] Add persistent chat history and automated tests

## License

No license has been selected yet.
