chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "factCheckText",
    title: "Fact Check with Misintel",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "factCheckText" && info.selectionText) {
    console.log('💾 Storing:', info.selectionText.substring(0, 50));
    
    chrome.storage.local.set({
      selectedText: info.selectionText,
      timestamp: Date.now(),
      fromContextMenu: true
    }, () => {
      // Open side panel automatically
      chrome.sidePanel.open({ tabId: tab.id });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    chrome.storage.local.get(["selectedText", "timestamp", "fromContextMenu"], (result) => {
      sendResponse({ 
        text: result.selectedText || null,
        fromContextMenu: result.fromContextMenu || false
      });
    });
    return true;
  }
  
  if (request.action === "clearSelectedText") {
    chrome.storage.local.remove(["selectedText", "timestamp", "fromContextMenu"]);
    sendResponse({ success: true });
  }
});