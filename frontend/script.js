// Troque pela URL pública do backend depois do deploy no Render.
const API_URL = "https://arquivo-da-copa-api.onrender.com";

const STORAGE_KEY = "arquivo-da-copa-front-v1";

const WELCOME = {
  id: "welcome",
  role: "assistant",
  content:
    "Sou o arquivista da Copa. Pergunte sobre finais, seleções, artilheiros, técnicos, estádios ou qualquer edição — do Uruguai de 1930 à Espanha campeã em 2026. Se a conversa sair do mundial, eu trago a bola de volta.",
};

const EDITIONS = [
  ["1930", "Uruguai", "uy"],
  ["1934", "Itália", "it"],
  ["1938", "Itália", "it"],
  ["1950", "Uruguai", "uy"],
  ["1954", "Alemanha", "de"],
  ["1958", "Brasil", "br"],
  ["1962", "Brasil", "br"],
  ["1966", "Inglaterra", "eng"],
  ["1970", "Brasil", "br"],
  ["1974", "Alemanha", "de"],
  ["1978", "Argentina", "ar"],
  ["1982", "Itália", "it"],
  ["1986", "Argentina", "ar"],
  ["1990", "Alemanha", "de"],
  ["1994", "Brasil", "br"],
  ["1998", "França", "fr"],
  ["2002", "Brasil", "br"],
  ["2006", "Itália", "it"],
  ["2010", "Espanha", "es"],
  ["2014", "Alemanha", "de"],
  ["2018", "França", "fr"],
  ["2022", "Argentina", "ar"],
  ["2026", "Espanha", "es"],
];

const PROMPTS = [
  "Quem tem mais títulos de Copa?",
  "Conte o Maracanazo de 1950",
  "Qual foi o gol de 2026?",
  "Maiores artilheiros da história",
];

const FLAGS = {
  br: `<rect width="30" height="20" fill="#009B3A"/><polygon points="15,1.8 28.2,10 15,18.2 1.8,10" fill="#FEDD00"/><circle cx="15" cy="10" r="3.5" fill="#002776"/>`,
  ar: `<rect width="30" height="20" fill="#74ACDF"/><rect y="6.7" width="30" height="6.6" fill="#fff"/><circle cx="15" cy="10" r="2.15" fill="#F6B40E"/>`,
  es: `<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>`,
  de: `<rect width="30" height="6.67" fill="#000"/><rect y="6.67" width="30" height="6.66" fill="#DD0000"/><rect y="13.33" width="30" height="6.67" fill="#FFCE00"/>`,
  it: `<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/>`,
  fr: `<rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/>`,
  eng: `<rect width="30" height="20" fill="#fff"/><rect x="12.2" width="5.6" height="20" fill="#CF081F"/><rect y="7.2" width="30" height="5.6" fill="#CF081F"/>`,
  uy: `<rect width="30" height="20" fill="#fff"/><rect width="30" height="2.22" fill="#0038A8"/><rect y="4.44" width="30" height="2.22" fill="#0038A8"/><rect y="8.88" width="30" height="2.22" fill="#0038A8"/><rect y="13.32" width="30" height="2.22" fill="#0038A8"/><rect y="17.76" width="30" height="2.24" fill="#0038A8"/><rect width="11" height="11.1" fill="#fff"/><circle cx="5.5" cy="5.55" r="2.3" fill="#F4D35E"/>`,
  us: `<rect width="30" height="20" fill="#fff"/><rect width="30" height="1.54" fill="#B22234"/><rect y="3.08" width="30" height="1.54" fill="#B22234"/><rect y="6.16" width="30" height="1.54" fill="#B22234"/><rect y="9.24" width="30" height="1.54" fill="#B22234"/><rect y="12.32" width="30" height="1.54" fill="#B22234"/><rect y="15.4" width="30" height="1.54" fill="#B22234"/><rect y="18.48" width="30" height="1.52" fill="#B22234"/><rect width="13" height="10.8" fill="#3C3B6E"/>`,
  mx: `<rect width="10" height="20" fill="#006847"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE1126"/><circle cx="15" cy="10" r="2.1" fill="#C4A35A"/>`,
  ca: `<rect width="7.5" height="20" fill="#f00"/><rect x="22.5" width="7.5" height="20" fill="#f00"/><rect x="7.5" width="15" height="20" fill="#fff"/><polygon points="15,4.2 16.3,8 20.2,8.2 17.1,10.6 18.2,14.2 15,12.1 11.8,14.2 12.9,10.6 9.8,8.2 13.7,8" fill="#f00"/>`,
};

const transcript = document.querySelector("#transcript");
const editions = document.querySelector("#editions");
const prompts = document.querySelector("#prompts");
const form = document.querySelector("#composer");
const field = document.querySelector("#message");
const alertBox = document.querySelector("#alert");
const sendButton = document.querySelector("#send");

let messages = [WELCOME];
let pending = false;
let failedText = "";

function flagMarkup(id) {
  const body = FLAGS[id] || FLAGS.br;
  return `<svg viewBox="0 0 30 20" aria-hidden="true">${body}</svg>`;
}

function paintFlags(root) {
  root.querySelectorAll("[data-flag]").forEach((node) => {
    node.innerHTML = flagMarkup(node.dataset.flag);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReply(value) {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return;
    const clean = parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim(),
    );
    if (clean.length) messages = clean.slice(-40);
  } catch {
    /* histórico corrompido: segue com a boas-vindas */
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function render() {
  transcript.innerHTML = messages
    .map(
      (message) => `
      <article class="bubble-wrap ${message.role}">
        <p class="who">${message.role === "user" ? "Você" : "Arquivista"}</p>
        <p class="bubble ${message.role}">${formatReply(message.content)}</p>
      </article>`,
    )
    .join("");

  if (pending) {
    transcript.insertAdjacentHTML(
      "beforeend",
      `<div class="status" role="status"><span class="dot"></span><span class="dot"></span><span class="dot"></span> Consultando o arquivo</div>`,
    );
  }
  transcript.scrollTop = transcript.scrollHeight;
  sendButton.disabled = pending || !field.value.trim();
}

function showError(text) {
  alertBox.hidden = false;
  alertBox.innerHTML = `<span>${escapeHtml(text)}</span><button type="button" class="retry" id="retry">Tentar de novo</button>`;
  document.querySelector("#retry").addEventListener("click", () => {
    if (failedText) void ask(failedText, false);
  });
}

function clearError() {
  alertBox.hidden = true;
  alertBox.innerHTML = "";
}

async function ask(text, echo = true) {
  const message = text.trim();
  if (!message || pending) return;
  clearError();
  failedText = message;

  let prior = messages.filter((item) => item.id !== "welcome");
  if (!echo) {
    const last = prior[prior.length - 1];
    if (last && last.role === "user" && last.content === message) prior = prior.slice(0, -1);
  }
  const history = prior.slice(-12).map(({ role, content }) => ({ role, content }));

  if (echo) {
    messages.push({ id: crypto.randomUUID(), role: "user", content: message });
    field.value = "";
    persist();
  }
  pending = true;
  render();

  let response;
  try {
    response = await fetch(`${API_URL.replace(/\/$/, "")}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    pending = false;
    render();
    showError("Não consegui falar com a API. Confira a URL e se o backend está no ar.");
    return;
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    pending = false;
    render();
    showError("A API respondeu de um jeito inesperado.");
    return;
  }

  pending = false;
  if (!response.ok || typeof payload.reply !== "string") {
    render();
    showError(typeof payload.error === "string" ? payload.error : "A consulta falhou. Tente de novo.");
    return;
  }

  failedText = "";
  messages.push({ id: crypto.randomUUID(), role: "assistant", content: payload.reply });
  persist();
  render();
}

function mountChrome() {
  editions.innerHTML = EDITIONS.map(
    ([year, winner, flag]) =>
      `<button type="button" class="chip" data-year="${year}"><span class="flag">${flagMarkup(flag)}</span><span class="year">${year}</span><span class="muted">${winner}</span></button>`,
  ).join("");

  editions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-year]");
    if (!button) return;
    const year = button.dataset.year;
    void ask(
      `Me conte a Copa do Mundo de ${year}: sede, campeão, final e uma curiosidade marcante.`,
    );
  });

  prompts.innerHTML = PROMPTS.map(
    (prompt) => `<button type="button" class="prompt">${prompt}</button>`,
  ).join("");
  prompts.addEventListener("click", (event) => {
    const button = event.target.closest(".prompt");
    if (button) void ask(button.textContent);
  });

  paintFlags(document);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void ask(field.value);
});

field.addEventListener("input", render);

field.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void ask(field.value);
  }
});

document.querySelector("#clear").addEventListener("click", () => {
  messages = [WELCOME];
  failedText = "";
  clearError();
  localStorage.removeItem(STORAGE_KEY);
  render();
});

loadStored();
mountChrome();
render();
