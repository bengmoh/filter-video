import { isVideoPlayerURL } from './utils/VideoDetection.js';
import { getEquivalentKey } from './utils/KeyMapping.js';
/**
 * Content Script: Handles video detection and filter functionality
 * Responsibilities:
 * - Detects video elements on supported streaming platforms
 * - Manages filter effect on detected videos
 * - Handles keyboard shortcuts for filter toggle
 * - Maintains connection with background script
 */

// ===== State Management =====
let videoDetectionAttempts = 0;
const MAX_ATTEMPTS = 60;
let lastDetectionTime = 0;
const DETECTION_COOLDOWN = 500; // 0.5 second cooldown between detections
let filterListenerAttached = false;
let isExtensionEnabled = true; // Default to true
let currentKeydownHandler = null; // Store keydown handler reference for removal
let videoElement = null;
let currentLayout = "QWERTY";
let equivalentKey = null;
let instagramFeedObserver = null;
let videoCheckRunning = false;
let currentShortcutKey = null;
let currentHandling = isVideoPlayerURL(location.href); // Store current handling type
let currentResetKey = null;
let equivalentResetKey = null;
let tiktokFeedObserver = null;  // Add this with other state variables
let monitoringInterval = null;

// ===== Initialization =====
// Get initial extension state and shortcut key
chrome.runtime.sendMessage({ type: 'GET_IS_ENABLED' }, (response) => {
  isExtensionEnabled = response?.isEnabled;
  console.log('[Content] Extension state:', isExtensionEnabled);
  
  // Get both layout and shortcut in parallel
  chrome.runtime.sendMessage({ type: 'GET_SHORTCUT' }, (shortcutResponse) => {
    currentShortcutKey = shortcutResponse?.key;
  });
  
  chrome.runtime.sendMessage({ type: 'CONTENT_GET_KEYBOARD_LAYOUT' }, (layoutResponse) => {
    currentLayout = layoutResponse?.layout;
  });
  
  chrome.runtime.sendMessage({ type: 'GET_RESET_KEY' }, (resetResponse) => {
    currentResetKey = resetResponse?.key;
    equivalentResetKey = currentResetKey ? getEquivalentKey(currentResetKey, currentLayout) : null;
  });
  
  if (isExtensionEnabled && currentHandling && currentHandling !== 5 && currentHandling !== 6) {
    videoDetectionAttempts = 0;
    setTimeout(checkForVideo, 1000);
  }
});

// ===== Helper Functions =====
// Helper function to get video element using consistent logic
function getVideoElement() {
  if (!isExtensionEnabled) return null;
  
  switch (currentHandling) {
    case -1: // Iframe detection for non supported platforms or direct video URLs
      // Check if it's a direct video page (body has only one video element)
      const bodyChildren = document.body.children;
      if (bodyChildren.length === 1 && bodyChildren[0].tagName === 'VIDEO') {
        const video = bodyChildren[0];
        // Ensure video has a style attribute
        if (!video.hasAttribute('style')) {
          video.setAttribute('style', '');
        }
        return video;
      }
      // Otherwise, look for iframe
      const iframes = document.querySelectorAll('iframe[src][allowfullscreen]');
      if (location.hostname === 'youglish.com' || location.hostname.endsWith('.youglish.com')) return iframes[0];
      for (const iframe of iframes) {
        if (!iframe.src.includes('youtube.com')) {
          return iframe;
        }
      }
      return null;
    case 1: // First handling platform
      return document.querySelector('video[src]');
    case 2: // Second handling platform
      const videos = document.querySelectorAll('video[src]');
      return videos.length > 1 ? videos[1] : null;
    case 3: case 6: // TikTok special handling
      // First try to find active article (/foryou route)
      const container = document.querySelector('article[style=""]');
      const video = container?.querySelector('video') || document.querySelector('video');

      if (video) {
        // Go up three levels to find the container
        const videoContainer = video.parentElement?.parentElement?.parentElement;
        if (videoContainer) {
          // Remove background span
          const bgSpan = videoContainer.querySelector('span[style*="box-sizing: border-box"][style*="display: block"][style*="position: absolute"][style*="inset: 0px"]');
          if (bgSpan) {
            console.log('[Content] Found and removing TikTok background span in video container');
            bgSpan.remove();
          }
        }
        return video;
      }
      return null;
    case 4: // Instagram Reels special handling
      // Find the active image (one with xuzhngd class)
      const activeImg = document.querySelector('img.xz74otr.xuzhngd');
      if (activeImg) {
        // Go up to find the parent container and then find the video element
        const reelContainer = activeImg.parentElement;
        if (reelContainer) {
          const reelVideo = reelContainer.querySelector('video');
          if (reelVideo) {
            console.log('[Content] Found Instagram Reel video element');
            return reelVideo;
          }
        }
      }
      return null;
    case 5: // Instagram Feed special handling
      // Find article without the Play button div (currently playing video)
      const articles = document.querySelectorAll('article');
      for (const article of articles) {
        const playDiv = article.querySelector('div[aria-label="Play"]');
        if (!playDiv) {
          const video = article.querySelector('video');
          if (video && video !== videoElement) {
            console.log('[Content] Found Instagram Feed video element');
            return video;
          }
        }
      }
      return null;
    default:
      return null;
  }
}

// Helper function for safe runtime operations
function safeRuntime(callback) {
  try {
    callback();
  } catch (e) {
    if (e.message.includes('Extension context invalidated')) {
      console.log('[Content] Extension context invalid - this is normal during updates');
    } else {
      console.error('[Content] Unexpected error:', e);
    }
  }
}

// ===== Video Detection =====
function checkForVideo() {
  if (!isExtensionEnabled || videoCheckRunning) {
    console.log('[Content] Extension disabled or video check already running');
    return;
  }

  const currentTime = Date.now();  
  if (currentTime - lastDetectionTime < DETECTION_COOLDOWN) {
    console.log('[Content] Skipping detection - too soon after last detection');
    return;
  }
  
  videoCheckRunning = true;
  console.log('[Content] Checking for video on:', window.location.href);
  const video = getVideoElement(); 
  
  if (video) {
    if (video === videoElement && currentHandling !== 1 && currentHandling !== 6) {
      console.log('[Content] Video already found');
      videoCheckRunning = false;
      // Re-attach filter if not attached (handles edge cases)
      if (!filterListenerAttached) {
        attachFilterToggle(videoElement);
      }
      return true;
    }
    
    videoElement = video;
    videoDetectionAttempts = 0;
    lastDetectionTime = currentTime;
    
    // Set up filter toggle FIRST
    attachFilterToggle(videoElement);
    
    if (videoElement.style.filter) videoElement.style.filter = ''; 

    // THEN notify background about video detection
    console.log('[Content] Video found:', videoElement);
    safeRuntime(() => {
      chrome.runtime.sendMessage({ type: 'VIDEO_DETECTED' });
    });
    
    // Set up continuous monitoring to keep the video element valid
    if (!monitoringInterval) {
      console.log('[Content] Setting up continuous video monitoring');
      monitoringInterval = setInterval(() => {
        // If video element no longer valid, restart detection
        if (!document.contains(videoElement)) {
          console.log('[Content] Video element no longer in DOM, restarting detection');
          videoElement = null;
          videoDetectionAttempts = 0;
          checkForVideo();
        }
      }, 5000); // Check every 5 seconds
    }
    
    videoCheckRunning = false;
    return true;
  }
  
  videoCheckRunning = false;
  videoDetectionAttempts++;
  if (videoDetectionAttempts < MAX_ATTEMPTS) {
    console.log('[Content] Video not found, retrying in 1 second');
    setTimeout(checkForVideo, 1000);
  } else {
    console.log('[Content] Max detection attempts reached');
    
    // Even after MAX_ATTEMPTS, set up a fallback monitoring interval
    // to catch videos that appear later
    if (!monitoringInterval) {
      console.log('[Content] Setting up fallback monitoring after MAX_ATTEMPTS');
      monitoringInterval = setInterval(() => {
        videoDetectionAttempts = 0;
        checkForVideo();
      }, 10000); // Check every 10 seconds
    }
  }
}

// ===== Filter Management =====
function attachFilterToggle(videoElement, key = null) {
  if (filterListenerAttached) return;

  // Shortcut may not have arrived from the background yet (async race)
  const rawKey = key || currentShortcutKey;
  if (typeof rawKey !== 'string' || !rawKey) {
    console.log('[Content] No shortcut key available yet, skipping filter toggle attach');
    return;
  }
  const shortcutKey = rawKey.toLowerCase();
  equivalentKey = getEquivalentKey(shortcutKey, currentLayout);
  equivalentResetKey = currentResetKey ? getEquivalentKey(currentResetKey, currentLayout) : null;

  currentKeydownHandler = (e) => {
    // Synthetic events may lack a key property
    if (typeof e.key !== 'string') return;
    const pressedKey = e.key.toLowerCase();
    if (isExtensionEnabled && (pressedKey === shortcutKey || pressedKey === equivalentKey)) {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'TOGGLE_FILTER' });
    }
  };

  console.log('[Content] Attaching filter toggle with shortcut:', shortcutKey);
  document.addEventListener('keydown', currentKeydownHandler);
  filterListenerAttached = true;
  console.log('[Content] Attached filter toggle with shortcut:', shortcutKey);
}

// Single reset-key listener for the page lifetime: re-adding an anonymous
// listener on every attachFilterToggle call leaked listeners and caused
// duplicate QUICK_RESET messages.
document.addEventListener('keydown', (e) => {
  if (typeof e.key !== 'string' || !currentResetKey) return;
  const pressedKey = e.key.toLowerCase();
  if (isExtensionEnabled && (pressedKey === currentResetKey || pressedKey === equivalentResetKey)) {
    chrome.runtime.sendMessage({ type: 'QUICK_RESET' });
  }
});

// ===== Message Handlers =====
chrome.runtime.onMessage.addListener((message) => {
  // Listen for extension state changes
  if (message.type === 'TOGGLE_EXTENSION') {
    console.log('[Content] Extension state changed:', message.enabled);
    isExtensionEnabled = message.enabled;
    
    if (!isExtensionEnabled) {
      // Clean up when disabled
      videoElement = null;
      if (currentKeydownHandler) {
        console.log('[Content] Extension disabled, cleaning up filter toggle');
        document.removeEventListener('keydown', currentKeydownHandler);
        filterListenerAttached = false;
      }
    } else {
      // Start fresh detection when enabled
      console.log('[Content] Extension enabled, starting video detection');
      videoCheckRunning = false;
      videoDetectionAttempts = 0;
      setTimeout(checkForVideo, 200); // Start detection
      if (currentHandling === 5) {
        startInstagramFeedObserver();
      }
      if (currentHandling === 6) {
        startTiktokFeedObserver();
      }
    }
  }

  if (message.type === 'APPLY_FILTER') {
    if (videoElement) {
      console.log('[Content] Applying filter:', message);
      let filterValue = '';
      if (message.shouldFilter) {
        switch (message.filterType) {
          case 'blur':
            filterValue = `blur(${message.intensity}px)`;
            break;
          case 'opacity':
            filterValue = `opacity(${message.intensity}%)`;
            break;
        }
      }
      if (videoElement.style.filter !== filterValue) {
        videoElement.style.filter = filterValue;
        console.log('[Content] Video filter set to:', videoElement.style.filter);
      } else {
        console.log('[Content] Video filter already set to:', videoElement.style.filter);
      }
    } else {
      console.log('[Content] No video found to apply filter');
    }
  }

  if (message.type === 'UPDATE_SHORTCUT') {
    console.log('[Content] Updating shortcut to:', message.key);
    currentShortcutKey = message.key;
    
    // Remove old listener if exists
    if (currentKeydownHandler) {
      document.removeEventListener('keydown', currentKeydownHandler);
      filterListenerAttached = false;
      console.log('[Content] Removed old shortcut listener');
    }
    
    // Re-attach with new key if we have a video
    if (videoElement) {
      attachFilterToggle(videoElement, message.key);
      console.log('[Content] Attached new shortcut listener');
    } else {
      console.log('[Content] No video found for shortcut update');
    }
  }

  if (message.type === 'DETECTION_READY') {
    console.log('[Content] Detection ready signal received');
    if (currentHandling && currentHandling !== 5 && currentHandling !== 6) {
      videoDetectionAttempts = 0;
      setTimeout(checkForVideo, 200);
    }
  }

  if (message.type === 'CONTENT_UPDATE_KEYBOARD_LAYOUT') {
    console.log('[Content] Updating keyboard layout to:', message.layout);
    currentLayout = message.layout;
    equivalentResetKey = currentResetKey ? getEquivalentKey(currentResetKey, currentLayout) : null;
    // If we have an active video and filter, update the key mapping
    if (videoElement && filterListenerAttached) {
      // Remove old listener
      document.removeEventListener('keydown', currentKeydownHandler);
      filterListenerAttached = false;
      // Re-attach with new layout
      attachFilterToggle(videoElement, currentShortcutKey);
    }
  }

  if (message.type === 'UPDATE_RESET_KEY') {
    console.log('[Content] Updating reset key to:', message.key);
    currentResetKey = message.key;  // Will be null when extension disabled
    equivalentResetKey = currentResetKey ? getEquivalentKey(currentResetKey, currentLayout) : null;
  }

  if (message.type === 'QUICK_RESET_STATE') {
    console.log('[Content] Quick reset state changed:', message.enabled);
    if (!message.enabled) {
      // Clean up when disabled
      videoElement = null;
      cleanupMonitoring();
      
      if (currentKeydownHandler) {
        console.log('[Content] Quick reset - temporarily removing filter toggle');
        document.removeEventListener('keydown', currentKeydownHandler);
        filterListenerAttached = false;
      }
    } else {
      // Start fresh detection when re-enabled
      console.log('[Content] Quick reset - re-enabling and starting video detection');
      videoCheckRunning = false;
      videoDetectionAttempts = 0;
      setTimeout(checkForVideo, 200);
      if (currentHandling === 5) {
        startInstagramFeedObserver();
      }
      if (currentHandling === 6) {
        startTiktokFeedObserver();
      }
    }
  }
});

// ===== URL Change Detection =====
let lastUrl = location.href;
new MutationObserver(() => {
  const currentUrl = location.href;
  if (currentUrl !== lastUrl) {
    console.log('[Content] URL changed from:', lastUrl, 'to:', currentUrl);
    lastUrl = currentUrl;
    
    // Clean up monitoring on URL change
    cleanupMonitoring();
    
    const newHandling = isVideoPlayerURL(currentUrl);
    
    if (newHandling !== currentHandling) currentHandling = newHandling;
    if (currentHandling === 4) {
      videoDetectionAttempts = 0;
      setTimeout(checkForVideo, 200);
    }
    if (currentHandling === 5) {
      startInstagramFeedObserver();
    }
    if (currentHandling === 6) {
      startTiktokFeedObserver();
    }
  }
}).observe(document, {subtree: true, childList: true});

// ===== Instagram Feed Observer =====
if (currentHandling === 5) {
  startInstagramFeedObserver();
} else if (currentHandling === 6) {
  startTiktokFeedObserver();
}

async function startInstagramFeedObserver() {
  // Setup observer for Instagram feed scrolling
  console.log('[Content] Setting up Instagram feed observer');
  let article, scrollContainer;
  // Poll with a delay and a cap: a synchronous while-loop here would
  // block the page's main thread forever if no <article> ever appears
  for (let attempts = 0; !article && attempts < 600; attempts++) {
    article = document.querySelector('article');
    if (!article) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (!article) {
    console.log('[Content] No Instagram article found, giving up on feed observer');
    return;
  }
  scrollContainer = article.parentElement;
  if (scrollContainer) {
    instagramFeedObserver = new MutationObserver(async () => {
      const currentTime = Date.now();
      if (currentTime - lastDetectionTime < DETECTION_COOLDOWN) return;
      console.log('[Content] Instagram feed observer triggered');
      await checkForVideo();
    });
    
    instagramFeedObserver.observe(scrollContainer, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
}

async function startTiktokFeedObserver() {
  console.log('[Content] Setting up TikTok feed observer');
  
  let columnListContainer;
  for (let attempts = 0; !columnListContainer && attempts < 600; attempts++) {
    columnListContainer = document.querySelector('#column-list-container');
    if (!columnListContainer) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before retrying
    }
  }
  if (!columnListContainer) {
    console.log('[Content] No TikTok column-list-container found, giving up on feed observer');
    return;
  }

  console.log('[Content] Found TikTok column-list-container');
  
  tiktokFeedObserver = new MutationObserver(async () => {
    const currentTime = Date.now();
    if (currentTime - lastDetectionTime < DETECTION_COOLDOWN) return;
    console.log('[Content] TikTok scroll detected');
    await checkForVideo();
  });
  
  tiktokFeedObserver.observe(columnListContainer, {
    childList: true,      // Watch for article changes
  });

  // Do initial video check
  videoDetectionAttempts = 0;
  setTimeout(checkForVideo, 200);
}

// Add cleanup when URL changes or when extension is disabled
function cleanupMonitoring() {
  if (monitoringInterval) {
    console.log('[Content] Cleaning up video monitoring');
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
}

// ===== Export for Testing =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isVideoPlayerURL,
    checkForVideo
  };
}