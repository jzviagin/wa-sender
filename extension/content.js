// WA Sender: floating panel inside WhatsApp Web. Opens the chat for a number
// in the current window and fills the templated message WITHOUT sending it.
(() => {
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

  // ---------- UI ----------
  // Remove a stale panel left behind by an earlier copy (e.g. after an extension reload).
  document.getElementById("wa-sender-host")?.remove();
  const host = document.createElement("div");
  host.id = "wa-sender-host";
  host.style.cssText = "position:fixed;z-index:2147483647;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font: 14px system-ui, sans-serif; }
      .wrap { display: flex; flex-direction: column; align-items: flex-start; }
      .wrap.below { flex-direction: column-reverse; }
      .fab { width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer;
             background: #25d366; box-shadow: 0 2px 8px rgba(0,0,0,.3); display: grid; place-items: center; }
      .panel { display: none; width: 340px; max-height: calc(100vh - 90px); overflow-y: auto; margin: 10px 0;
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
      .links { display: flex; justify-content: space-between; margin-top: 6px; }
      .links a { font-size: 11px; color: #888; }
      .fab { touch-action: none; }
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
        <div class="links"><a href="#" id="settings">Settings</a><a href="#" id="resetpos">Reset button position</a></div>
      </div>
      <button class="fab" id="fab" title="WA Sender">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
      </button>
    </div>`;
  const $ = (id) => root.getElementById(id);
  const wrap = root.querySelector(".wrap");
  const panel = root.querySelector(".panel");

  // Button position, in order of preference:
  //  1. wherever you dragged it (remembered),
  //  2. right of the "WhatsApp" title in the chat list header,
  //  3. bottom-left corner.
  // We only float above WhatsApp's page, never insert into its DOM, so its
  // re-renders can't remove or break the button.
  const POS_KEY = "wa-sender-button-pos";
  let savedPos = null;
  try { savedPos = JSON.parse(localStorage.getItem(POS_KEY)); } catch {}

  // Find the "WhatsApp" title text: scan text nodes plus labelled elements
  // (the title may be plain text in a div, or an SVG logo with a label).
  let titleNode = null;
  let lastScan = 0;
  function titleRect() {
    const valid = (r) => r && r.width && r.height > 12 && r.height < 80 && r.left < innerWidth / 2 && r.top < 220;
    const rectOf = (n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        range.selectNodeContents(n);
        return range.getBoundingClientRect();
      }
      return n.getBoundingClientRect();
    };
    if (titleNode && titleNode.isConnected && valid(rectOf(titleNode))) return rectOf(titleNode);
    if (Date.now() - lastScan < 2000) return null; // don't rescan the whole page too often
    lastScan = Date.now();
    titleNode = null;
    const isTitle = (t) => /^\s*WhatsApp( Business)?\s*$/.test(t || "");
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT,
      { acceptNode: (n) => (isTitle(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    for (let n; (n = walker.nextNode());) found.push(n);
    for (const el of document.querySelectorAll('[aria-label^="WhatsApp"], [title^="WhatsApp"], svg title')) {
      if (isTitle(el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent)) {
        found.push(el.tagName.toLowerCase() === "title" ? el.parentNode : el);
      }
    }
    let best = null;
    for (const n of found) {
      const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
      if (!el || host.contains(el) || el.closest("#main")) continue;
      const r = rectOf(n);
      if (valid(r) && (!best || r.height > best.r.height)) best = { n, r }; // biggest text = the title
    }
    if (!best) return null;
    titleNode = best.n;
    return best.r;
  }

  function setPos(left, top) {
    left = Math.max(0, Math.min(left, innerWidth - 44));
    top = Math.max(0, Math.min(top, innerHeight - 44));
    host.style.left = Math.round(left) + "px";
    host.style.top = Math.round(top) + "px";
    host.style.bottom = "";
    const below = top < innerHeight / 2; // open the panel towards the larger space
    wrap.classList.toggle("below", below);
    panel.style.maxHeight = Math.max(200, below ? innerHeight - top - 70 : top - 20) + "px";
  }

  function place() {
    if (dragging) return;
    if (savedPos) return setPos(savedPos.left, savedPos.top);
    const r = titleRect();
    if (r) return setPos(r.right + 14, r.top + r.height / 2 - 20);
    setPos(16, innerHeight - 56);
  }

  // Drag the button to move it; a plain click still opens the panel.
  let dragging = false;
  let moved = false;
  $("fab").addEventListener("pointerdown", (e) => {
    const start = { x: e.clientX, y: e.clientY, left: host.offsetLeft, top: host.offsetTop };
    dragging = true;
    moved = false;
    const onMove = (ev) => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      setPos(start.left + dx, start.top + dy);
    };
    const onUp = () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      dragging = false;
      if (moved) {
        savedPos = { left: host.offsetLeft, top: host.offsetTop };
        try { localStorage.setItem(POS_KEY, JSON.stringify(savedPos)); } catch {}
      }
    };
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
  });
  $("settings").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: "openSettings" });
  });
  // Settings saved while the panel is open: rebuild the fields right away.
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.config && wrap.classList.contains("open")) reloadConfig();
  });
  $("resetpos").addEventListener("click", (e) => {
    e.preventDefault();
    savedPos = null;
    try { localStorage.removeItem(POS_KEY); } catch {}
    lastScan = 0;
    place();
  });

  place();
  setInterval(place, 500);
  addEventListener("resize", place);
  const fieldInputs = () => [...$("fields").querySelectorAll("input")];

  // Keep WhatsApp's global keyboard shortcuts from stealing our keystrokes.
  for (const ev of ["keydown", "keyup", "keypress", "input", "paste", "copy", "cut"]) {
    wrap.addEventListener(ev, (e) => e.stopPropagation());
  }

  // Rebuild the fields from the settings, keeping values already typed.
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
      config = await getConfig();
      buildFields();
      const unknown = unknownPlaceholders(config);
      status(unknown.length ? `⚠ The message uses {${unknown.join("}, {")}}, which isn't a field (see Settings)` : "",
             unknown.length ? "warn" : "");
    } catch (e) {
      status("Can't load settings: " + e.message, "err");
    }
    refresh();
  }

  $("phone").addEventListener("input", refresh);
  // Enter moves to the next field; on the last field it opens the chat.
  panel.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.isComposing || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const inputs = [$("phone"), ...fieldInputs()];
    const next = inputs[inputs.indexOf(e.target) + 1];
    if (next) next.focus();
    else go();
  });
  // After the extension is updated, this copy of the panel is cut off from it.
  const alive = () => { try { return !!chrome.runtime.id; } catch { return false; } };
  const STALE = "WA Sender was updated. Press Cmd+E or click its toolbar icon to load the new version.";

  async function togglePanel() {
    wrap.classList.toggle("open");
    if (!alive()) return status(STALE, "err");
    if (wrap.classList.contains("open")) {
      await reloadConfig(); // picks up settings changes each time the panel opens
      $("phone").focus();
    }
  }
  $("fab").addEventListener("click", () => { if (!moved) togglePanel(); });
  chrome.runtime.onMessage.addListener((msg) => { if (msg.type === "toggle") togglePanel(); });
  function clearFields() {
    $("phone").value = "";
    for (const i of fieldInputs()) i.value = "";
    refresh();
  }
  $("clear").addEventListener("click", () => {
    clearFields();
    status("");
    $("phone").focus();
  });
  $("copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(message());
    status("Message copied.");
  });
  $("go").addEventListener("click", go);

  async function go() {
    if (!alive()) return status(STALE, "err");
    const { number, warning } = normalizePhone($("phone").value);
    if (!number) return status("Enter a phone number.");
    if (warning && !confirm(`${number}\n${warning}\n\nOpen anyway?`)) return;
    const empty = Object.entries(values()).filter(([, v]) => !v).map(([k]) => k);
    if (empty.length && !confirm(`Empty: ${empty.join(", ")}\n\nOpen anyway?`)) return;
    const text = message();
    const digits = digitsOf(number);
    $("go").disabled = true;
    status("Opening chat…");
    const failures = [];
    try {
      for (const [label, open] of [["direct", openChatDirect], ["search", openChatInPlace]]) {
        let result;
        try {
          result = await open(digits);
        } catch (e) {
          result = e.message;
        }
        if (result === true) {
          await fillComposer(text);
          status(`Ready in chat with ${number} — review it and press Enter in WhatsApp.`);
          clearFields();
          wrap.classList.remove("open");
          return;
        }
        if (String(result).includes("isn't on WhatsApp")) {
          return status(`${number} isn't on WhatsApp.`, "err");
        }
        failures.push(`${label}: ${result}`);
      }
    } catch (e) {
      failures.push("fill: " + e.message);
    } finally {
      $("go").disabled = false;
    }
    // Never reload WhatsApp. Hand the message over via the clipboard instead.
    console.info("WA Sender: could not open chat", failures);
    await navigator.clipboard.writeText(text).catch(() => {});
    status(`Couldn't open the chat with ${number} automatically. The message is copied: ` +
           `open the chat yourself and paste (Ctrl+V / Cmd+V).\n\nDetails: ${failures.join(" | ")}`, "err");
  }

  // Open the chat through WhatsApp Web's own code (runs in the page via background.js).
  async function openChatDirect(digits) {
    const before = document.querySelector("#main");
    const res = await chrome.runtime.sendMessage({ type: "openChat", digits });
    if (!res || !res.ok) return (res && res.error) || "no response";
    const key = digits.slice(-8);
    const opened = await waitFor(() => {
      const main = document.querySelector("#main");
      if (!main || !main.querySelector('footer [contenteditable="true"]')) return null;
      const header = main.querySelector("header");
      // res.verified: WhatsApp itself confirmed this chat is now the active one.
      return res.verified || main !== before || digitsOf(header && header.textContent).includes(key);
    }, 4000);
    return opened ? true : "chat did not open";
  }

  // ---------- WhatsApp DOM automation ----------
  function realClick(el) {
    for (const type of ["mousedown", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  const isEditable = (el) => el && (el.isContentEditable || el.tagName === "INPUT");
  const outsideUs = (el) => el && el !== host && !el.closest("#main");

  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const notOurs = (el) => !host.contains(el) && !el.closest("#main");

  function findNewChatButton() {
    const selectors = ['[data-icon="new-chat-outline"]', '[data-icon*="new-chat"]', '[data-icon*="chat-plus"]',
      '[aria-label="New chat"]', '[title="New chat"]', '[aria-label="צ\'אט חדש"]', '[title="צ\'אט חדש"]'];
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (visible(el) && notOurs(el)) return el.closest('button, [role="button"]') || el;
      }
    }
    return null;
  }

  // The chat list's own search box ("Search or start a new chat").
  function findSearchBox() {
    const editable = 'input:not([type]), input[type="text"], input[type="search"], [contenteditable="true"]';
    const candidates = [
      ...document.querySelectorAll('[aria-label*="Search" i], [placeholder*="Search" i], [aria-label*="חיפוש"], [placeholder*="חיפוש"]'),
      ...document.querySelectorAll("#side input, #side [contenteditable='true']"),
    ];
    for (const el of candidates) {
      if (el.matches(editable) && visible(el) && notOurs(el)) return el;
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
    let search = findSearchBox();
    if (!search) {
      const btn = findNewChatButton();
      if (!btn) return "search box and New chat button not found";
      realClick(btn);
      // The "New chat" drawer focuses its search box when it opens.
      search = await waitFor(() => {
        const a = document.activeElement;
        return isEditable(a) && outsideUs(a) ? a : null;
      }, 3000);
      if (!search) return "search box not found";
    }
    typeInto(search, "+" + digits);

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
      return "number not found in search results";
    }
    realClick(row.querySelector('[role="button"], [tabindex]') || row);

    // Wait for the conversation to switch to that chat.
    const opened = await waitFor(() => {
      const main = document.querySelector("#main");
      if (!main || !main.querySelector('footer [contenteditable="true"]')) return null;
      const header = main.querySelector("header");
      return main !== before || digitsOf(header && header.textContent).includes(key);
    }, 4000);
    return opened ? true : "chat did not open after clicking the result";
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
