"""Regenerate the icons (assets/icon.png and extension/icons/*.png). Needs Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle((40, 40, S - 40, S - 40), radius=220, fill=(37, 211, 102))
# Speech bubble with a tail.
d.ellipse((200, 210, 824, 760), fill="white")
d.polygon([(290, 640), (220, 860), (450, 730)], fill="white")
# Paper plane inside the bubble.
d.polygon([(330, 480), (700, 330), (580, 650), (500, 540)], fill=(18, 140, 126))
d.polygon([(500, 540), (700, 330), (530, 610)], fill=(7, 94, 84))

out = Path(__file__).parent / "assets"
out.mkdir(exist_ok=True)
img.save(out / "icon.png")
icons = Path(__file__).parent / "extension" / "icons"
icons.mkdir(exist_ok=True)
for size in (16, 48, 128):
    img.resize((size, size), Image.LANCZOS).save(icons / f"{size}.png")
