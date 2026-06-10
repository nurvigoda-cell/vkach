// blocks.js v5.0 — расширенная система блоков

document.addEventListener('DOMContentLoaded', async function() {

    const currentUserId = localStorage.getItem('currentUserId');
    let userBlocks    = [];
    let catalogBlocks = [];
    let categories    = [];

    // Состояние фильтров
    let activeCatId   = null; // null = "Все"
    let gallerySearch = '';
    let mySearch      = '';
    let myActiveCatId = null;
    let searchTimer   = null;

    // ===== НАВИГАЦИЯ =====
    document.getElementById('navProfileBottom')?.addEventListener('click', () =>
        window.location.href = currentUserId ? '/user/' + currentUserId : '/login.html'
    );
    document.getElementById('navMessagesBottom')?.addEventListener('click', () => {
        if (typeof openMessagesModal === 'function') openMessagesModal();
    });
    document.getElementById('navProfile')?.addEventListener('click', () =>
        window.location.href = currentUserId ? '/user/' + currentUserId : '/login.html'
    );

    // ===== ТАБЫ =====
    window.switchTab = function(tab) {
        ['my','gallery'].forEach(t => {
            document.getElementById('tab'+cap(t)).classList.toggle('active', t===tab);
            document.getElementById('section'+cap(t)).classList.toggle('active', t===tab);
        });
        if (tab === 'gallery' && !catalogBlocks.length) loadGallery();
    };

    function cap(s){ return s[0].toUpperCase()+s.slice(1); }

    // ===== МОИ БЛОКИ =====
    async function loadMyBlocks() {
        if (!currentUserId) { renderMyEmpty(); return; }
        try {
            const r = await fetch(`/api/user-blocks/${currentUserId}`);
            const d = await r.json();
            userBlocks = d.blocks || [];
            renderMyBlocks();
        } catch(e) { renderMyEmpty(); }
    }

    function renderMyEmpty() {
        document.getElementById('myBlocksList').innerHTML = `
            <div class="blocks-empty">
                <div class="blocks-empty-icon">🔐</div>
                <div class="blocks-empty-text">Войдите, чтобы видеть свои блоки</div>
                <a href="/login.html" class="blocks-empty-btn">Войти</a>
            </div>`;
    }

    function getMyFiltered() {
        let result = [...userBlocks];
        // Фильтр по категории
        if (myActiveCatId) {
            const catBlockIds = catalogBlocks
                .filter(b => b.category_id === myActiveCatId)
                .map(b => b.block_id);
            result = result.filter(b => catBlockIds.includes(b.block_id));
        }
        // Поиск
        if (mySearch) {
            const q = mySearch.toLowerCase();
            result = result.filter(b =>
                (b.block_title||'').toLowerCase().includes(q) ||
                (b.block_description||'').toLowerCase().includes(q)
            );
        }
        return result;
    }

    function renderMyBlocks() {
        const list = document.getElementById('myBlocksList');
        document.querySelectorAll('.block-dropdown').forEach(d => d.remove());

        if (!userBlocks.length) {
            list.innerHTML = `
                <div class="blocks-empty">
                    <div class="blocks-empty-icon">📦</div>
                    <div class="blocks-empty-text">Нет установленных блоков</div>
                    <div class="blocks-empty-sub">Зайдите в галерею и установите нужные</div>
                    <button class="blocks-empty-btn" onclick="switchTab('gallery')">Открыть галерею</button>
                </div>`;
            return;
        }

        // Поиск и категории теперь статичны в HTML — только синхронизируем значение
        const searchInput = document.getElementById('mySearchInput');
        if (searchInput) searchInput.value = mySearch;
        const clearBtn = document.getElementById('mySearchClearBtn');
        if (clearBtn) clearBtn.style.display = mySearch ? '' : 'none';

        const filtered = getMyFiltered();
        const favorites = filtered.filter(b => b.is_favorite);
        const rest      = filtered.filter(b => !b.is_favorite);

        let blocksHtml = '';

        if (favorites.length) {
            blocksHtml += `<div class="my-blocks-group-label">⭐ Закреплённые</div>
                <div class="my-blocks-group">` +
                favorites.map(b => myCard(b)).join('') +
                `</div>`;
        }

        if (rest.length) {
            blocksHtml += `
                ${favorites.length ? '<div class="my-blocks-group-label">Все блоки</div>' : ''}
                <div class="my-blocks-group">` +
                rest.map(b => myCard(b)).join('') +
                `</div>`;
        }

        if (!filtered.length) {
            blocksHtml = `<div class="blocks-empty" style="padding:32px">
                <div class="blocks-empty-icon" style="font-size:36px">🔍</div>
                <div class="blocks-empty-text">Ничего не найдено</div>
            </div>`;
        }

        list.innerHTML = blocksHtml;

        // Рендерим категории
        renderMyCats();

        // Dropdown-меню
        userBlocks.forEach(b => {
            const dd = document.createElement('div');
            dd.className = 'block-dropdown';
            dd.id = 'bdd-' + b.id;
            const isHidden = b.is_visible === 0;
            const isFav    = !!b.is_favorite;
            dd.innerHTML = `
                <button class="block-dd-item" onclick="toggleFavorite(${b.id},'${b.block_id}')">
                    ${isFav ? '📌 Открепить' : '📌 Закрепить'}
                </button>
                <div class="block-dd-divider"></div>
                <button class="block-dd-item" onclick="toggleBlock(${b.id},${isHidden?1:0})">
                    ${isHidden ? '👁️ Показать' : '🙈 Скрыть'}
                </button>
                <div class="block-dd-divider"></div>
                <button class="block-dd-item danger" onclick="removeBlock(${b.id},'${esc(b.block_title)}')">
                    🗑️ Удалить
                </button>`;
            document.body.appendChild(dd);
        });
    }

    function myCard(b) {
        return `
        <div class="block-my-card${b.is_visible===0?' hidden-block':''}${b.is_favorite?' fav-block':''}"
             onclick="openBlock('${b.block_id}','${getUrl(b.block_id)}')"
             data-block-id="${b.block_id}">
            <div class="block-my-icon-wrap">${blockIcon(b.block_icon, b.block_title, 42)}</div>
            <div class="block-my-info">
                <div class="block-my-title">${esc(b.block_title)}</div>
                <div class="block-my-desc">${esc(b.block_description||'')}</div>
            </div>
            ${b.is_favorite ? '<div class="block-fav-pin">📌</div>' : ''}
            <div class="block-my-actions" onclick="event.stopPropagation()">
                <button class="block-menu-btn" onclick="openBlockMenu(event,${b.id})">⋮</button>
            </div>
        </div>`;
    }

    function renderMyCats() {
        const wrap = document.getElementById('myCatFilter');
        if (!wrap || !categories.length) return;
        const myTotal = userBlocks.length;
        const catsWithCount = categories.map(c => {
            const catBlockIds = catalogBlocks.filter(b => b.category_id === c.id).map(b => b.block_id);
            const count = userBlocks.filter(b => catBlockIds.includes(b.block_id)).length;
            return { ...c, count };
        });

        const allItems = [{ id: null, name: 'Все', count: myTotal }, ...catsWithCount];
        wrap.innerHTML = allItems.map(c => `
            <button class="cat-filter-btn${myActiveCatId===c.id?' active':''}"
                onclick="setMyCat(${c.id === null ? 'null' : c.id})">
                <span class="cat-btn-icon" style="width:22px;height:22px;overflow:hidden;display:flex;align-items:center;justify-content:center">${c.icon && c.icon.includes('<svg') ? c.icon.replace('<svg ', '<svg width="22" height="22" ') : getCatSvg(c.name)}</span>
                <span class="cat-btn-name">${esc(c.name)}</span>
                <span class="cat-btn-count">${c.count}</span>
            </button>`).join('');
    }

    window.setMyCat = function(id) {
        myActiveCatId = id === 'null' ? null : (id === null ? null : Number(id));
        renderMyBlocks();
    };

    window.onMySearchInput = function(val) {
        mySearch = val;
        const cb = document.getElementById('mySearchClearBtn'); if(cb) cb.style.display = val ? '' : 'none';
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderMyBlocks(), 200);
    };

    window.clearMySearch = function() {
        mySearch = '';
        const inp = document.getElementById('mySearchInput');
        if (inp) inp.value = '';
        const cb = document.getElementById('mySearchClearBtn');
        if (cb) cb.style.display = 'none';
        renderMyBlocks();
    };

    // ===== ИЗБРАННОЕ =====
    window.toggleFavorite = async function(id, blockId) {
        if (!currentUserId) return;
        try {
            const r = await fetch('/api/toggle-block-favorite', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ userId: currentUserId, blockId })
            });
            const d = await r.json();
            if (d.success) {
                const b = userBlocks.find(x => x.id === id);
                if (b) b.is_favorite = d.is_favorite;
                renderMyBlocks();
                toast(d.is_favorite ? '📌 Блок закреплён' : '📌 Блок откреплён');
            } else {
                toast(d.error || 'Ошибка');
            }
        } catch(e) { toast('Ошибка сети'); }
    };

    // ===== ОТКРЫТИЕ МЕНЮ =====
    window.openBlockMenu = function(e, id) {
        e.stopPropagation();
        const dd = document.getElementById('bdd-' + id);
        if (!dd) return;
        const isOpen = dd.classList.contains('open');
        document.querySelectorAll('.block-dropdown.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) {
            const btn = e.currentTarget;
            const r = btn.getBoundingClientRect();
            const left = Math.max(8, r.right - 185);
            const top  = (r.bottom + 130 > window.innerHeight) ? r.top - 134 : r.bottom + 4;
            dd.style.top  = top + 'px';
            dd.style.left = left + 'px';
            dd.classList.add('open');
        }
    };

    window.toggleBlock = async function(id, visible) {
        const b = userBlocks.find(x=>x.id===id);
        if (!b) return;
        await fetch('/api/toggle-block-visibility', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({userId:currentUserId, blockId:b.block_id, isVisible:visible})
        });
        b.is_visible = visible;
        renderMyBlocks();
    };

    window.removeBlock = async function(id, name) {
        if (!confirm(`Удалить «${name}»?`)) return;
        const b = userBlocks.find(x=>x.id===id);
        if (!b) return;
        const r = await fetch('/api/remove-user-block', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({userId:currentUserId, blockId:b.block_id})
        });
        const d = await r.json();
        if (d.success) {
            userBlocks = userBlocks.filter(x=>x.id!==id);
            renderMyBlocks();
            toast('🗑️ Блок удалён');
        } else { toast('Ошибка удаления'); }
    };

    window.openBlock = function(blockId, url) {
        fetch('/api/blocks/launch', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({blockId})}).catch(()=>{});
        window.location.href = url;
    };

    // ===== ГАЛЕРЕЯ =====
    async function loadGallery() {
        try {
            const [cr, br] = await Promise.all([
                fetch('/api/blocks/categories'),
                fetch('/api/blocks/catalog')
            ]);
            const cd = await cr.json(), bd = await br.json();
            categories    = cd.categories || [];
            catalogBlocks = bd.blocks     || [];
            renderGalleryCatFilter();
            renderGallery();
        } catch(e) {}
    }

    function isInstalled(blockId) {
        return userBlocks.some(b => b.block_id === blockId);
    }

    // SVG иконки для категорий по названию
    function getCatSvg(name) {
        const n = (name||'').toLowerCase();
        const acc = '#E9AE67';
        const w = 22;
        if (n.includes('трениров')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><path d="M6 4v16M18 4v16M3 8h3M18 8h3M3 16h3M18 16h3M6 12h12"/></svg>`;
        if (n.includes('здоров')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
        if (n.includes('питан') || n.includes('еда') || n.includes('калор') || n.includes('бжу')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
        if (n.includes('планир')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>`;
        if (n.includes('калькул') || n.includes('инструм') || n.includes('утилит')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>`;
        if (n.includes('игр')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="15" cy="12" r="1" fill="${acc}"/><circle cx="18" cy="10" r="1" fill="${acc}"/></svg>`;
        if (n.includes('популяр') || n.includes('топ')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        if (n.includes('новинк') || n.includes('новое')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
        if (n.includes('медит') || n.includes('психол') || n.includes('сон')) return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><path d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
        // дефолт
        return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="${acc}" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>`;
    }

    // Лента категорий в галерее
    function renderGalleryCatFilter() {
        const wrap = document.getElementById('galleryCatFilter');
        if (!wrap) return;
        const totalCount = catalogBlocks.length;
        const allCat = { id: null, name: 'Все', icon: '', count: totalCount };
        const catsWithCount = categories.map(c => ({
            ...c,
            count: catalogBlocks.filter(b => b.category_id === c.id).length
        }));

        const allItems = [allCat, ...catsWithCount];
        wrap.innerHTML = allItems.map(c => `
            <button class="cat-filter-btn${activeCatId===c.id?' active':''}"
                onclick="setGalleryCat(${c.id === null ? 'null' : c.id})">
                <span class="cat-btn-icon" style="width:22px;height:22px;overflow:hidden;display:flex;align-items:center;justify-content:center">${c.id ? (c.icon && c.icon.includes('<svg') ? c.icon.replace('<svg ', '<svg width="22" height="22" ') : getCatSvg(c.name)) : getCatSvg('все')}</span>
                <span class="cat-btn-name">${esc(c.name)}</span>
                <span class="cat-btn-count">${c.count}</span>
            </button>`).join('');
    }

    window.setGalleryCat = function(id) {
        activeCatId = id === 'null' ? null : (id === null ? null : Number(id));
        renderGalleryCatFilter();
        applyGalleryFilters();
    };

    // Получить блоки с учётом поиска и категории
    function getGalleryFiltered() {
        let result = [...catalogBlocks];
        if (activeCatId) result = result.filter(b => b.category_id === activeCatId);
        if (gallerySearch) {
            const q = gallerySearch.toLowerCase();
            result = result.filter(b =>
                b.name.toLowerCase().includes(q) ||
                (b.description||'').toLowerCase().includes(q) ||
                (b.category_name||'').toLowerCase().includes(q)
            );
        }
        return result;
    }

    function applyGalleryFilters() {
        const filtered = getGalleryFiltered();
        const isFiltered = activeCatId || gallerySearch;

        if (isFiltered) {
            document.getElementById('galleryCats').style.display = 'none';
            document.getElementById('searchResultsSection').style.display = '';
            const label = document.getElementById('searchResultsLabel');
            if (label) label.textContent = `Результаты: ${filtered.length}`;
            const grid = document.getElementById('searchResultsGrid');
            grid.innerHTML = filtered.length
                ? `<div class="search-results-list">${filtered.map(b=>rowCard(b)).join('')}</div>`
                : `<div class="blocks-empty" style="padding:32px">
                    <div class="blocks-empty-icon" style="font-size:36px">🔍</div>
                    <div class="blocks-empty-text">Ничего не найдено</div>
                   </div>`;
        } else {
            document.getElementById('searchResultsSection').style.display = 'none';
            document.getElementById('galleryCats').style.display = '';
        }
    }

    function renderGallery() {
        const container = document.getElementById('galleryCats');
        const popular = catalogBlocks.filter(b=>b.is_popular);
        const newest  = catalogBlocks.filter(b=>b.is_new);
        const featured = catalogBlocks.find(b=>b.is_featured) || popular[0];
        let html = '';

        // FEATURED
        if (featured) {
            const inst = isInstalled(featured.block_id);
            html += `
            <div class="gallery-featured" onclick="${inst?`openBlock('${featured.block_id}','${featured.launch_url||getUrl(featured.block_id)}')`:``}">
                <div class="gallery-featured-label">⭐ Рекомендуем</div>
                <div class="gallery-featured-body">
                    <div class="gallery-featured-icon">${blockIcon(featured.icon, featured.name, 64)}</div>
                    <div class="gallery-featured-info">
                        <div class="gallery-featured-name">${esc(featured.name)}</div>
                        <div class="gallery-featured-desc">${esc(featured.description||'')}</div>
                    </div>
                </div>
                <div class="gallery-featured-footer">
                    <div style="font-size:12px;color:var(--muted)">${esc(featured.category_name||'')}</div>
                    ${inst
                        ? `<button class="gallery-featured-btn installed" onclick="event.stopPropagation();openBlock('${featured.block_id}','${featured.launch_url||getUrl(featured.block_id)}')">Открыть</button>`
                        : `<button class="gallery-featured-btn" onclick="event.stopPropagation();openBlockModal('${featured.block_id}')">+ Установить</button>`
                    }
                </div>
            </div>`;
        }

        // ПОПУЛЯРНОЕ
        if (popular.length > 0) {
            html += `<div class="gallery-cat-section">
                <div class="gallery-cat-header">
                    <div class="gallery-cat-title">⭐ Популярное</div>
                </div>
                <div class="gallery-scroll-row">
                    ${popular.map(b => cardV(b)).join('')}
                </div>
            </div>`;
        }

        // КАТЕГОРИИ
        categories
            .filter(c => c.name !== 'Популярное' && c.name !== 'Новинки')
            .forEach(cat => {
                const catBlocks = catalogBlocks.filter(b => b.category_id === cat.id);
                if (!catBlocks.length) return;
                html += `<div class="gallery-cat-section">
                    <div class="gallery-cat-header">
                        <div class="gallery-cat-title"><span class="gallery-cat-icon" style="display:inline-flex;width:22px;height:22px;flex-shrink:0;vertical-align:middle">${cat.icon}</span> ${esc(cat.name)}</div>
                    </div>
                    <div class="gallery-list-col">
                        ${catBlocks.map(b => rowCard(b)).join('')}
                    </div>
                </div>`;
            });

        // НОВИНКИ
        if (newest.length > 0) {
            html += `<div class="gallery-cat-section">
                <div class="gallery-cat-header">
                    <div class="gallery-cat-title">🆕 Новинки</div>
                </div>
                <div class="gallery-scroll-row">
                    ${newest.map(b => cardV(b)).join('')}
                </div>
            </div>`;
        }

        container.innerHTML = html || `<div class="blocks-empty">
            <div class="blocks-empty-icon">📦</div>
            <div class="blocks-empty-text">Блоки не найдены</div>
        </div>`;
    }

    // Вертикальная карточка
    function cardV(b) {
        const inst = isInstalled(b.block_id);
        const url  = b.launch_url || getUrl(b.block_id);
        return `
        <div class="gallery-block-card-v${inst?' installed':''}" onclick="openBlockModal('${b.block_id}')">
            <div class="gallery-card-v-icon">${blockIcon(b.icon, b.name, 52)}</div>
            <div class="gallery-card-v-name">${esc(b.name)}</div>
            <div class="gallery-card-v-cat">${esc(b.category_name||'')}</div>
            <button class="gallery-card-v-btn${inst?' open':''}"
                onclick="event.stopPropagation();${inst
                    ?`openBlock('${b.block_id}','${url}')`
                    :`openBlockModal('${b.block_id}')`
                }">
                ${inst?'Открыть':'+ Установить'}
            </button>
        </div>`;
    }

    // Горизонтальная строка
    function rowCard(b) {
        const inst = isInstalled(b.block_id);
        const url  = b.launch_url || getUrl(b.block_id);
        return `
        <div class="gallery-block-row" onclick="openBlockModal('${b.block_id}')">
            <div class="gallery-row-icon">${blockIcon(b.icon, b.name, 44)}</div>
            <div class="gallery-row-info">
                <div class="gallery-row-name">${esc(b.name)}</div>
                <div class="gallery-row-desc">${esc(b.description||'')}</div>
            </div>
            <div class="gallery-row-badges">
                ${b.is_popular?'<span class="gallery-badge-pill">⭐</span>':''}
                ${b.is_new?'<span class="gallery-badge-pill new">🆕</span>':''}
            </div>
            <div class="gallery-row-action" onclick="event.stopPropagation()">
                ${inst
                    ?`<button class="gallery-row-open-btn" onclick="openBlock('${b.block_id}','${url}')">Открыть</button>`
                    :`<button class="gallery-row-install-btn" onclick="openBlockModal('${b.block_id}')">+ Установить</button>`
                }
            </div>
        </div>`;
    }

    // ===== МОДАЛЬНОЕ ОКНО БЛОКА =====
    window.openBlockModal = function(blockId) {
        const b = catalogBlocks.find(x => x.block_id === blockId);
        if (!b) return;
        const inst = isInstalled(blockId);
        const url  = b.launch_url || getUrl(blockId);

        let features = [];
        try { features = Array.isArray(b.features) ? b.features : (b.features ? JSON.parse(b.features) : []); } catch(e){}

        let screenshots = [];
        try { screenshots = Array.isArray(b.screenshots) ? b.screenshots : (b.screenshots ? JSON.parse(b.screenshots) : []); } catch(e){}

        const modal = document.getElementById('blockInfoModal');
        modal.innerHTML = `
        <div class="bim-overlay" onclick="closeBlockModal()"></div>
        <div class="bim-sheet">
            <button class="bim-close" onclick="closeBlockModal()">✕</button>

            <div class="bim-header">
                <div class="bim-icon">${blockIcon(b.icon, b.name, 80)}</div>
                <div class="bim-meta">
                    <div class="bim-name">${esc(b.name)}</div>
                    ${b.category_name ? `<div class="bim-cat"><span style="display:inline-flex;width:16px;height:16px;vertical-align:middle;margin-right:4px;flex-shrink:0">${(b.category_icon||'').replace('<svg ', '<svg width=\"16\" height=\"16\" ')}</span>${esc(b.category_name)}</div>` : ''}
                    ${b.version ? `<div class="bim-version">v${esc(b.version)}</div>` : ''}
                </div>
            </div>

            <div class="bim-action-row">
                ${inst
                    ? `<button class="bim-btn bim-btn-open" onclick="openBlock('${blockId}','${url}');closeBlockModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Открыть</button>`
                    : `<button class="bim-btn bim-btn-install" onclick="installBlock('${blockId}','${esc(b.name)}','${esc(b.icon||'📦')}','${esc(b.description||'')}');closeBlockModal()">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v13M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>
                        Установить</button>`
                }
            </div>

            ${screenshots.length ? `
            <div class="bim-screenshots">
                ${screenshots.map(s => `<img class="bim-screenshot" src="${esc(s)}" alt="скриншот" onclick="openScreenshot('${esc(s)}')">`).join('')}
            </div>` : ''}

            <div class="bim-section">
                <div class="bim-desc">${esc(b.full_description || b.description || '')}</div>
            </div>

            ${features.length ? `
            <div class="bim-section">
                <div class="bim-section-title">Возможности</div>
                <ul class="bim-features">
                    ${features.map(f => `<li>${esc(f)}</li>`).join('')}
                </ul>
            </div>` : ''}

            ${b.whats_new ? `
            <div class="bim-section">
                <div class="bim-section-title">Что нового</div>
                <div class="bim-whats-new">${esc(b.whats_new)}</div>
            </div>` : ''}

            <div class="bim-footer">
                ${b.version ? `<span>Версия: <b>${esc(b.version)}</b></span>` : ''}
                ${b.updated_at ? `<span>Обновлено: <b>${formatDate(b.updated_at)}</b></span>` : ''}
            </div>
        </div>`;
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    window.closeBlockModal = function() {
        const modal = document.getElementById('blockInfoModal');
        modal.classList.remove('open');
        document.body.style.overflow = '';
    };

    window.openScreenshot = function(src) {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out';
        ov.innerHTML = `<img src="${src}" style="max-width:92vw;max-height:90vh;border-radius:12px;object-fit:contain">`;
        ov.onclick = () => ov.remove();
        document.body.appendChild(ov);
    };

    function formatDate(dt) {
        if (!dt) return '';
        const d = new Date(dt);
        return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
    }

    // ===== УСТАНОВКА =====
    window.installBlock = async function(blockId, title, icon, desc) {
        if (!currentUserId) { window.location.href='/login.html'; return; }
        try {
            const r = await fetch('/api/add-user-block', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({userId:currentUserId, blockId, blockIcon:icon, blockTitle:title, blockDescription:desc})
            });
            const d = await r.json();
            if (d.success) {
                toast(`✅ «${title}» установлен!`);
                await loadMyBlocks();
                renderGallery();
                applyGalleryFilters();
            }
        } catch(e) { toast('Ошибка установки'); }
    };

    // ===== ПОИСК ГАЛЕРЕИ =====
    const searchInput = document.getElementById('gallerySearch');
    searchInput?.addEventListener('input', function() {
        gallerySearch = this.value.trim();
        document.getElementById('searchClearBtn').style.display = gallerySearch?'':'none';
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => applyGalleryFilters(), 200);
    });

    window.clearSearch = function() {
        gallerySearch = '';
        searchInput.value = '';
        document.getElementById('searchClearBtn').style.display = 'none';
        applyGalleryFilters();
    };

    // ===== УТИЛИТЫ =====
    function getUrl(blockId) {
        const b = catalogBlocks.find(x=>x.block_id===blockId);
        if (b?.launch_url) return b.launch_url;
        const map = {
            'workout-protocols':'/protocols.html','supertimer':'/timer.html',
            'funtikg':'/blocks/funtikg/index.html','bzhu':'/blocks/bzhu/index.html',
            'injection-tracker':'/blocks/injection-tracker/index.html',
            'injection-tracker-2':'/blocks/injection-tracker-2/index.html',
            'planner':'/blocks/planner/index.html',
        };
        return map[blockId]||'#';
    }

    function esc(s) {
        const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML;
    }

    // Универсальный рендер иконки блока
    function blockIcon(icon, name, size) {
        size = size || 48;
        const r = size <= 32 ? 8 : 14;
        if (icon && (icon.startsWith('/img/') || icon.startsWith('http'))) {
            return `<img src="${icon}" style="width:${size}px;height:${size}px;border-radius:${r}px;object-fit:cover;display:block;">`;
        }
        if (icon && icon !== '📦' && icon.length <= 4) {
            return `<span style="font-size:${Math.round(size*0.6)}px;line-height:1">${icon}</span>`;
        }
        const colors = ['#c0392b','#2c3e7a','#d97706','#0d7a6e','#7c3aed','#e05555','#2980b9','#16a085'];
        const letter = (name||'?')[0].toUpperCase();
        const color = colors[(name||'A').charCodeAt(0) % colors.length];
        return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;background:${color};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.42)}px;font-weight:900;color:#fff;font-family:Nunito,sans-serif">${letter}</div>`;
    }

    let toastEl, toastTimer;
    function toast(msg) {
        if (!toastEl) { toastEl=document.createElement('div'); toastEl.className='blocks-toast'; document.body.appendChild(toastEl); }
        toastEl.textContent=msg; toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer=setTimeout(()=>toastEl.classList.remove('show'),2400);
    }

    // Закрытие dropdown
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.block-dropdown') && !e.target.closest('.block-menu-btn')) {
            document.querySelectorAll('.block-dropdown.open').forEach(d => d.classList.remove('open'));
        }
    });

    // ===== DRAG SCROLL для лент категорий =====
    function enableDragScroll(selector) {
        document.addEventListener('mousedown', function(e) {
            const el = e.target.closest(selector);
            if (!el) return;
            let startX = e.pageX - el.offsetLeft;
            let scrollLeft = el.scrollLeft;
            let isDragging = false;

            function onMove(e) {
                isDragging = true;
                const x = e.pageX - el.offsetLeft;
                el.scrollLeft = scrollLeft - (x - startX);
            }
            function onUp() {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            }
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }
    enableDragScroll('.cat-filter-row');

    // ===== СТАРТ =====
    await loadMyBlocks();
    await loadGallery();
    // Обновляем категории в "Мои блоки" после загрузки каталога
    renderMyCats();
});
