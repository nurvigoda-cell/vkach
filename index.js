document.addEventListener('DOMContentLoaded', function () {
    // ========== СОСТОЯНИЕ АВТОРИЗАЦИИ ==========
    let currentUser = localStorage.getItem('currentUser') || null;
    let currentUserName = localStorage.getItem('currentUserName') || null;
    let currentUserBio = localStorage.getItem('currentUserBio') || null;
    let currentUserId = localStorage.getItem('currentUserId') || null;
    let currentUserAvatar = localStorage.getItem('currentUserAvatar') || null;

    const userNameEl = document.getElementById('userName');
    const userBioEl = document.getElementById('userBio');
    const avatarEl = document.getElementById('avatar');

    const menuLoginBtn = document.getElementById('menuLoginBtn');
    const menuLogoutBtn = document.getElementById('menuLogoutBtn');
    const menuRegisterBtn = document.getElementById('menuRegisterBtn');
    const personalAccountLink = document.getElementById('navProfile');

    function goToUserPage() {
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            window.location.href = '/user/' + userId;
        } else {
            window.location.href = '/login.html';
        }
    }

    function updateAuthUI() {
        if (currentUser && currentUserId) {
            const displayName = currentUserName || currentUser;
            userNameEl.textContent = displayName;
            userBioEl.textContent = currentUserBio || 'Расскажите о себе';
            
            avatarEl.innerHTML = '';
            
            if (currentUserAvatar && currentUserAvatar !== 'null' && currentUserAvatar !== '') {
                const img = document.createElement('img');
                img.src = currentUserAvatar;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                avatarEl.appendChild(img);
            } else {
                avatarEl.textContent = displayName.charAt(0).toUpperCase();
                avatarEl.style.display = 'flex';
                avatarEl.style.alignItems = 'center';
                avatarEl.style.justifyContent = 'center';
            }
            
            if (menuLoginBtn) menuLoginBtn.style.display = 'none';
            if (menuLogoutBtn) menuLogoutBtn.style.display = 'block';
            if (menuRegisterBtn) menuRegisterBtn.style.display = 'none';
            
            userNameEl.style.cursor = 'pointer';
            userNameEl.style.textDecoration = 'underline';
            
            if (personalAccountLink && currentUserId) {
                personalAccountLink.onclick = function() {
                    window.location.href = '/user/' + currentUserId;
                };
            }
        } else {
            userNameEl.textContent = 'Гость';
            userBioEl.textContent = 'Обо мне...';
            avatarEl.innerHTML = '';
            avatarEl.textContent = '👤';
            avatarEl.style.display = 'flex';
            avatarEl.style.alignItems = 'center';
            avatarEl.style.justifyContent = 'center';
            
            if (menuLoginBtn) menuLoginBtn.style.display = 'block';
            if (menuLogoutBtn) menuLogoutBtn.style.display = 'none';
            if (menuRegisterBtn) menuRegisterBtn.style.display = 'block';
            
            userNameEl.style.cursor = 'default';
            userNameEl.style.textDecoration = 'none';
            
            if (personalAccountLink) {
                personalAccountLink.onclick = function() {
                    window.location.href = '/login.html';
                };
            }
        }
    }

    if (userNameEl) userNameEl.addEventListener('click', goToUserPage);
    if (avatarEl) avatarEl.addEventListener('click', goToUserPage);

    function logout() {
        localStorage.clear();
        currentUser = null;
        currentUserName = null;
        currentUserBio = null;
        currentUserId = null;
        currentUserAvatar = null;
        updateAuthUI();
        window.location.href = 'index.html';
    }

    if (menuLogoutBtn) menuLogoutBtn.addEventListener('click', logout);

    // ========== БУРГЕР-МЕНЮ ==========
    const hamburger = document.getElementById('burgerMenu');
    const mobileMenu = document.getElementById('burgerModal');
    const closeBtn = document.querySelector('.close-modal');
    
    function openMenu() {
        mobileMenu.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        mobileMenu.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    if (hamburger) hamburger.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    window.addEventListener('click', function(event) {
        if (event.target === mobileMenu) closeMenu();
    });

    // ========== ПОИСК ==========
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.service-card');
    if (searchInput) {
        function filterProducts() {
            const term = searchInput.value.toLowerCase().trim();
            cards.forEach(card => {
                const text = (card.querySelector('.service-title')?.textContent || '') + ' ' +
                             (card.querySelector('.service-description')?.textContent || '') + ' ' +
                             (card.querySelector('.service-price')?.textContent || '') + ' ' +
                             (card.getAttribute('data-name') || '');
                if (term === '' || text.toLowerCase().includes(term)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        }
        searchInput.addEventListener('input', filterProducts);
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') filterProducts(); });
    }

    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            alert('Переход на страницу товара: ' + (card.querySelector('.service-title')?.textContent || 'Товар'));
        });
    });

    updateAuthUI();
});