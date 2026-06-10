// Конвертер Фунты/КГ

let currentDirection = 'lb_to_kg'; // 'lb_to_kg' или 'kg_to_lb'

// Коэффициенты
const LB_TO_KG = 0.45359237;
const KG_TO_LB = 2.20462262;

// DOM элементы
const fromLabel = document.getElementById('fromLabel');
const toLabel = document.getElementById('toLabel');
const inputValue = document.getElementById('inputValue');
const resultValue = document.getElementById('resultValue');
const formulaText = document.getElementById('formulaText');
const exampleText = document.getElementById('exampleText');
const directionBtns = document.querySelectorAll('.direction-btn');
const swapBtn = document.getElementById('swapBtn');
const presetBtns = document.querySelectorAll('.preset-btn');

// Функция конвертации
function convert() {
    let input = parseFloat(inputValue.value);
    if (isNaN(input)) input = 0;
    
    let result;
    if (currentDirection === 'lb_to_kg') {
        result = input * LB_TO_KG;
    } else {
        result = input * KG_TO_LB;
    }
    
    resultValue.textContent = result.toFixed(2);
}

// Обновить UI при смене направления
function updateUI() {
    if (currentDirection === 'lb_to_kg') {
        fromLabel.textContent = 'Фунты (lb)';
        toLabel.textContent = 'Килограммы (кг)';
        formulaText.textContent = '1 фунт = 0.4536 кг';
        exampleText.textContent = 'Олимпийский гриф: 45 lb ≈ 20.4 кг';
    } else {
        fromLabel.textContent = 'Килограммы (кг)';
        toLabel.textContent = 'Фунты (lb)';
        formulaText.textContent = '1 кг = 2.2046 фунта';
        exampleText.textContent = 'Штанга 100 кг ≈ 220.5 lb';
    }
    
    // Обновить активную кнопку
    directionBtns.forEach(btn => {
        if (btn.dataset.dir === currentDirection) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    convert();
}

// Сменить направление
function setDirection(direction) {
    currentDirection = direction;
    updateUI();
    saveSettings();
}

// Поменять местами
function swapDirection() {
    if (currentDirection === 'lb_to_kg') {
        setDirection('kg_to_lb');
    } else {
        setDirection('lb_to_kg');
    }
}

// Установить значение из пресета
function setPreset(value) {
    inputValue.value = value;
    convert();
    saveSettings();
}

// Сохраняем настройки
function saveSettings() {
    localStorage.setItem('funtikg_direction', currentDirection);
    localStorage.setItem('funtikg_last_value', inputValue.value);
}

// Загружаем настройки
function loadSettings() {
    const savedDir = localStorage.getItem('funtikg_direction');
    if (savedDir && (savedDir === 'lb_to_kg' || savedDir === 'kg_to_lb')) {
        currentDirection = savedDir;
    }
    const savedValue = localStorage.getItem('funtikg_last_value');
    if (savedValue && !isNaN(parseFloat(savedValue))) {
        inputValue.value = savedValue;
    }
    updateUI();
}

// Обработчики событий
directionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setDirection(btn.dataset.dir);
    });
});

swapBtn.addEventListener('click', swapDirection);
inputValue.addEventListener('input', convert);
inputValue.addEventListener('change', saveSettings);

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = parseFloat(btn.dataset.value);
        setPreset(value);
    });
});

// Автосохранение при закрытии
window.addEventListener('beforeunload', saveSettings);

// Инициализация
loadSettings();

// Анимация при загрузке
setTimeout(() => {
    const card = document.querySelector('.converter-card');
    if (card) card.style.animation = 'fadeInUp 0.5s ease';
}, 100);

// Нижняя навигация
const currentUserId = localStorage.getItem('currentUserId');
const navProfileBottom = document.getElementById('navProfileBottom');
const navMessagesBottom = document.getElementById('navMessagesBottom');
const navBlocksBottom = document.getElementById('navBlocksBottom');

if (navProfileBottom) {
    navProfileBottom.addEventListener('click', () => {
        currentUserId ? window.location.href = '/user/' + currentUserId : window.location.href = '/login.html';
    });
}

if (navMessagesBottom) {
    navMessagesBottom.addEventListener('click', () => {
        if (currentUserId) {
            if (typeof window.openMessagesModal === 'function') window.openMessagesModal();
            else window.location.href = '/user/' + currentUserId;
        } else {
            window.location.href = '/login.html';
        }
    });
}

if (navBlocksBottom) {
    navBlocksBottom.addEventListener('click', () => window.location.href = '/blocks.html');
}