// Toolbar icon / keyboard shortcut: toggle the panel in the WhatsApp window.
// Also opens chats on request from the panel (see openChatInPage below).
const WA_URL = "https://web.whatsapp.com/";

async function togglePanel(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  } catch {
    // Page was open before the extension was installed/reloaded: inject now.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["phone.js", "content.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  }
}

async function handleClick(tab) {
  if (tab && tab.url && tab.url.startsWith(WA_URL)) return togglePanel(tab);
  // Clicked somewhere else: jump to the open WhatsApp window instead.
  const [wa] = await chrome.tabs.query({ url: WA_URL + "*" });
  if (!wa) return chrome.tabs.create({ url: WA_URL });
  await chrome.windows.update(wa.windowId, { focused: true });
  await chrome.tabs.update(wa.id, { active: true });
  return togglePanel(wa);
}

chrome.action.onClicked.addListener(handleClick);
self.handleClick = handleClick; // for tests

// Runs inside the WhatsApp page itself (MAIN world) and asks WhatsApp Web's own
// modules to open the chat for a number. No reload, no UI clicking.
// Returns {ok, verified} or {ok: false, error}.
async function openChatInPage(digits) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    if (typeof window.require !== "function") return { ok: false, error: "WhatsApp modules not reachable" };
    const mod = (name) => {
      try { return window.require(name); } catch { return null; }
    };
    const WidFactory = mod("WAWebWidFactory");
    const FindChat = mod("WAWebFindChatAction");
    const CmdMod = mod("WAWebCmd");
    if (!WidFactory || !FindChat || !CmdMod) {
      return { ok: false, error: "WhatsApp modules changed (WidFactory/FindChat/Cmd missing)" };
    }
    const wid = WidFactory.createWid(digits + "@c.us");
    const found = await FindChat.findOrCreateLatestChat(wid);
    const chat = (found && found.chat) || found;
    if (!chat) return { ok: false, error: "no chat for this number" };
    const Cmd = CmdMod.Cmd || CmdMod;
    const isActive = () => chat.active === true;
    try {
      await Cmd.openChatBottom({ chat, chatEntryPoint: "Chatlist" });
    } catch {
      await Cmd.openChatBottom(chat);
    }
    for (let i = 0; i < 20 && !isActive(); i++) await sleep(100);
    return { ok: true, verified: isActive() };
  } catch (e) {
    return { ok: false, error: "WhatsApp: " + (e && e.message ? e.message : String(e)) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "openChat" || !sender.tab) return;
  chrome.scripting
    .executeScript({
      target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
      world: "MAIN",
      func: openChatInPage,
      args: [msg.digits],
    })
    .then(([r]) => sendResponse(r.result))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});
