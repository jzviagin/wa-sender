// Toolbar icon / keyboard shortcut: toggle the panel in the WhatsApp window.
// Also opens chats on request from the panel (see openChatInPage below).
const WA_URL = "https://web.whatsapp.com/";

async function togglePanel(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle" });
  } catch {
    // Page was open before the extension was installed/reloaded: inject now.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["config.js", "phone.js", "content.js"] });
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
  const msg = (e) => (e && e.message ? e.message : String(e));
  let step = "modules";
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

    // Look the number up on WhatsApp's servers first. Besides telling us whether
    // it's on WhatsApp, this stores its LID (WhatsApp's newer internal id);
    // without it, opening a chat with a new number fails with "No LID for user".
    step = "lookup";
    const ids = [];
    let lookupError = "";
    const Exists = mod("WAWebQueryExistsJob");
    if (Exists) {
      try {
        const res = typeof Exists.queryWidExists === "function" ? await Exists.queryWidExists(wid)
          : typeof Exists.queryExists === "function" ? await Exists.queryExists(digits) : undefined;
        if (res === null) return { ok: false, error: "this number isn't on WhatsApp" };
        if (res && res.wid) ids.push(res.wid);
        if (res && res.lid) ids.push(res.lid);
      } catch (e) {
        lookupError = " (lookup: " + msg(e) + ")";
      }
    } else {
      lookupError = " (lookup module missing)";
    }
    ids.push(wid);

    step = "find chat";
    let chat = null;
    let findError = null;
    for (const id of ids) {
      try {
        const found = await FindChat.findOrCreateLatestChat(id);
        chat = (found && found.chat) || found;
        if (chat) break;
      } catch (e) {
        findError = e;
      }
    }
    if (!chat) return { ok: false, error: `WhatsApp (find chat): ${findError ? msg(findError) : "no chat"}${lookupError}` };

    step = "open";
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
    return { ok: false, error: `WhatsApp (${step}): ${msg(e)}` };
  }
}

// After install/update, swap the panel in open WhatsApp tabs for the new
// version (the old copy is cut off from the extension and can't work).
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: WA_URL + "*" });
  for (const tab of tabs) {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["config.js", "phone.js", "content.js"] }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "openSettings") return void chrome.runtime.openOptionsPage();
  if (msg.type !== "openChat" || !sender.tab) return;
  chrome.scripting
    .executeScript({
      target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
      world: "MAIN",
      func: openChatInPage,
      args: [msg.digits],
    })
    // Older Safari returns the value itself instead of [{ result }].
    .then((res) => sendResponse(Array.isArray(res) ? res[0].result : res))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true; // async response
});
