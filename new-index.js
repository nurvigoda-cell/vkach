// new-index.js - логика для главной страницы "В КАЧАЛКЕ"

document.addEventListener('DOMContentLoaded', function() {
    // Элементы
    const avatar = document.getElementById('avatar');
    const avatarImg = document.getElementById('avatarImg');
    const avatarText = document.getElementById('avatarText');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userLoginDisplay = document.getElementById('userLoginDisplay');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const mainLogo = document.querySelector('.main-logo');
    
    // Загрузка данных пользователя из localStorage
    function loadUserData() {
        const userId = localStorage.getItem('currentUserId');
        const userName = localStorage.getItem('currentUserName');
        const userLogin = localStorage.getItem('currentUser');
        
        if (userId) {
            // Пользователь авторизован
            userNameDisplay.textContent = userName || userLogin || 'Пользователь';
            
            if (userIdDisplay) {
                userIdDisplay.textContent = 'Ваш ID: ' + userId;
                userIdDisplay.style.display = 'block';
            }
            
            if (userLoginDisplay) {
                userLoginDisplay.textContent = 'Ваш логин: ' + (userLogin || '');
                userLoginDisplay.style.display = 'block';
            }
            
            // Кнопка "В качалку" активна
            if (profileBtn) {
                profileBtn.style.display = 'block';
            }
            
            // Кнопка "Выйти" видна
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
            
            // Аватар
            const userAvatar = localStorage.getItem('currentUserAvatar');
            if (userAvatar && userAvatar !== 'null' && userAvatar !== '') {
                avatarImg.src = userAvatar;
                avatarImg.style.display = 'block';
                avatarText.style.display = 'none';
            } else {
                const firstLetter = (userName || userLogin || 'П').charAt(0).toUpperCase();
                avatarText.textContent = firstLetter;
                avatarText.style.display = 'flex';
                avatarImg.style.display = 'none';
            }
        } else {
            // Гость
            userNameDisplay.textContent = 'Гость';
            if (userIdDisplay) userIdDisplay.style.display = 'none';
            if (userLoginDisplay) userLoginDisplay.style.display = 'none';
            
            // Кнопка "В качалку" ведёт на логин
            if (profileBtn) {
                profileBtn.style.display = 'block';
            }
            
            // Кнопка "Выйти" скрыта
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            avatarText.textContent = '👤';
            avatarText.style.display = 'flex';
            avatarImg.style.display = 'none';
        }
    }
    
    // Переход в личный кабинет (В качалку)
    function goToProfile() {
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            window.location.href = '/user/' + userId;
        } else {
            window.location.href = '/login.html';
        }
    }
    
    // Выход
    function logout() {
        localStorage.clear();
        window.location.href = '/index.html';
    }
    
    // Обработчики событий
    if (userNameDisplay) {
        userNameDisplay.addEventListener('click', goToProfile);
    }
    
    if (avatar) {
        avatar.addEventListener('click', goToProfile);
    }
    
    if (profileBtn) {
        profileBtn.addEventListener('click', goToProfile);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    const profileCard = document.getElementById('profileCard');
    if (profileCard) {
        profileCard.addEventListener('click', goToProfile);
    }

    if (mainLogo) {
        mainLogo.addEventListener('click', function() {
            window.location.href = '/index.html';
        });
    }
    
    // Загружаем данные
    loadUserData();
    
    // Обновляем данные при изменении localStorage
    window.addEventListener('storage', function(e) {
        if (e.key === 'currentUserId') {
            loadUserData();
        }
    });
});