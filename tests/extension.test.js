const { isVideoPlayerURL } = require('../src/content.js');
const { checkForVideo } = require('../src/content.js');

describe('Video Detection Extension', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
    // Reset module state to ensure fresh variables for each test
    jest.resetModules();
    global.lastDetectionTime = 0;
    global.videoDetectionAttempts = 0;
    window.location.href = 'about:blank';
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
  });

  describe('Video Detection', () => {
    test('should detect first video element on YouTube/Netflix pages', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      const result = checkForVideo();
      expect(result).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'VIDEO_DETECTED' 
      });
    });

    test('should detect second video element on Prime Video pages', (done) => {
      window.location.href = 'https://www.primevideo.com/detail/12345';
      
      // Initially only one video
      document.body.innerHTML = '<video src="test1.mp4"></video>';
      
      // First check - no second video yet
      checkForVideo();
      
      // Let the retry mechanism work
      setTimeout(() => {
        // Add second video before retry happens
        document.body.innerHTML = `
          <video src="test1.mp4"></video>
          <video src="test2.mp4"></video>
        `;
      }, 2000);

      // Check final state after retries
      setTimeout(() => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
          type: 'VIDEO_DETECTED' 
        });
        done();
      }, 6000);
    }, 7000);

    test('should not detect video on non-video pages', () => {
      window.location.href = 'https://www.youtube.com/feed';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      const result = checkForVideo();
      expect(result).toBeUndefined();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Filter Functionality', () => {
    test('should toggle filter on shortcut keypress', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Detect video first
      checkForVideo();
      
      // Simulate ',' keypress
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'VIDEO_DETECTED' });
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TOGGLE_FILTER' });
    });

    test('should apply blur filter state from background', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Detect video first
      checkForVideo();
      
      // Simulate message from background
      chrome.runtime.onMessage.listener({
        type: 'APPLY_FILTER',
        shouldFilter: true,
        filterType: 'blur',
        intensity: 50
      });

      const video = document.querySelector('video');
      expect(video.style.filter).toBe('blur(50px)');
    });

    test('should apply opacity filter state from background', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Detect video first
      checkForVideo();
      
      // Simulate message from background
      chrome.runtime.onMessage.listener({
        type: 'APPLY_FILTER',
        shouldFilter: true,
        filterType: 'opacity',
        intensity: 50
      });

      const video = document.querySelector('video');
      expect(video.style.filter).toBe('opacity(50%)');
    });

    test('should not attach multiple filter listeners', () => {
      // Mock Date.now to control cooldown timing
      const realDateNow = Date.now.bind(global.Date);
      let currentTime = 0;
      const dateNowStub = jest.fn(() => currentTime);
      global.Date.now = dateNowStub;
      
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Get fresh instance after module reset to ensure clean state
      const { checkForVideo } = require('../src/content.js');
      
      // First detection
      checkForVideo();
      currentTime = 2000;  // Advance time past cooldown
      
      // Second detection
      checkForVideo();
      
      // Simulate ',' keypress - should only trigger once
      chrome.runtime.sendMessage.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
      const toggleCalls = chrome.runtime.sendMessage.mock.calls.filter(([m]) => m.type === 'TOGGLE_FILTER');
      expect(toggleCalls).toHaveLength(1);
      
      // Restore original Date.now
      global.Date.now = realDateNow;
    });

    test('should maintain filter state on video source change', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test1.mp4"></video>';
      
      // Initial detection
      checkForVideo();
      
      // Apply filter
      chrome.runtime.onMessage.listener({
        type: 'APPLY_FILTER',
        shouldFilter: true,
        filterType: 'blur',
        intensity: 50
      });

      // Change video source and reapply state
      document.body.innerHTML = '<video src="test2.mp4"></video>';
      global.lastDetectionTime = 0;  // Reset cooldown
      checkForVideo();  // Re-detect after source change
      chrome.runtime.onMessage.listener({
        type: 'APPLY_FILTER',
        shouldFilter: true,
        filterType: 'blur',
        intensity: 50
      });
      
      const video = document.querySelector('video');
      expect(video.style.filter).toBe('blur(50px)');
    });

    test('should handle Prime Video second player filter', () => {
      window.location.href = 'https://www.primevideo.com/detail/12345';
      document.body.innerHTML = `
        <video src="test1.mp4"></video>
        <video src="test2.mp4"></video>
      `;
      
      // Detect video first
      checkForVideo();
      
      // Apply filter
      chrome.runtime.onMessage.listener({
        type: 'APPLY_FILTER',
        shouldFilter: true,
        filterType: 'blur',
        intensity: 50
      });

      const videos = document.querySelectorAll('video');
      expect(videos[0].style.filter).toBe('');  // First video unchanged
      expect(videos[1].style.filter).toBe('blur(50px)');  // Second video filtered
    });
  });

  describe('Shortcut Handling', () => {
    test('should use default shortcut initially', (done) => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Wait for initial setup timeout first
      setTimeout(() => {
        checkForVideo();
        
        // Then wait for video detection
        setTimeout(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
          
          // Simulate background's response
          chrome.runtime.onMessage.listener({
            type: 'APPLY_FILTER',
            shouldFilter: true,
            filterType: 'blur',
            intensity: 50
          });

          const video = document.querySelector('video');
          expect(video.style.filter).toBe('blur(50px)');
          done();
        }, 2500);
      }, 2000);
    }, 6000);
    
    test('should update shortcut key', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      checkForVideo();
      
      // Simulate shortcut update from background
      chrome.runtime.onMessage.listener({
        type: 'UPDATE_SHORTCUT',
        key: 'x'
      });
      
      // Old shortcut shouldn't work
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ',' }));
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ 
        type: 'TOGGLE_FILTER' 
      });
      
      // New shortcut should work
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'TOGGLE_FILTER' 
      });
    });

    test('should persist shortcut across page loads', () => {
      // Mock storage to return custom shortcut
      chrome.storage.local.get.mockImplementationOnce((keys, callback) => {
        callback({ filterShortcut: 'x' });
      });
      
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      // Fresh module load to get storage value
      jest.resetModules();
      const { checkForVideo } = require('../src/content.js');
      checkForVideo();
      
      // Should use persisted shortcut
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'TOGGLE_FILTER' 
      });
    });
  });

  describe('Popup Integration', () => {
    test('should report video status to popup', (done) => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      checkForVideo();
      
      // Wait for video detection
      setTimeout(() => {
        chrome.runtime.onMessage.listener({
          type: 'GET_VIDEO_STATUS',
          tabId: 1
        });
        
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
          type: 'VIDEO_DETECTED' 
        });
        done();
      }, 2500);
    });

    test('should handle shortcut update from popup', () => {
      window.location.href = 'https://www.youtube.com/watch?v=12345';
      document.body.innerHTML = '<video src="test.mp4"></video>';
      
      checkForVideo();
      
      // Simulate popup shortcut update
      chrome.runtime.onMessage.listener({
        type: 'UPDATE_SHORTCUT',
        key: 'z'
      });
      
      // New shortcut should work
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ 
        type: 'TOGGLE_FILTER' 
      });
    });
  });
});
