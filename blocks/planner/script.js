// ===== TREKER-PLANNER script.js v1.0 =====

const API = '/api/planner';
let userId = localStorage.getItem('currentUserId');

// ===== СОСТОЯНИЕ =====
let currentDate  = new Date();
let selectedDate = new Date();
let calYear  = currentDate.getFullYear();
let calMonth = currentDate.getMonth();

let allEvents   = [];   // события текущего месяца + соседних
let allTypes    = [];   // все типы событий
let editingEventId  = null;
let selectedTypeId  = null;
let selectedColor   = '#E9AE67';
let viewingEvent    = null;
let filterTypeIds   = null; // null = все
let searchDebounce  = null;

const COLORS = ['#E9AE67','#4caf8a','#4fc3f7','#ef5350','#ce93d8','#fff176','#f48fb1','#aaaaaa'];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];
const DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

function pad(n){ return String(n).padStart(2,'0'); }
function toDateStr(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayStr(){ return toDateStr(new Date()); }
function formatDate(str){
    if (!str) return '';
    const d = new Date(str+'T00:00:00');
    return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(t){ return t ? t.slice(0,5) : ''; }
function esc(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

// ===== НАВИГАЦИЯ =====
let prevScreen = 'main';

function showScreen(name) {
    // 'create' — это экран создания, используем screenEdit
    if (name === 'create') {
        editingEventId = null;
        selectedTypeId = null;
        selectedColor  = '#E9AE67';
        initCreateScreen();
        name = 'edit';
    }

    const screens = document.querySelectorAll('.pl-screen');
    const current = [...screens].find(s => s.classList.contains('active'));
    const target  = document.getElementById('screen' + cap(name));

    if (!target) return;

    // Если тот же экран — просто обновляем содержимое без анимации
    if (target === current) {
        if (name === 'main') initMain();
        return;
    }

    // Анимация
    if (current) {
        current.classList.add('slide-out');
        setTimeout(() => current.classList.remove('active','slide-out'), 280);
    }
    target.classList.add('active');
    prevScreen = current?.id.replace('screen','').toLowerCase() || 'main';

    // Инициализация экранов
    if (name === 'main')       initMain();
    if (name === 'edit' && editingEventId) initEditScreen();
    if (name === 'typeSelect') initTypeSelectScreen();
    if (name === 'types')      initTypesScreen();
    if (name === 'search')     initSearchScreen();
}

function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init() {
    userId = localStorage.getItem('currentUserId');
    if (!userId) {
        document.getElementById('plannerApp').innerHTML =
            '<div style="padding:60px 20px;text-align:center;color:#888"><div style="font-size:48px;margin-bottom:16px">🔐</div><div style="font-size:16px;font-weight:700">Войдите в аккаунт,<br>чтобы использовать планировщик</div><br><a href="/login.html" style="color:#E9AE67;font-weight:800;text-decoration:none">Войти →</a></div>';
        return;
    }
    await loadTypes();
    await loadEventsForMonth(calYear, calMonth);
    initMain();
    initCalNav();
    setupNav();
}

function setupNav() {
    const uid = localStorage.getItem('currentUserId');
    document.getElementById('navProfileBottom')?.addEventListener('click', () => {
        if (uid) window.location.href = '/user/' + uid;
        else window.location.href = '/login.html';
    });
    document.getElementById('navMessagesBottom')?.addEventListener('click', () => {
        if (typeof openMessagesModal === 'function') openMessagesModal();
        else if (uid) window.location.href = '/user/' + uid;
        else window.location.href = '/login.html';
    });
    document.getElementById('navBlocksBottom')?.addEventListener('click', () => {
        window.location.href = '/blocks.html';
    });
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadTypes() {
    try {
        const r = await fetch(`${API}/types/${userId}`);
        const d = await r.json();
        if (d.success) allTypes = d.types;
    } catch(e) { console.error(e); }
}

async function loadEventsForMonth(y, m) {
    const from = `${y}-${pad(m+1)}-01`;
    const lastDay = new Date(y, m+1, 0).getDate();
    const to = `${y}-${pad(m+1)}-${pad(lastDay)}`;
    try {
        const r = await fetch(`${API}/events?userId=${userId}&dateFrom=${from}&dateTo=${to}`);
        const d = await r.json();
        if (d.success) {
            allEvents = d.events.map(e => ({
                ...e,
                date_start: e.date_start ? String(e.date_start).slice(0,10) : null,
                date_end:   e.date_end   ? String(e.date_end).slice(0,10)   : null
            }));
        }
    } catch(e) { console.error(e); }
}

// ===== ГЛАВНЫЙ ЭКРАН =====
function initMain() {
    renderCalendar();
    renderDayEvents(toDateStr(selectedDate));
    document.getElementById('dayTitle').textContent =
        `${selectedDate.getDate()} ${MONTHS_GEN[selectedDate.getMonth()]}`;
}

function initCalNav() {
    document.getElementById('btnPrevMonth').onclick = async () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        await loadEventsForMonth(calYear, calMonth);
        renderCalendar();
    };
    document.getElementById('btnNextMonth').onclick = async () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        await loadEventsForMonth(calYear, calMonth);
        renderCalendar();
    };
}

function renderCalendar() {
    document.getElementById('calMonthTitle').textContent = `${MONTHS_RU[calMonth]} ${calYear}`;
    const grid = document.getElementById('calGrid');
    const todayS = todayStr();
    const selectedS = toDateStr(selectedDate);

    // Первый день месяца (понедельник = 0)
    const firstDay = new Date(calYear, calMonth, 1);
    let startDow = firstDay.getDay(); // 0=вс
    startDow = startDow === 0 ? 6 : startDow - 1; // сдвиг на пн=0

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrev  = new Date(calYear, calMonth, 0).getDate();

    // Группируем события по дате
    const evtMap = {};
    allEvents.forEach(e => {
        if (!evtMap[e.date_start]) evtMap[e.date_start] = [];
        evtMap[e.date_start].push(e);
    });

    let html = '';
    // Ячейки предыдущего месяца
    for (let i = startDow - 1; i >= 0; i--) {
        const d = daysInPrev - i;
        const ds = `${calYear}-${pad(calMonth === 0 ? 12 : calMonth)}-${pad(d)}`;
        html += dayCell(d, ds, todayS, selectedS, evtMap[ds], true);
    }
    // Ячейки текущего месяца
    for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${calYear}-${pad(calMonth+1)}-${pad(d)}`;
        html += dayCell(d, ds, todayS, selectedS, evtMap[ds], false);
    }
    // Ячейки следующего месяца
    const total = startDow + daysInMonth;
    const remainder = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remainder; d++) {
        const ds = `${calYear}-${pad(calMonth === 11 ? 1 : calMonth+2)}-${pad(d)}`;
        html += dayCell(d, ds, todayS, selectedS, evtMap[ds], true);
    }

    grid.innerHTML = html;
    grid.querySelectorAll('.pl-cal-day').forEach(el => {
        el.addEventListener('click', () => {
            const ds = el.dataset.date;
            selectedDate = new Date(ds + 'T00:00:00');
            renderCalendar();
            renderDayEvents(ds);
            document.getElementById('dayTitle').textContent =
                `${selectedDate.getDate()} ${MONTHS_GEN[selectedDate.getMonth()]}`;
        });
    });
}

function dayCell(d, ds, todayS, selectedS, events, otherMonth) {
    const cls = [
        'pl-cal-day',
        otherMonth ? 'other-month' : '',
        ds === todayS ? 'today' : '',
        ds === selectedS ? 'selected' : ''
    ].filter(Boolean).join(' ');

    let dotsHtml = '';
    if (events && events.length > 0) {
        if (events.length <= 3) {
            dotsHtml = events.map(e =>
                `<div class="pl-cal-dot" style="background:${e.color||e.type_color||'#E9AE67'}"></div>`
            ).join('');
        } else {
            // Берём цвет первого события для полоски
            dotsHtml = `<div class="pl-cal-dot-bar" style="background:${events[0].color||events[0].type_color||'#E9AE67'}"></div>`;
        }
    }
    return `<div class="${cls}" data-date="${ds}">
        <div class="pl-cal-day-num">${d}</div>
        <div class="pl-cal-dots">${dotsHtml}</div>
    </div>`;
}

function renderDayEvents(dateStr) {
    const list = document.getElementById('eventsList');
    const dayEvents = allEvents.filter(e => e.date_start === dateStr)
        .sort((a,b) => (a.time_val||'99:99') > (b.time_val||'99:99') ? 1 : -1);

    if (dayEvents.length === 0) {
        list.innerHTML = `<div class="pl-empty-day">
            <div class="pl-empty-day-icon">📅</div>
            <div class="pl-empty-day-text">На этот день событий нет</div>
            <button class="pl-empty-day-btn" onclick="showScreen('create')">+ Создать событие</button>
        </div>`;
        return;
    }

    list.innerHTML = dayEvents.map((e, i) => `
        <div class="pl-event-card${e.is_done?' done':''}" 
             style="--event-color:${e.color||e.type_color||'#E9AE67'};animation-delay:${i*0.05}s"
             onclick="openEventView(${e.id})">
            <button class="pl-event-check${e.is_done?' checked':''}" 
                    onclick="event.stopPropagation(); toggleDone(${e.id}, ${e.is_done?0:1})"
                    title="${e.is_done?'Снять выполнение':'Отметить выполненным'}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
            </button>
            <div class="pl-event-time">${formatTime(e.time_val)||'—'}</div>
            <div class="pl-event-info">
                <div class="pl-event-title">${esc(e.title)}</div>
                <div class="pl-event-type">${esc(e.type_name||'Без типа')}</div>
            </div>
            <span class="pl-event-arrow">›</span>
        </div>
    `).join('');
}

// ===== СОЗДАНИЕ ===== 
function initCreateScreen() {
    editingEventId = null;
    selectedTypeId = null;
    selectedColor  = '#E9AE67';
    document.getElementById('editScreenTitle').textContent = 'Новое событие';
    document.getElementById('editEventId').value = '';
    document.getElementById('editTitle').value = '';
    document.getElementById('editNote').value = '';
    document.getElementById('editDone').checked = false;
    document.getElementById('editDateStart').value = toDateStr(selectedDate);
    document.getElementById('editDateEnd').value = '';
    // Текущее время
    const now = new Date();
    document.getElementById('editTime').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById('editTypeName').textContent = 'Выбрать тип';
    renderColorPicker('editColorRow', selectedColor, c => { selectedColor = c; });
    if (selectedTypeId) {
        const t = allTypes.find(x => x.id === selectedTypeId);
        if (t) document.getElementById('editTypeName').textContent = t.name;
    }
    initWeekdays();
    // Показываем выбор дней при создании
    const wdGroup = document.getElementById('editWeekdays')?.closest('.pl-form-group');
    if (wdGroup) wdGroup.style.display = '';
    document.getElementById('editDateEnd').oninput = updateWdHint;
    document.getElementById('editDateStart').oninput = updateWdHint;
}

function initWeekdays() {
    document.querySelectorAll('.pl-wd').forEach(btn => {
        btn.classList.remove('active');
        btn.onclick = () => {
            btn.classList.toggle('active');
            updateWdHint();
        };
    });
    document.getElementById('wdHint').textContent = '';
    document.getElementById('wdHint').className = 'pl-wd-hint';
}

function getSelectedDays() {
    return [...document.querySelectorAll('.pl-wd.active')].map(b => parseInt(b.dataset.day));
}

function updateWdHint() {
    const days = getSelectedDays();
    const dateEnd = document.getElementById('editDateEnd').value;
    const hint = document.getElementById('wdHint');
    if (!days.length) { hint.textContent = ''; return; }
    const names = {0:'вс',1:'пн',2:'вт',3:'ср',4:'чт',5:'пт',6:'сб'};
    const dayNames = days.map(d => names[d]).join(', ');
    if (dateEnd) {
        // Считаем сколько событий создастся
        const start = new Date(document.getElementById('editDateStart').value + 'T00:00:00');
        const end   = new Date(dateEnd + 'T00:00:00');
        let count = 0, cur = new Date(start);
        while (cur <= end && count < 1000) { if (days.includes(cur.getDay())) count++; cur.setDate(cur.getDate()+1); }
        hint.textContent = `Будет создано ${count} событий (${dayNames})`;
    } else {
        hint.textContent = `Каждую неделю: ${dayNames}`;
    }
    hint.className = 'pl-wd-hint';
}

function initEditScreen() {
    if (!editingEventId) return;
    document.getElementById('editScreenTitle').textContent = 'Редактировать';
    renderColorPicker('editColorRow', selectedColor, c => { selectedColor = c; });
    if (selectedTypeId) {
        const t = allTypes.find(x => x.id === selectedTypeId);
        if (t) document.getElementById('editTypeName').textContent = t.name;
    }
}

function closeEditScreen() {
    if (editingEventId) showScreen('view');
    else showScreen('main');
}

function renderColorPicker(containerId, activeColor, onChange) {
    const row = document.getElementById(containerId);
    row.innerHTML = COLORS.map(c => `
        <div class="pl-color-dot${c===activeColor?' active':''}" 
             style="background:${c}" 
             data-color="${c}"
             onclick="pickColor('${containerId}','${c}')">
        </div>
    `).join('');
    row.querySelectorAll('.pl-color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            row.querySelectorAll('.pl-color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            if (onChange) onChange(dot.dataset.color);
        });
    });
}

function pickColor(containerId, c) {
    selectedColor = c;
    document.querySelectorAll(`#${containerId} .pl-color-dot`).forEach(d => {
        d.classList.toggle('active', d.dataset.color === c);
    });
}

async function saveEvent() {
    const title     = document.getElementById('editTitle').value.trim();
    const time      = document.getElementById('editTime').value;
    const dateStart = document.getElementById('editDateStart').value;
    const dateEnd   = document.getElementById('editDateEnd').value || null;
    const selectedDays = getSelectedDays();
    const uid = localStorage.getItem('currentUserId');

    // Валидация
    if (!title)    { toast('Введите название'); document.getElementById('editTitle').focus(); return; }
    if (!dateStart){ toast('Укажите дату'); return; }
    if (!uid)      { toast('Войдите в аккаунт'); return; }

    // При редактировании — без проверки дней (одиночное событие)
    if (!editingEventId && !selectedDays.length) {
        const hint = document.getElementById('wdHint');
        if (hint) { hint.textContent = 'Выберите хотя бы один день недели'; hint.className = 'pl-wd-hint error'; }
        toast('Выберите дни недели');
        return;
    }

    const baseBody = {
        userId: uid, typeId: selectedTypeId || null, title,
        note:   document.getElementById('editNote').value.trim() || null,
        color:  selectedColor, timeVal: time || null,
        isDone: document.getElementById('editDone').checked ? 1 : 0
    };

    try {
        // Редактирование — одно событие
        if (editingEventId) {
            const r = await fetch(`${API}/events/${editingEventId}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({...baseBody, dateStart, dateEnd})
            });
            const d = await r.json();
            if (!d.success) { toast('Ошибка сохранения'); return; }
            toast('✅ Сохранено');
            await afterSave(dateStart);
            return;
        }

        // Создание — генерируем список дат
        const dates = generateDates(dateStart, dateEnd, selectedDays);
        if (!dates.length) { toast('Нет подходящих дат'); return; }

        showProgressModal('Создаём события', 'Пожалуйста, подождите...');

        let created = 0;
        const BATCH = 20;
        for (let i = 0; i < dates.length; i += BATCH) {
            const batch = dates.slice(i, i + BATCH);
            const results = await Promise.all(batch.map(ds =>
                fetch(`${API}/events`, {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({...baseBody, dateStart: ds, dateEnd: null})
                }).then(r => r.json()).catch(() => ({success: false}))
            ));
            created += results.filter(d => d.success).length;
            updateProgressModal(created, dates.length, 'Создано ' + created + ' из ' + dates.length);
        }

        if (created > 0) {
            finishProgressModal('✅', 'Готово!', 'Создано событий: ' + created);
            await afterSave(dateStart);
        } else {
            finishProgressModal('❌', 'Ошибка', 'Не удалось создать события');
        }
    } catch(e) { console.error('saveEvent error:', e); toast('Ошибка сети'); }
}

// Генерация дат по дням недели
function generateDates(dateStart, dateEnd, days) {
    const dates = [];
    const start = new Date(dateStart + 'T00:00:00');
    // Если нет dateEnd — берём 365 дней вперёд
    const end = dateEnd
        ? new Date(dateEnd + 'T00:00:00')
        : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);

    let cur = new Date(start);
    while (cur <= end && dates.length < 500) {
        if (days.includes(cur.getDay())) {
            dates.push(toDateStr(cur));
        }
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

async function afterSave(dateStart) {
    selectedDate = new Date(dateStart + 'T00:00:00');
    calYear  = selectedDate.getFullYear();
    calMonth = selectedDate.getMonth();
    editingEventId = null;
    await loadEventsForMonth(calYear, calMonth);
    document.querySelectorAll('.pl-screen').forEach(s => s.classList.remove('active','slide-out'));
    document.getElementById('screenMain').classList.add('active');
    renderCalendar();
    renderDayEvents(toDateStr(selectedDate));
    document.getElementById('dayTitle').textContent =
        selectedDate.getDate() + ' ' + MONTHS_GEN[selectedDate.getMonth()];
}

// ===== ПРОСМОТР =====
function openEventView(id) {
    viewingEvent = allEvents.find(e => e.id === id);
    if (!viewingEvent) return;
    showScreen('view');
    renderEventView(viewingEvent);
}

function renderEventView(e) {
    const type = allTypes.find(t => t.id === e.type_id);
    const color = e.color || e.type_color || '#E9AE67';
    const body = document.getElementById('viewBody');
    body.innerHTML = `
        <div class="pl-view-title-card" style="--view-color:${color}">
            <div class="pl-view-main-title">${esc(e.title)}</div>
            <div class="pl-view-main-type">${esc(type?.name||'Без типа')}</div>
        </div>
        ${e.time_val ? viewRow('🕐','Время', formatTime(e.time_val)) : ''}
        ${viewRow('📅','Дата начала', formatDate(e.date_start))}
        ${e.date_end ? viewRow('📅','Дата окончания', formatDate(e.date_end)) : ''}
        <div class="pl-view-row" style="animation-delay:0.1s">
            <div class="pl-view-icon">🎨</div>
            <div>
                <div class="pl-view-label">Цвет</div>
                <div style="width:20px;height:20px;border-radius:50%;background:${color};margin-top:4px"></div>
            </div>
        </div>
        ${e.note ? viewRow('📝','Примечание', e.note) : ''}
        <div class="pl-view-row" style="cursor:pointer" onclick="toggleDoneFromView()">
            <div class="pl-view-icon">${e.is_done ? '✅' : '⬜'}</div>
            <div>
                <div class="pl-view-label">Статус</div>
                <div class="pl-view-val" style="color:${e.is_done ? 'var(--green)' : 'var(--muted)'}">
                    ${e.is_done ? 'Выполнено — нажмите чтобы снять' : 'Не выполнено — нажмите чтобы отметить'}
                </div>
            </div>
        </div>
    `;
}

function viewRow(icon, label, val) {
    return `<div class="pl-view-row">
        <div class="pl-view-icon">${icon}</div>
        <div>
            <div class="pl-view-label">${label}</div>
            <div class="pl-view-val">${esc(String(val))}</div>
        </div>
    </div>`;
}

function openEditFromView() {
    if (!viewingEvent) return;
    editingEventId = viewingEvent.id;
    selectedTypeId = viewingEvent.type_id;
    selectedColor  = viewingEvent.color || '#E9AE67';
    // Заполняем форму
    document.getElementById('editScreenTitle').textContent = 'Редактировать';
    document.getElementById('editEventId').value = viewingEvent.id;
    document.getElementById('editTitle').value = viewingEvent.title || '';
    document.getElementById('editNote').value  = viewingEvent.note  || '';
    document.getElementById('editDone').checked = !!viewingEvent.is_done;
    document.getElementById('editDateStart').value = viewingEvent.date_start || '';
    document.getElementById('editDateEnd').value   = viewingEvent.date_end   || '';
    document.getElementById('editTime').value      = viewingEvent.time_val   ? viewingEvent.time_val.slice(0,5) : '';
    const t = allTypes.find(x => x.id === viewingEvent.type_id);
    document.getElementById('editTypeName').textContent = t ? t.name : 'Выбрать тип';
    renderColorPicker('editColorRow', selectedColor, c => { selectedColor = c; });
    // При редактировании скрываем выбор дней (не нужен)
    const wdGroup = document.getElementById('editWeekdays')?.closest('.pl-form-group');
    if (wdGroup) wdGroup.style.display = 'none';
    showScreen('edit');
}

async function deleteEventFromView() {
    if (!viewingEvent) return;
    const uid = localStorage.getItem('currentUserId');
    const titleToFind = viewingEvent.title;
    const eventId = viewingEvent.id;

    // Загружаем ВСЕ события с таким же названием
    let sameTitle = [];
    try {
        const sr = await fetch(`${API}/search?userId=${uid}&q=${encodeURIComponent(titleToFind)}`);
        const sd = await sr.json();
        if (sd.success) sameTitle = sd.events.filter(e => e.title === titleToFind);
    } catch(e) { sameTitle = allEvents.filter(e => e.title === titleToFind); }

    // Показываем диалог выбора
    let deleteAll = false;
    if (sameTitle.length > 1) {
        const choice = await showDeleteDialog(titleToFind, sameTitle.length);
        if (choice === null) return; // отмена
        deleteAll = choice;
    } else {
        if (!confirm(`Удалить «${titleToFind}»?`)) return;
    }

    // Мгновенно скрываем визуально и уходим на главный
    if (deleteAll) {
        allEvents = allEvents.filter(e => e.title !== titleToFind);
    } else {
        allEvents = allEvents.filter(e => e.id !== eventId);
    }
    viewingEvent = null;
    renderCalendar();
    renderDayEvents(toDateStr(selectedDate));
    document.getElementById('dayTitle').textContent =
        selectedDate.getDate() + ' ' + MONTHS_GEN[selectedDate.getMonth()];
    document.querySelectorAll('.pl-screen').forEach(s => s.classList.remove('active','slide-out'));
    document.getElementById('screenMain').classList.add('active');

    // Показываем прогресс-модал
    if (deleteAll) {
        showProgressModal('Удаляем серию', 'Пожалуйста, подождите...');
        const toDelete = sameTitle.map(e => e.id);
        let deleted = 0;
        const BATCH = 20;
        try {
            for (let i = 0; i < toDelete.length; i += BATCH) {
                const batch = toDelete.slice(i, i + BATCH);
                const results = await Promise.all(batch.map(id =>
                    fetch(`${API}/events/${id}`, {
                        method:'DELETE', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({userId: uid})
                    }).then(r => r.json()).catch(() => ({success:false}))
                ));
                deleted += results.filter(d => d.success).length;
                updateProgressModal(deleted, toDelete.length, 'Удалено ' + deleted + ' из ' + toDelete.length);
            }
            finishProgressModal('✅', 'Готово!', 'Удалено событий: ' + deleted);
        } catch(e) {
            finishProgressModal('❌', 'Ошибка', 'Что-то пошло не так');
        }
    } else {
        showProgressModal('Удаляем событие', 'Пожалуйста, подождите...');
        try {
            const r = await fetch(`${API}/events/${eventId}`, {
                method:'DELETE', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({userId: uid})
            });
            const d = await r.json();
            if (d.success) finishProgressModal('✅', 'Удалено', '');
            else finishProgressModal('❌', 'Ошибка', 'Не удалось удалить');
        } catch(e) {
            finishProgressModal('❌', 'Ошибка', 'Нет соединения');
        }
    }

    // Синхронизируем с сервером в фоне
    loadEventsForMonth(calYear, calMonth).then(() => {
        renderCalendar();
        renderDayEvents(toDateStr(selectedDate));
    });
}


// Диалог выбора удаления
function showDeleteDialog(title, count) {
    return new Promise(resolve => {
        // Убираем старый если есть
        document.getElementById('deleteDialog')?.remove();

        const d = document.createElement('div');
        d.id = 'deleteDialog';
        d.style.cssText = `
            position:fixed;inset:0;background:rgba(0,0,0,0.75);
            z-index:99999;display:flex;align-items:flex-end;justify-content:center;
            backdrop-filter:blur(4px);animation:fadeIn .2s ease;
        `;
        d.innerHTML = `
            <div style="
                background:#1c1c22;border-radius:20px 20px 0 0;
                width:100%;max-width:600px;padding:24px 20px 32px;
                border-top:1px solid rgba(233,174,103,0.2);
                animation:slideUp .25s cubic-bezier(.34,1.2,.64,1);
            ">
                <div style="font-size:16px;font-weight:900;color:#f0f0f0;margin-bottom:6px">
                    Удалить «${esc(title)}»?
                </div>
                <div style="font-size:13px;color:#888;margin-bottom:20px">
                    Найдено ${count} событий с таким названием
                </div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <button id="delOne" style="
                        padding:14px;background:rgba(239,83,80,0.1);
                        border:1.5px solid rgba(239,83,80,0.3);border-radius:14px;
                        color:#ef5350;font-size:14px;font-weight:800;font-family:inherit;
                        cursor:pointer;transition:all .2s;text-align:left;
                    ">🗑️ Удалить только это событие</button>
                    <button id="delAll" style="
                        padding:14px;background:rgba(239,83,80,0.18);
                        border:1.5px solid rgba(239,83,80,0.5);border-radius:14px;
                        color:#ef5350;font-size:14px;font-weight:800;font-family:inherit;
                        cursor:pointer;transition:all .2s;text-align:left;
                    ">🗑️🗑️ Удалить все ${count} событий (всю серию)</button>
                    <button id="delCancel" style="
                        padding:14px;background:rgba(255,255,255,0.05);
                        border:1px solid rgba(255,255,255,0.08);border-radius:14px;
                        color:#888;font-size:14px;font-weight:800;font-family:inherit;
                        cursor:pointer;transition:all .2s;
                    ">Отмена</button>
                </div>
            </div>`;

        document.body.appendChild(d);

        d.querySelector('#delOne').onclick    = () => { d.remove(); resolve(false); };
        d.querySelector('#delAll').onclick    = () => { d.remove(); resolve(true); };
        d.querySelector('#delCancel').onclick = () => { d.remove(); resolve(null); };
        d.onclick = e => { if (e.target === d) { d.remove(); resolve(null); } };
    });
}

// ===== ВЫПОЛНЕНИЕ =====
async function toggleDoneFromView() {
    if (!viewingEvent) return;
    const newDone = viewingEvent.is_done ? 0 : 1;
    await toggleDone(viewingEvent.id, newDone);
    viewingEvent.is_done = newDone;
    renderEventView(viewingEvent);
}

async function toggleDone(id, isDone) {
    const uid = localStorage.getItem('currentUserId');
    try {
        await fetch(`${API}/events/${id}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({userId: uid, isDone})
        });
        const ev = allEvents.find(e => e.id === id);
        if (ev) ev.is_done = isDone;
        renderDayEvents(toDateStr(selectedDate));
    } catch(e) {}
}

// ===== ВЫБОР ТИПА =====
function initTypeSelectScreen() {
    const list = document.getElementById('typeSelectList');
    const defaults = allTypes.filter(t => t.is_default);
    const customs  = allTypes.filter(t => !t.is_default && t.user_id != 0);

    let html = '';
    if (defaults.length) {
        html += '<div class="pl-type-section-title">Стандартные типы</div>';
        html += defaults.map(t => typeItem(t)).join('');
    }
    if (customs.length) {
        html += '<div class="pl-type-section-title">Ваши типы</div>';
        html += customs.map(t => typeItem(t)).join('');
    }
    html += `<div class="pl-type-section-title" style="margin-top:6px"></div>
        <div class="pl-type-item" onclick="showScreen('types')" style="border-style:dashed;opacity:0.7">
            <div class="pl-type-dot" style="background:#555"></div>
            <div class="pl-type-name" style="color:#888">+ Создать тип</div>
        </div>`;
    list.innerHTML = html;

    list.querySelectorAll('.pl-type-item[data-id]').forEach(el => {
        el.addEventListener('click', () => {
            selectedTypeId = parseInt(el.dataset.id);
            const t = allTypes.find(x => x.id === selectedTypeId);
            if (t) {
                document.getElementById('editTypeName').textContent = t.name;
                selectedColor = t.color || selectedColor;
                renderColorPicker('editColorRow', selectedColor, c => { selectedColor = c; });
            }
            showScreen('edit');
        });
    });
}

function typeItem(t) {
    return `<div class="pl-type-item${t.id===selectedTypeId?' selected':''}" data-id="${t.id}">
        <div class="pl-type-dot" style="background:${t.color}"></div>
        <div class="pl-type-name">${esc(t.name)}</div>
        ${t.id===selectedTypeId ? '<div class="pl-type-check">✓</div>' : ''}
    </div>`;
}

// ===== УПРАВЛЕНИЕ ТИПАМИ =====
function initTypesScreen() {
    renderTypesManage();
    hideAddTypeForm();
    // Цвет по умолчанию для нового типа
    renderColorPicker('newTypeColorRow', '#E9AE67', c => { selectedColor = c; });
}

function renderTypesManage() {
    const list = document.getElementById('typesManageList');
    const defaults = allTypes.filter(t => t.is_default || t.user_id == 0);
    const customs  = allTypes.filter(t => !t.is_default && t.user_id != 0);

    let html = '';
    if (defaults.length) {
        html += '<div class="pl-type-section-title">Стандартные</div>';
        html += defaults.map(t => `
            <div class="pl-manage-type-item">
                <div class="pl-type-dot" style="background:${t.color}"></div>
                <div class="pl-type-name" style="flex:1">${esc(t.name)}</div>
                <span class="pl-manage-type-badge">системный</span>
            </div>
        `).join('');
    }
    if (customs.length) {
        html += '<div class="pl-type-section-title">Ваши типы</div>';
        html += customs.map(t => `
            <div class="pl-manage-type-item">
                <div class="pl-type-dot" style="background:${t.color}"></div>
                <div class="pl-type-name" style="flex:1">${esc(t.name)}</div>
                <button class="pl-manage-del-btn" onclick="deleteType(${t.id})">🗑️</button>
            </div>
        `).join('');
    }
    if (!defaults.length && !customs.length) {
        html = '<div class="pl-empty">Нет типов. Создайте первый!</div>';
    }
    list.innerHTML = html;
}

function showAddTypeForm() {
    document.getElementById('addTypeForm').style.display = 'flex';
    document.getElementById('newTypeName').focus();
    selectedColor = '#E9AE67';
    renderColorPicker('newTypeColorRow', selectedColor, c => { selectedColor = c; });
}
function hideAddTypeForm() {
    document.getElementById('addTypeForm').style.display = 'none';
    document.getElementById('newTypeName').value = '';
}

async function createType() {
    const name = document.getElementById('newTypeName').value.trim();
    if (!name) { toast('Введите название'); return; }
    try {
        const r = await fetch(`${API}/types`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({userId, name, color: selectedColor})
        });
        const d = await r.json();
        if (d.success) {
            toast('✅ Тип создан');
            await loadTypes();
            hideAddTypeForm();
            renderTypesManage();
        }
    } catch(e) { toast('Ошибка'); }
}

async function deleteType(id) {
    const t = allTypes.find(x => x.id === id);
    if (!confirm(`Удалить тип «${t?.name}»?`)) return;
    try {
        const r = await fetch(`${API}/types/${id}`, {
            method:'DELETE', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({userId})
        });
        const d = await r.json();
        if (d.success) {
            toast('🗑️ Тип удалён');
            await loadTypes();
            renderTypesManage();
        } else {
            toast('Нельзя удалить системный тип');
        }
    } catch(e) { toast('Ошибка'); }
}

// ===== ПОИСК =====
let searchPage = 0;
const SEARCH_PAGE_SIZE = 20;
let searchAllResults = [];

function initSearchScreen() {
    const input = document.getElementById('searchInput');
    input.value = '';
    document.getElementById('filtersPanel').style.display = 'none';
    renderFilterTypes();
    // Показываем последние 20 событий сразу
    loadInitialEvents();
    input.oninput = () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(doSearch, 300);
    };
    setTimeout(() => input.focus(), 300);
}

async function loadInitialEvents() {
    const uid = localStorage.getItem('currentUserId');
    if (!uid) return;
    try {
        const r = await fetch(`${API}/events?userId=${uid}`);
        const d = await r.json();
        if (d.success) {
            searchAllResults = d.events.map(e => ({
                ...e,
                date_start: e.date_start ? String(e.date_start).slice(0,10) : null
            })).sort((a,b) => (b.date_start||'') > (a.date_start||'') ? 1 : -1);
            searchPage = 0;
            renderSearchResults(searchAllResults.slice(0, SEARCH_PAGE_SIZE), true);
        }
    } catch(e) {}
}

function renderFilterTypes() {
    const container = document.getElementById('filterTypes');
    container.innerHTML = allTypes.map(t => `
        <div class="pl-filter-type-row" onclick="toggleFilterType(this)">
            <div class="pl-filter-type-info">
                <div class="pl-type-dot" style="background:${t.color}"></div>
                <div class="pl-filter-type-name">${esc(t.name)}</div>
            </div>
            <div class="pl-toggle on" data-type-id="${t.id}"></div>
        </div>
    `).join('');
}

function toggleFilterType(row) {
    const toggle = row.querySelector('.pl-toggle');
    toggle.classList.toggle('on');
}

function toggleFilters() {
    const panel = document.getElementById('filtersPanel');
    const visible = panel.style.display !== 'none';
    panel.style.display = visible ? 'none' : '';
}

function resetFilters() {
    filterTypeIds = null;
    document.querySelectorAll('#filterTypes .pl-toggle').forEach(t => t.classList.add('on'));
    doSearch();
}

function applyFilters() {
    const active = [...document.querySelectorAll('#filterTypes .pl-toggle.on')]
        .map(t => parseInt(t.dataset.typeId));
    filterTypeIds = active.length === allTypes.length ? null : active;
    document.getElementById('filtersPanel').style.display = 'none';
    doSearch();
}

async function doSearch() {
    const uid = localStorage.getItem('currentUserId');
    if (!uid) return;
    const q = document.getElementById('searchInput').value.trim();
    if (!q && !filterTypeIds) {
        // Нет запроса — показываем все события
        loadInitialEvents();
        return;
    }
    try {
        let url = `${API}/search?userId=${uid}`;
        if (q) url += `&q=${encodeURIComponent(q)}`;
        if (filterTypeIds) url += `&types=${filterTypeIds.join(',')}`;
        const r = await fetch(url);
        const d = await r.json();
        searchAllResults = (d.events || []).map(e => ({
            ...e,
            date_start: e.date_start ? String(e.date_start).slice(0,10) : null
        }));
        searchPage = 0;
        renderSearchResults(searchAllResults.slice(0, SEARCH_PAGE_SIZE), true);
    } catch(e) {}
}

function loadMoreSearchResults() {
    searchPage++;
    const start = searchPage * SEARCH_PAGE_SIZE;
    const more = searchAllResults.slice(start, start + SEARCH_PAGE_SIZE);
    renderSearchResults(more, false);
}

function renderSearchResults(events, replace) {
    const container = document.getElementById('searchResults');

    if (replace) {
        if (!events.length) {
            container.innerHTML = '<div class="pl-empty">Ничего не найдено</div>';
            return;
        }
        container.innerHTML = '';
    }

    // Убираем старую кнопку "показать ещё"
    const oldBtn = container.querySelector('.pl-load-more-btn');
    if (oldBtn) oldBtn.remove();

    const html = events.map(e => `
        <div class="pl-search-result-card"
             style="--event-color:${e.color||e.type_color||'#E9AE67'}"
             onclick="openEventViewFromSearch(${e.id})">
            <div class="pl-search-result-info">
                <div class="pl-search-result-title">${esc(e.title)}</div>
                <div class="pl-search-result-meta">
                    ${formatDate(e.date_start)}
                    ${e.time_val ? '&nbsp;·&nbsp;' + formatTime(e.time_val) : ''}
                    ${e.type_name ? '&nbsp;·&nbsp;' + esc(e.type_name) : ''}
                </div>
            </div>
        </div>
    `).join('');

    container.insertAdjacentHTML('beforeend', html);

    // Кнопка "Показать ещё" если есть ещё результаты
    const loaded = (searchPage + 1) * SEARCH_PAGE_SIZE;
    if (searchAllResults.length > loaded) {
        const btn = document.createElement('button');
        btn.className = 'pl-load-more-btn';
        btn.textContent = `Показать ещё (${searchAllResults.length - loaded})`;
        btn.onclick = loadMoreSearchResults;
        container.appendChild(btn);
    }
}

async function openEventViewFromSearch(id) {
    // Подгружаем событие если его нет в allEvents
    let ev = allEvents.find(e => e.id === id);
    if (!ev) {
        try {
            const r = await fetch(`${API}/events?userId=${userId}`);
            const d = await r.json();
            if (d.success) ev = d.events.find(e => e.id === id);
        } catch(e) {}
    }
    if (!ev) return;
    // Устанавливаем выбранную дату
    selectedDate = new Date(ev.date_start + 'T00:00:00');
    calYear  = selectedDate.getFullYear();
    calMonth = selectedDate.getMonth();
    viewingEvent = ev;
    // Обновляем allEvents для корректного отображения
    await loadEventsForMonth(calYear, calMonth);
    showScreen('view');
    renderEventView(viewingEvent);
}

// ===== СЕГОДНЯ =====
function goToToday() {
    const now = new Date();
    selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    loadEventsForMonth(calYear, calMonth).then(() => {
        // Принудительно показываем главный экран
        document.querySelectorAll('.pl-screen').forEach(s => s.classList.remove('active','slide-out'));
        document.getElementById('screenMain').classList.add('active');
        renderCalendar();
        renderDayEvents(toDateStr(selectedDate));
        document.getElementById('dayTitle').textContent =
            selectedDate.getDate() + ' ' + MONTHS_GEN[selectedDate.getMonth()];
    });
}

// ===== TOAST =====
function toast(msg) {
    document.querySelectorAll('.pl-toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'pl-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity .3s';
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
    }, 2200);
}

// ===== СВАЙП ПО КАЛЕНДАРЮ =====
(function setupCalSwipe() {
    let startX = 0;
    const calWrap = document.querySelector('.pl-calendar-wrap');
    if (!calWrap) return;
    calWrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
    calWrap.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < 50) return;
        if (dx < 0) document.getElementById('btnNextMonth').click();
        else         document.getElementById('btnPrevMonth').click();
    }, {passive:true});
})();


// ===== ПРОГРЕСС МОДАЛ =====
function showProgressModal(title, subtitle) {
    document.getElementById('progressModal')?.remove();
    const m = document.createElement('div');
    m.id = 'progressModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);';
    m.innerHTML = `
        <div style="
            background:#1c1c22;border-radius:24px;
            padding:32px 28px;width:90%;max-width:340px;
            border:1px solid rgba(233,174,103,0.25);
            box-shadow:0 20px 60px rgba(0,0,0,0.7);
            text-align:center;
        ">
            <div id="pmIcon" style="font-size:44px;margin-bottom:16px;animation:pmSpin 1.2s linear infinite">⏳</div>
            <div id="pmTitle" style="font-size:17px;font-weight:900;color:#f0f0f0;margin-bottom:6px">${title}</div>
            <div id="pmSubtitle" style="font-size:13px;color:#888;margin-bottom:20px">${subtitle}</div>
            <div style="background:#242428;border-radius:50px;height:6px;overflow:hidden;margin-bottom:12px">
                <div id="pmBar" style="height:100%;width:0%;background:linear-gradient(90deg,#E9AE67,#c4894a);border-radius:50px;transition:width .4s ease"></div>
            </div>
            <div id="pmCount" style="font-size:12px;color:#666;font-weight:700"></div>
        </div>`;
    document.body.appendChild(m);
}

function updateProgressModal(current, total, text) {
    const pct = Math.round(current / total * 100);
    const bar = document.getElementById('pmBar');
    const cnt = document.getElementById('pmCount');
    const sub = document.getElementById('pmSubtitle');
    if (bar) bar.style.width = pct + '%';
    if (cnt) cnt.textContent = current + ' из ' + total;
    if (sub && text) sub.textContent = text;
}

function finishProgressModal(icon, title, subtitle) {
    const ico  = document.getElementById('pmIcon');
    const ttl  = document.getElementById('pmTitle');
    const sub  = document.getElementById('pmSubtitle');
    const bar  = document.getElementById('pmBar');
    const cnt  = document.getElementById('pmCount');
    if (ico) { ico.style.animation='none'; ico.textContent=icon; }
    if (ttl) ttl.textContent = title;
    if (sub) sub.textContent = subtitle;
    if (bar) bar.style.width = '100%';
    if (cnt) cnt.textContent = '';
    setTimeout(() => document.getElementById('progressModal')?.remove(), 1800);
}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded', init);

// CSS для оверлея добавляется динамически
(function(){
    const s = document.createElement('style');
    s.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
})();

(function(){
    if (document.getElementById('pmStyle')) return;
    const s = document.createElement('style');
    s.id = 'pmStyle';
    s.textContent = '@keyframes pmSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
})();
