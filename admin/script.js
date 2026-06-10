// admin/script.js v2.0 — расширенная версия

const ADMIN_USER_ID = localStorage.getItem('currentUserId');
const API = '/api/admin';

let allBlocks = [];
let allCategories = [];
let currentBlockScreenshots = []; // скриншоты текущего редактируемого блока

// ===== ДОСТУП =====
async function checkAccess() {
    if (!ADMIN_USER_ID || (String(ADMIN_USER_ID) !== '1' && String(ADMIN_USER_ID) !== '5')) {
        document.body.innerHTML = `
            <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;background:#0e0e12;color:#888;font-family:Nunito,sans-serif">
                <div style="font-size:64px">🔒</div>
                <div style="font-size:20px;font-weight:900;color:#E9AE67">Доступ запрещён</div>
                <div style="font-size:14px">Этот раздел доступен только администратору</div>
                <a href="/" style="color:#E9AE67;font-weight:800;text-decoration:none;margin-top:8px">← На главную</a>
            </div>`;
        return false;
    }
    document.getElementById('adminUserBadge').textContent = `ID: ${ADMIN_USER_ID}`;
    return true;
}

// ===== НАВИГАЦИЯ =====
function showScreen(name) {
    document.querySelectorAll('.adm-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('active');
    if (name === 'blocks')     loadBlocks();
    if (name === 'categories') loadCategories();
    if (name === 'stats')      loadStats();
    if (name === 'frames')     loadFrames();
    if (name === 'userstats')  loadUserStats();
}

// ===== БЛОКИ =====
async function loadBlocks() {
    try {
        const r = await fetch(`${API}/blocks?userId=${ADMIN_USER_ID}`);
        const d = await r.json();
        if (d.success) { allBlocks = d.blocks; renderBlocksTable(allBlocks); }
    } catch(e) { toast('Ошибка загрузки блоков'); }
}

function formatDate(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' });
}

function renderBlocksTable(blocks) {
    const tbody = document.getElementById('blocksTableBody');
    if (!blocks.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#555;padding:32px">Нет блоков</td></tr>';
        return;
    }
    tbody.innerHTML = blocks.map(b => `
        <tr style="${b.is_hidden ? 'opacity:0.4' : ''}">
            <td><span class="adm-block-icon">${renderBlockIconAdmin(b.icon, b.name)}</span></td>
            <td>
                <div class="adm-block-name">${esc(b.name)}</div>
                <div class="adm-block-id">${esc(b.block_id)}</div>
            </td>
            <td>${b.category_name ? `<span class="adm-cat-badge"><span style="display:inline-flex;vertical-align:middle;margin-right:4px">${getCatSvgAdmin(b.category_name)}</span>${esc(b.category_name)}</span>` : '<span style="color:#555">—</span>'}</td>
            <td>
                <div class="adm-flags">
                    <span class="adm-flag${b.is_popular?' on':''}" title="Популярный">⭐</span>
                    <span class="adm-flag${b.is_new?' on':''}" title="Новинка">🆕</span>
                    <span class="adm-flag${b.is_featured?' on':''}" title="Рекомендуемый">🔝</span>
                    <span class="adm-flag${b.is_hidden?' on':''}" title="Скрытый">🙈</span>
                </div>
            </td>
            <td><span class="adm-version">${b.version ? esc(b.version) : '<span style="color:#333">—</span>'}</span></td>
            <td><span class="adm-date">${formatDate(b.updated_at)}</span></td>
            <td><span class="adm-count">${b.install_count||0}</span></td>
            <td><span class="adm-count">${b.launch_count||0}</span></td>
            <td>
                <div class="adm-actions">
                    <button class="adm-btn-edit" onclick="openBlockModal(${b.id})">✏️</button>
                    <button class="${b.is_hidden ? 'adm-btn-show' : 'adm-btn-hide'}"
                        onclick="toggleBlockVisibility(${b.id}, ${b.is_hidden ? 0 : 1})"
                        title="${b.is_hidden ? 'Показать в галерее' : 'Скрыть из галереи'}">
                        ${b.is_hidden ? '👁️' : '🙈'}
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterBlocks() {
    const q = document.getElementById('blocksSearch').value.toLowerCase();
    if (!q) { renderBlocksTable(allBlocks); return; }
    const filtered = allBlocks.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.block_id.toLowerCase().includes(q) ||
        (b.description||'').toLowerCase().includes(q) ||
        (b.category_name||'').toLowerCase().includes(q)
    );
    renderBlocksTable(filtered);
}

async function openBlockModal(id) {
    await loadCategoriesForSelect();
    currentBlockScreenshots = [];
    const modal = document.getElementById('blockModal');

    if (id) {
        const b = allBlocks.find(x => x.id === id);
        if (!b) return;
        document.getElementById('blockModalTitle').textContent = 'Редактировать блок';
        document.getElementById('blockId').value = b.id;
        document.getElementById('bBlockId').value = b.block_id;
        document.getElementById('bName').value = b.name;
        document.getElementById('bDesc').value = b.description||'';
        document.getElementById('bFullDesc').value = b.full_description||'';
        document.getElementById('bIcon').value = b.icon||'';
        renderIconPreview(b.icon, b.name);
        document.getElementById('bCategory').value = b.category_id||'';
        document.getElementById('bSort').value = b.sort_order||0;
        document.getElementById('bUrl').value = b.launch_url||'';
        document.getElementById('bVersion').value = b.version||'';
        document.getElementById('bWhatsNew').value = b.whats_new||'';
        document.getElementById('bPopular').checked = !!b.is_popular;
        document.getElementById('bNew').checked = !!b.is_new;
        document.getElementById('bFeatured').checked = !!b.is_featured;
        document.getElementById('bHidden').checked = !!b.is_hidden;
        document.getElementById('bBlockId').disabled = true;

        // Возможности — из JSON массива в строки
        let features = [];
        try { features = Array.isArray(b.features) ? b.features : (b.features ? JSON.parse(b.features) : []); } catch(e){}
        document.getElementById('bFeatures').value = features.join('\n');

        // Скриншоты
        try { currentBlockScreenshots = Array.isArray(b.screenshots) ? b.screenshots : (b.screenshots ? JSON.parse(b.screenshots) : []); } catch(e){}
        renderScreenshotPreviews();

        // Секция скриншотов показывается только при редактировании существующего блока
        document.getElementById('screenshotsSection').style.display = '';
    } else {
        document.getElementById('blockModalTitle').textContent = 'Новый блок';
        document.getElementById('blockId').value = '';
        document.getElementById('bBlockId').value = '';
        document.getElementById('bBlockId').disabled = false;
        document.getElementById('bName').value = '';
        document.getElementById('bDesc').value = '';
        document.getElementById('bFullDesc').value = '';
        document.getElementById('bIcon').value = '📦';
        renderIconPreview('📦', '');
        document.getElementById('bCategory').value = '';
        document.getElementById('bSort').value = '0';
        document.getElementById('bUrl').value = '';
        document.getElementById('bVersion').value = '';
        document.getElementById('bWhatsNew').value = '';
        document.getElementById('bFeatures').value = '';
        document.getElementById('bPopular').checked = false;
        document.getElementById('bNew').checked = false;
        document.getElementById('bFeatured').checked = false;
        document.getElementById('bHidden').checked = false;
        // При создании скриншоты недоступны (нет ID блока)
        document.getElementById('screenshotsSection').style.display = 'none';
    }
    modal.classList.add('open');
}

function closeBlockModal() {
    document.getElementById('blockModal').classList.remove('open');
    currentBlockScreenshots = [];
}

function renderIconPreview(icon, name) {
    const wrap = document.getElementById('bIconPreview');
    if (!wrap) return;
    wrap.innerHTML = renderBlockIconAdmin(icon, name);
}

function onIconFile(input) {
    const file = input.files[0];
    if (!file) return;
    const blockId = document.getElementById('blockId').value;

    // SVG — читаем как текст и сохраняем как data URI
    // Все форматы читаем через readAsDataURL — браузер сам делает корректный base64
    {
        // PNG/WebP/JPG — сжимаем через Canvas
        compressImage(file, 512, 512, 0.9).then(compressed => {
            if (blockId) {
                uploadIcon(blockId, compressed);
            } else {
                document.getElementById('bIcon').value = compressed;
                renderIconPreview(compressed, document.getElementById('bName').value);
            }
        });
    }
    input.value = '';
}

async function uploadIcon(blockId, iconData) {
    try {
        const r = await fetch(`${API}/blocks/${blockId}/icon`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ userId: ADMIN_USER_ID, iconData })
        });
        const d = await r.json();
        if (d.success) {
            document.getElementById('bIcon').value = d.icon;
            renderIconPreview(d.icon, document.getElementById('bName').value);
            // Обновляем в таблице
            const b = allBlocks.find(x => String(x.id) === String(blockId));
            if (b) { b.icon = d.icon; renderBlocksTable(allBlocks); }
            toast('✅ Иконка загружена');
        } else { toast(d.error || 'Ошибка загрузки'); }
    } catch(e) { toast('Ошибка сети'); }
}

function clearIcon() {
    document.getElementById('bIcon').value = '';
    renderIconPreview('', document.getElementById('bName').value);
    // Если блок уже сохранён — сразу обновляем в БД
    const blockId = document.getElementById('blockId').value;
    if (blockId) {
        fetch(`${API}/blocks/${blockId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: ADMIN_USER_ID, icon: '' })
        }).then(r => r.json()).then(d => {
            if (d.success) {
                const b = allBlocks.find(x => String(x.id) === String(blockId));
                if (b) { b.icon = ''; renderBlocksTable(allBlocks); }
                toast('✅ Иконка очищена');
            }
        }).catch(() => {});
    }
}

async function saveBlock() {
    const id = document.getElementById('blockId').value;

    // Возможности — из текста в массив
    const featuresText = document.getElementById('bFeatures').value.trim();
    const features = featuresText ? featuresText.split('\n').map(s=>s.trim()).filter(Boolean) : [];

    const body = {
        userId:           ADMIN_USER_ID,
        block_id:         document.getElementById('bBlockId').value.trim(),
        name:             document.getElementById('bName').value.trim(),
        description:      document.getElementById('bDesc').value.trim(),
        full_description: document.getElementById('bFullDesc').value.trim(),
        features:         features.length ? features : null,
        version:          document.getElementById('bVersion').value.trim(),
        whats_new:        document.getElementById('bWhatsNew').value.trim(),
        icon:             document.getElementById('bIcon').value.trim() || null,
        category_id:      document.getElementById('bCategory').value || null,
        launch_url:       document.getElementById('bUrl').value.trim(),
        sort_order:       parseInt(document.getElementById('bSort').value)||0,
        is_popular:       document.getElementById('bPopular').checked ? 1 : 0,
        is_new:           document.getElementById('bNew').checked ? 1 : 0,
        is_featured:      document.getElementById('bFeatured').checked ? 1 : 0,
        is_hidden:        document.getElementById('bHidden').checked ? 1 : 0,
        screenshots:      currentBlockScreenshots.length ? currentBlockScreenshots : null,
    };

    if (!body.name) { toast('Введите название'); return; }
    if (!body.launch_url) { toast('Введите URL запуска'); return; }

    try {
        const url = id ? `${API}/blocks/${id}` : `${API}/blocks`;
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
        const d = await r.json();
        if (d.success) {
            toast(id ? '✅ Блок обновлён' : '✅ Блок создан');
            closeBlockModal();
            loadBlocks();
        } else { toast('Ошибка: ' + (d.error || d.message || JSON.stringify(d))); }
    } catch(e) { toast('Ошибка сети: ' + e.message); }
}

async function toggleBlockVisibility(id, isHidden) {
    try {
        const r = await fetch(`${API}/blocks/${id}`, {
            method:'PUT', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ userId: ADMIN_USER_ID, is_hidden: isHidden })
        });
        const d = await r.json();
        if (d.success) {
            toast(isHidden ? '🙈 Скрыт' : '👁️ Показан');
            loadBlocks();
        } else { toast('Ошибка'); }
    } catch(e) { toast('Ошибка сети'); }
}

// ===== СКРИНШОТЫ =====
function renderScreenshotPreviews() {
    const wrap = document.getElementById('screenshotsPreviews');
    if (!currentBlockScreenshots.length) {
        wrap.innerHTML = '<div style="color:#444;font-size:12px;padding:8px 0">Нет скриншотов</div>';
        return;
    }
    wrap.innerHTML = currentBlockScreenshots.map((src, i) => `
        <div class="adm-screenshot-thumb">
            <img src="${esc(src)}" alt="скриншот ${i+1}">
            <button class="adm-screenshot-del" onclick="removeScreenshot(${i})" title="Удалить">✕</button>
        </div>
    `).join('');
}

function removeScreenshot(index) {
    const id = document.getElementById('blockId').value;
    if (id) {
        // Для существующего блока — удаляем через API
        fetch(`${API}/blocks/${id}/screenshot`, {
            method: 'DELETE',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ userId: ADMIN_USER_ID, index })
        }).then(r => r.json()).then(d => {
            if (d.success) { currentBlockScreenshots = d.screenshots; renderScreenshotPreviews(); }
            else toast('Ошибка удаления');
        }).catch(() => toast('Ошибка сети'));
    } else {
        currentBlockScreenshots.splice(index, 1);
        renderScreenshotPreviews();
    }
}

function addScreenshotByUrl() {
    const input = document.getElementById('screenshotUrl');
    const url = input.value.trim();
    if (!url) return;
    if (currentBlockScreenshots.length >= 5) { toast('Максимум 5 скриншотов'); return; }
    const id = document.getElementById('blockId').value;
    if (id) {
        fetch(`${API}/blocks/${id}/screenshot`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ userId: ADMIN_USER_ID, screenshotUrl: url })
        }).then(r => r.json()).then(d => {
            if (d.success) { currentBlockScreenshots = d.screenshots; renderScreenshotPreviews(); input.value = ''; }
            else toast(d.error || 'Ошибка');
        }).catch(() => toast('Ошибка сети'));
    } else {
        currentBlockScreenshots.push(url);
        renderScreenshotPreviews();
        input.value = '';
    }
}

// Сжатие изображения через Canvas (макс. 800px, качество 0.75)
function compressImage(file, maxW, maxH, quality) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxW || h > maxH) {
                    const ratio = Math.min(maxW / w, maxH / h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function onScreenshotFiles(input) {
    const files = Array.from(input.files);
    files.forEach(async file => {
        if (currentBlockScreenshots.length >= 5) { toast('Максимум 5 скриншотов'); return; }
        try {
            // Сжимаем до 800x600, качество 75%
            const compressed = await compressImage(file, 800, 600, 0.75);
            const blockId = document.getElementById('blockId').value;
            if (blockId) {
                const r = await fetch(`${API}/blocks/${blockId}/screenshot`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ userId: ADMIN_USER_ID, screenshotUrl: compressed })
                });
                const d = await r.json();
                if (d.success) { currentBlockScreenshots = d.screenshots; renderScreenshotPreviews(); }
                else toast(d.error || 'Ошибка загрузки');
            } else {
                currentBlockScreenshots.push(compressed);
                renderScreenshotPreviews();
            }
        } catch(e) { toast('Ошибка обработки изображения'); }
    });
    input.value = '';
}

// ===== КАТЕГОРИИ =====
async function loadCategories() {
    try {
        const r = await fetch(`${API}/categories?userId=${ADMIN_USER_ID}`);
        const d = await r.json();
        if (d.success) { allCategories = d.categories; renderCatsList(); }
    } catch(e) { toast('Ошибка загрузки категорий'); }
}

async function loadCategoriesForSelect() {
    if (!allCategories.length) {
        const r = await fetch(`${API}/categories?userId=${ADMIN_USER_ID}`);
        const d = await r.json();
        if (d.success) allCategories = d.categories;
    }
    // Скрытый select для совместимости (хранит значение)
    const sel = document.getElementById('bCategory');
    sel.innerHTML = '<option value="">— Без категории —</option>' +
        allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    // Рендерим кастомный дропдаун
    renderCategoryDropdown();
}

// Универсальный рендер иконки блока
function renderBlockIconAdmin(icon, name) {
    if (icon && (icon.startsWith('/img/') || icon.startsWith('http'))) {
        return `<img src="${icon}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;display:block;">`;
    }
    if (icon && icon.length <= 4 && /\p{Emoji}/u.test(icon)) {
        return `<span style="font-size:28px;line-height:1">${icon}</span>`;
    }
    // Fallback — первая буква на цветном фоне
    const colors = ['#c0392b','#2c3e7a','#d97706','#0d7a6e','#7c3aed','#e05555','#2980b9','#16a085'];
    const letter = (name||'?')[0].toUpperCase();
    const color = colors[(name||'').charCodeAt(0) % colors.length];
    return `<div style="width:36px;height:36px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff;font-family:Nunito,sans-serif">${letter}</div>`;
}

function getCatSvgAdmin(name) {
    const n = (name||'').toLowerCase();
    const acc = '#E9AE67';
    if (n.includes('трениров')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/></svg>`;
    if (n.includes('здоров')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    if (n.includes('питан') || n.includes('калор') || n.includes('бжу')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    if (n.includes('планир')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
    if (n.includes('калькул') || n.includes('инструм')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/></svg>`;
    if (n.includes('популяр') || n.includes('топ')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    if (n.includes('новинк')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    if (n.includes('игр')) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="15" cy="12" r="1" fill="${acc}"/><circle cx="18" cy="10" r="1" fill="${acc}"/></svg>`;
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`;
}

function renderCategoryDropdown() {
    const wrap = document.getElementById('bCategoryDropdown');
    if (!wrap) return;
    const sel = document.getElementById('bCategory');
    const currentVal = sel.value;

    const items = [{ id: '', name: '— Без категории —', noIcon: true }, ...allCategories];
    const currentCat = allCategories.find(c => String(c.id) === String(currentVal));
    const displayName = currentCat ? currentCat.name : '— Без категории —';
    const displayIcon = currentCat ? getCatSvgAdmin(currentCat.name) : '';

    wrap.innerHTML = `
        <div class="adm-custom-select" id="bCategorySelect">
            <div class="adm-select-trigger" onclick="toggleCatDropdown()">
                <span class="adm-select-icon">${displayIcon}</span>
                <span class="adm-select-text">${esc(displayName)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <div class="adm-select-dropdown" id="bCategoryMenu" style="display:none">
                ${items.map(c => `
                    <div class="adm-select-option${String(c.id) === String(currentVal) ? ' selected' : ''}"
                        onclick="selectCategory('${c.id}','${esc(c.name)}')">
                        <span class="adm-select-opt-icon">${c.noIcon ? '' : (c.icon && c.icon.includes('<svg') ? c.icon : getCatSvgAdmin(c.name))}</span>
                        <span>${esc(c.name)}</span>
                    </div>`).join('')}
            </div>
        </div>`;
}

function toggleCatDropdown() {
    const menu = document.getElementById('bCategoryMenu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : 'block';
}

function selectCategory(id, name) {
    const sel = document.getElementById('bCategory');
    // Убеждаемся что option с нужным value существует
    if (id && !sel.querySelector(`option[value="${id}"]`)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        sel.appendChild(opt);
    }
    sel.value = id || '';
    document.getElementById('bCategoryMenu').style.display = 'none';
    renderCategoryDropdown();
}

// Закрытие при клике вне
document.addEventListener('click', function(e) {
    if (!e.target.closest('#bCategoryDropdown')) {
        const menu = document.getElementById('bCategoryMenu');
        if (menu) menu.style.display = 'none';
    }
});

function renderCatsList() {
    const list = document.getElementById('catsList');
    if (!allCategories.length) {
        list.innerHTML = '<div style="text-align:center;color:#555;padding:32px">Нет категорий</div>';
        return;
    }
    const blockCounts = {};
    allBlocks.forEach(b => { if (b.category_id) blockCounts[b.category_id] = (blockCounts[b.category_id]||0)+1; });
    list.innerHTML = allCategories.map(c => `
        <div class="adm-cat-item">
            <div class="adm-cat-icon">${c.icon && c.icon.includes('<svg') ? c.icon : (c.icon||'📂')}</div>
            <div class="adm-cat-info">
                <div class="adm-cat-name">${esc(c.name)}</div>
                <div class="adm-cat-meta">Порядок: ${c.sort_order} · Блоков: ${blockCounts[c.id]||0}</div>
            </div>
            <span class="adm-cat-status ${c.active?'active':'inactive'}">${c.active?'Активна':'Неактивна'}</span>
            <div class="adm-actions" style="margin-left:8px">
                <button class="adm-btn-edit" onclick="openCatModal(${c.id})">✏️</button>
                <button class="adm-btn-danger" onclick="deleteCat(${c.id},'${esc(c.name)}')">🗑️</button>
            </div>
        </div>
    `).join('');
}


const CAT_PRESETS = [
    { name: 'Тренировки', sort_order: 1, svg: '<path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>' },
    { name: 'Здоровье', sort_order: 2, svg: '<path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
    { name: 'Планирование', sort_order: 3, svg: '<rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="1.8"/>' },
    { name: 'Питание', sort_order: 4, svg: '<path d="M18 8h1a4 4 0 010 8h-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { name: 'Калькуляторы', sort_order: 5, svg: '<rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="14" x2="10" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="14" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { name: 'Инструменты', sort_order: 6, svg: '<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
    { name: 'Трекеры', sort_order: 7, svg: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="1.8" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    { name: 'Игры', sort_order: 8, svg: '<rect x="2" y="6" width="20" height="12" rx="4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M6 12h4M8 10v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/>' },
    { name: 'Аналитика', sort_order: 9, svg: '<line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { name: 'Справочники', sort_order: 10, svg: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    { name: 'Обучение', sort_order: 11, svg: '<path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>' },
    { name: 'Финансы', sort_order: 12, svg: '<line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>' },
    { name: 'Полезное', sort_order: 13, svg: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' },
    { name: 'Развлечения', sort_order: 14, svg: '<polygon points="23 7 16 12 23 17 23 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/>' },
    { name: 'Популярное', sort_order: 15, svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' },
    { name: 'Новинки', sort_order: 16, svg: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
];

function catSvgHtml(svg, size) {
    size = size || 28;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" style="color:#E9AE67;flex-shrink:0">'+svg+'</svg>';
}

function openCatModal(id) {
    const modal = document.getElementById('catModal');
    const presetGrid = document.getElementById('catPresetGrid');
    const editForm = document.getElementById('catEditForm');

    if (id) {
        // Режим редактирования — показываем обычную форму
        const c = allCategories.find(x => x.id === id);
        if (!c) return;
        document.getElementById('catModalTitle').textContent = 'Редактировать категорию';
        document.getElementById('catId').value = c.id;
        document.getElementById('cName').value = c.name;
        document.getElementById('cIcon').value = c.icon||'';
        document.getElementById('cSort').value = c.sort_order||0;
        document.getElementById('cActive').checked = !!c.active;
        if (presetGrid) presetGrid.style.display = 'none';
        if (editForm) editForm.style.display = '';
    } else {
        // Режим создания — показываем сетку предустановленных категорий
        document.getElementById('catModalTitle').textContent = 'Добавить категорию';
        document.getElementById('catId').value = '';
        if (editForm) editForm.style.display = 'none';
        if (presetGrid) {
            // Фильтруем уже добавленные
            const existingNames = allCategories.map(c => c.name.toLowerCase());
            const available = CAT_PRESETS.filter(p => !existingNames.includes(p.name.toLowerCase()));
            if (!available.length) {
                presetGrid.innerHTML = '<div style="color:#555;text-align:center;padding:24px">Все категории уже добавлены</div>';
            } else {
                // Сохраняем доступные пресеты глобально для onclick
                window._availablePresets = available;
                presetGrid.innerHTML = available.map((p, i) => `
                    <div class="cat-preset-item" onclick="addPresetCategory(${i})">
                        <div class="cat-preset-icon">${catSvgHtml(p.svg, 26)}</div>
                        <div class="cat-preset-name">${esc(p.name)}</div>
                    </div>`).join('');
            }
            presetGrid.style.display = 'grid';
        }
    }
    modal.classList.add('open');
}

async function addPresetCategory(index) {
    const p = window._availablePresets && window._availablePresets[index];
    if (!p) return;
    const iconSvg = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+p.svg+'</svg>';
    const body = {
        userId: ADMIN_USER_ID,
        name: p.name,
        icon: iconSvg,
        sort_order: p.sort_order,
        active: 1,
    };
    try {
        const r = await fetch(`${API}/categories`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
        const d = await r.json();
        if (d.success) {
            toast('✅ Категория «'+p.name+'» добавлена');
            closeCatModal();
            loadCategories();
        } else { toast('Ошибка: '+(d.error||'')); }
    } catch(e) { toast('Ошибка сети'); }
}
function closeCatModal() { document.getElementById('catModal').classList.remove('open'); }

async function saveCat() {
    const id = document.getElementById('catId').value;
    const body = {
        userId:     ADMIN_USER_ID,
        name:       document.getElementById('cName').value.trim(),
        icon:       document.getElementById('cIcon').value.trim()||'📂',
        sort_order: parseInt(document.getElementById('cSort').value)||0,
        active:     document.getElementById('cActive').checked ? 1 : 0,
    };
    if (!body.name) { toast('Введите название'); return; }
    try {
        const url = id ? `${API}/categories/${id}` : `${API}/categories`;
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
        const d = await r.json();
        if (d.success) { toast(id ? '✅ Категория обновлена' : '✅ Категория создана'); closeCatModal(); loadCategories(); }
    } catch(e) { toast('Ошибка'); }
}

async function deleteCat(id, name) {
    if (!confirm(`Удалить категорию «${name}»?`)) return;
    try {
        const r = await fetch(`${API}/categories/${id}`, {
            method:'DELETE', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ userId: ADMIN_USER_ID })
        });
        const d = await r.json();
        if (d.success) { toast('🗑️ Категория удалена'); loadCategories(); }
    } catch(e) { toast('Ошибка'); }
}

// ===== СТАТИСТИКА =====
async function loadStats() {
    try {
        const r = await fetch(`${API}/stats?userId=${ADMIN_USER_ID}`);
        const d = await r.json();
        if (d.success) renderStats(d.stats);
    } catch(e) { toast('Ошибка загрузки статистики'); }
}

function renderStats(stats) {
    const grid = document.getElementById('statsGrid');
    if (!stats.length) {
        grid.innerHTML = '<div style="color:#555;padding:32px;text-align:center">Нет данных</div>';
        return;
    }
    grid.innerHTML = stats.map(s => `
        <div class="adm-stat-card">
            <div class="adm-stat-header">
                <div class="adm-stat-icon">${renderBlockIconAdmin(s.icon, s.name)}</div>
                <div class="adm-stat-name">${esc(s.name)}</div>
            </div>
            <div class="adm-stat-row">
                <span class="adm-stat-label">Установок</span>
                <span class="adm-stat-val">${s.real_installs||0}</span>
            </div>
            <div class="adm-stat-row">
                <span class="adm-stat-label">Запусков</span>
                <span class="adm-stat-val">${s.launch_count||0}</span>
            </div>
            ${s.version ? `<div class="adm-stat-row">
                <span class="adm-stat-label">Версия</span>
                <span class="adm-stat-val">${esc(s.version)}</span>
            </div>` : ''}
            <div class="adm-stat-row">
                <span class="adm-stat-label">Флаги</span>
                <span>
                    ${s.is_popular?'⭐':''}${s.is_new?'🆕':''}${s.is_featured?'🔝':''}${s.is_hidden?'🙈':''}
                    ${!s.is_popular&&!s.is_new&&!s.is_featured&&!s.is_hidden?'<span style="color:#555">—</span>':''}
                </span>
            </div>
        </div>
    `).join('');
}

// ===== УТИЛИТЫ =====
function esc(s) {
    const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML;
}

let toastTimer;
function toast(msg) {
    const el = document.getElementById('admToast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

document.getElementById('blockModal').addEventListener('click', e => {
    if (e.target === document.getElementById('blockModal')) closeBlockModal();
});
document.getElementById('catModal').addEventListener('click', e => {
    if (e.target === document.getElementById('catModal')) closeCatModal();
});

// ===== СТАРТ =====
(async () => {
    const ok = await checkAccess();
    if (!ok) return;
    try {
        const r = await fetch(`${API}/blocks?userId=${ADMIN_USER_ID}`);
        const d = await r.json();
        if (d.success) allBlocks = d.blocks;
    } catch(e) {}
})();

// ========== ОБВОДКИ АВАТАРА ==========

let adminFramesCat = 'all';

// Инициализация фильтра
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.adm-filter-btn');
        if (!btn) return;
        document.querySelectorAll('.adm-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        adminFramesCat = btn.dataset.cat;
        renderFramesList(window._framesCache || []);
    });
});

function renderFramesList(frames) {
    window._framesCache = frames;
    const list = document.getElementById('framesList');
    if (!list) return;

    // Обновляем счётчики на кнопках фильтра
    document.querySelectorAll('.adm-filter-btn').forEach(btn => {
        const cat = btn.dataset.cat;
        const count = cat === 'all' ? frames.length : frames.filter(f => f.category === cat).length;
        // Убираем старый счётчик и добавляем новый
        btn.textContent = btn.textContent.replace(/\s*\(\d+\)$/, '');
        btn.textContent += ` (${count})`;
    });

    const filtered = adminFramesCat === 'all' ? frames : frames.filter(f => f.category === adminFramesCat);
    if (!filtered.length) {
        list.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">Рамок нет в этой категории</div>';
        return;
    }
    list.innerHTML = filtered.map(f => `
        <div class="adm-frame-row ${!f.is_active ? 'adm-frame-hidden' : ''}">
            <div class="adm-frame-preview">
                ${f.img ? `<img src="${f.img}?t=${Date.now()}" alt="" onerror="this.style.opacity='.15'">` : '<span style="font-size:22px;">🖼</span>'}
            </div>
            <div class="adm-frame-info">
                <div class="adm-frame-name">${f.name} ${!f.is_active ? '<span style="color:#ef5350;font-size:11px;">(скрыта)</span>' : ''}</div>
                <div class="adm-frame-meta">
                    ID: <b>${f.frame_id}</b> &nbsp;·&nbsp;
                    Цена: <b style="color:#E9AE67">${f.price.toLocaleString('ru-RU')} Качкоинов</b> &nbsp;·&nbsp;
                    Категория: <b>${f.category || '—'}</b> &nbsp;·&nbsp;
                    Куплено: <b>${f.bought_count || 0}</b>
                </div>
                <div style="font-size:11px;color:#555;margin-top:2px;">${f.img || '⚠️ PNG не задан'}</div>
            </div>
            <div class="adm-frame-actions">
                <button class="adm-btn-small ${f.is_active ? 'adm-btn-orange' : 'adm-btn-ghost'}"
                    onclick="toggleFrame(${f.id}, ${f.is_active})">
                    ${f.is_active ? '👁 Скрыть' : '👁 Показать'}
                </button>
                <button class="adm-btn-small adm-btn-primary" onclick='openFrameModal(${JSON.stringify(f)})'>✏️ Изменить</button>
                <button class="adm-btn-small adm-btn-danger" onclick="deleteFrame(${f.id}, '${f.name.replace(/'/g,"\\'")}')">🗑 Удалить</button>
            </div>
        </div>
    `).join('');
}

async function loadFrames() {
    try {
        const r = await fetch(`/api/admin/frames?userId=${ADMIN_USER_ID}`);
        const data = await r.json();
        if (!data.success) { 
            document.getElementById('framesList').innerHTML = `<div style="color:#ef5350;padding:20px;">Ошибка: ${data.error || 'нет доступа'}</div>`;
            return; 
        }
        renderFramesList(data.frames);
    } catch(e) { console.error(e); }
}

function openFrameModal(frame) {
    document.getElementById('frameModal').style.display = 'flex';
    if (frame) {
        document.getElementById('frameModalTitle').textContent = '✏️ Редактировать рамку';
        document.getElementById('frameModalId').value = frame.id;
        document.getElementById('frameModalFrameId').value = frame.frame_id;
        document.getElementById('frameModalName').value = frame.name;
        document.getElementById('frameModalPrice').value = frame.price;
        document.getElementById('frameModalSort').value = frame.sort_order;
        if (document.getElementById('frameModalCategory')) document.getElementById('frameModalCategory').value = frame.category || 'standard';
        document.getElementById('frameModalActive').value = frame.is_active;
        // Показываем текущее фото
        const preview = document.getElementById('frameModalPreview');
        if (preview) {
            preview.src = frame.img || '';
            preview.style.display = frame.img ? 'block' : 'none';
        }
        document.getElementById('frameModalCurrentImg').textContent = frame.img || 'не задан';
    } else {
        document.getElementById('frameModalTitle').textContent = '+ Новая рамка';
        document.getElementById('frameModalId').value = '';
        document.getElementById('frameModalFrameId').value = '';
        document.getElementById('frameModalName').value = '';
        document.getElementById('frameModalPrice').value = '0';
        document.getElementById('frameModalSort').value = '10';
        document.getElementById('frameModalActive').value = '1';
        const preview = document.getElementById('frameModalPreview');
        if (preview) preview.style.display = 'none';
        document.getElementById('frameModalCurrentImg').textContent = 'не задан';
    }
}

function closeFrameModal() {
    document.getElementById('frameModal').style.display = 'none';
}

async function saveFrame() {
    const id = document.getElementById('frameModalId').value;
    const fileInput = document.getElementById('frameModalFile');
    const file = fileInput?.files[0];

    // Если есть файл — сначала загружаем
    let imgPath = document.getElementById('frameModalCurrentImg').textContent;
    if (imgPath === 'не задан') imgPath = '';

    if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('userId', ADMIN_USER_ID);
        const frameId = document.getElementById('frameModalFrameId').value.trim() || 'frame_' + Date.now();
        fd.append('frameId', frameId);
        try {
            const ur = await fetch('/api/admin/frames/upload', { method: 'POST', body: fd });
            const ud = await ur.json();
            if (ud.success) imgPath = ud.path;
            else { alert('Ошибка загрузки: ' + ud.error); return; }
        } catch(e) { alert('Ошибка загрузки файла'); return; }
    }

    const body = {
        userId: ADMIN_USER_ID,
        frame_id: document.getElementById('frameModalFrameId').value.trim(),
        name:     document.getElementById('frameModalName').value.trim(),
        price:    parseInt(document.getElementById('frameModalPrice').value) || 0,
        img:      imgPath,
        category: document.getElementById('frameModalCategory')?.value || 'standard',
        sort_order: parseInt(document.getElementById('frameModalSort').value) || 1,
        is_active: parseInt(document.getElementById('frameModalActive').value),
    };
    if (!body.frame_id || !body.name) { alert('Заполни ID и название'); return; }

    const url = id ? `/api/admin/frames/${id}` : '/api/admin/frames';
    const method = id ? 'PUT' : 'POST';

    const r = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await r.json();
    if (data.success) { closeFrameModal(); loadFrames(); if (fileInput) fileInput.value = ''; }
    else alert(data.error || 'Ошибка сохранения');
}

async function toggleFrame(id, current) {
    const r = await fetch(`/api/admin/frames/${id}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId: ADMIN_USER_ID, is_active: current ? 0 : 1 })
    });
    const data = await r.json();
    if (data.success) loadFrames();
    else alert(data.error || 'Ошибка');
}

async function deleteFrame(id, name) {
    if (!confirm(`Удалить рамку "${name}"? Это не удалит её у пользователей.`)) return;
    const r = await fetch(`/api/admin/frames/${id}?userId=${ADMIN_USER_ID}`, { method: 'DELETE' });
    const data = await r.json();
    if (data.success) loadFrames();
    else alert(data.error || 'Ошибка');
}

// Превью при выборе файла
function onFrameFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById('frameModalPreview');
    if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    }
}



// ========== СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ ==========
let usersCurrentPage = 1;
let usersSearchVal = '';

async function loadUserStats(page, search) {
    page = page !== undefined ? page : usersCurrentPage;
    search = search !== undefined ? search : usersSearchVal;
    usersCurrentPage = page;
    usersSearchVal = search;

    try {
        const params = new URLSearchParams({ userId: ADMIN_USER_ID, page, search });
        const r = await fetch(`/api/admin/user-stats?${params}`);
        const data = await r.json();
        if (!data.success) { console.error('userStats:', data.error); return; }

        // Счётчик
        const cnt = document.getElementById('totalUsersCount');
        if (cnt) cnt.textContent = data.totalUsers;

        // Таблица
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        if (!data.users || !data.users.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="color:#888;padding:20px;text-align:center;">Ничего не найдено</td></tr>';
        } else {
            tbody.innerHTML = data.users.map(u => `
                <tr id="urow_${u.id}" ${u.is_blocked ? 'style="opacity:0.5;"' : ''}>
                    <td>${u.id}</td>
                    <td><b>@${u.login || '—'}</b>${u.is_blocked ? ' <span style="color:#ff6666;font-size:10px;font-weight:600;">БЛОК</span>' : ''}</td>
                    <td>${u.name || '—'}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.bio || '—'}</td>
                    <td><span style="color:#E9AE67;font-weight:800;">${(u.kachcoins||0).toLocaleString('ru-RU')}</span> <img src="/img/vkachcoin.png" style="width:16px;height:16px;object-fit:contain;vertical-align:middle;filter:drop-shadow(0 0 4px rgba(233,174,103,0.7));"></td>
                    <td style="display:flex;gap:6px;align-items:center;">
                        <button class="adm-btn-small adm-btn-primary" onclick='openEditUserModal(${JSON.stringify(u)})'>✏️ Ред.</button>
                        <button class="adm-btn-small"
                            onclick="toggleBlockUser(${u.id}, ${u.is_blocked ? 0 : 1}, '@${u.login}')"
                            style="${u.is_blocked
                                ? 'background:rgba(233,174,103,.12);color:#E9AE67;border:1px solid rgba(233,174,103,.25);display:inline-flex;align-items:center;gap:4px;'
                                : 'background:rgba(255,80,80,.12);color:#ff6666;border:1px solid rgba(255,80,80,.25);display:inline-flex;align-items:center;gap:4px;'}">
                            ${u.is_blocked
                                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Разблок.`
                                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Блок.`
                            }
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Пагинация
        const pag = document.getElementById('usersPagination');
        if (pag && data.totalPages > 1) {
            let html = '';
            if (page > 1) html += `<button class="adm-page-btn" onclick="loadUserStats(${page-1})">← Пред.</button>`;
            for (let i = Math.max(1,page-2); i <= Math.min(data.totalPages, page+2); i++) {
                html += `<button class="adm-page-btn ${i===page?'active':''}" onclick="loadUserStats(${i})">${i}</button>`;
            }
            if (page < data.totalPages) html += `<button class="adm-page-btn" onclick="loadUserStats(${page+1})">След. →</button>`;
            html += `<span class="adm-page-info">Стр. ${page} из ${data.totalPages} · ${data.filteredTotal} пользователей</span>`;
            pag.innerHTML = html;
            pag.style.display = 'flex';
        } else if (pag) {
            pag.style.display = 'none';
        }
    } catch(e) { console.error('loadUserStats error:', e); }
}

let usersSearchTimer = null;
function searchUsers(val) {
    clearTimeout(usersSearchTimer);
    usersSearchTimer = setTimeout(() => loadUserStats(1, val), 400);
}

function openEditUserModal(u) {
    document.getElementById('editUserModal').style.display = 'flex';
    document.getElementById('editUserTitle').textContent = `Редактировать: @${u.login}`;
    document.getElementById('editUserId').value = u.id;
    document.getElementById('editUserName').value = u.name || '';
    document.getElementById('editUserCoins').value = u.kachcoins || 0;
    document.getElementById('editUserBio').value = u.bio || '';
}
function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
}
async function saveUserEdit() {
    const id = document.getElementById('editUserId').value;
    const body = {
        userId: ADMIN_USER_ID,
        name:      document.getElementById('editUserName').value.trim(),
        kachcoins: parseInt(document.getElementById('editUserCoins').value) || 0,
        bio:       document.getElementById('editUserBio').value.trim(),
    };
    const r = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(body)
    });
    const data = await r.json();
    if (data.success) { closeEditUserModal(); loadUserStats(); }
    else alert(data.error || 'Ошибка');
}



async function toggleBlockUser(userId, isBlocked, login) {
    const action = isBlocked ? 'заблокировать' : 'разблокировать';
    if (!confirm(`Вы уверены что хотите ${action} пользователя ${login}?`)) return;
    try {
        const adminId = localStorage.getItem('currentUserId');
        const res = await fetch('/api/admin/block-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: adminId, targetUserId: userId, isBlocked: !!isBlocked })
        });
        const data = await res.json();
        if (data.success) {
            showToast(isBlocked ? `${login} заблокирован` : `${login} разблокирован`);
            loadUserStats();
        } else {
            alert(data.error || 'Ошибка');
        }
    } catch(e) { console.error('toggleBlockUser error:', e); loadUserStats(); }
}
