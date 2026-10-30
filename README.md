# WA Sender

A Chrome extension that adds a small panel inside your open WhatsApp Web app
window. Paste a phone number (any format), fill in the fields, and click
**Open chat**. The chat opens in the same window and the message is typed into
the box. **Nothing is sent**: you review it and press Enter yourself.

## Install (one time)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder.
4. Click the puzzle-piece icon in Chrome's toolbar and pin **WA Sender**.

## Opening the panel

Any of these opens or closes the panel in your WhatsApp window:

- Click the **WA Sender** icon in Chrome's toolbar. If you're on another tab,
  it switches to WhatsApp first.
- Press **Cmd+E** on Mac (Ctrl+Shift+S on Windows). You can change this in
  `chrome://extensions/shortcuts`.
- Click the green button next to the "WhatsApp" title at the top of the chat list.
  If it isn't where you want it, **drag it** anywhere and it stays there.
  *Reset button position* at the bottom of the panel moves it back.

It only runs on `web.whatsapp.com`.

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

It never reloads WhatsApp. It tries these in order:

1. **Direct:** asks WhatsApp Web's own code to open the chat for the number,
   the same thing that happens when you click a chat.
2. **Search:** clicks *New chat*, searches the number, and clicks the result.
3. **Neither worked:** it copies the message to the clipboard and shows why each
   way failed (the *Details* line). Open the chat yourself and paste.

## Phone normalization

Any of these become `+972501234567`:
`050-123-4567`, `0501234567`, `501234567`, `(050) 123 4567`,
`+972 50-123-4567`, `+972-050-1234567`, `00972501234567`.
Landlines work too (`03-1234567` → `+97231234567`). A number with a `+` and a
different country code is left alone. The panel warns you if the length looks wrong.

## Development

- Phone tests: `node extension/phone.test.js`
- Regenerate icons: `python3 make_icon.py` (needs Pillow)
