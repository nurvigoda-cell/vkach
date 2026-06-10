// user4.js - функции для сообщений с звуковыми уведомлениями

// ========== ПЕРЕМЕННЫЕ ==========
let currentDialogUser = null;
let messagesLoadInterval = null;
let currentMessages = [];
let isLoadingMore = false;
let hasMoreMessages = true;
let currentPage = 1;
const MESSAGES_PER_PAGE = 50;
let pollingInterval = null;
let lastUnreadCount = 0;
let soundEnabled = true;
let audioContext = null;
let soundInitialized = false;

// ========== ЭЛЕМЕНТЫ ==========
const messagesBtn = document.getElementById('navMessagesBottom');
const messagesModal = document.getElementById('messagesModal');
const messagesModalClose = document.querySelector('.messages-modal-close');
const dialogsModalBody = document.getElementById('dialogsModalBody');
const chatModal = document.getElementById('chatModal');
let dialogsList = [];
let unreadMessagesCount = 0;

// Инициализация звука
async function initSound() {
    if (soundInitialized) return true;
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        soundInitialized = true;
        console.log('🔊 Звук инициализирован');
        return true;
    } catch (e) {
        console.log('Ошибка инициализации звука:', e);
        return false;
    }
}

// Воспроизведение звука уведомления
async function playNotificationSound() {
    if (!soundEnabled) return;
    
    try {
        await initSound();
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.15;
        
        const now = audioContext.currentTime;
        oscillator.start(now);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
        oscillator.stop(now + 0.3);
        
    } catch (e) {
        console.log('Ошибка воспроизведения звука:', e);
    }
}

// Загрузка настройки звука
function loadSoundSetting() {
    const saved = localStorage.getItem('messagesSoundEnabled');
    if (saved !== null) {
        soundEnabled = saved === 'true';
    }
}

// Сохранение настройки звука
function saveSoundSetting() {
    localStorage.setItem('messagesSoundEnabled', soundEnabled);
}

// Добавление кнопки звука в модальное окно
function addSoundButtonToModal() {
    const modalHeader = document.querySelector('#messagesModal .friends-modal-header');
    if (!modalHeader) return;
    if (document.getElementById('soundToggleBtn')) return;
    
    modalHeader.innerHTML = '';
    
    const leftSpacer = document.createElement('div');
    leftSpacer.style.width = '36px';
    
    const centerContainer = document.createElement('div');
    centerContainer.style.display = 'flex';
    centerContainer.style.alignItems = 'center';
    centerContainer.style.justifyContent = 'center';
    centerContainer.style.flex = '1';
    centerContainer.style.gap = '15px';
    
    const title = document.createElement('h3');
    title.textContent = 'Сообщения';
    title.style.margin = '0';
    title.style.color = '#E9AE67';
    title.style.fontSize = '18px';
    
    const soundBtn = document.createElement('button');
    soundBtn.id = 'soundToggleBtn';
    soundBtn.className = 'sound-toggle-btn-circle';
    
    if (soundEnabled) {
        soundBtn.innerHTML = '🔔';
        soundBtn.style.backgroundColor = '#4CAF50';
        soundBtn.style.color = 'white';
        soundBtn.style.borderColor = '#4CAF50';
        soundBtn.title = 'Звук включен - нажмите чтобы выключить';
    } else {
        soundBtn.innerHTML = '🔕';
        soundBtn.style.backgroundColor = '#444';
        soundBtn.style.color = '#aaa';
        soundBtn.style.borderColor = '#666';
        soundBtn.title = 'Звук выключен - нажмите чтобы включить';
    }
    
    soundBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        saveSoundSetting();
        
        if (soundEnabled) {
            soundBtn.innerHTML = '🔔';
            soundBtn.style.backgroundColor = '#4CAF50';
            soundBtn.style.color = 'white';
            soundBtn.style.borderColor = '#4CAF50';
            soundBtn.title = 'Звук включен - нажмите чтобы выключить';
            await initSound();
            playNotificationSound();
        } else {
            soundBtn.innerHTML = '🔕';
            soundBtn.style.backgroundColor = '#444';
            soundBtn.style.color = '#aaa';
            soundBtn.style.borderColor = '#666';
            soundBtn.title = 'Звук выключен - нажмите чтобы включить';
        }
    });
    
    centerContainer.appendChild(title);
    centerContainer.appendChild(soundBtn);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'messages-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.style.fontSize = '28px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = '#aaa';
    closeBtn.style.transition = 'color 0.3s ease';
    closeBtn.onmouseover = () => closeBtn.style.color = '#E9AE67';
    closeBtn.onmouseout = () => closeBtn.style.color = '#aaa';
    closeBtn.addEventListener('click', closeMessagesModal);
    
    modalHeader.appendChild(leftSpacer);
    modalHeader.appendChild(centerContainer);
    modalHeader.appendChild(closeBtn);
}

// Обновление кнопки сообщений (бейдж)
function updateMessagesButton() {
    const messagesBtnElement = document.getElementById('navMessagesBottom');
    if (!messagesBtnElement) return;
    
    const existingBadge = messagesBtnElement.querySelector('.messages-badge');
    if (existingBadge) existingBadge.remove();
    
    if (unreadMessagesCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'messages-badge';
        badge.textContent = unreadMessagesCount > 99 ? '99+' : unreadMessagesCount;
        messagesBtnElement.appendChild(badge);
        messagesBtnElement.classList.add('active');
    } else {
        messagesBtnElement.classList.remove('active');
    }
}

// Загрузка количества непрочитанных сообщений
async function loadUnreadCount() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;
    
    try {
        const response = await fetch(`/api/unread-count/${userId}`);
        const data = await response.json();
        if (data.success) {
            const newCount = data.count;
            
            if (newCount > lastUnreadCount && newCount > 0 && soundEnabled) {
                playNotificationSound();
            }
            
            if (unreadMessagesCount !== newCount) {
                unreadMessagesCount = newCount;
                updateMessagesButton();
            }
            lastUnreadCount = newCount;
        }
    } catch (err) {
        console.error('Ошибка загрузки счетчика:', err);
    }
}

// Удаление всего диалога
async function deleteDialog(otherUserId, buttonElement) {
    const result = confirm('🗑️ Удалить всю историю переписки?\n\nЭто действие нельзя отменить. Сообщения удалятся у обоих пользователей.');
    
    if (!result) return;
    
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    try {
        const response = await fetch('/api/delete-dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, otherUserId: otherUserId })
        });
        const data = await response.json();
        if (data.success) {
            dialogsList = dialogsList.filter(d => d.user_id != otherUserId);
            unreadMessagesCount = dialogsList.reduce((sum, d) => sum + (d.unread_count || 0), 0);
            updateMessagesButton();
            displayDialogs(dialogsList);
            
            if (currentDialogUser && currentDialogUser.id == otherUserId) {
                closeChatModal();
            }
        } else {
            alert(data.error || 'Ошибка удаления');
        }
    } catch (err) {
        console.error('Ошибка удаления диалога:', err);
        alert('Ошибка подключения к серверу');
    }
}

// Загрузка списка диалогов
async function loadDialogs() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) return;
    
    try {
        const response = await fetch(`/api/dialogs/${userId}`);
        const data = await response.json();
        if (data.success && data.dialogs) {
            dialogsList = data.dialogs;
            const newUnreadCount = dialogsList.reduce((sum, d) => sum + (d.unread_count || 0), 0);
            
            if (newUnreadCount > unreadMessagesCount && newUnreadCount > 0 && soundEnabled) {
                playNotificationSound();
            }
            
            if (unreadMessagesCount !== newUnreadCount) {
                unreadMessagesCount = newUnreadCount;
                updateMessagesButton();
            }
            
            if (messagesModal && messagesModal.style.display === 'flex') {
                displayDialogs(dialogsList);
            }
        }
    } catch (err) {
        console.error('Ошибка загрузки диалогов:', err);
        if (dialogsModalBody && messagesModal && messagesModal.style.display === 'flex') {
            dialogsModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
        }
    }
}

// Отображение списка диалогов
function displayDialogs(dialogs) {
    if (!dialogsModalBody) return;
    
    if (dialogs.length === 0) {
        dialogsModalBody.innerHTML = '<div class="no-friends-modal">У вас пока нет сообщений</div>';
    } else {
        let html = '<div class="modal-friends-grid" id="dialogsGrid">';
        dialogs.forEach(dialog => {
            const isUnread = dialog.unread_count > 0;
            const lastMessage = dialog.last_message || 'Нет сообщений';
            const lastMessageTime = dialog.last_message_time ? new Date(dialog.last_message_time).toLocaleString('ru-RU') : '';
            
            html += `
                <div class="dialog-item ${isUnread ? 'unread' : ''}" data-user-id="${dialog.user_id}">
                    <div class="dialog-avatar" data-user-id="${dialog.user_id}">
                        ${dialog.avatar ? '<img src="' + dialog.avatar + '" style="width:100%; height:100%; object-fit:cover;">' : (dialog.name ? dialog.name.charAt(0).toUpperCase() : '👤')}
                    </div>
                    <div class="dialog-info" data-user-id="${dialog.user_id}">
                        <div class="dialog-name">${escapeHtml(dialog.name || 'Пользователь')}</div>
                        <div class="dialog-last-message">${escapeHtml(lastMessage)}</div>
                    </div>
                    <div class="dialog-time">${lastMessageTime}</div>
                    ${isUnread ? `<div class="dialog-unread-count">${dialog.unread_count}</div>` : ''}
                    <button class="dialog-delete-btn" data-user-id="${dialog.user_id}" title="Удалить диалог">🗑️</button>
                </div>
            `;
        });
        html += '</div>';
        dialogsModalBody.innerHTML = html;
        
        document.querySelectorAll('.dialog-avatar, .dialog-info').forEach(element => {
            element.addEventListener('click', (e) => {
                e.stopPropagation();
                const userId = element.getAttribute('data-user-id');
                if (userId) {
                    openChat(userId);
                }
            });
        });
        
        document.querySelectorAll('.dialog-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = btn.getAttribute('data-user-id');
                await deleteDialog(userId, btn);
            });
        });
        
        const searchInput = document.getElementById('dialogsSearchInput');
        if (searchInput) {
            searchInput.oninput = function() {
                const searchTerm = this.value.toLowerCase().trim();
                const filteredDialogs = dialogsList.filter(dialog => 
                    (dialog.login && dialog.login.toLowerCase().includes(searchTerm)) ||
                    (dialog.name && dialog.name.toLowerCase().includes(searchTerm)) ||
                    dialog.user_id.toString().includes(searchTerm)
                );
                displayDialogs(filteredDialogs);
            };
        }
    }
}

// Открытие чата с пользователем
async function openChat(userId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    initSound();
    
    try {
        if (chatModal) {
            chatModal.innerHTML = `
                <div class="friends-modal-content" style="height: 85vh;">
                    <div class="chat-container">
                        <div class="chat-header">
                            <button class="chat-back-btn" id="chatBackBtn">←</button>
                            <div class="chat-user-info">
                                <div class="chat-user-avatar">👤</div>
                                <div class="chat-user-name">Загрузка...</div>
                            </div>
                        </div>
                        <div class="chat-messages" style="display: flex; justify-content: center; align-items: center;">
                            <div style="text-align: center; color: #E9AE67;">⏳ Загрузка сообщений...</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" class="chat-input" placeholder="Введите сообщение..." maxlength="500" disabled>
                            <button class="chat-send-btn" disabled>📤</button>
                        </div>
                    </div>
                </div>
            `;
            chatModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        const userResponse = await fetch(`/api/user/${userId}`);
        const userData = await userResponse.json();
        
        if (!userData.success || !userData.user) {
            alert('Пользователь не найден');
            closeChatModal();
            return;
        }
        
        currentDialogUser = userData.user;
        currentPage = 1;
        hasMoreMessages = true;
        currentMessages = [];
        
        await loadAllMessages(userId);
        showChatModalWithMessages();
        
    } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
        alert('Не удалось загрузить данные пользователя');
        closeChatModal();
    }
}

// Загрузка ВСЕХ сообщений между пользователями
async function loadAllMessages(otherUserId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    try {
        const response = await fetch(`/api/messages/${currentUserId}/${otherUserId}?limit=1000`);
        const data = await response.json();
        
        if (data.success && data.messages) {
            currentMessages = data.messages;
            hasMoreMessages = false;
            
            await markMessagesAsRead(otherUserId);
            await loadDialogs();
            await loadUnreadCount();
        }
    } catch (err) {
        console.error('Ошибка загрузки сообщений:', err);
    }
}

// Показать модальное окно чата
function showChatModalWithMessages() {
    if (!chatModal || !currentDialogUser) return;
    
    const messagesHtml = buildMessagesHtml(currentMessages);
    
    chatModal.innerHTML = `
        <div class="friends-modal-content" style="height: 85vh;">
            <div class="chat-container">
                <div class="chat-header">
                    <button class="chat-back-btn" id="chatBackBtn">←</button>
                    <div class="chat-user-info" id="chatUserInfo">
                        <div class="chat-user-avatar">
                            ${currentDialogUser.avatar ? '<img src="' + currentDialogUser.avatar + '" style="width:100%; height:100%; object-fit:cover;">' : (currentDialogUser.name ? currentDialogUser.name.charAt(0).toUpperCase() : '👤')}
                        </div>
                        <div class="chat-user-name">${escapeHtml(currentDialogUser.name || 'Пользователь')}</div>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessagesContainer">
                    ${messagesHtml}
                </div>
                <div class="chat-input-area">
                    <input type="text" class="chat-input" id="chatInputField" placeholder="Введите сообщение..." maxlength="500">
                    <button class="chat-send-btn" id="chatSendButton">📤</button>
                </div>
            </div>
        </div>
    `;
    
    chatModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const messagesDiv = document.getElementById('chatMessagesContainer');
    if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    const backBtn = document.getElementById('chatBackBtn');
    const sendBtn = document.getElementById('chatSendButton');
    const chatInput = document.getElementById('chatInputField');
    const chatUserInfo = document.getElementById('chatUserInfo');
    
    if (backBtn) {
        backBtn.addEventListener('click', closeChatModal);
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendMessage());
    }
    
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    if (chatUserInfo) {
        chatUserInfo.addEventListener('click', () => {
            closeChatModal();
            window.location.href = '/user/' + currentDialogUser.id;
        });
    }
    
    document.querySelectorAll('.chat-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const messageId = btn.getAttribute('data-message-id');
            if (confirm('Удалить это сообщение?')) {
                await deleteMessage(messageId);
            }
        });
    });
    
    startMessagesPolling(currentDialogUser.id);
}

function buildMessagesHtml(messages) {
    if (!messages || messages.length === 0) {
        return '<div class="chat-loading-indicator" style="text-align: center; padding: 20px;">💬 Нет сообщений. Напишите первое сообщение!</div>';
    }
    
    let html = '';
    if (messages.length >= 50) {
        html = '<div class="chat-loading-indicator" style="text-align: center; padding: 10px; color: #E9AE67;">📜 Вся история сообщений загружена</div>';
    }
    
    messages.forEach(msg => {
        const isSent = msg.sender_id == localStorage.getItem('currentUserId');
        const time = new Date(msg.created_at).toLocaleString('ru-RU');
        html += `
            <div class="chat-message ${isSent ? 'sent' : 'received'}" data-message-id="${msg.id}">
                <div class="chat-message-text">${escapeHtml(msg.message)}</div>
                <div class="chat-message-footer">
                    <div class="chat-message-time">${time}</div>
                    <button class="chat-delete-btn" data-message-id="${msg.id}" title="Удалить сообщение">🗑️</button>
                </div>
            </div>
        `;
    });
    
    return html;
}

function updateChatMessages() {
    const messagesDiv = document.getElementById('chatMessagesContainer');
    if (!messagesDiv) return;
    
    const shouldScrollToBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < 100;
    const newMessagesHtml = buildMessagesHtml(currentMessages);
    messagesDiv.innerHTML = newMessagesHtml;
    
    if (shouldScrollToBottom) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    document.querySelectorAll('.chat-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const messageId = btn.getAttribute('data-message-id');
            if (confirm('Удалить это сообщение?')) {
                await deleteMessage(messageId);
            }
        });
    });
}

async function deleteMessage(messageId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    try {
        const response = await fetch('/api/delete-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, userId: currentUserId })
        });
        const data = await response.json();
        if (data.success) {
            currentMessages = currentMessages.filter(msg => msg.id != messageId);
            updateChatMessages();
            await loadDialogs();
            await loadUnreadCount();
        } else {
            alert(data.error || 'Ошибка удаления');
        }
    } catch (err) {
        console.error('Ошибка удаления:', err);
        alert('Ошибка удаления сообщения');
    }
}

async function markMessagesAsRead(otherUserId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    try {
        await fetch('/api/mark-messages-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, otherUserId: otherUserId })
        });
    } catch (err) {
        console.error('Ошибка отметки прочитанных:', err);
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInputField');
    const message = input?.value.trim();
    if (!message || !currentDialogUser) return;
    
    const currentUserId = localStorage.getItem('currentUserId');
    
    try {
        const response = await fetch('/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: currentUserId,
                receiverId: currentDialogUser.id,
                message: message
            })
        });
        const data = await response.json();
        if (data.success) {
            input.value = '';
            await loadAllMessages(currentDialogUser.id);
            updateChatMessages();
            await loadDialogs();
            await loadUnreadCount();
            
            const messagesDiv = document.getElementById('chatMessagesContainer');
            if (messagesDiv) {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        }
    } catch (err) {
        console.error('Ошибка отправки:', err);
        alert('Ошибка отправки сообщения');
    }
}

function closeChatModal() {
    if (chatModal) {
        chatModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    stopMessagesPolling();
    currentDialogUser = null;
    currentMessages = [];
}

function startMessagesPolling(otherUserId) {
    if (messagesLoadInterval) clearInterval(messagesLoadInterval);
    messagesLoadInterval = setInterval(async () => {
        if (currentDialogUser && currentDialogUser.id == otherUserId && chatModal && chatModal.style.display === 'flex') {
            const oldMessagesCount = currentMessages.length;
            await loadAllMessages(otherUserId);
            if (oldMessagesCount !== currentMessages.length) {
                updateChatMessages();
            }
        }
    }, 3000);
}

function stopMessagesPolling() {
    if (messagesLoadInterval) {
        clearInterval(messagesLoadInterval);
        messagesLoadInterval = null;
    }
}

async function openMessagesModal() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) {
        window.location.href = '/login.html';
        return;
    }
    
    initSound();
    
    if (messagesModal) {
        addSoundButtonToModal();
        messagesModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        await loadDialogs();
        await loadUnreadCount();
    }
}

function closeMessagesModal() {
    if (messagesModal) {
        messagesModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function openChatWithUser(userId) {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) {
        window.location.href = '/login.html';
        return;
    }
    
    initSound();
    
    try {
        if (chatModal) {
            chatModal.innerHTML = `
                <div class="friends-modal-content" style="height: 85vh;">
                    <div class="chat-container">
                        <div class="chat-header">
                            <button class="chat-back-btn" id="chatBackBtn">←</button>
                            <div class="chat-user-info">
                                <div class="chat-user-avatar">👤</div>
                                <div class="chat-user-name">Загрузка...</div>
                            </div>
                        </div>
                        <div class="chat-messages" style="display: flex; justify-content: center; align-items: center;">
                            <div style="text-align: center; color: #E9AE67;">⏳ Загрузка сообщений...</div>
                        </div>
                        <div class="chat-input-area">
                            <input type="text" class="chat-input" placeholder="Введите сообщение..." maxlength="500" disabled>
                            <button class="chat-send-btn" disabled>📤</button>
                        </div>
                    </div>
                </div>
            `;
            chatModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
        
        const userResponse = await fetch(`/api/user/${userId}`);
        const userData = await userResponse.json();
        
        if (!userData.success || !userData.user) {
            alert('Пользователь не найден');
            closeChatModal();
            return;
        }
        
        currentDialogUser = userData.user;
        currentMessages = [];
        
        await loadAllMessages(userId);
        showChatModalWithMessages();
        
        if (messagesModal && messagesModal.style.display === 'flex') {
            closeMessagesModal();
        }
    } catch (err) {
        console.error('Ошибка загрузки пользователя:', err);
        alert('Не удалось загрузить данные пользователя');
        closeChatModal();
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчик первого касания для инициализации звука на мобильных
function setupMobileSoundInit() {
    const initSoundOnTouch = async () => {
        await initSound();
        document.removeEventListener('touchstart', initSoundOnTouch);
        document.removeEventListener('click', initSoundOnTouch);
        console.log('📱 Звук активирован на мобильном устройстве');
    };
    
    document.addEventListener('touchstart', initSoundOnTouch);
    document.addEventListener('click', initSoundOnTouch);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

loadSoundSetting();
setupMobileSoundInit();

if (messagesBtn) {
    messagesBtn.addEventListener('click', openMessagesModal);
}

if (messagesModalClose) {
    messagesModalClose.addEventListener('click', closeMessagesModal);
}

window.addEventListener('click', function(event) {
    if (event.target === messagesModal) closeMessagesModal();
    if (event.target === chatModal) closeChatModal();
});

if (localStorage.getItem('currentUserId')) {
    console.log('🟢 Запуск обновления счетчика сообщений (каждую 1 секунду)');
    
    loadDialogs();
    loadUnreadCount();
    
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        if (localStorage.getItem('currentUserId')) {
            loadUnreadCount();
        }
    }, 1000);
}

window.openChatWithUser = openChatWithUser;