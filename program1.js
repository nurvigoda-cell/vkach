// program1.js - Основные переменные, инициализация, загрузка данных из БД

// ========== ПЕРЕМЕННЫЕ ==========
let protocolId = null;
let protocolName = '';
let programData = {
    title: '',
    days: [{ name: 'День 1', exercises: [], comments: '' }],
    globalComments: ''
};
let currentDayIndex = 0;
let collapsedExercises = {};
let isLoading = true;
let saveTimeout = null;
let isSaving = false;

// Переменные для модального окна комментариев
let currentCommentExerciseId = null;
let currentCommentIndex = null;

// Переменные для слайдера фото
let currentSliderExerciseId = null;
let currentSliderPhotoIndex = 0;
let currentSliderPhotos = [];

// Переменные для выбора диапазона повторений
let currentRepsInput = null;
let currentRepsExerciseId = null;
let currentRepsSetIndex = null;
let currentRepsFrom = 1;
let currentRepsTo = 10;
let isMaxSelected = false;

// Переменные для выбора веса
let currentWeightInput = null;
let currentWeightExerciseId = null;
let currentWeightSetIndex = null;
let currentWeightValue = 0;

// ========== ЭЛЕМЕНТЫ DOM ==========
const programTitle = document.getElementById('programTitle');
const backBtn = document.getElementById('backBtn');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const addDayBtn = document.getElementById('addDayBtn');
const daysTabs = document.getElementById('daysTabs');
const exercisesList = document.getElementById('exercisesList');
const searchInput = document.getElementById('exerciseSearchInput');

// Элементы для комментариев к тренировке
const workoutCommentsTextarea = document.getElementById('workoutComments');
const workoutCommentsCounter = document.getElementById('workoutCommentsCounter');
const saveWorkoutCommentsBtn = document.getElementById('saveWorkoutCommentsBtn');
const workoutCommentsHint = document.querySelector('.workout-comments-hint');

// Элементы модального окна комментариев
const commentModal = document.getElementById('commentModal');
const commentModalTitle = document.getElementById('commentModalTitle');
const commentTextarea = document.getElementById('commentTextarea');
const commentCharCounter = document.getElementById('commentCharCounter');
const commentSaveBtn = document.getElementById('commentSaveBtn');
const commentCancelBtn = document.getElementById('commentCancelBtn');
const commentModalClose = document.querySelector('.comment-modal-close');

// Элементы модального окна для выбора диапазона повторений
const repsRangeModal = document.getElementById('repsRangeModal');
const repsFromList = document.getElementById('repsFromList');
const repsToList = document.getElementById('repsToList');
const repsPreviewValue = document.getElementById('repsPreviewValue');
const repsRangeClose = document.querySelector('.reps-range-close');
const repsRangeCancel = document.querySelector('.reps-range-cancel');
const repsRangeConfirm = document.querySelector('.reps-range-confirm');

// Элементы модального окна для выбора веса
const weightModal = document.getElementById('weightModal');
const weightList = document.getElementById('weightList');
const weightPreviewValue = document.getElementById('weightPreviewValue');
const weightModalClose = document.querySelector('.weight-modal-close');
const weightCancel = document.querySelector('.weight-cancel');
const weightConfirm = document.querySelector('.weight-confirm');

// Элементы модального окна копирования
const copyConfirmDialog = document.getElementById('copyConfirmDialog');
const copyConfirmMessage = document.getElementById('copyConfirmMessage');
const copyConfirmOk = document.getElementById('copyConfirmOk');
const copyConfirmCancel = document.getElementById('copyConfirmCancel');

// Элементы модального окна редактирования названия упражнения
const editNameDialog = document.getElementById('editNameDialog');
const editNameInput = document.getElementById('editNameInput');
const editNameCounter = document.getElementById('editNameCounter');
const editNameOk = document.getElementById('editNameOk');
const editNameCancel = document.getElementById('editNameCancel');

// Нижняя навигация
const navProfileBottom = document.getElementById('navProfileBottom');
const navMessagesBottom = document.getElementById('navMessagesBottom');
const navBlocksBottom = document.getElementById('navBlocksBottom');

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С API ==========

async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(url, options);
    return response.json();
}

// Автосохранение с debounce
function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        if (isSaving) return;
        isSaving = true;
        try {
            await saveProgramDataToDB();
            console.log('✅ Автосохранение выполнено');
        } catch (err) {
            console.error('❌ Ошибка автосохранения:', err);
        } finally {
            isSaving = false;
        }
    }, 1000);
}

// Загрузка данных протокола из БД
async function loadProgramDataFromDB() {
    if (!protocolId) return false;
    
    try {
        const result = await apiRequest(`/api/protocol-data/${protocolId}`);
        
        if (result.success && result.data) {
            programData = {
                title: protocolName,
                days: result.data.days || [{ name: 'День 1', exercises: [], comments: '' }]
            };
            
            programTitle.textContent = programData.title;
            
            // Загружаем состояние свёрнутости из данных упражнений
            collapsedExercises = {};
            programData.days.forEach(day => {
                day.exercises.forEach(exercise => {
                    if (exercise.is_collapsed) {
                        collapsedExercises[exercise.id] = true;
                    }
                });
            });
            
            loadCurrentDayComments();
            renderDaysTabs();
            if (typeof renderExercises === 'function') renderExercises();
            return true;
        }
    } catch (err) {
        console.error('Ошибка загрузки:', err);
    }
    return false;
}

// Сохранение данных протокола в БД
async function saveProgramDataToDB() {
    if (!protocolId) return false;
    
    if (workoutCommentsTextarea && programData.days && programData.days[currentDayIndex]) {
        programData.days[currentDayIndex].comments = workoutCommentsTextarea.value;
    }
    
    try {
        const result = await apiRequest('/api/save-protocol-data', 'POST', {
            protocolId: protocolId,
            data: {
                days: programData.days
            }
        });
        return result.success;
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        return false;
    }
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДНЯМИ ==========
function renderDaysTabs() {
    if (!daysTabs) return;
    daysTabs.innerHTML = '';
    
    const isMobile = window.innerWidth <= 768;
    const maxNameLength = isMobile ? 10 : 15;
    
    programData.days.forEach((day, idx) => {
        const tab = document.createElement('button');
        tab.className = 'day-tab';
        if (idx === currentDayIndex) tab.classList.add('active');
        tab.setAttribute('data-day-index', idx);
        
        let displayName = day.name;
        if (displayName.length > maxNameLength) {
            displayName = displayName.substring(0, maxNameLength) + '...';
        }
        
        // Для мобильной версии: название + кнопки в одной строке (вертикально)
        if (isMobile) {
            tab.innerHTML = `
                <span class="day-tab-name" title="${escapeHtml(day.name)}">${escapeHtml(displayName)}</span>
                <div class="day-tab-buttons">
                    <span class="day-tab-delete" data-action="delete" title="Удалить день">🗑️</span>
                </div>
            `;
        } else {
            // Для десктопа: название + кнопка удаления
            tab.innerHTML = `
                <span class="day-tab-name" title="${escapeHtml(day.name)}">${escapeHtml(displayName)}</span>
                <span class="day-tab-delete" data-action="delete" title="Удалить день">🗑️</span>
            `;
        }
        
        tab.onclick = (e) => {
            if (e.target.classList.contains('day-tab-delete')) {
                e.stopPropagation();
                deleteDay(idx);
            } else {
                switchDay(idx);
            }
        };
        
        
        daysTabs.appendChild(tab);
    });
}

async function deleteDay(dayIndex) {
    if (programData.days.length === 1) {
        await showCustomAlert('Нельзя удалить единственный день тренировки', 'Предупреждение', '⚠️');
        return;
    }
    
    const confirmed = await showCustomConfirm(`Удалить день "${programData.days[dayIndex].name}"?`, 'Удаление дня');
    if (confirmed) {
        programData.days.splice(dayIndex, 1);
        
        if (currentDayIndex >= programData.days.length) {
            currentDayIndex = programData.days.length - 1;
        } else if (currentDayIndex > dayIndex) {
            currentDayIndex--;
        }
        
        scheduleAutoSave();
        
        renderDaysTabs();
        loadCurrentDayComments();
        if (typeof renderExercises === 'function') renderExercises();
    }
}

async function switchDay(dayIndex) {
    if (dayIndex === currentDayIndex) return;
    
    await saveCurrentDayComments();
    saveCurrentCollapsedState();
    
    currentDayIndex = dayIndex;
    
    loadCollapsedStateForDay();
    loadCurrentDayComments();
    
    renderDaysTabs();
    if (typeof renderExercises === 'function') renderExercises();
}

async function saveCurrentDayComments() {
    if (!workoutCommentsTextarea) return;
    if (programData.days && programData.days[currentDayIndex]) {
        programData.days[currentDayIndex].comments = workoutCommentsTextarea.value;
        scheduleAutoSave();
    }
}

function loadCurrentDayComments() {
    if (!workoutCommentsTextarea) return;
    const currentComments = programData.days[currentDayIndex]?.comments || '';
    workoutCommentsTextarea.value = currentComments;
    updateWorkoutCommentsCounter();
    
    const currentDayName = programData.days[currentDayIndex]?.name || 'эту тренировку';
    if (workoutCommentsHint) {
        workoutCommentsHint.textContent = `Заметки для "${currentDayName}"`;
    }
}

async function addNewDay() {
    const newDayName = `День ${programData.days.length + 1}`;
    programData.days.push({ name: newDayName, exercises: [], comments: '' });
    scheduleAutoSave();
    currentDayIndex = programData.days.length - 1;
    collapsedExercises = {};
    renderDaysTabs();
    loadCurrentDayComments();
    if (typeof renderExercises === 'function') renderExercises();
    showCustomAlert(`➕ Добавлен "${newDayName}"`, 'Готово', '✅');
}

function saveCurrentCollapsedState() {
    const collapsedKey = `program_collapsed_${protocolId}`;
    localStorage.setItem(collapsedKey, JSON.stringify(collapsedExercises));
}

function loadCollapsedStateForDay() {
    const collapsedKey = `program_collapsed_${protocolId}`;
    const saved = localStorage.getItem(collapsedKey);
    collapsedExercises = saved ? JSON.parse(saved) : {};
}

// padding не нужен — используется flex-layout

// ========== ЗАГРУЗКА ДАННЫХ ==========
const urlParams = new URLSearchParams(window.location.search);
protocolId = urlParams.get('id');
protocolName = urlParams.get('name') || 'Протокол тренировок';

async function init() {
    if (protocolId) {
        await loadProgramDataFromDB();
    } else {
        showCustomAlert('Ошибка: не указан ID протокола', 'Ошибка', '❌');
        setTimeout(() => { window.location.href = '/protocols.html'; }, 1500);
    }
}

function saveProgramData() {
    scheduleAutoSave();
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С КОММЕНТАРИЯМИ К ДНЮ ==========
function updateWorkoutCommentsCounter() {
    if (!workoutCommentsTextarea || !workoutCommentsCounter) return;
    const len = workoutCommentsTextarea.value.length;
    workoutCommentsCounter.textContent = `${len}/1000`;
    workoutCommentsCounter.classList.remove('warning', 'danger');
    if (len > 900) {
        workoutCommentsCounter.classList.add('danger');
    } else if (len > 800) {
        workoutCommentsCounter.classList.add('warning');
    }
}

async function saveWorkoutComments() {
    if (!workoutCommentsTextarea || !programData.days || !programData.days[currentDayIndex]) return;
    programData.days[currentDayIndex].comments = workoutCommentsTextarea.value;
    scheduleAutoSave();
    
    const currentDayName = programData.days[currentDayIndex].name;
    showCustomAlert(`💾 Заметки для "${currentDayName}" сохранены!`, 'Готово', '✅');
}

// ========== ЭКРАНИРОВАНИЕ HTML ==========
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== НАВИГАЦИЯ ==========
if (backBtn) {
    backBtn.addEventListener('click', function() {
        window.location.href = '/protocols.html';
    });
}

if (addExerciseBtn) {
    addExerciseBtn.addEventListener('click', function() {
        if (typeof addExercise === 'function') addExercise();
    });
}

if (addDayBtn) {
    addDayBtn.addEventListener('click', addNewDay);
}

if (workoutCommentsTextarea) {
    workoutCommentsTextarea.addEventListener('input', function() {
        updateWorkoutCommentsCounter();
        scheduleAutoSave();
    });
}

if (saveWorkoutCommentsBtn) {
    saveWorkoutCommentsBtn.addEventListener('click', saveWorkoutComments);
}

// Слушаем изменение размера окна для обновления рендеринга дней при повороте
window.addEventListener('resize', function() {
    renderDaysTabs();
});

const currentUserId = localStorage.getItem('currentUserId');

if (navProfileBottom) {
    navProfileBottom.addEventListener('click', function() {
        if (currentUserId) window.location.href = '/user/' + currentUserId;
        else window.location.href = '/login.html';
    });
}

if (navMessagesBottom) {
    navMessagesBottom.addEventListener('click', function() {
        if (currentUserId) {
            if (typeof window.openChatWithUser === 'function') window.openChatWithUser(currentUserId);
            else window.location.href = '/user/' + currentUserId;
        } else window.location.href = '/login.html';
    });
}

if (navBlocksBottom) {
    navBlocksBottom.addEventListener('click', function() {
        window.location.href = '/blocks.html';
    });
}

// Запуск инициализации
// При токен-режиме init() перехватывается program_share.js
if (!new URLSearchParams(window.location.search).get('token')) {
    init();
}