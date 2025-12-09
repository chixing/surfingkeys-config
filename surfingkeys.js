// ================================================================================
// SURFINGKEYS CONFIGURATION
// ================================================================================

// ================================
// BASIC SETTINGS
// ================================
settings.scrollStepSize = 120;
settings.hintAlign = "left";
settings.omnibarMaxResults = 20;
settings.historyMUOrder = false; // list history by recency instead of most-used frequency

// ================================
// KEY MAPPINGS
// ================================

// Navigation
api.map('K', '[[');  // Previous page
api.map('J', ']]');  // Next page

// Convenience mappings
api.map('q', 'p');   // Left hand passthrough

// Swap v and zv
api.map('v', 'zv');  // Visual mode now on v
api.map('zv', 'v');  // Enter visual mode (caret mode) now on zv

// Unmappings
api.iunmap("<Ctrl-a>");  // Unmap select all

// ================================
// CUSTOM KEYBINDINGS
// ================================

// Chrome utilities

api.mapkey('gp', '#12Open Passwords', function() {
    api.tabOpenLink("chrome://password-manager/passwords");
});

api.mapkey('gs', '#12Open Chrome Extensions Shortcuts', function() {
    api.tabOpenLink("chrome://extensions/shortcuts");
});

api.mapkey('gw', 'Yank link and search in Gemini', function() {
    api.Hints.create("", function(element) {
        var link = element.href;
        var promptText = link + " provide a detailed summary";
        var userInput = prompt("Edit prompt:", " provide a detailed summary");
        if (userInput !== null) {
            var targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + userInput);
            api.tabOpenLink(targetUrl);
        }
    });
});

api.mapkey('gq', 'Review current tab in Gemini', function() {
    var link = window.location.href;
    var promptText = link + " provide a detailed summary";
    var userInput = prompt("Edit prompt:", " provide a detailed summary");
    if (userInput !== null) {
        var targetUrl = "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(link + userInput);
        api.tabOpenLink(targetUrl);
    }
});

api.mapkey('gr', 'Pop up input with clipboard, then open multiple AI sites', function() {
    var openTabs = function(userInput) {
        if (userInput !== null) {
            var urls = [
                "https://chatgpt.com/?q=" + encodeURIComponent(userInput),
                // "https://www.doubao.com/chat#sk_prompt=" + encodeURIComponent(userInput),
                "https://alice.yandex.ru/#sk_prompt=" + encodeURIComponent(userInput),
                // "https://claude.ai#sk_prompt=" + encodeURIComponent(userInput),
                // "https://gemini.google.com/app#sk_prompt=" + encodeURIComponent(userInput),
                // "https://perplexity.ai?q=" + encodeURIComponent(userInput),
                // "https://grok.com?q=" + encodeURIComponent(userInput),
            ];
            urls.forEach(function(url) {
                api.tabOpenLink(url);
            });
        }
    };
    
    // Get clipboard content
    navigator.clipboard.readText().then(function(clipboardText) {
        var userInput = prompt("Edit query:", clipboardText);
        openTabs(userInput);
    }).catch(function(err) {
        api.echoerr('Failed to read clipboard');
        var userInput = prompt("Enter query:");
        openTabs(userInput);
    });
});

// ChatGPT
if (window.location.hostname === "chatgpt.com") {
  var checkExist = setInterval(function () {
    var inputBox = document.querySelector('[name="prompt-textarea"]');
    if (inputBox && inputBox.value.trim() !== '') {
      clearInterval(checkExist);
      setTimeout(function () {
        var submitButton = document.getElementById('composer-submit-button');
        if (submitButton) {
          submitButton.click();
        } else {
          // Fallback to Enter key
          var enterEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13
          });
          inputBox.dispatchEvent(enterEvent);
        }
      }, 500);
    }
  }, 500);
}

// Auto-submit prompts for AI sites
if (window.location.hash.startsWith("#sk_prompt=")) {
    var promptToPaste = decodeURIComponent(window.location.hash.substring(11));
    
    // Gemini
    if (window.location.hostname === "gemini.google.com") {
        var checkExist = setInterval(function() {
            var inputBox = document.querySelector('div[contenteditable="true"][role="textbox"]');
            if (inputBox) {
                clearInterval(checkExist);
                inputBox.focus();
                document.execCommand('insertText', false, promptToPaste);
                setTimeout(function() {
                    var enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true,
                        cancelable: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13
                    });
                    inputBox.dispatchEvent(enterEvent);
                    history.replaceState(null, null, ' ');
                }, 300);
            }
        }, 500);
    }
    

    // Claude
    if (window.location.hostname === "claude.ai") {
        var checkExist = setInterval(function() {
            var inputBox = document.querySelector('div[contenteditable="true"]');
            if (inputBox) {
                clearInterval(checkExist);
                inputBox.focus();
                document.execCommand('insertText', false, promptToPaste);
                setTimeout(function() {
                    // Try multiple button selectors
                    var submitButton = document.querySelector('button[aria-label="Send Message"]') ||
                                      document.querySelector('button[aria-label*="send" i]') ||
                                      document.querySelector('button[type="submit"]') ||
                                      document.querySelector('button svg[class*="send"]')?.closest('button');
                    if (submitButton) {
                        submitButton.click();
                    } else {
                        // Fallback to Enter key
                        var enterEvent = new KeyboardEvent('keydown', {
                            bubbles: true,
                            cancelable: true,
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13
                        });
                        inputBox.dispatchEvent(enterEvent);
                    }
                    history.replaceState(null, null, ' ');
                }, 300);
            }
        }, 500);
    }
    
    // Doubao
    if (window.location.hostname === "www.doubao.com") {
        var checkExist = setInterval(function() {
            var inputBox = document.querySelector('textarea[placeholder], div[contenteditable="true"]');
            if (inputBox) {
                clearInterval(checkExist);
                if (inputBox.tagName === 'TEXTAREA') {
                    inputBox.value = promptToPaste;
                    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    inputBox.focus();
                    document.execCommand('insertText', false, promptToPaste);
                }
                setTimeout(function() {
                    // Try multiple button selectors
                    var submitButton = document.querySelector('button[type="submit"]') || 
                                      document.querySelector('button.send-button') ||
                                      document.querySelector('button[aria-label*="send" i]') ||
                                      document.querySelector('button svg[class*="send"]')?.closest('button');
                    if (submitButton) {
                        submitButton.click();
                    } else {
                        // Fallback to Enter key
                        var enterEvent = new KeyboardEvent('keydown', {
                            bubbles: true,
                            cancelable: true,
                            key: 'Enter',
                            code: 'Enter',
                            keyCode: 13,
                            which: 13
                        });
                        inputBox.dispatchEvent(enterEvent);
                    }
                    history.replaceState(null, null, ' ');
                }, 300);
            }
        }, 500);
    }
    
    // Yandex Alice
    if (window.location.hostname.includes("yandex.ru")) {
        var checkExist = setInterval(function() {
            var inputBox = document.querySelector('textarea[placeholder], input[type="text"], input[class*="input"], div[contenteditable="true"]');
            if (inputBox) {
                clearInterval(checkExist);
                inputBox.focus();
                if (inputBox.tagName === 'TEXTAREA' || inputBox.tagName === 'INPUT') {
                    inputBox.value = promptToPaste;
                    inputBox.dispatchEvent(new Event('input', { bubbles: true }));
                    inputBox.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    document.execCommand('insertText', false, promptToPaste);
                }
                setTimeout(function() {
                    var enterEvent = new KeyboardEvent('keydown', {
                        bubbles: true,
                        cancelable: true,
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13
                    });
                    inputBox.dispatchEvent(enterEvent);
                    // history.replaceState(null, null, ' ');
                }, 300);
            }
        }, 500);
    }
}

// ================================
// UTILITY FUNCTIONS
// ================================
util = {}
util.createURLItem = (title, url, sanitize = true) => 