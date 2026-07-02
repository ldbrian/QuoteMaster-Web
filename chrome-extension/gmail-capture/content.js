(() => {
  const GLOBAL_KEY = "__QUOTEMASTER_GMAIL_CAPTURE_V2__";
  const CAPTURE_EVENT = "QUOTEMASTER_GMAIL_CAPTURE";
  const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const FROM_LABEL_PATTERN = /(\bFrom\b|\bSender\b|\u53d1\u4ef6\u4eba|\u5bc4\u4ef6\u4eba)/i;

  if (window[GLOBAL_KEY]?.capture) {
    window[GLOBAL_KEY].capture("manual-reinject");
    return;
  }

  let lastSignature = "";
  let debounceTimer = null;
  let panel = null;

  function normalizeText(value) {
    return (value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  function formatLocalDateTime(input) {
    const date = input instanceof Date ? input : new Date(input);
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (value) => String(value).padStart(2, "0");

    return [
      validDate.getFullYear(),
      "-",
      pad(validDate.getMonth() + 1),
      "-",
      pad(validDate.getDate()),
      " ",
      pad(validDate.getHours()),
      ":",
      pad(validDate.getMinutes()),
      ":",
      pad(validDate.getSeconds()),
    ].join("");
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "quotemaster-gmail-capture-panel";
    panel.style.cssText = [
      "position:fixed",
      "right:20px",
      "bottom:20px",
      "z-index:2147483647",
      "width:340px",
      "background:#050505",
      "color:#fff",
      "border:1px solid #ef4444",
      "font-family:Arial,sans-serif",
      "box-sizing:border-box",
    ].join(";");

    panel.innerHTML = `
      <div style="padding:12px 14px;border-bottom:1px solid #262626;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;">QuoteMaster Capture</div>
        <button data-qm-capture style="height:28px;border:1px solid #fff;background:#fff;color:#000;padding:0 10px;font-size:12px;font-weight:900;cursor:pointer;">Capture</button>
      </div>
      <div data-qm-status style="padding:12px 14px;font-size:12px;line-height:1.5;color:#a3a3a3;">
        Open a Gmail message. Capture will run automatically.
      </div>
    `;

    panel.querySelector("[data-qm-capture]").addEventListener("click", () => {
      const payload = captureCurrentGmailMessage("manual-ui");
      if (!payload) {
        updatePanel({
          ok: false,
          title: "No strict message captured",
          detail: "Open a Gmail message detail page and make sure the latest message is expanded.",
        });
      }
    });

    document.documentElement.appendChild(panel);
    return panel;
  }

  function updatePanel({ ok, title, detail, capturedData }) {
    const currentPanel = ensurePanel();
    const status = currentPanel.querySelector("[data-qm-status]");
    const borderColor = ok ? "#22c55e" : "#ef4444";
    const titleColor = ok ? "#86efac" : "#fca5a5";
    const preview = capturedData?.message_body
      ? capturedData.message_body.slice(0, 180)
      : "";

    currentPanel.style.borderColor = borderColor;
    status.innerHTML = `
      <div style="font-size:12px;font-weight:900;color:${titleColor};text-transform:uppercase;margin-bottom:6px;">${escapeHtml(title)}</div>
      <div style="color:#e5e5e5;word-break:break-word;">${escapeHtml(detail)}</div>
      ${
        preview
          ? `<div style="margin-top:8px;color:#737373;max-height:60px;overflow:hidden;">${escapeHtml(preview)}</div>`
          : ""
      }
    `;
  }

  function getMainContainer() {
    return (
      document.querySelector('div[role="main"]') ||
      document.querySelector("main") ||
      document.body
    );
  }

  function extractEmail(value) {
    const match = value && String(value).match(EMAIL_PATTERN);
    return match ? match[0].toLowerCase() : "";
  }

  function getNodeEmail(node) {
    if (!node) return "";

    return (
      extractEmail(node.getAttribute("email")) ||
      extractEmail(node.getAttribute("data-hovercard-id")) ||
      extractEmail(node.getAttribute("aria-label")) ||
      extractEmail(node.getAttribute("title")) ||
      extractEmail(node.textContent)
    );
  }

  function collectOwnAccountEmails() {
    const ownEmails = new Set();
    const accountNodes = document.querySelectorAll(
      [
        'a[aria-label*="Google Account"]',
        'a[aria-label*="Google \u5e10\u53f7"]',
        'a[aria-label*="Google \u8d26\u53f7"]',
        'a[href*="SignOutOptions"]',
        '[aria-label*="Google Account"]',
        '[aria-label*="Google \u5e10\u53f7"]',
        '[aria-label*="Google \u8d26\u53f7"]',
      ].join(",")
    );

    accountNodes.forEach((node) => {
      ["email", "data-hovercard-id", "aria-label", "title"].forEach((attribute) => {
        const email = extractEmail(node.getAttribute(attribute));
        if (email) ownEmails.add(email);
      });
    });

    return ownEmails;
  }

  function findMessageRootForBody(bodyNode) {
    const directRoot = bodyNode.closest(".adn, .gs, [role='listitem'], [data-message-id]");
    if (directRoot) return directRoot;

    let cursor = bodyNode.parentElement;
    while (cursor && cursor !== document.body) {
      if (cursor.querySelector("span.gD[email]") && cursor.querySelector("div.a3s")) {
        return cursor;
      }
      cursor = cursor.parentElement;
    }

    return bodyNode;
  }

  function getLatestExpandedMessage() {
    const main = getMainContainer();
    const bodyNodes = [...main.querySelectorAll("div.a3s.aiL, div.a3s")]
      .filter(isVisible)
      .filter((node) => !node.closest('[role="dialog"]'))
      .filter((node) => !node.closest('[contenteditable="true"]'))
      .map((bodyNode) => ({
        bodyNode,
        rootNode: findMessageRootForBody(bodyNode),
        text: normalizeText(bodyNode.innerText || bodyNode.textContent),
      }))
      .filter(({ text }) => text.length > 0 && text.length < 50000);

    if (bodyNodes.length === 0) return null;

    return bodyNodes[bodyNodes.length - 1];
  }

  function findSenderEmail(messageRoot) {
    const ownEmails = collectOwnAccountEmails();

    // Gmail's sender node in an opened message header is usually span.gD[email].
    const strictSenderNodes = [
      ...messageRoot.querySelectorAll("span.gD[email]"),
      ...messageRoot.querySelectorAll("span[email].gD"),
    ].filter(isVisible);

    for (const node of strictSenderNodes) {
      const email = getNodeEmail(node);
      if (email && !ownEmails.has(email)) return email;
    }

    // Fallback: only inspect wrappers that explicitly describe the From/Sender field.
    const fromWrappers = [...messageRoot.querySelectorAll("[aria-label]")].filter((node) => {
      const label = node.getAttribute("aria-label") || "";
      return FROM_LABEL_PATTERN.test(label);
    });

    for (const wrapper of fromWrappers) {
      const senderNode = wrapper.querySelector("span.gD[email], span[email].gD, [email]");
      const email = getNodeEmail(senderNode) || getNodeEmail(wrapper);
      if (email && !ownEmails.has(email)) return email;
    }

    return "";
  }

  function parseTimestampCandidate(value) {
    if (!value) return null;
    const trimmed = String(value).trim();

    if (/^\d{10,13}$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return new Date(trimmed.length === 10 ? numeric * 1000 : numeric);
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function findLocalTimestamp(messageRoot) {
    const timestampNode = messageRoot.querySelector("[data-timestamp]");
    const dataTimestamp = parseTimestampCandidate(timestampNode?.getAttribute("data-timestamp"));
    if (dataTimestamp) return formatLocalDateTime(dataTimestamp);

    const candidates = [
      ...messageRoot.querySelectorAll("time[datetime]"),
      ...messageRoot.querySelectorAll("span.g3[title], span.g3[alt]"),
      ...messageRoot.querySelectorAll("[data-tooltip], [aria-label], [title]"),
    ];

    for (const node of candidates) {
      const values = [
        node.getAttribute("datetime"),
        node.getAttribute("title"),
        node.getAttribute("alt"),
        node.getAttribute("data-tooltip"),
        node.getAttribute("aria-label"),
      ];

      for (const value of values) {
        if (!value || !/\d/.test(value)) continue;
        const parsed = parseTimestampCandidate(value);
        if (parsed) return formatLocalDateTime(parsed);
      }
    }

    return formatLocalDateTime(new Date());
  }

  function removeQuotedHistory(text) {
    const cutPatterns = [
      /\nOn .+ wrote:\s*$/im,
      /\nFrom:\s*.+$/im,
      /\nSent:\s*.+$/im,
      /\nTo:\s*.+$/im,
      /\n-{2,}\s*Original Message\s*-{2,}/im,
      /\n_{5,}\s*$/im,
      /\n> .+$/m,
    ];

    const cutIndex = cutPatterns
      .map((pattern) => {
        const match = text.match(pattern);
        return match ? match.index ?? -1 : -1;
      })
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)[0];

    return normalizeText(cutIndex >= 0 ? text.slice(0, cutIndex) : text);
  }

  function extractLatestBodyText(bodyNode) {
    const clone = bodyNode.cloneNode(true);

    clone
      .querySelectorAll(
        [
          "blockquote",
          ".gmail_quote",
          ".gmail_signature",
          '[aria-hidden="true"]',
          'div[style*="display: none"]',
        ].join(",")
      )
      .forEach((node) => node.remove());

    return removeQuotedHistory(clone.innerText || clone.textContent || "");
  }

  function buildCapturedData(source) {
    const latestMessage = getLatestExpandedMessage();
    if (!latestMessage) {
      updatePanel({
        ok: false,
        title: "No Gmail body found",
        detail: "Expected latest body container div.a3s.aiL inside an opened Gmail message.",
      });
      return null;
    }

    const customerEmail = findSenderEmail(latestMessage.rootNode);
    if (!customerEmail) {
      updatePanel({
        ok: false,
        title: "No strict sender found",
        detail: "Expected latest message header sender span.gD[email]. Own account emails are ignored.",
      });
      return null;
    }

    const messageBody = extractLatestBodyText(latestMessage.bodyNode);
    if (!messageBody) {
      updatePanel({
        ok: false,
        title: "Empty message body",
        detail: "The latest Gmail body container was found, but no plain text remained after cleanup.",
      });
      return null;
    }

    return {
      source,
      captured_at: formatLocalDateTime(new Date()),
      customer_email: customerEmail,
      message_body: messageBody,
      timestamp: findLocalTimestamp(latestMessage.rootNode),
      topic: "",
      product_keywords: [],
    };
  }

  function captureCurrentGmailMessage(source = "auto") {
    const capturedData = buildCapturedData(source);
    if (!capturedData) return null;

    const signature = JSON.stringify({
      customer_email: capturedData.customer_email,
      message_body: capturedData.message_body,
      timestamp: capturedData.timestamp,
    });

    if (source === "auto" && signature === lastSignature) {
      return capturedData;
    }

    lastSignature = signature;
    console.log("QuoteMaster captured_data:", capturedData);
    chrome.storage.local.set({ lastCapturedGmailMessage: capturedData });
    updatePanel({
      ok: true,
      title: "Captured",
      detail: `${capturedData.customer_email} · ${capturedData.timestamp}`,
      capturedData,
    });
    chrome.runtime.sendMessage({
      type: CAPTURE_EVENT,
      payload: capturedData,
    });

    return capturedData;
  }

  function scheduleCapture() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      captureCurrentGmailMessage("auto");
    }, 900);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "CAPTURE_GMAIL_NOW") return false;

    const payload = captureCurrentGmailMessage("manual");
    sendResponse({ ok: Boolean(payload), payload });
    return true;
  });

  const observer = new MutationObserver(scheduleCapture);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("hashchange", scheduleCapture);
  ensurePanel();
  scheduleCapture();

  window[GLOBAL_KEY] = {
    capture: captureCurrentGmailMessage,
  };
})();
