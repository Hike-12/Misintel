console.log('🚀 Misintel background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('📦 Extension installed');
  chrome.contextMenus.create({
    id: "factCheckText",
    title: "Fact Check with Misintel",
    contexts: ["selection"]
  });
});

// Context menu click handler - STORES AND OPENS SIDE PANEL
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "factCheckText" && info.selectionText && tab?.id) {
    const text = info.selectionText;
    console.log('💾 Context menu clicked! Text:', text.substring(0, 50) + '...');
    
    // Store with timestamp
    chrome.storage.local.set({
      selectedText: text,
      timestamp: Date.now(),
      fromContextMenu: true
    }, () => {
      console.log('✅ Text stored in chrome.storage.local');
      
      // Open side panel AFTER storage is confirmed
      chrome.sidePanel.open({ tabId: tab.id }).then(() => {
        console.log('✅ Side panel opened');
      }).catch((err) => {
        console.error('❌ Failed to open side panel:', err);
      });
    });
  }
});

// Message handler for popup to retrieve text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  if (request.action === "getSelectedText") {
    // Retrieve stored text
    chrome.storage.local.get(["selectedText", "fromContextMenu"], (result) => {
      console.log('📤 Sending to popup:', result);
      
      if (result.selectedText && result.fromContextMenu) {
        sendResponse({ 
          text: result.selectedText,
          success: true
        });
      } else {
        sendResponse({ 
          text: null,
          success: false
        });
      }
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === "clearSelectedText") {
    chrome.storage.local.remove(["selectedText", "fromContextMenu", "timestamp"], () => {
      console.log('🧹 Storage cleared');
      sendResponse({ success: true });
    });
    return true;
  }
});