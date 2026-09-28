// Mock chrome API
global.chrome = {
  runtime: {
    // Answer callback-style queries so content.js state (shortcut, layout,
    // enabled) initializes the way it does against the real background script
    sendMessage: jest.fn((message, callback) => {
      if (typeof callback !== 'function') return;
      const responses = {
        GET_IS_ENABLED: { isEnabled: true },
        GET_SHORTCUT: { key: ',' },
        CONTENT_GET_KEYBOARD_LAYOUT: { layout: 'QWERTY' },
        GET_RESET_KEY: { key: 'r' }
      };
      callback(responses[message.type] || {});
    }),
    onMessage: {
      addListener: jest.fn((listener) => {
        chrome.runtime.onMessage.listener = listener;  // Store the listener
      })
    }
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn()
    }
  },
  tabs: {
    onActivated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    get: jest.fn(),
    sendMessage: jest.fn()
  },
  webNavigation: {
    onHistoryStateUpdated: { addListener: jest.fn() },
    onCompleted: { addListener: jest.fn() }
  }
};

// Mock window.location
delete window.location;
window.location = new URL('https://www.youtube.com');

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});