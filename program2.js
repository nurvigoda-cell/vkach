// program2.js - Кастомные диалоговые окна и рендеринг

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
            if (e.key === 'Enter') onOk();
        });
    });
}

function updateEditNameCounter() {
    const len = editNameInput.value.length;
    editNameCounter.textContent = `${len}/100`;
    if (len > 90) editNameCounter.style.color = '#ffaa00';
    else editNameCounter.style.color = '#aaa';
}

// ========== ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ТЕКУЩИХ УПРАЖНЕНИЙ ==========
function getCurrentExercises() {
    if (!programData.days || programData.days.length === 0) return [];
    return programData.days[currentDayIndex].exercises;
}

function saveCurrentExercises(exercises) {
    if (!programData.days || programData.days.length === 0) return;
    programData.days[currentDayIndex].exercises = exercises;
}

// ========== РЕНДЕРИНГ ==========
function renderPhotosGrid(exercise) {
    if (!exercise.photos || exercise.photos.length === 0) {
        return `<div class="add-photo-btn" onclick="addExercisePhoto('${exercise.id}')">+</div>`;
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
                <td>
                    <input type="text" class="set-input weight-input" value="${escapeHtml(weightDisplay)}" placeholder="0" 
                        data-exercise-id="${exercise.id}" data-set-index="${index}" data-field="weight"
                        onclick="openWeightPicker(this, '${exercise.id}', ${index}, '${escapeHtml(weightValue)}')"
                        readonly>
                <\/td>
                <td><button class="delete-set-btn" onclick="deleteSet('${exercise.id}', ${index})">🗑️<\/button><\/td>
            <\/tr>
        `;
    });
    return html;
}

function renderExercises(filterText = '') {
    let exercises = [...getCurrentExercises()];
    const currentDayName = programData.days[currentDayIndex]?.name || 'Тренировка';
    
    if (filterText) {
        const searchTerm = filterText.toLowerCase();
        exercises = exercises.filter(ex => ex.name.toLowerCase().includes(searchTerm));
    }
    
    if (exercises.length === 0) {
        exercisesList.innerHTML = `
            <div class="empty-exercises">
                <div class="empty-icon">💪</div>
                <p>Нет упражнений в "${escapeHtml(currentDayName)}"</p>
                <p class="empty-hint">Нажмите «+ Добавить упражнение», чтобы создать первое</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    exercises.forEach((exercise, index) => {
        const originalIndex = getCurrentExercises().findIndex(e => e.id === exercise.id);
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
}