# Zeno

**Think beyond the obvious.**

Zeno is an early-stage, general-purpose AI assistant. Its goal is to provide a friendly place to explore ideas, ask questions, work with supported files, write, and code.

## Current features

- Responsive chat interface with dark/light themes
- AI provider/model picker populated from the configured provider credentials
- OpenAI and Google Gemini server-side integrations
- Attach supported images, PDFs, and text/code files
- Short conversation context while the page remains open
- API keys stay on the server and are never sent to browser JavaScript

## Run Zeno locally

You need Node.js 22 or newer. Use a currently supported LTS release.

1. Download and extract this repository, or clone it.
2. Open a terminal in the Zeno folder.
3. Copy `.env.example` to a new file named `.env`.
4. Open `.env` in a text editor and add the provider API key(s) you already have:
   - `OPENAI_API_KEY=` for OpenAI
   - `GEMINI_API_KEY=` for Google Gemini
5. Save `.env`, then run:

   ```sh
   npm start
   ```

6. Open **http://127.0.0.1:3000** in your browser.

The model menu reads each configured provider's available models from its API. If only one provider key is present, only that provider's models appear. If both keys are configured, both sets appear. If no key is configured, Zeno explains the setup needed.

Do not open `index.html` directly for AI chat: the model selector and chat API require the local Node server.

## Supported attachments

- Images: PNG, JPEG, WebP, or GIF (up to 4 MB each)
- PDF files (up to 4 MB each)
- Text and code: TXT, Markdown, CSV, JSON, JavaScript, TypeScript, Python, HTML, CSS, XML, YAML, and LOG (up to 200 KB each)
- Up to five attachments per message, with a combined upload limit of 7 MB

File support depends on the selected provider/model and its API capabilities. Avoid attaching private or sensitive material.

## Security and costs

- **Never commit `.env` or put API keys in `index.html`, `script.js`, or any public file.** The repository includes `.gitignore` rules for this.
- Never paste an API key into a chat or send it to anyone.
- Provider API usage can have limits or costs. Check your provider's terms and usage dashboard, and get a parent/guardian's help before enabling billing.
- The server binds to `127.0.0.1` by default so it's intended for local development. **Do not put this API-key-enabled server on a public host until authentication, request limits, and usage controls have been added.** A public repository is not a private service.
- Zeno does not save conversations to a database yet; current conversation context is kept in page memory.

## Roadmap

- [x] Create the interface
- [x] Add provider-aware model selection
- [x] Add supported file attachments
- [x] Add server-side provider requests
- [ ] Add persistent chat history
- [ ] Add safe sign-in and controls before any public deployment
- [ ] Improve errors, accessibility, and automated testing

## License

No license has been selected yet.