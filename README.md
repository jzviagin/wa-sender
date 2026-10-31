# WA Sender

A Chrome extension that adds a small panel inside your open WhatsApp Web app
window. Paste a phone number (any format), fill in the fields, and click
**Open chat**. The chat opens in the same window and the message is typed into
the box. **Nothing is sent**: you review it and press Enter yourself.

## Install

**From the Chrome Web Store** (no Developer mode): open the store link for
WA Sender and click **Add to Chrome**. Publishing steps are in [STORE.md](STORE.md).

**From this folder** (for testing changes): in `chrome://extensions`, turn on
**Developer mode**, click **Load unpacked**, and choose the `extension` folder.
Don't keep both installed at once, or they'll fight over the panel.

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

## Using the panel

- **Enter** moves to the next field. On the last field it opens the chat.
- After the chat opens with the message, the fields clear for the next customer.
  If the chat couldn't be opened, they stay filled so you can try again.

## Setting the message

Click **Settings** at the bottom of the panel (or right-click the toolbar icon
→ **Options**).

- **Fields:** one per line. Each becomes an input in the panel, in that order,
  with its name as the label. Add as many as you want. The phone number always
  has its own field and isn't one of them.
- **Message:** put `{field name}` wherever a value goes. Click a field's button
  to insert it at the cursor.

Settings sync to every computer where you're signed in to Chrome. If the panel
is open when you save, it updates right away. The panel's preview highlights
fields you haven't filled in yet.

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

- Build the store upload: `./package.sh` (creates `dist/wa-sender-<version>.zip`)
- Phone tests: `node extension/phone.test.js`
- Regenerate icons: `python3 make_icon.py` (needs Pillow)
