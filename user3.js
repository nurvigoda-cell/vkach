// user3.js - функции для новостей (таймеры, кнопка "Прочитать")

// ========== НОВОСТИ (только для своей страницы) ==========
const newsBtn = document.getElementById('newsBtn');
const newsModal = document.getElementById('newsModal');
const newsModalClose = document.querySelector('.news-modal-close');
const newsModalBody = document.getElementById('newsModalBody');

// Функция для обновления видимости кнопки новостей
function updateNewsButtonVisibility() {
    if (!newsBtn) return;
    
    // Проверяем, определён ли isOwnProfile и является ли страница своей
    const isOwn = window.isOwnProfile === true;
    const currentUserId = localStorage.getItem('currentUserId');
    const pathUserId = window.location.pathname.split('/').pop();
    const isOwnProfileCheck = (currentUserId && currentUserId === pathUserId);
    
    // Используем window.isOwnProfile если он есть, иначе проверяем сами
    const showNewsBtn = (window.isOwnProfile !== undefined) ? window.isOwnProfile : isOwnProfileCheck;
    
    if (showNewsBtn) {
        newsBtn.style.display = 'flex';
        console.log('🔔 Кнопка новостей видна (свой профиль)');
    } else {
        newsBtn.style.display = 'none';
        console.log('🔔 Кнопка новостей скрыта (чужой профиль)');
    }
}

// Функция для обновления бейджа
function updateNewsBadge(count) {
    if (!newsBtn) return;
    const existingBadge = newsBtn?.querySelector('.news-badge');
    if (existingBadge) existingBadge.remove();
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'news-badge';
        badge.textContent = count > 99 ? '99+' : count;
        newsBtn.appendChild(badge);
        newsBtn.classList.add('active');
    } else {
        newsBtn?.classList.remove('active');
    }
}

// Функция для отметки новости как прочитанной
async function markNewsAsRead(newsId) {
    try {
        const response = await fetch('/api/mark-news-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newsId })
        });
        const data = await response.json();
        return data.success;
    } catch (err) {
        console.error('Ошибка отметки новости:', err);
        return false;
    }
}

// Функция для проверки, истекло ли 24 часа
function isNewsExpired(createdAt) {
    const now = Date.now();
    const createdTime = new Date(createdAt).getTime();
    const expiryTime = createdTime + 24 * 60 * 60 * 1000;
    return now >= expiryTime;
}

// Функция для получения времени до удаления
function getTimeUntilExpiry(createdAt) {
    const now = Date.now();
    const createdTime = new Date(createdAt).getTime();
    const expiryTime = createdTime + 24 * 60 * 60 * 1000;
    const timeLeft = expiryTime - now;
    
    if (timeLeft <= 0) return null;
    
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    
    return `${hours}ч ${minutes}м ${seconds}с`;
}

// Функция для обновления таймеров
function updateTimers() {
    document.querySelectorAll('.news-timer-value').forEach(timerElement => {
        const newsId = timerElement.getAttribute('data-news-id');
        const newsItem = window.newsItems?.find(item => item.id == newsId);
        if (newsItem && !isNewsExpired(newsItem.created_at)) {
            const timeLeft = getTimeUntilExpiry(newsItem.created_at);
            if (timeLeft) {
                timerElement.textContent = timeLeft;
            }
        } else if (newsItem && isNewsExpired(newsItem.created_at)) {
            timerElement.textContent = 'удалена';
            const newsItemElement = document.querySelector(`.news-item[data-news-id="${newsId}"]`);
            if (newsItemElement) {
                newsItemElement.remove();
                window.newsItems = window.newsItems.filter(item => item.id != newsId);
                const remainingUnread = window.newsItems.filter(item => !item.is_read).length;
                updateNewsBadge(remainingUnread);
            }
        }
    });
}

// Запускаем обновление таймеров каждую секунду
let timerInterval = null;

function startTimers() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimers, 1000);
}

function stopTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

async function loadNews() {
    const currentUserId = localStorage.getItem('currentUserId');
    if (!currentUserId) return;
    
    // Загружаем новости только если это своя страница
    const isOwn = window.isOwnProfile === true;
    if (!isOwn) return;
    
    try {
        const response = await fetch(`/api/news/${currentUserId}`);
        const data = await response.json();
        if (data.success && data.news) {
            const validNews = data.news.filter(item => !isNewsExpired(item.created_at));
            window.newsItems = validNews;
            const sortedNews = [...validNews].sort((a, b) => {
                if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            const unreadNews = validNews.filter(n => !n.is_read);
            updateNewsBadge(unreadNews.length);
            displayNews(sortedNews);
            startTimers();
        }
    } catch (err) {
        console.error('Ошибка загрузки новостей:', err);
    }
}

// Обработчик кнопки "Прочитать"
async function handleReadNews(newsId, buttonElement) {
    const success = await markNewsAsRead(newsId);
    if (success) {
        buttonElement.textContent = '✓ Прочитано';
        buttonElement.disabled = true;
        buttonElement.style.backgroundColor = '#666';
        buttonElement.style.cursor = 'default';
        buttonElement.style.opacity = '0.6';
        buttonElement.style.color = '#ccc';
        
        const newsItem = window.newsItems.find(item => item.id == newsId);
        if (newsItem) {
            newsItem.is_read = true;
        }
        
        const remainingUnread = window.newsItems.filter(item => !item.is_read).length;
        updateNewsBadge(remainingUnread);
        
        const sortedNews = [...window.newsItems].sort((a, b) => {
            if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        displayNews(sortedNews);
    }
}

function displayNews(news) {
    if (news.length === 0) {
        newsModalBody.innerHTML = '<div class="no-friends-modal">Пока новостей нет</div>';
    } else {
        let html = '';
        news.forEach(item => {
            const createdAt = new Date(item.created_at);
            const formattedDate = createdAt.toLocaleString('ru-RU');
            const timeLeft = getTimeUntilExpiry(item.created_at);
            const isRead = item.is_read;
            const readButtonText = isRead ? '✓ Прочитано' : '📖 Прочитать';
            const readButtonDisabled = isRead ? 'disabled' : '';
            const readButtonStyle = isRead ? 'background-color: #666; opacity: 0.6; cursor: default; color: #ccc;' : 'background-color: #E9AE67; color: #222;';
            
            html += `
                <div class="modal-friend-item news-item" data-news-id="${item.id}" data-is-read="${isRead}">
                    <div class="modal-friend-avatar" onclick="window.location.href='/user/${item.user_id}'">
                        ${item.avatar ? '<img src="' + item.avatar + '">' : '👤'}
                    </div>
                    <div class="modal-friend-info" style="flex: 2;">
                        <div class="modal-friend-name">${window.escapeHtml(item.user_name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(item.user_login)}</div>
                        <div class="modal-friend-id">ID: ${item.user_id}</div>
                        <div class="news-message" style="margin-top: 8px; font-size: 13px; color: #ddd;">${window.escapeHtml(item.message)}</div>
                        <div class="news-time" style="font-size: 10px; color: #888; margin-top: 5px;">${formattedDate}</div>
                        <div class="news-timer" style="margin-top: 3px;">
                            <span style="font-size: 10px; color: #E9AE67;">⏱️ Удалится через: </span>
                            <span class="news-timer-value" data-news-id="${item.id}" style="font-family: monospace; font-size: 11px; color: #ffaa00;">${timeLeft || '--'}</span>
                        </div>
                    </div>
                    <div class="modal-friend-actions" style="flex-shrink: 0;">
                        <button class="read-news-btn" data-news-id="${item.id}" ${readButtonDisabled} style="padding: 6px 12px; border-radius: 15px; font-size: 11px; cursor: pointer; border: none; ${readButtonStyle}">
                            ${readButtonText}
                        </button>
                    </div>
                </div>
            `;
        });
        newsModalBody.innerHTML = html;
        
        document.querySelectorAll('.read-news-btn').forEach(btn => {
            if (!btn.disabled) {
                const newsId = btn.getAttribute('data-news-id');
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    await handleReadNews(newsId, btn);
                });
            }
        });
        
        updateTimers();
    }
}

async function openNewsModal() {
    // Проверяем, своя ли страница
    const isOwn = window.isOwnProfile === true;
    if (!isOwn) return;
    
    newsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await loadNews();
}

function closeNewsModal() {
    newsModal.style.display = 'none';
    document.body.style.overflow = '';
    stopTimers();
}

// Ждём полной загрузки DOM и определения isOwnProfile
document.addEventListener('DOMContentLoaded', function() {
    // Небольшая задержка, чтобы user1.js успел установить window.isOwnProfile
    setTimeout(function() {
        updateNewsButtonVisibility();
        
        if (newsBtn && window.isOwnProfile === true) {
            newsBtn.addEventListener('click', function() {
                openNewsModal();
            });
            loadNews();
        }
    }, 100);
});

// Также следим за изменением isOwnProfile (на случай если user1.js загрузится позже)
if (window.isOwnProfile !== undefined) {
    updateNewsButtonVisibility();
}

if (newsModalClose) newsModalClose.addEventListener('click', closeNewsModal);
window.addEventListener('click', function(event) {
    if (event.target === newsModal) closeNewsModal();
});

window.loadNews = loadNews;
window.updateNewsButtonVisibility = updateNewsButtonVisibility;