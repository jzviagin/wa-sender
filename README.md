# WA Sender

A Chrome extension that adds a small panel inside your open WhatsApp Web app
window. Paste a phone number (any format), fill in the fields, and click
**Open chat**. The chat opens in the same window and the message is typed into
the box. **Nothing is sent**: you review it and press Enter yourself.

## Install (one time)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder.
4. Reload your WhatsApp window (Ctrl+R / Cmd+R). A green button appears at the
   bottom left.

It only runs on `web.whatsapp.com`, and the panel only shows up in the
installed WhatsApp app window, not in normal tabs. To show it in tabs too, set
`ONLY_IN_APP_WINDOW = false` at the top of `extension/content.js`.

## Setting the message: `extension/config.json`

```json
{
  "message": "שלום {שם הלקוח},\nהטכנאי שלנו בדרך אליך לרחוב {רחוב}.\nזמן הגעה משוער: {שעה}",
  "params": ["שם הלקוח", "רחוב", "שעה"]
}
```

- `params`: one input field per name, in this order. The name is the field's
  label. Add as many as you want.
- `message`: the text. Put `{param name}` wherever a value goes, spelled exactly
  as in `params`. Use `\n` for a new line.
- The phone number isn't a param. It always has its own field at the top.

Changes apply the next time you open the panel. If they don't show up, click
the reload arrow on WA Sender's card in `chrome://extensions`.

The preview highlights params you haven't filled in yet. The panel warns you if
the message uses a `{name}` that isn't listed in `params`.

## How it opens the chat

1. **In place (fast):** it clicks WhatsApp's *New chat*, searches the number,
   and clicks the result showing that number. No reload, same session.
2. **Fallback:** if that doesn't work (WhatsApp changed its layout, or the
   result shows a saved contact's name instead of the number), it reloads
   **the same window** with WhatsApp's own `send?phone=…&text=…` link. That
   takes a few seconds but keeps you logged in. WhatsApp fills in the message
   and still waits for you to send.

## Phone normalization

Any of these become `+972501234567`:
`050-123-4567`, `0501234567`, `501234567`, `(050) 123 4567`,
`+972 50-123-4567`, `+972-050-1234567`, `00972501234567`.
Landlines work too (`03-1234567` → `+97231234567`). A number with a `+` and a
different country code is left alone. The panel warns you if the length looks wrong.

## Development

- Phone tests: `node extension/phone.test.js`
- Regenerate icons: `python3 make_icon.py` (needs Pillow)
