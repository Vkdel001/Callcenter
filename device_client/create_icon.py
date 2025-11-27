"""
Create a simple icon for the application
Run this to generate icon.ico if you don't have one
"""

from PIL import Image, ImageDraw

# Create a simple green circle icon
size = 256
img = Image.new('RGB', (size, size), color='white')
draw = ImageDraw.Draw(img)

# Draw green circle
margin = 20
draw.ellipse([margin, margin, size-margin, size-margin], fill='#00AA00', outline='#008800', width=5)

# Draw white "N" in center
font_size = 120
text_x = size // 2 - 40
text_y = size // 2 - 60
# Simple N shape using lines
draw.line([text_x, text_y, text_x, text_y + font_size], fill='white', width=15)
draw.line([text_x, text_y, text_x + 60, text_y + font_size], fill='white', width=15)
draw.line([text_x + 60, text_y, text_x + 60, text_y + font_size], fill='white', width=15)

# Save as ICO
img.save('icon.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
print("✓ icon.ico created successfully")
