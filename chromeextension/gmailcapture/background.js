const LOCAL_API_BASE_URLS = ["http://127.0.0.1:3000", "http://localhost:3000"];
const CAPTURE_EVENT = "QUOTEMASTER_CAPTURE_READY";
const FORCE_SYNC_EVENT = "QUOTEMASTER_FORCE_SYNC";
const SET_AUTH_EVENT = "QUOTEMASTER_SET_AUTH";
const AUTH_STORAGE_KEY = "quotemaster_auth";
let memoryAuthState = null;

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage && chrome.storage.local);
}

async function readAuthState() {
  if (!hasChromeStorage()) return memoryAuthState;

  try {
    const result = await chrome.storage.local.get([AUTH_STORAGE_KEY]);
    memoryAuthState = result?.[AUTH_STORAGE_KEY] || memoryAuthState;
    return memoryAuthState;
  } catch (error) {
    console.warn("QuoteMaster auth storage read failed, using memory fallback:", error);
    return memoryAuthState;
  }
}

function persistAuthState(payload, sendResponse) {
  memoryAuthState = payload;

  if (!hasChromeStorage()) {
    sendResponse({ ok: true, persisted: false });
    return;
  }

  chrome.storage.local.set({ [AUTH_STORAGE_KEY]: payload }, () => {
    if (chrome.runtime.lastError) {
      console.warn("QuoteMaster auth storage write failed, using memory fallback:", chrome.runtime.lastError.message);
      sendResponse({ ok: true, persisted: false, warning: chrome.runtime.lastError.message });
      return;
    }

    sendResponse({ ok: true, persisted: true });
  });
}
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

function normalizeApiBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || (!raw.startsWith('http://') && !raw.startsWith('https://'))) return '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

async function buildApiUrls() {
  const auth = await readAuthState();
  const configuredBaseUrl = normalizeApiBaseUrl(auth?.api_base_url);
  const baseUrls = configuredBaseUrl ? [configuredBaseUrl] : LOCAL_API_BASE_URLS;
  return [...new Set(baseUrls)].map((baseUrl) => baseUrl + '/api/ingest/communication');
}
async function buildAuthHeaders() {
  const auth = await readAuthState();
  return auth?.access_token ? { Authorization: "Bearer " + auth.access_token } : {};
}

function getFriendlyNetworkError(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return '\u65e0\u6cd5\u8fde\u63a5\u5f53\u524d QuoteMaster \u540e\u7aef\uff1a\u8bf7\u91cd\u65b0\u6253\u5f00 QuoteMaster \u5e76\u767b\u5f55\uff0c\u7136\u540e\u5237\u65b0\u90ae\u7bb1\u9875\u9762\u3002';
  }
  return message || '\u8bf7\u6c42\u540e\u7aef\u5931\u8d25';
}
function getFriendlyApiError(status, data) {
  const rawError = data?.error || '';
  const code = data?.code ? ' [' + data.code + ']' : '';
  const detail = data?.detail ? ': ' + data.detail : rawError ? ': ' + rawError : '';
  if (status === 401 || /authorization|unauthorized|auth token|bearer/i.test(rawError)) {
    return '\u672a\u8fde\u63a5 QuoteMaster \u8d26\u53f7\uff1a\u8bf7\u6253\u5f00 QuoteMaster \u767b\u5f55\uff0c\u7136\u540e\u5237\u65b0\u5f53\u524d\u90ae\u7bb1\u9875\u9762\u3002';
  }
  if (status === 404) return '\u540e\u7aef\u63a5\u53e3\u4e0d\u5b58\u5728\uff1a\u8bf7\u786e\u8ba4\u5f53\u524d\u9879\u76ee\u4ee3\u7801\u5df2\u66f4\u65b0\u5e76\u91cd\u542f\u3002';
  if (status >= 500) return '\u540e\u7aef\u5904\u7406\u5931\u8d25' + code + detail;
  return rawError || '\u8bf7\u6c42\u5931\u8d25\uff0c\u72b6\u6001\u7801 ' + status;
}
async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await buildAuthHeaders()),
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
    throw new Error(getFriendlyApiError(response.status, data));
  }

  return { status: response.status, data };
}

async function postCommunicationToBackend(capturedData) {
  const payload = buildIngestPayload(capturedData);
  const validationError = validatePayload(payload);
  const auth = await readAuthState();

  if (validationError) {
    return { ok: false, error: validationError, display_error: validationError, payload };
  }

  if (!auth?.access_token) {
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      error: "Missing QuoteMaster auth token",
      display_error: "未连接 QuoteMaster 账号：请先打开 QuoteMaster 登录，再刷新当前邮箱页面。",
      payload,
    };
  }

  const errors = [];
  const apiUrls = await buildApiUrls();
  for (const url of apiUrls) {
    try {
      const result = await postJson(url, payload);
      return { ok: true, status: result.status, payload, data: result.data, api_url: url };
    } catch (error) {
      errors.push(getFriendlyNetworkError(error));
    }
  }

  const uniqueErrors = [...new Set(errors.filter(Boolean))];
  return {
    ok: false,
    error: uniqueErrors.join(" | ") || "Failed to fetch QuoteMaster backend",
    display_error: uniqueErrors[0] || "同步失败：无法连接 QuoteMaster 后端。",
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

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== SET_AUTH_EVENT) return false;

  const payload = message.payload || {};
  if (!payload.access_token || !payload.user_id) {
    sendResponse({ ok: false, error: "Invalid auth payload" });
    return false;
  }

  persistAuthState(payload, sendResponse);

  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === SET_AUTH_EVENT) {
    const payload = message.payload || {};
    if (!payload.access_token || !payload.user_id) {
      sendResponse({ ok: false, error: "Invalid auth payload" });
      return false;
    }

    persistAuthState(payload, sendResponse);

    return true;
  }

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
