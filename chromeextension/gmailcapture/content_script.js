(() => {
  const GLOBAL_KEY = "__QUOTEMASTER_CAPTURE_STATE__";
  const BACKGROUND_EVENT = "QUOTEMASTER_CAPTURE_READY";
  const FORCE_SYNC_EVENT = "QUOTEMASTER_FORCE_SYNC";
  const STORAGE_LAST_HASH_KEY = "quotemaster_last_sent_hash";
  const STORAGE_LAST_PAYLOAD_KEY = "quotemaster_last_sent_payload";
  const MIN_BODY_LENGTH = 24;
  const DEBOUNCE_MS = 850;
  const IS_TOP_FRAME = window.top === window;

  if (window[GLOBAL_KEY]?.scanNow) {
    window[GLOBAL_KEY].scanNow("reinject");
    return;
  }

  let debounceTimer = null;
  let panel = null;
  let lastSeenHash = "";
  let lastDeliveredHash = "";
  let isSending = false;

  const senderEmailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function collapseWhitespace(value) {
    return normalizeText(value).replace(/\s*\n\s*/g, "\n");
  }

  function stripUiPrefixes(value) {
    return normalizeText(value)
      .replace(/^(Subject|主题|主题词|Chat|Conversation|对话|邮件|Message)\s*[:：]\s*/i, "")
      .replace(/\s*[-|]\s*(Gmail|Outlook|WhatsApp|Mail)$/i, "")
      .trim();
  }

  function isVisible(node) {
    if (!node || !(node instanceof Element)) return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function formatLocalDateTime(input) {
    const date = input instanceof Date ? input : new Date(input);
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const pad = (n) => String(n).padStart(2, "0");

    return [
      safeDate.getFullYear(),
      "-",
      pad(safeDate.getMonth() + 1),
      "-",
      pad(safeDate.getDate()),
      " ",
      pad(safeDate.getHours()),
      ":",
      pad(safeDate.getMinutes()),
      ":",
      pad(safeDate.getSeconds()),
    ].join("");
  }

  function createMiniPanel() {
    if (!IS_TOP_FRAME) return null;
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "quotemaster-capture-dock";
    panel.style.cssText = [
      "position:fixed",
      "right:16px",
      "bottom:16px",
      "z-index:2147483647",
      "min-width:240px",
      "max-width:360px",
      "padding:10px 12px",
      "border:1px solid rgba(255,255,255,.10)",
      "border-radius:14px",
      "background:rgba(8,10,18,.92)",
      "backdrop-filter:blur(12px)",
      "box-shadow:0 16px 40px rgba(0,0,0,.35)",
      "color:#fff",
      "font-family:Inter,Arial,sans-serif",
      "font-size:12px",
      "line-height:1.4",
      "box-sizing:border-box",
    ].join(";");

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span data-qm-dot style="width:8px;height:8px;border-radius:999px;background:#64748b;display:inline-block;flex:none;"></span>
          <div style="min-width:0;">
            <div style="font-weight:700;color:#ffffff;letter-spacing:.01em;">QuoteMaster</div>
            <div data-qm-status style="color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">自动监听中</div>
          </div>
        </div>
        <button data-qm-sync type="button" style="flex:none;height:30px;padding:0 10px;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:#fff;color:#0f172a;font-weight:700;cursor:pointer;">手动同步</button>
      </div>
    `;

    panel.querySelector("[data-qm-sync]").addEventListener("click", () => {
      scanNow("manual-ui");
    });

    document.documentElement.appendChild(panel);
    return panel;
  }

  function setDockState(state, detail) {
    const node = createMiniPanel();
    if (!node) return;
    const dot = node.querySelector("[data-qm-dot]");
    const status = node.querySelector("[data-qm-status]");

    const presets = {
      idle: { dot: "#64748b", text: "自动监听中" },
      scanning: { dot: "#f59e0b", text: "正在扫描当前页面" },
      captured: { dot: "#22c55e", text: detail || "已同步" },
      duplicate: { dot: "#3b82f6", text: detail || "内容已同步" },
      empty: { dot: "#94a3b8", text: detail || "未识别到可同步内容" },
      error: { dot: "#ef4444", text: detail || "同步失败" },
    };

    const preset = presets[state] || presets.idle;
    dot.style.background = preset.dot;
    status.textContent = preset.text;
  }

  function hasMailUrlSignal() {
    const text = `${document.title || ""} ${location.hostname} ${location.pathname} ${location.hash}`.toLowerCase();
    return /mail|gmail|outlook|webmail|inbox|message|conversation|163\.com|126\.com|yeah\.net|qq\.com|exmail|aliyun|whatsapp|chat/.test(text);
  }

  function hasMailHeaderSignal() {
    const headerSelectors = [
      "span.gD[email]",
      "[email]",
      "a[href^='mailto:']",
      "[aria-label*='From' i]",
      "[aria-label*='Sender' i]",
      "[aria-label*='To' i]",
      "[aria-label*='Subject' i]",
      "[aria-label*='发件人']",
      "[aria-label*='寄件人']",
      "[aria-label*='收件人']",
      "[aria-label*='主题']",
      "time[datetime]",
      "[data-timestamp]",
    ].join(",");

    if (document.querySelector(headerSelectors)) return true;

    const visibleHeaders = [...document.querySelectorAll("header, [role='banner'], [class*='head' i], [class*='title' i]")]
      .filter(isVisible)
      .slice(0, 12);

    return visibleHeaders.some((node) => /\b(from|sender|to|cc|bcc|subject|date|sent|reply|forward)\b|发件人|寄件人|收件人|主题|日期|时间|回复|转发/i.test(getTextFromNode(node)));
  }

  function hasKnownMessageContainer() {
    return Boolean(
      document.querySelector(
        [
          "div.a3s.aiL",
          "div.a3s",
          "[role='article']",
          "article",
          "[data-pre-plain-text]",
          "[data-message-id]",
          "[data-testid*='msg' i]",
          "[data-testid*='message' i]",
          "[class*='mailContent' i]",
          "[class*='mail-content' i]",
          "[class*='readmail' i]",
          "[class*='message-body' i]",
        ].join(",")
      )
    );
  }

  function isLikelyConversationPage() {
    return hasMailUrlSignal() || hasMailHeaderSignal() || hasKnownMessageContainer();
  }

  function getTextFromNode(node) {
    return collapseWhitespace(node?.innerText || node?.textContent || "");
  }

  function parseTimestampCandidate(value) {
    if (!value) return null;
    const raw = String(value).trim();

    if (/^\d{10,13}$/.test(raw)) {
      const numeric = Number(raw);
      return new Date(raw.length === 10 ? numeric * 1000 : numeric);
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function extractDocumentTitle(root) {
    const selectors = [
      '[data-testid*="subject"]',
      '[aria-label*="subject" i]',
      '[aria-label*="主题"]',
      'h1',
      'h2',
      'h3',
      '[role="heading"]',
      '.subject',
      '.mail-subject',
      '[data-testid="conversation-subject"]',
    ];

    for (const selector of selectors) {
      const node = root.querySelector(selector);
      if (!node || !isVisible(node)) continue;
      const text = stripUiPrefixes(getTextFromNode(node) || node.getAttribute?.("title") || "");
      if (text) return text;
    }

    return stripUiPrefixes(normalizeText(document.title || ""));
  }

  function detectSourceType(root) {
    const host = location.hostname.toLowerCase();
    const pageText = `${document.title || ""} ${location.href}`.toLowerCase();

    if (
      host.includes("whatsapp") ||
      pageText.includes("whatsapp") ||
      root.querySelector('[data-pre-plain-text], [data-testid="msg-container"], [data-testid*="conversation-panel"]')
    ) {
      return "WHATSAPP";
    }

    return "EMAIL";
  }

  function isIgnoredCaptureContainer(node) {
    if (!(node instanceof Element)) return true;

    return Boolean(
      node.closest(
        [
          "#quotemaster-capture-dock",
          "nav",
          "aside",
          "footer",
          "[role='navigation']",
          "[role='toolbar']",
          "[role='menubar']",
          "[role='menu']",
          "[role='listbox']",
          "[role='textbox']",
          "[contenteditable='true']",
          "form",
          "button",
        ].join(",")
      )
    );
  }

  function hasMostlyUiText(text) {
    const normalized = normalizeText(text);
    if (!normalized) return true;

    const uiHits = [
      "Inbox",
      "Sent",
      "Draft",
      "Spam",
      "Trash",
      "Archive",
      "Reply",
      "Forward",
      "Delete",
      "收件箱",
      "发件箱",
      "草稿",
      "垃圾邮件",
      "回复",
      "转发",
      "删除",
      "归档",
    ].filter((word) => normalized.includes(word)).length;

    return uiHits >= 5 && normalized.length < 900;
  }

  function looksLikeMessageBody(node) {
    const text = getTextFromNode(node);
    if (text.length < 80 || text.length > 50000) return false;
    if (hasMostlyUiText(text)) return false;

    const words = text.split(/\s+/).filter(Boolean);
    const emailLike = senderEmailPattern.test(text);
    const sentenceLike = /[.!?。！？]\s|[\r\n]/.test(text);
    const commerceLike = /\b(quote|quotation|price|target|sample|order|qty|quantity|MOQ|FOB|EXW|CIF|DDP|lead time|delivery|spec|requirement|invoice|payment|询价|报价|价格|样品|订单|数量|交期|规格|付款)\b/i.test(text);

    return words.length >= 10 && (sentenceLike || commerceLike || emailLike);
  }

  function collectGenericBodyRoots() {
    const scanRoots = [
      document.querySelector("[role='main']"),
      document.querySelector("main"),
      document.querySelector("[class*='read' i]"),
      document.querySelector("[class*='mail' i]"),
      document.body,
    ].filter(Boolean);

    const candidates = new Set();
    const selectors = [
      "article",
      "section",
      "div",
      "td",
      "[class*='content' i]",
      "[class*='body' i]",
      "[class*='message' i]",
      "[class*='mail' i]",
      "[class*='read' i]",
    ].join(",");

    for (const scanRoot of scanRoots) {
      scanRoot.querySelectorAll(selectors).forEach((node) => {
        if (!(node instanceof Element)) return;
        if (!isVisible(node) || isIgnoredCaptureContainer(node)) return;
        if (!looksLikeMessageBody(node)) return;

        const nodeTextLength = getTextFromNode(node).length;
        const childBody = [...node.children].some((child) => {
          return child instanceof Element && looksLikeMessageBody(child) && getTextFromNode(child).length > nodeTextLength * 0.72;
        });

        if (!childBody) candidates.add(node);
      });
    }

    return [...candidates].sort((a, b) => getTextFromNode(a).length - getTextFromNode(b).length);
  }

  function collectVisibleRoots() {
    const selectors = [
      'div.a3s.aiL',
      'div.a3s',
      '[role="article"]',
      'article',
      'article[role="article"]',
      '[data-message-id]',
      '[data-pre-plain-text]',
      '[data-testid*="msg-container"]',
      '[data-testid*="message"]',
      '[class*="content" i]',
      '[class*="body" i]',
      '[class*="message" i]',
      '[class*="read" i]',
      '[aria-label*="message" i]',
      '[aria-label*="邮件"], [aria-label*="郵件"]',
      '[data-testid="conversation-panel-messages"] > div',
    ];

    const candidates = new Set();

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => {
        if (node instanceof Element && isVisible(node)) {
          candidates.add(node);
        }
      });
    }

    collectGenericBodyRoots().forEach((node) => candidates.add(node));

    return [...candidates].sort((a, b) => {
      if (a === b) return 0;
      const position = a.compareDocumentPosition(b);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }

  function scoreRoot(root) {
    const text = getTextFromNode(root);
    let score = Math.min(text.length / 50, 30);

    if (root.matches('div.a3s, div.a3s.aiL')) score += 12;
    if (root.matches('[role="article"], article')) score += 10;
    if (root.hasAttribute('data-message-id')) score += 8;
    if (root.hasAttribute('data-pre-plain-text')) score += 10;
    if (root.hasAttribute('data-testid')) score += 4;
    if (looksLikeMessageBody(root)) score += 8;
    if (root.matches("[class*='content' i], [class*='body' i], [class*='message' i], [class*='read' i]")) score += 4;
    if (/whatsapp/i.test(location.hostname) || /whatsapp/i.test(document.title)) score += 4;
    if (root.closest('[role="dialog"]')) score -= 20;
    if (root.closest('[contenteditable="true"]')) score -= 15;

    return score;
  }

  function pickConversationRoot() {
    const roots = collectVisibleRoots();
    if (!roots.length) return null;

    const scored = roots.map((root) => ({ root, score: scoreRoot(root) }));
    scored.sort((a, b) => a.score - b.score);

    const top = scored[scored.length - 1];
    if (!top || top.score < 10) return null;
    return top.root;
  }

  function extractSenderIdentity(root) {
    const selectors = [
      'span.gD[email]',
      'span[email].gD',
      '[email]',
      '[data-hovercard-id]',
      'a[href^="mailto:"]',
      '[aria-label*="From" i]',
      '[aria-label*="发件人"]',
      '[aria-label*="寄件人"]',
      '[aria-label*="Sender" i]',
      '[data-testid*="sender"]',
      '[data-testid*="from"]',
      '[data-testid*="chat-title"]',
    ];

    const ownEmailSet = new Set();
    document.querySelectorAll('[aria-label*="Google Account"], [aria-label*="Google 账户"], [aria-label*="Google 帐户"], [href*="SignOutOptions"]')
      .forEach((node) => {
        const value = [
          node.getAttribute?.('email'),
          node.getAttribute?.('data-hovercard-id'),
          node.getAttribute?.('aria-label'),
          node.getAttribute?.('title'),
          node.textContent,
        ].find((candidate) => candidate && senderEmailPattern.test(candidate));
        if (value) ownEmailSet.add(String(value).match(senderEmailPattern)[0].toLowerCase());
      });

    for (const selector of selectors) {
      const nodes = root.querySelectorAll(selector);
      for (const node of nodes) {
        if (!(node instanceof Element) || !isVisible(node)) continue;
        const attrs = [
          node.getAttribute('email'),
          node.getAttribute('data-hovercard-id'),
          node.getAttribute('title'),
          node.getAttribute('aria-label'),
          node.textContent,
        ];
        for (const attr of attrs) {
          if (!attr) continue;
          const match = String(attr).match(senderEmailPattern);
          if (match) {
            const email = match[0].toLowerCase();
            if (!ownEmailSet.has(email)) return email;
          }
        }
      }
    }

    // Fallback: use visible sender/contact label as a stable identity token for non-email web apps.
    const fallbackSelectors = [
      '[aria-label*="From" i]',
      '[aria-label*="发件人"]',
      '[aria-label*="寄件人"]',
      '[data-testid*="sender"]',
      '[data-testid*="chat-title"]',
      'header',
    ];

    for (const selector of fallbackSelectors) {
      const node = root.querySelector(selector);
      if (!node || !isVisible(node)) continue;
      const text = normalizeText(node.getAttribute?.('aria-label') || node.getAttribute?.('title') || getTextFromNode(node));
      if (text) return text;
    }

    return "";
  }

  function extractLocalTimestamp(root) {
    const timestampNodes = [
      root.querySelector('[data-timestamp]'),
      root.querySelector('time[datetime]'),
      root.querySelector('[title*="AM"], [title*="PM"], [title*="上午"], [title*="下午"]'),
      root.querySelector('[aria-label*="time" i], [aria-label*="时间"], [aria-label*="時間"]'),
    ].filter(Boolean);

    for (const node of timestampNodes) {
      const candidateValues = [
        node.getAttribute?.('data-timestamp'),
        node.getAttribute?.('datetime'),
        node.getAttribute?.('title'),
        node.getAttribute?.('aria-label'),
        node.textContent,
      ];

      for (const candidate of candidateValues) {
        const parsed = parseTimestampCandidate(candidate);
        if (parsed) return formatLocalDateTime(parsed);
      }
    }

    const bodyTimeNodes = [...root.querySelectorAll('time, [data-timestamp], [aria-label], [title]')];
    for (const node of bodyTimeNodes) {
      const values = [node.getAttribute?.('data-timestamp'), node.getAttribute?.('datetime'), node.getAttribute?.('title'), node.getAttribute?.('aria-label')];
      for (const value of values) {
        const parsed = parseTimestampCandidate(value);
        if (parsed) return formatLocalDateTime(parsed);
      }
    }

    return formatLocalDateTime(new Date());
  }

  function removeQuotedHistory(text) {
    const cutPatterns = [
      /\nOn .+ wrote:\s*$/im,
      /\n-----Original Message-----/im,
      /\nFrom:\s*.+$/im,
      /\nSent:\s*.+$/im,
      /\nTo:\s*.+$/im,
      /\nSubject:\s*.+$/im,
      /\n_{5,}\s*$/im,
      /\n-{2,}\s*Original Message\s*-{2,}/im,
    ];

    let cutIndex = -1;
    for (const pattern of cutPatterns) {
      const match = text.match(pattern);
      if (match && typeof match.index === 'number' && match.index >= 0) {
        cutIndex = cutIndex < 0 ? match.index : Math.min(cutIndex, match.index);
      }
    }

    const trimmed = cutIndex >= 0 ? text.slice(0, cutIndex) : text;
    return normalizeText(trimmed.replace(/\n>.+$/gm, ''));
  }

  function extractLatestBodyText(root) {
    const clone = root.cloneNode(true);

    clone.querySelectorAll([
      'blockquote',
      '.gmail_quote',
      '.gmail_signature',
      '[aria-hidden="true"]',
      'script',
      'style',
      '[contenteditable="true"]',
      '[style*="display: none"]',
      '[style*="display:none"]',
    ].join(',')).forEach((node) => node.remove());

    const text = getTextFromNode(clone);
    return removeQuotedHistory(text);
  }

  function makeSourceIdentity(sourceType, identity, title) {
    const cleanedIdentity = normalizeText(identity || '').toLowerCase();
    const cleanedTitle = normalizeText(title || '').toLowerCase();

    if (cleanedIdentity) return cleanedIdentity;
    if (cleanedTitle) return `${sourceType.toLowerCase()}:${cleanedTitle}`;
    return `${sourceType.toLowerCase()}:${location.hostname}`;
  }

  async function sha256Hex(value) {
    const input = new TextEncoder().encode(String(value || ''));

    if (globalThis.crypto?.subtle?.digest) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    // Lightweight fallback if subtle crypto is unavailable.
    let hash = 0;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return `fallback-${Math.abs(hash).toString(16)}`;
  }

  function buildPayload(root, captureMode) {
    const body = extractLatestBodyText(root);
    if (!body || body.length < MIN_BODY_LENGTH) return null;

    const sourceType = detectSourceType(root);
    const title = extractDocumentTitle(root);
    const senderIdentity = extractSenderIdentity(root);
    const stableIdentity = makeSourceIdentity(sourceType, senderIdentity, title);
    const timestamp = extractLocalTimestamp(root);
    const normalizedBody = normalizeText(body);
    const signatureBase = [sourceType, stableIdentity, title, normalizedBody].join('\n---\n');

    return Promise.resolve(sha256Hex(signatureBase)).then((messageHash) => ({
      source_email: stableIdentity,
      message_body: normalizedBody,
      timestamp,
      source: sourceType,
      title,
      page_title: normalizeText(document.title || ''),
      page_url: location.href,
      message_hash: messageHash,
      capture_mode: captureMode,
      topic: title,
      product_keywords: [],
    }));
  }

  function setPanelState(state, detail) {
    const node = createMiniPanel();
    const dot = node.querySelector('[data-qm-dot]');
    const status = node.querySelector('[data-qm-status]');

    const palette = {
      idle: ['#64748b', '自动监听中'],
      scanning: ['#f59e0b', '正在扫描当前页面'],
      captured: ['#22c55e', detail || '已同步'],
      duplicate: ['#3b82f6', detail || '内容已同步'],
      empty: ['#94a3b8', detail || '未识别到可同步内容'],
      error: ['#ef4444', detail || '同步失败'],
    };

    const [color, text] = palette[state] || palette.idle;
    dot.style.background = color;
    status.textContent = text;
  }

  async function readLastDeliveredHash() {
    const result = await chrome.storage.local.get([STORAGE_LAST_HASH_KEY]);
    return result?.[STORAGE_LAST_HASH_KEY] || '';
  }

  async function writeLastDeliveredState(hash, payload) {
    await chrome.storage.local.set({
      [STORAGE_LAST_HASH_KEY]: hash,
      [STORAGE_LAST_PAYLOAD_KEY]: payload,
    });
  }

  async function sendCapturedPayload(payload, captureMode) {
    if (!payload) {
      setPanelState('empty');
      return null;
    }

    const deliveredHash = await readLastDeliveredHash();
    if (payload.message_hash && payload.message_hash === deliveredHash) {
      lastDeliveredHash = deliveredHash;
      setPanelState('duplicate', '内容已同步，无需重复发送');
      return {
        ok: true,
        skipped: true,
        payload,
      };
    }

    if (isSending) return null;
    isSending = true;

    setPanelState('scanning');
    console.log('[QuoteMaster] captured_data', payload);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: BACKGROUND_EVENT,
          payload,
          capture_mode: captureMode,
        },
        async (response) => {
          isSending = false;

          if (chrome.runtime.lastError) {
            setPanelState('error', chrome.runtime.lastError.message || '无法连接后台');
            resolve({ ok: false, error: chrome.runtime.lastError.message || 'Runtime error' });
            return;
          }

          if (response?.ok) {
            lastSeenHash = payload.message_hash || lastSeenHash;
            lastDeliveredHash = payload.message_hash || lastDeliveredHash;
            await writeLastDeliveredState(payload.message_hash || '', payload);
            setPanelState('captured', '已同步到后端');
            resolve(response);
            return;
          }

          setPanelState('error', response?.error || '后端未返回成功状态');
          resolve(response || { ok: false, error: 'Unknown response' });
        }
      );
    });
  }

  async function scanNow(captureMode = 'auto') {
    if (!isLikelyConversationPage()) {
      setPanelState('idle');
      return null;
    }

    const root = pickConversationRoot();
    if (!root) {
      setPanelState('empty', '未识别到可同步内容');
      return null;
    }

    const payload = await buildPayload(root, captureMode);
    if (!payload) {
      setPanelState('empty', '正文内容过短或尚未展开');
      return null;
    }

    if (payload.message_hash === lastSeenHash && captureMode === 'auto') {
      setPanelState('duplicate', '当前内容未变化');
      return {
        ok: true,
        skipped: true,
        payload,
      };
    }

    lastSeenHash = payload.message_hash || lastSeenHash;
    return sendCapturedPayload(payload, captureMode);
  }

  function scheduleScan() {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      scanNow('auto');
    }, DEBOUNCE_MS);
  }

  function shouldObserveMutations(mutations) {
    return mutations.some((mutation) => {
      if (mutation.type === 'characterData') return true;
      if (mutation.type !== 'childList') return false;
      return [...mutation.addedNodes].some((node) => {
        if (!(node instanceof Element)) return false;
        return Boolean(
          node.matches(
            [
              'div.a3s',
              '[role="article"]',
              'article',
              '[data-message-id]',
              '[data-pre-plain-text]',
              '[data-testid*="msg"]',
              '[data-testid*="message"]',
              '[aria-label*="message" i]',
              '[aria-label*="邮件"], [aria-label*="郵件"]',
              'main',
            ].join(',')
          ) || node.querySelector(
            [
              'div.a3s',
              '[role="article"]',
              'article',
              '[data-message-id]',
              '[data-pre-plain-text]',
              '[data-testid*="msg"]',
              '[data-testid*="message"]',
              '[class*="content" i]',
              '[class*="body" i]',
              '[class*="message" i]',
              '[class*="read" i]',
            ].join(',')
          )
        );
      });
    });
  }

  function mountObserver() {
    const target = document.body || document.documentElement;
    if (!target) return;

    const observer = new MutationObserver((mutations) => {
      if (!shouldObserveMutations(mutations)) return;
      if (!isLikelyConversationPage()) return;
      scheduleScan();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== FORCE_SYNC_EVENT) return false;

    scanNow('manual').then((result) => {
      sendResponse({ ok: Boolean(result?.ok), payload: result?.payload || null, skipped: Boolean(result?.skipped) });
    });

    return true;
  });

  window.addEventListener('hashchange', scheduleScan);
  window.addEventListener('popstate', scheduleScan);
  window.addEventListener('focus', scheduleScan);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleScan();
  });

  if (IS_TOP_FRAME) createMiniPanel();
  setPanelState('idle');
  mountObserver();
  scheduleScan();

  window[GLOBAL_KEY] = {
    scanNow,
  };
})();
