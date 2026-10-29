// Turn any pasted Israeli number into +972XXXXXXXXX.
// Returns {number, warning}. A "+" with a foreign country code is left alone.
function normalizePhone(raw) {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return { number: "", warning: "No digits found" };
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("972")) digits = digits.slice(3);
  else if (raw.trim().startsWith("+")) return { number: "+" + digits, warning: "Not an Israeli number" };
  digits = digits.replace(/^0+/, "");
  const number = "+972" + digits;
  if (digits.length !== 8 && digits.length !== 9)
    return { number, warning: `Unusual length (${digits.length} digits after 972)` };
  return { number, warning: "" };
}

if (typeof module !== "undefined") module.exports = { normalizePhone };
