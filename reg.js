// reg.js - логика страницы регистрации

document.addEventListener('DOMContentLoaded', function() {
    // Глазики для показа/скрытия пароля
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

    // Элементы формы
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const loginInput = document.getElementById('login');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const nameInput = document.getElementById('name');

    // Элементы ошибок
    const loginError = document.getElementById('loginError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmError');
    const nameError = document.getElementById('nameError');

    // Регулярные выражения
    const loginRegex = /^[a-z\-]+$/;
    const passwordRegex = /^[a-zA-Z0-9]+$/;
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

    // Очистка логина при вводе
    loginInput.addEventListener('input', function() {
        this.value = this.value.toLowerCase().replace(/[^a-z\-]/g, '');
        validateLogin();
    });

    // Очистка почты при вводе
    emailInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        validateEmail();
    });

    // Очистка пароля при вводе (латиница + цифры)
    passwordInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        validatePassword();
        if (confirmInput.value) validateConfirm();
    });

    confirmInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        validateConfirm();
    });

    function validateLogin() {
        const value = loginInput.value.trim();
        if (value === '') {
            loginError.textContent = 'Логин обязателен';
            loginError.classList.add('show');
            return false;
        }
        if (!loginRegex.test(value)) {
            loginError.textContent = 'Только латинские буквы a-z и тире';
            loginError.classList.add('show');
            return false;
        }
        if (value.length < 3) {
            loginError.textContent = 'Минимум 3 символа';
            loginError.classList.add('show');
            return false;
        }
        if (value.length > 50) {
            loginError.textContent = 'Максимум 50 символов';
            loginError.classList.add('show');
            return false;
        }
        loginError.classList.remove('show');
        return true;
    }

    function validateEmail() {
        const value = emailInput.value.trim();
        if (value === '') {
            emailError.textContent = 'Email обязателен';
            emailError.classList.add('show');
            return false;
        }
        if (!emailRegex.test(value)) {
            emailError.textContent = 'Введите корректный email';
            emailError.classList.add('show');
            return false;
        }
        emailError.classList.remove('show');
        return true;
    }

    function validatePassword() {
        const value = passwordInput.value;
        if (value === '') {
            passwordError.textContent = 'Пароль обязателен';
            passwordError.classList.add('show');
            return false;
        }
        if (!passwordRegex.test(value)) {
            passwordError.textContent = 'Только латинские буквы и цифры';
            passwordError.classList.add('show');
            return false;
        }
        if (value.length < 4) {
            passwordError.textContent = 'Минимум 4 символа';
            passwordError.classList.add('show');
            return false;
        }
        if (value.length > 50) {
            passwordError.textContent = 'Максимум 50 символов';
            passwordError.classList.add('show');
            return false;
        }
        passwordError.classList.remove('show');
        return true;
    }

    function validateConfirm() {
        if (confirmInput.value === '') {
            confirmError.textContent = 'Повторите пароль';
            confirmError.classList.add('show');
            return false;
        }
        if (passwordInput.value !== confirmInput.value) {
            confirmError.textContent = 'Пароли не совпадают';
            confirmError.classList.add('show');
            return false;
        }
        confirmError.classList.remove('show');
        return true;
    }

    function validateName() {
        const value = nameInput.value.trim();
        if (value === '') {
            nameError.textContent = 'Имя обязательно';
            nameError.classList.add('show');
            return false;
        }
        if (value.length < 2) {
            nameError.textContent = 'Минимум 2 символа';
            nameError.classList.add('show');
            return false;
        }
        if (value.length > 15) {
            nameError.textContent = 'Максимум 15 символов';
            nameError.classList.add('show');
            return false;
        }
        nameError.classList.remove('show');
        return true;
    }

    loginInput.addEventListener('input', validateLogin);
    emailInput.addEventListener('input', validateEmail);
    passwordInput.addEventListener('input', validatePassword);
    confirmInput.addEventListener('input', validateConfirm);
    nameInput.addEventListener('input', validateName);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isLoginValid = validateLogin();
        const isEmailValid = validateEmail();
        const isPasswordValid = validatePassword();
        const isConfirmValid = validateConfirm();
        const isNameValid = validateName();

        if (!isLoginValid || !isEmailValid || !isPasswordValid || !isConfirmValid || !isNameValid) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистрация...';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: loginInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passwordInput.value,
                    confirmPassword: confirmInput.value,
                    name: nameInput.value.trim()
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
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
                
                window.location.href = '/index.html';
            } else {
                alert(data.error || 'Ошибка регистрации');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Зарегистрироваться';
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка подключения к серверу');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрироваться';
        }
    });
});