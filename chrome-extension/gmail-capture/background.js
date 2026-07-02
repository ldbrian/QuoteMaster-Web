async function captureInTab(tab) {
  if (!tab.id || !tab.url?.startsWith("https://mail.google.com/mail/")) {
    console.warn("QuoteMaster Gmail Capture: open a Gmail message tab first.");
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "CAPTURE_GMAIL_NOW",
    });
    await updateBadge(tab.id, response?.ok ? "OK" : "NO", response?.ok ? "#16a34a" : "#dc2626");
  } catch (_error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "CAPTURE_GMAIL_NOW",
      });
      await updateBadge(tab.id, response?.ok ? "OK" : "NO", response?.ok ? "#16a34a" : "#dc2626");
    } catch (error) {
      await updateBadge(tab.id, "ERR", "#dc2626");
      console.warn("QuoteMaster Gmail Capture: content script injection failed.", error);
    }
  }
}

function updateBadge(tabId, text, color) {
  chrome.action.setBadgeText({ tabId, text });
  chrome.action.setBadgeBackgroundColor({ tabId, color });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "QUOTEMASTER_GMAIL_CAPTURE") {
    return false;
  }

  const capturedData = message.payload;
  const nextRequest = {
    endpoint: "/api/thread_matching",
    method: "POST",
    body: capturedData,
    tab_id: sender.tab?.id,
    url: sender.tab?.url,
    received_at: new Date().toISOString(),
  };

  console.log("QuoteMaster thread_matching mock request:", nextRequest);

  if (sender.tab?.id) {
    updateBadge(sender.tab.id, "OK", "#16a34a");
  }

  sendResponse({
    ok: true,
    mocked: true,
  });

  return true;
});

chrome.action.onClicked.addListener(captureInTab);
