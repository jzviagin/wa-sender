// Message and fields, stored in Chrome sync storage (edited on the settings page).
const DEFAULT_CONFIG = {
  message: "אהלן {שם הלקוח},\nזה קובי זיו, מקווה שהכל טוב אצלך :)\nהדירה ב{רחוב} מתפנה להשכרה בחודשים הקרובים?",
  params: ["שם הלקוח", "רחוב"],
};

async function getConfig() {
  const { config } = await chrome.storage.sync.get("config");
  if (config && typeof config.message === "string" && Array.isArray(config.params)) return config;
  return DEFAULT_CONFIG;
}

function setConfig(config) {
  return chrome.storage.sync.set({ config });
}

// {names} the message uses that aren't fields.
function unknownPlaceholders(config) {
  return [...config.message.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]).filter((n) => !config.params.includes(n));
}
