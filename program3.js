// program3.js - Функции для работы с упражнениями (БЕЗ ДУБЛИРУЮЩИХСЯ ПЕРЕМЕННЫХ)

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРОГРАММОЙ ==========
function editProgramTitle() {
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
    if (input) {
        input.focus();
        input.select();
    }
}

async function saveProgramTitle() {
    const newTitle = document.getElementById('titleInput')?.value.trim();
    if (newTitle && newTitle.length >= 2) {
        programData.title = newTitle;
        programTitle.textContent = newTitle;
        await apiRequest('/api/protocols/update', 'POST', {
            userId: localStorage.getItem('currentUserId'),
            protocolId: protocolId,
            name: newTitle
        });
        await saveProgramDataToDB();
    } else if (newTitle && newTitle.length < 2) {
        await showCustomAlert('Название должно содержать минимум 2 символа', 'Ошибка', '❌');
    }
    cancelProgramTitle();
}

function cancelProgramTitle() {
    const titleContainer = document.querySelector('.program-title-edit');
    titleContainer.innerHTML = `
        <h1 id="programTitle" onclick="editProgramTitle()">${escapeHtml(programData.title)}</h1>
        <button class="edit-title-btn" id="editTitleBtn" onclick="editProgramTitle()">✏️</button>
    `;
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ДЛЯ УПРАЖНЕНИЙ ==========
function getCurrentExercises() {
    if (!programData.days || programData.days.length === 0) {
        programData.days = [{ name: 'День 1', exercises: [], comments: '' }];
        currentDayIndex = 0;
    }
    if (!programData.days[currentDayIndex]) {
        programData.days[currentDayIndex] = { name: `День ${currentDayIndex + 1}`, exercises: [], comments: '' };
    }
    if (!programData.days[currentDayIndex].exercises) {
        programData.days[currentDayIndex].exercises = [];
    }
    return programData.days[currentDayIndex].exercises;
}

function saveCurrentExercises(exercises) {
    if (!programData.days || programData.days.length === 0) {
        programData.days = [{ name: 'День 1', exercises: exercises, comments: '' }];
        currentDayIndex = 0;
    } else {
        programData.days[currentDayIndex].exercises = exercises;
    }
    saveCurrentCollapsedState();
}

function saveCurrentCollapsedState() {
    localStorage.setItem(`program_collapsed_${protocolId}`, JSON.stringify(collapsedExercises));
}

// ========== КНОПКА СВЕРНУТЬ/РАЗВЕРНУТЬ ==========
async function toggleExercise(exerciseId) {
    console.log('🔵 toggleExercise вызвана для упражнения:', exerciseId);
    
    const exerciseCard = document.querySelector(`.exercise-card[data-exercise-id="${exerciseId}"]`);
    if (!exerciseCard) {
        console.log('❌ Карточка упражнения не найдена');
        return;
    }
    
    exerciseCard.classList.toggle('collapsed');
    const isCollapsed = exerciseCard.classList.contains('collapsed');
    
    if (isCollapsed) {
        collapsedExercises[exerciseId] = true;
    } else {
        delete collapsedExercises[exerciseId];
    }
    
    if (programData.days && programData.days[currentDayIndex] && programData.days[currentDayIndex].exercises) {
        const exercise = programData.days[currentDayIndex].exercises.find(e => e.id === exerciseId);
        if (exercise) {
            exercise.is_collapsed = isCollapsed;
            console.log('📊 is_collapsed обновлён:', exercise.is_collapsed);
        }
    }
    
    saveCurrentCollapsedState();
    
    try {
        const result = await apiRequest('/api/save-protocol-data', 'POST', {
            protocolId: protocolId,
            data: { days: programData.days }
        });
        console.log('📤 Сохранение в БД:', result.success ? '✅ успешно' : '❌ ошибка');
    } catch (err) {
        console.error('❌ Ошибка сохранения:', err);
    }
    
    console.log(isCollapsed ? '🔼 Упражнение свёрнуто' : '🔽 Упражнение развёрнуто');
}

// ========== ДОБАВЛЕНИЕ УПРАЖНЕНИЯ ==========
async function addExercise() {
    console.log('🔵 addExercise вызвана');
    
    editNameInput.value = '';
    updateEditNameCounter();
    editNameDialog.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    editNameInput.focus();
    
    const onOk = async () => {
        const exerciseName = editNameInput.value.trim();
        
        if (!exerciseName) {
            await showCustomAlert('Введите название упражнения', 'Ошибка', '❌');
            return;
        }
        if (exerciseName.length < 2) {
            await showCustomAlert('Минимум 2 символа', 'Ошибка', '❌');
            return;
        }
        
        const newExercise = {
            id: Date.now().toString(),
            name: exerciseName,
            photos: [],
            sets: [{ reps: '10', weight: '0' }],
            comments: [],
            is_collapsed: false
        };
        
        const exercises = getCurrentExercises();
        exercises.push(newExercise);
        saveCurrentExercises(exercises);
        
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
        
        editNameDialog.style.display = 'none';
        document.body.style.overflow = '';
        
        editNameOk.removeEventListener('click', onOk);
        editNameCancel.removeEventListener('click', onCancel);
        
        showCustomAlert('✅ Упражнение добавлено', 'Готово', '✅');
    };
    
    const onCancel = () => {
        editNameDialog.style.display = 'none';
        document.body.style.overflow = '';
        editNameOk.removeEventListener('click', onOk);
        editNameCancel.removeEventListener('click', onCancel);
    };
    
    editNameOk.onclick = onOk;
    editNameCancel.onclick = onCancel;
    
    editNameInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            onOk();
        }
    };
}

// ========== РЕДАКТИРОВАНИЕ НАЗВАНИЯ УПРАЖНЕНИЯ ==========
async function editExerciseName(exerciseId) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    editNameInput.value = exercise.name;
    updateEditNameCounter();
    editNameDialog.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    editNameInput.focus();
    editNameInput.select();
    
    const onOk = async () => {
        const newName = editNameInput.value.trim();
        if (newName && newName.length >= 2) {
            exercise.name = newName;
            saveCurrentExercises(exercises);
            await saveProgramDataToDB();
            renderExercises(searchInput?.value || '');
        } else if (newName) {
            await showCustomAlert('Минимум 2 символа', 'Ошибка', '❌');
        }
        editNameDialog.style.display = 'none';
        document.body.style.overflow = '';
        editNameOk.removeEventListener('click', onOk);
        editNameCancel.removeEventListener('click', onCancel);
    };
    
    const onCancel = () => {
        editNameDialog.style.display = 'none';
        document.body.style.overflow = '';
        editNameOk.removeEventListener('click', onOk);
        editNameCancel.removeEventListener('click', onCancel);
    };
    
    editNameOk.onclick = onOk;
    editNameCancel.onclick = onCancel;
    
    editNameInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            onOk();
        }
    };
}

// ========== УДАЛЕНИЕ УПРАЖНЕНИЯ ==========
async function deleteExercise(exerciseId) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    const confirmed = await showCustomConfirm(`Удалить упражнение "${exercise.name}"?`, 'Удаление упражнения');
    if (confirmed) {
        const newExercises = exercises.filter(e => e.id !== exerciseId);
        delete collapsedExercises[exerciseId];
        saveCurrentExercises(newExercises);
        saveCurrentCollapsedState();
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
        await showCustomAlert('🗑️ Упражнение удалено', 'Готово', '✅');
    }
}

// ========== ПОДХОДЫ ==========
async function addSet(exerciseId) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (exercise) {
        exercise.sets.push({ reps: '10', weight: '0' });
        saveCurrentExercises(exercises);
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
    }
}

function updateSet(exerciseId, setIndex, field, value) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (exercise && exercise.sets[setIndex]) {
        exercise.sets[setIndex][field] = value;
        saveCurrentExercises(exercises);
    }
}

async function deleteSet(exerciseId, setIndex) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (exercise && exercise.sets.length > 1) {
        const confirmed = await showCustomConfirm(`Удалить подход ${setIndex + 1}?`, 'Удаление подхода');
        if (confirmed) {
            exercise.sets.splice(setIndex, 1);
            saveCurrentExercises(exercises);
            await saveProgramDataToDB();
            renderExercises(searchInput?.value || '');
        }
    } else if (exercise && exercise.sets.length === 1) {
        await showCustomAlert('Упражнение должно иметь хотя бы один подход', 'Ошибка', '⚠️');
    }
}

// ========== КОММЕНТАРИИ ==========
function addComment(exerciseId) {
    currentCommentExerciseId = exerciseId;
    currentCommentIndex = null;
    commentModalTitle.textContent = 'Добавить комментарий';
    commentTextarea.value = '';
    updateCommentCharCounter();
    commentModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    commentTextarea.focus();
}

function editComment(exerciseId, commentIndex) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise?.comments?.[commentIndex]) return;
    
    currentCommentExerciseId = exerciseId;
    currentCommentIndex = commentIndex;
    commentModalTitle.textContent = 'Редактировать комментарий';
    commentTextarea.value = exercise.comments[commentIndex];
    updateCommentCharCounter();
    commentModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    commentTextarea.focus();
}

async function deleteComment(exerciseId, commentIndex) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise?.comments?.[commentIndex]) return;
    
    const confirmed = await showCustomConfirm('Удалить комментарий?', 'Удаление комментария');
    if (confirmed) {
        exercise.comments.splice(commentIndex, 1);
        saveCurrentExercises(exercises);
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
        showCustomAlert('🗑️ Комментарий удалён', 'Готово', '✅');
    }
}

async function saveComment() {
    const commentText = commentTextarea.value.trim();
    
    if (!commentText) {
        await showCustomAlert('Введите текст комментария', 'Ошибка', '❌');
        return;
    }
    if (commentText.length > 500) {
        await showCustomAlert('Максимум 500 символов', 'Ошибка', '❌');
        return;
    }
    
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === currentCommentExerciseId);
    
    if (exercise) {
        if (currentCommentIndex !== null) {
            exercise.comments[currentCommentIndex] = commentText;
        } else {
            if (!exercise.comments) exercise.comments = [];
            exercise.comments.push(commentText);
        }
        
        saveCurrentExercises(exercises);
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
        showCustomAlert('✅ Комментарий сохранён', 'Готово', '✅');
    }
    
    closeCommentModal();
}

function closeCommentModal() {
    commentModal.style.display = 'none';
    document.body.style.overflow = '';
    commentTextarea.value = '';
}

function updateCommentCharCounter() {
    const len = commentTextarea?.value.length || 0;
    if (commentCharCounter) {
        commentCharCounter.textContent = `${len}/500`;
        if (len > 450) {
            commentCharCounter.style.color = '#ffaa00';
        } else {
            commentCharCounter.style.color = '#aaa';
        }
    }
}

// ========== МОДАЛЬНЫЕ ОКНА ДЛЯ ПОВТОРЕНИЙ ==========
// Используем переменные из program1.js (НЕ ОБЪЯВЛЯЕМ ИХ ЗДЕСЬ!)
function openRepsRangePicker(inputElement, exerciseId, setIndex, currentValue) {
    currentRepsInput = inputElement;
    currentRepsExerciseId = exerciseId;
    currentRepsSetIndex = setIndex;
    
    if (currentValue && currentValue.includes('Макс.')) {
        const parts = currentValue.split('—');
        currentRepsFrom = parseInt(parts[0].trim()) || 1;
        currentRepsTo = 'Макс.';
        isMaxSelected = true;
    } else if (currentValue && currentValue.includes('—')) {
        const parts = currentValue.split('—');
        currentRepsFrom = parseInt(parts[0].trim()) || 1;
        currentRepsTo = parseInt(parts[1].trim()) || 10;
        isMaxSelected = false;
    } else if (currentValue && !isNaN(parseInt(currentValue))) {
        currentRepsFrom = 1;
        currentRepsTo = parseInt(currentValue) || 10;
        isMaxSelected = false;
    } else {
        currentRepsFrom = 1;
        currentRepsTo = 10;
        isMaxSelected = false;
    }
    
    const oldModal = document.getElementById('repsRangeModalNew');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
        <div id="repsRangeModalNew" class="reps-range-modal-new">
            <div class="reps-range-content-new">
                <div class="reps-range-header-new">
                    <h3>Повторения</h3>
                    <button class="reps-range-close-new">&times;</button>
                </div>
                <div class="reps-range-body-new">
                    <div class="reps-range-container-new">
                        <div class="reps-range-col-new">
                            <div class="reps-range-label-new">От</div>
                            <div class="reps-range-scroll-new">
                                <div class="reps-range-values-new" id="repsFromListNew"></div>
                            </div>
                        </div>
                        <div class="reps-range-separator-new">—</div>
                        <div class="reps-range-col-new">
                            <div class="reps-range-label-new">До</div>
                            <div class="reps-range-scroll-new">
                                <div class="reps-range-values-new" id="repsToListNew"></div>
                            </div>
                        </div>
                    </div>
                    <div class="reps-range-preview-new">
                        <span id="repsPreviewValueNew">${isMaxSelected ? `${currentRepsFrom} — Макс.` : `${currentRepsFrom} — ${currentRepsTo}`}</span>
                    </div>
                </div>
                <div class="reps-range-footer-new">
                    <button class="reps-range-cancel-new">Отмена</button>
                    <button class="reps-range-confirm-new">Применить</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('repsRangeModalNew');
    const closeBtn = modal.querySelector('.reps-range-close-new');
    const cancelBtn = modal.querySelector('.reps-range-cancel-new');
    const confirmBtn = modal.querySelector('.reps-range-confirm-new');
    const previewSpan = document.getElementById('repsPreviewValueNew');
    
    function generateFromNumbers() {
        const numbers = [];
        for (let i = 1; i <= 100; i++) numbers.push(i);
        return numbers;
    }
    
    function generateToNumbers(minFrom) {
        const numbers = ['Макс.'];
        for (let i = minFrom; i <= 100; i++) numbers.push(i);
        return numbers;
    }
    
    function renderFromList(container, selectedValue) {
        container.innerHTML = '';
        const numbers = generateFromNumbers();
        numbers.forEach(num => {
            const div = document.createElement('div');
            div.className = 'reps-range-value-new';
            if (num === selectedValue) div.classList.add('selected');
            div.textContent = num;
            div.onclick = () => {
                currentRepsFrom = num;
                if (!isMaxSelected && currentRepsTo < num) {
                    currentRepsTo = num;
                }
                renderToList(repsToListDiv, isMaxSelected ? 'Макс.' : currentRepsTo);
                updatePreview();
                highlightSelected();
            };
            container.appendChild(div);
        });
    }
    
    function renderToList(container, selectedValue) {
        container.innerHTML = '';
        const numbers = generateToNumbers(currentRepsFrom);
        numbers.forEach(num => {
            const div = document.createElement('div');
            div.className = 'reps-range-value-new';
            if (num === selectedValue) div.classList.add('selected');
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
                        currentRepsTo = currentRepsFrom;
                        isMaxSelected = false;
                    }
                }
                updatePreview();
                highlightSelected();
            };
            container.appendChild(div);
        });
    }
    
    function updatePreview() {
        if (isMaxSelected) {
            previewSpan.textContent = `${currentRepsFrom} — Макс.`;
        } else {
            previewSpan.textContent = `${currentRepsFrom} — ${currentRepsTo}`;
        }
    }
    
    function highlightSelected() {
        document.querySelectorAll('#repsFromListNew .reps-range-value-new').forEach(el => {
            const val = parseInt(el.textContent);
            if (val === currentRepsFrom) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
        
        document.querySelectorAll('#repsToListNew .reps-range-value-new').forEach(el => {
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
    
    function scrollToSelected() {
        const fromItems = document.querySelectorAll('#repsFromListNew .reps-range-value-new');
        for (let i = 0; i < fromItems.length; i++) {
            if (parseInt(fromItems[i].textContent) === currentRepsFrom) {
                fromItems[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                break;
            }
        }
        
        const toItems = document.querySelectorAll('#repsToListNew .reps-range-value-new');
        for (let i = 0; i < toItems.length; i++) {
            const val = toItems[i].textContent;
            if (isMaxSelected && val === 'Макс.') {
                toItems[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                break;
            } else if (!isMaxSelected && val !== 'Макс.' && parseInt(val) === currentRepsTo) {
                toItems[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                break;
            }
        }
    }
    
    const repsFromListDiv = document.getElementById('repsFromListNew');
    const repsToListDiv = document.getElementById('repsToListNew');
    
    renderFromList(repsFromListDiv, currentRepsFrom);
    renderToList(repsToListDiv, isMaxSelected ? 'Макс.' : currentRepsTo);
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(scrollToSelected, 100);
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
        currentRepsInput = null;
    };
    
    const applyValue = async () => {
        let rangeValue;
        if (isMaxSelected) {
            rangeValue = `${currentRepsFrom}—Макс.`;
        } else {
            rangeValue = `${currentRepsFrom}—${currentRepsTo}`;
        }
        
        if (currentRepsInput && currentRepsExerciseId !== null && currentRepsSetIndex !== null) {
            currentRepsInput.value = rangeValue;
            updateSet(currentRepsExerciseId, currentRepsSetIndex, 'reps', rangeValue);
            await saveProgramDataToDB();
            showCustomAlert('✅ Повторения сохранены', 'Готово', '✅');
        }
        closeModal();
    };
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    confirmBtn.onclick = applyValue;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// ========== ВЕС ==========
// Используем переменные из program1.js (НЕ ОБЪЯВЛЯЕМ ИХ ЗДЕСЬ!)
function openWeightPicker(inputElement, exerciseId, setIndex, currentValue) {
    currentWeightInput = inputElement;
    currentWeightExerciseId = exerciseId;
    currentWeightSetIndex = setIndex;
    
    const currentWeightVal = parseFloat(currentValue) || 0;
    
    const oldModal = document.getElementById('weightModalNew');
    if (oldModal) oldModal.remove();
    
    const modalHtml = `
        <div id="weightModalNew" class="weight-modal-new">
            <div class="weight-content-new">
                <div class="weight-header-new">
                    <h3>Вес, кг</h3>
                    <button class="weight-close-new">&times;</button>
                </div>
                <div class="weight-body-new">
                    <div class="weight-scroll-container-new">
                        <div class="weight-values-new" id="weightListNew"></div>
                    </div>
                    <div class="weight-preview-new">
                        <span id="weightPreviewValueNew">${currentWeightVal} кг</span>
                    </div>
                </div>
                <div class="weight-footer-new">
                    <button class="weight-cancel-new">Отмена</button>
                    <button class="weight-confirm-new">Применить</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('weightModalNew');
    const closeBtn = modal.querySelector('.weight-close-new');
    const cancelBtn = modal.querySelector('.weight-cancel-new');
    const confirmBtn = modal.querySelector('.weight-confirm-new');
    const previewSpan = document.getElementById('weightPreviewValueNew');
    
    let selectedWeight = currentWeightVal;
    
    function generateWeightNumbers() {
        const numbers = [];
        for (let i = 0; i <= 500; i++) numbers.push(i);
        return numbers;
    }
    
    function renderWeightList(container, selectedValue) {
        container.innerHTML = '';
        const numbers = generateWeightNumbers();
        numbers.forEach(num => {
            const div = document.createElement('div');
            div.className = 'weight-value-new';
            if (num === selectedValue) div.classList.add('selected');
            div.textContent = num;
            div.onclick = () => {
                selectedWeight = num;
                renderWeightList(container, selectedWeight);
                previewSpan.textContent = `${selectedWeight} кг`;
                highlightWeightSelected();
            };
            container.appendChild(div);
        });
    }
    
    function highlightWeightSelected() {
        document.querySelectorAll('#weightListNew .weight-value-new').forEach(el => {
            const val = parseInt(el.textContent);
            if (val === selectedWeight) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }
    
    function scrollToWeightSelected() {
        const items = document.querySelectorAll('#weightListNew .weight-value-new');
        for (let i = 0; i < items.length; i++) {
            if (parseInt(items[i].textContent) === selectedWeight) {
                items[i].scrollIntoView({ block: 'center', behavior: 'smooth' });
                break;
            }
        }
    }
    
    const weightListDiv = document.getElementById('weightListNew');
    renderWeightList(weightListDiv, selectedWeight);
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    setTimeout(scrollToWeightSelected, 100);
    
    const closeModal = () => {
        modal.remove();
        document.body.style.overflow = '';
        currentWeightInput = null;
    };
    
    const applyValue = async () => {
        const value = selectedWeight === 0 ? '0' : selectedWeight.toString();
        
        if (currentWeightInput && currentWeightExerciseId !== null && currentWeightSetIndex !== null) {
            currentWeightInput.value = value === '0' ? '' : value;
            updateSet(currentWeightExerciseId, currentWeightSetIndex, 'weight', value);
            await saveProgramDataToDB();
            showCustomAlert('✅ Вес сохранён', 'Готово', '✅');
        }
        closeModal();
    };
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    confirmBtn.onclick = applyValue;
    
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// ========== ФОТО ==========
function addExercisePhoto(exerciseId) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
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
        if (!file) return;

        const modal     = document.getElementById('uploadPhotoModal');
        const fill      = document.getElementById('uploadProgressFill');
        const percent   = document.getElementById('uploadProgressPercent');
        const cancelBtn = document.getElementById('uploadCancelBtn');
        const subtitle  = modal.querySelector('.upload-modal-subtitle');

        // Сброс состояния
        modal.style.display = 'flex';
        fill.style.transition = 'width .15s ease';
        fill.style.width = '0%';
        percent.textContent = '0%';
        if (subtitle) subtitle.textContent = 'Идёт загрузка...';

        const formData = new FormData();
        formData.append('photo', file);

        const xhr = new XMLHttpRequest();
        let cancelled = false;
        let realProgressReceived = false;

        // --- Плавный анимированный прогресс (резервный) ---
        // Имитирует загрузку до 90% если сервер не отдаёт реальный прогресс
        let fakeProgress = 0;
        const fakeTimer = setInterval(function() {
            if (realProgressReceived || cancelled) {
                clearInterval(fakeTimer);
                return;
            }
            // Замедляемся по мере приближения к 90%
            const step = (90 - fakeProgress) * 0.04;
            fakeProgress = Math.min(fakeProgress + Math.max(step, 0.3), 90);
            fill.style.width = fakeProgress + '%';
            percent.textContent = Math.round(fakeProgress) + '%';
        }, 80);

        // Кнопка отмены
        cancelBtn.onclick = function() {
            cancelled = true;
            clearInterval(fakeTimer);
            xhr.abort();
            modal.style.display = 'none';
        };

        // Реальный прогресс (если браузер/сервер поддерживает)
        xhr.upload.addEventListener('progress', function(e) {
            if (!e.lengthComputable) return;
            realProgressReceived = true;
            clearInterval(fakeTimer);
            const pct = Math.round((e.loaded / e.total) * 100);
            fill.style.width = pct + '%';
            percent.textContent = pct + '%';
        });

        // Завершение
        xhr.addEventListener('load', function() {
            clearInterval(fakeTimer);
            if (cancelled) return;

            // Анимируем до 100%
            fill.style.transition = 'width .3s ease';
            fill.style.width = '100%';
            percent.textContent = '100%';
            if (subtitle) subtitle.textContent = 'Готово!';

            setTimeout(function() {
                modal.style.display = 'none';
                fill.style.transition = 'width .15s ease';
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.success && data.photoUrl) {
                        if (!exercise.photos) exercise.photos = [];
                        exercise.photos.push(data.photoUrl);
                        saveCurrentExercises(exercises);
                        saveProgramDataToDB();
                        renderExercises();
                        showCustomAlert('✅ Фото добавлено!', 'Готово', '✅');
                    } else {
                        showCustomAlert('❌ Ошибка загрузки', 'Ошибка', '❌');
                    }
                } catch(err) {
                    showCustomAlert('❌ Ошибка сервера', 'Ошибка', '❌');
                }
            }, 400);
        });

        xhr.addEventListener('error', function() {
            clearInterval(fakeTimer);
            modal.style.display = 'none';
            if (!cancelled) showCustomAlert('❌ Ошибка сети', 'Ошибка', '❌');
        });

        xhr.addEventListener('abort', function() {
            clearInterval(fakeTimer);
            modal.style.display = 'none';
        });

        xhr.open('POST', '/api/upload-exercise-photo');
        xhr.send(formData);
    };
    input.click();
}

async function deleteExercisePhoto(exerciseId, photoIndex) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise?.photos?.[photoIndex]) return;
    
    const confirmed = await showCustomConfirm('Удалить фото?', 'Подтверждение');
    if (confirmed) {
        const photoUrl = exercise.photos[photoIndex];
        try {
            await fetch('/api/delete-exercise-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoUrl })
            });
        } catch (err) {}
        exercise.photos.splice(photoIndex, 1);
        saveCurrentExercises(exercises);
        await saveProgramDataToDB();
        renderExercises(searchInput?.value || '');
        await showCustomAlert('🗑️ Фото удалено', 'Готово', '✅');
    }
}

// ========== ОБРАБОТЧИКИ КНОПОК ==========
if (commentSaveBtn) {
    commentSaveBtn.onclick = saveComment;
}
if (commentCancelBtn) {
    commentCancelBtn.onclick = closeCommentModal;
}
if (commentModalClose) {
    commentModalClose.onclick = closeCommentModal;
}
if (commentTextarea) {
    commentTextarea.oninput = updateCommentCharCounter;
}

window.addEventListener('click', (e) => {
    if (e.target === commentModal) {
        closeCommentModal();
    }
    if (e.target === document.getElementById('repsRangeModalNew')) {
        document.getElementById('repsRangeModalNew')?.remove();
        document.body.style.overflow = '';
    }
    if (e.target === document.getElementById('weightModalNew')) {
        document.getElementById('weightModalNew')?.remove();
        document.body.style.overflow = '';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (commentModal?.style.display === 'flex') {
            closeCommentModal();
        }
        if (document.getElementById('repsRangeModalNew')) {
            document.getElementById('repsRangeModalNew')?.remove();
            document.body.style.overflow = '';
        }
        if (document.getElementById('weightModalNew')) {
            document.getElementById('weightModalNew')?.remove();
            document.body.style.overflow = '';
        }
    }
});

// ========== ЭКСПОРТ ФУНКЦИЙ ==========
window.editProgramTitle = editProgramTitle;
window.saveProgramTitle = saveProgramTitle;
window.cancelProgramTitle = cancelProgramTitle;
window.addExercise = addExercise;
window.editExerciseName = editExerciseName;
window.deleteExercise = deleteExercise;
window.addSet = addSet;
window.updateSet = updateSet;
window.deleteSet = deleteSet;
window.addComment = addComment;
window.editComment = editComment;
window.deleteComment = deleteComment;
window.saveComment = saveComment;
window.closeCommentModal = closeCommentModal;
window.toggleExercise = toggleExercise;
window.addExercisePhoto = addExercisePhoto;
window.deleteExercisePhoto = deleteExercisePhoto;
window.openWeightPicker = openWeightPicker;
window.openRepsRangePicker = openRepsRangePicker;

console.log('✅ program3.js загружен, toggleExercise доступна:', typeof toggleExercise);