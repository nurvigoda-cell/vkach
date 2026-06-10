// user.js - страница пользователя

document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    const userId = path.split('/').pop();
    const currentUserId = localStorage.getItem('currentUserId');
    
    // Элементы
    const userName = document.getElementById('userName');
    const userBio = document.getElementById('userBio');
    const userCity = document.getElementById('userCity');
    const userPhone = document.getElementById('userPhone');
    const userWebsite = document.getElementById('userWebsite');
    const avatarImg = document.getElementById('avatarImg');
    const avatarText = document.getElementById('avatarText');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const subscribeBtn = document.getElementById('subscribeBtn');
    const friendsCount = document.getElementById('friendsCount');
    const friendsList = document.getElementById('friendsList');
    const followersCount = document.getElementById('followersCount');
    const followersList = document.getElementById('followersList');
    const friendsTitle = document.getElementById('friendsTitle');
    const followersTitle = document.getElementById('followersTitle');
    const userLoginText = document.getElementById('userLoginText');
    const userIdText = document.getElementById('userIdText');
    
    // Модальные окна
    const friendsModal = document.getElementById('friendsModal');
    const modalClose = document.querySelector('.friends-modal-close');
    const friendsModalBody = document.getElementById('friendsModalBody');
    
    const followersModal = document.getElementById('followersModal');
    const followersModalClose = document.querySelector('.followers-modal-close');
    const followersModalBody = document.getElementById('followersModalBody');
    
    const peopleModal = document.getElementById('peopleModal');
    const peopleModalClose = document.querySelector('.people-modal-close');
    const peopleModalBody = document.getElementById('peopleModalBody');
    
    // Переменные для хранения
    let allUsers = [];
    let allFriends = [];
    let allFollowers = [];
    let newsItems = [];
    
    // Определяем, чья это страница
    const isOwnProfile = (currentUserId && currentUserId === userId);
    
    // Открытие модального окна при клике на "Друзья"
    if (friendsTitle) {
        friendsTitle.addEventListener('click', function() {
            openFriendsModal();
        });
        friendsTitle.style.cursor = 'pointer';
    }
    
    // Открытие модального окна при клике на "Подписчики"
    if (followersTitle) {
        followersTitle.addEventListener('click', function() {
            openFollowersModal();
        });
        followersTitle.style.cursor = 'pointer';
    }
    
    async function openFriendsModal() {
        if (!currentUserId) {
            window.location.href = '/login.html';
            return;
        }
        friendsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        const targetUserId = isOwnProfile ? currentUserId : userId;
        await loadFriendsModal(targetUserId);
    }
    
    function closeFriendsModal() {
        friendsModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    async function openFollowersModal() {
        if (!currentUserId) {
            window.location.href = '/login.html';
            return;
        }
        followersModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        await loadFollowersModal();
    }
    
    function closeFollowersModal() {
        followersModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    async function openPeopleModal() {
        if (!currentUserId) {
            window.location.href = '/login.html';
            return;
        }
        peopleModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        await loadPeopleModal();
    }
    
    function closePeopleModal() {
        peopleModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (modalClose) modalClose.addEventListener('click', closeFriendsModal);
    if (followersModalClose) followersModalClose.addEventListener('click', closeFollowersModal);
    if (peopleModalClose) peopleModalClose.addEventListener('click', closePeopleModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === friendsModal) closeFriendsModal();
        if (event.target === followersModal) closeFollowersModal();
        if (event.target === peopleModal) closePeopleModal();
    });
    
    // ========== НОВОСТИ (только для своей страницы) ==========
    const newsBtn = document.getElementById('newsBtn');
    const newsModal = document.getElementById('newsModal');
    const newsModalClose = document.querySelector('.news-modal-close');
    const newsModalBody = document.getElementById('newsModalBody');
    
    // Показываем кнопку новостей только на своей странице
    if (newsBtn && !isOwnProfile) {
        newsBtn.style.display = 'none';
    }
    
    function updateNewsBadge(count) {
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
            const newsItem = newsItems.find(item => item.id == newsId);
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
                    newsItems = newsItems.filter(item => item.id != newsId);
                    const remainingUnread = newsItems.filter(item => !item.is_read).length;
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
        if (!currentUserId || !isOwnProfile) return;
        try {
            const response = await fetch(`/api/news/${currentUserId}`);
            const data = await response.json();
            if (data.success && data.news) {
                const validNews = data.news.filter(item => !isNewsExpired(item.created_at));
                newsItems = validNews;
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
            
            const newsItem = newsItems.find(item => item.id == newsId);
            if (newsItem) {
                newsItem.is_read = true;
            }
            
            const remainingUnread = newsItems.filter(item => !item.is_read).length;
            updateNewsBadge(remainingUnread);
            
            const sortedNews = [...newsItems].sort((a, b) => {
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
                            <div class="modal-friend-name">${escapeHtml(item.user_name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(item.user_login)}</div>
                            <div class="modal-friend-id">ID: ${item.user_id}</div>
                            <div class="news-message" style="margin-top: 8px; font-size: 13px; color: #ddd;">${escapeHtml(item.message)}</div>
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
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async function openNewsModal() {
        if (!isOwnProfile) return;
        newsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        await loadNews();
    }
    
    function closeNewsModal() {
        newsModal.style.display = 'none';
        document.body.style.overflow = '';
        stopTimers();
    }
    
    if (newsModalClose) newsModalClose.addEventListener('click', closeNewsModal);
    window.addEventListener('click', function(event) {
        if (event.target === newsModal) closeNewsModal();
    });
    
    if (newsBtn && isOwnProfile) {
        newsBtn.addEventListener('click', function() {
            openNewsModal();
        });
        loadNews();
    }
    
    async function loadFollowersModal() {
        if (!userId) return;
        try {
            const response = await fetch(`/api/followers/${userId}`);
            const data = await response.json();
            if (data.success && data.followers) {
                allFollowers = data.followers;
                displayFollowersInModal(allFollowers);
            }
        } catch (err) {
            console.error('Ошибка загрузки подписчиков:', err);
            followersModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
        }
    }
    
    function displayFollowersInModal(followers) {
        if (followers.length === 0) {
            followersModalBody.innerHTML = '<div class="no-friends-modal">У этого пользователя пока нет подписчиков</div>';
        } else {
            let html = '<div class="modal-search"><input type="text" id="followersSearchInput" class="modal-search-input" placeholder="Поиск по имени, логину или ID..."></div>';
            html += '<div class="modal-friends-grid" id="followersGrid">';
            followers.forEach(follower => {
                html += `
                    <div class="modal-friend-item" data-follower-id="${follower.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${follower.id}'">
                            ${follower.avatar ? '<img src="' + follower.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${follower.id}'">
                            <div class="modal-friend-name">${escapeHtml(follower.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(follower.login || follower.name)}</div>
                            <div class="modal-friend-id">ID: ${follower.id}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            followersModalBody.innerHTML = html;
            
            const searchInput = document.getElementById('followersSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    const filteredFollowers = allFollowers.filter(follower => 
                        follower.login.toLowerCase().includes(searchTerm) || 
                        follower.name.toLowerCase().includes(searchTerm) ||
                        follower.id.toString().includes(searchTerm)
                    );
                    updateFollowersGrid(filteredFollowers);
                });
            }
        }
    }
    
    function updateFollowersGrid(followers) {
        const grid = document.getElementById('followersGrid');
        if (!grid) return;
        
        if (followers.length === 0) {
            grid.innerHTML = '<div class="no-friends-modal">Нет подписчиков</div>';
        } else {
            let html = '';
            followers.forEach(follower => {
                html += `
                    <div class="modal-friend-item" data-follower-id="${follower.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${follower.id}'">
                            ${follower.avatar ? '<img src="' + follower.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${follower.id}'">
                            <div class="modal-friend-name">${escapeHtml(follower.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(follower.login || follower.name)}</div>
                            <div class="modal-friend-id">ID: ${follower.id}</div>
                        </div>
                    </div>
                `;
            });
            grid.innerHTML = html;
        }
    }
    
    async function loadFriendsModal(targetUserId) {
        if (!targetUserId) return;
        try {
            const response = await fetch(`/api/friends/${targetUserId}`);
            const data = await response.json();
            if (data.success && data.friends) {
                allFriends = data.friends;
                displayFriendsInModal(allFriends);
            }
        } catch (err) {
            console.error('Ошибка загрузки друзей:', err);
            friendsModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
        }
    }
    
    function displayFriendsInModal(friends) {
        if (friends.length === 0) {
            friendsModalBody.innerHTML = '<div class="no-friends-modal">У этого пользователя пока нет друзей</div>';
        } else {
            let html = '<div class="modal-search"><input type="text" id="friendsSearchInput" class="modal-search-input" placeholder="Поиск по имени, логину или ID..."></div>';
            html += '<div class="modal-friends-grid" id="friendsGrid">';
            friends.forEach(friend => {
                html += `
                    <div class="modal-friend-item" data-friend-id="${friend.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${friend.id}'">
                            ${friend.avatar ? '<img src="' + friend.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${friend.id}'">
                            <div class="modal-friend-name">${escapeHtml(friend.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(friend.login || friend.name)}</div>
                            <div class="modal-friend-id">ID: ${friend.id}</div>
                        </div>
                        ${isOwnProfile ? `
                        <div class="modal-friend-actions">
                            <button class="modal-friend-unsubscribe" data-id="${friend.id}">Отписаться</button>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            html += '</div>';
            friendsModalBody.innerHTML = html;
            
            const searchInput = document.getElementById('friendsSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    const filteredFriends = allFriends.filter(friend => 
                        friend.login.toLowerCase().includes(searchTerm) || 
                        friend.name.toLowerCase().includes(searchTerm) ||
                        friend.id.toString().includes(searchTerm)
                    );
                    updateFriendsGrid(filteredFriends);
                });
            }
            
            if (isOwnProfile) {
                document.querySelectorAll('.modal-friend-unsubscribe').forEach(btn => {
                    btn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        const friendId = this.getAttribute('data-id');
                        await unsubscribeFriend(friendId);
                    });
                });
            }
        }
    }
    
    function updateFriendsGrid(friends) {
        const grid = document.getElementById('friendsGrid');
        if (!grid) return;
        
        if (friends.length === 0) {
            grid.innerHTML = '<div class="no-friends-modal">Нет друзей</div>';
        } else {
            let html = '';
            friends.forEach(friend => {
                html += `
                    <div class="modal-friend-item" data-friend-id="${friend.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${friend.id}'">
                            ${friend.avatar ? '<img src="' + friend.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${friend.id}'">
                            <div class="modal-friend-name">${escapeHtml(friend.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(friend.login || friend.name)}</div>
                            <div class="modal-friend-id">ID: ${friend.id}</div>
                        </div>
                        ${isOwnProfile ? `
                        <div class="modal-friend-actions">
                            <button class="modal-friend-unsubscribe" data-id="${friend.id}">Отписаться</button>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            grid.innerHTML = html;
            
            if (isOwnProfile) {
                document.querySelectorAll('.modal-friend-unsubscribe').forEach(btn => {
                    btn.addEventListener('click', async function(e) {
                        e.stopPropagation();
                        const friendId = this.getAttribute('data-id');
                        await unsubscribeFriend(friendId);
                    });
                });
            }
        }
    }
    
    async function loadPeopleModal() {
        if (!currentUserId) return;
        try {
            const response = await fetch(`/api/users-except-friends/${currentUserId}`);
            const data = await response.json();
            if (data.success && data.users) {
                allUsers = data.users;
                displayUsers(allUsers);
            }
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            peopleModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
        }
    }
    
    function displayUsers(users) {
        if (users.length === 0) {
            peopleModalBody.innerHTML = '<div class="no-friends-modal">Нет пользователей</div>';
        } else {
            let html = '<div class="modal-search"><input type="text" id="peopleSearchInput" class="modal-search-input" placeholder="Поиск по имени, логину или ID..."></div>';
            html += '<div class="modal-friends-grid" id="peopleGrid">';
            users.forEach(user => {
                html += `
                    <div class="modal-friend-item" data-user-id="${user.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${user.id}'">
                            ${user.avatar ? '<img src="' + user.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${user.id}'">
                            <div class="modal-friend-name">${escapeHtml(user.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(user.login)}</div>
                            <div class="modal-friend-id">ID: ${user.id}</div>
                        </div>
                        <div class="modal-friend-actions">
                            <button class="modal-friend-subscribe" data-id="${user.id}">Подписаться</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            peopleModalBody.innerHTML = html;
            
            const searchInput = document.getElementById('peopleSearchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    const filteredUsers = allUsers.filter(user => 
                        user.login.toLowerCase().includes(searchTerm) || 
                        user.name.toLowerCase().includes(searchTerm) ||
                        user.id.toString().includes(searchTerm)
                    );
                    updatePeopleGrid(filteredUsers);
                });
            }
            
            document.querySelectorAll('.modal-friend-subscribe').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const friendId = this.getAttribute('data-id');
                    await subscribeFromPeopleModal(friendId);
                });
            });
        }
    }
    
    function updatePeopleGrid(users) {
        const grid = document.getElementById('peopleGrid');
        if (!grid) return;
        
        if (users.length === 0) {
            grid.innerHTML = '<div class="no-friends-modal">Нет пользователей</div>';
        } else {
            let html = '';
            users.forEach(user => {
                html += `
                    <div class="modal-friend-item" data-user-id="${user.id}">
                        <div class="modal-friend-avatar" onclick="window.location.href='/user/${user.id}'">
                            ${user.avatar ? '<img src="' + user.avatar + '">' : '👤'}
                        </div>
                        <div class="modal-friend-info" onclick="window.location.href='/user/${user.id}'">
                            <div class="modal-friend-name">${escapeHtml(user.name)}</div>
                            <div class="modal-friend-login">@${escapeHtml(user.login)}</div>
                            <div class="modal-friend-id">ID: ${user.id}</div>
                        </div>
                        <div class="modal-friend-actions">
                            <button class="modal-friend-subscribe" data-id="${user.id}">Подписаться</button>
                        </div>
                    </div>
                `;
            });
            grid.innerHTML = html;
            
            document.querySelectorAll('.modal-friend-subscribe').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const friendId = this.getAttribute('data-id');
                    await subscribeFromPeopleModal(friendId);
                });
            });
        }
    }
    
    async function subscribeFromPeopleModal(friendId) {
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, friendId: friendId })
            });
            const data = await response.json();
            if (data.success) {
                await loadPeopleModal();
                await loadFriendsForUser(isOwnProfile ? currentUserId : userId);
                await loadFollowers();
                await loadNews();
                if (window.location.pathname === '/user/' + friendId) {
                    const subBtn = document.getElementById('subscribeBtn');
                    if (subBtn) {
                        subBtn.textContent = '✅ Подписан';
                        subBtn.style.backgroundColor = '#4CAF50';
                        subBtn.style.borderColor = '#4CAF50';
                        subBtn.style.color = 'white';
                    }
                }
            } else {
                alert(data.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка подключения к серверу');
        }
    }
    
    async function unsubscribeFriend(friendId) {
        try {
            const response = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, friendId: friendId })
            });
            const data = await response.json();
            if (data.success) {
                await loadFriendsModal(currentUserId);
                await loadFriendsForUser(currentUserId);
                await loadFollowers();
                if (window.location.pathname === '/user/' + friendId) {
                    const subBtn = document.getElementById('subscribeBtn');
                    if (subBtn) {
                        subBtn.textContent = '🔔 Подписаться';
                        subBtn.style.backgroundColor = 'transparent';
                        subBtn.style.borderColor = '#E9AE67';
                        subBtn.style.color = '#E9AE67';
                    }
                }
            } else {
                alert(data.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка подключения к серверу');
        }
    }
    
    async function loadFollowers() {
        if (!userId) return;
        try {
            const response = await fetch(`/api/followers/${userId}`);
            const data = await response.json();
            if (data.success && data.followers) {
                const followers = data.followers;
                if (followersCount) followersCount.textContent = followers.length;
                
                if (followersList) {
                    followersList.innerHTML = '';
                    if (followers.length === 0) {
                        followersList.innerHTML = '<div class="no-data">Нет подписчиков</div>';
                    } else {
                        const displayFollowers = followers.slice(0, 4);
                        displayFollowers.forEach(follower => {
                            const followerItem = document.createElement('div');
                            followerItem.className = 'follower-item';
                            followerItem.onclick = () => {
                                window.location.href = '/user/' + follower.id;
                            };
                            followerItem.innerHTML = `
                                <div class="follower-avatar">${follower.avatar ? '<img src="' + follower.avatar + '">' : '👤'}</div>
                                <div class="follower-name">${escapeHtml(follower.name)}</div>
                            `;
                            followersList.appendChild(followerItem);
                        });
                        if (followers.length > 4) {
                            const moreItem = document.createElement('div');
                            moreItem.className = 'follower-item';
                            moreItem.innerHTML = `<div class="follower-avatar">+${followers.length - 4}</div><div class="follower-name">ещё</div>`;
                            moreItem.onclick = () => openFollowersModal();
                            followersList.appendChild(moreItem);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Ошибка загрузки подписчиков:', err);
        }
    }
    
    async function loadFriendsForUser(targetUserId) {
        if (!targetUserId) return;
        try {
            const response = await fetch(`/api/friends/${targetUserId}`);
            const data = await response.json();
            if (data.success && data.friends) {
                const friends = data.friends;
                if (friendsCount) friendsCount.textContent = friends.length;
                
                if (friendsList) {
                    friendsList.innerHTML = '';
                    if (friends.length === 0) {
                        friendsList.innerHTML = '<div class="no-data">Нет друзей</div>';
                    } else {
                        const displayFriends = friends.slice(0, 4);
                        displayFriends.forEach(friend => {
                            const friendItem = document.createElement('div');
                            friendItem.className = 'friend-item';
                            friendItem.onclick = () => {
                                window.location.href = '/user/' + friend.id;
                            };
                            friendItem.innerHTML = `
                                <div class="friend-avatar">${friend.avatar ? '<img src="' + friend.avatar + '">' : '👤'}</div>
                                <div class="friend-name">${escapeHtml(friend.name)}</div>
                            `;
                            friendsList.appendChild(friendItem);
                        });
                        if (friends.length > 4) {
                            const moreItem = document.createElement('div');
                            moreItem.className = 'friend-item';
                            moreItem.innerHTML = `<div class="friend-avatar">+${friends.length - 4}</div><div class="friend-name">ещё</div>`;
                            moreItem.onclick = () => openFriendsModal();
                            friendsList.appendChild(moreItem);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Ошибка загрузки друзей:', err);
        }
    }
    
    async function checkSubscription() {
        if (!currentUserId || currentUserId === userId) return;
        try {
            const response = await fetch(`/api/is-subscribed/${currentUserId}/${userId}`);
            const data = await response.json();
            if (data.subscribed) {
                subscribeBtn.textContent = '✅ Подписан';
                subscribeBtn.style.backgroundColor = '#4CAF50';
                subscribeBtn.style.borderColor = '#4CAF50';
                subscribeBtn.style.color = 'white';
            } else {
                subscribeBtn.textContent = '🔔 Подписаться';
                subscribeBtn.style.backgroundColor = 'transparent';
                subscribeBtn.style.borderColor = '#E9AE67';
                subscribeBtn.style.color = '#E9AE67';
                subscribeBtn.disabled = false;
            }
        } catch (err) {
            console.error('Ошибка проверки подписки:', err);
        }
    }
    
    // Обработчики кнопок
    if (editProfileBtn && subscribeBtn) {
        if (isOwnProfile) {
            editProfileBtn.style.display = 'inline-block';
            subscribeBtn.style.display = 'none';
            editProfileBtn.addEventListener('click', function() {
                window.location.href = '/edit.html?user=' + userId;
            });
            await loadFriendsForUser(userId);
            await loadFollowers();
        } else if (currentUserId) {
            editProfileBtn.style.display = 'none';
            subscribeBtn.style.display = 'inline-block';
            
            subscribeBtn.addEventListener('click', async function() {
                const isSubscribed = subscribeBtn.textContent === '✅ Подписан';
                try {
                    let response;
                    if (isSubscribed) {
                        response = await fetch('/api/unsubscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUserId, friendId: userId })
                        });
                    } else {
                        response = await fetch('/api/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: currentUserId, friendId: userId })
                        });
                    }
                    const data = await response.json();
                    if (data.success) {
                        if (isSubscribed) {
                            subscribeBtn.textContent = '🔔 Подписаться';
                            subscribeBtn.style.backgroundColor = 'transparent';
                            subscribeBtn.style.borderColor = '#E9AE67';
                            subscribeBtn.style.color = '#E9AE67';
                        } else {
                            subscribeBtn.textContent = '✅ Подписан';
                            subscribeBtn.style.backgroundColor = '#4CAF50';
                            subscribeBtn.style.borderColor = '#4CAF50';
                            subscribeBtn.style.color = 'white';
                        }
                        await loadFriendsForUser(userId);
                        await loadFollowers();
                        await loadNews();
                    }
                } catch (err) {
                    alert('Ошибка подключения к серверу');
                }
            });
            await checkSubscription();
            await loadFriendsForUser(userId);
            await loadFollowers();
        } else {
            editProfileBtn.style.display = 'none';
            subscribeBtn.style.display = 'inline-block';
            subscribeBtn.addEventListener('click', function() {
                window.location.href = '/login.html';
            });
            await loadFriendsForUser(userId);
            await loadFollowers();
        }
    }
    
    // Загрузка данных пользователя
    try {
        const response = await fetch(`/api/user/${userId}`);
        const data = await response.json();
        if (data.success && data.user) {
            const user = data.user;
            userName.textContent = user.name || 'Пользователь';
            userBio.textContent = user.bio || 'Информация о себе...';
            userCity.textContent = user.city || 'Не указан';
            userPhone.textContent = user.phone || 'Не указан';
            userWebsite.textContent = user.website || 'Не указан';
            
            if (userLoginText) {
                userLoginText.textContent = `Логин: ${user.login}`;
            }
            if (userIdText) {
                userIdText.textContent = `ID: ${user.id}`;
            }
            
            if (user.avatar) {
                avatarImg.src = user.avatar;
                avatarImg.style.display = 'block';
                avatarText.style.display = 'none';
            } else {
                avatarText.textContent = (user.name || 'П').charAt(0).toUpperCase();
                avatarText.style.display = 'flex';
                avatarImg.style.display = 'none';
            }
        } else {
            userName.textContent = 'Гость';
            userBio.textContent = 'Пользователь не найден';
            userCity.textContent = 'Не указан';
            userPhone.textContent = 'Не указан';
            userWebsite.textContent = 'Не указан';
            avatarText.textContent = '👤';
            avatarText.style.display = 'flex';
            avatarImg.style.display = 'none';
            if (userLoginText) userLoginText.textContent = '';
            if (userIdText) userIdText.textContent = '';
        }
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        userName.textContent = 'Ошибка';
        userBio.textContent = 'Не удалось загрузить данные';
    }
    
    // Нижняя навигация
    const navProfileBottom = document.getElementById('navProfileBottom');
    const navFriendsBottom = document.getElementById('navFriendsBottom');
    const navFollowersBottom = document.getElementById('navFollowersBottom');
    const navPeopleBottom = document.getElementById('navPeopleBottom');
    
    if (navProfileBottom) {
        navProfileBottom.addEventListener('click', function() {
            if (currentUserId) {
                window.location.href = '/user/' + currentUserId;
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navFriendsBottom) {
        navFriendsBottom.addEventListener('click', function() {
            if (currentUserId) {
                openFriendsModal();
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navFollowersBottom) {
        navFollowersBottom.addEventListener('click', function() {
            if (currentUserId) {
                openFollowersModal();
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navPeopleBottom) {
        navPeopleBottom.addEventListener('click', function() {
            openPeopleModal();
        });
    }
});