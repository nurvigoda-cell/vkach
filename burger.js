// burger.js v2.0 — универсальный бургер с анимацией

document.addEventListener('DOMContentLoaded', function () {

    const burgerMenu = document.getElementById('burgerMenu');
    const modal      = document.getElementById('burgerModal');
    if (!modal) return;

    const content   = modal.querySelector('.burger-modal-content');
    const closeBtn  = modal.querySelector('.close-modal');

    /* ===== ОТКРЫТЬ ===== */
    function openMenu() {
        modal.style.display = 'flex';
        // небольшая задержка чтобы display успел применится до анимации
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                modal.classList.add('open');
            });
        });
        document.body.style.overflow = 'hidden';

        // Анимируем гамбургер → крестик
        if (burgerMenu) burgerMenu.classList.add('active');
    }

    /* ===== ЗАКРЫТЬ ===== */
    function closeMenu() {
        modal.classList.remove('open');
        if (burgerMenu) burgerMenu.classList.remove('active');
        document.body.style.overflow = '';

        // Скрываем после окончания анимации
        content && content.addEventListener('transitionend', function handler() {
            if (!modal.classList.contains('open')) {
                modal.style.display = 'none';
            }
            content.removeEventListener('transitionend', handler);
        });
    }

    /* ===== СОБЫТИЯ ===== */
    if (burgerMenu) burgerMenu.addEventListener('click', openMenu);
    if (closeBtn)   closeBtn.addEventListener('click', closeMenu);

    // Клик по затемнённому фону
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeMenu();
    });

    // Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('open')) closeMenu();
    });

    /* ===== НАВИГАЦИЯ ===== */
    const navProfile = document.getElementById('navProfile');
    if (navProfile) {
        navProfile.addEventListener('click', function () {
            const userId = localStorage.getItem('currentUserId');
            window.location.href = userId ? '/user/' + userId : '/login.html';
        });
    }

    const navBlocks = document.getElementById('navBlocks');
    if (navBlocks) {
        navBlocks.addEventListener('click', function () {
            window.location.href = '/blocks.html';
        });
    }

    /* ===== АУТЕНТИФИКАЦИЯ ===== */
    function updateMenuByAuth() {
        const userId      = localStorage.getItem('currentUserId');
        const loginBtn    = document.getElementById('menuLoginBtn');
        const registerBtn = document.getElementById('menuRegisterBtn');
        const logoutBtn   = document.getElementById('menuLogoutBtn');

        if (userId) {
            if (loginBtn)    loginBtn.style.display    = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (logoutBtn)   logoutBtn.style.display   = 'flex';
            // Центр управления — только для ID=1
            const adminLink = document.getElementById('menuAdminLink');
            if (adminLink) adminLink.style.display = (userId === '1' || userId === '5') ? 'flex' : 'none';
        } else {
            if (loginBtn)    loginBtn.style.display    = 'flex';
            if (registerBtn) registerBtn.style.display = 'flex';
            if (logoutBtn)   logoutBtn.style.display   = 'none';
        }
    }

    const logoutBtn = document.getElementById('menuLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            localStorage.clear();
            window.location.href = '/login.html';
        });
    }

    updateMenuByAuth();
});
