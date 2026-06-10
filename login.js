// login.js - логика страницы входа

document.addEventListener('DOMContentLoaded', function() {
    // Глазик для показа/скрытия пароля
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    });

    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const passwordError = document.getElementById('passwordError');

    // Очистка логина
    loginInput.addEventListener('input', function() {
        this.value = this.value.toLowerCase().replace(/[^a-z\-]/g, '');
        validateLogin();
    });

    // Очистка пароля
    passwordInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        validatePassword();
    });

    function validateLogin() {
        const value = loginInput.value.trim();
        if (value === '') {
            loginError.textContent = 'Введите логин';
            loginError.classList.add('show');
            return false;
        }
        if (value.length < 3) {
            loginError.textContent = 'Минимум 3 символа';
            loginError.classList.add('show');
            return false;
        }
        loginError.classList.remove('show');
        return true;
    }

    function validatePassword() {
        const value = passwordInput.value;
        if (value === '') {
            passwordError.textContent = 'Введите пароль';
            passwordError.classList.add('show');
            return false;
        }
        if (value.length < 4) {
            passwordError.textContent = 'Минимум 4 символа';
            passwordError.classList.add('show');
            return false;
        }
        passwordError.classList.remove('show');
        return true;
    }

    loginInput.addEventListener('input', validateLogin);
    passwordInput.addEventListener('input', validatePassword);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isLoginValid = validateLogin();
        const isPasswordValid = validatePassword();

        if (!isLoginValid || !isPasswordValid) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Вход...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: loginInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Сохраняем данные пользователя в localStorage
                localStorage.setItem('currentUser', data.user.login);
                localStorage.setItem('currentUserName', data.user.name);
                localStorage.setItem('currentUserEmail', data.user.email);
                localStorage.setItem('currentUserId', data.user.id);
                localStorage.setItem('currentUserDiscount', data.user.discount);
                localStorage.setItem('currentUserBio', data.user.bio || '');
                localStorage.setItem('currentUserCity', data.user.city || '');
                localStorage.setItem('currentUserPhone', data.user.phone || '');
                localStorage.setItem('currentUserWebsite', data.user.website || '');
                localStorage.setItem('currentUserAvatar', data.user.avatar || null);

                // Переход на главную страницу
                window.location.href = '/index.html';
            } else {
                alert(data.error || 'Неверный логин или пароль');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Войти';
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка подключения к серверу');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Войти';
        }
    });
});