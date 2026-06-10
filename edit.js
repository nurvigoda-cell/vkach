// edit.js - логика страницы редактирования профиля

document.addEventListener('DOMContentLoaded', function() {
    // Принудительная очистка полей почты и пароля при загрузке страницы
    setTimeout(function() {
        const newEmailInput = document.getElementById('newEmail');
        const oldPasswordInput = document.getElementById('oldPassword');
        const newPasswordInput = document.getElementById('newPassword');
        
        if (newEmailInput) newEmailInput.value = '';
        if (oldPasswordInput) oldPasswordInput.value = '';
        if (newPasswordInput) newPasswordInput.value = '';
    }, 100);
    
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user') || localStorage.getItem('currentUserId');
    
    if (!userId) {
        alert('Ошибка: пользователь не найден');
        window.location.href = '/login.html';
        return;
    }
    
    // Элементы для отображения логина и ID
    const userLoginDisplay = document.getElementById('userLoginDisplay');
    const userIdDisplay = document.getElementById('userIdDisplay');
    
    // Элементы модального окна
    const successModal = document.getElementById('successModal');
    const modalClose = document.querySelector('.success-modal-close');
    const modalCloseBtn = document.getElementById('successModalCloseBtn');
    
    function showSuccessModal(message) {
        const msgElement = document.getElementById('successMessage');
        if (msgElement) msgElement.textContent = message || 'Ваши данные сохранены';
        successModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeSuccessModal() {
        successModal.style.display = 'none';
        document.body.style.overflow = '';
        window.location.href = '/user/' + userId;
    }
    
    if (modalClose) modalClose.addEventListener('click', closeSuccessModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuccessModal);
    window.addEventListener('click', function(event) {
        if (event.target === successModal) closeSuccessModal();
    });
    
    // Элементы для глазков
    document.querySelectorAll('.toggle-password-eye').forEach(button => {
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
    
    // Запрет кириллицы в полях пароля
    const oldPasswordInput = document.getElementById('oldPassword');
    const newPasswordInput = document.getElementById('newPassword');
    
    if (oldPasswordInput) {
        oldPasswordInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        });
    }
    
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        });
    }
    
    // Запрет кириллицы в поле почты
    const newEmailInput = document.getElementById('newEmail');
    if (newEmailInput) {
        newEmailInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9@._\-]/g, '');
        });
    }
    
    // Элементы формы
    const nameInput = document.getElementById('name');
    const bioTextarea = document.getElementById('bio');
    const citySelect = document.getElementById('city');
    const phoneInput = document.getElementById('phone');
    const websiteInput = document.getElementById('website');
    const bioCounter = document.getElementById('bioCounter');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const nameError = document.getElementById('nameError');
    const bioError = document.getElementById('bioError');
    const phoneError = document.getElementById('phoneError');
    
    // Элементы для смены почты
    const changeEmailBtn = document.getElementById('changeEmailBtn');
    const emailError = document.getElementById('emailError');
    
    // Элементы для смены пароля
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordError = document.getElementById('passwordError');
    
    // Элементы аватара
    const avatarImg = document.getElementById('avatarImg');
    const avatarText = document.getElementById('avatarText');
    const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarError = document.getElementById('avatarError');
    
    // Элементы для "Кто я"
    const userTypeSelect = document.getElementById('userType');
    const userTypeCustom = document.getElementById('userTypeCustom');
    const userTypeError = document.getElementById('userTypeError');
    
    // Ограничение ввода в поле "Свой вариант" до 20 символов
    if (userTypeCustom) {
        userTypeCustom.addEventListener('input', function() {
            if (this.value.length > 20) {
                this.value = this.value.slice(0, 20);
                userTypeError.textContent = 'Максимум 20 символов';
                userTypeError.classList.add('show');
                setTimeout(() => userTypeError.classList.remove('show'), 2000);
            }
        });
    }
    
    // Загрузка данных пользователя
    let currentEmail = '';
    
    fetch(`/api/user/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.user) {
                const user = data.user;
                nameInput.value = user.name || '';
                bioTextarea.value = user.bio || '';
                citySelect.value = user.city || '';
                phoneInput.value = user.phone || '';
                websiteInput.value = user.website || '';
                currentEmail = user.email || '';
                bioCounter.textContent = (user.bio || '').length + '/200';
                
                if (userLoginDisplay) {
                    userLoginDisplay.textContent = `Логин: ${user.login}`;
                }
                if (userIdDisplay) {
                    userIdDisplay.textContent = `ID: ${user.id}`;
                }
                
                // Устанавливаем значение user_type
                if (user.user_type) {
                    const presetValues = ['Тренер', 'Спортсмен', 'Судья', 'Болельщик'];
                    if (presetValues.includes(user.user_type)) {
                        userTypeSelect.value = user.user_type;
                        userTypeCustom.style.display = 'none';
                    } else {
                        userTypeSelect.value = 'Другое';
                        userTypeCustom.style.display = 'block';
                        userTypeCustom.value = user.user_type;
                    }
                }
                
                if (user.avatar) {
                    avatarImg.src = user.avatar;
                    avatarImg.style.display = 'block';
                    avatarText.style.display = 'none';
                } else {
                    avatarText.textContent = (user.name || 'Пользователь').charAt(0).toUpperCase();
                    avatarImg.style.display = 'none';
                    avatarText.style.display = 'flex';
                }
            }
        })
        .catch(err => console.error('Ошибка:', err));
    
    // Обработчик выбора "Кто я"
    if (userTypeSelect) {
        userTypeSelect.addEventListener('change', function() {
            if (this.value === 'Другое') {
                userTypeCustom.style.display = 'block';
            } else {
                userTypeCustom.style.display = 'none';
                userTypeCustom.value = '';
            }
        });
    }
    
    // Смена почты
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', async function() {
            const newEmail = newEmailInput.value.trim();
            if (!newEmail) {
                emailError.textContent = 'Введите новую почту';
                emailError.classList.add('show');
                setTimeout(() => emailError.classList.remove('show'), 3000);
                return;
            }
            if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(newEmail)) {
                emailError.textContent = 'Введите корректный email';
                emailError.classList.add('show');
                setTimeout(() => emailError.classList.remove('show'), 3000);
                return;
            }
            
            try {
                const response = await fetch('/api/update-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, email: newEmail })
                });
                const data = await response.json();
                if (data.success) {
                    currentEmail = newEmail;
                    newEmailInput.value = '';
                    alert('Почта успешно изменена!');
                } else {
                    alert(data.error || 'Ошибка');
                }
            } catch (err) {
                alert('Ошибка подключения к серверу');
            }
        });
    }
    
    // Смена пароля
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async function() {
            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            
            if (!oldPassword || !newPassword) {
                passwordError.textContent = 'Заполните оба поля';
                passwordError.classList.add('show');
                setTimeout(() => passwordError.classList.remove('show'), 3000);
                return;
            }
            if (!/^[a-zA-Z0-9]+$/.test(newPassword)) {
                passwordError.textContent = 'Пароль: только латинские буквы и цифры';
                passwordError.classList.add('show');
                setTimeout(() => passwordError.classList.remove('show'), 3000);
                return;
            }
            if (newPassword.length < 4) {
                passwordError.textContent = 'Пароль минимум 4 символа';
                passwordError.classList.add('show');
                setTimeout(() => passwordError.classList.remove('show'), 3000);
                return;
            }
            
            try {
                const response = await fetch('/api/update-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, oldPassword, newPassword })
                });
                const data = await response.json();
                if (data.success) {
                    oldPasswordInput.value = '';
                    newPasswordInput.value = '';
                    alert('Пароль успешно изменён!');
                } else {
                    alert(data.error || 'Ошибка');
                }
            } catch (err) {
                alert('Ошибка подключения к серверу');
            }
        });
    }
    
    // Функция проверки размера изображения на фронтенде
    function checkImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = function() {
                URL.revokeObjectURL(objectUrl);
                resolve({
                    width: img.width,
                    height: img.height,
                    isValid: img.width <= 5000 && img.height <= 5000
                });
            };
            
            img.onerror = function() {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Не удалось загрузить изображение'));
            };
            
            img.src = objectUrl;
        });
    }
    
    // Загрузка аватара с подробными сообщениями
    if (uploadAvatarBtn) {
        uploadAvatarBtn.addEventListener('click', function() {
            avatarInput.click();
        });
    }
    
    if (avatarInput) {
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            avatarError.classList.remove('show');
            avatarError.textContent = '';
            
            if (!file) {
                avatarError.textContent = '❌ Файл не выбран';
                avatarError.classList.add('show');
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                avatarError.innerHTML = '❌ Неподдерживаемый формат файла.<br>📷 Допустимые форматы: JPG, JPEG, PNG, GIF';
                avatarError.classList.add('show');
                avatarInput.value = '';
                return;
            }
            
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                avatarError.innerHTML = `❌ Файл слишком большой (${sizeMB} МБ).<br>📦 Максимальный размер: 10 МБ`;
                avatarError.classList.add('show');
                avatarInput.value = '';
                return;
            }
            
            try {
                const dimensions = await checkImageDimensions(file);
                if (!dimensions.isValid) {
                    avatarError.innerHTML = `❌ Изображение слишком большое (${dimensions.width}x${dimensions.height}px).<br>📐 Максимальный размер: 5000x5000 пикселей.<br>💡 Совет: уменьшите изображение перед загрузкой.`;
                    avatarError.classList.add('show');
                    avatarInput.value = '';
                    return;
                }
            } catch (err) {
                avatarError.innerHTML = '❌ Не удалось прочитать изображение. Попробуйте другой файл.';
                avatarError.classList.add('show');
                avatarInput.value = '';
                return;
            }
            
            const formData = new FormData();
            formData.append('avatar', file);
            
            try {
                const response = await fetch('/api/upload-avatar/' + userId, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    avatarImg.src = data.avatar + '?t=' + Date.now();
                    avatarImg.style.display = 'block';
                    avatarText.style.display = 'none';
                    avatarError.classList.remove('show');
                    localStorage.setItem('currentUserAvatar', data.avatar);
                    const successMsg = document.createElement('div');
                    successMsg.textContent = '✅ Аватар успешно загружен!';
                    successMsg.style.color = '#4CAF50';
                    successMsg.style.fontSize = '12px';
                    successMsg.style.marginTop = '5px';
                    avatarError.parentNode.insertBefore(successMsg, avatarError.nextSibling);
                    setTimeout(() => successMsg.remove(), 3000);
                } else {
                    avatarError.textContent = data.error || '❌ Ошибка загрузки';
                    avatarError.classList.add('show');
                    avatarInput.value = '';
                }
            } catch (err) {
                console.error('Ошибка:', err);
                avatarError.innerHTML = '❌ Ошибка подключения к серверу.<br>🔌 Проверьте интернет-соединение';
                avatarError.classList.add('show');
                avatarInput.value = '';
            }
        });
    }
    
    if (bioTextarea) {
        bioTextarea.addEventListener('input', function() {
            const len = this.value.length;
            bioCounter.textContent = len + '/200';
            if (len > 200) {
                bioCounter.classList.add('danger');
            } else if (len > 180) {
                bioCounter.classList.add('warning');
                bioCounter.classList.remove('danger');
            } else {
                bioCounter.classList.remove('warning', 'danger');
            }
        });
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
    
    function validateBio() {
        if (bioTextarea.value.length > 200) {
            bioError.textContent = 'Не более 200 символов';
            bioError.classList.add('show');
            return false;
        }
        bioError.classList.remove('show');
        return true;
    }
    
    function validatePhone() {
        const value = phoneInput.value.trim();
        if (value !== '' && !/^[\+\d\s\-\(\)]+$/.test(value)) {
            phoneError.textContent = 'Введите корректный номер телефона';
            phoneError.classList.add('show');
            return false;
        }
        phoneError.classList.remove('show');
        return true;
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            window.location.href = '/user/' + userId;
        });
    }
    
    const form = document.getElementById('editForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateName() || !validateBio() || !validatePhone()) return;
            
            // Получаем значение user_type
            let userType = userTypeSelect.value;
            if (userType === 'Другое') {
                userType = userTypeCustom.value.trim();
                if (!userType) {
                    userTypeError.textContent = 'Введите свой вариант';
                    userTypeError.classList.add('show');
                    setTimeout(() => userTypeError.classList.remove('show'), 3000);
                    return;
                }
                if (userType.length > 20) {
                    userTypeError.textContent = 'Максимум 20 символов';
                    userTypeError.classList.add('show');
                    setTimeout(() => userTypeError.classList.remove('show'), 3000);
                    return;
                }
            }
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Сохранение...';
            
            try {
                // Обновляем user_type
                const userTypeResponse = await fetch('/api/update-user-type', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, userType })
                });
                
                if (!userTypeResponse.ok) {
                    throw new Error('Ошибка обновления user_type');
                }
                
                // Обновляем профиль
                const response = await fetch('/api/update-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        name: nameInput.value.trim(),
                        bio: bioTextarea.value.trim(),
                        city: citySelect.value,
                        phone: phoneInput.value.trim(),
                        website: websiteInput.value.trim()
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    localStorage.setItem('currentUserName', nameInput.value.trim());
                    localStorage.setItem('currentUserBio', bioTextarea.value.trim());
                    localStorage.setItem('currentUserCity', citySelect.value);
                    localStorage.setItem('currentUserPhone', phoneInput.value.trim());
                    localStorage.setItem('currentUserWebsite', websiteInput.value.trim());
                    localStorage.setItem('currentUserType', userType);
                    
                    showSuccessModal('Ваши данные успешно сохранены!');
                } else {
                    alert(data.error || 'Ошибка сохранения');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Сохранить изменения';
                }
            } catch (err) {
                console.error('Ошибка:', err);
                alert('Ошибка подключения к серверу');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Сохранить изменения';
            }
        });
    }
});