// user1.js - инициализация, переменные, загрузка профиля, друзей, подписчиков

document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    const userId = path.split('/').pop();
    const currentUserId = localStorage.getItem('currentUserId');
    
    // Элементы
    window.userName = document.getElementById('userName');
    window.userBio = document.getElementById('userBio');
    window.userCity = document.getElementById('userCity');
    window.userPhone = document.getElementById('userPhone');
    window.userWebsite = document.getElementById('userWebsite');
    window.avatarImg = document.getElementById('avatarImg');
    window.avatarText = document.getElementById('avatarText');
    window.editProfileBtn = document.getElementById('editProfileBtn');
    window.subscribeBtn = document.getElementById('subscribeBtn');
    window.friendsCount = document.getElementById('friendsCount');
    window.friendsList = document.getElementById('friendsList');
    window.followersCount = document.getElementById('followersCount');
    window.followersList = document.getElementById('followersList');
    window.friendsTitle = document.getElementById('friendsTitle');
    window.followersTitle = document.getElementById('followersTitle');

    // Форматирование чисел: 1000→1K, 10000→10K, 1000000→1M
    function formatCount(n) {
        n = parseInt(n) || 0;
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'M';
        if (n >= 10000)   return Math.floor(n / 1000) + 'K';
        if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0','') + 'K';
        return String(n);
    }
    window.formatCount = formatCount;
    window.userLoginText = document.getElementById('userLoginText');
    window.userIdText = document.getElementById('userIdText');
    window.userTypeDisplay = document.getElementById('userTypeDisplay');
    
    
    // Переменные для хранения
    window.allUsers = [];
    window.allFriends = [];
    window.allFollowers = [];
    window.newsItems = [];
    
    // Определяем, чья это страница
    window.isOwnProfile = (currentUserId && currentUserId === userId);
    window.userId = userId;
    window.currentUserId = currentUserId;
    
    // ========== ФУНКЦИИ ДЛЯ БЛОКОВ (iPhone-стиль) ==========
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Загрузка блоков пользователя с учётом видимости
    function getBlockUrl(blockId) {
        const urls = {
            'workout-protocols':   '/protocols.html',
            'supertimer':          '/timer.html',
            'funtikg':             '/blocks/funtikg/index.html',
            'bzhu':                '/blocks/bzhu/index.html',
            'injection-tracker':   '/blocks/injection-tracker/index.html',
            'planner':             '/blocks/planner/index.html',
        };
        return urls[blockId] || '#';
    }


    function setupBlocksDrag(uid) {
        const grid = document.getElementById('blocksGrid');
        if (!grid) return;

        grid.querySelectorAll('.user-block-card').forEach(function(c) {
            c.removeAttribute('draggable');
            c.style.userSelect = 'none';
            c.style.webkitUserSelect = 'none';
        });

        var dragItem  = null;
        var dragOver  = null;
        var holdTimer = null;
        var active    = false;
        var ghost     = null;
        var startX = 0, startY = 0;

        var HOLD_MS  = 350;
        var MOVE_THR = 6;

        // ── GHOST ИКОНКА ──
        function createGhost(card, x, y) {
            var iconWrap = card.querySelector('.user-block-icon-wrapper');
            if (!iconWrap) return;
            ghost = iconWrap.cloneNode(true);
            var size = iconWrap.offsetWidth || 56;
            ghost.style.cssText = [
                'position:fixed',
                'pointer-events:none',
                'z-index:99999',
                'width:' + size + 'px',
                'height:' + size + 'px',
                'border-radius:16px',
                'opacity:0.85',
                'transform:scale(1.18)',
                'box-shadow:0 8px 28px rgba(0,0,0,0.6)',
                'left:' + (x - size/2) + 'px',
                'top:'  + (y - size/2) + 'px'
            ].join(';');
            ghost.classList.add('drag-ghost-icon');
            document.body.appendChild(ghost);
        }

        function moveGhost(x, y) {
            if (!ghost) return;
            var size = parseFloat(ghost.style.width) || 56;
            ghost.style.left = (x - size/2) + 'px';
            ghost.style.top  = (y - size/2) + 'px';
        }

        function removeGhost() {
            document.querySelectorAll('.drag-ghost-icon').forEach(function(el){ el.remove(); });
            ghost = null;
        }

        function cardAt(x, y) {
            if (ghost) ghost.style.display = 'none';
            if (dragItem) dragItem.style.visibility = 'hidden';
            var el = document.elementFromPoint(x, y);
            if (dragItem) dragItem.style.visibility = '';
            if (ghost) ghost.style.display = '';
            return el ? el.closest('.user-block-card') : null;
        }

        function highlight(card) {
            grid.querySelectorAll('.user-block-card').forEach(function(c){ c.classList.remove('drag-over'); });
            if (card && card !== dragItem) { card.classList.add('drag-over'); dragOver = card; }
            else dragOver = null;
        }

        function startDrag(card, x, y) {
            active = true;
            dragItem = card;
            card.classList.add('dragging');
            grid.classList.add('drag-mode');
            createGhost(card, x, y);
            if (navigator.vibrate) navigator.vibrate(30);
        }

        function doSwap() {
            _lastDragEnd = Date.now();
            if (!dragItem || !dragOver) return;
            var cards = [...grid.querySelectorAll('.user-block-card')];
            var si = cards.indexOf(dragItem), ti = cards.indexOf(dragOver);
            if (si === ti || si < 0 || ti < 0) return;
            if (si < ti) grid.insertBefore(dragItem, dragOver.nextSibling);
            else         grid.insertBefore(dragItem, dragOver);
            saveBlocksOrder(uid);
        }

        function cleanup() {
            clearTimeout(holdTimer); holdTimer = null;
            active = false;
            removeGhost();
            if (dragItem) {
                dragItem.classList.remove('dragging');
                dragItem.style.visibility = '';
                dragItem = null;
            }
            dragOver = null;
            grid.classList.remove('drag-mode');
            grid.querySelectorAll('.user-block-card').forEach(function(c){ c.classList.remove('drag-over'); });
        }

        // ── TOUCH (мобильные) ──
        // Используем touch events напрямую — надёжнее pointer events на Android/iOS
        grid.addEventListener('touchstart', function(e) {
            var card = e.target.closest('.user-block-card');
            if (!card) return;
            // preventDefault убирает контекстное меню Android на long-press изображения
            e.preventDefault();
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            clearTimeout(holdTimer);
            var _card = card;
            holdTimer = setTimeout(function() {
                var ps = grid.closest('.phone-screen');
                if (ps) ps.style.overflowY = 'hidden';
                startDrag(_card, startX, startY);
            }, HOLD_MS);
        }, { passive: false });

        grid.addEventListener('touchmove', function(e) {
            var t = e.touches[0];
            if (!active) {
                // Если сдвинулись — отменяем hold
                if (Math.abs(t.clientX - startX) > MOVE_THR || Math.abs(t.clientY - startY) > MOVE_THR) {
                    clearTimeout(holdTimer); holdTimer = null;
                }
                return;
            }
            e.preventDefault(); // блокируем скролл только при активном drag
            moveGhost(t.clientX, t.clientY);
            highlight(cardAt(t.clientX, t.clientY));
        }, { passive: false });

        grid.addEventListener('touchend', function(e) {
            clearTimeout(holdTimer); holdTimer = null;
            var ps = grid.closest('.phone-screen');
            if (ps) ps.style.overflowY = '';
            if (!active) return;
            var t = e.changedTouches[0];
            doSwap();
            cleanup();
        }, { passive: true });

        grid.addEventListener('touchcancel', function() {
            clearTimeout(holdTimer); holdTimer = null;
            var ps = grid.closest('.phone-screen');
            if (ps) ps.style.overflowY = '';
            cleanup();
        }, { passive: true });

        // ── MOUSE (десктоп) ──
        var mouseDown = false, mouseCard = null;

        grid.addEventListener('mousedown', function(e) {
            var card = e.target.closest('.user-block-card');
            if (!card) return;
            mouseDown = true; mouseCard = card;
            startX = e.clientX; startY = e.clientY;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(function() {
                startDrag(card, startX, startY);
            }, HOLD_MS);
        });

        document.addEventListener('mousemove', function(e) {
            if (!mouseDown) return;
            if (!active) {
                if (Math.abs(e.clientX - startX) > MOVE_THR || Math.abs(e.clientY - startY) > MOVE_THR) {
                    if (mouseCard) startDrag(mouseCard, e.clientX, e.clientY);
                    mouseCard = null;
                }
            }
            if (active) {
                moveGhost(e.clientX, e.clientY);
                highlight(cardAt(e.clientX, e.clientY));
            }
        });

        document.addEventListener('mouseup', function(e) {
            mouseDown = false; mouseCard = null;
            clearTimeout(holdTimer); holdTimer = null;
            if (active) doSwap();
            cleanup();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && active) cleanup();
        });

        document.addEventListener('visibilitychange', function() {
            if (document.hidden && active) cleanup();
        });
    }

        function saveBlocksOrder(uid) {
        const grid = document.getElementById('blocksGrid');
        if (!grid) return;
        const order = [...grid.querySelectorAll('.user-block-card')].map(c => c.dataset.blockId);
        // Сохраняем в базу данных
        fetch('/api/user-blocks/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, order })
        }).catch(err => console.error('Ошибка сохранения порядка:', err));
    }
    // window.loadUserBlocks = loadUserBlocks;
    window.escapeHtml = escapeHtml;
    
    // ========== ОСТАЛЬНЫЕ ФУНКЦИИ ==========
    
    if (window.friendsTitle) {
        window.friendsTitle.addEventListener('click', function() {
            window.openFriendsModal && window.openFriendsModal();
        });
        window.friendsTitle.style.cursor = 'pointer';
    }
    // Клик на цифру подписок
    if (window.friendsCount) {
        window.friendsCount.addEventListener('click', function() {
            window.openFriendsModal && window.openFriendsModal();
        });
        window.friendsCount.style.cursor = 'pointer';
    }
    // Клик на весь блок подписок
    const friendsStatItem = document.querySelector('.follow-stats-row .follow-stat-item:last-child');
    if (friendsStatItem) {
        friendsStatItem.addEventListener('click', function() {
            window.openFriendsModal && window.openFriendsModal();
        });
        friendsStatItem.style.cursor = 'pointer';
    }

    if (window.followersTitle) {
        window.followersTitle.addEventListener('click', function() {
            window.openFollowersModal && window.openFollowersModal();
        });
        window.followersTitle.style.cursor = 'pointer';
    }
    // Клик на цифру подписчиков
    if (window.followersCount) {
        window.followersCount.addEventListener('click', function() {
            window.openFollowersModal && window.openFollowersModal();
        });
        window.followersCount.style.cursor = 'pointer';
    }
    // Клик на весь блок подписчиков
    const followersStatItem = document.querySelector('.follow-stats-row .follow-stat-item:first-child');
    if (followersStatItem) {
        followersStatItem.addEventListener('click', function() {
            window.openFollowersModal && window.openFollowersModal();
        });
        followersStatItem.style.cursor = 'pointer';
    }
    
    async function loadFollowers() {
        if (!window.userId) return;
        try {
            const response = await fetch(`/api/followers/${window.userId}`);
            const data = await response.json();
            if (data.success && data.followers) {
                const followers = data.followers;
                if (window.followersCount) window.followersCount.textContent = formatCount(followers.length);
                
                if (window.followersList) {
                    window.followersList.innerHTML = '';
                    if (followers.length === 0) {
                        window.followersList.innerHTML = '<div class="no-data">Нет подписчиков</div>';
                    } else {
                        const displayFollowers = followers.slice(0, 3);
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
                            window.followersList.appendChild(followerItem);
                        });
                        if (followers.length > 3) {
                            const moreItem = document.createElement('div');
                            moreItem.className = 'follower-item';
                            moreItem.innerHTML = `<div class="follower-avatar">+${followers.length - 3}</div><div class="follower-name">ещё</div>`;
                            moreItem.onclick = () => window.openFollowersModal && window.openFollowersModal();
                            window.followersList.appendChild(moreItem);
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
                if (window.friendsCount) window.friendsCount.textContent = formatCount(friends.length);
                
                if (window.friendsList) {
                    window.friendsList.innerHTML = '';
                    if (friends.length === 0) {
                        window.friendsList.innerHTML = '<div class="no-data">Нет подписок</div>';
                    } else {
                        const displayFriends = friends.slice(0, 3);
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
                            window.friendsList.appendChild(friendItem);
                        });
                        if (friends.length > 3) {
                            const moreItem = document.createElement('div');
                            moreItem.className = 'friend-item';
                            moreItem.innerHTML = `<div class="friend-avatar">+${friends.length - 3}</div><div class="friend-name">ещё</div>`;
                            moreItem.onclick = () => window.openFriendsModal && window.openFriendsModal();
                            window.friendsList.appendChild(moreItem);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Ошибка загрузки подписок:', err);
        }
    }
    
    window.loadFriendsForUser = loadFriendsForUser;
    window.loadFollowers = loadFollowers;
    
    async function checkSubscription() {
        if (!window.currentUserId || window.currentUserId === window.userId) return;
        try {
            const response = await fetch(`/api/is-subscribed/${window.currentUserId}/${window.userId}`);
            const data = await response.json();
            
            const reverseResponse = await fetch(`/api/is-subscribed/${window.userId}/${window.currentUserId}`);
            const reverseData = await reverseResponse.json();
            
            const isSubscribed = data.subscribed;
            const isSubscribedBack = reverseData.subscribed;
            
            if (isSubscribed && isSubscribedBack) {
                window.subscribeBtn.textContent = '✅ Подписан';
                window.subscribeBtn.style.backgroundColor = '#4CAF50';
                window.subscribeBtn.style.borderColor = '#4CAF50';
                window.subscribeBtn.style.color = 'white';
            } else if (isSubscribedBack && !isSubscribed) {
                window.subscribeBtn.textContent = '🔄 Подписаться в ответ';
                window.subscribeBtn.style.backgroundColor = '#E9AE67';
                window.subscribeBtn.style.borderColor = '#E9AE67';
                window.subscribeBtn.style.color = '#222';
            } else if (isSubscribed) {
                window.subscribeBtn.textContent = '✅ Подписан';
                window.subscribeBtn.style.backgroundColor = '#4CAF50';
                window.subscribeBtn.style.borderColor = '#4CAF50';
                window.subscribeBtn.style.color = 'white';
            } else {
                window.subscribeBtn.textContent = '🔔 Подписаться';
                window.subscribeBtn.style.backgroundColor = 'transparent';
                window.subscribeBtn.style.borderColor = '#E9AE67';
                window.subscribeBtn.style.color = '#E9AE67';
            }
            window.subscribeBtn.disabled = false;
        } catch (err) {
            console.error('Ошибка проверки подписки:', err);
        }
    }
    
    async function subscribeFromPeopleModal(friendId) {
        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: window.currentUserId, friendId: friendId })
            });
            const data = await response.json();
            if (data.success) {
                await loadPeopleModal();
                await loadFriendsForUser(window.isOwnProfile ? window.currentUserId : window.userId);
                await loadFollowers();
                if (typeof loadNews === 'function') await loadNews();
                if (window.location.pathname === '/user/' + friendId) {
                    await checkSubscription();
                }
            } else {
                alert(data.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка подключения к серверу');
        }
    }
    
    window.subscribeFromPeopleModal = subscribeFromPeopleModal;
    
    async function unsubscribeFriend(friendId) {
        try {
            const response = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: window.currentUserId, friendId: friendId })
            });
            const data = await response.json();
            if (data.success) {
                await loadFriendsModal(window.currentUserId);
                await loadFriendsForUser(window.currentUserId);
                await loadFollowers();
                if (window.location.pathname === '/user/' + friendId) {
                    await checkSubscription();
                }
            } else {
                alert(data.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка подключения к серверу');
        }
    }
    
    window.unsubscribeFriend = unsubscribeFriend;
    
    // Обработчики кнопок
    const writeMessageBtn = document.getElementById('writeMessageBtn');
    const writeStatDivider = document.getElementById('writeStatDivider');

    if (window.editProfileBtn && window.subscribeBtn) {
        if (window.isOwnProfile) {
            window.editProfileBtn.style.display = 'inline-block';
            window.subscribeBtn.style.display = 'none';
            if (writeMessageBtn) writeMessageBtn.style.display = 'none';
            if (writeStatDivider) writeStatDivider.style.display = 'none';
            window.editProfileBtn.addEventListener('click', function() {
                window.location.href = '/edit.html?user=' + window.userId;
            });
            await loadFriendsForUser(window.userId);
            await loadFollowers();
        } else if (window.currentUserId) {
            window.editProfileBtn.style.display = 'none';
            window.subscribeBtn.style.display = 'inline-block';
            if (writeMessageBtn) writeMessageBtn.style.display = 'flex';
            if (writeStatDivider) writeStatDivider.style.display = 'block';
            
            if (writeMessageBtn) {
                writeMessageBtn.addEventListener('click', function() {
                    if (typeof window.openChatWithUser === 'function') {
                        window.openChatWithUser(window.userId);
                    } else {
                        console.error('openChatWithUser не определена');
                    }
                });
            }
            
            window.subscribeBtn.addEventListener('click', async function() {
                const currentText = window.subscribeBtn.textContent;
                const isSubscribed = currentText === '✅ Подписан';
                
                try {
                    let response;
                    if (isSubscribed) {
                        response = await fetch('/api/unsubscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: window.currentUserId, friendId: window.userId })
                        });
                    } else {
                        response = await fetch('/api/subscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: window.currentUserId, friendId: window.userId })
                        });
                    }
                    const data = await response.json();
                    if (data.success) {
                        await checkSubscription();
                        await loadFriendsForUser(window.userId);
                        await loadFollowers();
                        if (typeof loadNews === 'function') await loadNews();
                    }
                } catch (err) {
                    alert('Ошибка подключения к серверу');
                }
            });
            await checkSubscription();
            await loadFriendsForUser(window.userId);
            await loadFollowers();
        } else {
            window.editProfileBtn.style.display = 'none';
            window.subscribeBtn.style.display = 'inline-block';
            if (writeMessageBtn) writeMessageBtn.style.display = 'none';
            if (writeStatDivider) writeStatDivider.style.display = 'none';
            window.subscribeBtn.addEventListener('click', function() {
                window.location.href = '/login.html';
            });
            await loadFriendsForUser(window.userId);
            await loadFollowers();
        }
    }
    
    // Загрузка данных пользователя
    try {
        const response = await fetch(`/api/user/${window.userId}`);
        const data = await response.json();
        if (data.success && data.user) {
            const user = data.user;

            // ===== ЗАБЛОКИРОВАННЫЙ ПРОФИЛЬ =====
            const isAdmin = currentUserId === '1' || currentUserId === '5';
            if (user.is_blocked && !isAdmin) {
                // Гость видит заглушку
                document.querySelector('.user-profile') && (document.querySelector('.user-profile').style.display = 'none');
                const overlay = document.getElementById('blockedProfileOverlay');
                if (overlay) overlay.style.display = 'block';
                return;
            }

            // Кнопка блокировки для админа на чужом профиле
            if (isAdmin && !window.isOwnProfile) {
                const blockBtn = document.getElementById('adminBlockBtn');
                if (blockBtn) {
                    blockBtn.style.display = 'flex';
                    const updateBlockBtn = (blocked) => {
                        if (blocked) {
                            blockBtn.title = 'Разблокировать';
                            blockBtn.style.cssText = 'display:flex;width:40px;height:40px;border-radius:50%;background:rgba(233,174,103,.12);border:1.5px solid rgba(233,174,103,.25);color:#E9AE67;';
                            blockBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
                        } else {
                            blockBtn.title = 'Заблокировать';
                            blockBtn.style.cssText = 'display:flex;width:40px;height:40px;border-radius:50%;background:rgba(255,80,80,.12);border:1.5px solid rgba(255,80,80,.25);color:#ff6666;';
                            blockBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
                        }
                    };
                    updateBlockBtn(!!user.is_blocked);
                    blockBtn.addEventListener('click', async () => {
                        const newBlocked = !user.is_blocked;
                        const action = newBlocked ? 'Заблокировать' : 'Разблокировать';
                        if (!confirm(`${action} пользователя ${user.name}?`)) return;
                        try {
                            const r = await fetch('/api/admin/block-user', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentUserId, targetUserId: user.id, isBlocked: newBlocked })
                            });
                            const rd = await r.json();
                            if (rd.success) {
                                user.is_blocked = newBlocked ? 1 : 0;
                                updateBlockBtn(!!user.is_blocked);
                            }
                        } catch(e) { console.error(e); }
                    });
                }
            }

            window.userName.textContent = user.name || 'Пользователь';
            window.userBio.textContent = user.bio || 'Информация о себе...';
            window.userCity.textContent = user.city || 'Не указан';
            window.userPhone.textContent = user.phone || 'Не указан';
            window.userWebsite.textContent = user.website || 'Не указан';
            
            if (window.userLoginText) {
                window.userLoginText.textContent = `Логин: ${user.login}`;
            }
            if (window.userIdText) {
                window.userIdText.textContent = `ID: ${user.id}`;
            }
            
            if (window.userTypeDisplay) {
                if (user.user_type) {
                    window.userTypeDisplay.textContent = `Кто я: ${user.user_type}`;
                    window.userTypeDisplay.style.display = 'block';
                } else {
                    window.userTypeDisplay.textContent = 'Кто я: Спортсмен';
                }
            }
            
            if (user.avatar) {
                window.avatarImg.src = user.avatar;
                window.avatarImg.style.display = 'block';
                window.avatarText.style.display = 'none';
            } else {
                window.avatarText.textContent = (user.name || 'П').charAt(0).toUpperCase();
                window.avatarText.style.display = 'flex';
                window.avatarImg.style.display = 'none';
            }

            // ===== КАЧКОИНЫ =====
            if (window.isOwnProfile) {
                const badge = document.getElementById('kachcoinBadge');
                const amount = document.getElementById('kachcoinAmount');
                if (badge && amount) {
                    amount.textContent = (user.kachcoins || 0).toLocaleString('ru-RU');
                    badge.style.display = 'flex';
                }
                // Проверяем доступность бонуса для значка
                checkDailyBonusNotify();
            }
        } else {
            window.userName.textContent = 'Гость';
            window.userBio.textContent = 'Пользователь не найден';
            window.userCity.textContent = 'Не указан';
            window.userPhone.textContent = 'Не указан';
            window.userWebsite.textContent = 'Не указан';
            window.avatarText.textContent = '👤';
            window.avatarText.style.display = 'flex';
            window.avatarImg.style.display = 'none';
            if (window.userLoginText) window.userLoginText.textContent = '';
            if (window.userIdText) window.userIdText.textContent = '';
            if (window.userTypeDisplay) window.userTypeDisplay.style.display = 'none';
        }
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        window.userName.textContent = 'Ошибка';
        window.userBio.textContent = 'Не удалось загрузить данные';
    }
    
    await loadFriendsForUser(window.userId);
    await loadFollowers();
    
    // Загрузка блоков для своей страницы
    if (window.isOwnProfile) {
        // await loadUserBlocks();
    }
    
    // Слушаем изменения localStorage для синхронизации между вкладками
    window.addEventListener('storage', function(e) {
        if (e.key === 'blocksUpdated' && window.isOwnProfile) {
            }
    });
    
    const navProfileBottom = document.getElementById('navProfileBottom');
    const navFriendsBottom = document.getElementById('navFriendsBottom');
    const navFollowersBottom = document.getElementById('navFollowersBottom');
    const navPeopleBottom = document.getElementById('navPeopleBottom');
    const navBlocksBottom = document.getElementById('navBlocksBottom');
    
    if (navProfileBottom) {
        navProfileBottom.addEventListener('click', function() {
            if (window.currentUserId) {
                window.location.href = '/user/' + window.currentUserId;
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navFriendsBottom) {
        navFriendsBottom.addEventListener('click', function() {
            if (window.openFriendsModal) window.openFriendsModal();
            else window.location.href = '/login.html';
        });
    }
    
    if (navFollowersBottom) {
        navFollowersBottom.addEventListener('click', function() {
            if (window.openFollowersModal) window.openFollowersModal();
            else window.location.href = '/login.html';
        });
    }
    
    if (navPeopleBottom) {
        navPeopleBottom.addEventListener('click', function() {
            if (window.openPeopleModal) window.openPeopleModal();
        });
    }
    
    if (navBlocksBottom) {
        navBlocksBottom.addEventListener('click', function() {
            window.location.href = '/blocks.html';
        });
    }
    
    // ========== ПРОСМОТР АВАТАРКИ ==========
    const avatarModal = document.getElementById('avatarModal');
    const avatarModalImg = document.getElementById('avatarModalImg');
    const avatarModalClose = document.querySelector('.avatar-modal-close');
    
    function openAvatarModal(imageSrc) {
        if (!imageSrc || imageSrc === 'null' || imageSrc === '') {
            avatarModalImg.src = '/img/default-avatar.png';
        } else {
            avatarModalImg.src = imageSrc;
        }
        avatarModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeAvatarModal() {
        avatarModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (avatarModalClose) {
        avatarModalClose.addEventListener('click', closeAvatarModal);
    }
    
    if (avatarModal) {
        avatarModal.addEventListener('click', function(e) {
            if (e.target === avatarModal) {
                closeAvatarModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && avatarModal && avatarModal.style.display === 'flex') {
            closeAvatarModal();
        }
    });
    
    const avatarCircle = document.querySelector('#userAvatar');
    if (avatarCircle) {
        avatarCircle.style.cursor = 'pointer';
        avatarCircle.addEventListener('click', function(e) {
            e.stopPropagation();
            const avatarImgElement = document.getElementById('avatarImg');
            const avatarTextElement = document.getElementById('avatarText');
            
            if (avatarImgElement && avatarImgElement.style.display === 'block' && avatarImgElement.src) {
                openAvatarModal(avatarImgElement.src);
            } else if (avatarTextElement && avatarTextElement.textContent && avatarTextElement.textContent !== '👤') {
                openAvatarModal(null);
            }
        });
    }
    
    // ========== PWA УСТАНОВКА ПРИЛОЖЕНИЯ ==========
    let deferredPrompt = null;
    let isPwaInstalled = false;
    
    function checkIfPwaInstalled() {
        if (window.navigator.standalone === true) {
            isPwaInstalled = true;
        }
        if (window.matchMedia('(display-mode: standalone)').matches) {
            isPwaInstalled = true;
        }
        return isPwaInstalled;
    }
    
    function getOperatingSystem() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return 'ios';
        }
        if (/android/i.test(userAgent)) {
            return 'android';
        }
        return 'other';
    }
    
    function getInstallIcon(os) {
        if (os === 'android') {
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.6 9.48L19.44 6.3C19.56 6.09 19.5 5.82 19.29 5.7C19.08 5.58 18.81 5.64 18.69 5.85L16.83 9.06C15.99 8.7 15.06 8.5 14.1 8.5C13.14 8.5 12.21 8.7 11.37 9.06L9.51 5.85C9.39 5.64 9.12 5.58 8.91 5.7C8.7 5.82 8.64 6.09 8.76 6.3L10.6 9.48C8.79 10.47 7.5 12.27 7.5 14.37C7.5 14.79 7.56 15.21 7.68 15.6H20.52C20.64 15.21 20.7 14.79 20.7 14.37C20.7 12.27 19.41 10.47 17.6 9.48ZM10.5 14.1C9.9 14.1 9.45 13.65 9.45 13.05C9.45 12.45 9.9 12 10.5 12C11.1 12 11.55 12.45 11.55 13.05C11.55 13.65 11.1 14.1 10.5 14.1ZM17.7 14.1C17.1 14.1 16.65 13.65 16.65 13.05C16.65 12.45 17.1 12 17.7 12C18.3 12 18.75 12.45 18.75 13.05C18.75 13.65 18.3 14.1 17.7 14.1Z" fill="currentColor"/><path d="M21 16.5H3V18.5H21V16.5Z" fill="currentColor"/></svg>`;
        } else if (os === 'ios') {
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.85 21.18 10.37 21.95 9.17 22C7.97 22.05 7.01 20.76 6.17 19.52C4.5 17.06 3.24 12.46 5.07 9.4C5.97 7.88 7.54 6.97 9.15 6.97C10.55 6.97 11.48 7.74 12.71 7.74C13.94 7.74 14.66 6.97 16.34 6.97C17.72 6.97 19.06 7.66 19.98 8.89C17.82 10.08 17.25 13.04 19.06 14.85C19.98 15.77 20.25 16.58 20.25 17.5C20.25 18.42 19.99 19.23 19.23 19.99L18.71 19.5Z" fill="currentColor"/><path d="M14.5 4.5C15.38 3.5 16 2.2 15.95 1C14.86 1.05 13.63 1.78 12.88 2.85C12.2 3.84 11.63 5.12 11.74 6.3C12.93 6.36 14.1 5.63 14.5 4.5Z" fill="currentColor"/></svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 9H17V7C17 4.24 14.76 2 12 2C9.24 2 7 4.24 7 7V9H5C3.9 9 3 9.9 3 11V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V11C21 9.9 20.1 9 19 9ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17ZM15 9H9V7C9 5.34 10.34 4 12 4C13.66 4 15 5.34 15 7V9Z" fill="currentColor"/></svg>`;
    }
    
    function updateInstallButton() {
        const installBtn = document.getElementById('installPwaBtn');
        if (!installBtn) return;
        
        if (checkIfPwaInstalled()) {
            installBtn.style.display = 'none';
            return;
        }
        
        const os = getOperatingSystem();
        const iconSvg = getInstallIcon(os);
        const iconSpan = installBtn.querySelector('.install-pwa-icon');
        if (iconSpan) iconSpan.innerHTML = iconSvg;
        
        installBtn.style.display = 'flex';
        installBtn.onclick = () => {
            if (os === 'ios') {
                showIosInstructions();
            } else {
                if (!deferredPrompt) {
                    alert('Нажмите на три точки в браузере → "Установить приложение"');
                    return;
                }
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choice) => {
                    if (choice.outcome === 'accepted') {
                        installBtn.style.display = 'none';
                    }
                    deferredPrompt = null;
                });
            }
        };
    }
    
    function showIosInstructions() {
        const modal = document.createElement('div');
        modal.className = 'ios-instructions-modal';
        modal.innerHTML = `
            <div class="ios-instructions-content">
                <div class="ios-instructions-header">
                    <span>📱 Установить приложение</span>
                    <button class="ios-instructions-close">&times;</button>
                </div>
                <div class="ios-instructions-body">
                    <p>Чтобы установить приложение на iPhone/iPad:</p>
                    <ol>
                        <li>Нажмите кнопку <span class="ios-share-icon">⎙</span> <strong>"Поделиться"</strong></li>
                        <li>Прокрутите вниз и нажмите <strong>"На экран "Домой"</strong></li>
                        <li>Нажмите <strong>"Добавить"</strong></li>
                    </ol>
                    <div class="ios-instructions-note">✨ После этого иконка приложения появится на главном экране!</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        modal.querySelector('.ios-instructions-close').onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }
    
    function initPwaInstall() {
        const installBtn = document.getElementById('installPwaBtn');
        if (!installBtn) return;
        
        if (checkIfPwaInstalled()) {
            installBtn.style.display = 'none';
            return;
        }
        
        updateInstallButton();
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            updateInstallButton();
        });
        
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            if (e.matches) installBtn.style.display = 'none';
            else updateInstallButton();
        });
    }
    
    initPwaInstall();
});




// ===== МАГИЧЕСКАЯ ПЫЛЬЦА НА АВАТАРКЕ =====
(function() {
    let canvas, ctx, particles = [], animId = null;

    function initCanvas() {
        const wrap = document.querySelector('.avatar-frame-wrap');
        if (!wrap || document.getElementById('dustCanvas')) return;

        canvas = document.createElement('canvas');
        canvas.id = 'dustCanvas';
        canvas.style.cssText = `
            position: absolute;
            inset: -30px;
            width: calc(100% + 60px);
            height: calc(100% + 60px);
            pointer-events: none;
            z-index: 5;
            border-radius: 50%;
        `;
        canvas.width = 146;
        canvas.height = 146;
        wrap.appendChild(canvas);
        ctx = canvas.getContext('2d');
    }

    function spawnParticle() {
        const cx = 73, cy = 73, r = 38;
        const angle = Math.random() * Math.PI * 2;
        const colors = [
            'rgba(233,174,103,',
            'rgba(255,220,100,',
            'rgba(255,255,200,',
            'rgba(200,150,255,',
            'rgba(150,200,255,',
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push({
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 0.4,   // медленно в стороны
            vy: -(Math.random() * 0.5 + 0.1),   // медленно вверх
            size: Math.random() * 0.8 + 0.2,    // очень мелкие
            life: 1,
            decay: Math.random() * 0.008 + 0.005, // долго живут
            color: color,
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (Math.random() < 0.4) spawnParticle();

        particles = particles.filter(p => p.life > 0);
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vx += (Math.random() - 0.5) * 0.04; // лёгкое дрожание
            p.life -= p.decay;

            const alpha = p.life;
            ctx.beginPath();
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            grad.addColorStop(0, p.color + '1)');
            grad.addColorStop(0.5, p.color + alpha.toFixed(2) + ')');
            grad.addColorStop(1, p.color + '0)');
            ctx.fillStyle = grad;
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Яркое ядро — очень маленькое
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.95).toFixed(2)})`;
            ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        animId = requestAnimationFrame(animate);
    }

    function startDust() {
        if (animId) return;
        initCanvas();
        if (!canvas) return;
        canvas.style.opacity = '1';
        animate();
    }

    function stopDust() {
        if (animId) { cancelAnimationFrame(animId); animId = null; }
        particles = [];
        if (canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            const wrap = document.querySelector('.avatar-frame-wrap');
            if (!wrap) return;
            wrap.addEventListener('mouseenter', startDust);
            wrap.addEventListener('mouseleave', stopDust);
            // Мобильный touch
            wrap.addEventListener('touchstart', startDust, { passive: true });
            wrap.addEventListener('touchend', () => setTimeout(stopDust, 1500));
        }, 600);
    });
})();

// ===== РАМКИ АВАТАРА — НОВЫЙ МАГАЗИН =====
(function() {

    const FRAME_STYLES = {
        'default': { border: '3px solid #555', shadow: 'none' },
        'gold':    { border: '3px solid #E9AE67', shadow: '0 0 0 2px #1a1a1e, 0 0 16px rgba(233,174,103,0.6)' },
        'fire':    { border: '3px solid #ff6b00', shadow: '0 0 0 2px #1a1a1e, 0 0 18px rgba(255,107,0,0.7)' },
        'elec':    { border: '3px solid #5b8ef5', shadow: '0 0 0 2px #1a1a1e, 0 0 16px rgba(91,142,245,0.7)' },
        'ice':     { border: '3px solid #7ee8ff', shadow: '0 0 0 2px #1a1a1e, 0 0 16px rgba(126,232,255,0.6)' },
        'royal':   { border: '3px solid #9c6fff', shadow: '0 0 0 2px #1a1a1e, 0 0 16px rgba(156,111,255,0.6)' },
        'legend':  { border: '3px solid #ffd700', shadow: '0 0 0 2px #1a1a1e, 0 0 22px rgba(255,215,0,0.8)' },
        'cosmic':  { border: '3px solid #ff6b6b', shadow: '0 0 0 2px #1a1a1e, 0 0 20px rgba(200,150,255,0.7)' },
    };

    const CAT_MAP = {
        'all':        { id: 'catCountAll',       label: 'Все рамки' },
        'standard':   { id: 'catCountStandard',  label: 'Базовые' },
        'sport':      { id: 'catCountSport',     label: 'Спорт' },
        'rpg':        { id: 'catCountRpg',       label: 'RPG' },
        'light_dark': { id: 'catCountLightDark', label: 'Свет и Тьма' },
        'music':      { id: 'catCountMusic',     label: 'Музыка' },
        'epic':       { id: 'catCountEpic',      label: 'Эпические' },
    };

    let framesData = [];
    let currentCoins = 0;
    let activeFrame = 'default';
    let currentTab = 'all';
    let currentCat = 'standard';
    const currentSort = 'price_asc';

    // ---- Применить рамку на аватарку ----
    function applyFrameToAvatar(frameId) {
        const wrap = document.querySelector('.avatar-frame-wrap');
        const circle = document.querySelector('.avatar-frame-wrap .avatar-circle');
        if (!circle || !wrap) return;

        const oldOverlay = document.getElementById('framesOverlayImg');
        if (oldOverlay) oldOverlay.remove();

        const frame = framesData.find(f => f.frame_id === frameId);
        if (frame && frame.img) {
            circle.style.border = 'none';
            circle.style.boxShadow = 'none';
            const overlay = document.createElement('img');
            overlay.id = 'framesOverlayImg';
            overlay.src = frame.img;
            overlay.alt = '';
            overlay.style.cssText = `
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                object-fit: contain;
                z-index: 2; pointer-events: none;
            `;
            overlay.onerror = function() { this.remove(); };
            wrap.style.position = 'relative';
            wrap.appendChild(overlay);
        } else {
            const style = FRAME_STYLES[frameId] || FRAME_STYLES['default'];
            circle.style.border = style.border;
            circle.style.boxShadow = style.shadow;
        }
    }

    function getAvatarSrc() {
        const img = document.getElementById('avatarImg');
        if (img && img.style.display !== 'none' && img.src) return img.src;
        return null;
    }

    // ---- Обновить счётчики категорий ----
    function updateCatCounts(list) {
        Object.keys(CAT_MAP).forEach(cat => {
            const el = document.getElementById(CAT_MAP[cat].id);
            if (!el) return;
            const count = cat === 'all' ? list.length : list.filter(f => f.category === cat).length;
            el.textContent = count;
        });
    }

    // ---- Фильтровать и сортировать ----
    function getFilteredFrames() {
        let list = [...framesData];

        if (currentTab === 'my') {
            // Мои рамки — только купленные, без фильтра категории
            list = list.filter(f => f.owned || f.price === 0);
        } else {
            // Магазин — фильтр по категории
            if (currentCat !== 'all') list = list.filter(f => f.category === currentCat);
        }

        // Всегда сортируем от дешёвых к дорогим
        list.sort((a,b) => a.price - b.price);

        return list;
    }

    // ---- Рендер сетки ----
    function renderFrames() {
        const grid = document.getElementById('framesGrid');
        if (!grid) return;

        document.getElementById('framesModalCoins').textContent = currentCoins.toLocaleString('ru-RU');



        updateCatCounts(framesData);

        const list = getFilteredFrames();
        const avatarSrc = getAvatarSrc();

        if (!list.length) {
            grid.innerHTML = '<div style="color:#666;padding:30px;text-align:center;grid-column:1/-1;">Рамок нет в этой категории</div>';
            return;
        }

        grid.innerHTML = list.map(f => {
            const isOwned = f.owned || f.price === 0;
            const isActive = f.frame_id === activeFrame;
            const style = FRAME_STYLES[f.frame_id] || FRAME_STYLES['default'];
            const canAfford = currentCoins >= f.price;
            const hasPng = !!f.img;
            const previewStyle = hasPng
                ? `background:#1a1a1e;border:none;box-shadow:none;`
                : `background:#1a1a1e;border:${style.border};box-shadow:${style.shadow};`;

            let btn = '';
            if (isActive) btn = `<button class="frame-btn-active" disabled>✓ Активна</button>`;
            else if (isOwned) btn = `<button class="frame-btn-activate" data-id="${f.frame_id}">Активировать</button>`;
            else btn = `<button class="frame-btn-buy" data-id="${f.frame_id}" ${!canAfford?'disabled':''}>${canAfford?'Купить':'Мало монет'}</button>`;

            const priceHtml = f.price === 0
                ? `<div class="frame-opt-price" style="color:#4caf8a;">Бесплатно</div>`
                : `<div class="frame-opt-price"><img src="/img/vkachcoin.png" alt="">${f.price.toLocaleString('ru-RU')}</div>`;

            return `<div class="frame-opt ${isActive?'active-frame':''}" data-id="${f.frame_id}">
                <div class="frame-preview" style="${previewStyle}">
                    ${avatarSrc?`<img class="frame-preview-avatar" src="${avatarSrc}" alt="">`:`<span style="font-size:28px;z-index:1;position:relative;">💪</span>`}
                    ${hasPng?`<img class="frame-preview-overlay" src="${f.img}" alt="" onerror="this.style.display='none'">`:''}
                </div>
                <div class="frame-opt-name">${f.name}</div>
                ${priceHtml}
                ${btn}
            </div>`;
        }).join('');

        // Кнопки купить
        grid.querySelectorAll('.frame-btn-buy:not(:disabled)').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const frameId = this.dataset.id;
                const frame = framesData.find(f => f.frame_id === frameId);
                if (!confirm(`Купить рамку "${frame.name}" за ${frame.price.toLocaleString('ru-RU')} Качкоинов?`)) return;
                try {
                    const r = await fetch('/api/frames/buy', {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ userId: window.userId, frameId })
                    });
                    const data = await r.json();
                    if (data.success) {
                        currentCoins = data.newBalance;
                        frame.owned = 1;
                        const amountEl = document.getElementById('kachcoinAmount');
                        if (amountEl) amountEl.textContent = currentCoins.toLocaleString('ru-RU');
                        renderFrames();
                    } else alert(data.error || 'Ошибка покупки');
                } catch(e) { alert('Ошибка соединения'); }
            });
        });

        // Кнопки активировать
        grid.querySelectorAll('.frame-btn-activate').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const frameId = this.dataset.id;
                try {
                    const r = await fetch('/api/frames/activate', {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ userId: window.userId, frameId })
                    });
                    const data = await r.json();
                    if (data.success) {
                        activeFrame = frameId;
                        applyFrameToAvatar(frameId);
                        renderFrames();
                    } else alert(data.error || 'Ошибка активации');
                } catch(e) { alert('Ошибка соединения'); }
            });
        });
    }

    // ---- Загрузить рамки с сервера ----
    async function loadFrames() {
        if (!window.userId) return;
        try {
            const r = await fetch(`/api/frames/${window.userId}`);
            const data = await r.json();
            if (data.success) {
                framesData = data.frames;
                currentCoins = data.kachcoins || 0;
                activeFrame = data.active || 'default';
                applyFrameToAvatar(activeFrame);
            }
        } catch(e) { console.error('Ошибка загрузки рамок:', e); }
    }

    // ---- Инициализация ----
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            const frameBtn = document.getElementById('frameBtn');
            if (frameBtn && window.isOwnProfile) {
                frameBtn.style.display = 'flex';
            }
            if (window.userId) loadFrames();
        }, 500);

        // Открыть магазин
        const frameBtn = document.getElementById('frameBtn');
        if (frameBtn) {
            frameBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const modal = document.getElementById('framesModal');
                if (modal) { modal.style.display = 'flex'; renderFrames(); }
            });
        }

        // Закрыть
        const closeBtn = document.getElementById('framesModalClose');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            document.getElementById('framesModal').style.display = 'none';
        });
        const overlay = document.getElementById('framesModal');
        if (overlay) overlay.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });



        // Табы — Магазин / Мои рамки
        document.addEventListener('click', function(e) {
            const tab = e.target.closest('.frames-tab');
            if (!tab) return;
            document.querySelectorAll('.frames-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            // При переходе в Магазин — активируем первую категорию
            if (currentTab === 'all') {
                currentCat = 'standard';
                document.querySelectorAll('.frames-cat').forEach(c => c.classList.remove('active'));
                const firstCat = document.querySelector('.frames-cat[data-cat="standard"]');
                if (firstCat) firstCat.classList.add('active');
            }
            renderFrames();
        });

        // Категории — при клике переключаем на Магазин
        document.addEventListener('click', function(e) {
            const cat = e.target.closest('.frames-cat');
            if (!cat) return;
            document.querySelectorAll('.frames-cat').forEach(c => c.classList.remove('active'));
            cat.classList.add('active');
            currentCat = cat.dataset.cat;
            // Автоматически переключаем на вкладку Магазин
            currentTab = 'all';
            document.querySelectorAll('.frames-tab').forEach(t => t.classList.remove('active'));
            const shopTab = document.querySelector('.frames-tab[data-tab="all"]');
            if (shopTab) shopTab.classList.add('active');
            renderFrames();
        });


    });
})();

// ===== СВОРАЧИВАЕМЫЙ ТЕКСТ О СЕБЕ =====
(function() {
    const LIMIT = 50;

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            const bio = document.getElementById('userBio');
            if (!bio) return;

            function initBio() {
                const fullText = bio.textContent.trim();
                if (!fullText || fullText.length <= LIMIT) return;

                const shortText = fullText.slice(0, LIMIT).trimEnd();
                let expanded = false;

                function render() {
                    if (expanded) {
                        bio.innerHTML = fullText + ' <button class="bio-toggle-btn"style="display:inline;padding:0;font-size:12px;">Свернуть</button>';
                    } else {
                        bio.innerHTML = shortText + '... <button class="bio-toggle-btn" style="display:inline;padding:0;font-size:12px;">Ещё</button>';
                    }
                    bio.querySelector('.bio-toggle-btn').addEventListener('click', function(e) {
                        e.stopPropagation();
                        expanded = !expanded;
                        render();
                    });
                }
                render();
            }

            let bioInited = false;
            const observer = new MutationObserver(() => {
                if (bio.textContent.trim() && !bioInited) {
                    bioInited = true;
                    observer.disconnect();
                    setTimeout(initBio, 200);
                }
            });
            observer.observe(bio, { childList: true, subtree: true, characterData: true });
            if (bio.textContent.trim() && !bioInited) {
                bioInited = true;
                initBio();
            }

        }, 600);
    });
})();

// ========== КАЧКОИНЫ: ЕЖЕДНЕВНЫЙ БОНУС ==========
(function() {
    const REWARDS = [50, 50, 50, 50, 50, 50, 500];
    let timerInterval = null;

    const style = document.createElement('style');
    style.textContent = `
        .kachcoin-badge { cursor: pointer; transition: transform 0.15s; }
        .kachcoin-badge:hover { transform: scale(1.08); }
        .daily-bonus-card {
            background: linear-gradient(135deg, #1a1a1e 0%, #111114 100%);
            border: 1px solid rgba(233,174,103,.25);
            border-radius: 14px; padding: 16px;
            display: flex; flex-direction: column; gap: 14px;
        }
        .daily-bonus-header { display: flex; align-items: center; gap: 10px; }
        .daily-bonus-title { flex: 1; }
        .daily-bonus-timer {
            display: flex; align-items: center; gap: 4px;
            background: rgba(255,255,255,.04); border-radius: 8px; padding: 4px 8px;
        }
        .daily-days-row { display: flex; gap: 6px; justify-content: space-between; }
        .daily-day {
            flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
            background: rgba(255,255,255,.03); border: 1px solid rgba(233,174,103,.12);
            border-radius: 10px; padding: 8px 2px 6px; position: relative; transition: all 0.2s;
        }
        .daily-day.is-done { background: rgba(233,174,103,.08); border-color: rgba(233,174,103,.3); }
        .daily-day.is-today { background: rgba(233,174,103,.15); border-color: #E9AE67; box-shadow: 0 0 12px rgba(233,174,103,.2); }
        .daily-day.is-jackpot { background: rgba(196,137,74,.18); border-color: #c4894a; }
        .daily-day.is-jackpot.is-today { box-shadow: 0 0 16px rgba(196,137,74,.35); }
        .daily-day-num { font-size: 9px; color: #555; font-weight: 600; text-transform: uppercase; }
        .daily-day.is-done .daily-day-num, .daily-day.is-today .daily-day-num { color: #E9AE67; }
        .daily-day-icon { width: 22px; height: 22px; }
        .daily-day-reward { font-size: 10px; font-weight: 700; color: #888; }
        .daily-day.is-today .daily-day-reward { color: #E9AE67; }
        .daily-day.is-jackpot .daily-day-reward { color: #c4894a; }
        .daily-day-check {
            position: absolute; top: -5px; right: -5px;
            width: 14px; height: 14px; background: #E9AE67;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .daily-claim-btn {
            width: 100%; padding: 13px; border-radius: 12px; border: none;
            background: linear-gradient(135deg, #E9AE67, #c4894a);
            color: #1a1a1a; font-weight: 700; font-size: 15px; cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;
        }
        .daily-claim-btn:disabled { background: rgba(255,255,255,.05); color: #555; cursor: not-allowed; }
        .daily-claim-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(233,174,103,.3); }
        @keyframes coinPop {
            0% { transform: scale(1); } 40% { transform: scale(1.3) rotate(-8deg); }
            70% { transform: scale(0.95) rotate(4deg); } 100% { transform: scale(1) rotate(0); }
        }
        .coin-pop { animation: coinPop 0.5s ease; }
    `;
    document.head.appendChild(style);

    function declDays(n) {
        const abs = Math.abs(n);
        if (abs % 10 === 1 && abs % 100 !== 11) return 'день';
        if ([2,3,4].includes(abs % 10) && ![12,13,14].includes(abs % 100)) return 'дня';
        return 'дней';
    }

    function renderDays(dayInCycle, canClaim) {
        const row = document.getElementById('dailyDaysRow');
        if (!row) return;
        row.innerHTML = '';
        REWARDS.forEach((reward, i) => {
            const isDone = canClaim ? i < dayInCycle : i <= dayInCycle;
            const isToday = i === dayInCycle;
            const isJackpot = i === 6;
            const day = document.createElement('div');
            day.className = 'daily-day' +
                (isDone && !isToday ? ' is-done' : '') +
                (isToday ? ' is-today' : '') +
                (isJackpot ? ' is-jackpot' : '');
            let iconSVG;
            if (isDone && !isToday) {
                iconSVG = `<svg class="daily-day-icon" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="10" fill="rgba(233,174,103,.15)" stroke="#E9AE67" stroke-width="1.5"/><path d="M7 11l3 3 5-5" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            } else if (isJackpot) {
                iconSVG = `<svg class="daily-day-icon" viewBox="0 0 22 22" fill="none"><path d="M11 2C11 2 14 6 13 9C15 7 16 5 16 5C16 5 19 9 17 13C15.5 16 13 17 11 17C9 17 6.5 16 5 13C3 9 6 5 6 5C6 5 7 7 9 9C8 6 11 2 11 2Z" fill="#c4894a" stroke="#E9AE67" stroke-width="1"/><circle cx="11" cy="13" r="2" fill="#E9AE67" opacity="0.7"/></svg>`;
            } else if (isToday && canClaim) {
                iconSVG = `<svg class="daily-day-icon" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="9" fill="#c4894a" stroke="#E9AE67" stroke-width="1.5"/><text x="11" y="15.5" font-family="serif" font-size="10" font-weight="bold" fill="#E9AE67" text-anchor="middle">К</text></svg>`;
            } else {
                iconSVG = `<svg class="daily-day-icon" viewBox="0 0 22 22" fill="none"><rect x="6" y="10" width="10" height="8" rx="2" fill="rgba(255,255,255,.05)" stroke="#444" stroke-width="1.5"/><path d="M8 10V8a3 3 0 016 0v2" stroke="#444" stroke-width="1.5" stroke-linecap="round"/><circle cx="11" cy="14" r="1.5" fill="#444"/></svg>`;
            }
            day.innerHTML = `
                <div class="daily-day-num">Д${i+1}</div>
                ${iconSVG}
                <div class="daily-day-reward">${isJackpot ? '🏆' : ''}+${reward}</div>
                ${isDone && !isToday ? '<div class="daily-day-check"><svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="#1a1a1e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>' : ''}
            `;
            row.appendChild(day);
        });
    }

    function startTimer(nextClaimAt) {
        if (timerInterval) clearInterval(timerInterval);
        const wrap = document.getElementById('dailyTimerWrap');
        const el = document.getElementById('dailyTimer');
        if (!wrap || !el) return;
        wrap.style.display = 'flex';
        function update() {
            const diff = new Date(nextClaimAt) - Date.now();
            if (diff <= 0) { clearInterval(timerInterval); loadDailyBonus(); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
        update();
        timerInterval = setInterval(update, 1000);
    }

    // Проверяем доступность бонуса и показываем/скрываем значок
    window.checkDailyBonusNotify = async function checkDailyBonusNotify() {
        const uid = window.userId || localStorage.getItem('currentUserId');
        if (!uid) return;
        try {
            const res = await fetch(`/api/daily-bonus/${uid}`);
            const data = await res.json();
            if (!data.success) return;
            const notify = document.getElementById('kachcoinNotify');
            if (notify) {
                if (data.canClaim) {
                    notify.classList.add('visible');
                } else {
                    notify.classList.remove('visible');
                }
            }
        } catch(e) {}
    }

    // Повторная проверка каждые 5 минут (вдруг полночь наступила)
    setInterval(checkDailyBonusNotify, 5 * 60 * 1000);

    async function loadDailyBonus() {
        const uid = window.userId || localStorage.getItem('currentUserId');
        if (!uid) return;
        try {
            const res = await fetch(`/api/daily-bonus/${uid}`);
            const data = await res.json();
            if (!data.success) return;
            const amountEl = document.getElementById('kachcoinsModalAmount');
            if (amountEl) amountEl.textContent = (data.kachcoins || 0).toLocaleString('ru-RU');
            const streakEl = document.getElementById('dailyStreakText');
            if (streakEl) streakEl.textContent = `Серия входов: ${data.streak} ${declDays(data.streak)}`;
            renderDays(data.dayInCycle, data.canClaim);
            const btn = document.getElementById('dailyClaimBtn');
            const timerWrap = document.getElementById('dailyTimerWrap');
            if (btn) {
                btn.disabled = !data.canClaim;
                if (data.canClaim) {
                    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#c4894a" stroke="#1a1a1e" stroke-width="2"/><text x="24" y="31" font-family="serif" font-size="22" font-weight="bold" fill="#1a1a1e" text-anchor="middle">К</text></svg> Забрать +${REWARDS[data.dayInCycle]}`;
                    if (timerWrap) timerWrap.style.display = 'none';
                    if (timerInterval) clearInterval(timerInterval);
                } else {
                    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="20" fill="#333"/><text x="24" y="31" font-family="serif" font-size="22" font-weight="bold" fill="#555" text-anchor="middle">К</text></svg> Уже получен`;
                    if (data.nextClaimAt) startTimer(data.nextClaimAt);
                }
            }
        } catch(e) { console.error('daily bonus load error', e); }
    }

    window.openKachcoinsModal = function() {
        const modal = document.getElementById('kachcoinsModal');
        if (!modal) return;
        modal.style.display = 'flex';
        loadDailyBonus();
    };

    setTimeout(function() {
        const closeBtn = document.getElementById('kachcoinsModalClose');
        if (closeBtn) closeBtn.addEventListener('click', () => {
            document.getElementById('kachcoinsModal').style.display = 'none';
        });
        const overlay = document.getElementById('kachcoinsModal');
        if (overlay) overlay.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
        const claimBtn = document.getElementById('dailyClaimBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', async function() {
                if (this.disabled) return;
                const uid = window.userId || localStorage.getItem('currentUserId');
                if (!uid) return;
                this.disabled = true;
                try {
                    const res = await fetch(`/api/daily-bonus/claim/${uid}`, { method: 'POST' });
                    const data = await res.json();
                    if (!data.success) { this.disabled = false; return; }
                    const coinImg = document.querySelector('#kachcoinsModal .frames-coin-icon');
                    if (coinImg) { coinImg.classList.remove('coin-pop'); void coinImg.offsetWidth; coinImg.classList.add('coin-pop'); }
                    const amountEl = document.getElementById('kachcoinsModalAmount');
                    if (amountEl) amountEl.textContent = (data.kachcoins || 0).toLocaleString('ru-RU');
                    const badgeAmount = document.getElementById('kachcoinAmount');
                    if (badgeAmount) badgeAmount.textContent = (data.kachcoins || 0).toLocaleString('ru-RU');
                    // Скрываем значок уведомления — бонус забран
                    const notify = document.getElementById('kachcoinNotify');
                    if (notify) notify.classList.remove('visible');
                    await loadDailyBonus();
                } catch(e) { console.error('claim error', e); this.disabled = false; }
            });
        }
    }, 800);
})();
