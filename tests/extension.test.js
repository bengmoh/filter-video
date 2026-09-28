/**
 * Tests load a fresh content.js module per test (jest.resetModules), because
 * the module keeps state (videoElement, filterListenerAttached, cooldown).
 * Document-level keydown listeners from previous instances survive across
 * tests, so each test that dispatches keys first rebinds its own instance to
 * a unique shortcut via UPDATE_SHORTCUT and dispatches that key only.
 */

describe('Video Detection Extension', () => {
  let isVideoPlayerURL, checkForVideo;

  // Rebind the freshest module instance (last registered onMessage listener)
  const setShortcut = (key) => {
    chrome.runtime.onMessage.listener({ type: 'UPDATE_SHORTCUT', key });
  };

  const applyFilter = (filterType, intensity) => {
    chrome.runtime.onMessage.listener({
      type: 'APPLY_FILTER',
      shouldFilter: true,
      filterType,
      intensity
    });
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    window.location.href = 'about:blank';
    jest.resetModules();
    ({ isVideoPlayerURL, checkForVideo } = require('../src/content.js'));
  });

  describe('URL Detection', () => {
    test('should identify video pages correctly', () => {
      const testCases = [
        // YouTube
        { url: 'https://www.youtube.com/watch?v=12345', expected: 1 },
        { url: 'https://www.youtube.com/feed', expected: 0 },

        // Netflix
        { url: 'https://www.netflix.com/watch/12345', expected: 1 },
        { url: 'https://www.netflix.com/browse', expected: 0 },
        { url: 'https://www.netflix.com/watch/12345?miniDpPlayButton', expected: 0 },

        // Prime
        { url: 'https://www.primevideo.com/detail/12345', expected: 2 },
        { url: 'https://www.primevideo.com/browse', expected: 0 }
      ];

      testCases.forEach(({ url, expected }) => {
        expect(isVideoPlayerURL(url)).toBe(expected);
      });
    });

    test('should not treat spoofed URLs as platform pages', () => {
      expect(isVideoPlayerURL('https://evil.com/youtube.com/watch?v=1')).toBe(-1);
      expect(isVideoPlayerURL('https://evil.com/?ref=netflix.com/watch')).toBe(-1);
      expect(isVideoPlayerURL('https://youtube.com.evil.com/watch')).toBe(-1);
    });

    test('should handle invalid and non-http URLs', () => {
      expect(isVideoPlayerURL(undefined)).toBe(0);
      expect(isVideoPlayerURL('')).toBe(0);
      expect(isVideoPlayerURL('not a url')).toBe(0);
      expect(isVideoPlayerURL('about:blank')).toBe(0);
      expect(isVideoPlayerURL('chrome://extensions')).toBe(0);
    });
  });

  describe('Video Detection', () => {
    test('should detect first video element on YouTube/Netflix pages', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      const result = checkForVideo();
      expect(result).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });
    });

    test('should detect second video element on Prime Video pages', () => {
      window.location.href = 'https://www.primevideo.com/detail/12345';

      // Only one video: Prime handling requires a second one
      document.body.innerHTML = '<video src="test1.mp4"></video>';
      expect(checkForVideo()).not.toBe(true);
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });

      // Second video appears
      document.body.innerHTML = `
        <video src="test1.mp4"></video>
        <video src="test2.mp4"></video>
      `;
      advanceMockTime(1000);
      expect(checkForVideo()).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });
    });

    test('should not detect video on non-video pages', () => {
      window.location.href = 'https://www.youtube.com/feed';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      const result = checkForVideo();
      expect(result).not.toBe(true);
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });
    });
  });

  describe('Filter Functionality', () => {
    test('should toggle filter on shortcut keypress', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      setShortcut('1');

      chrome.runtime.sendMessage.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });

    test('should apply blur filter state from background', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      applyFilter('blur', 50);

      const video = document.querySelector('video');
      expect(video.style.filter).toBe('blur(50px)');
    });

    test('should apply opacity filter state from background', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      applyFilter('opacity', 50);

      const video = document.querySelector('video');
      expect(video.style.filter).toBe('opacity(50%)');
    });

    test('should not attach multiple filter listeners', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      // Two detection passes must not stack keydown listeners
      checkForVideo();
      advanceMockTime(1000);
      checkForVideo();
      setShortcut('2');

      chrome.runtime.sendMessage.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
      const toggleCalls = chrome.runtime.sendMessage.mock.calls.filter(([m]) => m.type === 'TOGGLE_FILTER');
      expect(toggleCalls).toHaveLength(1);
    });

    test('should maintain filter state on video source change', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test1.mp4"></video>';

      checkForVideo();
      applyFilter('blur', 50);

      // Change video source and reapply state
      document.body.innerHTML = '<video src="test2.mp4"></video>';
      advanceMockTime(1000);
      checkForVideo();
      applyFilter('blur', 50);

      const video = document.querySelector('video');
      expect(video.style.filter).toBe('blur(50px)');
    });

    test('should handle Prime Video second player filter', () => {
      window.location.href = 'https://www.primevideo.com/detail/12345';
      document.body.innerHTML = `
        <video src="test1.mp4"></video>
        <video src="test2.mp4"></video>
      `;

      checkForVideo();
      applyFilter('blur', 50);

      const videos = document.querySelectorAll('video');
      expect(videos[0].style.filter).toBe('');  // First video unchanged
      expect(videos[1].style.filter).toBe('blur(50px)');  // Second video filtered
    });

    test('should ignore synthetic keydown events without a key', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      chrome.runtime.sendMessage.mockClear();
      // Must not throw or toggle
      document.dispatchEvent(new KeyboardEvent('keydown', {}));
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });
  });

  describe('Shortcut Handling', () => {
    test('should use the shortcut provided by the background script', () => {
      // The background answers GET_SHORTCUT; content must bind that key
      jest.resetModules();
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (typeof callback !== 'function') return;
        const responses = {
          GET_IS_ENABLED: { isEnabled: true },
          GET_SHORTCUT: { key: '3' },
          CONTENT_GET_KEYBOARD_LAYOUT: { layout: 'QWERTY' },
          GET_RESET_KEY: { key: 'r' }
        };
        callback(responses[message.type] || {});
      });
      const fresh = require('../src/content.js');

      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      fresh.checkForVideo();

      chrome.runtime.sendMessage.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });

    test('should update shortcut key', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      setShortcut('4');

      chrome.runtime.sendMessage.mockClear();
      // A key never bound by any instance does nothing
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });

      // The new shortcut works
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });
  });

  describe('Popup Integration', () => {
    test('should notify background when a video is detected', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });
    });

    test('should handle shortcut update from popup', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';

      checkForVideo();
      setShortcut('5');

      chrome.runtime.sendMessage.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });
  });
});
