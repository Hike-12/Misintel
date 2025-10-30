// Content script to enhance page interaction
(function() {
  'use strict';
  
  // Add visual feedback when text is selected
  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 10) {
      console.log('Misintel: Text selected for fact-checking');
    }
  });
  
  // Listen for keyboard shortcut (Ctrl+Shift+F or Cmd+Shift+F)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        chrome.storage.local.set({
          selectedText: selectedText,
          timestamp: Date.now()
        }, () => {
          chrome.runtime.sendMessage({ action: 'openPopup' });
        });
      }
    }
  });
})();