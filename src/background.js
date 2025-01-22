import { UPDATE_EXT_ICON, CHANGED_TAB } from "./message_type";

let currentTabId = null;

// Set default state when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isExtActivated: true,
    shortcut: "ctl+m",
    filterType: "blur",
    intensity: 50,
    autoFilter: true,
  });
});

// Update the current tab ID on activation
chrome.tabs.onActivated.addListener(({ tabId }) => {
  currentTabId = tabId;
  chrome.tabs.sendMessage(currentTabId, { type: CHANGED_TAB });
});

// Get the current active tab ID at startup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0) {
    currentTabId = tabs[0].id;
  }
});

// Handle runtime messages
chrome.runtime.onMessage.addListener((req) => {
  if (req.type === UPDATE_EXT_ICON) {
    chrome.action.setIcon({
      path: req.isExtActivated
        ? "icons/icon32.png"
        : "icons/icon32-disabled.png",
    });
  }
});