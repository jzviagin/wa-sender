// Run: node extension/phone.test.js
const assert = require("assert");
const { normalizePhone } = require("./phone.js");

const cases = {
  "050-123-4567": "+972501234567",
  "0501234567": "+972501234567",
  "501234567": "+972501234567",
  "(050) 123 4567": "+972501234567",
  "+972 50-123-4567": "+972501234567",
  "+972-050-1234567": "+972501234567",
  "972501234567": "+972501234567",
  "00972501234567": "+972501234567",
  "‏050.123.4567‎": "+972501234567",
  "03-1234567": "+97231234567",
};
for (const [raw, want] of Object.entries(cases)) {
  assert.deepStrictEqual(normalizePhone(raw), { number: want, warning: "" }, raw);
}
assert.deepStrictEqual(normalizePhone("+1 415 555 1234"), { number: "+14155551234", warning: "Not an Israeli number" });
assert.ok(normalizePhone("05012").warning);
console.log("ok");
