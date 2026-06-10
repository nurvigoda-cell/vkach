/**
 * social.js — Универсальная система подписок/подписчиков
 * Тот же дизайн что и messages.js — шторка снизу, анимация, тёмная тема.
 *
 * Публичное API (глобально):
 *   window.openFriendsModal()    — открыть подписки
 *   window.openFollowersModal()  — открыть подписчиков
 *   window.openPeopleModal()     — открыть людей (поиск)
 */
(function () {
    'use strict';

    // =====================================================================
    // CSS
    // =====================================================================
    function injectCSS() {
        if (document.getElementById('sf-styles')) return;
        var s = document.createElement('style');
        s.id = 'sf-styles';
        s.textContent = [
            /* Оверлей */
            '.sf-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);',
            'backdrop-filter:blur(8px);z-index:10200;justify-content:center;align-items:flex-end;}',
            '.sf-overlay.sf-open{display:flex;}',

            /* Лист */
            '.sf-sheet{background:#1e1e24;border-radius:24px 24px 0 0;',
            'border:1px solid rgba(233,174,103,.18);border-bottom:none;',
            'width:100%;max-width:520px;height:88vh;display:flex;flex-direction:column;',
            'overflow:hidden;animation:sf-up .25s cubic-bezier(.32,.72,0,1);',
            'padding-bottom:env(safe-area-inset-bottom,70px);margin-bottom:70px;}',
            '@keyframes sf-up{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}',

            /* Drag handle */
            '.sf-sheet::before{content:"";display:block;width:40px;height:4px;',
            'background:rgba(255,255,255,.12);border-radius:2px;margin:12px auto 0;flex-shrink:0;}',

            /* Шапка */
            '.sf-hdr{display:flex;align-items:center;padding:12px 18px 14px;',
            'border-bottom:1px solid rgba(233,174,103,.1);flex-shrink:0;gap:10px;}',
            '.sf-hdr-title{flex:1;font-size:16px;font-weight:700;color:#E9AE67;',
            'display:flex;align-items:center;gap:8px;}',

            /* Кнопки */
            '.sf-icon-btn{width:34px;height:34px;border-radius:50%;border:none;',
            'background:rgba(255,255,255,.06);color:#888;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.18s;}',
            '.sf-icon-btn:hover{background:rgba(233,174,103,.15);color:#E9AE67;}',

            /* Счётчик людей */
            '.sf-ppl-bar{display:none;padding:8px 18px 0;flex-shrink:0;',
            'justify-content:space-between;align-items:center;}',
            '.sf-ppl-total{color:#E9AE67;font-size:13px;display:flex;align-items:center;gap:6px;}',
            '.sf-ppl-shown{color:#666;font-size:12px;}',

            /* Поиск */
            '.sf-search-wrap{padding:10px 16px 6px;flex-shrink:0;}',
            '.sf-search-inp{width:100%;padding:9px 14px 9px 38px;',
            'background:rgba(255,255,255,.05);',
            'border:1px solid rgba(233,174,103,.18);border-radius:14px;',
            'color:#fff;font-size:13px;outline:none;box-sizing:border-box;',
            'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'/%3E%3Cpath d=\'m21 21-4.35-4.35\'/%3E%3C/svg%3E");',
            'background-repeat:no-repeat;background-position:12px center;}',
            '.sf-search-inp:focus{border-color:rgba(233,174,103,.5);background-color:rgba(255,255,255,.07);}',

            /* Список */
            '.sf-list{flex:1;overflow-y:auto;padding:8px 12px;}',
            '.sf-empty{text-align:center;color:#555;padding:50px 20px;font-size:13px;line-height:1.6;}',

            /* Строка пользователя */
            '.sf-row{display:flex;align-items:center;gap:12px;padding:10px;',
            'border-radius:14px;transition:background .18s;margin-bottom:2px;}',
            '.sf-row:hover{background:rgba(233,174,103,.06);}',

            /* Аватар */
            '.sf-av{width:48px;height:48px;border-radius:50%;flex-shrink:0;',
            'background:linear-gradient(135deg,#2a2a35,#1e1e28);',
            'border:1.5px solid rgba(233,174,103,.2);',
            'overflow:hidden;display:flex;align-items:center;justify-content:center;',
            'color:#E9AE67;font-size:16px;font-weight:600;cursor:pointer;}',
            '.sf-av img{width:100%;height:100%;object-fit:cover;}',

            /* Инфо */
            '.sf-info{flex:1;min-width:0;cursor:pointer;}',
            '.sf-name{font-size:14px;font-weight:600;color:#f0f0f0;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.sf-login{font-size:12px;color:#666;margin-top:2px;}',

            /* Кнопки действий */
            '.sf-acts{display:flex;align-items:center;gap:6px;flex-shrink:0;}',
            '.sf-btn{padding:7px 12px;border-radius:10px;border:none;font-size:12px;',
            'cursor:pointer;transition:.15s;white-space:nowrap;font-weight:600;',
            'display:flex;align-items:center;gap:5px;}',
            '.sf-btn-msg{background:rgba(233,174,103,.1);color:#E9AE67;',
            'border:1px solid rgba(233,174,103,.2);}',
            '.sf-btn-msg:hover{background:rgba(233,174,103,.2);}',
            '.sf-btn-sub{background:linear-gradient(135deg,#E9AE67,#c4894a);color:#1a1a1a;}',
            '.sf-btn-sub:hover{opacity:.9;}',
            '.sf-btn-unsub{background:rgba(255,80,80,.1);color:#ff9999;',
            'border:1px solid rgba(255,80,80,.2);}',
            '.sf-btn-unsub:hover{background:rgba(255,80,80,.2);}',
            '.sf-btn-ok{background:rgba(255,255,255,.05);color:#555;cursor:default;',
            'border:1px solid rgba(255,255,255,.08);}',

            /* Скроллбар */
            '.sf-list::-webkit-scrollbar{width:3px;}',
            '.sf-list::-webkit-scrollbar-thumb{background:rgba(233,174,103,.15);border-radius:2px;}'
        ].join('');
        document.head.appendChild(s);
    }

    // =====================================================================
    // HTML — три оверлея
    // =====================================================================
    function injectHTML() {
        if (document.getElementById('sf-friends')) return;
        var wrap = document.createElement('div');
        wrap.innerHTML =
            mkOverlay('sf-friends',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><circle cx="15" cy="7" r="4"/><path d="M2 20v-1c0-2.8 3.1-5 7-5M22 20v-1c0-2.8-3.1-5-7-5M9 14c1 0 1.9.3 2.7.7"/></svg> Подписки',
                'sf-fr') +
            mkOverlay('sf-followers',
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg> Подписчики',
                'sf-fl') +
            mkPeopleOverlay();
        document.body.appendChild(wrap);
    }

    function mkOverlay(id, title, pfx) {
        return '<div id="' + id + '" class="sf-overlay">' +
            '<div class="sf-sheet">' +
                '<div class="sf-hdr">' +
                    '<div style="width:34px"></div>' +
                    '<span class="sf-hdr-title">' + title + '</span>' +
                    '<button class="sf-icon-btn" id="' + pfx + '-close">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="sf-search-wrap">' +
                    '<input id="' + pfx + '-search" class="sf-search-inp" placeholder="Поиск...">' +
                '</div>' +
                '<div id="' + pfx + '-list" class="sf-list"></div>' +
            '</div>' +
        '</div>';
    }

    function mkPeopleOverlay() {
        return '<div id="sf-people" class="sf-overlay">' +
            '<div class="sf-sheet">' +
                '<div class="sf-hdr">' +
                    '<div style="width:34px"></div>' +
                    '<span class="sf-hdr-title">' +
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
                        ' Люди' +
                    '</span>' +
                    '<button class="sf-icon-btn" id="sf-pp-close">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div id="sf-pp-bar" class="sf-ppl-bar">' +
                    '<span id="sf-pp-total" class="sf-ppl-total"></span>' +
                    '<span id="sf-pp-shown" class="sf-ppl-shown"></span>' +
                '</div>' +
                '<div class="sf-search-wrap">' +
                    '<input id="sf-pp-search" class="sf-search-inp" placeholder="Поиск по имени, логину или ID...">' +
                '</div>' +
                '<div id="sf-pp-list" class="sf-list"></div>' +
            '</div>' +
        '</div>';
    }

    // =====================================================================
    // СОСТОЯНИЕ
    // =====================================================================
    var allFriends   = [];
    var allFollowers = [];
    var allPeople    = [];
    var totalPeople  = 0;

    // =====================================================================
    // УТИЛИТЫ
    // =====================================================================
    function g(id) { return document.getElementById(id); }

    function show(id) {
        var el = g(id);
        if (el) { el.classList.add('sf-open'); document.body.style.overflow = 'hidden'; }
    }
    function hide(id) {
        var el = g(id);
        if (el) { el.classList.remove('sf-open'); document.body.style.overflow = ''; }
    }

    function esc(t) {
        if (!t) return '';
        var d = document.createElement('div');
        d.textContent = String(t);
        return d.innerHTML;
    }

    function av(u) {
        if (u.avatar && u.avatar !== 'null') return '<img src="' + esc(u.avatar) + '" alt="">';
        return u.name ? esc(String(u.name)[0].toUpperCase()) : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1c0-3.3 3.1-6 7-6s7 2.7 7 6v1"/></svg>';
    }

    function uid() {
        return window.currentUserId || localStorage.getItem('currentUserId');
    }

    function filterList(list, term) {
        if (!term || !term.trim()) return list;
        var t = term.toLowerCase();
        return list.filter(function (u) {
            return (u.name  && u.name.toLowerCase().includes(t))  ||
                   (u.login && u.login.toLowerCase().includes(t)) ||
                   String(u.id).includes(t);
        });
    }

    function apiGet(url) {
        return fetch(url).then(function (r) { return r.json(); });
    }
    function apiPost(url, body) {
        return fetch(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        }).then(function (r) { return r.json(); });
    }

    // =====================================================================
    // СОБЫТИЯ
    // =====================================================================
    function bindEvents() {
        // Кнопки закрытия
        bindClose('sf-fr-close',  'sf-friends');
        bindClose('sf-fl-close',  'sf-followers');
        bindClose('sf-pp-close',  'sf-people');

        // Закрытие по backdrop
        ['sf-friends', 'sf-followers', 'sf-people'].forEach(function (id) {
            var el = g(id);
            if (el) el.addEventListener('click', function (e) { if (e.target.id === id) hide(id); });
        });

        // Поиск
        bindSearch('sf-fr-search', function (t) { renderFriends(filterList(allFriends,   t)); });
        bindSearch('sf-fl-search', function (t) { renderFollowers(filterList(allFollowers, t)); });
        bindSearch('sf-pp-search', function (t) { renderPeople(filterList(allPeople,    t)); });

        // Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { hide('sf-friends'); hide('sf-followers'); hide('sf-people'); }
        });
    }

    function bindClose(btnId, overlayId) {
        var el = g(btnId);
        if (el) el.addEventListener('click', function () { hide(overlayId); });
    }
    function bindSearch(inpId, cb) {
        var el = g(inpId);
        if (el) el.addEventListener('input', function (e) { cb(e.target.value); });
    }

    // =====================================================================
    // ПОДПИСКИ (Friends)
    // =====================================================================
    function openFriendsModal() {
        if (!uid()) { window.location.href = '/login.html'; return; }
        resetSearch('sf-fr-search');
        setList('sf-fr-list', '<div class="sf-empty">Загрузка...</div>');
        show('sf-friends');
        loadFriendsModal(window.userId || uid());
    }

    function loadFriendsModal(targetId) {
        var id = targetId || window.userId || uid();
        if (!id) return Promise.resolve();
        return apiGet('/api/friends/' + id)
            .then(function (d) {
                if (d.success && d.friends) {
                    allFriends = d.friends;
                    window.allFriends = d.friends;
                    renderFriends(allFriends);
                }
            })
            .catch(function () {
                setList('sf-fr-list', '<div class="sf-empty">Ошибка загрузки</div>');
            });
    }

    function renderFriends(list) {
        var isOwn = window.isOwnProfile;
        if (!list.length) { setList('sf-fr-list', '<div class="sf-empty">Нет подписок</div>'); return; }
        setList('sf-fr-list', list.map(function (u) {
            var acts = btn('msg', u.id, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>', 'sf-btn-msg');
            if (isOwn) acts += btn('unsub', u.id, 'Отписаться', 'sf-btn-unsub');
            return row(u, acts);
        }).join(''));
        bindRowEvents('sf-fr-list');
    }

    // =====================================================================
    // ПОДПИСЧИКИ (Followers)
    // =====================================================================
    function openFollowersModal() {
        if (!uid()) { window.location.href = '/login.html'; return; }
        resetSearch('sf-fl-search');
        setList('sf-fl-list', '<div class="sf-empty">Загрузка...</div>');
        show('sf-followers');
        loadFollowersModal();
    }

    function loadFollowersModal() {
        var targetId = window.userId || uid();
        if (!targetId) return Promise.resolve();

        // Загружаем свои подписки для определения статуса
        var myId = uid();
        var friendsP = myId
            ? apiGet('/api/friends/' + myId).then(function (d) {
                if (d.success && d.friends) { window.allFriends = d.friends; }
              })
            : Promise.resolve();

        return friendsP
            .then(function () { return apiGet('/api/followers/' + targetId); })
            .then(function (d) {
                if (d.success && d.followers) {
                    allFollowers = d.followers;
                    window.allFollowers = d.followers;
                    renderFollowers(allFollowers);
                }
            })
            .catch(function () {
                setList('sf-fl-list', '<div class="sf-empty">Ошибка загрузки</div>');
            });
    }

    function renderFollowers(list) {
        var myId = uid();
        var friendIds = (window.allFriends || []).map(function (f) { return String(f.id); });

        if (!list.length) { setList('sf-fl-list', '<div class="sf-empty">Нет подписчиков</div>'); return; }

        setList('sf-fl-list', list.map(function (u) {
            var acts = '';
            if (myId && String(myId) !== String(u.id)) {
                acts += btn('msg', u.id, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>', 'sf-btn-msg');
                if (friendIds.indexOf(String(u.id)) >= 0) {
                    acts += '<button class="sf-btn sf-btn-ok" disabled>✅ Подписан</button>';
                } else {
                    acts += btn('sub-back', u.id, '🔄 В ответ', 'sf-btn-sub');
                }
            }
            return row(u, acts);
        }).join(''));
        bindRowEvents('sf-fl-list');
    }

    // =====================================================================
    // ЛЮДИ (People)
    // =====================================================================
    function openPeopleModal() {
        if (!uid()) { window.location.href = '/login.html'; return; }
        resetSearch('sf-pp-search');
        setList('sf-pp-list', '<div class="sf-empty">Загрузка...</div>');
        show('sf-people');
        loadPeopleModal();
    }

    function loadPeopleModal() {
        var myId = uid();
        if (!myId) return Promise.resolve();
        return Promise.all([
            apiGet('/api/total-users'),
            apiGet('/api/users-except-friends/' + myId)
        ]).then(function (res) {
            totalPeople = res[0].success ? res[0].total : 0;
            if (res[1].success && res[1].users) {
                allPeople = res[1].users;
                window.allUsers = allPeople;
                var bar = g('sf-pp-bar');
                if (bar) {
                    bar.style.display = 'flex';
                    g('sf-pp-total').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><circle cx="15" cy="7" r="4"/><path d="M2 20v-1c0-2.8 3.1-5 7-5M22 20v-1c0-2.8-3.1-5-7-5"/></svg> В качалке: ' + totalPeople;
                    g('sf-pp-shown').textContent  = 'Показано: ' + allPeople.length;
                }
                renderPeople(allPeople);
            }
        }).catch(function () {
            setList('sf-pp-list', '<div class="sf-empty">Ошибка загрузки</div>');
        });
    }

    function renderPeople(list) {
        var shown = g('sf-pp-shown');
        if (shown) shown.textContent = 'Показано: ' + list.length;
        if (!list.length) { setList('sf-pp-list', '<div class="sf-empty">📭 Нет пользователей</div>'); return; }
        setList('sf-pp-list', list.map(function (u) {
            return row(u, btn('sub', u.id, 'Подписаться', 'sf-btn-sub'));
        }).join(''));
        bindRowEvents('sf-pp-list');
    }

    // =====================================================================
    // ОБЩИЕ ШАБЛОНЫ
    // =====================================================================
    function row(u, actions) {
        return '<div class="sf-row">' +
            '<div class="sf-av" data-goto="' + u.id + '">' + av(u) + '</div>' +
            '<div class="sf-info" data-goto="' + u.id + '">' +
                '<div class="sf-name">' + esc(u.name || 'Пользователь') + '</div>' +
                '<div class="sf-login">@' + esc(u.login || u.name || '') + '</div>' +
            '</div>' +
            '<div class="sf-acts">' + actions + '</div>' +
        '</div>';
    }

    function btn(action, id, label, cls) {
        return '<button class="sf-btn ' + cls + '" data-action="' + action + '" data-id="' + id + '">' + label + '</button>';
    }

    function setList(id, html) {
        var el = g(id);
        if (el) el.innerHTML = html;
    }

    function resetSearch(id) {
        var el = g(id);
        if (el) el.value = '';
    }

    // =====================================================================
    // ОБРАБОТЧИКИ КНОПОК В СТРОКЕ
    // =====================================================================
    function bindRowEvents(listId) {
        var container = g(listId);
        if (!container) return;

        // Переход на профиль
        container.querySelectorAll('[data-goto]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                if (e.target.closest('[data-action]')) return; // не переходим при клике на кнопку
                window.location.href = '/user/' + el.getAttribute('data-goto');
            });
        });

        // Кнопки действий
        container.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var action = btn.getAttribute('data-action');
                var id     = btn.getAttribute('data-id');

                if (action === 'msg') {
                    if (typeof window.openChatWithUser === 'function') window.openChatWithUser(id);
                    else if (typeof window.MessagingSystem === 'object') window.MessagingSystem.openChat(id);
                } else if (action === 'unsub') {
                    if (typeof window.unsubscribeFriend === 'function') window.unsubscribeFriend(id);
                } else if (action === 'sub' || action === 'sub-back') {
                    if (typeof window.subscribeFromPeopleModal === 'function') window.subscribeFromPeopleModal(id);
                }
            });
        });
    }

    // =====================================================================
    // INIT
    // =====================================================================
    function init() {
        injectCSS();
        injectHTML();
        bindEvents();
    }

    // =====================================================================
    // ПУБЛИЧНОЕ API
    // =====================================================================
    window.openFriendsModal   = openFriendsModal;
    window.openFollowersModal = openFollowersModal;
    window.openPeopleModal    = openPeopleModal;
    window.loadFriendsModal   = loadFriendsModal;
    window.loadFollowersModal = loadFollowersModal;
    window.loadPeopleModal    = loadPeopleModal;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
