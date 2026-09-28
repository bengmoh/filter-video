import { isVideoPlayerURL } from './utils/VideoDetection.js';

/**
 * Background Script: Manages extension state and coordinates between components
 * Responsibilities:
 * - Maintains video detection state across tabs
 * - Manages extension settings and persistence
 * - Coordinates messaging between popup and content scripts
 * - Keeps service worker alive for consistent functionality
 */

// ===== State Management =====
// Store tabs with detected videos: tabId -> { detected: boolean, filtered: boolean }
let detectedVideoTabs = new Map();

// Extension settings with defaults
let isExtensionEnabled; // Default to enabled
let filterShortcut;  // Default shortcut key
let filterType; // Default filter type
let filterIntensity;  // Default filter intensity
let filterOnDetection; // Default filter on detection
let keyboardLayout; // Default keyboard layout
let resetKey;  // Default reset key

// ===== Initialization =====
// Function to manage alarm
function updateAlarm(enabled) {
  if (enabled) {
    chrome.alarms.create('keepAlive', { periodInMinutes: 0.05 }); // Every 3 seconds for better reliability across different systems to prevent the extension from being killed
  } else {
    chrome.alarms.clear('keepAlive');
  }
}

/**
 * Updates the extension icon based on enabled state
 * @param {boolean} enabled - Whether the extension is enabled
 */
function updateIcon(enabled) {
  const iconPath = enabled ? 'icons/icon32.png' : 'icons/icon32-disabled.png';
  chrome.action.setIcon({ path: iconPath });
}

// Load saved state and set up initial alarm
chrome.storage.local.get(['filterShortcut', 'filterIntensity', 'isEnabled', 'filterType', 'filterOnDetection', 'keyboardLayout', 'resetKey'], (result) => {
  isExtensionEnabled = result.isEnabled ?? true;
  filterShortcut = result.filterShortcut ?? ',';
  filterType = result.filterType ?? 'blur';
  filterIntensity = result.filterIntensity ?? 50;
  filterOnDetection = result.filterOnDetection ?? false;
  keyboardLayout = result.keyboardLayout ?? 'QWERTY';
  resetKey = result.resetKey ?? 'r';
  console.log('[Background] Loaded extension state:', isExtensionEnabled);
  updateAlarm(isExtensionEnabled); // Set initial alarm state
  updateIcon(isExtensionEnabled); // Set initial icon state
});

// ===== Helper Functions =====
/**
 * Safely sends a message to a tab with error handling
 * @param {number} tabId - Target tab ID
 * @param {object} message - Message to send
 */
function safeSendMessage(tabId, message) {
  // First check if the tab exists and is ready
  chrome.tabs.get(tabId).then(tab => {
    if (tab.status === 'complete' && !tab.url.startsWith('chrome://')) {
      return chrome.tabs.sendMessage(tabId, message).catch(() => {
        // Silently ignore connection errors
      });
    }
  }).catch(() => {
    // Silently ignore if tab doesn't exist
  });
}

/**
 * Safely broadcasts a message to the extension
 * @param {object} message - Message to broadcast
 */
function safeBroadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Silently ignore connection errors
  });
}

// Add helper function for Map logging at the top with other helper functions
function logDetectedTabs(action, tabId = null) {
  if (!IS_DEV) return;  // Only run in development
  
  chrome.tabs.query({}, (tabs) => {
    const tabMap = {};
    detectedVideoTabs.forEach((state, id) => {
      const tab = tabs.find(t => t.id === id);
      tabMap[id] = {
        title: tab ? tab.title : 'Tab not found',
        state: state
      };
    });
    console.log(`[Tab Map ${action}] Current tabs (${detectedVideoTabs.size}):`);
    console.table(tabMap);
    if (tabId) {
      const tab = tabs.find(t => t.id === tabId);
      console.log(`[Tab Map ${action}] Affected tab:`, tab ? tab.title : 'Tab not found', `(ID: ${tabId})`);
    }
  });
}

// ===== Tab Event Handlers =====
// Handle tab switching (instant check, no detection needed)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (isVideoPlayerURL(tab.url)) {
    console.log('[Tab Switch] Video page:', tab.url);
    // Remove this log if tab is not yet detected
    if (detectedVideoTabs.has(tab.id)) {
      console.log('[Tab Switch] Video already detected in this tab');
    }
  }
});

// Handle URL changes within the same tab
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('[URL Change] History state updated:', details.url);
  if (details.frameId === 0) { // Only handle main frame updates
    // If NOT a video page, we should delete the entry
    if (!isVideoPlayerURL(details.url)) {
      console.log('[URL Change] Not a video page:', details.url);
      if (detectedVideoTabs.has(details.tabId)) {
        detectedVideoTabs.delete(details.tabId);
        logDetectedTabs('URL_CHANGE_REMOVAL', details.tabId);
      }
      // Notify about video status change
      safeBroadcast({ 
        type: 'VIDEO_STATUS_CHANGED',
        tabId: details.tabId,
        hasVideo: false 
      });
    } else {
      // Only send DETECTION_READY for video pages
      console.log('[URL Change] Video page detected, sending DETECTION_READY');
      chrome.tabs.sendMessage(details.tabId, { type: 'DETECTION_READY' }).catch(error => {
        console.log('[URL Change] Could not send DETECTION_READY - normal for non-video pages');
      });
    }
  }
});

// ===== Message Handler =====
// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message);
  console.log('[Background] From:', sender?.tab?.id);
  
  // Handle GET_VIDEO_STATUS (from popup) separately as it doesn't need tabId from sender
  if (message.type === 'GET_VIDEO_STATUS' && message.tabId) {
    const hasVideo = detectedVideoTabs.has(message.tabId);
    console.log('[Background] Video status request for tab:', message.tabId, 'Has video:', hasVideo);
    sendResponse({ hasVideo });
    return true;  // Keep message channel open
  }

  if (message.type === 'GET_FILTER_ON_DETECTION') {
    sendResponse({ autoFilter: filterOnDetection });
    return true;
  }

  // Special handling for TOGGLE_EXTENSION as it comes from popup
  if (message.type === 'TOGGLE_EXTENSION') {
    isExtensionEnabled = message.enabled === true;
    chrome.storage.local.set({ isEnabled: isExtensionEnabled });
    console.log('[Background] Extension toggled to:', isExtensionEnabled);
    
    updateIcon(isExtensionEnabled); // Update icon when state changes
    
    if (!isExtensionEnabled) {
      // Disable filter for all detected videos when extension is disabled
      for (const [tabId, state] of detectedVideoTabs.entries()) {
        console.log('[Background] Checking tab:', tabId, 'State:', state);
        // Only disable filter if the video is currently filtered
        if (state.filtered) {
          console.log('[Background] Removing filter from tab:', tabId);
          safeSendMessage(tabId, {
            type: 'APPLY_FILTER',
            shouldFilter: false,
            intensity: filterIntensity,
            filterType: filterType
          });
        }
      }
      // Notify all tabs to disable reset key
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => safeSendMessage(tab.id, {
          type: 'UPDATE_RESET_KEY',
          key: null  // Set to null when disabled
        }));
      });
      // Clear the detection map after sending disable filter messages
      detectedVideoTabs.clear();
      logDetectedTabs('DISABLING');
    } else {
      // When re-enabling, restore reset key
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => safeSendMessage(tab.id, {
          type: 'UPDATE_RESET_KEY',
          key: resetKey
        }));
      });
    }
    // send the message to all tabs to update their isExtensionEnabled state
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => safeSendMessage(tab.id, {
        type: 'TOGGLE_EXTENSION',
        enabled: isExtensionEnabled
      }));
    });    
    updateAlarm(isExtensionEnabled);
    sendResponse({ success: true, isEnabled: isExtensionEnabled });
    return true;
  }

  if (message.type === 'TOGGLE_FILTER_ON_DETECTION') {
    filterOnDetection = message.enabled === true;
    chrome.storage.local.set({ filterOnDetection: filterOnDetection });
    console.log('[Background] Filter on detection toggled to:', filterOnDetection);
    return true;
  }

  const tabId = sender.tab?.id;
  console.log('[Background] Processing message for tab:', tabId);
  
  // Handle content script messages
  switch(message.type) {
    case 'VIDEO_DETECTED':
      if (!isExtensionEnabled) {
        console.log('[Background] Extension disabled, ignoring video detection');
        return;
      }
      console.log('[Background] Video detected in tab:', tabId);
      // Initialize with both detected and blur state
      detectedVideoTabs.set(tabId, { 
        detected: true, 
        filtered: filterOnDetection  // Initialize filter state
      });
      logDetectedTabs('DETECTION', tabId);

      if (filterOnDetection) {
        safeSendMessage(tabId, {
          type: 'APPLY_FILTER',
          shouldFilter: true,
          intensity: filterIntensity,
          filterType: filterType
        });
      }

      // Broadcast to popup
      safeBroadcast({ 
        type: 'VIDEO_DETECTED',
        tabId: tabId
      });
      break;
      
    case 'TOGGLE_FILTER':
      const state = detectedVideoTabs.get(tabId);
      console.log('[Background] Before toggle - Tab state:', state);
      if (state) {
        state.filtered = !state.filtered;  // Toggle filter state
        detectedVideoTabs.set(tabId, state);
        console.log('[Background] After toggle New filtered:', state.filtered);
        safeSendMessage(tabId, {
          type: 'APPLY_FILTER',
          shouldFilter: state.filtered,
          intensity: filterIntensity,
          filterType: filterType
        });
      }
      break;

    case 'UPDATE_SHORTCUT':
      if (typeof message.key !== 'string' || !message.key || message.key.length > 20) {
        console.log('[Background] Ignoring invalid shortcut key:', message.key);
        break;
      }
      console.log('[Background] Updating shortcut key to:', message.key);
      filterShortcut = message.key;
      // Save to storage
      chrome.storage.local.set({ filterShortcut: message.key });
      // Notify only tabs with videos
      chrome.tabs.query({}, (tabs) => {
        console.log('[Background] Broadcasting shortcut update to video tabs');
        tabs.forEach(tab => {
          if (detectedVideoTabs.has(tab.id)) {
            safeSendMessage(tab.id, {
              type: 'UPDATE_SHORTCUT',
              key: filterShortcut
            });
          }
        });
      });
      break;

    case 'GET_SHORTCUT':
      sendResponse({ key: filterShortcut });
      return true;  // Keep message channel open

    case 'GET_IS_ENABLED':
      sendResponse({ isEnabled: isExtensionEnabled });
      return true;  // Keep message channel open

    case 'GET_FILTER_INTENSITY':
      sendResponse({ intensity: filterIntensity });
      return true;  // Keep message channel open

    case 'UPDATE_FILTER_INTENSITY':
      console.log('[Background] Updating filter intensity to:', message.intensity);
      // Clamp to the slider's valid range before it reaches any style sink
      filterIntensity = Math.min(100, Math.max(1, Number(message.intensity) || 50));
      // Save to storage
      chrome.storage.local.set({ filterIntensity: filterIntensity });
      // Update any active filtered videos
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          const state = detectedVideoTabs.get(tab.id);
          if (state?.filtered) {
            safeSendMessage(tab.id, {
              type: 'APPLY_FILTER',
              shouldFilter: true,
              intensity: filterIntensity,
              filterType: filterType
            });
          }
        });
      });
      break;

    case 'GET_FILTER_TYPE':
      sendResponse({ filterType });
      return true;  // Keep message channel open

    case 'UPDATE_FILTER_TYPE':
      if (message.filterType !== 'blur' && message.filterType !== 'opacity') {
        console.log('[Background] Ignoring invalid filter type:', message.filterType);
        break;
      }
      console.log('[Background] Updating filter type to:', message.filterType);
      filterType = message.filterType;
      // Save to storage
      chrome.storage.local.set({ filterType: message.filterType });
      // Update any active filtered videos
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          const state = detectedVideoTabs.get(tab.id);
          if (state?.filtered) {
            safeSendMessage(tab.id, {
              type: 'APPLY_FILTER',
              shouldFilter: true,
              intensity: filterIntensity,
              filterType: filterType
            });
          }
        });
      });
      break;

    case 'POPUP_GET_KEYBOARD_LAYOUT':
    case 'CONTENT_GET_KEYBOARD_LAYOUT':
      sendResponse({ layout: keyboardLayout });
      return true;

    case 'POPUP_UPDATE_KEYBOARD_LAYOUT':
      if (message.layout !== 'QWERTY' && message.layout !== 'AZERTY') {
        console.log('[Background] Ignoring invalid keyboard layout:', message.layout);
        break;
      }
      console.log('[Background] Updating keyboard layout to:', message.layout);
      keyboardLayout = message.layout;
      chrome.storage.local.set({ keyboardLayout: message.layout });
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (detectedVideoTabs.has(tab.id)) {
            safeSendMessage(tab.id, {
              type: 'CONTENT_UPDATE_KEYBOARD_LAYOUT',
              layout: keyboardLayout
            });
          }
        });
      });
      break;

    case 'GET_RESET_KEY':
      sendResponse({ key: resetKey });
      return true;

    case 'UPDATE_RESET_KEY':
      if (typeof message.key !== 'string' || !message.key || message.key.length > 20) {
        console.log('[Background] Ignoring invalid reset key:', message.key);
        break;
      }
      console.log('[Background] Updating reset key to:', message.key);
      resetKey = message.key;
      chrome.storage.local.set({ resetKey: message.key });
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (detectedVideoTabs.has(tab.id)) {
            safeSendMessage(tab.id, {
              type: 'UPDATE_RESET_KEY',
              key: resetKey
            });
          }
        });
      });
      break;

    case 'QUICK_RESET':
      // Only handle if extension is enabled and we have the tab ID
      if (isExtensionEnabled && sender.tab?.id) {
        console.log('[Background] Quick reset triggered for tab:', sender.tab.id);
        const tabId = sender.tab.id;
        
        // Only reset this specific tab
        safeSendMessage(tabId, {
          type: 'QUICK_RESET_STATE',
          enabled: false
        });
        
        // Re-enable after delay for this tab only
        setTimeout(() => {
          safeSendMessage(tabId, {
            type: 'QUICK_RESET_STATE',
            enabled: true
          });
        }, 500);
      }
      break;
  }
});

// ===== Cleanup and Maintenance =====
// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (detectedVideoTabs.has(tabId)) {
    console.log('[Tab Closed] Removing detected video for tab:', tabId);
    detectedVideoTabs.delete(tabId);
    logDetectedTabs('REMOVAL', tabId);
  }
});

// Keep alive handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Check if extension is enabled
    chrome.storage.local.get(['isEnabled'], (result) => {
      if (result.isEnabled) {
        console.log('[Background] Extension active');
      }
    });
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isVideoPlayerURL,
    detectedVideoTabs
  };
}