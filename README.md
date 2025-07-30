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

### NEW in v1.2.0:

- English-Arabic keyboard change support:
  - Automatic key mapping for Arabic keyboards so you can use the same shortcut key to change English<->Arabic without having to update shortcut key as each key from Arabic is mapped to its equivalent English key (QWERTY for Arabic 101 and AZERTY for Arabic 102)
- Quick reset functionality:
  - Customizable reset shortcut key
  - Instant recovery without popup interaction
- Extended platform support:
  - Instagram Feed and Reels
  - TikTok
  - Coursera lecture videos
  - Disney Plus
  - Improved iframe detection
  - Support for "Open in New Tab" videos (right click on video and select "Open in New Tab" is available for some platforms like Coursera lectures)



### NEW in v1.2.4:

  - Adding the Arabic language in the extension
  - Improving the interface better


## Installation

### For Chrome

#### From Chrome Web Store

1. Visit the [FilterVideo Chrome Web Store page](https://chromewebstore.google.com/detail/filtervideo/gchjhchmcjnphmbkmllgfalidiakaoea)
2. Read the description and reviews
3. Click "Add to Chrome" if you're happy with the extension or just want to try it out

#### From Source

1. Clone this repository
2. Run `npm install` then `npm run dev` in the root directory
3. Open Chrome and navigate to `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the `dist` directory

### For Firefox

#### From Firefox Add-ons

1. Visit the [FilterVideo Firefox Add-ons page](https://addons.mozilla.org/en-US/firefox/addon/filtervideo/)
2. Read the description and reviews
3. Click "Add to Firefox" if you're happy with the extension or just want to try it out

#### From Source

1. Clone this repository
2. Run `mv firefox/manifest.json src/manifest.json` to replace chrome manifest with firefox manifest
3. Run `npm install` then `npm run dev` in the root directory
4. Open Firefox and navigate to `about:debugging`
5. Click "This Firefox"
6. Click "Load Temporary Add-on"
7. Select the `dist` directory

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

- email: [elamine.beng@gmail.com](mailto:elamine.beng@gmail.com)
- Issues: [GitHub Issues](https://github.com/bengmoh/filter-video/issues)
- Feedback: [Feedback Form](https://forms.gle/muGcKNufR2XzAnVV9)
- Source: [GitHub Repository](https://github.com/bengmoh/filter-video)

## Platform Support

### Fully Supported Platforms

- YouTube
- Instagram (Feed & Reels)
- TikTok
- Netflix
- Disney Plus
- Amazon Prime Video
- Coursera lecture videos
- Zeteo news website
- "Open in New Tab" videos
- Other platforms via iframe detection
- 

### It has been contributed by
<p align="center"> <a href="https://github.com/mohammed-ayoub-javascript"> <img src="https://avatars.githubusercontent.com/u/113200512?v=4" width="100" height="100" style="border-radius: 50%;" alt="Mohammed Ayoub GitHub"/> <br/> <b>Mohammed Ayoub</b> </a> </p>
