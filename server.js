const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const MAX_BODY_BYTES = 11 * 1024 * 1024;
loadEnvFile();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

const STATIC_FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/script.js", ["script.js", "text/javascript; charset=utf-8"]]
]);

function loadEnvFile() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("The request is too large. Please use smaller attachments.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("The request body must be valid JSON.");
    error.status = 400;
    throw error;
  }
}

function openAIKey() {
  return (process.env.OPENAI_API_KEY || "").trim();
}

function geminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
}

function prettify(id) {
  return id.replace(/-/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

async function getOpenAIModels() {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: "Bearer " + openAIKey() },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error("OpenAI model list request failed (HTTP " + response.status + "). Check that the API key is valid and has model access.");
  }
  const payload = await response.json();
  const blocked = /(embedding|moderation|dall.e|image|audio|transcri|\btts\b|realtime|whisper|search.preview|deep.research|codex|sora|computer.use)/i;
  const models = (Array.isArray(payload.data) ? payload.data : [])
    .filter((model) => {
      const id = String(model.id || "");
      return (/^gpt-/i.test(id) || /^o[1-9](?:-|$)/i.test(id)) && !blocked.test(id);
    })
    .sort((a, b) => (Number(b.created) || 0) - (Number(a.created) || 0) || String(a.id).localeCompare(String(b.id)))
    .slice(0, 30)
    .map((model) => ({ id: model.id, label: model.id }));
  if (models.length === 0) throw new Error("No text-chat models were returned for the configured OpenAI key.");
  return { id: "openai", label: "OpenAI", models };
}

async function getGeminiModels() {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    headers: { "x-goog-api-key": geminiKey() },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error("Gemini model list request failed (HTTP " + response.status + "). Check the key and API access.");
  }
  const payload = await response.json();
  const models = (Array.isArray(payload.models) ? payload.models : [])
    .filter((model) => {
      const id = String(model.name || "").replace(/^models\//, "");
      return id && Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent") &&
        !/(embedding|tts|audio|image-generation|robotics)/i.test(id);
    })
    .slice(0, 35)
    .map((model) => {
      const id = String(model.name).replace(/^models\//, "");
      return { id, label: (model.displayName || prettify(id)) + " (" + id + ")" };
    });
  if (models.length === 0) throw new Error("No text-generation models were returned for the configured Gemini key.");
  return { id: "gemini", label: "Google Gemini", models };
}

async function listModels() {
  const hasOpenAI = Boolean(openAIKey());
  const hasGemini = Boolean(geminiKey());
  const tasks = [];
  if (hasOpenAI) tasks.push(getOpenAIModels());
  if (hasGemini) tasks.push(getGeminiModels());
  if (tasks.length === 0) {
    return {
      serverReady: true,
      providers: [],
      warnings: ["No provider credentials configured. Add OPENAI_API_KEY or GEMINI_API_KEY to your local .env file."]
    };
  }
  const settled = await Promise.allSettled(tasks);
  const providers = [];
  const warnings = [];
  for (let i = 0; i < settled.length; i++) {
    const item = settled[i];
    if (item.status === "fulfilled") providers.push(item.value);
    else warnings.push(item.reason instanceof Error ? item.reason.message : "A provider could not list its models.");
  }
  return { serverReady: true, providers, warnings };
}

function badInput(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateAttachments(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 5) throw badInput("Attach up to five supported files per message.");
  const attachments = [];
  const allowedImages = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  for (const item of value) {
    if (!item || typeof item.name !== "string" || typeof item.type !== "string") {
      throw badInput("An attachment has invalid metadata.");
    }
    const name = path.basename(item.name).slice(0, 140);
    if (typeof item.content === "string") {
      if (Buffer.byteLength(item.content, "utf8") > 200 * 1024) throw badInput("Text and code attachments must be 200 KB or smaller.");
      attachments.push({ name, type: "text/plain", content: item.content });
      continue;
    }
    if (typeof item.data !== "string") throw badInput("An attachment is missing its file data.");
    const match = item.data.match(/^data:([^;,]+);base64,([a-zA-Z0-9+/=\r\n]+)$/);
    if (!match) throw badInput("A file attachment could not be read. Please attach it again.");
    const type = match[1].toLowerCase();
    if (!allowedImages.has(type) && type !== "application/pdf") {
      throw badInput("Only PNG, JPEG, WebP, GIF, PDF, and text/code attachments are supported.");
    }
    if (item.type.toLowerCase() !== type) throw badInput("An attachment's file type did not match its content.");
    const encoded = match[2].replace(/\s/g, "");
    const approxBytes = Math.floor(encoded.length * 3 / 4);
    if (approxBytes > 4 * 1024 * 1024) throw badInput("Images and PDFs must be 4 MB or smaller.");
    attachments.push({ name, type, dataUrl: item.data, base64: encoded });
  }
  return attachments;
}

function validateHistory(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw badInput("Conversation history is too long. Start a new chat and try again.");
  return value.map((turn) => {
    if (!turn || !["user", "assistant"].includes(turn.role) || typeof turn.content !== "string") {
      throw badInput("The conversation history contains an invalid message.");
    }
    return { role: turn.role, content: turn.content.slice(0, 20000) };
  });
}

function buildOpenAIInput(history, message, attachments) {
  const input = history.map((turn) => ({ role: turn.role, content: turn.content }));
  const content = [{ type: "input_text", text: message || "Please inspect the attached file(s)." }];
  for (const file of attachments) {
    if (typeof file.content === "string") {
      content.push({ type: "input_text", text: "\n\n[Text attachment: " + file.name + "]\n" + file.content });
    } else if (file.type.startsWith("image/")) {
      content.push({ type: "input_image", image_url: file.dataUrl });
    } else if (file.type === "application/pdf") {
      content.push({ type: "input_file", filename: file.name, file_data: file.dataUrl });
    }
  }
  input.push({ role: "user", content });
  return input;
}

async function askOpenAI(model, message, history, attachments) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + openAIKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions: "You are Zeno, a helpful, honest, general-purpose AI assistant. Be clear, useful, and friendly. For attachments, describe only what you can actually infer from the provided file.",
      input: buildOpenAIInput(history, message, attachments),
      max_output_tokens: 1400
    }),
    signal: AbortSignal.timeout(90000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const extra = response.status === 429 ? " Provider usage limit or billing may need attention." : " Check the API key and model access.";
    throw new Error("OpenAI request failed (HTTP " + response.status + ")." + extra);
  }
  const reply = typeof payload.output_text === "string" ? payload.output_text :
    (Array.isArray(payload.output) ? payload.output.flatMap((item) => Array.isArray(item.content) ? item.content : []).filter((part) => part.type === "output_text").map((part) => part.text || "").join("\n") : "");
  if (!reply.trim()) throw new Error("OpenAI returned no text for this request. Try another model.");
  return reply.trim();
}

function buildGeminiParts(message, attachments) {
  const parts = [{ text: message || "Please inspect the attached file(s)." }];
  for (const file of attachments) {
    if (typeof file.content === "string") {
      parts.push({ text: "\n\n[Text attachment: " + file.name + "]\n" + file.content });
    } else {
      parts.push({ inlineData: { mimeType: file.type, data: file.base64 } });
    }
  }
  return parts;
}

async function askGemini(model, message, history, attachments) {
  const contents = history.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.content }]
  }));
  contents.push({ role: "user", parts: buildGeminiParts(message, attachments) });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: {
      "x-goog-api-key": geminiKey(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "You are Zeno, a helpful, honest, general-purpose AI assistant. Be clear, useful, and friendly. For attachments, describe only what you can actually infer from the provided file." }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1400 }
    }),
    signal: AbortSignal.timeout(90000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const extra = response.status === 429 ? " Provider usage limit may have been reached." : " Check the API key and model access.";
    throw new Error("Gemini request failed (HTTP " + response.status + ")." + extra);
  }
  const reply = Array.isArray(payload.candidates?.[0]?.content?.parts)
    ? payload.candidates[0].content.parts.map((part) => typeof part.text === "string" ? part.text : "").join("").trim()
    : "";
  if (!reply) throw new Error("Gemini returned no text for this request. Try another model or check the provider response.");
  return reply;
}

async function handleChat(req, res) {
  const body = await readJson(req);
  const provider = body.provider;
  const model = body.model;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!["openai", "gemini"].includes(provider)) return json(res, 400, { error: "Choose a supported provider." });
  if (typeof model !== "string" || !/^[a-zA-Z0-9._:-]{1,150}$/.test(model)) return json(res, 400, { error: "Choose a valid model from the model menu." });
  if (message.length > 20000) return json(res, 413, { error: "Messages must be 20,000 characters or fewer." });
  const history = validateHistory(body.history);
  const attachments = validateAttachments(body.attachments);
  if (!message && attachments.length === 0) return json(res, 400, { error: "Write a message or attach a file first." });
  if (provider === "openai" && !openAIKey()) return json(res, 400, { error: "No OpenAI API key is configured on this server." });
  if (provider === "gemini" && !geminiKey()) return json(res, 400, { error: "No Gemini API key is configured on this server." });

  const reply = provider === "openai"
    ? await askOpenAI(model, message, history, attachments)
    : await askGemini(model, message, history, attachments);
  json(res, 200, { reply, provider, providerLabel: provider === "openai" ? "OpenAI" : "Google Gemini", model });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (req.method === "GET" && pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      configuredProviders: [
        ...(openAIKey() ? ["OpenAI"] : []),
        ...(geminiKey() ? ["Google Gemini"] : [])
      ]
    });
  }

  if (req.method === "GET" && pathname === "/api/models") {
    try {
      return json(res, 200, await listModels());
    } catch (error) {
      return json(res, 500, { serverReady: false, error: "Could not load the model list. Check the Zeno server configuration." });
    }
  }

  if (req.method === "POST" && pathname === "/api/chat") {
    try {
      await handleChat(req, res);
    } catch (error) {
      const status = Number(error.status) || 502;
      const message = status < 500 ? error.message : (error instanceof Error ? error.message : "The AI provider request failed.");
      if (!res.headersSent) json(res, status, { error: message });
    }
    return;
  }

  if (req.method === "GET" && STATIC_FILES.has(pathname)) {
    const [fileName, contentType] = STATIC_FILES.get(pathname);
    const fullPath = path.join(ROOT, fileName);
    fs.readFile(fullPath, (error, data) => {
      if (error) return json(res, 500, { error: "Could not read the website file." });
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": data.length,
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      });
      res.end(data);
    });
    return;
  }

  json(res, 404, { error: "Not found." });
});

server.listen(PORT, HOST, () => {
  console.log("Zeno is running at http://" + HOST + ":" + PORT);
  console.log("Configured providers: " + [openAIKey() ? "OpenAI" : "", geminiKey() ? "Google Gemini" : ""].filter(Boolean).join(", "));
  console.log("API keys are read server-side and are never sent to the browser.");
});