// program_share.js v2 — просмотр по токену и модал поделиться

const _sp = new URLSearchParams(window.location.search);
const shareToken   = _sp.get('token');
// currentUserId уже объявлен в program1.js

let shareCurrentMode = 'all';
let shareProtocolId  = null;
let shareTokenValue  = null;

// ===== РЕЖИМ ПРОСМОТРА =====
if (shareToken) {
    document.addEventListener('DOMContentLoaded', initShareView);
}

async function initShareView() {
    const restricted = document.getElementById('accessRestricted');
    const banner     = document.getElementById('viewModeBanner');
    const page       = document.querySelector('.program-page');

    try {
        const res  = await fetch(`/api/program/share/${shareToken}?userId=${currentUserId||''}`);
        const data = await res.json();
        console.log('SHARE DATA:', JSON.stringify(data).substring(0, 500));

        if (!data.success) {
            console.log('SHARE RESTRICTED:', data.error);
            if (page)       page.style.display = 'none';
            if (restricted) restricted.style.display = 'flex';
            return;
        }

        // ---- Заполняем programData точно в формате loadProgramDataFromDB ----
        programData = {
            title: data.protocolName,
            days: data.data.days || []
        };

        protocolName = data.protocolName;

        // collapsed — используем is_collapsed как в оригинале
        collapsedExercises = {};
        programData.days.forEach(day => {
            (day.exercises || []).forEach(ex => {
                if (ex.isCollapsed || ex.is_collapsed) {
                    collapsedExercises[ex.id] = true;
                }
            });
        });

        // Заголовок через глобальную DOM-переменную
        if (typeof programTitle !== 'undefined' && programTitle) {
            programTitle.textContent = data.protocolName;
            programTitle.onclick = null;
            programTitle.style.cursor = 'default';
        } else {
            const titleEl = document.getElementById('programTitle');
            if (titleEl) { titleEl.textContent = data.protocolName; titleEl.onclick = null; }
        }

        // Баннер просмотра
if (banner) {
    banner.style.display = 'flex';

    document.body.classList.add('share-view-mode');

    const ownerEl = document.getElementById('viewModeOwner');
    if (ownerEl) ownerEl.textContent = data.protocolName;
}

        // Ждём пока все program*.js загрузятся и функции станут доступны
        const waitAndRender = () => {
            if (typeof renderDaysTabs  !== 'function' ||
                typeof renderExercises !== 'function') {
                setTimeout(waitAndRender, 50);
                return;
            }
            console.log('SHARE RENDER: programData=', JSON.stringify(programData).substring(0,300));
            renderDaysTabs();
            renderExercises();
            if (typeof loadCurrentDayComments === 'function') loadCurrentDayComments();
            hideEditControls();
        };
        waitAndRender();

    } catch(e) {
        console.error('share view error', e);
    }
}

function hideEditControls() {
    // Кнопки шапки
    const hideIds = ['addExerciseBtn','shareLinkBtn','addDayBtn','editTitleBtn',
                     'saveWorkoutCommentsBtn'];
    hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // CSS — скрываем все кнопки редактирования глобально
    const style = document.createElement('style');
    style.id = 'view-mode-styles';
    style.textContent = `
        /* Режим просмотра — скрываем всё редактирование */
        .delete-exercise-btn,
        .add-set-btn,
        .delete-set-btn,
        .add-comment-btn,
        .delete-comment-btn,
        .edit-comment-btn,
        .add-photo-btn,
        .delete-photo-btn,
        .photo-delete-btn,
        .day-tab .delete-day-btn,
        .delete-day-btn,
        .day-delete-btn,
        .remove-day-btn,
        .day-tab-delete,
        .edit-title-btn,
        .add-exercise-btn-inline,
        .save-workout-comments-btn,
        #saveWorkoutCommentsBtn,
        .exercise-reorder-btn,
        .comment-actions,
        .photo-overlay-delete,
        .set-delete-btn { display: none !important; }

        .reps-input, .weight-input {
            pointer-events: none !important;
            opacity: 0.7;
        }
        .exercise-name {
            cursor: default !important;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);

    // Наблюдатель для динамически создаваемых элементов
    const obs = new MutationObserver(() => {
        document.querySelectorAll(
            '.delete-exercise-btn,.add-set-btn,.delete-set-btn,' +
            '.add-comment-btn,.delete-comment-btn,.edit-comment-btn,' +
            '.add-photo-btn,.delete-photo-btn,.photo-delete-btn,' +
            '.day-tab .delete-day-btn,.edit-title-btn,.set-delete-btn'
        ).forEach(el => { el.style.setProperty('display','none','important'); });
    });
    obs.observe(document.body, {childList:true, subtree:true});
}

// ===== МОДАЛ ПОДЕЛИТЬСЯ =====
async function openShareModal() {
    shareProtocolId = new URLSearchParams(window.location.search).get('id');
    if (!shareProtocolId || !currentUserId) return;

    const r = await fetch('/api/protocols/ensure-token',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({userId:currentUserId, protocolId:shareProtocolId})
    });
    const d = await r.json();
    if (!d.success) return;
    shareTokenValue = d.token;

    document.getElementById('shareUrlInput').value =
        `${location.origin}/program.html?token=${shareTokenValue}`;

    // Текущие настройки
    const pr = await fetch(`/api/protocols/${currentUserId}`);
    const pd = await pr.json();
    if (pd.success) {
        const p = pd.protocols.find(x => String(x.id)===String(shareProtocolId));
        if (p) shareCurrentMode = !p.is_public?'hidden':p.share_mode==='selected'?'selected':'all';
    }
    updateVisUI();
    if (shareCurrentMode==='selected') loadAccessList();
    document.getElementById('shareModal')?.classList.add('open');
}

function updateVisUI() {
    ['all','selected','hidden'].forEach(m => {
        const id = m==='all'?'visAllBtn':m==='selected'?'visSelectedBtn':'visHiddenBtn';
        document.getElementById(id)?.classList.toggle('active', shareCurrentMode===m);
    });
    document.getElementById('shareUsersBlock').style.display =
        shareCurrentMode==='selected' ? '' : 'none';
}

async function setVisibility(mode) {
    shareCurrentMode = mode;
    updateVisUI();
    if (mode==='selected') loadAccessList();
    await fetch('/api/protocols/visibility',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:currentUserId, protocolId:shareProtocolId,
            isPublic:mode!=='hidden', shareMode:mode==='selected'?'selected':'all'})
    });
}

async function loadAccessList() {
    const r = await fetch(`/api/protocols/access/${shareProtocolId}?userId=${currentUserId}`);
    const d = await r.json();
    const list = document.getElementById('shareAccessList');
    if (!list) return;
    if (!d.success||!d.users.length) {
        list.innerHTML='<div style="color:#666;font-size:13px;padding:8px">Нет пользователей с доступом</div>';
        return;
    }
    list.innerHTML = d.users.map(u=>`
        <div class="share-access-item">
            <div class="share-access-avatar">${u.avatar_url?`<img src="${u.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:'👤'}</div>
            <div class="share-access-name">${u.name||u.login}</div>
            <button class="share-access-remove" onclick="removeAccess(${u.user_id})">✕</button>
        </div>`).join('');
}

async function removeAccess(uid) {
    await fetch('/api/protocols/access',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:currentUserId,protocolId:shareProtocolId,targetUserId:uid,action:'remove'})});
    loadAccessList();
}

async function searchShareUser() {
    const q = document.getElementById('shareUserSearch')?.value.trim();
    if (!q) return;
    const r = await fetch(`/api/search-users?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    const c = document.getElementById('shareUserResults');
    if (!c) return;
    if (!d.success||!d.users?.length) { c.innerHTML='<div style="color:#666;font-size:12px;padding:6px">Не найдено</div>'; return; }
    c.innerHTML = d.users.map(u=>`
        <div class="share-user-result-item" onclick="addAccess(${u.id},this)">
            <div class="share-access-avatar">${u.avatar_url?`<img src="${u.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`:'👤'}</div>
            <div class="share-access-name">${u.name||u.login}</div>
            <button class="share-add-btn">+ Добавить</button>
        </div>`).join('');
}

async function addAccess(uid, el) {
    await fetch('/api/protocols/access',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:currentUserId,protocolId:shareProtocolId,targetUserId:uid,action:'add'})});
    if(el){el.style.opacity='0.5';el.style.pointerEvents='none';}
    loadAccessList();
}

async function shareToChatHandler() {
    if (!shareTokenValue) return;
    const url = `${location.origin}/program.html?token=${shareTokenValue}`;
    const name = document.getElementById('programTitle')?.textContent||'Тренировка';
    const msg  = `💪 ${name}\n${url}`;
    if (typeof openMessagesModal==='function') openMessagesModal(msg);
    else { try{await navigator.clipboard.writeText(msg);}catch(e){} showShareToast('📋 Скопировано!'); }
    document.getElementById('shareModal')?.classList.remove('open');
}

async function copyShareUrl() {
    const inp = document.getElementById('shareUrlInput');
    if (!inp) return;
    try{await navigator.clipboard.writeText(inp.value);}catch(e){inp.select();document.execCommand('copy');}
    const h=document.getElementById('shareCopiedHint');
    if(h){h.style.display='';setTimeout(()=>h.style.display='none',2500);}
}

function showShareToast(msg) {
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},2500);
}

// ===== СОБЫТИЯ =====
document.addEventListener('DOMContentLoaded', () => {
    if (shareToken) return;
    document.getElementById('shareLinkBtn')?.addEventListener('click', openShareModal);
    document.getElementById('closeShareModal')?.addEventListener('click',()=>document.getElementById('shareModal')?.classList.remove('open'));
    document.getElementById('shareModal')?.addEventListener('click',e=>{if(e.target===document.getElementById('shareModal'))document.getElementById('shareModal').classList.remove('open');});
    document.getElementById('shareCopyBtn')?.addEventListener('click', copyShareUrl);
    document.getElementById('shareToChatBtn')?.addEventListener('click', shareToChatHandler);
    document.getElementById('shareUserSearchBtn')?.addEventListener('click', searchShareUser);
    document.getElementById('shareUserSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')searchShareUser();});
});
