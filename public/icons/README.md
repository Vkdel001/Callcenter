# PWA Icons Required

This folder needs the following icon files for PWA functionality:

## Required Icons:
- `icon-192x192.png` - 192x192 pixels
- `icon-512x512.png` - 512x512 pixels

## How to Create Icons:

### Option 1: Use Online PWA Icon Generator
1. Visit: https://www.pwabuilder.com/imageGenerator
2. Upload your company logo or create a simple icon
3. Download the generated icons
4. Place them in this folder

### Option 2: Create Simple Icons Manually
1. Create a 512x512 PNG with:
   - Blue background (#1e40af)
   - White text "NIC" in center
   - Save as `icon-512x512.png`
2. Resize to 192x192 and save as `icon-192x192.png`

### Option 3: Use Existing Favicon (Temporary)
For now, you can copy your existing favicon.ico and rename:
```bash
# If you have a favicon, create temporary icons:
cp favicon.ico icon-192x192.png
cp favicon.ico icon-512x512.png
```

## Current Status:
- ✅ Manifest.json created and references these icons
- ⏳ Icons needed for PWA installation to work
- ✅ App works fine without icons (just won't show proper icon when installed)

## Next Steps:
1. Add the icon files to this folder
2. Test PWA installation in Chrome (look for install prompt)
3. Verify icons appear correctly when app is installed