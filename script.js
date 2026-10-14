const form = document.getElementById("chatForm");
const input = document.getElementById("messageInput");
const conversation = document.getElementById("conversation");
const welcome = document.getElementById("welcome");
const newChat = document.getElementById("newChat");
const themeToggle = document.getElementById("themeToggle");
const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");

function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
}
input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
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
  conversation.appendChild(row);
  return row;
}

function showPrototypeReply(row) {
  const content = row.querySelector(".message-content");
  const note = document.createElement("div");
  note.className = "prototype-note";
  note.textContent = "Zeno's interface is working! Its AI model isn't connected yet. In the next step, we'll connect a model so Zeno can generate real answers. For now, your message stays in this browser session.";
  content.appendChild(note);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  if (welcome && welcome.isConnected) welcome.remove();
  addMessage(text, "user");
  const reply = addMessage("I'm here. Let's turn this into something useful.", "assistant");
  showPrototypeReply(reply);
  input.value = "";
  resizeInput();
  input.focus();
  conversation.scrollTop = conversation.scrollHeight;
});

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.prompt || "";
    resizeInput();
    input.focus();
  });
});

newChat.addEventListener("click", () => {
  conversation.innerHTML = "";
  const panel = document.createElement("div");
  panel.className = "welcome";
  panel.id = "welcome";
  panel.innerHTML = '<div class="welcome-orb"><span>z</span><i></i></div><p class="eyebrow">A LITTLE CURIOSITY GOES A LONG WAY</p><h1>What’s on your <span>mind?</span></h1><p class="welcome-copy">A place to explore ideas, untangle problems, and make something new.</p><div class="suggestions"><button class="suggestion" data-prompt="Help me brainstorm a creative project"><span class="suggestion-icon violet">✳</span><span><strong>Brainstorm ideas</strong><small>Turn a spark into a plan</small></span><b>↗</b></button><button class="suggestion" data-prompt="Explain how artificial intelligence works in simple terms"><span class="suggestion-icon blue">⌘</span><span><strong>Understand something</strong><small>Make complex things clearer</small></span><b>↗</b></button><button class="suggestion" data-prompt="Help me build a simple website"><span class="suggestion-icon green">&lt;/&gt;</span><span><strong>Build something</strong><small>Start a project from scratch</small></span><b>↗</b></button><button class="suggestion" data-prompt="Give me a fresh perspective on a problem"><span class="suggestion-icon amber">◈</span><span><strong>Find a new angle</strong><small>Look at it differently</small></span><b>↗</b></button></div>';
  conversation.appendChild(panel);
  panel.querySelectorAll(".suggestion").forEach((button) => button.addEventListener("click", () => {
    input.value = button.dataset.prompt || "";
    resizeInput();
    input.focus();
  }));
  sidebar.classList.remove("open");
  input.value = "";
  input.focus();
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
  themeToggle.textContent = document.body.classList.contains("light-mode") ? "☾" : "☼";
});

menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));
document.getElementById("homeLink").addEventListener("click", () => {
  sidebar.classList.remove("open");
});
document.getElementById("historyLink").addEventListener("click", () => {
  alert("Chat history will be added in a future version of Zeno.");
});
document.addEventListener("click", (event) => {
  if (window.innerWidth <= 700 && sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
    sidebar.classList.remove("open");
  }
});