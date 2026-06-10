// ============================================================
// user-profile-blocks.js — Блочная система профиля
// Версия 1.0 — блок "Мои фото"
// Архитектура позволяет добавлять новые типы блоков без
// изменения существующего кода профиля
// ============================================================

(function() {
    'use strict';

    // ── Реестр типов блоков ──────────────────────────────────
    // Для добавления нового блока — просто добавить запись сюда
    // и реализовать renderer/editor ниже
    const BLOCK_REGISTRY = [
        {
            type: 'photo_gallery',
            title: 'Мои фото',
            description: 'Галерея ваших фотографий',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
        },
        {
            type: 'services',
            title: 'Мои услуги',
            description: 'Ваши услуги и цены',
            icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>',
        },
    ];

    // ── Состояние ────────────────────────────────────────────
    let profileUserId = null;
    let currentUserId = null;
    let isOwner = false;
    let blocks = [];
    // Лайтбокс
    let lightboxPhotos = [];
    let lightboxIndex = 0;
    let touchStartX = 0;

    // ── Инициализация ────────────────────────────────────────
    function init() {
        profileUserId = window.userId || null;
        currentUserId = window.currentUserId || localStorage.getItem('currentUserId') || null;
        isOwner = profileUserId && currentUserId && String(profileUserId) === String(currentUserId);

        injectStyles();
        injectDOM();
        bindGlobalEvents();
        loadBlocks();
    }

    // ── Стили ────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('pb-styles')) return;
        const s = document.createElement('style');
        s.id = 'pb-styles';
        s.textContent = `
        /* ── Зона блоков ── */
        #pb-zone {
            padding: 0 0 80px;
        }

        /* ── Один блок ── */
        .pb-block {
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.07);
            border-radius: 16px;
            margin: 12px 0;
            overflow: hidden;
        }

        /* ── Шапка блока ── */
        .pb-block-header {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px 10px;
        }
        .pb-block-title {
            flex: 1;
            font-size: 15px;
            font-weight: 700;
            color: #f0f0f0;
        }
        .pb-block-menu-btn {
            width: 30px; height: 30px;
            border-radius: 50%; border: none;
            background: rgba(255,255,255,.06);
            color: #888; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: .18s; flex-shrink: 0;
        }
        .pb-block-menu-btn:hover { background: rgba(233,174,103,.15); color: #E9AE67; }

        /* ── Контекстное меню блока ── */
        .pb-block-menu {
            position: absolute;
            right: 16px;
            background: #2a2a35;
            border: 1px solid rgba(233,174,103,.2);
            border-radius: 12px;
            overflow: hidden;
            z-index: 100;
            min-width: 160px;
            box-shadow: 0 8px 24px rgba(0,0,0,.4);
        }
        .pb-block-menu button {
            width: 100%; padding: 12px 16px;
            background: none; border: none;
            color: #f0f0f0; font-size: 13px;
            cursor: pointer; text-align: left;
            display: flex; align-items: center; gap: 10px;
            transition: background .15s;
        }
        .pb-block-menu button:hover { background: rgba(233,174,103,.1); }
        .pb-block-menu button.danger { color: #ff6666; }
        .pb-block-menu button.danger:hover { background: rgba(255,100,100,.1); }

        /* ── Фото-сетка ── */
        .pb-photo-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 2px;
            padding: 0 0 2px;
        }
        .pb-photo-slot {
            aspect-ratio: 1;
            position: relative;
            overflow: hidden;
            background: rgba(255,255,255,.04);
            cursor: pointer;
        }
        .pb-photo-slot img {
            width: 100%; height: 100%;
            object-fit: cover;
            display: block;
            transition: transform .3s ease;
        }
        .pb-photo-slot:hover img { transform: scale(1.04); }

        /* Пустой слот */
        .pb-photo-empty {
            width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            color: rgba(233,174,103,.35);
            transition: background .2s;
        }
        .pb-photo-empty:hover { background: rgba(233,174,103,.06); }

        /* Кнопка удалить фото */
        .pb-photo-del {
            position: absolute; top: 5px; right: 5px;
            width: 22px; height: 22px;
            background: rgba(0,0,0,.7);
            border: none; border-radius: 50%;
            color: #fff; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .18s;
            z-index: 2;
        }
        .pb-photo-slot:hover .pb-photo-del { opacity: 1; }
        @media(hover:none) { .pb-photo-del { opacity: 0.7; } }

        /* ── Кнопка Добавить блок ── */
        #pb-add-btn {
            width: 100%;
            padding: 14px;
            margin: 8px 0 0;
            background: rgba(233,174,103,.06);
            border: 1.5px dashed rgba(233,174,103,.3);
            border-radius: 14px;
            color: #E9AE67;
            font-size: 14px; font-weight: 600;
            cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: .2s;
        }
        #pb-add-btn:hover {
            background: rgba(233,174,103,.12);
            border-color: rgba(233,174,103,.6);
        }

        /* ── Оверлей (общий) ── */
        .pb-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,.85);
            backdrop-filter: blur(8px);
            z-index: 2000;
            align-items: flex-end; justify-content: center;
        }
        .pb-overlay.open { display: flex; }

        /* ── Шит (общий) ── */
        .pb-sheet {
            background: #1e1e24;
            border-radius: 24px 24px 0 0;
            border: 1px solid rgba(233,174,103,.18);
            border-bottom: none;
            width: 100%; max-width: 520px;
            max-height: 90vh;
            display: flex; flex-direction: column;
            overflow: hidden;
            animation: pb-up .25s cubic-bezier(.32,.72,0,1);
            padding-bottom: env(safe-area-inset-bottom, 70px);
            margin-bottom: 70px;
        }
        @keyframes pb-up {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: none; opacity: 1; }
        }
        .pb-drag {
            width: 40px; height: 4px;
            background: rgba(255,255,255,.12);
            border-radius: 2px;
            margin: 12px auto 0;
            flex-shrink: 0;
        }
        .pb-sheet-header {
            display: flex; align-items: center;
            padding: 14px 18px;
            border-bottom: 1px solid rgba(233,174,103,.1);
            flex-shrink: 0;
        }
        .pb-sheet-title {
            flex: 1; font-size: 16px; font-weight: 700; color: #E9AE67;
            display: flex; align-items: center; gap: 8px;
        }
        .pb-close-btn {
            width: 32px; height: 32px; border-radius: 50%; border: none;
            background: rgba(255,255,255,.06); color: #888; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: .18s;
        }
        .pb-close-btn:hover { background: rgba(233,174,103,.15); color: #E9AE67; }

        /* ── Модалка выбора блока ── */
        #pb-picker-list {
            padding: 12px 14px 24px;
            overflow-y: auto;
            display: flex; flex-direction: column; gap: 8px;
        }
        .pb-picker-item {
            display: flex; align-items: center; gap: 14px;
            padding: 14px 16px;
            background: rgba(255,255,255,.04);
            border: 1px solid rgba(255,255,255,.07);
            border-radius: 14px;
            cursor: pointer; transition: .2s;
        }
        .pb-picker-item:hover {
            background: rgba(233,174,103,.08);
            border-color: rgba(233,174,103,.25);
        }
        .pb-picker-icon {
            width: 44px; height: 44px; border-radius: 12px;
            background: rgba(233,174,103,.1);
            border: 1px solid rgba(233,174,103,.2);
            display: flex; align-items: center; justify-content: center;
            color: #E9AE67; flex-shrink: 0;
        }
        .pb-picker-info { flex: 1; }
        .pb-picker-name { font-size: 14px; font-weight: 600; color: #f0f0f0; }
        .pb-picker-desc { font-size: 12px; color: #888; margin-top: 2px; }
        .pb-picker-add {
            width: 32px; height: 32px; border-radius: 50%; border: none;
            background: rgba(233,174,103,.15);
            color: #E9AE67; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; transition: .18s;
        }
        .pb-picker-add:hover { background: #E9AE67; color: #1a1a1a; }

        /* ── Лайтбокс ── */
        #pb-lightbox {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,.97);
            z-index: 9999;
            align-items: center; justify-content: center;
            flex-direction: column;
        }
        #pb-lightbox.open { display: flex; }
        #pb-lightbox-img {
            max-width: 95vw; max-height: 80vh;
            border-radius: 10px; object-fit: contain;
        }
        .pb-lb-counter {
            color: rgba(255,255,255,.5); font-size: 13px; margin-top: 12px;
        }
        .pb-lb-close {
            position: absolute; top: 16px; right: 16px;
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,.1); border: none;
            color: #fff; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        }
        .pb-lb-prev, .pb-lb-next {
            position: absolute; top: 50%; transform: translateY(-50%);
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(255,255,255,.12); border: none;
            color: #fff; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: .18s;
        }
        .pb-lb-prev { left: 12px; }
        .pb-lb-next { right: 12px; }
        .pb-lb-prev:hover, .pb-lb-next:hover { background: rgba(233,174,103,.3); }

        /* ── Модалка загрузки фото ── */
        #pb-upload-modal .pb-sheet { max-height: 60vh; }
        .pb-upload-zone {
            margin: 16px;
            border: 2px dashed rgba(233,174,103,.3);
            border-radius: 16px;
            padding: 40px 20px;
            text-align: center;
            cursor: pointer;
            transition: .2s;
        }
        .pb-upload-zone:hover, .pb-upload-zone.drag-over {
            border-color: #E9AE67;
            background: rgba(233,174,103,.05);
        }
        .pb-upload-zone svg { color: #E9AE67; opacity: .6; margin-bottom: 12px; }
        .pb-upload-zone p { color: #888; font-size: 13px; margin: 0; }
        .pb-upload-zone strong { color: #f0f0f0; display: block; margin-bottom: 6px; font-size: 14px; }

        /* ── Подтверждение удаления ── */
        #pb-confirm-modal .pb-sheet { max-height: 50vh; }
        .pb-confirm-body {
            padding: 20px 20px 28px;
            text-align: center;
        }
        .pb-confirm-body p { color: #bbb; font-size: 14px; margin: 8px 0 20px; }
        .pb-confirm-btns { display: flex; gap: 10px; }
        .pb-btn-danger {
            flex: 1; padding: 13px; border-radius: 12px; border: none;
            background: linear-gradient(135deg, #ff5555, #cc3333);
            color: #fff; font-weight: 700; font-size: 14px; cursor: pointer;
            transition: .18s;
        }
        .pb-btn-danger:hover { opacity: .85; }
        .pb-btn-cancel {
            flex: 1; padding: 13px; border-radius: 12px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.1);
            color: #888; font-weight: 600; font-size: 14px; cursor: pointer;
            transition: .18s;
        }
        .pb-btn-cancel:hover { background: rgba(255,255,255,.1); color: #f0f0f0; }
        `;
        document.head.appendChild(s);
    }

    // ── DOM ──────────────────────────────────────────────────
    function injectDOM() {
        // Зона блоков — вставляем после .profile-card
        const profileCard = document.querySelector('.profile-card') ||
                            document.getElementById('collapsibleDetails')?.parentElement;
        if (!profileCard) return;

        const zone = document.createElement('div');
        zone.id = 'pb-zone';
        profileCard.insertAdjacentElement('afterend', zone);

        // Модалка выбора блока
        document.body.insertAdjacentHTML('beforeend', `
        <div id="pb-picker-modal" class="pb-overlay">
            <div class="pb-sheet">
                <div class="pb-drag"></div>
                <div class="pb-sheet-header">
                    <span class="pb-sheet-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        Добавить блок
                    </span>
                    <button class="pb-close-btn" id="pb-picker-close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div id="pb-picker-list"></div>
            </div>
        </div>

        <!-- Лайтбокс -->
        <div id="pb-lightbox">
            <button class="pb-lb-close" id="pb-lb-close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <button class="pb-lb-prev" id="pb-lb-prev">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <img id="pb-lightbox-img" src="" alt="">
            <button class="pb-lb-next" id="pb-lb-next">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            <div class="pb-lb-counter" id="pb-lb-counter"></div>
        </div>

        <!-- Модалка загрузки фото -->
        <div id="pb-upload-modal" class="pb-overlay">
            <div class="pb-sheet">
                <div class="pb-drag"></div>
                <div class="pb-sheet-header">
                    <span class="pb-sheet-title">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Загрузить фото
                    </span>
                    <button class="pb-close-btn" id="pb-upload-close">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="pb-upload-zone" id="pb-upload-zone">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 12px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <strong>Нажмите или перетащите фото сюда</strong>
                    <p>JPG, PNG, WebP до 10 МБ</p>
                </div>
                <input type="file" id="pb-file-input" accept="image/jpeg,image/png,image/webp" style="display:none">
            </div>
        </div>

        <!-- Подтверждение удаления -->
        <div id="pb-confirm-modal" class="pb-overlay">
            <div class="pb-sheet">
                <div class="pb-drag"></div>
                <div class="pb-sheet-header">
                    <span class="pb-sheet-title" id="pb-confirm-title">Подтверждение</span>
                </div>
                <div class="pb-confirm-body">
                    <p id="pb-confirm-text"></p>
                    <div class="pb-confirm-btns">
                        <button class="pb-btn-danger" id="pb-confirm-ok">Удалить</button>
                        <button class="pb-btn-cancel" id="pb-confirm-cancel">Отмена</button>
                    </div>
                </div>
            </div>
        </div>
        `);
    }

    // ── Глобальные события ───────────────────────────────────
    function bindGlobalEvents() {
        // Закрытие модалок
        on('pb-picker-close', 'click', () => closeModal('pb-picker-modal'));
        on('pb-picker-modal', 'click', e => { if (e.target.id === 'pb-picker-modal') closeModal('pb-picker-modal'); });

        on('pb-upload-close', 'click', () => closeModal('pb-upload-modal'));
        on('pb-upload-modal', 'click', e => { if (e.target.id === 'pb-upload-modal') closeModal('pb-upload-modal'); });

        on('pb-confirm-cancel', 'click', () => closeModal('pb-confirm-modal'));
        on('pb-confirm-modal', 'click', e => { if (e.target.id === 'pb-confirm-modal') closeModal('pb-confirm-modal'); });

        // Лайтбокс
        on('pb-lb-close', 'click', closeLightbox);
        on('pb-lb-prev', 'click', () => lbNav(-1));
        on('pb-lb-next', 'click', () => lbNav(1));
        on('pb-lightbox', 'click', e => { if (e.target.id === 'pb-lightbox') closeLightbox(); });

        // Свайп на лайтбоксе
        const lb = document.getElementById('pb-lightbox');
        if (lb) {
            lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
            lb.addEventListener('touchend', e => {
                const diff = touchStartX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) lbNav(diff > 0 ? 1 : -1);
            });
        }

        // Загрузка фото — зона и input
        on('pb-upload-zone', 'click', () => document.getElementById('pb-file-input')?.click());
        on('pb-file-input', 'change', handleFileInput);

        const uploadZone = document.getElementById('pb-upload-zone');
        if (uploadZone) {
            uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
            uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
            uploadZone.addEventListener('drop', e => {
                e.preventDefault();
                uploadZone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) uploadPhoto(file);
            });
        }

        // Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeLightbox();
                closeModal('pb-picker-modal');
                closeModal('pb-upload-modal');
                closeModal('pb-confirm-modal');
            }
            if (e.key === 'ArrowLeft') lbNav(-1);
            if (e.key === 'ArrowRight') lbNav(1);
        });
    }

    // ── Загрузка блоков с сервера ────────────────────────────
    async function loadBlocks() {
        if (!profileUserId) return;
        try {
            const res = await fetch(`/api/profile-blocks/${profileUserId}`);
            const data = await res.json();
            if (!data.success) return;
            blocks = data.blocks || [];
            renderZone();
        } catch(e) { console.error('pb loadBlocks error', e); }
    }

    // ── Рендер зоны блоков ───────────────────────────────────
    function renderZone() {
        const zone = document.getElementById('pb-zone');
        if (!zone) return;
        zone.innerHTML = '';

        blocks.forEach(block => {
            // Гость не видит скрытые блоки
            if (!block.is_visible && !isOwner) return;

            const el = renderBlock(block);
            if (!el) return;

            // Владелец видит скрытые блоки полупрозрачными
            if (!block.is_visible && isOwner) {
                el.style.opacity = '0.4';
                el.style.filter = 'grayscale(0.5)';
                // Бейдж "Скрыт"
                const badge = document.createElement('div');
                badge.style.cssText = 'position:absolute;top:8px;left:12px;background:rgba(0,0,0,.6);color:#888;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;pointer-events:none;z-index:5;';
                badge.textContent = '🙈 Скрыт';
                el.style.position = 'relative';
                el.appendChild(badge);
            }

            zone.appendChild(el);
        });

        if (isOwner) {
            const btn = document.createElement('button');
            btn.id = 'pb-add-btn';
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Добавить блок
            `;
            btn.addEventListener('click', openPicker);
            zone.appendChild(btn);
        }
    }

    // ── Рендер одного блока ──────────────────────────────────
    // Точка расширения: добавить case для нового типа
    function renderBlock(block) {
        switch(block.block_type) {
            case 'photo_gallery': return renderPhotoGallery(block);
            case 'services': return renderServices(block);
            default: return null;
        }
    }

    // ── Блок "Мои фото" ──────────────────────────────────────
    function renderPhotoGallery(block) {
        const wrap = document.createElement('div');
        wrap.className = 'pb-block';
        wrap.dataset.blockId = block.id;
        wrap.dataset.blockType = block.block_type;

        const header = document.createElement('div');
        header.className = 'pb-block-header';
        header.innerHTML = `
            <span class="pb-block-title">Мои фото <span id="pb-photo-counter-${block.id}" style="font-size:12px;font-weight:500;color:#888;"></span></span>
        `;

        const grid = document.createElement('div');
        grid.className = 'pb-photo-grid';
        grid.id = `pb-grid-${block.id}`;

        // Применяем свёрнутость для всех (гость видит то же что владелец)
        if (block.is_collapsed && !isOwner) grid.style.display = 'none';

        // Гость может кликнуть на заголовок чтобы развернуть/свернуть (без сохранения)
        if (!isOwner) {
            header.style.cursor = 'pointer';
            const chevron = document.createElement('span');
            chevron.style.cssText = 'color:#555;transition:transform .2s;display:flex;align-items:center;margin-left:auto;';
            chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${block.is_collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'}"/></svg>`;
            header.appendChild(chevron);
            header.addEventListener('click', () => {
                const isHidden = grid.style.display === 'none';
                grid.style.display = isHidden ? 'grid' : 'none';
                chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${isHidden ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}"/></svg>`;
            });
        }

        if (isOwner) {
            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'pb-block-menu-btn';
            const svgUp = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`;
            const svgDown = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

            let isCollapsed = !!block.is_collapsed;
            const applyCollapse = () => {
                grid.style.display = isCollapsed ? 'none' : 'grid';
                collapseBtn.innerHTML = isCollapsed ? svgDown : svgUp;
                collapseBtn.title = isCollapsed ? 'Развернуть' : 'Свернуть';
            };
            applyCollapse();

            collapseBtn.addEventListener('click', async () => {
                isCollapsed = !isCollapsed;
                applyCollapse();
                try {
                    await fetch(`/api/profile-blocks/${block.id}/collapse`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId, isCollapsed })
                    });
                } catch(e) {}
            });

            const menuBtn = document.createElement('button');
            menuBtn.className = 'pb-block-menu-btn';
            menuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
            menuBtn.addEventListener('click', e => { e.stopPropagation(); toggleBlockMenu(block, menuBtn); });

            header.appendChild(collapseBtn);
            header.appendChild(menuBtn);
        }

        wrap.appendChild(header);
        wrap.appendChild(grid);

        loadPhotoGrid(block, grid);

        return wrap;
    }

    async function loadPhotoGrid(block, grid) {
        try {
            const res = await fetch(`/api/profile-blocks/photos/${block.id}`);
            const data = await res.json();
            if (!data.success) return;
            renderPhotoGrid(block, grid, data.photos);
        } catch(e) { console.error('pb loadPhotoGrid error', e); }
    }

    function renderPhotoGrid(block, grid, photos) {
        grid.innerHTML = '';
        // Строим карту слотов
        const slotMap = {};
        photos.forEach(p => { slotMap[p.slot_number] = p; });

        // Обновляем счётчик
        const counter = document.getElementById(`pb-photo-counter-${block.id}`);
        if (counter) counter.textContent = `· ${photos.length}/6`;

        // Собираем фото для лайтбокса — используем оригинал если есть
        const lbPhotos = [];
        for (let i = 1; i <= 6; i++) {
            if (slotMap[i]) lbPhotos.push({
                url: slotMap[i].image_path_orig || slotMap[i].image_path,
                photoId: slotMap[i].id,
                slot: i
            });
        }

        for (let i = 1; i <= 6; i++) {
            const slot = document.createElement('div');
            slot.className = 'pb-photo-slot';

            if (slotMap[i]) {
                const photo = slotMap[i];
                const lbIdx = lbPhotos.findIndex(p => p.slot === i);

                const img = document.createElement('img');
                img.src = photo.image_path;
                img.alt = '';
                img.addEventListener('click', () => openLightbox(lbPhotos, lbIdx));
                slot.appendChild(img);

                if (isOwner) {
                    const del = document.createElement('button');
                    del.className = 'pb-photo-del';
                    del.title = 'Удалить фото';
                    del.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
                    del.addEventListener('click', e => {
                        e.stopPropagation();
                        confirmDeletePhoto(photo.id, block, grid);
                    });
                    slot.appendChild(del);
                }
            } else {
                // Пустой слот — только владельцу кликабелен
                const empty = document.createElement('div');
                empty.className = 'pb-photo-empty';
                empty.innerHTML = isOwner
                    ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`
                    : '';
                if (isOwner) {
                    slot.addEventListener('click', () => openUploadModal(block, i, grid));
                }
                slot.appendChild(empty);
            }

            grid.appendChild(slot);
        }
    }

    // ── Меню блока ───────────────────────────────────────────
    function toggleBlockMenu(block, btn) {
        document.querySelectorAll('.pb-block-menu').forEach(m => m.remove());

        const idx = blocks.findIndex(b => b.id === block.id);
        const canUp = idx > 0;
        const canDown = idx < blocks.length - 1;
        const isHidden = !block.is_visible;

        const menu = document.createElement('div');
        menu.className = 'pb-block-menu';
        menu.innerHTML = `
            ${canUp ? `<button id="pb-menu-up">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                Переместить вверх
            </button>` : ''}
            ${canDown ? `<button id="pb-menu-down">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                Переместить вниз
            </button>` : ''}
            <button id="pb-menu-visibility">
                ${isHidden
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Показать блок`
                    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Скрыть блок`
                }
            </button>
            <button class="danger" id="pb-menu-delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                Удалить блок
            </button>
        `;

        const rect = btn.getBoundingClientRect();
        const zoneRect = document.getElementById('pb-zone').getBoundingClientRect();
        menu.style.top = (rect.bottom - zoneRect.top + 4) + 'px';
        menu.style.right = '0';

        document.getElementById('pb-zone').style.position = 'relative';
        document.getElementById('pb-zone').appendChild(menu);

        if (canUp) menu.querySelector('#pb-menu-up').addEventListener('click', () => {
            menu.remove(); moveBlock(block, 'up');
        });
        if (canDown) menu.querySelector('#pb-menu-down').addEventListener('click', () => {
            menu.remove(); moveBlock(block, 'down');
        });
        menu.querySelector('#pb-menu-visibility').addEventListener('click', () => {
            menu.remove(); toggleBlockVisibility(block);
        });
        menu.querySelector('#pb-menu-delete').addEventListener('click', () => {
            menu.remove(); confirmDeleteBlock(block);
        });

        setTimeout(() => {
            document.addEventListener('click', function handler() {
                menu.remove();
                document.removeEventListener('click', handler);
            });
        }, 50);
    }

    async function toggleBlockVisibility(block) {
        const newVisible = !block.is_visible;
        try {
            await fetch(`/api/profile-blocks/${block.id}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, isVisible: newVisible })
            });
            await loadBlocks();
        } catch(e) { console.error('pb toggleVisibility error', e); }
    }

    async function moveBlock(block, direction) {
        try {
            await fetch(`/api/profile-blocks/${block.id}/position`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, direction })
            });
            await loadBlocks();
        } catch(e) { console.error('pb moveBlock error', e); }
    }

    // ── Пикер блоков ─────────────────────────────────────────
    function openPicker() {
        const list = document.getElementById('pb-picker-list');
        if (!list) return;
        list.innerHTML = '';

        // Типы которые уже добавлены
        const addedTypes = new Set(blocks.map(b => b.block_type));

        BLOCK_REGISTRY.forEach(def => {
            const item = document.createElement('div');
            item.className = 'pb-picker-item';
            const alreadyAdded = addedTypes.has(def.type);
            item.innerHTML = `
                <div class="pb-picker-icon">${def.icon}</div>
                <div class="pb-picker-info">
                    <div class="pb-picker-name">${def.title}</div>
                    <div class="pb-picker-desc">${def.description}</div>
                </div>
                <button class="pb-picker-add" ${alreadyAdded ? 'disabled style="opacity:.4;cursor:default"' : ''}>
                    ${alreadyAdded
                        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>`
                        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`
                    }
                </button>
            `;
            if (!alreadyAdded) {
                item.addEventListener('click', () => addBlock(def.type));
            }
            list.appendChild(item);
        });

        openModal('pb-picker-modal');
    }

    async function addBlock(blockType) {
        closeModal('pb-picker-modal');
        try {
            const res = await fetch('/api/profile-blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, blockType })
            });
            const data = await res.json();
            if (data.success) await loadBlocks();
        } catch(e) { console.error('pb addBlock error', e); }
    }

    // ── Загрузка фото ────────────────────────────────────────
    let uploadContext = null; // { block, slotNumber, grid }

    function openUploadModal(block, slotNumber, grid) {
        uploadContext = { block, slotNumber, grid };
        const zone = document.getElementById('pb-upload-zone');
        if (zone) zone.classList.remove('drag-over');
        const fi = document.getElementById('pb-file-input');
        if (fi) fi.value = '';
        openModal('pb-upload-modal');
    }

    function handleFileInput(e) {
        const file = e.target.files[0];
        if (file) uploadPhoto(file);
    }

    async function uploadPhoto(file) {
        if (!uploadContext) return;
        const { block, slotNumber, grid } = uploadContext;
        closeModal('pb-upload-modal');

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', currentUserId);
        formData.append('blockId', block.id);
        formData.append('slotNumber', slotNumber);

        try {
            const res = await fetch('/api/profile-blocks/photo', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                // Перезагрузить только сетку этого блока
                const freshRes = await fetch(`/api/profile-blocks/photos/${block.id}`);
                const freshData = await freshRes.json();
                if (freshData.success) renderPhotoGrid(block, grid, freshData.photos);
            }
        } catch(e) { console.error('pb uploadPhoto error', e); }
        uploadContext = null;
    }

    // ── Удаление фото ────────────────────────────────────────
    function confirmDeletePhoto(photoId, block, grid) {
        showConfirm(
            'Удалить фото?',
            'Вы уверены, что хотите удалить это фото?',
            async () => {
                try {
                    const res = await fetch(`/api/profile-blocks/photo/${photoId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        const freshRes = await fetch(`/api/profile-blocks/photos/${block.id}`);
                        const freshData = await freshRes.json();
                        if (freshData.success) renderPhotoGrid(block, grid, freshData.photos);
                    }
                } catch(e) { console.error('pb deletePhoto error', e); }
            }
        );
    }

    // ── Удаление блока ───────────────────────────────────────
    function confirmDeleteBlock(block) {
        showConfirm(
            'Удалить блок?',
            'Блок и все фотографии будут удалены навсегда.',
            async () => {
                try {
                    const res = await fetch(`/api/profile-blocks/${block.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId })
                    });
                    const data = await res.json();
                    if (data.success) await loadBlocks();
                } catch(e) { console.error('pb deleteBlock error', e); }
            }
        );
    }

    // ── Лайтбокс ────────────────────────────────────────────
    function openLightbox(photos, index) {
        lightboxPhotos = photos;
        lightboxIndex = index;
        updateLightbox();
        document.getElementById('pb-lightbox').classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        const lb = document.getElementById('pb-lightbox');
        if (lb) lb.classList.remove('open');
        document.body.style.overflow = '';
    }

    function lbNav(dir) {
        if (!lightboxPhotos.length) return;
        lightboxIndex = (lightboxIndex + dir + lightboxPhotos.length) % lightboxPhotos.length;
        updateLightbox();
    }

    function updateLightbox() {
        const img = document.getElementById('pb-lightbox-img');
        const counter = document.getElementById('pb-lb-counter');
        const prev = document.getElementById('pb-lb-prev');
        const next = document.getElementById('pb-lb-next');
        if (!img) return;
        img.src = lightboxPhotos[lightboxIndex].url;
        if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
        if (prev) prev.style.display = lightboxPhotos.length > 1 ? 'flex' : 'none';
        if (next) next.style.display = lightboxPhotos.length > 1 ? 'flex' : 'none';
    }

    // ── Подтверждение ────────────────────────────────────────
    let confirmCallback = null;
    function showConfirm(title, text, onOk) {
        document.getElementById('pb-confirm-title').textContent = title;
        document.getElementById('pb-confirm-text').textContent = text;
        confirmCallback = onOk;
        openModal('pb-confirm-modal');
    }

    document.addEventListener('click', e => {
        if (e.target.id === 'pb-confirm-ok') {
            closeModal('pb-confirm-modal');
            if (typeof confirmCallback === 'function') confirmCallback();
            confirmCallback = null;
        }
    });

    // ── Утилиты ──────────────────────────────────────────────
    function openModal(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
    }
    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
    }
    function on(id, event, fn) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    }

    // ── БЛОК "МОИ УСЛУГИ" ────────────────────────────────────

    const SERVICE_ICONS = [
        'ti-barbell','ti-device-laptop','ti-user','ti-users','ti-trophy',
        'ti-bolt','ti-run','ti-salad','ti-clipboard-list','ti-trending-down',
        'ti-trending-up','ti-refresh','ti-star','ti-gender-male','ti-gender-female',
        'ti-message-circle','ti-checklist','ti-heart-rate-monitor','ti-heart','ti-calendar-event',
        'ti-meat','ti-coffee','ti-heart-handshake','ti-flame','ti-car',
        'ti-sun','ti-mood-smile','ti-mood-happy','ti-yoga','ti-swimming'
    ];

    // Инжектим стили услуг
    function injectServicesStyles() {
        if (document.getElementById('pb-svc-styles')) return;
        const s = document.createElement('style');
        s.id = 'pb-svc-styles';
        s.textContent = `
        .pb-svc-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            padding: 0 12px 14px;
        }
        .pb-svc-card {
            background: rgba(255,255,255,.04);
            border: 0.5px solid rgba(233,174,103,.2);
            border-radius: 12px;
            padding: 13px;
            display: flex; flex-direction: column; gap: 5px;
            position: relative;
        }
        .pb-svc-icon-wrap {
            width: 38px; height: 38px; border-radius: 10px;
            background: rgba(233,174,103,.1);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .pb-svc-icon-wrap i { font-size: 20px; color: #E9AE67; }
        .pb-svc-title-row {
            display: flex; align-items: flex-start; gap: 10px;
            margin-bottom: 2px;
        }
        .pb-svc-title { font-size: 13px; font-weight: 600; color: #f0f0f0; line-height: 1.3; flex: 1; }
        .pb-svc-subtitle { font-size: 11px; color: #888; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
        .pb-svc-more-btn { background: none; border: none; color: #E9AE67; font-size: 11px; cursor: pointer; padding: 0; font-weight: 500; }
        .pb-svc-price { font-size: 15px; font-weight: 600; color: #E9AE67; margin-top: 2px; }
        .pb-svc-price.on-request { font-size: 12px; color: #888; font-style: italic; font-weight: 400; }
        .pb-svc-btn {
            width: 100%; padding: 7px; border-radius: 8px; margin-top: 4px;
            border: 0.5px solid rgba(233,174,103,.35);
            background: transparent; color: #E9AE67;
            font-size: 12px; font-weight: 500; cursor: pointer;
            transition: .18s;
        }
        .pb-svc-btn:hover { background: rgba(233,174,103,.1); }
        .pb-svc-del {
            position: absolute; top: 6px; right: 6px;
            width: 20px; height: 20px; border-radius: 50%;
            background: rgba(0,0,0,.5); border: none;
            color: #888; cursor: pointer; font-size: 10px;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity .18s;
        }
        .pb-svc-card:hover .pb-svc-del { opacity: 1; }
        @media(hover:none) { .pb-svc-del { opacity: 0.6; } }
        .pb-svc-add-btn {
            margin: 0 12px 14px;
            width: calc(100% - 24px);
            padding: 11px; border-radius: 11px;
            border: 1.5px dashed rgba(233,174,103,.3);
            background: rgba(233,174,103,.04);
            color: #E9AE67; font-size: 13px; font-weight: 500;
            cursor: pointer; display: flex; align-items: center;
            justify-content: center; gap: 7px; transition: .2s;
        }
        .pb-svc-add-btn:hover { background: rgba(233,174,103,.1); border-color: rgba(233,174,103,.6); }

        /* Форма добавления услуги */
        #pb-svc-modal .pb-sheet { max-height: 92vh; }
        #pb-svc-modal .pb-sheet-body { padding: 14px 15px; display: flex; flex-direction: column; gap: 13px; overflow-y: auto; }
        .pb-svc-ic-wrap { position: relative; }
        .pb-svc-ic-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .pb-svc-ic-count { font-size: 10px; color: #555; font-weight: 400; }
        .pb-svc-ic-scroll {
            display: flex; gap: 6px;
            overflow-x: auto; overflow-y: hidden;
            padding-bottom: 6px; scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
        }
        .pb-svc-ic-scroll::-webkit-scrollbar { height: 3px; }
        .pb-svc-ic-scroll::-webkit-scrollbar-thumb { background: rgba(233,174,103,.2); border-radius: 2px; }
        .pb-svc-ic-item {
            width: 52px; height: 52px; flex-shrink: 0;
            border-radius: 12px; background: rgba(255,255,255,.05);
            border: 1.5px solid rgba(255,255,255,.08);
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all .15s;
            scroll-snap-align: start;
        }
        .pb-svc-ic-item:hover { background: rgba(233,174,103,.08); border-color: rgba(233,174,103,.35); }
        .pb-svc-ic-item.active { background: rgba(233,174,103,.14); border-color: #E9AE67; }
        .pb-svc-ic-item i { font-size: 24px; color: #666; line-height: 1; }
        .pb-svc-ic-item.active i { color: #E9AE67; }
        .pb-svc-field-label { font-size: 10px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; }
        .pb-svc-input {
            background: rgba(255,255,255,.06); border: 0.5px solid rgba(255,255,255,.12);
            border-radius: 10px; padding: 9px 12px; color: #f0f0f0; font-size: 13px;
            width: 100%; box-sizing: border-box; outline: none; font-family: inherit;
        }
        .pb-svc-price-input {
            flex: 1; background: rgba(255,255,255,.06);
            border: 0.5px solid rgba(233,174,103,.3); border-radius: 10px;
            padding: 9px 12px; color: #E9AE67; font-size: 13px; font-weight: 500;
            outline: none; font-family: inherit; box-sizing: border-box;
        }
        .pb-svc-onreq-btn {
            background: rgba(255,255,255,.04); border: 0.5px solid rgba(255,255,255,.1);
            border-radius: 10px; padding: 9px 12px; color: #888; font-size: 12px;
            cursor: pointer; white-space: nowrap; transition: .15s; font-family: inherit;
        }
        .pb-svc-onreq-btn.active { border-color: rgba(233,174,103,.4); color: #E9AE67; background: rgba(233,174,103,.07); }
        .pb-svc-save-btn {
            width: 100%; padding: 12px; border-radius: 12px; border: none;
            background: linear-gradient(135deg, #E9AE67, #c4894a);
            color: #1a1a1a; font-size: 14px; font-weight: 700; cursor: pointer;
            font-family: inherit; transition: .18s;
        }
        .pb-svc-save-btn:hover { opacity: .9; }
        `;
        document.head.appendChild(s);
    }

    // Рендер блока услуг
    function renderServices(block) {
        injectServicesStyles();

        const wrap = document.createElement('div');
        wrap.className = 'pb-block';
        wrap.dataset.blockId = block.id;
        wrap.dataset.blockType = block.block_type;

        const header = document.createElement('div');
        header.className = 'pb-block-header';
        header.innerHTML = `<span class="pb-block-title">Мои услуги <span id="pb-svc-counter-${block.id}" style="font-size:12px;font-weight:500;color:#888;"></span></span>`;

        const content = document.createElement('div');
        content.id = `pb-svc-content-${block.id}`;

        const grid = document.createElement('div');
        grid.className = 'pb-svc-grid';
        grid.id = `pb-svc-grid-${block.id}`;
        content.appendChild(grid);

        // Применяем свёрнутость для гостя
        if (block.is_collapsed && !isOwner) content.style.display = 'none';

        // Гость может кликнуть на заголовок чтобы развернуть/свернуть (без сохранения)
        if (!isOwner) {
            header.style.cursor = 'pointer';
            const chevron = document.createElement('span');
            chevron.style.cssText = 'color:#555;transition:transform .2s;display:flex;align-items:center;margin-left:auto;';
            chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${block.is_collapsed ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'}"/></svg>`;
            header.appendChild(chevron);
            header.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="${isHidden ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}"/></svg>`;
            });
        }

        if (isOwner) {
            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'pb-block-menu-btn';
            const svgUp = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`;
            const svgDown = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

            let collapsed = !!block.is_collapsed;
            const applyCollapse = () => {
                content.style.display = collapsed ? 'none' : 'block';
                collapseBtn.innerHTML = collapsed ? svgDown : svgUp;
                collapseBtn.title = collapsed ? 'Развернуть' : 'Свернуть';
            };
            applyCollapse();

            collapseBtn.addEventListener('click', async () => {
                collapsed = !collapsed;
                applyCollapse();
                try {
                    await fetch(`/api/profile-blocks/${block.id}/collapse`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUserId, isCollapsed: collapsed })
                    });
                } catch(e) {}
            });

            const menuBtn = document.createElement('button');
            menuBtn.className = 'pb-block-menu-btn';
            menuBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
            menuBtn.addEventListener('click', e => { e.stopPropagation(); toggleBlockMenu(block, menuBtn); });

            header.appendChild(collapseBtn);
            header.appendChild(menuBtn);
        }

        if (isOwner) {
            const addBtn = document.createElement('button');
            addBtn.className = 'pb-svc-add-btn';
            addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Добавить услугу`;
            addBtn.addEventListener('click', () => openServiceForm(block, grid));
            content.appendChild(addBtn);
        }

        wrap.appendChild(header);
        wrap.appendChild(content);

        loadServicesGrid(block, grid);

        return wrap;
    }

    async function loadServicesGrid(block, grid) {
        try {
            const res = await fetch(`/api/profile-blocks/services/${block.id}`);
            const data = await res.json();
            if (!data.success) return;
            renderServicesGrid(block, grid, data.services);
        } catch(e) { console.error('pb loadServices error', e); }
    }

    function renderServicesGrid(block, grid, services) {
        grid.innerHTML = '';
        const counter = document.getElementById(`pb-svc-counter-${block.id}`);
        if (counter) counter.textContent = services.length ? `· ${services.length}` : '';

        services.forEach(svc => {
            const card = document.createElement('div');
            card.className = 'pb-svc-card';
            if (isOwner) card.style.cursor = 'pointer';
            const subtitleHtml = (() => {
                if (!svc.subtitle) return '';
                const full = esc(svc.subtitle);
                const LIMIT = 50;
                if (svc.subtitle.length <= LIMIT) {
                    return `<div class="pb-svc-subtitle">${full}</div>`;
                }
                const short = esc(svc.subtitle.slice(0, LIMIT).trimEnd());
                return `<div class="pb-svc-subtitle pb-svc-desc" data-full="${full}" data-short="${short}" data-expanded="0">${short}... <button class="pb-svc-more-btn">Ещё</button></div>`;
            })();

            card.innerHTML = `
                <div class="pb-svc-title-row">
                    <div class="pb-svc-icon-wrap"><i class="ti ${svc.icon}"></i></div>
                    <div class="pb-svc-title">${esc(svc.title)}</div>
                </div>
                ${subtitleHtml}
                <div class="pb-svc-price ${svc.price_on_request ? 'on-request' : ''}">${svc.price_on_request ? 'По запросу' : esc(svc.price || '')}</div>
            `;

            // Логика разворачивания описания
            const descEl = card.querySelector('.pb-svc-desc');
            if (descEl) {
                descEl.addEventListener('click', function(e) {
                    const btn = e.target.closest('.pb-svc-more-btn');
                    if (!btn) return;
                    e.stopPropagation();
                    const expanded = this.dataset.expanded === '1';
                    if (expanded) {
                        this.innerHTML = this.dataset.short + '... <button class="pb-svc-more-btn">Ещё</button>';
                        this.dataset.expanded = '0';
                    } else {
                        this.innerHTML = this.dataset.full + ' <button class="pb-svc-more-btn">Свернуть</button>';
                        this.dataset.expanded = '1';
                    }
                });
            }

            // Клик по карточке = редактировать (только владелец)
            if (isOwner) {
                card.addEventListener('click', e => {
                    if (e.target.closest('.pb-svc-del') || e.target.closest('.pb-svc-btn')) return;
                    openServiceForm(block, grid, svc);
                });
            }

            // Кнопка "Написать" — только для гостей
            if (!isOwner) {
                const writeBtn = document.createElement('button');
                writeBtn.className = 'pb-svc-btn';
                writeBtn.textContent = 'Написать';
                writeBtn.addEventListener('click', () => {
                    if (!currentUserId) { window.location.href = '/login.html'; return; }
                    if (typeof window.openChatWithUser === 'function') {
                        window.openChatWithUser(profileUserId);
                    }
                });
                card.appendChild(writeBtn);
            }

            // Кнопка удалить (только владелец)
            if (isOwner) {
                const delBtn = document.createElement('button');
                delBtn.className = 'pb-svc-del';
                delBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
                delBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    showConfirm('Удалить услугу?', `"${svc.title}" будет удалена.`, async () => {
                        try {
                            await fetch(`/api/profile-blocks/services/${svc.id}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentUserId })
                            });
                            loadServicesGrid(block, grid);
                        } catch(e) { console.error(e); }
                    });
                });
                card.appendChild(delBtn);
            }

            grid.appendChild(card);
        });
    }

    // Форма добавления услуги
    let svcFormContext = null;

    function openServiceForm(block, grid, editSvc = null) {
        svcFormContext = { block, grid };
        const isEdit = !!editSvc;

        if (!document.getElementById('pb-svc-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
            <div id="pb-svc-modal" class="pb-overlay">
                <div class="pb-sheet">
                    <div class="pb-drag"></div>
                    <div class="pb-sheet-header">
                        <span class="pb-sheet-title" id="pb-svc-modal-title">Новая услуга</span>
                        <button class="pb-close-btn" id="pb-svc-close">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div class="pb-sheet-body" id="pb-svc-body"></div>
                </div>
            </div>`);
            document.getElementById('pb-svc-close').addEventListener('click', () => closeModal('pb-svc-modal'));
            document.getElementById('pb-svc-modal').addEventListener('click', e => {
                if (e.target.id === 'pb-svc-modal') closeModal('pb-svc-modal');
            });
        }

        // Заголовок
        const titleEl = document.getElementById('pb-svc-modal-title');
        if (titleEl) titleEl.textContent = isEdit ? 'Редактировать услугу' : 'Новая услуга';

        const body = document.getElementById('pb-svc-body');
        let selectedIcon = isEdit ? (editSvc.icon || SERVICE_ICONS[0]) : SERVICE_ICONS[0];
        let priceOnRequest = isEdit ? !!editSvc.price_on_request : false;

        body.innerHTML = `
            <div class="pb-svc-ic-wrap">
                <div class="pb-svc-ic-label-row">
                    <div class="pb-svc-field-label" style="margin-bottom:0;">Иконка</div>
                    <span class="pb-svc-ic-count">${SERVICE_ICONS.length} иконок</span>
                </div>
                <div class="pb-svc-ic-scroll" id="pb-svc-ic-grid">
                    ${SERVICE_ICONS.map(ic => `
                        <div class="pb-svc-ic-item ${ic === selectedIcon ? 'active' : ''}" data-icon="${ic}">
                            <i class="ti ${ic}" aria-hidden="true"></i>
                        </div>`).join('')}
                </div>
            </div>
            <div>
                <div class="pb-svc-field-label" style="display:flex;justify-content:space-between;">
                    Название <span id="pb-cnt-title" style="font-weight:400;color:#555;">0/40</span>
                </div>
                <input class="pb-svc-input" id="pb-svc-title" type="text" placeholder="Персональная тренировка" maxlength="40" value="${isEdit ? esc(editSvc.title) : ''}">
            </div>
            <div>
                <div class="pb-svc-field-label" style="display:flex;justify-content:space-between;">
                    Описание <span id="pb-cnt-subtitle" style="font-weight:400;color:#555;">0/300</span>
                </div>
                <textarea class="pb-svc-input" id="pb-svc-subtitle" placeholder="Например: Персональная тренировка в зале или онлайн..." maxlength="300" rows="3" style="resize:none;line-height:1.5;">${isEdit && editSvc.subtitle ? esc(editSvc.subtitle) : ''}</textarea>
            </div>
            <div>
                <div class="pb-svc-field-label" style="display:flex;justify-content:space-between;">
                    Цена <span id="pb-cnt-price" style="font-weight:400;color:#555;">0/20</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <input class="pb-svc-price-input" id="pb-svc-price" type="text" placeholder="2 500 ₽" maxlength="20"
                        value="${isEdit && !editSvc.price_on_request && editSvc.price ? esc(editSvc.price) : ''}"
                        ${priceOnRequest ? 'disabled style="opacity:0.3"' : ''}>
                    <button class="pb-svc-onreq-btn ${priceOnRequest ? 'active' : ''}" id="pb-svc-onreq">По запросу</button>
                </div>
            </div>
            <button class="pb-svc-save-btn" id="pb-svc-save">${isEdit ? 'Сохранить изменения' : 'Сохранить'}</button>
        `;

        document.getElementById('pb-svc-ic-grid').addEventListener('click', e => {
            const item = e.target.closest('.pb-svc-ic-item');
            if (!item) return;
            document.querySelectorAll('.pb-svc-ic-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedIcon = item.dataset.icon;
        });

        // Drag-to-scroll для иконок
        const scroller = document.getElementById('pb-svc-ic-grid');
        let isDragging = false, startX, scrollLeft;
        scroller.addEventListener('mousedown', e => {
            isDragging = true; startX = e.pageX - scroller.offsetLeft;
            scrollLeft = scroller.scrollLeft; scroller.style.cursor = 'grabbing';
        });
        scroller.addEventListener('mouseleave', () => { isDragging = false; scroller.style.cursor = ''; });
        scroller.addEventListener('mouseup', () => { isDragging = false; scroller.style.cursor = ''; });
        scroller.addEventListener('mousemove', e => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - scroller.offsetLeft;
            scroller.scrollLeft = scrollLeft - (x - startX);
        });

        // Прокрутить к выбранной иконке
        setTimeout(() => {
            const active = document.querySelector('.pb-svc-ic-item.active');
            if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);

        // Счётчики символов
        function setupCounter(inputId, counterId, max) {
            const input = document.getElementById(inputId);
            const counter = document.getElementById(counterId);
            if (!input || !counter) return;
            const update = () => {
                const len = input.value.length;
                counter.textContent = `${len}/${max}`;
                counter.style.color = len >= max ? '#ff6666' : len >= max * 0.8 ? '#E9AE67' : '#555';
            };
            update();
            input.addEventListener('input', update);
        }
        setupCounter('pb-svc-title', 'pb-cnt-title', 40);
        setupCounter('pb-svc-subtitle', 'pb-cnt-subtitle', 300);
        setupCounter('pb-svc-price', 'pb-cnt-price', 20);

        const onreqBtn = document.getElementById('pb-svc-onreq');
        const priceInput = document.getElementById('pb-svc-price');
        onreqBtn.addEventListener('click', () => {
            priceOnRequest = !priceOnRequest;
            onreqBtn.classList.toggle('active', priceOnRequest);
            priceInput.disabled = priceOnRequest;
            priceInput.style.opacity = priceOnRequest ? '0.3' : '1';
            if (priceOnRequest) priceInput.value = '';
        });

        document.getElementById('pb-svc-save').addEventListener('click', async () => {
            const title = document.getElementById('pb-svc-title').value.trim();
            if (!title) { document.getElementById('pb-svc-title').focus(); return; }
            const subtitle = document.getElementById('pb-svc-subtitle').value.trim();
            const price = priceOnRequest ? null : document.getElementById('pb-svc-price').value.trim();

            try {
                const url = isEdit
                    ? `/api/profile-blocks/services/${editSvc.id}`
                    : '/api/profile-blocks/services';
                const method = isEdit ? 'PATCH' : 'POST';
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUserId,
                        blockId: svcFormContext.block.id,
                        icon: selectedIcon, title, subtitle, price, priceOnRequest
                    })
                });
                const data = await res.json();
                if (data.success) {
                    closeModal('pb-svc-modal');
                    loadServicesGrid(svcFormContext.block, svcFormContext.grid);
                }
            } catch(e) { console.error('pb saveService error', e); }
        });

        openModal('pb-svc-modal');
    }

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ── Запуск ───────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Ждём пока user1.js установит window.userId и window.currentUserId
        setTimeout(init, 400);
    }

})();
