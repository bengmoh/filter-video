# FilterVideo

Web extension that detects the video, and allows you to apply the filter (blur/opacity) using a customizable keyboard shortcut.

## Features

- Video filters with customizable keyboard shortcut:
  - Blur filter with adjustable intensity (1-100%)
  - Opacity filter with adjustable level (1-100%)
- Auto-filter on video detection (optional)
- Support for multiple platforms:
  - YouTube
  - Netflix
  - Amazon Prime Video
  - Disney Plus
  - Other platforms via iframe detection
- Global enable/disable switch
- Persistent settings across browser sessions

## Installation

### For Chrome

#### From Chrome Web Store

1. Visit the [FilterVideo Chrome Web Store page](https://chromewebstore.google.com/detail/filtervideo/gchjhchmcjnphmbkmllgfalidiakaoea)
2. Read the description and reviews
3. Click "Add to Chrome" if you're happy with the extension or just want to try it out

#### From Source

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `src` directory

### For Firefox

#### From Firefox Add-ons

1. Visit the [FilterVideo Firefox Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/filtervideo/)
2. Read the description and reviews
3. Click "Add to Firefox" if you're happy with the extension or just want to try it out

#### From Source

1. Clone this repository
2. mv firefox/manifest.json src/manifest.json
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select the `src` directory

## Usage

1. Click the FilterVideo icon in your browser toolbar
2. Use the toggle switch to enable/disable the extension
3. Choose your preferred shortcut key
   - Default: ',' (recommended as it's close to 'm' for mute)
4. Adjust filter intensity using the slider
5. Press the shortcut key while watching a video to toggle the filter

### Platform-Specific Behavior

#### Mainstream Platforms (YouTube, Netflix, Prime Video, Disney Plus)

- Full functionality with keyboard shortcuts working everywhere
- Filter toggles work seamlessly
- Auto-filter option available

#### Other Platforms (iframe detection)

Important: Due to cross-origin security, there are some limitations:

- Keyboard shortcut only work when focus is outside the video frame
- To use effectively:
  1. Zoom the page if needed (two-finger gesture) but don't toggle full screen
  2. Click just outside the video frame to ensure the shortcut works
  3. Consider using a shortcut key near your device's mute button for easier control. For example, '-' is close to the mute button on Mac.

"Auto-Filter on Detection" in settings:

- Videos will automatically be filtered when detected
- Then you can toggle filter manually using the shortcut key

## Troubleshooting

### Shortcut Not Working

1. Check if extension is enabled
2. Try refreshing the page
3. If platform uses iframe, try clicking outside the iframe, and then press the shortcut key.

### Video Not Detected

1. Refresh the page
2. Disable and re-enable the extension
3. Reload the extension from chrome://extensions

### Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests:

   ```bash
   npm run test
   ```

3. Build for production:

   ```bash
   npm run package
   ```

   This will create a production build in the `dist` directory and a ZIP file ready for the Chrome Web Store.

   -> For Firefox, you need to 'mv firefox/manifest.json src/manifest.json' and then run the same command.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Privacy & Permissions

The extension requires minimal permissions:

- `tabs`: For video detection
- `webNavigation`: For URL change tracking
- `storage`: For saving preferences
- `alarms`: For consistent functionality

We do not:

- Collect any user data
- Make external network requests
- Process any video content

## Support

- Email: [elamine.beng@gmail.com](mailto:elamine.beng@gmail.com)
- Issues: [GitHub Issues](https://github.com/bengmoh/filter-video/issues)
- Feedback: [Feedback Form](https://forms.gle/muGcKNufR2XzAnVV9)
- Source: [GitHub Repository](https://github.com/bengmoh/filter-video)

## Translation

* [العربية](./README.ar.md)
* [English](./README.md)
* [Français](./README.fr.md)