// Toolbar icon / Alt+Shift+W: toggle the panel in the WhatsApp window.
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
