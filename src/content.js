import $ from "jquery";
import { CHANGED_TAB, UPDATE_EXT_ICON } from "./message_type";
import { abbreviations } from "./shortcut";

let state = {
  isExtActivated: false,
  autoFilter: false,
  shortcut: null,
  filterType: null,
  intensity: null,
  filtered: false,
  videos: [],
};

const findVideos = () => {
  state.videos = $("video[src], iframe[src]").get();
  console.log(state.videos);
};

const applyFilter = () => {
  if (!state.videos.length) return; // Ensure there are videos to filter
  const filterCSS =
    state.filterType === "opacity"
      ? `opacity(${state.intensity}%)`
      : `blur(${state.intensity}px)`;

  state.videos.forEach((video) => $(video).css("filter", filterCSS));
  state.filtered = true;
};

const removeFilter = () => {
  state.videos.forEach((video) => $(video).css("filter", "none"));
  state.filtered = false;
};

// MutationObserver for detecting newly added videos
const DOMVideosObserver = new MutationObserver((mutations) => {
  mutations.forEach(({ addedNodes }) => {
    const newVideos = $(addedNodes).filter("video[src], iframe[src]").get();
    if (newVideos.length) {
      state.videos.push(...newVideos); // Add new videos to the state
      if (state.filtered) {
        applyFilter(); // Apply filter if it's already on
      }
    }
  });
});

// Start function to handle activation/deactivation of extension
const start = () => {
  if (state.isExtActivated) {
    findVideos();
    if (state.autoFilter) applyFilter();

    if (DOMVideosObserver) DOMVideosObserver.disconnect();
    DOMVideosObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    DOMVideosObserver.disconnect();
    removeFilter();
  }
};

// Initialize state on extension start and apply necessary settings
chrome.storage.local
  .get(["isExtActivated", "shortcut", "filterType", "autoFilter", "intensity"])
  .then((data) => {
    state = { ...state, ...data };
    chrome.runtime.sendMessage({
      type: UPDATE_EXT_ICON,
      isExtActivated: state.isExtActivated,
    });
    start(); // Initialize the extension based on saved state
  });

// Listen for changes in Chrome storage and handle state updates
chrome.storage.onChanged.addListener((changes) => {
  Object.entries(changes).forEach(([key, { newValue }]) => {
    if (!(key in state)) return;

    state[key] = newValue; // Update state

    switch (key) {
      case "isExtActivated":
        start(); // Start or stop the extension based on activation
        break;
      case "filterType":
      case "intensity":
        if (state.isExtActivated && state.filtered) {
          applyFilter(); // Reapply filter if it's already on
        }
        break;
      case "autoFilter":
        newValue ? applyFilter() : removeFilter(); // Apply or remove filter based on setting
        break;
    }
  });
});

// Listen for tab changes to reapply settings
chrome.runtime.onMessage.addListener((req) => {
  if (req.type === CHANGED_TAB) start();
});

// Handle shortcut key press and apply filter toggle
let newShortcutCombination = [];

$(document).on("keydown", (event) => {
  if (event.key !== "Escape") {
    newShortcutCombination.push(event.key.toLowerCase());
  }
});

$(document).on("keyup", () => {
  let shortcut = newShortcutCombination
    .map((shortcut) => abbreviations[shortcut] || shortcut.slice(0, 3))
    .join("+");

  if (state.shortcut === shortcut) {
    if (state.filtered) {
      removeFilter();
    } else {
      applyFilter();
    }
  }
  newShortcutCombination = []; // Reset after keyup
});
