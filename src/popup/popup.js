const $ = require("jquery");
const { UPDATE_EXT_ICON } = require("../message_type");
const { abbreviations } = require("../shortcut");

// DOM elements
const autoFilterSwitch = $("#autoFilterSwitch");
const backButton = $(".back-button");
const donateView = $("#donateView");
const enableSwitch = $("#enableSwitch");
const filterSelect = $("#filter-type");
const intensitySlider = $("#filter-intensity");
const intensityValue = $("#intensity-value");
const mainView = $("#mainView");
const selectItems = $(".select-items");
const settingsBackButton = $("#settingsView .back-button");
const settingsButton = $("#settingsButton");
const settingsView = $("#settingsView");
const shortcutKey = $("#shortcut-key");
const supportButton = $("#supportButton");

// Auto filter toggle
autoFilterSwitch.on("change", (event) => {
  chrome.storage.local.set({ autoFilter: event.target.checked });
});

// Update intensity slider value
intensitySlider.on("input", () => {
  const intensity = parseInt(intensitySlider.val());
  intensityValue.text(`${intensity}%`);
  chrome.storage.local.set({ intensity });
});

// Dropdown handling
filterSelect.on("click", (event) => {
  event.stopPropagation();
  selectItems.toggleClass("hidden");
});

$(document).on("click", () => selectItems.addClass("hidden"));

$(".select-item").on("click", function () {
  const filterType = $(this).text();
  filterSelect.text(filterType);
  selectItems.addClass("hidden");
  chrome.storage.local.set({ filterType });
});

$(".select-item").hover(
  function () {
    $(this).css({
      background: "var(--primary-color)",
      color: "var(--text-color)",
    });
  },
  function () {
    $(this).css({
      background: "var(--bg-color)",
      color: "var(--text-color)",
    });
  }
);

// Enable/disable extension
enableSwitch.on("change", (event) => {
  const isExtActivated = event.target.checked;
  chrome.storage.local.set({ isExtActivated });
  chrome.runtime.sendMessage({ type: UPDATE_EXT_ICON, isExtActivated });
});

// Change shortcut
shortcutKey.on("click", () => {
  const newShortcutCombination = [];
  shortcutKey.addClass("listening").text("Press keys...");

  const handleKeyDown = (event) => {
    if (event.key !== "Escape") {
      newShortcutCombination.push(event.key.toLowerCase());
    }
  };

  const handleKeyUp = () => {
    const shortcut = newShortcutCombination
      .map((key) => abbreviations[key] || key.slice(0, 3))
      .join("+");
    chrome.storage.local.set({ shortcut });
    shortcutKey.text(shortcut).removeClass("listening");
    $(document).off("keydown", handleKeyDown);
    $(document).off("keyup", handleKeyUp);
  };

  $(document).on("keydown", handleKeyDown);
  $(document).on("keyup", handleKeyUp);
});

// Navigation between views
settingsButton.on("click", () => {
  mainView.removeClass("active");
  settingsView.addClass("active");
});

settingsBackButton.on("click", () => {
  settingsView.removeClass("active");
  mainView.addClass("active");
});

supportButton.on("click", () => {
  mainView.removeClass("active");
  donateView.addClass("active");
});

backButton.on("click", () => {
  donateView.removeClass("active");
  mainView.addClass("active");
});

// Load state from storage
chrome.storage.local.get(
  ["isExtActivated", "shortcut", "filterType", "autoFilter", "intensity"],
  (data) => {
    enableSwitch.prop("checked", data.isExtActivated || false);
    shortcutKey.text(data.shortcut || "None");
    filterSelect.text(data.filterType || "None");
    autoFilterSwitch.prop("checked", data.autoFilter || false);
    intensitySlider.val(data.intensity || 0);
    intensityValue.text(`${data.intensity || 0}%`);
  }
);