/**
 * @file main.js
 * Application entry point. Wires together StorageService, ThemeService,
 * ChatList, ChatWindow, Settings, Onboarding, EmojiPicker, and registers
 * the service worker for offline app-shell support.
 */

import { StorageService } from './services/StorageService.js';
import { ThemeService } from './services/ThemeService.js';
import { SoundManager } from './services/SoundManager.js';
import { OpenRouterService } from './services/OpenRouterService.js';
import { ChatList } from './components/ChatList.js';
import { ChatWindow } from './components/ChatWindow.js';
import { Settings } from './components/Settings.js';
import { Onboarding } from './components/Onboarding.js';
import { EmojiPicker } from './components/EmojiPicker.js';
import { showToast } from './utils/toast.js';
import { confirmDialog } from './utils/modal.js';
import { downloadTextFile, formatTime } from './utils/helpers.js';

/* ============================================================
   Global error boundary
   ============================================================ */
function showErrorBoundary(err) {
  try {
    const boundary = document.getElementById('error-boundary');
    const detailsEl = document.getElementById('error-boundary-details');
    if (boundary) {
      boundary.hidden = false;
      if (detailsEl && err) {
        detailsEl.textContent = (err.stack || err.message || String(err)).slice(0, 4000);
      }
    }
  } catch {
    /* if even this fails, there's nothing more we can safely do */
  }
}

window.addEventListener('error', (e) => {
  console.error('[MonerAlo] Uncaught error:', e.error || e.message);
  // Only show full-screen boundary for errors during initial boot;
  // afterwards prefer toasts so a stray error doesn't nuke an active chat.
  if (!window.__monerAloBooted) showErrorBoundary(e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[MonerAlo] Unhandled promise rejection:', e.reason);
  if (!window.__monerAloBooted) showErrorBoundary(e.reason);
});

document.getElementById('error-reload-btn')?.addEventListener('click', () => location.reload());
document.getElementById('error-details-toggle')?.addEventListener('click', (e) => {
  const details = document.getElementById('error-boundary-details');
  details.hidden = !details.hidden;
  e.currentTarget.textContent = details.hidden ? 'Show details' : 'Hide details';
});

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  StorageService.init();
  ThemeService.init();

  const settings = StorageService.getSettings();

  const onboardingRoot = document.getElementById('onboarding');
  const mainShell = document.getElementById('main-shell');

  const chatListEl = document.getElementById('chat-list');
  const searchInputEl = document.getElementById('chat-search-input');
  const messagesListEl = document.getElementById('messages-list');
  const messagesContainerEl = document.getElementById('messages-container');
  const typingRowEl = document.getElementById('typing-indicator-row');
  const scrollBtnEl = document.getElementById('scroll-to-bottom-btn');
  const nameEl = document.querySelector('.profile-header__name');
  const statusEl = document.getElementById('mrittika-status-text');
  const composerInput = document.getElementById('composer-input');
  const sendBtn = document.getElementById('send-btn');
  const composerHint = document.getElementById('composer-hint');
  const emojiPickerEl = document.getElementById('emoji-picker');
  const emojiToggleBtn = document.getElementById('emoji-toggle-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  const backToListBtn = document.getElementById('back-to-list-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const settingsPanelEl = document.getElementById('settings-panel');
  const settingsOverlayEl = document.getElementById('settings-overlay');
  const chatMenuBtn = document.getElementById('chat-menu-btn');
  const chatMenu = document.getElementById('chat-menu');
  const chatMenuOverlay = document.getElementById('chat-menu-overlay');
  const attachBtn = document.getElementById('attach-btn');

  /* ---------------- Ensure at least one conversation exists ---------------- */
  function ensureSampleConversation() {
    const conversations = StorageService.getConversations();
    if (conversations.length === 0) {
      const convo = StorageService.createConversation('Chat with Mrittika', true);
      const now = Date.now();
      const sampleMessages = [
        { role: 'assistant', content: "Heyy 😊 kemon acho? Ami Mrittika, tomar MonerAlo chat buddy." },
        { role: 'assistant', content: "Ei chat ta sudhu amader dujoner — tumi je kotha bolo shob এখানেই thake, tomar nijer phone e." },
        { role: 'assistant', content: "Kichu jiggasha korte chao naki emni gulpo korte chao? Ami ready 🙂" },
      ];
      sampleMessages.forEach((m, i) => {
        StorageService.addMessage(convo.id, {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
          conversationId: convo.id,
          role: m.role,
          content: m.content,
          timestamp: now - (sampleMessages.length - i) * 60000,
          status: 'delivered',
        });
      });
      return convo;
    }
    return conversations[0];
  }

  /* ---------------- Instantiate components ---------------- */
  const chatWindow = new ChatWindow({
    messagesListEl,
    messagesContainerEl,
    typingRowEl,
    scrollBtnEl,
    nameEl,
    statusEl,
    onConversationUpdated: () => {
      chatList.render();
    },
  });

  const chatList = new ChatList({
    listEl: chatListEl,
    searchInputEl,
    onSelect: (id) => selectConversation(id),
  });

  const emojiPicker = new EmojiPicker(emojiPickerEl, (emoji) => {
    insertAtCursor(composerInput, emoji);
    composerInput.dispatchEvent(new Event('input'));
    composerInput.focus();
  });

  const settingsPanel = new Settings({
    panelEl: settingsPanelEl,
    overlayEl: settingsOverlayEl,
    onDataWiped: () => {
      setTimeout(() => location.reload(), 400);
    },
    onAllChatsCleared: () => {
      const convo = ensureSampleConversationSilently();
      selectConversation(convo.id);
      chatList.render();
    },
  });

  function ensureSampleConversationSilently() {
    const conversations = StorageService.getConversations();
    if (conversations.length > 0) return conversations[0];
    return StorageService.createConversation('New chat', false);
  }

  /* ---------------- Conversation selection / mobile view switching ---------------- */
  function selectConversation(id) {
    chatWindow.loadConversation(id);
    chatList.setActive(id);
    mainShell.dataset.view = 'chat';
  }

  function showChatList() {
    mainShell.dataset.view = 'list';
  }

  backToListBtn.addEventListener('click', showChatList);

  newChatBtn.addEventListener('click', () => {
    const convo = StorageService.createConversation('New chat');
    chatList.render();
    selectConversation(convo.id);
    composerInput.focus();
  });

  /* ---------------- Composer behavior ---------------- */
  function autoResizeTextarea() {
    composerInput.style.height = 'auto';
    composerInput.style.height = Math.min(composerInput.scrollHeight, 120) + 'px';
  }

  function updateSendButtonState() {
    const hasText = composerInput.value.trim().length > 0;
    const busy = OpenRouterService.isBusy();
    sendBtn.disabled = !hasText || busy;
  }

  composerInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButtonState();
  });

  composerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 640px)').matches) {
      e.preventDefault();
      handleSend();
    }
  });

  let sendLock = false;
  async function handleSend() {
    const text = composerInput.value;
    if (!text.trim() || sendLock) return;
    sendLock = true;
    SoundManager.unlockAudio();
    composerInput.value = '';
    autoResizeTextarea();
    updateSendButtonState();
    emojiPicker.hide();
    try {
      await chatWindow.sendMessage(text);
    } catch (err) {
      console.error('[MonerAlo] send failed unexpectedly', err);
      showToast('Something went wrong sending that message.', 'error');
    } finally {
      sendLock = false;
      updateSendButtonState();
    }
  }

  sendBtn.addEventListener('click', handleSend);

  attachBtn.addEventListener('click', () => {
    showToast('Attachments are not available — MonerAlo has no backend or file storage.', 'info');
  });

  /* ---------------- Emoji picker ---------------- */
  emojiToggleBtn.addEventListener('click', () => {
    emojiPicker.toggle();
  });
  document.addEventListener('click', (e) => {
    if (
      emojiPicker.isVisible() &&
      !emojiPickerEl.contains(e.target) &&
      e.target !== emojiToggleBtn &&
      !emojiToggleBtn.contains(e.target)
    ) {
      emojiPicker.hide();
    }
  });

  function insertAtCursor(el, text) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.selectionStart = el.selectionEnd = start + text.length;
  }

  /* ---------------- Settings ---------------- */
  openSettingsBtn.addEventListener('click', () => settingsPanel.open('root'));

  /* ---------------- Chat options menu ---------------- */
  function closeChatMenu() {
    chatMenu.hidden = true;
    chatMenuOverlay.hidden = true;
  }
  chatMenuBtn.addEventListener('click', (e) => {
    const rect = chatMenuBtn.getBoundingClientRect();
    chatMenu.style.top = rect.bottom + 8 + 'px';
    chatMenu.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';
    chatMenu.hidden = false;
    chatMenuOverlay.hidden = false;
  });
  chatMenuOverlay.addEventListener('click', closeChatMenu);

  chatMenu.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    closeChatMenu();
    const convoId = chatWindow.getConversationId();
    if (!convoId) return;

    if (action === 'search') {
      showChatList();
      searchInputEl.focus();
    } else if (action === 'export-json') {
      const convo = StorageService.getConversations().find((c) => c.id === convoId);
      const messages = StorageService.getMessages(convoId);
      downloadTextFile(
        `moneralo-${(convo?.title || 'chat').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`,
        JSON.stringify({ conversation: convo, messages }, null, 2),
        'application/json'
      );
      showToast('Exported as JSON.', 'success');
    } else if (action === 'export-txt') {
      const convo = StorageService.getConversations().find((c) => c.id === convoId);
      const messages = StorageService.getMessages(convoId);
      const lines = messages.map((m) => `[${formatTime(m.timestamp)}] ${m.role === 'user' ? 'You' : 'Mrittika'}: ${m.content}`);
      downloadTextFile(
        `moneralo-${(convo?.title || 'chat').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`,
        lines.join('\n'),
        'text/plain'
      );
      showToast('Exported as TXT.', 'success');
    } else if (action === 'memories') {
      settingsPanel.open('memory');
    } else if (action === 'delete-chat') {
      const confirmed = await confirmDialog({
        title: 'Delete this chat?',
        body: 'This permanently deletes this conversation and its messages.',
        confirmLabel: 'Delete',
        danger: true,
      });
      if (confirmed) {
        StorageService.deleteConversation(convoId);
        let remaining = StorageService.getConversations();
        if (remaining.length === 0) {
          const convo = StorageService.createConversation('New chat');
          remaining = [convo];
        }
        chatList.render();
        selectConversation(remaining[0].id);
        showToast('Chat deleted.', 'success');
      }
    }
  });

  /* ---------------- Offline banner ---------------- */
  const offlineBanner = document.getElementById('offline-banner');
  function updateOnlineStatus() {
    offlineBanner.hidden = navigator.onLine;
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ---------------- Recover from corrupted state defensively ---------------- */
  let initialConversation;
  try {
    initialConversation = ensureSampleConversation();
  } catch (err) {
    console.error('[MonerAlo] Failed to initialize conversations, resetting.', err);
    StorageService.clearAllConversations();
    initialConversation = ensureSampleConversation();
  }

  chatList.render();
  selectConversation(initialConversation.id);
  if (window.matchMedia('(min-width: 861px)').matches) {
    mainShell.dataset.view = 'chat';
  } else {
    mainShell.dataset.view = 'list';
  }

  /* ---------------- Onboarding gate ---------------- */
  if (!settings.onboardingComplete) {
    mainShell.hidden = true;
    const onboarding = new Onboarding(onboardingRoot, () => {
      onboardingRoot.hidden = true;
      mainShell.hidden = false;
    });
    onboarding.start();
  } else {
    mainShell.hidden = false;
  }

  updateSendButtonState();
  window.__monerAloBooted = true;
}

/* ============================================================
   Service worker registration (PWA offline shell)
   ============================================================ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.warn('[MonerAlo] Service worker registration failed:', err);
      });
    });
  }
}

try {
  boot();
} catch (err) {
  console.error('[MonerAlo] Fatal boot error:', err);
  showErrorBoundary(err);
}

registerServiceWorker();
