// WA Sender: floating panel inside WhatsApp Web. Opens the chat for a number
// in the current window and fills the templated message WITHOUT sending it.
(() => {
  // Only show the panel in the installed WhatsApp app window, not in normal tabs.
  // Set to false if you also want it in regular tabs.
  const ONLY_IN_APP_WINDOW = true;
  const isAppWindow = ["standalone", "window-controls-overlay", "minimal-ui"]
    .some((m) => matchMedia(`(display-mode: ${m})`).matches);
  if (ONLY_IN_APP_WINDOW && !isAppWindow) return;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const digitsOf = (s) => (s || "").replace(/\D/g, "");

  async function waitFor(fn, timeout = 4000, step = 100) {
    for (let t = 0; t < timeout; t += step) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  // ---------- config.json ----------
  let config = { message: "", params: [] };
  async function loadConfig() {
    const res = await fetch(chrome.runtime.getURL("config.json"), { cache: "no-store" });
    const cfg = await res.json();
    if (typeof cfg.message !== "string" || !Array.isArray(cfg.params)) {
      throw new Error('config.json needs "message" (text) and "params" (list of names)');
    }
    return { message: cfg.message, params: cfg.params.map(String) };
  }

  // ---------- UI ----------
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:2147483647;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font: 14px system-ui, sans-serif; }
      .fab { width: 48px; height: 48px; border-radius: 50%; border: 0; cursor: pointer;
             background: #25d366; box-shadow: 0 2px 8px rgba(0,0,0,.3); display: grid; place-items: center; }
      .panel { display: none; width: 340px; max-height: calc(100vh - 90px); overflow-y: auto; margin-bottom: 10px;
               padding: 12px; border-radius: 10px; background: #fff; color: #111; box-shadow: 0 4px 20px rgba(0,0,0,.35); }
      .open .panel { display: block; }
      label { display: block; text-align: start; margin: 8px 0 3px; color: #555; font-size: 12px; }
      input { width: 100%; padding: 7px 8px; border: 1px solid #ccc; border-radius: 6px; color: #111; background: #fff; }
      .num { margin-top: 3px; font-size: 12px; min-height: 16px; }
      .ok { color: #1a7f37; } .warn { color: #b36b00; } .err { color: #c62828; }
      .preview { margin-top: 10px; padding: 8px; border-radius: 8px; background: #dcf8c6; white-space: pre-wrap; min-height: 34px; }
      .preview mark { background: #ffe08a; }
      .row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 10px; }
      button.b { padding: 7px 12px; border-radius: 6px; border: 1px solid #ccc; background: #f5f5f5; cursor: pointer; }
      button.primary { background: #25d366; border-color: #1fae55; color: #fff; font-weight: 600; }
      .status { margin-top: 8px; font-size: 12px; color: #555; min-height: 16px; white-space: pre-wrap; }
    </style>
    <div class="wrap">
      <div class="panel">
        <label>Phone (paste any format)</label>
        <input id="phone" dir="ltr" autocomplete="off">
        <div class="num" id="num"></div>
        <div id="fields"></div>
        <div class="preview" id="preview" dir="auto"></div>
        <div class="row">
          <button class="b" id="clear">Clear</button>
          <button class="b" id="copy">Copy</button>
          <button class="b primary" id="go">Open chat</button>
        </div>
        <div class="status" id="status"></div>
      </div>
      <button class="fab" id="fab" title="WA Sender">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </div>`;
  const $ = (id) => root.getElementById(id);
  const wrap = root.querySelector(".wrap");
  const fieldInputs = () => [...$("fields").querySelectorAll("input")];

  // Keep WhatsApp's global keyboard shortcuts from stealing our keystrokes.
  for (const ev of ["keydown", "keyup", "keypress", "input", "paste", "copy", "cut"]) {
    wrap.addEventListener(ev, (e) => e.stopPropagation());
  }

  // Rebuild the fields from config.json, keeping values already typed.
  function buildFields() {
    const old = Object.fromEntries(fieldInputs().map((i) => [i.dataset.param, i.value]));
    const box = $("fields");
    box.replaceChildren();
    for (const name of config.params) {
      const label = document.createElement("label");
      label.textContent = name;
      label.dir = "auto";
      const input = document.createElement("input");
      input.dir = "auto";
      input.autocomplete = "off";
      input.dataset.param = name;
      input.value = old[name] || "";
      input.addEventListener("input", refresh);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      box.append(label, input);
    }
  }

  const values = () => Object.fromEntries(fieldInputs().map((i) => [i.dataset.param, i.value.trim()]));

  // Replace {param} with its value; unknown or empty {placeholders} are left as-is.
  function message() {
    const vals = values();
    return config.message.replace(/\{([^{}]+)\}/g, (m, name) => vals[name] || m);
  }
  const escapeHtml = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function refresh() {
    const raw = $("phone").value;
    const num = $("num");
    if (raw.trim()) {
      const { number, warning } = normalizePhone(raw);
      num.textContent = "→ " + number + (warning ? "   ⚠ " + warning : "");
      num.className = "num " + (warning ? "warn" : "ok");
    } else {
      num.textContent = "";
    }
    // Escape the template text but keep our <mark> tags for empty params.
    const parts = config.message.split(/(\{[^{}]+\})/);
    const vals = values();
    $("preview").innerHTML = parts.map((part) => {
      const m = part.match(/^\{([^{}]+)\}$/);
      if (!m || !(m[1] in vals)) return escapeHtml(part);
      return vals[m[1]] ? escapeHtml(vals[m[1]]) : `<mark>${escapeHtml(part)}</mark>`;
    }).join("");
  }
  const status = (t, cls = "") => { $("status").textContent = t; $("status").className = "status " + cls; };

  async function reloadConfig() {
    try {
      config = await loadConfig();
      buildFields();
      const unknown = [...config.message.matchAll(/\{([^{}]+)\}/g)]
        .map((m) => m[1]).filter((n) => !config.params.includes(n));
      status(unknown.length ? `⚠ config.json: message uses {${unknown.join("}, {")}} but it's not in "params"` : "",
             unknown.length ? "warn" : "");
    } catch (e) {
      status("Can't read config.json: " + e.message, "err");
    }
    refresh();
  }

  $("phone").addEventListener("input", refresh);
  $("phone").addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  $("fab").addEventListener("click", async () => {
    wrap.classList.toggle("open");
    if (wrap.classList.contains("open")) {
      await reloadConfig(); // picks up config.json edits each time the panel opens
      $("phone").focus();
    }
  });
  $("clear").addEventListener("click", () => {
    $("phone").value = "";
    for (const i of fieldInputs()) i.value = "";
    status("");
    refresh();
    $("phone").focus();
  });
  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(message());
    status("Message copied.");
  });
  $("go").addEventListener("click", go);

  async function go() {
    const { number, warning } = normalizePhone($("phone").value);
    if (!number) return status("Enter a phone number.");
    if (warning && !confirm(`${number}\n${warning}\n\nOpen anyway?`)) return;
    const empty = Object.entries(values()).filter(([, v]) => !v).map(([k]) => k);
    if (empty.length && !confirm(`Empty: ${empty.join(", ")}\n\nOpen anyway?`)) return;
    const text = message();
    const digits = digitsOf(number);
    $("go").disabled = true;
    status("Opening chat…");
    try {
      if (await openChatInPlace(digits)) {
        await fillComposer(text);
        status(`Ready in chat with ${number} — review it and press Enter in WhatsApp.`);
        wrap.classList.remove("open");
        return;
      }
    } catch (e) {
      console.warn("WA Sender: in-place open failed", e);
    } finally {
      $("go").disabled = false;
    }
    // Fallback: WhatsApp's own link, in THIS window (same session, no logout;
    // just a reload). WhatsApp fills the message itself and does not send it.
    status("Couldn't open it in place — reloading this window with the chat…");
    location.href = "https://web.whatsapp.com/send?phone=" + digits + "&text=" + encodeURIComponent(text);
  }

  // ---------- WhatsApp DOM automation ----------
  function realClick(el) {
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  const isEditable = (el) => el && (el.isContentEditable || el.tagName === "INPUT");
  const outsideUs = (el) => el && el !== host && !el.closest("#main");

  function findNewChatButton() {
    const icons = ["new-chat-outline", "new-chat", "chat", "new-chat-icon"];
    for (const name of icons) {
      const icon = document.querySelector(`[data-icon="${name}"]`);
      if (icon) return icon.closest('button, [role="button"]') || icon;
    }
    return null;
  }

  function typeInto(el, text) {
    el.focus();
    if (el.tagName === "INPUT") {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.execCommand("selectAll");
      document.execCommand("insertText", false, text);
    }
  }

  async function openChatInPlace(digits) {
    const key = digits.slice(-8); // matches "+972 50-123-4567", "050-1234567", etc.
    const before = document.querySelector("#main");
    const btn = findNewChatButton();
    if (!btn) return false;
    realClick(btn);

    // The "New chat" drawer focuses its search box when it opens.
    const search = await waitFor(() => {
      const a = document.activeElement;
      return isEditable(a) && outsideUs(a) ? a : null;
    }, 3000);
    if (!search) return false;
    typeInto(search, digits);

    // Wait for a result row that shows this number.
    const row = await waitFor(() => {
      const rows = document.querySelectorAll('[role="listitem"], [role="row"], [role="option"]');
      for (const r of rows) {
        if (r.contains(search) || r.closest("#main") || host.contains(r)) continue;
        if (digitsOf(r.textContent).includes(key)) return r;
      }
      return null;
    }, 5000);
    if (!row) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      return false;
    }
    realClick(row.querySelector('[role="button"], [tabindex]') || row);

    // Wait for the conversation to switch to that chat.
    return !!(await waitFor(() => {
      const main = document.querySelector("#main");
      if (!main || !main.querySelector('footer [contenteditable="true"]')) return null;
      const header = main.querySelector("header");
      return main !== before || digitsOf(header && header.textContent).includes(key);
    }, 4000));
  }

  async function fillComposer(text) {
    const box = await waitFor(() => document.querySelector('#main footer [contenteditable="true"]'), 3000);
    if (!box) throw new Error("composer not found");
    box.focus();
    document.execCommand("selectAll"); // replace any existing draft
    // Paste keeps line breaks intact in WhatsApp's editor.
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    await sleep(150);
    if (!box.textContent.trim()) document.execCommand("insertText", false, text);
  }
})();
