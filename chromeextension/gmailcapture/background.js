const API_URLS = [
  "http://127.0.0.1:3000/api/ingest/communication",
  "http://localhost:3000/api/ingest/communication",
];
const CAPTURE_EVENT = "QUOTEMASTER_CAPTURE_READY";
const FORCE_SYNC_EVENT = "QUOTEMASTER_FORCE_SYNC";

function buildIngestPayload(capturedData = {}) {
  return {
    source_email: capturedData.source_email || capturedData.customer_email || "",
    message_body: capturedData.message_body || "",
    timestamp: capturedData.timestamp || new Date().toISOString(),
    source: capturedData.source || "EMAIL",
    title: capturedData.title || "",
    topic: capturedData.topic || "",
    product_keywords: capturedData.product_keywords || [],
    page_url: capturedData.page_url || "",
    message_hash: capturedData.message_hash || "",
    capture_mode: capturedData.capture_mode || "auto",
  };
}

function validatePayload(payload) {
  if (!payload.source_email) return "source_email is required";
  if (!payload.message_body) return "message_body is required";
  return "";
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || "Request failed with status " + response.status);
  }

  return { status: response.status, data };
}

async function postCommunicationToBackend(capturedData) {
  const payload = buildIngestPayload(capturedData);
  const validationError = validatePayload(payload);

  if (validationError) {
    return { ok: false, error: validationError, payload };
  }

  const errors = [];
  for (const url of API_URLS) {
    try {
      const result = await postJson(url, payload);
      return { ok: true, status: result.status, payload, data: result.data, api_url: url };
    } catch (error) {
      errors.push(url + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }

  return {
    ok: false,
    error: errors.join(" | ") || "Failed to fetch QuoteMaster backend",
    payload,
  };
}

function setBadge(tabId, state) {
  if (!tabId) return;

  const presets = {
    success: { text: "OK", color: "#16a34a" },
    pending: { text: "...", color: "#f59e0b" },
    error: { text: "!", color: "#dc2626" },
    clear: { text: "", color: "#64748b" },
  };

  const preset = presets[state] || presets.clear;
  chrome.action.setBadgeText({ tabId, text: preset.text });
  chrome.action.setBadgeBackgroundColor({ tabId, color: preset.color });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== CAPTURE_EVENT) {
    return false;
  }

  const tabId = sender.tab?.id;
  if (tabId) setBadge(tabId, "pending");

  postCommunicationToBackend(message.payload)
    .then((result) => {
      console.log("QuoteMaster ingest communication result:", result);
      if (tabId) setBadge(tabId, result.ok ? "success" : "error");
      sendResponse(result);
    })
    .catch((error) => {
      const result = {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown ingest error",
      };

      console.warn("QuoteMaster ingest communication failed:", error);
      if (tabId) setBadge(tabId, "error");
      sendResponse(result);
    });

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  setBadge(tab.id, "pending");

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content_script.js"],
    });
  } catch (error) {
    console.warn("QuoteMaster manual sync reinjection skipped:", error);
  }

  chrome.tabs.sendMessage(tab.id, { type: FORCE_SYNC_EVENT }, (response) => {
    if (chrome.runtime.lastError) {
      setBadge(tab.id, "error");
      console.warn("QuoteMaster manual sync failed:", chrome.runtime.lastError.message);
      return;
    }

    if (!response?.ok) {
      setBadge(tab.id, "error");
    }
  });
});
