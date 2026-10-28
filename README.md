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

**On-device AI:** Zeno includes a small local model, so chat works without an API key or paid provider. The first local chat downloads the model (about 0.9 GB) and caches it on this computer; later chats run locally. An internet connection is needed for that first download. OpenAI and Gemini remain optional for stronger hosted models and image/PDF understanding.

## Run the web version locally

1. Installation Node.js 22 or newer.
2. (Optional) Copy `.env.example` to a new file named `.env` and add an OpenAI or Gemini API key for hosted models.
3. Run `npm start` in the Zeno folder.
4. Open http://127.0.0.1:3000 in your browser. The on-device model is available without a key and downloads the first time you chat.

Do not open `index.html` directly; AI chat requires the local server.

## Current features

- Responsive chat interface with dark/light themes
- No-key on-device AI, plus optional OpenAI and Google Gemini models
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


