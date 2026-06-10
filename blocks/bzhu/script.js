// Калькулятор БЖУ + поиск продуктов через свой сервер

// Коэффициенты
const PROTEIN_CAL = 4;
const FAT_CAL = 9;
const CARBS_CAL = 4;

// DOM элементы
const proteinInput = document.getElementById('protein');
const fatInput = document.getElementById('fat');
const carbsInput = document.getElementById('carbs');
const totalCaloriesSpan = document.getElementById('totalCalories');
const proteinCaloriesSpan = document.getElementById('proteinCalories');
const fatCaloriesSpan = document.getElementById('fatCalories');
const carbsCaloriesSpan = document.getElementById('carbsCalories');
const resetBtn = document.getElementById('resetBtn');

// Функция расчёта
function calculate() {
    let protein = parseFloat(proteinInput.value) || 0;
    let fat = parseFloat(fatInput.value) || 0;
    let carbs = parseFloat(carbsInput.value) || 0;
    
    protein = Math.min(protein, 9999);
    fat = Math.min(fat, 9999);
    carbs = Math.min(carbs, 9999);
    
    proteinInput.value = protein;
    fatInput.value = fat;
    carbsInput.value = carbs;
    
    const proteinCal = protein * PROTEIN_CAL;
    const fatCal = fat * FAT_CAL;
    const carbsCal = carbs * CARBS_CAL;
    const total = proteinCal + fatCal + carbsCal;
    
    totalCaloriesSpan.textContent = Math.round(total);
    proteinCaloriesSpan.textContent = Math.round(proteinCal) + ' ккал';
    fatCaloriesSpan.textContent = Math.round(fatCal) + ' ккал';
    carbsCaloriesSpan.textContent = Math.round(carbsCal) + ' ккал';
    
    saveToLocalStorage();
}

// Сохранение в localStorage
function saveToLocalStorage() {
    const data = {
        protein: proteinInput.value,
        fat: fatInput.value,
        carbs: carbsInput.value
    };
    localStorage.setItem('bzhu_data', JSON.stringify(data));
}

// Загрузка из localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('bzhu_data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.protein !== undefined) proteinInput.value = data.protein;
            if (data.fat !== undefined) fatInput.value = data.fat;
            if (data.carbs !== undefined) carbsInput.value = data.carbs;
        } catch (e) {}
    }
    calculate();
}

// Сброс
function resetAll() {
    proteinInput.value = '0';
    fatInput.value = '0';
    carbsInput.value = '0';
    calculate();
}

// Экранирование HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Обработчики
proteinInput.addEventListener('input', calculate);
fatInput.addEventListener('input', calculate);
carbsInput.addEventListener('input', calculate);
resetBtn.addEventListener('click', resetAll);

// Инициализация
loadFromLocalStorage();

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