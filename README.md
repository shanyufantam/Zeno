# Zeno

**Think beyond the obvious.**

Zeno is an early-stage, general-purpose AI assistant for asking questions, exploring ideas, working with supported files, writing, and coding.

## Windows desktop app

The goal is to let everyday users install Zeno without separately installing Node.js. Building an installer is a developer step, and the installer has **not yet been built or tested**.

On a Windows development computer:

1. Install Node.js 22 or newer (LTS recommended).
2. Download and extract this repository.
3. Open a terminal in the Zeno folder.
4. Run `npm install`.
5. Run `npm run desktop` to launch the desktop app during development.
6. Run `npm run dist:win` to create a Windows installer in the `dist` folder.

**Current limitation:** easy in-app API-key settings and a hosted Zeno cloud service are not implemented yet. AI chat still needs an OpenAI or Google Gemini API key configured for the server. Do not share this as a finished public release yet.

## Run the web version locally

1. Install Node.js 22 or newer.
2. Copy `.env.example` to a new file named `.env`.
3. Add your provider key: `OPENAI_API_KEY=` or `GEMINI_API_KEY=`.
4. Run `npm start` in the Zeno folder.
5. Open http://127.0.0.1:3000 in your browser.

Do not open `index.html` directly; AI chat requires the local server.

## Current features

- Responsive chat interface with dark/light themes
- Model selection for configured OpenAI and Google Gemini credentials
- Server-side AI requests; keys are not sent to browser JavaScript
- Supported image, PDF, text, and code attachments
- Short conversation context while the page remains open

## Security and costs

- Never commit `.env` or put API keys in browser files.
- Never paste an API key into a chat or send it to anyone.
- Provider API usage may have limits or costs. Check provider terms and usage, and ask a parent/guardian for help before enabling billing.
- The server binds to `127.0.0.1` by default. Do not deploy it publicly until authentication, request limits, and usage controls are added.
- Chat history is not saved to a database yet.

## Roadmap

- [x] Create the interface and server-side provider requests
- [x] Add an initial Electron desktop shell and Windows installer configuration
- [ ] Add easy in-app personal API-key settings
- [ ] Build and test a Windows installer
- [ ] Add a hosted cloud backend with authentication and usage limits
- [ ] Add persistent chat history and automated tests

## License

No license has been selected yet.
