/**
 * messages.js v2 — Расширенная система сообщений
 * + Кликабельные ссылки
 * + Карточки протоколов
 * + Фото в чате (галерея + камера)
 * + Ответы на сообщения
 */
(function () {
    'use strict';

    var UNREAD_POLL = 5000;
    var CHAT_POLL   = 3000;

    var currentUserId   = null;
    var chatPartnerId   = null;
    var chatPartnerName = '';
    var allDialogs      = [];
    var unreadCount     = 0;
    var lastUnread      = 0;
    var unreadTimer     = null;
    var chatTimer       = null;
    var soundEnabled    = true;
    var audioCtx        = null;

    // Ответ на сообщение
    var replyTo = null; // { id, text, imageUrl }

    // Новые сообщения
    var lastMessageId  = 0;  // последний известный ID
    var newMsgCount    = 0;  // кол-во новых пока не проскроллил

    // Кэш preview протоколов
    var protocolCache = {};

    // =====================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // =====================================================================
    function init() {
        currentUserId = localStorage.getItem('currentUserId');
        soundEnabled  = localStorage.getItem('messagesSoundEnabled') !== 'false';

        injectCSS();
        injectHTML();
        bindEvents();

        if (currentUserId) {
            loadUnreadCount();
            unreadTimer = setInterval(loadUnreadCount, UNREAD_POLL);
        }

        var navBtn = document.getElementById('navMessagesBottom');
        if (navBtn) {
            var fresh = navBtn.cloneNode(true);
            navBtn.parentNode.replaceChild(fresh, navBtn);
            fresh.style.position = 'relative';
            fresh.addEventListener('click', openDialogs);
        }
    }

    // =====================================================================
    // CSS
    // =====================================================================
    function injectCSS() {
        if (document.getElementById('ms-styles')) return;
        var s = document.createElement('style');
        s.id = 'ms-styles';
        s.textContent = [
            /* ── Оверлей (фон) ── */
            '.ms-overlay{display:none;position:fixed;inset:0;',
            'background:rgba(0,0,0,.85);backdrop-filter:blur(8px);',
            'touch-action:pan-y;overscroll-behavior:none;overflow-x:hidden;',
            'z-index:10200;justify-content:center;align-items:flex-end;}',
            '.ms-overlay.ms-open{display:flex;}',

            /* ── Лист (как frames-modal-sheet) ── */
            '.ms-sheet{background:#1e1e24;touch-action:pan-y;overflow-x:hidden;',
            'border-radius:24px 24px 0 0;border:1px solid rgba(233,174,103,.18);',
            'border-bottom:none;',
            'width:100%;max-width:520px;height:88vh;display:flex;flex-direction:column;',
            'overflow:hidden;animation:ms-up .25s cubic-bezier(.32,.72,0,1);}',
            '@keyframes ms-up{from{transform:translateY(60px);opacity:0}to{transform:none;opacity:1}}',

            /* Drag-handle */
            '.ms-sheet::before{content:"";display:block;width:40px;height:4px;',
            'background:rgba(255,255,255,.12);border-radius:2px;',
            'margin:12px auto 0;flex-shrink:0;}',

            /* ── Шапка ── */
            '.ms-hdr{display:flex;align-items:center;gap:10px;padding:12px 18px 14px;',
            'border-bottom:1px solid rgba(233,174,103,.1);flex-shrink:0;}',
            '.ms-hdr-title{flex:1;font-size:16px;font-weight:700;color:#E9AE67;',
            'display:flex;align-items:center;gap:8px;}',

            /* ── Кнопки-иконки ── */
            '.ms-icon-btn{width:34px;height:34px;border-radius:50%;border:none;',
            'background:rgba(255,255,255,.06);color:#888;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;transition:.18s;flex-shrink:0;}',
            '.ms-icon-btn:hover{background:rgba(233,174,103,.15);color:#E9AE67;}',
            '.ms-back{color:#E9AE67;}',
            '.ms-back:hover{background:rgba(233,174,103,.18);}',

            /* ── Собеседник в шапке чата ── */
            '.ms-partner{display:flex;align-items:center;gap:10px;flex:1;}',
            '.ms-p-av{width:36px;height:36px;border-radius:50%;',
            'background:linear-gradient(135deg,#2a2a35,#1e1e28);',
            'border:1.5px solid rgba(233,174,103,.25);',
            'overflow:hidden;display:flex;align-items:center;justify-content:center;',
            'color:#E9AE67;flex-shrink:0;}',
            '.ms-p-av img{width:100%;height:100%;object-fit:cover;}',
            '.ms-p-name{font-size:14px;font-weight:600;color:#f0f0f0;}',

            /* ── Поиск ── */
            '.ms-search-wrap{padding:10px 16px 6px;flex-shrink:0;}',
            '.ms-search-inp{width:100%;padding:9px 14px 9px 38px;',
            'background:rgba(255,255,255,.05);',
            'border:1px solid rgba(233,174,103,.18);border-radius:14px;',
            'color:#fff;font-size:13px;outline:none;box-sizing:border-box;',
            'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\'%3E%3Ccircle cx=\'11\' cy=\'11\' r=\'8\'/%3E%3Cpath d=\'m21 21-4.35-4.35\'/%3E%3C/svg%3E");',
            'background-repeat:no-repeat;background-position:12px center;}',
            '.ms-search-inp:focus{border-color:rgba(233,174,103,.5);background-color:rgba(255,255,255,.07);}',

            /* ── Список диалогов ── */
            '.ms-list{flex:1;overflow-y:auto;padding:8px 12px;}',
            '.ms-empty{text-align:center;color:#555;padding:50px 20px;font-size:13px;line-height:1.6;}',

            '.ms-dialog{display:flex;align-items:center;gap:12px;padding:10px 10px;',
            'border-radius:14px;cursor:pointer;transition:background .18s;margin-bottom:2px;}',
            '.ms-dialog:hover{background:rgba(233,174,103,.07);}',
            '.ms-dialog.ms-unread{background:rgba(233,174,103,.05);}',
            '.ms-dialog.ms-unread:hover{background:rgba(233,174,103,.1);}',

            '.ms-d-av{width:48px;height:48px;border-radius:50%;',
            'background:linear-gradient(135deg,#2a2a35,#1e1e28);',
            'border:1.5px solid rgba(233,174,103,.2);',
            'overflow:hidden;display:flex;align-items:center;justify-content:center;',
            'color:#E9AE67;flex-shrink:0;}',
            '.ms-d-av img{width:100%;height:100%;object-fit:cover;}',
            '.ms-d-body{flex:1;min-width:0;}',
            '.ms-d-name{font-size:14px;font-weight:600;color:#f0f0f0;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.ms-d-prev{font-size:12px;color:#666;margin-top:2px;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.ms-d-meta{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;}',
            '.ms-d-time{font-size:10px;color:#555;}',
            '.ms-d-badge{background:linear-gradient(135deg,#E9AE67,#c4894a);color:#1a1a1a;',
            'font-size:10px;font-weight:800;min-width:18px;height:18px;border-radius:9px;',
            'display:flex;align-items:center;justify-content:center;padding:0 5px;}',

            '.ms-d-del{background:none;border:none;color:#3a3a4a;',
            'cursor:pointer;padding:5px;border-radius:8px;flex-shrink:0;transition:.18s;',
            'display:flex;align-items:center;justify-content:center;}',
            '.ms-d-del:hover{color:#ff6666;background:rgba(255,100,100,.1);}',

            /* ── Сообщения ── */
            '.ms-messages{flex:1;overflow-y:auto;overflow-x:hidden;padding:14px 14px 8px;touch-action:pan-y;',
            'display:flex;flex-direction:column;gap:6px;}',

            '.ms-msg{max-width:78%;padding:9px 13px;border-radius:18px;',
            'font-size:13px;line-height:1.5;word-break:break-word;position:relative;}',
            '.ms-msg.ms-out{align-self:flex-end;margin-left:22%;',
            'background:linear-gradient(135deg,#E9AE67,#c4894a);',
            'color:#1a1a1a;border-bottom-right-radius:5px;}',
            '.ms-msg.ms-in{align-self:flex-start;',
            'background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.06);',
            'color:#f0f0f0;border-bottom-left-radius:5px;}',
            '.ms-msg-time{font-size:10px;opacity:.45;margin-top:3px;text-align:right;}',
            '.ms-msg.ms-in .ms-msg-time{text-align:left;}',

            '.ms-msg-del{position:absolute;top:-8px;right:4px;',
            'background:#c0392b;color:#fff;border:none;border-radius:50%;',
            'width:22px;height:22px;cursor:pointer;opacity:0;transition:opacity .18s;',
            'display:flex;align-items:center;justify-content:center;}',
            '.ms-msg:hover .ms-msg-del,.ms-msg:active .ms-msg-del{opacity:1;}',
            '@media(hover:none){.ms-msg-del{opacity:0.5;}}',

            '.ms-msg-reply-btn{position:absolute;top:-8px;left:4px;',
            'background:#2a2a35;border:1px solid rgba(233,174,103,.3);border-radius:50%;',
            'width:22px;height:22px;cursor:pointer;opacity:0;transition:opacity .18s;',
            'display:flex;align-items:center;justify-content:center;}',
            '.ms-msg:hover .ms-msg-reply-btn,.ms-msg:active .ms-msg-reply-btn{opacity:1;}',
            '@media(hover:none){.ms-msg-reply-btn{opacity:0.5;}}',
            '.ms-msg.ms-out .ms-msg-reply-btn{left:auto;right:-28px;background:rgba(0,0,0,.2);}',

            /* Блок ответа внутри сообщения */
            '.ms-reply-block{border-left:3px solid rgba(233,174,103,.5);padding:4px 8px;',
            'margin-bottom:6px;border-radius:0 8px 8px 0;background:rgba(255,255,255,.05);cursor:pointer;}',
            '.ms-msg.ms-out .ms-reply-block{border-left-color:rgba(26,26,26,.3);background:rgba(0,0,0,.12);}',
            '.ms-reply-block-text{font-size:11px;opacity:.7;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;}',

            /* Панель ответа в input */
            '.ms-reply-bar{display:none;flex-direction:row;align-items:center;gap:8px;',
            'padding:7px 14px;background:rgba(233,174,103,.05);',
            'border-top:1px solid rgba(233,174,103,.12);flex-shrink:0;}',
            '.ms-reply-bar.ms-visible{display:flex;}',
            '.ms-reply-bar-text{flex:1;font-size:12px;color:#bbb;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.ms-reply-bar-cancel{background:none;border:none;color:#666;cursor:pointer;',
            'padding:0 4px;display:flex;align-items:center;}',
            '.ms-reply-bar-cancel:hover{color:#ff6666;}',

            /* Ссылки */
            '.ms-link{color:#E9AE67;text-decoration:underline;word-break:break-all;}',
            '.ms-msg.ms-out .ms-link{color:#1a1a1a;opacity:.75;}',

            /* Карточка протокола */
            '.ms-protocol-card{background:rgba(233,174,103,.08);border:1px solid rgba(233,174,103,.25);',
            'border-radius:12px;padding:10px 12px;margin-top:4px;cursor:pointer;',
            'transition:background .2s;text-decoration:none;display:block;}',
            '.ms-protocol-card:hover{background:rgba(233,174,103,.15);}',
            '.ms-msg.ms-out .ms-protocol-card{background:rgba(0,0,0,.15);border-color:rgba(0,0,0,.25);}',
            '.ms-pc-header{display:flex;align-items:center;gap:8px;margin-bottom:4px;}',
            '.ms-pc-icon{display:flex;align-items:center;}',
            '.ms-pc-name{font-size:13px;font-weight:600;color:#E9AE67;',
            'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.ms-msg.ms-out .ms-pc-name{color:#1a1a1a;}',
            '.ms-pc-date{font-size:11px;color:#888;margin-bottom:6px;}',
            '.ms-msg.ms-out .ms-pc-date{color:rgba(26,26,26,.55);}',
            '.ms-pc-btn{display:inline-block;font-size:11px;font-weight:600;color:#E9AE67;opacity:.8;}',
            '.ms-msg.ms-out .ms-pc-btn{color:#1a1a1a;}',

            /* Фото в сообщении */
            '.ms-msg-img{max-width:220px;max-height:200px;border-radius:12px;',
            'display:block;cursor:zoom-in;margin-top:4px;object-fit:cover;}',
            '.ms-msg-img-only{padding:4px;background:none!important;border:none!important;}',

            /* Лайтбокс */
            '#ms-lightbox{display:none;position:fixed;inset:0;z-index:99999;',
            'background:rgba(0,0,0,.96);align-items:center;justify-content:center;cursor:zoom-out;}',
            '#ms-lightbox.open{display:flex;}',
            '#ms-lightbox img{max-width:95vw;max-height:92vh;border-radius:10px;object-fit:contain;}',
            '#ms-lightbox-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);',
            'border:none;border-radius:50%;width:36px;height:36px;',
            'color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;}',

            /* Кнопка прикрепить */
            '.ms-attach-btn{width:38px;height:38px;border-radius:50%;flex-shrink:0;border:none;',
            'background:rgba(255,255,255,.06);color:#666;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;transition:.18s;}',
            '.ms-attach-btn:hover{background:rgba(233,174,103,.15);color:#E9AE67;}',

            /* Превью фото */
            '.ms-img-preview-bar{display:none;align-items:center;gap:10px;',
            'padding:8px 14px;border-top:1px solid rgba(233,174,103,.12);flex-shrink:0;}',
            '.ms-img-preview-bar.ms-visible{display:flex;}',
            '.ms-img-preview-bar img{width:50px;height:50px;border-radius:10px;object-fit:cover;',
            'border:1px solid rgba(233,174,103,.2);}',
            '.ms-img-preview-bar button{background:none;border:none;color:#666;cursor:pointer;',
            'display:flex;align-items:center;}',
            '.ms-img-preview-bar button:hover{color:#ff6666;}',

            /* Поле ввода */
            '.ms-input-row{display:flex;align-items:flex-end;gap:8px;',
            'padding:10px 14px 20px;border-top:1px solid rgba(233,174,103,.08);flex-shrink:0;}',
            '.ms-textarea{flex:1;min-height:38px;max-height:100px;',
            'padding:9px 14px;resize:none;',
            'background:rgba(255,255,255,.06);',
            'border:1px solid rgba(233,174,103,.2);border-radius:16px;',
            'color:#f0f0f0;font-size:13px;outline:none;font-family:inherit;line-height:1.4;}',
            '.ms-textarea:focus{border-color:rgba(233,174,103,.5);}',
            '.ms-textarea::placeholder{color:#555;}',

            '.ms-send-btn{width:40px;height:40px;border-radius:50%;flex-shrink:0;border:none;',
            'background:linear-gradient(135deg,#E9AE67,#c4894a);',
            'color:#1a1a1a;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;transition:.18s;}',
            '.ms-send-btn:hover:not(:disabled){transform:scale(1.08);',
            'box-shadow:0 4px 12px rgba(233,174,103,.3);}',
            '.ms-send-btn:disabled{opacity:.3;cursor:default;transform:none;}',

            /* Бейдж непрочитанных в навигации */
            '.ms-nav-badge{position:absolute!important;top:-6px!important;right:-6px!important;',
            'background:linear-gradient(135deg,#E9AE67,#c4894a);color:#1a1a1a;',
            'font-size:10px;font-weight:800;min-width:17px;height:17px;border-radius:9px;',
            'display:flex!important;align-items:center;justify-content:center;',
            'padding:0 3px;border:1.5px solid #1e1e24;pointer-events:none;}',

            /* Скроллбары */
            '.ms-list::-webkit-scrollbar,.ms-messages::-webkit-scrollbar{width:3px;}',
            '.ms-list::-webkit-scrollbar-thumb,.ms-messages::-webkit-scrollbar-thumb{',
            'background:rgba(233,174,103,.15);border-radius:2px;}',

            /* Кнопка новых сообщений */
            '#ms-new-msg-btn{display:none;position:absolute;bottom:80px;left:50%;transform:translateX(-50%);',
            'background:linear-gradient(135deg,#E9AE67,#c4894a);color:#1a1a1a;border:none;border-radius:20px;',
            'padding:7px 18px;font-size:12px;font-weight:700;cursor:pointer;',
            'box-shadow:0 4px 16px rgba(233,174,103,.35);z-index:10;white-space:nowrap;',
            'display:flex;align-items:center;gap:6px;}',
            '#ms-new-msg-btn.visible{display:flex;}',

            /* Счётчик новых в шапке */
            '.ms-new-badge{background:linear-gradient(135deg,#E9AE67,#c4894a);color:#1a1a1a;',
            'font-size:10px;font-weight:800;min-width:18px;height:18px;border-radius:9px;',
            'display:inline-flex;align-items:center;justify-content:center;',
            'padding:0 4px;margin-left:6px;animation:ms-pulse 1.2s infinite;}',
            '@keyframes ms-pulse{0%,100%{opacity:1}50%{opacity:0.45}}'
        ].join('');
        document.head.appendChild(s);
    }

    // =====================================================================
    // HTML
    // =====================================================================
    function injectHTML() {
        if (document.getElementById('ms-dialogs')) return;

        var div = document.createElement('div');
        div.innerHTML =
            '<div id="ms-dialogs" class="ms-overlay">' +
                '<div class="ms-sheet">' +
                    '<div class="ms-hdr">' +
                        '<span class="ms-hdr-title">' +
                            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
                            'Сообщения' +
                        '</span>' +
                        '<button class="ms-icon-btn" id="ms-dlg-close">' +
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="ms-search-wrap">' +
                        '<input id="ms-search" class="ms-search-inp" placeholder="Поиск диалога...">' +
                    '</div>' +
                    '<div id="ms-list" class="ms-list"></div>' +
                '</div>' +
            '</div>' +

            '<div id="ms-chat" class="ms-overlay">' +
                '<div class="ms-sheet">' +
                    '<div class="ms-hdr">' +
                        '<button class="ms-icon-btn ms-back" id="ms-back">' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
                        '</button>' +
                        '<div class="ms-partner">' +
                            '<div class="ms-p-av" id="ms-p-av">' +
                                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1c0-3.314 3.134-6 7-6s7 2.686 7 6v1"/></svg>' +
                            '</div>' +
                            '<span class="ms-p-name" id="ms-p-name"></span>' +
                        '</div>' +
                        '<button class="ms-icon-btn" id="ms-chat-close">' +
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div style="position:relative;flex:1;display:flex;flex-direction:column;overflow:hidden;">' +
                    '<div id="ms-messages" class="ms-messages"></div>' +
                    '<button id="ms-new-msg-btn">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>' +
                        'новые сообщения' +
                    '</button>' +
                '</div>' +
                    '<div class="ms-reply-bar" id="ms-reply-bar">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><path d="M13 13l8 8M21 13v8h-8"/></svg>' +
                        '<span class="ms-reply-bar-text" id="ms-reply-bar-text"></span>' +
                        '<button class="ms-reply-bar-cancel" id="ms-reply-cancel">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="ms-img-preview-bar" id="ms-img-preview-bar">' +
                        '<img id="ms-img-preview" src="" alt="">' +
                        '<button id="ms-img-preview-cancel">' +
                            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</div>' +
                    '<div class="ms-input-row">' +
                        '<button class="ms-attach-btn" id="ms-attach-btn" title="Прикрепить фото">' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' +
                        '</button>' +
                        '<input type="file" id="ms-file-input" accept="image/*" style="display:none">' +
                        '<textarea id="ms-textarea" class="ms-textarea" placeholder="Написать..." rows="1" maxlength="2000"></textarea>' +
                        '<button id="ms-send" class="ms-send-btn" disabled>' +
                            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div id="ms-lightbox">' +
                '<button id="ms-lightbox-close">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                '</button>' +
                '<img id="ms-lightbox-img" src="" alt="">' +
            '</div>';

        document.body.appendChild(div);
    }

    // =====================================================================
    // СОБЫТИЯ
    // =====================================================================
    function bindEvents() {
        on('ms-dlg-close', 'click', closeAll);
        on('ms-dialogs',   'click', function(e) { if (e.target.id === 'ms-dialogs') closeAll(); });
        on('ms-back',      'click', function() { stopChat(); hide('ms-chat'); cancelReply(); cancelImagePreview(); openDialogs(); });
        on('ms-chat-close','click', function() { stopChat(); closeAll(); cancelReply(); cancelImagePreview(); });
        on('ms-chat',      'click', function(e) { if (e.target.id === 'ms-chat') { stopChat(); closeAll(); cancelReply(); cancelImagePreview(); } });

        on('ms-search', 'input', function(e) { filterDialogs(e.target.value); });

        on('ms-send', 'click', sendMessage);
        on('ms-textarea', 'keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        on('ms-textarea', 'input', function() {
            var ta = g('ms-textarea');
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
            updateSendBtn();
        });

        // Отмена ответа
        on('ms-reply-cancel', 'click', cancelReply);
        on('ms-new-msg-btn', 'click', function() {
            var box = g('ms-messages');
            if (box) box.scrollTop = box.scrollHeight;
            hideNewMsgBtn();
        });

        // Прикрепить фото
        on('ms-attach-btn', 'click', function() {
            var fi = g('ms-file-input');
            // Камера или галерея — на мобильном показывает выбор
            fi.removeAttribute('capture');
            fi.click();
        });

        on('ms-file-input', 'change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) { alert('Файл слишком большой. Максимум 20 МБ.'); return; }
            compressAndPreview(file);
            e.target.value = '';
        });

        on('ms-img-preview-cancel', 'click', cancelImagePreview);

        // Лайтбокс
        on('ms-lightbox', 'click', closeLightbox);
        on('ms-lightbox-close', 'click', closeLightbox);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (g('ms-lightbox').classList.contains('open')) { closeLightbox(); return; }
                stopChat(); closeAll(); cancelReply(); cancelImagePreview();
            }
        });
    }

    // =====================================================================
    // РЕНДЕР СООБЩЕНИЯ
    // =====================================================================

    // Кликабельные ссылки + карточка протокола
    function renderMessageText(text, isOut) {
        if (!text) return '';
        // Ищем все URL
        var urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
        var parts = [];
        var lastIndex = 0;
        var match;

        while ((match = urlRegex.exec(text)) !== null) {
            // Текст до ссылки
            if (match.index > lastIndex) {
                parts.push(esc(text.slice(lastIndex, match.index)));
            }
            var url = match[1];
            // Проверяем — ссылка на протокол?
            var tokenMatch = url.match(/program\.html\?token=([a-zA-Z0-9_\-]+)/);
            if (tokenMatch) {
                var token = tokenMatch[1];
                var cacheKey = 'proto_' + token;
                // Если данные уже в кэше — сразу подставляем
                var cached = protocolCache[token];
                var cachedName = cached ? (cached.name || 'Протокол тренировки') : 'Протокол тренировки';
                var cachedDate = '';
                if (cached) {
                    var ds = cached.date || cached.updatedAt || cached.createdAt;
                    var dd = ds ? new Date(ds) : null;
                    cachedDate = dd && !isNaN(dd) ? '📅 ' + dd.toLocaleDateString('ru-RU') : '';
                }
                parts.push('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" class="ms-protocol-card" id="' + esc(cacheKey) + '">' +
                    '<div class="ms-pc-header"><span class="ms-pc-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M6 8h12M6 16h12"/><rect x="2" y="6" width="4" height="4" rx="1"/><rect x="18" y="6" width="4" height="4" rx="1"/><rect x="2" y="14" width="4" height="4" rx="1"/><rect x="18" y="14" width="4" height="4" rx="1"/></svg></span>' +
                    '<span class="ms-pc-name">' + esc(cachedName) + '</span></div>' +
                    '<span class="ms-pc-btn">Открыть →</span>' +
                    '</a>');
                // Загружаем если ещё нет в кэше
                if (!cached) loadProtocolPreview(token, cacheKey);
            } else {
                parts.push('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" class="ms-link">' + esc(url) + '</a>');
            }
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(esc(text.slice(lastIndex)));
        }

        return parts.join('').replace(/\n/g, '<br>');
    }

    function loadProtocolPreview(token, cacheKey) {
        if (protocolCache[token]) {
            updateProtocolCard(cacheKey, protocolCache[token]);
            return;
        }
        get('/api/protocol-preview/' + token)
            .then(function(r) {
                if (r.success) {
                    protocolCache[token] = r;
                    updateProtocolCard(cacheKey, r);
                } else {
                    var el = document.getElementById(cacheKey + '-date');
                    if (el) el.textContent = '';
                }
            })
            .catch(function() {});
    }

    function updateProtocolCard(cacheKey, data) {
        var card = document.getElementById(cacheKey);
        if (card) {
            var nameEl = card.querySelector('.ms-pc-name');
            if (nameEl) nameEl.textContent = data.name || 'Протокол тренировки';
        }
        var dateEl = document.getElementById(cacheKey + '-date');
        if (dateEl) {
            var dateStr = data.date || data.updatedAt || data.createdAt;
            var d = dateStr ? new Date(dateStr) : null;
            dateEl.textContent = d && !isNaN(d) ? '📅 ' + d.toLocaleDateString('ru-RU') : '';
        }
    }

    function renderMessage(m, isOut) {
        var cls = 'ms-msg ' + (isOut ? 'ms-out' : 'ms-in');
        var html = '';

        // Блок ответа
        if (m.reply_to_message_id && (m.reply_message || m.reply_image_url)) {
            var replyText = m.reply_image_url ? 'Фото' : (m.reply_message || '');
            html += '<div class="ms-reply-block" data-target="' + m.reply_to_message_id + '" onclick="document.getElementById(\'ms-msg-\'+' + m.reply_to_message_id + ')&&document.getElementById(\'ms-msg-\'+' + m.reply_to_message_id + ').scrollIntoView({behavior:\'smooth\',block:\'center\'})">' +
                '<div class="ms-reply-block-text">↩ ' + esc(replyText.substring(0, 60)) + '</div>' +
                '</div>';
        }

        // Изображение
        if (m.image_url) {
            html += '<img class="ms-msg-img" src="' + esc(m.image_url) + '" alt="фото" onclick="msOpenLightbox(\'' + esc(m.image_url) + '\')">';
        }

        // Текст
        if (m.message) {
            html += '<div class="ms-msg-body">' + renderMessageText(m.message, isOut) + '</div>';
        }

        // Время
        html += '<div class="ms-msg-time">' + fmtTime(m.created_at) + '</div>';

        // Кнопки
        html += '<button class="ms-msg-reply-btn" data-id="' + m.id + '" data-text="' + esc((m.message||'').substring(0,60)) + '" data-img="' + esc(m.image_url||'') + '" title="Ответить"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E9AE67" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/><path d="M13 13l8 8M21 13v8h-8"/></svg></button>';
        if (isOut) {
            html += '<button class="ms-msg-del" data-id="' + m.id + '" title="Удалить"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
        }

        return '<div class="' + cls + '" id="ms-msg-' + m.id + '" data-id="' + m.id + '">' + html + '</div>';
    }

    // =====================================================================
    // ДИАЛОГИ
    // =====================================================================
    function openDialogs() {
        if (!currentUserId) { window.location.href = '/login.html'; return; }
        show('ms-dialogs');
        loadDialogs();
    }

    function closeAll() {
        hide('ms-dialogs');
        hide('ms-chat');
    }

    function loadDialogs() {
        var list = g('ms-list');
        list.innerHTML = '<div class="ms-empty">Загрузка...</div>';
        get('/api/dialogs/' + currentUserId)
            .then(function(r) {
                allDialogs = r.dialogs || [];
                renderDialogs(allDialogs);
            })
            .catch(function() {
                list.innerHTML = '<div class="ms-empty">Ошибка загрузки</div>';
            });
    }

    function formatDialogPreview(lastMessage) {
        if (!lastMessage) return '';
        // Проверяем — содержит ли ссылку на протокол
        var tokenMatch = lastMessage.match(/program\.html\?token=([a-zA-Z0-9_\-]+)/);
        if (tokenMatch) return 'Протокол тренировки';
        // Обрезаем длинный URL
        var urlRegex = /(https?:\/\/[^\s]+)/gi;
        var preview = lastMessage.replace(urlRegex, function(url) {
            return url.length > 40 ? url.substring(0, 37) + '...' : url;
        });
        return preview.substring(0, 60);
    }

    function renderDialogs(list) {
        var el = g('ms-list');
        if (!list.length) {
            el.innerHTML = '<div class="ms-empty">Нет сообщений</div>';
            return;
        }

        el.innerHTML = list.map(function(d) {
            var av = (d.avatar && d.avatar !== 'null')
                ? '<img src="' + esc(d.avatar) + '" alt="">'
                : (d.name ? esc(d.name[0].toUpperCase()) : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 20v-1c0-3.314 3.134-6 7-6s7 2.686 7 6v1"/></svg>');
            var unread = d.unread_count > 0;
            var preview = formatDialogPreview(d.last_message);
            return '<div class="ms-dialog' + (unread ? ' ms-unread' : '') + '" data-uid="' + d.user_id + '">' +
                '<div class="ms-d-av">' + av + '</div>' +
                '<div class="ms-d-body">' +
                    '<div class="ms-d-name">' + esc(d.name || 'Пользователь') + '</div>' +
                    '<div class="ms-d-prev">' + esc(preview) + '</div>' +
                '</div>' +
                '<div class="ms-d-meta">' +
                    '<span class="ms-d-time">' + fmtTime(d.last_message_time) + '</span>' +
                    (unread ? '<span class="ms-d-badge">' + (d.unread_count > 99 ? '99+' : d.unread_count) + '</span>' : '') +
                '</div>' +
                '<button class="ms-d-del" data-uid="' + d.user_id + '" title="Удалить">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>' +
                '</button>' +
            '</div>';
        }).join('');

        el.querySelectorAll('.ms-dialog').forEach(function(row) {
            row.addEventListener('click', function(e) {
                if (e.target.classList.contains('ms-d-del')) return;
                var uid = row.dataset.uid;
                get('/api/user/' + uid)
                    .then(function(r) {
                        openChat(uid, r.success ? r.user.name : 'Пользователь',
                                      r.success ? r.user.avatar : null);
                    })
                    .catch(function() { openChat(uid, 'Пользователь', null); });
            });
        });

        el.querySelectorAll('.ms-d-del').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!confirm('Удалить всю переписку?')) return;
                post('/api/delete-dialog', { userId: currentUserId, otherUserId: btn.dataset.uid })
                    .then(function() { loadDialogs(); loadUnreadCount(); });
            });
        });
    }

    function filterDialogs(term) {
        if (!term.trim()) { renderDialogs(allDialogs); return; }
        var t = term.toLowerCase();
        renderDialogs(allDialogs.filter(function(d) {
            return (d.name  && d.name.toLowerCase().includes(t)) ||
                   (d.login && d.login.toLowerCase().includes(t));
        }));
    }

    // =====================================================================
    // ЧАТ
    // =====================================================================
    function openChat(partnerId, name, avatar) {
        chatPartnerId   = partnerId;
        chatPartnerName = name || 'Пользователь';

        g('ms-p-name').textContent = chatPartnerName;
        var avEl = g('ms-p-av');
        if (avatar && avatar !== 'null') {
            avEl.innerHTML = '<img src="' + esc(avatar) + '" alt="">';
        } else {
            avEl.textContent = chatPartnerName[0].toUpperCase();
        }

        hide('ms-dialogs');
        show('ms-chat');

        var ta = g('ms-textarea');
        ta.value = '';
        ta.style.height = 'auto';
        g('ms-send').disabled = true;

        cancelReply();
        cancelImagePreview();
        lastMessageId = 0;
        newMsgCount   = 0;
        hideNewMsgBtn();
        loadMessages();
        markRead();
        stopChat();
        chatTimer = setInterval(function() { loadMessages(); markRead(); }, CHAT_POLL);
    }

    function bindMsgButtons(box) {
        box.querySelectorAll('.ms-msg-del').forEach(function(btn) {
            if (btn._bound) return; btn._bound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                post('/api/delete-message', { messageId: btn.dataset.id, userId: currentUserId })
                    .then(function() { forceReload(); });
            });
        });
        box.querySelectorAll('.ms-msg-reply-btn').forEach(function(btn) {
            if (btn._bound) return; btn._bound = true;
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                startReply({ id: btn.dataset.id, text: btn.dataset.text, imageUrl: btn.dataset.img });
            });
        });
    }

    // Полная перерисовка (первая загрузка или после удаления)
    function forceReload() {
        lastMessageId = 0;
        loadMessages();
    }

    function loadMessages() {
        return get('/api/messages/' + currentUserId + '/' + chatPartnerId)
            .then(function(r) {
                var msgs = r.messages || [];
                var box  = g('ms-messages');
                if (!box) return;

                var atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
                var isFirstLoad = lastMessageId === 0;

                if (!msgs.length) {
                    if (isFirstLoad) box.innerHTML = '<div class="ms-empty">Напишите первым! 👋</div>';
                    lastMessageId = 0;
                    return;
                }

                var latestId = msgs[msgs.length - 1].id;

                if (isFirstLoad) {
                    // Первая загрузка — рисуем всё
                    box.innerHTML = msgs.map(function(m) {
                        return renderMessage(m, String(m.sender_id) === String(currentUserId));
                    }).join('');
                    bindMsgButtons(box);
                    box.scrollTop = box.scrollHeight;
                    hideNewMsgBtn();
                } else {
                    // Polling — добавляем только новые сообщения, не трогаем старые
                    var newMsgs = msgs.filter(function(m) { return m.id > lastMessageId; });
                    if (newMsgs.length > 0) {
                        var frag = document.createDocumentFragment();
                        newMsgs.forEach(function(m) {
                            var tmp = document.createElement('div');
                            tmp.innerHTML = renderMessage(m, String(m.sender_id) === String(currentUserId));
                            var el = tmp.firstElementChild;
                            frag.appendChild(el);
                        });
                        box.appendChild(frag);
                        bindMsgButtons(box);

                        var incomingNew = newMsgs.filter(function(m) {
                            return String(m.sender_id) !== String(currentUserId);
                        });
                        if (atBot) {
                            box.scrollTop = box.scrollHeight;
                            hideNewMsgBtn();
                        } else if (incomingNew.length > 0) {
                            newMsgCount += incomingNew.length;
                            showNewMsgBtn(newMsgCount);
                        }
                    }
                }

                lastMessageId = latestId;
            })
            .catch(function() {});
    }

    function showNewMsgBtn(count) {
        var btn = g('ms-new-msg-btn');
        if (btn) {
            btn.textContent = '↓ ' + count + ' ' + (count === 1 ? 'новое сообщение' : 'новых сообщения');
            btn.classList.add('visible');
        }
        // Счётчик в шапке рядом с именем
        var nameEl = g('ms-p-name');
        if (nameEl && !nameEl.querySelector('.ms-new-badge')) {
            var badge = document.createElement('span');
            badge.className = 'ms-new-badge';
            badge.textContent = count;
            nameEl.appendChild(badge);
        } else if (nameEl) {
            var b = nameEl.querySelector('.ms-new-badge');
            if (b) b.textContent = count;
        }
    }

    function hideNewMsgBtn() {
        newMsgCount = 0;
        var btn = g('ms-new-msg-btn');
        if (btn) btn.classList.remove('visible');
        var nameEl = g('ms-p-name');
        if (nameEl) {
            var b = nameEl.querySelector('.ms-new-badge');
            if (b) b.remove();
        }
    }

    function sendMessage() {
        var ta       = g('ms-textarea');
        var text     = ta.value.trim();
        var imgBar   = g('ms-img-preview-bar');
        var imgSrc   = imgBar && imgBar.classList.contains('ms-visible') ? (g('ms-img-preview') ? g('ms-img-preview').src : null) : null;
        var replyId  = replyTo ? replyTo.id : null;

        if (!text && !pendingImageBase64) return;
        if (!chatPartnerId) return;

        var textToSend = text;
        ta.value = '';
        ta.style.height = 'auto';
        g('ms-send').disabled = true;

        var doSend = function(imageUrl) {
            var body = {
                senderId:              currentUserId,
                receiverId:            chatPartnerId,
                message:               textToSend || null,
                image_url:             imageUrl || null,
                reply_to_message_id:   replyId || null
            };
            cancelReply();
            cancelImagePreview();
            post('/api/send-message', body)
                .then(function() { loadMessages(); })
                .catch(function() {
                    ta.value = textToSend;
                    updateSendBtn();
                });
        };

        if (pendingImageBase64) {
            // Загружаем фото на сервер
            post('/api/upload-chat-image', {
                imageData: pendingImageBase64,
                userId:    currentUserId
            }).then(function(r) {
                if (r.success && r.url) doSend(r.url);
                else { alert('Ошибка загрузки фото'); updateSendBtn(); }
            }).catch(function() { alert('Ошибка сети'); updateSendBtn(); });
        } else {
            doSend(null);
        }
    }

    function markRead() {
        return post('/api/mark-messages-read', {
            userId:      currentUserId,
            otherUserId: chatPartnerId
        }).then(loadUnreadCount).catch(function() {});
    }

    function stopChat() {
        if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    }

    // =====================================================================
    // ОТВЕТ НА СООБЩЕНИЕ
    // =====================================================================
    function startReply(msg) {
        replyTo = msg;
        var bar  = g('ms-reply-bar');
        var text = g('ms-reply-bar-text');
        bar.classList.add('ms-visible');
        text.textContent = (msg.imageUrl ? '📷 ' : '') + (msg.text || 'Сообщение');
        g('ms-textarea').focus();
    }

    function cancelReply() {
        replyTo = null;
        var bar = g('ms-reply-bar');
        if (bar) bar.classList.remove('ms-visible');
    }

    // =====================================================================
    // ФОТО В ЧАТЕ
    // =====================================================================
    var pendingImageBase64 = null;

    function compressAndPreview(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onload = function() {
                var MAX = 1280;
                var w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    var ratio = Math.min(MAX/w, MAX/h);
                    w = Math.round(w * ratio);
                    h = Math.round(h * ratio);
                }
                var canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                var compressed = canvas.toDataURL('image/jpeg', 0.75);
                pendingImageBase64 = compressed;

                var previewBar = g('ms-img-preview-bar');
                var previewImg = g('ms-img-preview');
                previewImg.src = compressed;
                previewBar.classList.add('ms-visible');
                updateSendBtn();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function cancelImagePreview() {
        pendingImageBase64 = null;
        var bar = g('ms-img-preview-bar');
        if (bar) bar.classList.remove('ms-visible');
        var img = g('ms-img-preview');
        if (img) img.src = '';
        updateSendBtn();
    }

    function updateSendBtn() {
        var ta = g('ms-textarea');
        var btn = g('ms-send');
        if (btn) btn.disabled = !(ta && ta.value.trim()) && !pendingImageBase64;
    }

    // =====================================================================
    // ЛАЙТБОКС
    // =====================================================================
    window.msOpenLightbox = function(src) {
        var lb = g('ms-lightbox');
        var img = g('ms-lightbox-img');
        if (!lb || !img) return;
        img.src = src;
        lb.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    function closeLightbox() {
        var lb = g('ms-lightbox');
        if (lb) lb.classList.remove('open');
        document.body.style.overflow = '';
    }

    // =====================================================================
    // СЧЁТЧИК НЕПРОЧИТАННЫХ
    // =====================================================================
    function loadUnreadCount() {
        if (!currentUserId) return;
        get('/api/unread-count/' + currentUserId)
            .then(function(r) { if (r.success) updateBadge(r.count); })
            .catch(function() {});
    }

    function updateBadge(count) {
        if (count > lastUnread && soundEnabled) playSound();
        lastUnread  = count;
        unreadCount = count;

        var btn = document.getElementById('navMessagesBottom');
        if (!btn) return;

        // Удаляем ВСЕ старые бейджи — гарантируем один
        btn.querySelectorAll('.ms-nav-badge').forEach(function(b) { b.remove(); });

        if (count > 0) {
            var badge = document.createElement('span');
            badge.className = 'ms-nav-badge';
            badge.textContent = count > 99 ? '99+' : count;
            btn.appendChild(badge);
        }
    }

    // =====================================================================
    // ЗВУК
    // =====================================================================
    function playSound() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var osc  = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 880;
            gain.gain.value     = 0.12;
            var now = audioCtx.currentTime;
            osc.start(now);
            gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    // =====================================================================
    // УТИЛИТЫ
    // =====================================================================
    function g(id)    { return document.getElementById(id); }
    function on(id, ev, fn) { var el = g(id); if (el) el.addEventListener(ev, fn); }
    function show(id) { var el = g(id); if (el) { el.classList.add('ms-open'); document.body.style.overflow = 'hidden'; } }
    function hide(id) { var el = g(id); if (el) { el.classList.remove('ms-open'); document.body.style.overflow = ''; } }
    function esc(t)   { if (t == null) return ''; var d = document.createElement('div'); d.textContent = String(t); return d.innerHTML; }

    function get(url) {
        return fetch(url).then(function(r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
    }

    function post(url, body) {
        return fetch(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        }).then(function(r) { return r.json(); });
    }

    function fmtTime(str) {
        if (!str) return '';
        var d = new Date(str);
        if (isNaN(d.getTime())) return '';
        var now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }

    // =====================================================================
    // ПУБЛИЧНОЕ API
    // =====================================================================
    var MS = {
        openDialogs: openDialogs,
        openChat: function(userId) {
            if (!currentUserId) { window.location.href = '/login.html'; return; }
            get('/api/user/' + userId)
                .then(function(r) {
                    openChat(userId, r.success ? r.user.name : 'Пользователь',
                                    r.success ? r.user.avatar : null);
                })
                .catch(function() { openChat(userId, 'Пользователь', null); });
        },
        closeAll:        closeAll,
        loadUnreadCount: loadUnreadCount
    };

    window.MessagingSystem   = MS;
    window.openMessagesModal = MS.openDialogs;
    window.openChatWithUser  = MS.openChat;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
