// forgot.js - логика страницы восстановления пароля

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotForm');
    const submitBtn = document.getElementById('submitBtn');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

    // Модальное окно
    const modal = document.getElementById('passwordModal');
    const modalLogin = document.getElementById('modalLogin');
    const modalPassword = document.getElementById('modalPassword');
    const modalClose = document.querySelector('.password-modal-close');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    function showModal(login, password) {
        modalLogin.textContent = 'Логин: ' + login;
        modalPassword.textContent = password;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) closeModal();
    });

    emailInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        validateEmail();
    });

    function validateEmail() {
        const value = emailInput.value.trim();
        if (value === '') {
            emailError.textContent = 'Введите email';
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateEmail()) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value.trim() })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Парсим сообщение: "Логин: dante, пароль: lasha"
                const match = data.message.match(/Логин: (.*?), пароль: (.*)/);
                if (match) {
                    showModal(match[1], match[2]);
                } else {
                    alert(data.message);
                }
                form.reset();
            } else {
                alert(data.error || 'Пользователь не найден');
            }
        } catch (err) {
            alert('Ошибка подключения к серверу');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });
});