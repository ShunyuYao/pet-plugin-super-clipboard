(function () {
  'use strict';

  const pet = window.pet;
  const markdown = window.SuperClipboardMarkdown;
  const MAX_BYTES = 1073741824;
  const POLL_INTERVAL_MS = 1000;
  const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>{}\[\]"']+/giu;

  const state = {
    type: 'all',
    search: '',
    pinned: false,
    revision: null,
    renderedQueryKey: '',
    allTotal: 0,
    allBytes: 0,
    items: [],
    imageCache: new Map(),
    imagePromises: new Map(),
    textLengthCache: new Map(),
    textLengthPromises: new Map(),
    pendingSends: new Set(),
    pollTimer: null,
    searchDebounceTimer: null,
    queryToken: 0,
    statusTimer: null,
    stopped: false
  };

  const nextMarkdownFilename = markdown.createFilenameFactory();
  const el = {};

  function q(id) { return document.getElementById(id); }
  function captureElements() {
    el.app = q('app');
    el.pinToggle = q('pin-toggle');
    el.searchInput = q('search-input');
    el.tabs = Array.from(document.querySelectorAll('.tab'));
    el.content = q('content');
    el.columns = q('columns');
    el.emptyState = q('empty-state');
    el.emptyTitle = q('empty-title');
    el.emptyDescription = q('empty-description');
    el.historyCount = q('history-count');
    el.clearAll = q('clear-all');
    el.status = q('status');
  }

  function showStatus(message, timeoutMs) {
    clearTimeout(state.statusTimer);
    el.status.textContent = String(message || '');
    el.status.hidden = !message;
    if (message) {
      state.statusTimer = setTimeout(() => { el.status.hidden = true; }, timeoutMs || 2200);
    }
  }

  function errorMessage(error) {
    return String(error && error.message || error || '操作失败');
  }

  function formatBytes(value) {
    const bytes = Math.max(0, Number(value) || 0);
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ['KB', 'MB', 'GB'];
    let amount = bytes / 1024;
    let unit = units[0];
    for (let i = 1; i < units.length && amount >= 1024; i++) {
      amount /= 1024;
      unit = units[i];
    }
    return `${amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)} ${unit}`;
  }

  function timeAgo(timestamp) {
    const deltaMs = Math.max(0, Date.now() - Number(timestamp || 0));
    const seconds = Math.floor(deltaMs / 1000);
    if (seconds < 45) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const date = new Date(Number(timestamp || 0));
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function buildTypeIcon(type) {
    const icon = document.createElement('img');
    icon.className = 'type-icon';
    icon.src = type === 'image' ? 'assets/icon-image.svg' : 'assets/icon-text.svg';
    icon.alt = '';
    icon.draggable = false;
    return icon;
  }

  function createHeader(item) {
    const header = document.createElement('div');
    header.className = 'card-header';
    header.append(buildTypeIcon(item.type));
    const time = document.createElement('span');
    time.className = 'card-time';
    time.textContent = `${item.type === 'image' ? '图片' : '文本'} · ${timeAgo(item.capturedAt)}`;
    header.append(time);
    return header;
  }

  function appendPreviewText(container, text) {
    const source = String(text || '');
    let lastIndex = 0;
    for (const match of source.matchAll(URL_RE)) {
      const start = match.index == null ? lastIndex : match.index;
      if (start > lastIndex) container.append(document.createTextNode(source.slice(lastIndex, start)));
      const span = document.createElement('span');
      span.className = 'url-highlight';
      span.textContent = match[0];
      container.append(span);
      lastIndex = start + match[0].length;
    }
    if (lastIndex < source.length) container.append(document.createTextNode(source.slice(lastIndex)));
  }

  function createDispatchButton(item) {
    const button = document.createElement('button');
    button.className = 'dispatch-button';
    button.type = 'button';
    button.dataset.action = 'send';
    button.dataset.id = item.id;
    button.setAttribute('aria-label', '叼给好友');
    button.setAttribute('aria-busy', state.pendingSends.has(item.id) ? 'true' : 'false');
    button.disabled = state.pendingSends.has(item.id);
    const icon = document.createElement('span');
    icon.className = 'dispatch-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void sendItem(item, button);
    });
    button.addEventListener('keydown', (event) => event.stopPropagation());
    return button;
  }

  function createFooter(item) {
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const metric = document.createElement('span');
    metric.className = 'card-metric';
    if (item.type === 'text') {
      metric.dataset.metricId = item.id;
      const cachedLength = state.textLengthCache.get(item.id);
      metric.textContent = cachedLength == null ? '' : `${cachedLength} 个字符`;
      if (cachedLength == null) void ensureTextLength(item.id);
    } else {
      metric.textContent = '';
    }
    footer.append(metric, createDispatchButton(item));
    return footer;
  }

  function createCard(item, order) {
    const card = document.createElement('article');
    card.className = `clip-card ${item.type}-card`;
    card.dataset.id = item.id;
    card.dataset.type = item.type;
    card.dataset.order = String(order);
    card.dataset.column = order % 2 === 1 ? 'left' : 'right';
    card.dataset.referenced = item.referencedAt == null ? 'false' : 'true';
    card.tabIndex = 0;
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `${item.type === 'image' ? '图片' : '文本'}剪贴板，${timeAgo(item.capturedAt)}，按 Enter 复制`);
    card.append(createHeader(item));

    if (item.type === 'text') {
      const body = document.createElement('div');
      body.className = 'text-body';
      const preview = document.createElement('p');
      preview.className = 'text-preview';
      appendPreviewText(preview, item.preview || '');
      body.append(preview);
      card.append(body);
    } else {
      const media = document.createElement('div');
      media.className = 'image-media';
      media.dataset.imageId = item.id;
      const cached = state.imageCache.get(item.id);
      if (cached && cached.ok) setImageContent(media, cached.dataUrl);
      else if (cached && !cached.ok) setImageError(media);
      else {
        media.setAttribute('aria-busy', 'true');
        const placeholder = document.createElement('div');
        placeholder.className = 'image-error';
        placeholder.textContent = '图片加载中';
        media.append(placeholder);
        void ensureImage(item.id);
      }
      card.append(media);
    }

    card.append(createFooter(item));
    card.addEventListener('click', () => void copyItem(item));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target === card) {
        event.preventDefault();
        void copyItem(item);
      }
    });
    return card;
  }

  function setImageContent(media, dataUrl) {
    media.replaceChildren();
    media.removeAttribute('aria-busy');
    const image = new Image();
    image.alt = '';
    image.draggable = false;
    image.src = dataUrl;
    image.addEventListener('load', () => scheduleLayout(), { once: true });
    image.addEventListener('error', () => {
      state.imageCache.set(media.dataset.imageId, { ok: false });
      setImageError(media);
      scheduleLayout();
    }, { once: true });
    media.append(image);
  }

  function setImageError(media) {
    media.replaceChildren();
    media.removeAttribute('aria-busy');
    const message = document.createElement('div');
    message.className = 'image-error';
    message.textContent = '图片暂时无法预览';
    media.append(message);
  }

  async function ensureTextLength(id) {
    if (state.textLengthCache.has(id)) return state.textLengthCache.get(id);
    if (state.textLengthPromises.has(id)) return state.textLengthPromises.get(id);
    const promise = (async () => {
      try {
        const item = await pet.clipboard.read(id);
        const source = item.plain || item.html || item.rtf || '';
        const length = Array.from(String(source)).length;
        state.textLengthCache.set(id, length);
        for (const metric of document.querySelectorAll(`[data-metric-id="${CSS.escape(id)}"]`)) metric.textContent = `${length} 个字符`;
        return length;
      } catch {
        return null;
      } finally {
        state.textLengthPromises.delete(id);
      }
    })();
    state.textLengthPromises.set(id, promise);
    return promise;
  }

  async function ensureImage(id) {
    if (state.imageCache.has(id)) return state.imageCache.get(id);
    if (state.imagePromises.has(id)) return state.imagePromises.get(id);
    const promise = (async () => {
      try {
        const item = await pet.clipboard.read(id);
        const base64 = String(item && item.thumbnail || '');
        const mimeType = String(item && item.thumbnailMimeType || 'image/png');
        if (!base64) throw new Error('缩略图为空');
        const result = { ok: true, dataUrl: `data:${mimeType};base64,${base64}` };
        state.imageCache.set(id, result);
        for (const media of document.querySelectorAll(`[data-image-id="${CSS.escape(id)}"]`)) setImageContent(media, result.dataUrl);
        return result;
      } catch (error) {
        const result = { ok: false, error: errorMessage(error) };
        state.imageCache.set(id, result);
        for (const media of document.querySelectorAll(`[data-image-id="${CSS.escape(id)}"]`)) setImageError(media);
        return result;
      } finally {
        state.imagePromises.delete(id);
        scheduleLayout();
      }
    })();
    state.imagePromises.set(id, promise);
    return promise;
  }

  let layoutFrame = 0;
  function scheduleLayout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(layoutCards);
  }

  function layoutCards() {
    layoutFrame = 0;
    const cards = Array.from(el.columns.children);
    const heights = [0, 0];
    for (const card of cards) {
      const order = Number(card.dataset.order || 1);
      const column = (order - 1) % 2;
      card.style.left = column === 0 ? '0px' : '178px';
      card.style.top = `${heights[column]}px`;
      heights[column] += card.offsetHeight + 8;
    }
    el.columns.style.height = `${Math.max(0, heights[0] - 8, heights[1] - 8)}px`;
  }

  function render() {
    el.historyCount.textContent = `${state.allTotal} 条记录`;
    el.columns.replaceChildren();

    const hasItems = state.items.length > 0;
    el.columns.hidden = !hasItems;
    el.emptyState.hidden = hasItems;
    if (!hasItems) {
      const filtered = Boolean(state.search.trim()) || state.type !== 'all';
      el.emptyTitle.textContent = filtered ? '没有找到匹配内容' : '剪贴板还是空的';
      el.emptyDescription.textContent = filtered ? '试试其他关键词或切换分类' : '复制文本或图片后，会自动出现在这里';
      el.columns.style.height = '0px';
      return;
    }

    state.items.forEach((item, index) => el.columns.append(createCard(item, index + 1)));
    scheduleLayout();
  }

  async function queryHistory(options) {
    const token = ++state.queryToken;
    const filter = { type: state.type, search: state.search, limit: 500 };
    const snapshotKey = `${filter.type} ${filter.search}`;
    try {
      const allPromise = pet.clipboard.query({ type: 'all', search: '', limit: 500 });
      const filteredPromise = state.type === 'all' && state.search === ''
        ? allPromise
        : pet.clipboard.query(filter);
      const [allResult, filteredResult] = await Promise.all([allPromise, filteredPromise]);
      if (state.stopped || token !== state.queryToken) return;
      const forced = !!(options && options.force);
      const unchanged = !forced && state.revision === allResult.revision && state.renderedQueryKey === snapshotKey;
      state.allTotal = Number(allResult.total || 0);
      state.allBytes = Number(allResult.bytes || 0);
      if (unchanged) {
        el.historyCount.textContent = `${state.allTotal} 条记录`;
        return;
      }
      state.revision = allResult.revision;
      state.renderedQueryKey = snapshotKey;
      state.items = Array.isArray(filteredResult.items) ? filteredResult.items : [];
      const liveIds = new Set((allResult.items || []).map((item) => item.id));
      for (const id of state.imageCache.keys()) if (!liveIds.has(id)) state.imageCache.delete(id);
      for (const id of state.textLengthCache.keys()) if (!liveIds.has(id)) state.textLengthCache.delete(id);
      render();
    } catch (error) {
      if (token === state.queryToken) showStatus(`读取剪贴板失败：${errorMessage(error)}`, 3200);
    }
  }

  async function setPinned(next) {
    const previous = state.pinned;
    state.pinned = !!next;
    el.pinToggle.setAttribute('aria-pressed', String(state.pinned));
    try {
      await pet.storage.set('panelPinned', state.pinned);
      await pet.ui.setPanelPinned(state.pinned);
    } catch (error) {
      state.pinned = previous;
      el.pinToggle.setAttribute('aria-pressed', String(state.pinned));
      showStatus(`置顶状态保存失败：${errorMessage(error)}`, 3200);
    }
  }

  async function maybeCloseAfterSuccess() {
    if (!state.pinned) await pet.ui.closePanel();
  }

  async function copyItem(item) {
    try {
      const copied = await pet.clipboard.copy(item.id);
      if (!copied) throw new Error('宿主未确认复制成功');
      await queryHistory({ force: true });
      await maybeCloseAfterSuccess();
    } catch (error) {
      showStatus(`复制失败：${errorMessage(error)}`, 3200);
    }
  }

  function textErrandPayload(item) {
    const content = markdown.toMarkdown({ plain: item.plain || '', html: item.html || '', rtf: item.rtf || '' });
    return {
      source: {
        type: 'generated',
        name: nextMarkdownFilename(new Date()),
        content,
        mimeType: 'text/markdown'
      },
      preview: {
        type: 'markdown',
        text: content
      }
    };
  }

  function imageErrandPayload(item) {
    return {
      source: {
        type: 'clipboard-image',
        id: item.id,
        name: item.name || undefined
      },
      preview: {
        type: 'image',
        dataUrl: state.imageCache.get(item.id)?.dataUrl || ''
      }
    };
  }

  async function sendItem(item, button) {
    if (state.pendingSends.has(item.id)) return;
    state.pendingSends.add(item.id);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      const fullItem = await pet.clipboard.read(item.id);
      const result = await pet.errands.composeFile(fullItem.type === 'image' ? imageErrandPayload(fullItem) : textErrandPayload(fullItem));
      if (result && result.action === 'sent') {
        await pet.clipboard.markReferenced(item.id);
        await queryHistory({ force: true });
        await maybeCloseAfterSuccess();
      }
    } catch (error) {
      showStatus(`发送失败：${errorMessage(error)}`, 3600);
    } finally {
      state.pendingSends.delete(item.id);
      if (button.isConnected) {
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
      }
    }
  }

  async function confirmAndClear() {
    try {
      const result = await pet.ui.dialog({
        title: '清空所有剪贴板历史？',
        text: '只会清空应用内保存的历史，不会清除系统当前剪贴板。',
        okLabel: '清空所有',
        cancelLabel: '取消',
        width: 340,
        height: 220
      });
      if (!result || result.action !== 'ok') return;
      await pet.clipboard.clearHistory();
      state.imageCache.clear();
      state.textLengthCache.clear();
      await queryHistory({ force: true });
    } catch (error) {
      showStatus(`清空失败：${errorMessage(error)}`, 3200);
    }
  }

  function scheduleFilteredQuery() {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(() => void queryHistory({ force: true }), 120);
  }

  function bindEvents() {
    el.pinToggle.addEventListener('click', () => void setPinned(!state.pinned));
    el.searchInput.addEventListener('input', () => {
      state.search = el.searchInput.value;
      scheduleFilteredQuery();
    });
    for (const tab of el.tabs) {
      tab.addEventListener('click', () => {
        state.type = tab.dataset.type;
        for (const candidate of el.tabs) {
          const active = candidate === tab;
          candidate.classList.toggle('is-active', active);
          candidate.setAttribute('aria-pressed', String(active));
        }
        void queryHistory({ force: true });
      });
    }
    el.clearAll.addEventListener('click', () => void confirmAndClear());
    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key === 'Enter') {
        event.preventDefault();
        void setPinned(!state.pinned);
        return;
      }
      if (event.key === 'Escape' && document.activeElement === el.searchInput && el.searchInput.value) {
        event.preventDefault();
        el.searchInput.value = '';
        state.search = '';
        void queryHistory({ force: true });
      }
    });
    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('beforeunload', () => {
      state.stopped = true;
      clearInterval(state.pollTimer);
      clearTimeout(state.searchDebounceTimer);
      cancelAnimationFrame(layoutFrame);
    });
  }

  async function init() {
    captureElements();
    if (!pet || !pet.clipboard || !pet.errands || !pet.storage || !pet.ui || !markdown) {
      showStatus('插件受控 API 未就绪', 5000);
      return;
    }
    bindEvents();
    try {
      state.pinned = !!(await pet.storage.get('panelPinned', false));
      el.pinToggle.setAttribute('aria-pressed', String(state.pinned));
      await pet.ui.setPanelPinned(state.pinned);
    } catch (error) {
      showStatus(`读取置顶状态失败：${errorMessage(error)}`, 3200);
    }
    await queryHistory({ force: true });
    state.pollTimer = setInterval(() => void queryHistory({ force: false }), POLL_INTERVAL_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
  else void init();
})();
