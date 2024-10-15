const { chrome } = window;
chrome.runtime.onMessage.addListener((tab)=> {
  chrome.tabs.sendMessage(tab.id, {action: 'analyze'})
});