// program.js - логика страницы программы тренировок

document.addEventListener('DOMContentLoaded', function() {
    // ========== ПЕРЕМЕННЫЕ ==========
    let protocolId = null;
    let protocolName = '';
    let programData = {
        title: '',
        exercises: []
    };
    let collapsedExercises = {};
    
    // Переменные для модального окна комментариев
    let currentCommentExerciseId = null;
    let currentCommentIndex = null;
    
    // Переменные для слайдера фото
    let currentSliderExerciseId = null;
    let currentSliderPhotoIndex = 0;
    let currentSliderPhotos = [];
    
    // Переменные для редактирования названия
    let currentEditNameExerciseId = null;
    
    // Переменные для выбора диапазона повторений
    let currentRepsInput = null;
    let currentRepsExerciseId = null;
    let currentRepsSetIndex = null;
    let currentRepsFrom = 1;
    let currentRepsTo = 10;
    let isMaxSelected = false;
    
    // ========== ЭЛЕМЕНТЫ ==========
    const programTitle = document.getElementById('programTitle');
    const backBtn = document.getElementById('backBtn');
    const addExerciseBtn = document.getElementById('addExerciseBtn');
    const exercisesList = document.getElementById('exercisesList');
    const searchInput = document.getElementById('exerciseSearchInput');
    
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
    
    // Элементы модального окна копирования
    const copyConfirmDialog = document.getElementById('copyConfirmDialog');
    const copyConfirmMessage = document.getElementById('copyConfirmMessage');
    const copyConfirmOk = document.getElementById('copyConfirmOk');
    const copyConfirmCancel = document.getElementById('copyConfirmCancel');
    
    // Элементы модального окна редактирования названия
    const editNameDialog = document.getElementById('editNameDialog');
    const editNameInput = document.getElementById('editNameInput');
    const editNameCounter = document.getElementById('editNameCounter');
    const editNameOk = document.getElementById('editNameOk');
    const editNameCancel = document.getElementById('editNameCancel');
    
    // Нижняя навигация
    const navProfileBottom = document.getElementById('navProfileBottom');
    const navMessagesBottom = document.getElementById('navMessagesBottom');
    const navBlocksBottom = document.getElementById('navBlocksBottom');
    
    // ========== ФУНКЦИИ ДЛЯ ВЫБОРА ДИАПАЗОНА ПОВТОРЕНИЙ ==========
    
    // Генерация списка чисел для левого скроллера (только числа 1-100)
    function generateFromNumbers(min, max) {
        const numbers = [];
        for (let i = min; i <= max; i++) {
            numbers.push(i);
        }
        return numbers;
    }
    
    // Генерация списка для правого скроллера (Макс., затем числа, затем Макс.)
    function generateToNumbers(min, max) {
        const numbers = [];
        numbers.push('Макс.');
        for (let i = min; i <= max; i++) {
            numbers.push(i);
        }
        numbers.push('Макс.');
        return numbers;
    }
    
    // Рендер списка для левого скроллера
    function renderFromList(container, numbers, selectedValue) {
        container.innerHTML = '';
        numbers.forEach(num => {
            const div = document.createElement('div');
            div.className = 'reps-range-value';
            if (num === selectedValue) {
                div.classList.add('selected');
            }
            div.textContent = num;
            div.onclick = () => {
                currentRepsFrom = num;
                // При изменении "От", обновляем правый список
                const toNumbers = generateToNumbers(currentRepsFrom, 100);
                let newToValue = currentRepsTo;
                if (!isMaxSelected && currentRepsTo < currentRepsFrom) {
                    newToValue = currentRepsFrom;
                    currentRepsTo = currentRepsFrom;
                }
                renderToList(repsToList, toNumbers, isMaxSelected ? 'Макс.' : newToValue);
                updateRepsPreview();
                highlightSelected();
            };
            container.appendChild(div);
        });
    }
    
    // Рендер списка для правого скроллера
    function renderToList(container, numbers, selectedValue) {
        container.innerHTML = '';
        numbers.forEach(num => {
            const div = document.createElement('div');
            div.className = 'reps-range-value';
            if (num === selectedValue) {
                div.classList.add('selected');
            }
            div.textContent = num;
            div.onclick = () => {
                if (num === 'Макс.') {
                    currentRepsTo = 'Макс.';
                    isMaxSelected = true;
                } else {
                    if (num >= currentRepsFrom) {
                        currentRepsTo = num;
                        isMaxSelected = false;
                    } else {
                        // Если выбрали число меньше "От", ставим текущее "От"
                        currentRepsTo = currentRepsFrom;
                        isMaxSelected = false;
                        renderToList(repsToList, generateToNumbers(currentRepsFrom, 100), currentRepsTo);
                    }
                }
                updateRepsPreview();
                highlightSelected();
            };
            container.appendChild(div);
        });
    }
    
    function highlightSelected() {
        // Подсветка в левом списке
        document.querySelectorAll('#repsFromList .reps-range-value').forEach(el => {
            const val = parseInt(el.textContent);
            if (val === currentRepsFrom) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        
        // Подсветка в правом списке
        document.querySelectorAll('#repsToList .reps-range-value').forEach(el => {
            const val = el.textContent;
            if (isMaxSelected && val === 'Макс.') {
                el.classList.add('selected');
            } else if (!isMaxSelected && val !== 'Макс.' && parseInt(val) === currentRepsTo) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }
    
    function updateRepsPreview() {
        if (isMaxSelected) {
            repsPreviewValue.textContent = `${currentRepsFrom} — Макс.`;
        } else {
            repsPreviewValue.textContent = `${currentRepsFrom} — ${currentRepsTo}`;
        }
    }
    
    function scrollToSelected(container, selectedValue, isToContainer = false) {
        const items = container.querySelectorAll('.reps-range-value');
        for (let i = 0; i < items.length; i++) {
            const itemValue = items[i].textContent;
            if (isToContainer) {
                if ((selectedValue === 'Макс.' && itemValue === 'Макс.') || 
                    (selectedValue !== 'Макс.' && itemValue !== 'Макс.' && parseInt(itemValue) === selectedValue)) {
                    items[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                    break;
                }
            } else {
                if (parseInt(itemValue) === selectedValue) {
                    items[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                    break;
                }
            }
        }
    }
    
    function openRepsRangeModal(inputElement, exerciseId, setIndex, currentValue) {
        currentRepsInput = inputElement;
        currentRepsExerciseId = exerciseId;
        currentRepsSetIndex = setIndex;
        
        // Парсим текущее значение
        let fromVal = 1, toVal = 10;
        isMaxSelected = false;
        
        if (currentValue && currentValue.includes('Макс.')) {
            const parts = currentValue.split('—');
            fromVal = parseInt(parts[0].trim()) || 1;
            toVal = 'Макс.';
            isMaxSelected = true;
        } else if (currentValue && currentValue.includes('—')) {
            const parts = currentValue.split('—');
            fromVal = parseInt(parts[0].trim()) || 1;
            toVal = parseInt(parts[1].trim()) || 10;
        } else if (currentValue && currentValue.includes('-')) {
            const parts = currentValue.split('-');
            fromVal = parseInt(parts[0].trim()) || 1;
            toVal = parseInt(parts[1].trim()) || 10;
        } else if (currentValue && !isNaN(parseInt(currentValue))) {
            fromVal = 1;
            toVal = parseInt(currentValue) || 10;
        }
        
        currentRepsFrom = Math.max(1, Math.min(fromVal, 100));
        if (toVal === 'Макс.') {
            currentRepsTo = 'Макс.';
            isMaxSelected = true;
        } else {
            currentRepsTo = Math.max(currentRepsFrom, Math.min(toVal, 100));
            isMaxSelected = false;
        }
        
        // Рендерим левый список (только числа)
        const fromNumbers = generateFromNumbers(1, 100);
        renderFromList(repsFromList, fromNumbers, currentRepsFrom);
        
        // Рендерим правый список (Макс., числа, Макс.)
        const toNumbers = generateToNumbers(currentRepsFrom, 100);
        renderToList(repsToList, toNumbers, isMaxSelected ? 'Макс.' : currentRepsTo);
        
        updateRepsPreview();
        
        repsRangeModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            scrollToSelected(repsFromList, currentRepsFrom, false);
            scrollToSelected(repsToList, isMaxSelected ? 'Макс.' : currentRepsTo, true);
        }, 100);
    }
    
    function closeRepsRangeModal() {
        repsRangeModal.style.display = 'none';
        document.body.style.overflow = '';
        currentRepsInput = null;
    }
    
    function confirmRepsRange() {
        if (currentRepsInput && currentRepsExerciseId !== null && currentRepsSetIndex !== null) {
            let rangeValue;
            if (isMaxSelected) {
                rangeValue = `${currentRepsFrom}—Макс.`;
            } else {
                rangeValue = `${currentRepsFrom}—${currentRepsTo}`;
            }
            currentRepsInput.value = rangeValue;
            updateSet(currentRepsExerciseId, currentRepsSetIndex, 'reps', rangeValue);
        }
        closeRepsRangeModal();
    }
    
    // ========== КАСТОМНЫЕ ДИАЛОГОВЫЕ ОКНА ==========
    
    function showCustomAlert(message, title = 'Уведомление', icon = '✅') {
        return new Promise((resolve) => {
            const dialog = document.getElementById('alertDialog');
            const titleEl = document.getElementById('alertDialogTitle');
            const messageEl = document.getElementById('alertDialogMessage');
            const iconEl = document.getElementById('alertDialogIcon');
            const okBtn = document.getElementById('alertDialogOk');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            iconEl.textContent = icon;
            
            dialog.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            const onOk = () => {
                dialog.style.display = 'none';
                document.body.style.overflow = '';
                okBtn.removeEventListener('click', onOk);
                resolve();
            };
            
            okBtn.addEventListener('click', onOk);
        });
    }
    
    function showCustomConfirm(message, title = 'Подтверждение') {
        return new Promise((resolve) => {
            const dialog = document.getElementById('confirmDialog');
            const titleEl = document.getElementById('confirmDialogTitle');
            const messageEl = document.getElementById('confirmDialogMessage');
            const okBtn = document.getElementById('confirmDialogOk');
            const cancelBtn = document.getElementById('confirmDialogCancel');
            
            titleEl.textContent = title;
            messageEl.textContent = message;
            
            dialog.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            const onOk = () => {
                dialog.style.display = 'none';
                document.body.style.overflow = '';
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(true);
            };
            
            const onCancel = () => {
                dialog.style.display = 'none';
                document.body.style.overflow = '';
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                resolve(false);
            };
            
            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
        });
    }
    
    function showCopyConfirm(exerciseName) {
        return new Promise((resolve) => {
            copyConfirmMessage.textContent = `Создать дубликат упражнения "${exerciseName}"?`;
            copyConfirmDialog.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            const onOk = () => {
                copyConfirmDialog.style.display = 'none';
                document.body.style.overflow = '';
                copyConfirmOk.removeEventListener('click', onOk);
                copyConfirmCancel.removeEventListener('click', onCancel);
                resolve(true);
            };
            
            const onCancel = () => {
                copyConfirmDialog.style.display = 'none';
                document.body.style.overflow = '';
                copyConfirmOk.removeEventListener('click', onOk);
                copyConfirmCancel.removeEventListener('click', onCancel);
                resolve(false);
            };
            
            copyConfirmOk.addEventListener('click', onOk);
            copyConfirmCancel.addEventListener('click', onCancel);
        });
    }
    
    function showEditNamePrompt(currentName) {
        return new Promise((resolve) => {
            editNameInput.value = currentName;
            updateEditNameCounter();
            editNameDialog.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            editNameInput.focus();
            editNameInput.select();
            
            const onOk = () => {
                const value = editNameInput.value.trim();
                editNameDialog.style.display = 'none';
                document.body.style.overflow = '';
                editNameOk.removeEventListener('click', onOk);
                editNameCancel.removeEventListener('click', onCancel);
                resolve(value || null);
            };
            
            const onCancel = () => {
                editNameDialog.style.display = 'none';
                document.body.style.overflow = '';
                editNameOk.removeEventListener('click', onOk);
                editNameCancel.removeEventListener('click', onCancel);
                resolve(null);
            };
            
            editNameOk.addEventListener('click', onOk);
            editNameCancel.addEventListener('click', onCancel);
            
            editNameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    onOk();
                }
            });
        });
    }
    
    function updateEditNameCounter() {
        const len = editNameInput.value.length;
        editNameCounter.textContent = `${len}/100`;
        if (len > 90) {
            editNameCounter.style.color = '#ffaa00';
        } else {
            editNameCounter.style.color = '#aaa';
        }
    }
    
    // ========== ФУНКЦИЯ ДЛЯ ДИНАМИЧЕСКОГО ОТСТУПА ==========
    
    function updateScrollablePadding() {
        const fixedTop = document.querySelector('.program-fixed-top');
        const scrollable = document.querySelector('.program-scrollable');
        
        if (fixedTop && scrollable) {
            const fixedTopHeight = fixedTop.offsetHeight;
            scrollable.style.paddingTop = (fixedTopHeight + 20) + 'px';
        }
    }
    
    function refreshScrollablePadding() {
        setTimeout(() => {
            updateScrollablePadding();
        }, 100);
        setTimeout(() => {
            updateScrollablePadding();
        }, 300);
    }
    
    window.addEventListener('load', refreshScrollablePadding);
    window.addEventListener('resize', refreshScrollablePadding);
    
    // ========== ЗАГРУЗКА ДАННЫХ ==========
    
    const urlParams = new URLSearchParams(window.location.search);
    protocolId = urlParams.get('id');
    protocolName = urlParams.get('name') || 'Протокол тренировок';
    
    function loadProgramData() {
        const saved = localStorage.getItem(`program_${protocolId}`);
        if (saved) {
            programData = JSON.parse(saved);
            programData.exercises.forEach(exercise => {
                if (!exercise.comments) {
                    exercise.comments = [];
                }
                if (!exercise.photos) {
                    exercise.photos = [];
                }
                if (exercise.sets) {
                    exercise.sets.forEach(set => {
                        if (set.weight === undefined) {
                            set.weight = '0';
                        }
                        if (set.reps === undefined) {
                            set.reps = '10';
                        }
                    });
                }
            });
        } else {
            programData = {
                title: protocolName,
                exercises: []
            };
        }
        
        const savedCollapsed = localStorage.getItem(`program_collapsed_${protocolId}`);
        if (savedCollapsed) {
            collapsedExercises = JSON.parse(savedCollapsed);
        } else {
            collapsedExercises = {};
        }
        
        programTitle.textContent = programData.title;
        
        renderExercises();
        refreshScrollablePadding();
    }
    
    function saveProgramData() {
        localStorage.setItem(`program_${protocolId}`, JSON.stringify(programData));
    }
    
    function saveCollapsedState() {
        localStorage.setItem(`program_collapsed_${protocolId}`, JSON.stringify(collapsedExercises));
    }
    
    // ========== РЕНДЕРИНГ ==========
    
    function renderPhotosGrid(exercise) {
        if (!exercise.photos || exercise.photos.length === 0) {
            return `
                <div class="add-photo-btn" onclick="addExercisePhoto('${exercise.id}')">+</div>
            `;
        }
        
        let html = '';
        exercise.photos.forEach((photo, idx) => {
            html += `
                <div class="photo-item">
                    <div class="photo-img-wrapper" onclick="openPhotoSlider('${exercise.id}', ${idx})">
                        <img src="${photo}" alt="Фото упражнения">
                    </div>
                    <button class="photo-delete-btn" onclick="event.stopPropagation(); deleteExercisePhoto('${exercise.id}', ${idx})" title="Удалить фото">
                        <span>🗑️</span> Удалить
                    </button>
                </div>
            `;
        });
        
        if (exercise.photos.length < 4) {
            html += `<div class="add-photo-btn" onclick="addExercisePhoto('${exercise.id}')">+</div>`;
        }
        
        return html;
    }
    
    function renderSets(exercise) {
        if (!exercise.sets || exercise.sets.length === 0) {
            return `<tr><td colspan="4" style="text-align: center; color: #666;">Нет подходов. Нажмите "+ Добавить подход"<\/td><\/tr>`;
        }
        
        let html = '';
        exercise.sets.forEach((set, index) => {
            const weightValue = set.weight !== undefined ? set.weight : '0';
            const repsValue = set.reps !== undefined ? set.reps : '10';
            // Для отображения
            const repsDisplay = repsValue === '0' ? '' : repsValue;
            const weightDisplay = weightValue === '0' ? '' : weightValue;
            
            html += `
                <tr data-set-index="${index}">
                    <td>${index + 1}<\/td>
                    <td>
                        <input type="text" class="set-input reps-input" value="${escapeHtml(repsDisplay)}" placeholder="1—10" 
                            data-exercise-id="${exercise.id}" data-set-index="${index}" data-field="reps"
                            onclick="openRepsRangePicker(this, '${exercise.id}', ${index}, '${escapeHtml(repsValue)}')"
                            readonly>
                    <\/td>
                    <td><input type="text" class="set-input weight-input" value="${escapeHtml(weightDisplay)}" placeholder="0" 
                            data-exercise-id="${exercise.id}" data-set-index="${index}" data-field="weight"
                            oninput="validateOnlyNumbersWeight(this)" onchange="updateSetFromInput(this)"><\/td>
                    <td><button class="delete-set-btn" onclick="deleteSet('${exercise.id}', ${index})">🗑️<\/button><\/td>
                <\/tr>
            `;
        });
        return html;
    }
    
    // Функции для валидации веса (только цифры)
    window.validateOnlyNumbersWeight = function(inputElement) {
        const oldValue = inputElement.value;
        const newValue = oldValue.replace(/[^0-9]/g, '');
        if (oldValue !== newValue) {
            inputElement.value = newValue;
        }
    };
    
    window.updateSetFromInput = function(inputElement) {
        const exerciseId = inputElement.getAttribute('data-exercise-id');
        const setIndex = parseInt(inputElement.getAttribute('data-set-index'));
        const field = inputElement.getAttribute('data-field');
        let value = inputElement.value;
        if (value === '') {
            value = '0';
            inputElement.value = '';
        }
        updateSet(exerciseId, setIndex, field, value);
    };
    
    // Открытие пикера диапазона повторений
    window.openRepsRangePicker = function(inputElement, exerciseId, setIndex, currentValue) {
        openRepsRangeModal(inputElement, exerciseId, setIndex, currentValue);
    };
    
    function renderExercises(filterText = '') {
        let exercises = [...programData.exercises];
        
        if (filterText) {
            const searchTerm = filterText.toLowerCase();
            exercises = exercises.filter(ex => 
                ex.name.toLowerCase().includes(searchTerm)
            );
        }
        
        if (exercises.length === 0) {
            exercisesList.innerHTML = `
                <div class="empty-exercises">
                    <div class="empty-icon">💪</div>
                    <p>Нет упражнений</p>
                    <p class="empty-hint">Нажмите «+ Добавить упражнение», чтобы создать первое</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        exercises.forEach((exercise, index) => {
            const originalIndex = programData.exercises.findIndex(e => e.id === exercise.id);
            const number = originalIndex + 1;
            const isCollapsed = collapsedExercises[exercise.id] === true;
            const collapsedClass = isCollapsed ? 'collapsed' : '';
            const toggleIcon = isCollapsed ? '▶️' : '🔽';
            const toggleTitle = isCollapsed ? 'Развернуть' : 'Свернуть';
            
            let commentsHtml = '';
            if (exercise.comments && exercise.comments.length > 0) {
                commentsHtml = '<div class="comments-list">';
                exercise.comments.forEach((comment, commentIndex) => {
                    commentsHtml += `
                        <div class="comment-item" data-comment-index="${commentIndex}">
                            <div class="comment-text" onclick="editComment('${exercise.id}', ${commentIndex})">${escapeHtml(comment)}</div>
                            <div class="comment-actions">
                                <button class="comment-edit-btn" onclick="editComment('${exercise.id}', ${commentIndex})" title="Редактировать">✏️</button>
                                <button class="comment-delete-btn" onclick="deleteComment('${exercise.id}', ${commentIndex})" title="Удалить">🗑️</button>
                            </div>
                        </div>
                    `;
                });
                commentsHtml += '</div>';
            } else {
                commentsHtml = '<div style="text-align: center; color: #666; font-size: 12px; padding: 8px;">Нет комментариев</div>';
            }
            
            html += `
                <div class="exercise-card ${collapsedClass}" data-exercise-id="${exercise.id}">
                    <div class="exercise-header">
                        <div class="exercise-title-section">
                            <div class="exercise-number">${number}</div>
                            <div class="exercise-name" onclick="editExerciseName('${exercise.id}')">${escapeHtml(exercise.name)}</div>
                        </div>
                        <div class="exercise-actions">
                            <button class="toggle-exercise-btn" onclick="toggleExercise('${exercise.id}')" title="${toggleTitle}">${toggleIcon}</button>
                            <button class="copy-exercise-btn" onclick="copyExercise('${exercise.id}')" title="Копировать упражнение">📋</button>
                            <button class="delete-exercise-btn" onclick="deleteExercise('${exercise.id}')" title="Удалить упражнение">🗑️</button>
                        </div>
                    </div>
                    
                    <div class="exercise-photos-gallery">
                        <div class="photos-grid" id="photos-${exercise.id}">
                            ${renderPhotosGrid(exercise)}
                        </div>
                        <div class="photo-hint">📷 Максимум 4 фото • Нажмите на фото для увеличения</div>
                    </div>
                    
                    <table class="sets-table">
                        <thead>
                            <tr><th>Подход</th><th>Повторения</th><th>Вес/кг</th><th></th></tr>
                        </thead>
                        <tbody id="sets-${exercise.id}">
                            ${renderSets(exercise)}
                        </tbody>
                    </table>
                    
                    <button class="add-set-btn" onclick="addSet('${exercise.id}')">+ Добавить подход</button>
                    
                    <div class="exercise-comments-section">
                        <div class="exercise-comments-header">
                            <h4>💬 Комментарии</h4>
                            <button class="add-comment-btn" onclick="addComment('${exercise.id}')">+ Добавить комментарий</button>
                        </div>
                        ${commentsHtml}
                    </div>
                </div>
            `;
        });
        
        exercisesList.innerHTML = html;
        refreshScrollablePadding();
    }
    
    // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРОГРАММОЙ ==========
    
    window.toggleExercise = function(exerciseId) {
        if (collapsedExercises[exerciseId]) {
            delete collapsedExercises[exerciseId];
        } else {
            collapsedExercises[exerciseId] = true;
        }
        saveCollapsedState();
        renderExercises(searchInput ? searchInput.value : '');
    };
    
    window.editProgramTitle = function() {
        const currentTitle = programData.title;
        const titleContainer = document.querySelector('.program-title-edit');
        
        titleContainer.innerHTML = `
            <div class="title-input-container">
                <input type="text" id="titleInput" class="title-input" value="${escapeHtml(currentTitle)}" maxlength="100">
                <button class="title-save-btn" onclick="saveProgramTitle()">✓</button>
                <button class="title-cancel-btn" onclick="cancelProgramTitle()">✗</button>
            </div>
        `;
        
        const input = document.getElementById('titleInput');
        input.focus();
        input.select();
    };
    
    window.saveProgramTitle = async function() {
        const newTitle = document.getElementById('titleInput').value.trim();
        if (newTitle && newTitle.length >= 2) {
            programData.title = newTitle;
            programTitle.textContent = newTitle;
            saveProgramData();
        } else if (newTitle && newTitle.length < 2) {
            await showCustomAlert('Название должно содержать минимум 2 символа', 'Ошибка', '❌');
        }
        cancelProgramTitle();
    };
    
    window.cancelProgramTitle = function() {
        const titleContainer = document.querySelector('.program-title-edit');
        titleContainer.innerHTML = `
            <h1 id="programTitle" onclick="editProgramTitle()">${escapeHtml(programData.title)}</h1>
            <button class="edit-title-btn" id="editTitleBtn" onclick="editProgramTitle()">✏️</button>
        `;
    };
    
    // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С УПРАЖНЕНИЯМИ ==========
    
    window.addExercise = async function() {
        const exerciseName = await showEditNamePrompt('Новое упражнение');
        
        if (!exerciseName) {
            return;
        }
        
        if (exerciseName.length < 2) {
            await showCustomAlert('Название должно содержать минимум 2 символа', 'Ошибка', '❌');
            return;
        }
        
        const newExercise = {
            id: Date.now().toString(),
            name: exerciseName,
            photos: [],
            sets: [
                { reps: '10', weight: '0' }
            ],
            comments: []
        };
        
        programData.exercises.push(newExercise);
        saveProgramData();
        renderExercises(searchInput ? searchInput.value : '');
    };
    
    window.editExerciseName = async function(exerciseId) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;
        
        const newName = await showEditNamePrompt(exercise.name);
        if (newName && newName.length >= 2) {
            exercise.name = newName;
            saveProgramData();
            renderExercises(searchInput ? searchInput.value : '');
        } else if (newName && newName.length < 2) {
            await showCustomAlert('Название должно содержать минимум 2 символа', 'Ошибка', '❌');
        }
    };
    
    window.copyExercise = async function(exerciseId) {
        const exerciseIndex = programData.exercises.findIndex(e => e.id === exerciseId);
        if (exerciseIndex === -1) return;
        
        const originalExercise = programData.exercises[exerciseIndex];
        const confirmed = await showCopyConfirm(originalExercise.name);
        
        if (confirmed) {
            const copiedExercise = JSON.parse(JSON.stringify(originalExercise));
            copiedExercise.id = Date.now().toString();
            copiedExercise.name = `${originalExercise.name} (копия)`;
            
            programData.exercises.splice(exerciseIndex + 1, 0, copiedExercise);
            saveProgramData();
            renderExercises(searchInput ? searchInput.value : '');
        }
    };
    
    window.deleteExercise = async function(exerciseId) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;
        
        const confirmed = await showCustomConfirm(`Удалить упражнение "${exercise.name}"?`, 'Удаление упражнения');
        if (confirmed) {
            programData.exercises = programData.exercises.filter(e => e.id !== exerciseId);
            delete collapsedExercises[exerciseId];
            saveCollapsedState();
            saveProgramData();
            renderExercises(searchInput ? searchInput.value : '');
            await showCustomAlert('Упражнение удалено', 'Готово', '🗑️');
        }
    };
    
    // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОДХОДАМИ ==========
    
    window.addSet = function(exerciseId) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (exercise) {
            exercise.sets.push({ reps: '10', weight: '0' });
            saveProgramData();
            renderExercises(searchInput ? searchInput.value : '');
        }
    };
    
    window.updateSet = function(exerciseId, setIndex, field, value) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (exercise && exercise.sets[setIndex]) {
            exercise.sets[setIndex][field] = value;
            saveProgramData();
        }
    };
    
    window.deleteSet = async function(exerciseId, setIndex) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (exercise && exercise.sets.length > 1) {
            const confirmed = await showCustomConfirm(`Удалить подход ${setIndex + 1}?`, 'Удаление подхода');
            if (confirmed) {
                exercise.sets.splice(setIndex, 1);
                saveProgramData();
                renderExercises(searchInput ? searchInput.value : '');
                await showCustomAlert('Подход удалён', 'Готово', '🗑️');
            }
        } else if (exercise && exercise.sets.length === 1) {
            await showCustomAlert('Упражнение должно иметь хотя бы один подход', 'Ошибка', '⚠️');
        }
    };
    
    // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ФОТО (ГАЛЕРЕЯ) ==========
    
    window.addExercisePhoto = function(exerciseId) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise) return;
        
        if (exercise.photos && exercise.photos.length >= 4) {
            showCustomAlert('Максимум 4 фотографии', 'Предупреждение', '⚠️');
            return;
        }
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (!exercise.photos) {
                        exercise.photos = [];
                    }
                    exercise.photos.push(evt.target.result);
                    saveProgramData();
                    renderExercises(searchInput ? searchInput.value : '');
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    };
    
    window.deleteExercisePhoto = function(exerciseId, photoIndex) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise || !exercise.photos || !exercise.photos[photoIndex]) return;
        
        showCustomConfirm('Удалить это фото?', 'Подтверждение').then(confirmed => {
            if (confirmed) {
                exercise.photos.splice(photoIndex, 1);
                saveProgramData();
                renderExercises(searchInput ? searchInput.value : '');
                showCustomAlert('Фото удалено', 'Готово', '🗑️');
            }
        });
    };
    
    window.openPhotoSlider = function(exerciseId, photoIndex) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise || !exercise.photos || exercise.photos.length === 0) return;
        
        currentSliderExerciseId = exerciseId;
        currentSliderPhotoIndex = photoIndex;
        currentSliderPhotos = exercise.photos;
        
        const sliderModal = document.getElementById('sliderModal');
        const sliderImg = document.getElementById('sliderImg');
        const sliderCounter = document.getElementById('sliderCounter');
        
        sliderImg.src = currentSliderPhotos[currentSliderPhotoIndex];
        sliderCounter.textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
        sliderModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    
    window.closeSlider = function() {
        const sliderModal = document.getElementById('sliderModal');
        sliderModal.style.display = 'none';
        document.body.style.overflow = '';
        currentSliderExerciseId = null;
        currentSliderPhotoIndex = 0;
        currentSliderPhotos = [];
    };
    
    window.nextPhoto = function() {
        if (currentSliderPhotos.length === 0) return;
        currentSliderPhotoIndex = (currentSliderPhotoIndex + 1) % currentSliderPhotos.length;
        const sliderImg = document.getElementById('sliderImg');
        const sliderCounter = document.getElementById('sliderCounter');
        sliderImg.src = currentSliderPhotos[currentSliderPhotoIndex];
        sliderCounter.textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
    };
    
    window.prevPhoto = function() {
        if (currentSliderPhotos.length === 0) return;
        currentSliderPhotoIndex = (currentSliderPhotoIndex - 1 + currentSliderPhotos.length) % currentSliderPhotos.length;
        const sliderImg = document.getElementById('sliderImg');
        const sliderCounter = document.getElementById('sliderCounter');
        sliderImg.src = currentSliderPhotos[currentSliderPhotoIndex];
        sliderCounter.textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
    };
    
    // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С КОММЕНТАРИЯМИ ==========
    
    window.addComment = function(exerciseId) {
        currentCommentExerciseId = exerciseId;
        currentCommentIndex = null;
        commentModalTitle.textContent = 'Добавить комментарий';
        commentTextarea.value = '';
        updateCommentCharCounter();
        commentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        commentTextarea.focus();
    };
    
    window.editComment = function(exerciseId, commentIndex) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (!exercise || !exercise.comments[commentIndex]) return;
        
        currentCommentExerciseId = exerciseId;
        currentCommentIndex = commentIndex;
        commentModalTitle.textContent = 'Редактировать комментарий';
        commentTextarea.value = exercise.comments[commentIndex];
        updateCommentCharCounter();
        commentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        commentTextarea.focus();
    };
    
    window.deleteComment = async function(exerciseId, commentIndex) {
        const exercise = programData.exercises.find(e => e.id === exerciseId);
        if (exercise && exercise.comments[commentIndex]) {
            const confirmed = await showCustomConfirm('Удалить этот комментарий?', 'Удаление комментария');
            if (confirmed) {
                exercise.comments.splice(commentIndex, 1);
                saveProgramData();
                renderExercises(searchInput ? searchInput.value : '');
                await showCustomAlert('Комментарий удалён', 'Готово', '🗑️');
            }
        }
    };
    
    async function saveComment() {
        const commentText = commentTextarea.value.trim();
        
        if (!commentText) {
            await showCustomAlert('Введите текст комментария', 'Ошибка', '❌');
            return;
        }
        
        if (commentText.length > 500) {
            await showCustomAlert('Текст не должен превышать 500 символов', 'Ошибка', '❌');
            return;
        }
        
        const exercise = programData.exercises.find(e => e.id === currentCommentExerciseId);
        if (exercise) {
            if (currentCommentIndex !== null) {
                exercise.comments[currentCommentIndex] = commentText;
            } else {
                exercise.comments.push(commentText);
            }
            saveProgramData();
            renderExercises(searchInput ? searchInput.value : '');
        }
        
        closeCommentModal();
    }
    
    function closeCommentModal() {
        commentModal.style.display = 'none';
        document.body.style.overflow = '';
        currentCommentExerciseId = null;
        currentCommentIndex = null;
        commentTextarea.value = '';
    }
    
    function updateCommentCharCounter() {
        const len = commentTextarea.value.length;
        commentCharCounter.textContent = `${len}/500`;
        if (len > 450) {
            commentCharCounter.style.color = '#ffaa00';
        } else if (len > 480) {
            commentCharCounter.style.color = '#ff4444';
        } else {
            commentCharCounter.style.color = '#aaa';
        }
    }
    
    if (editNameInput) {
        editNameInput.addEventListener('input', updateEditNameCounter);
    }
    
    // ========== ПОИСК ==========
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderExercises(this.value);
        });
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
        addExerciseBtn.addEventListener('click', addExercise);
    }
    
    const currentUserId = localStorage.getItem('currentUserId');
    
    if (navProfileBottom) {
        navProfileBottom.addEventListener('click', function() {
            if (currentUserId) {
                window.location.href = '/user/' + currentUserId;
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navMessagesBottom) {
        navMessagesBottom.addEventListener('click', function() {
            if (currentUserId) {
                if (typeof window.openChatWithUser === 'function') {
                    window.openChatWithUser(currentUserId);
                } else {
                    window.location.href = '/user/' + currentUserId;
                }
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navBlocksBottom) {
        navBlocksBottom.addEventListener('click', function() {
            window.location.href = '/blocks.html';
        });
    }
    
    // ========== ОБРАБОТЧИКИ МОДАЛЬНОГО ОКНА ПОВТОРЕНИЙ ==========
    
    if (repsRangeClose) {
        repsRangeClose.addEventListener('click', closeRepsRangeModal);
    }
    
    if (repsRangeCancel) {
        repsRangeCancel.addEventListener('click', closeRepsRangeModal);
    }
    
    if (repsRangeConfirm) {
        repsRangeConfirm.addEventListener('click', confirmRepsRange);
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === repsRangeModal) closeRepsRangeModal();
    });
    
    // ========== ЭКСПОРТ В PDF ==========
    
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async function generatePDF() {
        const pdfDialog = document.getElementById('pdfDialog');
        const pdfDialogIcon = document.getElementById('pdfDialogIcon');
        const pdfDialogTitle = document.getElementById('pdfDialogTitle');
        const pdfDialogMessage = document.getElementById('pdfDialogMessage');
        const pdfDialogBtn = document.getElementById('pdfDialogBtn');
        
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            margin-top: 15px;
            width: 100%;
            background-color: #444;
            border-radius: 10px;
            overflow: hidden;
            height: 8px;
        `;
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #E9AE67, #c4894a);
            transition: width 0.3s ease;
            border-radius: 10px;
        `;
        progressContainer.appendChild(progressBar);
        
        const percentText = document.createElement('div');
        percentText.style.cssText = `
            margin-top: 8px;
            font-size: 12px;
            color: #E9AE67;
            text-align: center;
        `;
        percentText.textContent = '0%';
        
        pdfDialogMessage.innerHTML = '';
        pdfDialogMessage.appendChild(document.createTextNode('Подготовка PDF...'));
        pdfDialogMessage.appendChild(progressContainer);
        pdfDialogMessage.appendChild(percentText);
        
        pdfDialogIcon.textContent = '⏳';
        pdfDialogTitle.textContent = 'Подготовка PDF';
        pdfDialogBtn.textContent = 'Скачать PDF';
        pdfDialogBtn.disabled = true;
        pdfDialogBtn.style.opacity = '0.5';
        
        pdfDialog.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 15 + 5;
                if (progress > 90) progress = 90;
                progressBar.style.width = progress + '%';
                percentText.textContent = Math.floor(progress) + '%';
            }
        }, 200);
        
        if (typeof window.html2pdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }
        
        const pdfContainer = document.createElement('div');
        pdfContainer.style.cssText = `
            background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
            padding: 40px;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #fff;
            max-width: 800px;
            margin: 0 auto;
        `;
        
        const currentDate = new Date().toLocaleDateString('ru-RU');
        
        let pdfContent = `
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #E9AE67, #c4894a); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;">
                    <span style="font-size: 40px;">📋</span>
                </div>
                <h1 style="color: #E9AE67; font-size: 28px; margin-bottom: 10px;">${escapeHtml(programData.title)}</h1>
                <p style="color: #aaa; font-size: 12px;">📅 Создано: ${currentDate}</p>
                <div style="height: 2px; background: linear-gradient(90deg, #E9AE67, #c4894a); margin: 20px 0; width: 50px; margin-left: auto; margin-right: auto;"></div>
            </div>
        `;
        
        if (programData.exercises.length === 0) {
            pdfContent += `
                <div style="text-align: center; padding: 50px; background: #333; border-radius: 16px;">
                    <p style="color: #999;">Нет упражнений</p>
                </div>
            `;
        } else {
            programData.exercises.forEach((exercise, idx) => {
                const exerciseNumber = idx + 1;
                
                pdfContent += `
                    <div style="margin-bottom: 30px; page-break-inside: avoid; background: #333; border-radius: 16px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; border-bottom: 2px solid #E9AE67; padding-bottom: 10px;">
                            <div style="background: #E9AE67; color: #222; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px;">${exerciseNumber}</div>
                            <h2 style="color: #E9AE67; font-size: 20px; margin: 0;">${escapeHtml(exercise.name)}</h2>
                        </div>
                `;
                
                if (exercise.photos && exercise.photos.length > 0) {
                    pdfContent += `
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    `;
                    exercise.photos.slice(0, 4).forEach(photo => {
                        pdfContent += `
                            <div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 2px solid #E9AE67; background: #444;">
                                <img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                        `;
                    });
                    pdfContent += `
                            </div>
                        </div>
                    `;
                }
                
                pdfContent += `
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #444;">
                                <th style="padding: 10px; text-align: center; border: 1px solid #555; color: #E9AE67;">Подход</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #555; color: #E9AE67;">Повторения</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #555; color: #E9AE67;">Вес/кг</th>
                            </td>
                        </thead>
                        <tbody>
                `;
                
                if (exercise.sets && exercise.sets.length > 0) {
                    exercise.sets.forEach((set, setIdx) => {
                        let repsValue = set.reps === '0' ? '—' : (set.reps || '—');
                        const weightValue = set.weight === '0' ? '—' : set.weight;
                        pdfContent += `
                            <tr>
                                <td style="padding: 10px; text-align: center; border: 1px solid #555; color: #ddd;">${setIdx + 1}<\/td>
                                <td style="padding: 10px; text-align: center; border: 1px solid #555; color: #ddd;">${escapeHtml(repsValue)}<\/td>
                                <td style="padding: 10px; text-align: center; border: 1px solid #555; color: #ddd;">${escapeHtml(weightValue)}<\/td>
                            </tr>
                        `;
                    });
                } else {
                    pdfContent += `
                        <tr>
                            <td colspan="3" style="padding: 10px; text-align: center; border: 1px solid #555; color: #666;">Нет подходов<\/td>
                        </tr>
                    `;
                }
                
                pdfContent += `
                        </tbody>
                    </table>
                `;
                
                if (exercise.comments && exercise.comments.length > 0) {
                    pdfContent += `
                        <div style="background: #444; padding: 12px; border-radius: 12px; margin-top: 10px;">
                            <p style="font-weight: bold; color: #E9AE67; margin: 0 0 8px 0;">💬 Комментарии:</p>
                    `;
                    exercise.comments.forEach(comment => {
                        pdfContent += `<p style="margin: 6px 0; font-size: 13px; color: #ccc;">• ${escapeHtml(comment)}</p>`;
                    });
                    pdfContent += `</div>`;
                }
                
                pdfContent += `</div>`;
            });
        }
        
        pdfContainer.innerHTML = pdfContent;
        document.body.appendChild(pdfContainer);
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        
        setTimeout(() => {
            pdfDialogIcon.textContent = '📄';
            pdfDialogTitle.textContent = 'Готово';
            pdfDialogMessage.innerHTML = 'PDF готов к скачиванию';
            pdfDialogBtn.disabled = false;
            pdfDialogBtn.style.opacity = '1';
        }, 500);
        
        const onDownloadClick = async () => {
            pdfDialogBtn.removeEventListener('click', onDownloadClick);
            
            pdfDialogIcon.textContent = '⏳';
            pdfDialogTitle.textContent = 'Скачивание';
            pdfDialogMessage.innerHTML = 'Формирование файла...';
            pdfDialogBtn.disabled = true;
            pdfDialogBtn.style.opacity = '0.5';
            
            try {
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `${programData.title.replace(/[^a-zа-яё0-9]/gi, '_')}_тренировка.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#2a2a2a' },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };
                
                await html2pdf().set(opt).from(pdfContainer).save();
                document.body.removeChild(pdfContainer);
                
                pdfDialogIcon.textContent = '✅';
                pdfDialogTitle.textContent = 'Готово!';
                pdfDialogMessage.innerHTML = 'PDF успешно сохранён';
                pdfDialogBtn.textContent = 'Закрыть';
                pdfDialogBtn.disabled = false;
                pdfDialogBtn.style.opacity = '1';
                
                pdfDialogBtn.addEventListener('click', function closeDialog() {
                    pdfDialog.style.display = 'none';
                    document.body.style.overflow = '';
                    pdfDialogBtn.removeEventListener('click', closeDialog);
                });
                
                setTimeout(() => {
                    if (pdfDialog.style.display === 'flex') {
                        pdfDialog.style.display = 'none';
                        document.body.style.overflow = '';
                    }
                }, 2000);
            } catch (err) {
                console.error('Ошибка создания PDF:', err);
                document.body.removeChild(pdfContainer);
                pdfDialogIcon.textContent = '❌';
                pdfDialogTitle.textContent = 'Ошибка';
                pdfDialogMessage.innerHTML = 'Не удалось создать PDF';
                pdfDialogBtn.textContent = 'Закрыть';
                pdfDialogBtn.disabled = false;
                pdfDialogBtn.style.opacity = '1';
                
                pdfDialogBtn.addEventListener('click', function closeDialog() {
                    pdfDialog.style.display = 'none';
                    document.body.style.overflow = '';
                    pdfDialogBtn.removeEventListener('click', closeDialog);
                });
            }
        };
        
        pdfDialogBtn.addEventListener('click', onDownloadClick);
    }
    
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', generatePDF);
    }
    
    // ========== МОДАЛЬНЫЕ ОКНА ==========
    
    const sliderModal = document.getElementById('sliderModal');
    const sliderClose = document.querySelector('.slider-close');
    
    if (sliderClose) {
        sliderClose.addEventListener('click', closeSlider);
    }
    
    if (sliderModal) {
        sliderModal.addEventListener('click', function(e) {
            if (e.target === sliderModal) {
                closeSlider();
            }
        });
    }
    
    if (commentSaveBtn) {
        commentSaveBtn.addEventListener('click', saveComment);
    }
    
    if (commentCancelBtn) {
        commentCancelBtn.addEventListener('click', closeCommentModal);
    }
    
    if (commentModalClose) {
        commentModalClose.addEventListener('click', closeCommentModal);
    }
    
    if (commentTextarea) {
        commentTextarea.addEventListener('input', updateCommentCharCounter);
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === commentModal) closeCommentModal();
        if (e.target === copyConfirmDialog) {
            copyConfirmDialog.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === editNameDialog) {
            editNameDialog.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (e.target === document.getElementById('pdfDialog')) {
            const pdfDialog = document.getElementById('pdfDialog');
            pdfDialog.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (sliderModal && sliderModal.style.display === 'flex') closeSlider();
            if (commentModal && commentModal.style.display === 'flex') closeCommentModal();
            if (repsRangeModal && repsRangeModal.style.display === 'flex') closeRepsRangeModal();
            if (copyConfirmDialog && copyConfirmDialog.style.display === 'flex') {
                copyConfirmDialog.style.display = 'none';
                document.body.style.overflow = '';
            }
            if (editNameDialog && editNameDialog.style.display === 'flex') {
                editNameDialog.style.display = 'none';
                document.body.style.overflow = '';
            }
            const pdfDialog = document.getElementById('pdfDialog');
            if (pdfDialog && pdfDialog.style.display === 'flex') {
                pdfDialog.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
    });
    
    // Делаем функции глобальными
    window.editProgramTitle = editProgramTitle;
    window.saveProgramTitle = saveProgramTitle;
    window.cancelProgramTitle = cancelProgramTitle;
    window.addExercise = addExercise;
    window.editExerciseName = editExerciseName;
    window.copyExercise = copyExercise;
    window.deleteExercise = deleteExercise;
    window.addSet = addSet;
    window.updateSet = updateSet;
    window.deleteSet = deleteSet;
    window.addComment = addComment;
    window.editComment = editComment;
    window.deleteComment = deleteComment;
    window.toggleExercise = toggleExercise;
    window.addExercisePhoto = addExercisePhoto;
    window.deleteExercisePhoto = deleteExercisePhoto;
    window.openPhotoSlider = openPhotoSlider;
    window.closeSlider = closeSlider;
    window.prevPhoto = prevPhoto;
    window.nextPhoto = nextPhoto;
    window.openRepsRangePicker = openRepsRangePicker;
    window.validateOnlyNumbersWeight = validateOnlyNumbersWeight;
    window.updateSetFromInput = updateSetFromInput;
    
    // Инициализация
    loadProgramData();
});