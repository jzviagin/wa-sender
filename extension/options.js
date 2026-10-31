const $ = (id) => document.getElementById(id);

function current() {
  return {
    message: $("message").value,
    params: [...new Set($("params").value.split("\n").map((s) => s.trim()).filter(Boolean))],
  };
}

function render() {
  const cfg = current();
  $("chips").replaceChildren(...cfg.params.map((name) => {
    const b = document.createElement("button");
    b.textContent = `{${name}}`;
    b.dir = "auto";
    b.addEventListener("click", () => {
      const m = $("message");
      m.setRangeText(`{${name}}`, m.selectionStart, m.selectionEnd, "end");
      m.focus();
      render();
    });
    return b;
  }));
  // Preview with each field shown as [field name].
  $("preview").textContent = cfg.message.replace(/\{([^{}]+)\}/g, (m, n) => (cfg.params.includes(n) ? `[${n}]` : m));
  const unknown = unknownPlaceholders(cfg);
  const unused = cfg.params.filter((p) => !cfg.message.includes(`{${p}}`));
  $("warn").textContent = [
    unknown.length ? `⚠ The message uses {${unknown.join("}, {")}}, which isn't a field.` : "",
    unused.length ? `⚠ Not used in the message: ${unused.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
  $("saved").textContent = "";
}

function show(cfg) {
  $("message").value = cfg.message;
  $("params").value = cfg.params.join("\n");
  render();
}

$("message").addEventListener("input", render);
$("params").addEventListener("input", render);
$("save").addEventListener("click", async () => {
  await setConfig(current());
  $("saved").textContent = "Saved ✓";
});
$("reset").addEventListener("click", () => show(DEFAULT_CONFIG));
getConfig().then(show);
