# Publishing to the Chrome Web Store

## Upload

1. Run `./package.sh`. It creates `dist/wa-sender-<version>.zip`.
2. Open the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole),
   click **New item**, and upload the zip.
3. Fill in the tabs using the text below, then **Submit for review**.

For updates: raise `"version"` in `extension/manifest.json`, run `./package.sh`,
and upload the new zip on the item's **Package** tab.

## Store listing tab

**Description**

> Send the same templated WhatsApp message to many customers without retyping it.
>
> Click the WA Sender button in WhatsApp Web, paste the customer's phone number in
> any format (it's converted to international format), and fill in your custom
> fields, such as the customer's name or street. WA Sender opens that chat in your
> existing WhatsApp Web window and types the message for you. Nothing is sent
> automatically: you review the message and press Enter yourself.
>
> Set your message and fields on the settings page.

- **Category:** Workflow & Planning (or Tools)
- **Language:** Hebrew (or English)
- **Screenshot:** `store/screenshot-1280x800.png`. A real screenshot of the panel
  in your own WhatsApp looks better; it must be 1280x800 or 640x400.
- **Icon:** `extension/icons/128.png`

## Privacy practices tab

**Single purpose**

> Fills a user-defined message template for a given phone number into a WhatsApp
> Web chat so the user can review and send it.

**Permission justifications**

- **scripting:** Opens the requested chat inside the already-open WhatsApp Web
  page. It also loads the panel into a WhatsApp Web tab that was open before the
  extension was installed, so the user doesn't have to reload WhatsApp.
- **storage:** Saves the user's message template and field names so they persist
  and sync across the user's computers.
- **Host permission (web.whatsapp.com):** The extension only works on WhatsApp
  Web, where it shows its panel and opens chats. It runs on no other site.
- **Remote code:** No. All code is included in the package.

**Data usage**

Leave every data type unchecked. Phone numbers and names are only used inside
the page to fill in the message. They are not stored or sent anywhere. Then tick
the three certification boxes (no selling or transfer of data, no unrelated use,
no creditworthiness use).

## Distribution tab

- **Visibility:** **Unlisted**. Only people with the link can find and install it.
- **Regions:** all regions, or just Israel.
