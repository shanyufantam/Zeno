const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const conversation = document.getElementById("conversation");
const newChatButton = document.getElementById("newChat");
const themeToggle = document.getElementById("themeToggle");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const pageTitle = document.getElementById("pageTitle");
const recentList = document.getElementById("recentList");
const homeLink = document.getElementById("homeLink");
const historyLink = document.getElementById("historyLink");
const fileInput = document.getElementById("fileInput");
const attachmentList = document.getElementById("attachmentList");
const modelSelect = document.getElementById("modelSelect");
const modelStatus = document.getElementById("modelStatus");
const disclaimer = document.getElementById("disclaimer");
const connectionLabel = document.getElementById("connectionLabel");
const connectionDot = document.getElementById("connectionDot");
const topStatus = document.getElementById("topStatus");
const sendButton = document.getElementById("sendButton");

let availableModels = [];
let attachments = [];
let conversationHistory = [];
let chatTitles = [];
let currentProvider = "";
let currentModel = "";
let isSending = false;

const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "js", "ts", "py", "html", "css", "xml", "yaml", "yml", "log"]);
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_BYTES = 200 * 1024;
const MAX_TOTAL_FILE_BYTES = 7 * 1024 * 1024;
const MAX_FILES = 5;

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 135) + "px";
}
input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    startNewChat();
  }
  if (event.key === "Escape") sidebar.classList.remove("open");
});

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4500);
}

function setConnection(online, label) {
  connectionLabel.textContent = label;
  topStatus.textContent = online ? "Connected" : "Setup needed";
  connectionDot.style.background = online ? "#80d8b2" : "#d4a96b";
  connectionDot.style.boxShadow = online ? "0 0 12px #80d8b23b" : "none";
}

function renderModelPicker(providers, warnings = []) {
  availableModels = [];
  modelSelect.replaceChildren();

  providers.forEach((provider) => {
    if (!Array.isArray(provider.models) || provider.models.length === 0) return;
    const group = document.createElement("optgroup");
    group.label = provider.label;
    provider.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = provider.id + "::" + model.id;
      option.textContent = model.label || model.id;
      option.dataset.provider = provider.id;
      option.dataset.model = model.id;
      group.appendChild(option);
      availableModels.push({ provider: provider.id, providerLabel: provider.label, id: model.id, label: model.label || model.id });
    });
    modelSelect.appendChild(group);
  });

  modelSelect.disabled = availableModels.length === 0;
  if (availableModels.length > 0) {
    const first = availableModels[0];
    currentProvider = first.provider;
    currentModel = first.id;
    modelSelect.value = first.provider + "::" + first.id;
    modelStatus.textContent = availableModels.length + " model" + (availableModels.length === 1 ? "" : "s") + " available";
    modelStatus.className = "model-status status-good";
    disclaimer.textContent = "Your selected provider may charge for API usage. Check its pricing before sending messages.";
    setConnection(true, providers.map((provider) => provider.label).join(" + "));
  } else {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No configured models";
    modelSelect.appendChild(option);
    modelStatus.textContent = warnings[0] || "Add an API key on the server to unlock models.";
    modelStatus.className = "model-status status-warning";
    disclaimer.textContent = "API keys stay on the server. Never paste them into this chat or commit them to GitHub.";
    setConnection(true, "Server ready · setup needed");
  }

  if (warnings.length > 0 && availableModels.length > 0) {
    modelStatus.textContent += " · Some providers need attention";
    modelStatus.title = warnings.join(" ");
  }
}

async function loadModels() {
  modelSelect.disabled = true;
  modelStatus.textContent = "Looking for configured providers…";
  try {
    const response = await fetch("/api/models", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The Zeno server could not list models.");
    if (data.serverReady === false) throw new Error(data.error || "The Zeno server is not ready.");
    renderModelPicker(Array.isArray(data.providers) ? data.providers : [], Array.isArray(data.warnings) ? data.warnings : []);
  } catch (error) {
    modelSelect.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Start the Zeno server first";
    modelSelect.appendChild(option);
    modelSelect.disabled = true;
    modelStatus.textContent = "Start the backend with: npm start";
    modelStatus.className = "model-status status-error";
    disclaimer.textContent = "Opening index.html directly won't connect to the AI backend. Follow the README setup steps.";
    setConnection(false, "Backend offline");
    modelStatus.title = String(error.message || error);
  }
}

modelSelect.addEventListener("change", () => {
  const [provider, ...modelParts] = modelSelect.value.split("::");
  currentProvider = provider || "";
  currentModel = modelParts.join("::");
  const picked = availableModels.find((model) => model.provider === currentProvider && model.id === currentModel);
  modelStatus.textContent = picked ? picked.providerLabel + " · " + picked.id : "Choose an available model";
  modelStatus.className = "model-status" + (picked ? " status-good" : "");
});

function getFileKind(file) {
  const extension = (file.name.split(".").pop() || "").toLowerCase();
  let type = file.type;
  if (!type && extension === "pdf") type = "application/pdf";
  if (!type && extension === "txt") type = "text/plain";
  if (TEXT_EXTENSIONS.has(extension) || type.startsWith("text/") || ["application/json", "application/xml"].includes(type)) {
    return { kind: "text", type: type || "text/plain" };
  }
  if (IMAGE_TYPES.has(type)) return { kind: "data", type };
  if (type === "application/pdf" || extension === "pdf") return { kind: "data", type: "application/pdf" };
  return null;
}

function renderAttachments() {
  attachmentList.replaceChildren();
  attachments.forEach((item, index) => {
    const chip = document.createElement("span");
    chip.className = "attachment-chip";
    const icon = document.createElement("span");
    icon.textContent = item.kind === "data" && item.type.startsWith("image/") ? "▧" : item.type === "application/pdf" ? "▤" : "≡";
    icon.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "attachment-chip-name";
    name.textContent = item.file.name;
    name.title = item.file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attachment-remove";
    remove.textContent = "×";
    remove.title = "Remove " + item.file.name;
    remove.setAttribute("aria-label", "Remove " + item.file.name);
    remove.addEventListener("click", () => {
      attachments.splice(index, 1);
      renderAttachments();
    });
    chip.append(icon, name, remove);
    attachmentList.appendChild(chip);
  });
}

fileInput.addEventListener("change", () => {
  const incoming = Array.from(fileInput.files || []);
  fileInput.value = "";
  for (const file of incoming) {
    if (attachments.length >= MAX_FILES) {
      showToast("You can attach up to " + MAX_FILES + " files per message.");
      break;
    }
    if (attachments.some((item) => item.file.name === file.name && item.file.size === file.size)) continue;
    const kind = getFileKind(file);
    if (!kind) {
      showToast("Unsupported file type: " + file.name + ". Use an image, PDF, or text/code file.");
      continue;
    }
    const limit = kind.kind === "text" ? MAX_TEXT_BYTES : MAX_FILE_BYTES;
    if (file.size > limit) {
      showToast(file.name + " is too large. Limit: " + (kind.kind === "text" ? "200 KB for text/code files." : "4 MB for images and PDFs."));
      continue;
    }
    const currentBytes = attachments.reduce((sum, item) => sum + item.file.size, 0);
    if (currentBytes + file.size > MAX_TOTAL_FILE_BYTES) {
      showToast("Keep the combined attachments under 7 MB per message.");
      continue;
    }
    attachments.push({ file, kind: kind.kind, type: kind.type });
  }
  renderAttachments();
});

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read " + file.name));
    reader.readAsDataURL(file);
  });
}

async function prepareAttachments() {
  const prepared = [];
  for (const item of attachments) {
    if (item.kind === "text") {
      const content = await item.file.text();
      prepared.push({ name: item.file.name, type: item.type, content });
    } else {
      const data = await readAsDataUrl(item.file);
      prepared.push({ name: item.file.name, type: item.type, data });
    }
  }
  return prepared;
}

function addMessage(text, who, attachmentNames = []) {
  const row = document.createElement("article");
  row.className = "chat-message " + who;
  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = who === "user" ? "Y" : "z";
  const content = document.createElement("div");
  content.className = "message-content";
  const author = document.createElement("div");
  author.className = "message-author";
  author.textContent = who === "user" ? "You" : "Zeno";
  const body = document.createElement("div");
  body.className = "message-text";
  body.textContent = text;
  content.append(author, body);
  if (attachmentNames.length > 0) {
    const fileRow = document.createElement("div");
    fileRow.className = "message-attachments";
    attachmentNames.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "message-attachment";
      chip.textContent = "📎 " + name;
      fileRow.appendChild(chip);
    });
    content.appendChild(fileRow);
  }
  row.append(avatar, content);
  conversation.appendChild(row);
  return row;
}

function addThinkingMessage() {
  const row = addMessage("", "assistant");
  const body = row.querySelector(".message-text");
  body.textContent = "Thinking";
  const dots = document.createElement("span");
  dots.className = "thinking-dots";
  dots.setAttribute("aria-label", "Zeno is thinking");
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("span"));
  body.append(" ", dots);
  return row;
}

function renderRecents() {
  recentList.replaceChildren();
  if (chatTitles.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-recents";
    empty.innerHTML = "Your conversations<br>will show up here.";
    recentList.appendChild(empty);
    return;
  }
  chatTitles.slice(0, 6).forEach((title) => {
    const item = document.createElement("button");
    item.className = "recent-item";
    item.textContent = title;
    item.title = title;
    item.addEventListener("click", () => showToast("Recent chat titles are temporary in this build; persistent chat history is a future feature."));
    recentList.appendChild(item);
  });
}

function startNewChat() {
  conversation.querySelectorAll(".chat-message").forEach((node) => node.remove());
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.hidden = false;
  conversationHistory = [];
  attachments = [];
  renderAttachments();
  input.value = "";
  resizeInput();
  pageTitle.textContent = "New conversation";
  sidebar.classList.remove("open");
  conversation.scrollTop = 0;
  input.focus();
}
newChatButton.addEventListener("click", startNewChat);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSending) return;
  const text = input.value.trim();
  if (!text && attachments.length === 0) return;
  if (!currentProvider || !currentModel) {
    showToast("No AI model is available. Start the Zeno server and configure an OpenAI or Gemini API key in the local .env file.");
    return;
  }

  isSending = true;
  sendButton.disabled = true;
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.hidden = true;
  const attachmentSnapshot = [...attachments];
  const attachmentNames = attachmentSnapshot.map((item) => item.file.name);
  const visiblePrompt = text || "Please inspect the attached file(s).";
  addMessage(visiblePrompt, "user", attachmentNames);
  input.value = "";
  attachments = [];
  renderAttachments();
  resizeInput();
  pageTitle.textContent = visiblePrompt.length > 30 ? visiblePrompt.slice(0, 30).trimEnd() + "…" : visiblePrompt;
  const thinkingRow = addThinkingMessage();
  conversation.scrollTop = conversation.scrollHeight;

  try {
    const preparedAttachments = [];
    for (const item of attachmentSnapshot) {
      if (item.kind === "text") {
        preparedAttachments.push({ name: item.file.name, type: item.type, content: await item.file.text() });
      } else {
        preparedAttachments.push({ name: item.file.name, type: item.type, data: await readAsDataUrl(item.file) });
      }
    }
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: currentProvider,
        model: currentModel,
        message: visiblePrompt,
        history: conversationHistory,
        attachments: preparedAttachments
      })
    });
    const data = await response.json().catch(() => ({}));
    thinkingRow.remove();
    if (!response.ok) throw new Error(data.error || "The model request failed (HTTP " + response.status + ").");

    addMessage(data.reply || "The selected model returned an empty response.", "assistant");
    conversationHistory.push({ role: "user", content: visiblePrompt });
    conversationHistory.push({ role: "assistant", content: data.reply || "" });
    conversationHistory = conversationHistory.slice(-20);
    if (!chatTitles.includes(pageTitle.textContent)) {
      chatTitles.unshift(pageTitle.textContent);
      renderRecents();
    }
    modelStatus.textContent = (data.providerLabel || currentProvider) + " · " + (data.model || currentModel);
    modelStatus.className = "model-status status-good";
  } catch (error) {
    thinkingRow.remove();
    addMessage("I couldn't get a response. " + (error.message || "Please check the server and API settings, then try again."), "assistant");
    showToast("Zeno couldn't complete that request. Check the server terminal and provider API configuration.");
  } finally {
    isSending = false;
    sendButton.disabled = false;
    conversation.scrollTop = conversation.scrollHeight;
    input.focus();
  }
});

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt || "";
    resizeInput();
    input.focus();
  });
});

themeToggle.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-mode");
  themeToggle.textContent = isLight ? "☾" : "☼";
  themeToggle.setAttribute("aria-label", isLight ? "Switch to dark theme" : "Switch to light theme");
});

menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));
homeLink.addEventListener("click", () => {
  startNewChat();
  homeLink.classList.add("active");
  sidebar.classList.remove("open");
});
historyLink.addEventListener("click", () => {
  showToast(chatTitles.length ? "Choose a title under YOUR CHATS. Persistent chat history will be added later." : "Your recent conversations will appear here after your first message.");
  sidebar.classList.remove("open");
});
document.addEventListener("click", (event) => {
  if (window.innerWidth <= 660 && sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
    sidebar.classList.remove("open");
  }
});


/* Offline notes: saved in this app profile, with no server or API key required. */
const notesLink = document.getElementById("notesLink");
const notesOverlay = document.getElementById("notesOverlay");
const closeNotes = document.getElementById("closeNotes");
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteBody = document.getElementById("noteBody");
const notesList = document.getElementById("notesList");
const noteCount = document.getElementById("noteCount");
const NOTES_STORAGE_KEY = "zeno.offlineNotes.v1";
let offlineNotes = [];
let editingNoteId = null;

function readOfflineNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || "[]");
    offlineNotes = Array.isArray(stored) ? stored.filter((n) => n && typeof n.id === "string" && typeof n.title === "string" && typeof n.body === "string") : [];
  } catch {
    offlineNotes = [];
    showToast("Zeno couldn't read saved notes from this app profile.");
  }
  renderOfflineNotes();
}
function persistOfflineNotes() {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(offlineNotes));
    return true;
  } catch {
    showToast("Could not save notes. This app profile may be out of storage space.");
    return false;
  }
}
function renderOfflineNotes() {
  notesList.replaceChildren();
  noteCount.textContent = offlineNotes.length + " note" + (offlineNotes.length === 1 ? "" : "s") + " saved";
  if (!offlineNotes.length) {
    const empty = document.createElement("p");
    empty.className = "notes-empty";
    empty.textContent = "No notes yet. Create your first one above.";
    notesList.appendChild(empty);
    return;
  }
  offlineNotes.slice().sort((a,b) => b.updatedAt - a.updatedAt).forEach((note) => {
    const card = document.createElement("article");
    card.className = "note-card";
    const title = document.createElement("h3");
    title.textContent = note.title;
    const body = document.createElement("p");
    body.textContent = note.body || "No extra details.";
    const date = document.createElement("small");
    date.textContent = "Updated " + new Date(note.updatedAt).toLocaleString();
    const actions = document.createElement("div");
    actions.className = "note-card-actions";
    const edit = document.createElement("button");
    edit.type = "button"; edit.className = "note-edit"; edit.textContent = "Edit";
    edit.addEventListener("click", () => {
      editingNoteId = note.id;
      noteTitle.value = note.title;
      noteBody.value = note.body;
      document.getElementById("saveNote").textContent = "Update note";
      noteTitle.focus();
      notesOverlay.querySelector(".notes-panel").scrollTo({top:0,behavior:"smooth"});
    });
    const remove = document.createElement("button");
    remove.type = "button"; remove.className = "note-delete"; remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      offlineNotes = offlineNotes.filter((item) => item.id !== note.id);
      if (editingNoteId === note.id) resetNoteForm();
      if (persistOfflineNotes()) renderOfflineNotes();
    });
    actions.append(edit, remove);
    card.append(title, body, date, actions);
    notesList.appendChild(card);
  });
}
function resetNoteForm() {
  editingNoteId = null;
  noteForm.reset();
  document.getElementById("saveNote").textContent = "Save note";
}
function openNotes() {
  readOfflineNotes();
  notesOverlay.hidden = false;
  document.body.classList.add("notes-open");
  sidebar.classList.remove("open");
  window.setTimeout(() => noteTitle.focus(), 30);
}
function hideNotes() {
  notesOverlay.hidden = true;
  document.body.classList.remove("notes-open");
  resetNoteForm();
  notesLink.classList.remove("active");
  notesLink.focus();
}
notesLink.addEventListener("click", () => {
  notesLink.classList.add("active");
  homeLink.classList.remove("active");
  openNotes();
});
closeNotes.addEventListener("click", hideNotes);
notesOverlay.addEventListener("click", (event) => { if (event.target === notesOverlay) hideNotes(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !notesOverlay.hidden) hideNotes();
});
noteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = noteTitle.value.trim();
  const body = noteBody.value.trim();
  if (!title) { noteTitle.focus(); return; }
  if (!body) { noteBody.focus(); showToast("Add a few words to your note before saving."); return; }
  const now = Date.now();
  if (editingNoteId) {
    offlineNotes = offlineNotes.map((note) => note.id === editingNoteId ? {...note,title,body,updatedAt:now} : note);
  } else {
    offlineNotes.push({id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(now) + Math.random().toString(16).slice(2),title,body,createdAt:now,updatedAt:now});
  }
  if (persistOfflineNotes()) {
    renderOfflineNotes();
    resetNoteForm();
    showToast("Note saved on this device.");
  }
});
readOfflineNotes();

loadModels();