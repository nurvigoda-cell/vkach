// user2.js - функции для модальных окон (подписки, подписчики, люди)

// Загрузка подписчиков для указанного пользователя
async function loadFollowersForUser(targetUserId) {
    if (!targetUserId) return;
    try {
        // Загружаем друзей текущего пользователя для проверки подписок
        if (window.currentUserId) {
            const friendsResponse = await fetch(`/api/friends/${window.currentUserId}`);
            const friendsData = await friendsResponse.json();
            if (friendsData.success && friendsData.friends) {
                window.allFriends = friendsData.friends;
            }
        }
        
        const response = await fetch(`/api/followers/${targetUserId}`);
        const data = await response.json();
        if (data.success && data.followers) {
            window.allFollowers = data.followers;
            displayFollowersInModal(window.allFollowers);
        }
    } catch (err) {
        console.error('Ошибка загрузки подписчиков:', err);
        window.followersModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
    }
}

// Загрузка подписок для указанного пользователя
async function loadFriendsForModal(targetUserId) {
    if (!targetUserId) return;
    try {
        const response = await fetch(`/api/friends/${targetUserId}`);
        const data = await response.json();
        if (data.success && data.friends) {
            window.allFriends = data.friends;
            displayFriendsInModal(window.allFriends);
        }
    } catch (err) {
        console.error('Ошибка загрузки подписок:', err);
        window.friendsModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
    }
}

// Функции для обратной совместимости (используются в user1.js)
async function loadFollowersModal() {
    // По умолчанию загружаем подписчиков просматриваемого пользователя (для блока на странице)
    await loadFollowersForUser(window.userId);
}

async function loadFriendsModal(targetUserId) {
    // Если передан ID, загружаем для него, иначе для просматриваемого пользователя
    const userId = targetUserId || window.userId;
    await loadFriendsForModal(userId);
}

window.loadFollowersModal = loadFollowersModal;
window.loadFriendsModal = loadFriendsModal;

function displayFollowersInModal(followers) {
    if (followers.length === 0) {
        window.followersModalBody.innerHTML = '<div class="no-friends-modal">У этого пользователя пока нет подписчиков</div>';
    } else {
        let html = '<div class="modal-search"><input type="text" id="followersSearchInput" class="modal-search-input" placeholder="Поиск по имени, логину или ID..."></div>';
        html += '<div class="modal-friends-grid" id="followersGrid">';
        
        followers.forEach(follower => {
            const isSubscribedToFollower = window.allFriends && window.allFriends.some(f => f.id == follower.id);
            
            let buttonHtml = '';
            
            if (window.currentUserId && window.currentUserId != follower.id) {
                if (isSubscribedToFollower) {
                    buttonHtml = `<button class="modal-friend-subscribed" disabled style="background-color: #666; opacity: 0.6;">✅ Подписан</button>`;
                } else {
                    buttonHtml = `<button class="modal-friend-subscribe-back" data-id="${follower.id}">🔄 Подписаться в ответ</button>`;
                }
            }
            
            html += `
                <div class="modal-friend-item" data-follower-id="${follower.id}">
                    <div class="modal-friend-avatar" onclick="window.location.href='/user/${follower.id}'">
                        ${follower.avatar ? '<img src="' + follower.avatar + '">' : '👤'}
                    </div>
                    <div class="modal-friend-info" onclick="window.location.href='/user/${follower.id}'">
                        <div class="modal-friend-name">${window.escapeHtml(follower.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(follower.login || follower.name)}</div>
                        <div class="modal-friend-id">ID: ${follower.id}</div>
                    </div>
                    <div class="modal-friend-actions">
                        <button class="modal-friend-write" data-id="${follower.id}" title="Написать сообщение">✉️</button>
                        ${buttonHtml}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        window.followersModalBody.innerHTML = html;
        
        const searchInput = document.getElementById('followersSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase().trim();
                const filteredFollowers = window.allFollowers.filter(follower => 
                    follower.login.toLowerCase().includes(searchTerm) || 
                    follower.name.toLowerCase().includes(searchTerm) ||
                    follower.id.toString().includes(searchTerm)
                );
                updateFollowersGrid(filteredFollowers);
            });
        }
        
        document.querySelectorAll('.modal-friend-write').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const followerId = this.getAttribute('data-id');
                if (typeof window.openChatWithUser === 'function') {
                    window.openChatWithUser(followerId);
                    if (window.followersModal) {
                        window.followersModal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                }
            });
        });
        
        document.querySelectorAll('.modal-friend-subscribe-back').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const followerId = this.getAttribute('data-id');
                await window.subscribeFromPeopleModal(followerId);
                await loadFollowersForUser(window.currentUserId);
                await window.loadFriendsForUser(window.currentUserId);
            });
        });
    }
}

window.displayFollowersInModal = displayFollowersInModal;

function updateFollowersGrid(followers) {
    const grid = document.getElementById('followersGrid');
    if (!grid) return;
    
    if (followers.length === 0) {
        grid.innerHTML = '<div class="no-friends-modal">Нет подписчиков</div>';
    } else {
        let html = '';
        followers.forEach(follower => {
            const isSubscribedToFollower = window.allFriends && window.allFriends.some(f => f.id == follower.id);
            
            let buttonHtml = '';
            
            if (window.currentUserId && window.currentUserId != follower.id) {
                if (isSubscribedToFollower) {
                    buttonHtml = `<button class="modal-friend-subscribed" disabled style="background-color: #666; opacity: 0.6;">✅ Подписан</button>`;
                } else {
                    buttonHtml = `<button class="modal-friend-subscribe-back" data-id="${follower.id}">🔄 Подписаться в ответ</button>`;
                }
            }
            
            html += `
                <div class="modal-friend-item" data-follower-id="${follower.id}">
                    <div class="modal-friend-avatar" onclick="window.location.href='/user/${follower.id}'">
                        ${follower.avatar ? '<img src="' + follower.avatar + '">' : '👤'}
                    </div>
                    <div class="modal-friend-info" onclick="window.location.href='/user/${follower.id}'">
                        <div class="modal-friend-name">${window.escapeHtml(follower.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(follower.login || follower.name)}</div>
                        <div class="modal-friend-id">ID: ${follower.id}</div>
                    </div>
                    <div class="modal-friend-actions">
                        <button class="modal-friend-write" data-id="${follower.id}" title="Написать сообщение">✉️</button>
                        ${buttonHtml}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
        
        document.querySelectorAll('.modal-friend-write').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const followerId = this.getAttribute('data-id');
                if (typeof window.openChatWithUser === 'function') {
                    window.openChatWithUser(followerId);
                    if (window.followersModal) {
                        window.followersModal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                }
            });
        });
        
        document.querySelectorAll('.modal-friend-subscribe-back').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const followerId = this.getAttribute('data-id');
                await window.subscribeFromPeopleModal(followerId);
                await loadFollowersForUser(window.currentUserId);
                await window.loadFriendsForUser(window.currentUserId);
            });
        });
    }
}

window.updateFollowersGrid = updateFollowersGrid;

// displayFriendsInModal и updateFriendsGrid остаются без изменений (они уже правильные)
function displayFriendsInModal(friends) {
    if (friends.length === 0) {
        window.friendsModalBody.innerHTML = '<div class="no-friends-modal">У этого пользователя пока нет подписок</div>';
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
                        <div class="modal-friend-name">${window.escapeHtml(friend.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(friend.login || friend.name)}</div>
                        <div class="modal-friend-id">ID: ${friend.id}</div>
                    </div>
                    <div class="modal-friend-actions">
                        <button class="modal-friend-write" data-id="${friend.id}" title="Написать сообщение">✉️</button>
                        ${window.isOwnProfile ? `<button class="modal-friend-unsubscribe" data-id="${friend.id}">Отписаться</button>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        window.friendsModalBody.innerHTML = html;
        
        const searchInput = document.getElementById('friendsSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase().trim();
                const filteredFriends = window.allFriends.filter(friend => 
                    friend.login.toLowerCase().includes(searchTerm) || 
                    friend.name.toLowerCase().includes(searchTerm) ||
                    friend.id.toString().includes(searchTerm)
                );
                updateFriendsGrid(filteredFriends);
            });
        }
        
        document.querySelectorAll('.modal-friend-write').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const friendId = this.getAttribute('data-id');
                if (typeof window.openChatWithUser === 'function') {
                    window.openChatWithUser(friendId);
                    if (window.friendsModal) {
                        window.friendsModal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                }
            });
        });
        
        if (window.isOwnProfile) {
            document.querySelectorAll('.modal-friend-unsubscribe').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const friendId = this.getAttribute('data-id');
                    await window.unsubscribeFriend(friendId);
                });
            });
        }
    }
}

window.displayFriendsInModal = displayFriendsInModal;

function updateFriendsGrid(friends) {
    const grid = document.getElementById('friendsGrid');
    if (!grid) return;
    
    if (friends.length === 0) {
        grid.innerHTML = '<div class="no-friends-modal">Нет подписок</div>';
    } else {
        let html = '';
        friends.forEach(friend => {
            html += `
                <div class="modal-friend-item" data-friend-id="${friend.id}">
                    <div class="modal-friend-avatar" onclick="window.location.href='/user/${friend.id}'">
                        ${friend.avatar ? '<img src="' + friend.avatar + '">' : '👤'}
                    </div>
                    <div class="modal-friend-info" onclick="window.location.href='/user/${friend.id}'">
                        <div class="modal-friend-name">${window.escapeHtml(friend.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(friend.login || friend.name)}</div>
                        <div class="modal-friend-id">ID: ${friend.id}</div>
                    </div>
                    <div class="modal-friend-actions">
                        <button class="modal-friend-write" data-id="${friend.id}" title="Написать сообщение">✉️</button>
                        ${window.isOwnProfile ? `<button class="modal-friend-unsubscribe" data-id="${friend.id}">Отписаться</button>` : ''}
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
        
        document.querySelectorAll('.modal-friend-write').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const friendId = this.getAttribute('data-id');
                if (typeof window.openChatWithUser === 'function') {
                    window.openChatWithUser(friendId);
                    if (window.friendsModal) {
                        window.friendsModal.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                }
            });
        });
        
        if (window.isOwnProfile) {
            document.querySelectorAll('.modal-friend-unsubscribe').forEach(btn => {
                btn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const friendId = this.getAttribute('data-id');
                    await window.unsubscribeFriend(friendId);
                });
            });
        }
    }
}

window.updateFriendsGrid = updateFriendsGrid;

// Загрузка всех пользователей (люди) с общим количеством
async function loadPeopleModal() {
    if (!window.currentUserId) return;
    try {
        const totalResponse = await fetch('/api/total-users');
        const totalData = await totalResponse.json();
        const totalUsers = totalData.success ? totalData.total : 0;
        
        const response = await fetch(`/api/users-except-friends/${window.currentUserId}`);
        const data = await response.json();
        if (data.success && data.users) {
            window.allUsers = data.users;
            displayUsers(window.allUsers, totalUsers);
        }
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        window.peopleModalBody.innerHTML = '<div class="no-friends-modal">Ошибка загрузки</div>';
    }
}

window.loadPeopleModal = loadPeopleModal;

function displayUsers(users, totalUsers) {
    if (!window.peopleModalBody) return;
    
    if (users.length === 0) {
        window.peopleModalBody.innerHTML = '<div class="no-friends-modal">Нет пользователей</div>';
    } else {
        let html = `
            <div class="modal-people-header" style="padding: 0 0 12px 0; border-bottom: 1px solid #444; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #E9AE67; font-size: 14px; display: flex; align-items: center; gap: 8px;">👥 Всего в качалке: ${totalUsers}</span>
                    <span style="color: #aaa; font-size: 12px;">📋 Показано: ${users.length}</span>
                </div>
            </div>
            <div class="modal-search">
                <input type="text" id="peopleSearchInput" class="modal-search-input" placeholder="Поиск по имени, логину или ID...">
            </div>
            <div class="modal-friends-grid" id="peopleGrid">
        `;
        
        users.forEach(user => {
            html += `
                <div class="modal-friend-item" data-user-id="${user.id}">
                    <div class="modal-friend-avatar" onclick="window.location.href='/user/${user.id}'">
                        ${user.avatar ? '<img src="' + user.avatar + '">' : '👤'}
                    </div>
                    <div class="modal-friend-info" onclick="window.location.href='/user/${user.id}'">
                        <div class="modal-friend-name">${window.escapeHtml(user.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(user.login)}</div>
                        <div class="modal-friend-id">ID: ${user.id}</div>
                    </div>
                    <div class="modal-friend-actions">
                        <button class="modal-friend-subscribe" data-id="${user.id}">Подписаться</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        window.peopleModalBody.innerHTML = html;
        
        const searchInput = document.getElementById('peopleSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase().trim();
                const filteredUsers = window.allUsers.filter(user => 
                    user.login.toLowerCase().includes(searchTerm) || 
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.id.toString().includes(searchTerm)
                );
                updatePeopleGrid(filteredUsers, totalUsers);
            });
        }
        
        document.querySelectorAll('.modal-friend-subscribe').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.stopPropagation();
                const friendId = this.getAttribute('data-id');
                await window.subscribeFromPeopleModal(friendId);
            });
        });
    }
}

window.displayUsers = displayUsers;

function updatePeopleGrid(users, totalUsers) {
    const grid = document.getElementById('peopleGrid');
    if (!grid) return;
    
    const header = document.querySelector('.modal-people-header');
    if (header) {
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #E9AE67; font-size: 14px; display: flex; align-items: center; gap: 8px;">👥 Всего в качалке: ${totalUsers}</span>
                <span style="color: #aaa; font-size: 12px;">📋 Найдено: ${users.length}</span>
            </div>
        `;
    }
    
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
                        <div class="modal-friend-name">${window.escapeHtml(user.name)}</div>
                        <div class="modal-friend-login">@${window.escapeHtml(user.login)}</div>
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
                await window.subscribeFromPeopleModal(friendId);
            });
        });
    }
}

window.updatePeopleGrid = updatePeopleGrid;