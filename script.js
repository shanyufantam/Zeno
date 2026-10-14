const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const conversation = document.getElementById("conversation");
const newChat = document.getElementById("newChat");
const themeToggle = document.getElementById("themeToggle");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const pageTitle = document.getElementById("pageTitle");
const recentList = document.getElementById("recentList");
const homeLink = document.getElementById("homeLink");
const historyLink = document.getElementById("historyLink");
const previewExplanation = document.getElementById("previewExplanation");

let firstMessageInChat = true;
let chatTitles = [];

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

function addMessage(text, who) {
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
  row.append(avatar, content);
  conversation.insertBefore(row, previewExplanation);
  return row;
}

function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function renderRecents() {
  recentList.innerHTML = "";
  if (!chatTitles.length) {
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
    item.addEventListener("click", () => showToast("Chat history is a visual preview for now. Saving and reopening conversations comes in a later build."));
    recentList.appendChild(item);
  });
}

function startNewChat() {
  conversation.querySelectorAll(".chat-message").forEach((node) => node.remove());
  const welcome = document.getElementById("welcome");
  if (welcome) welcome.hidden = false;
  previewExplanation.hidden = true;
  firstMessageInChat = true;
  input.value = "";
  resizeInput();
  pageTitle.textContent = "New conversation";
  sidebar.classList.remove("open");
  input.focus();
  conversation.scrollTop = 0;
}
newChat.addEventListener("click", startNewChat);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const welcome = document.getElementById("welcome");
  if (welcome) welcome.hidden = true;

  addMessage(text, "user");
  if (firstMessageInChat) {
    previewExplanation.hidden = false;
    firstMessageInChat = false;
    pageTitle.textContent = text.length > 28 ? text.slice(0, 28).trimEnd() + "…" : text;
    chatTitles.unshift(pageTitle.textContent);
    chatTitles = [...new Set(chatTitles)];
    renderRecents();
  } else {
    showToast("Zeno's AI engine isn't connected yet. We'll connect a real model next—no fake answers.");
  }

  input.value = "";
  resizeInput();
  conversation.scrollTop = conversation.scrollHeight;
  input.focus();
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
  showToast(chatTitles.length ? "Choose a title under YOUR CHATS to preview your recent conversations." : "Your recent conversations will appear here once you start chatting.");
  sidebar.classList.remove("open");
});
document.addEventListener("click", (event) => {
  if (window.innerWidth <= 660 && sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
    sidebar.classList.remove("open");
  }
});
renderRecents();