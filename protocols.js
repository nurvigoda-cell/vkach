// protocols.js - логика работы с протоколами тренировок

let protocols = [];
let currentUserId = localStorage.getItem('currentUserId');

document.addEventListener('DOMContentLoaded', function() {
    let currentEditProtocolId = null;
    let currentDeleteProtocolId = null;
    let dragStartIndex = null;
    
    const protocolsList = document.getElementById('protocolsList');
    const addProtocolBtn = document.getElementById('addProtocolBtn');
    const searchInput = document.getElementById('protocolSearchInput');
    
    const protocolModal = document.getElementById('protocolModal');
    const modalTitle = document.getElementById('modalTitle');
    const protocolNameInput = document.getElementById('protocolNameInput');
    const nameCounter = document.getElementById('nameCounter');
    const saveProtocolBtn = document.getElementById('saveProtocolBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const modalClose = document.querySelector('.protocol-modal-close');
    
    const deleteModal = document.getElementById('deleteConfirmModal');
    const deleteConfirmText = document.getElementById('deleteConfirmText');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteModalClose = document.querySelector('.delete-modal-close');
    
    const navProfileBottom = document.getElementById('navProfileBottom');
    const navMessagesBottom = document.getElementById('navMessagesBottom');
    const navBlocksBottom = document.getElementById('navBlocksBottom');
    
    function showNotification(message, isError = false) {
        const existingNotification = document.querySelector('.block-notification');
        if (existingNotification) existingNotification.remove();
        
        const notification = document.createElement('div');
        notification.className = 'block-notification';
        notification.innerHTML = `
            <div class="block-notification-content ${isError ? 'error' : 'success'}">
                <span class="notification-icon">${isError ? '❌' : '✅'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    async function loadProtocols() {
        if (!currentUserId) {
            protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">🔐</div><p>Войдите в аккаунт, чтобы управлять протоколами</p></div>';
            return;
        }
        
        try {
            const response = await fetch(`/api/protocols/${currentUserId}`);
            const data = await response.json();
            
            if (data.success) {
                protocols = data.protocols;
                renderProtocols();
            } else {
                protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">❌</div><p>Ошибка загрузки</p></div>';
            }
        } catch (err) {
            console.error('Ошибка загрузки протоколов:', err);
            protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">⚠️</div><p>Ошибка подключения к серверу</p></div>';
        }
    }
    
    async function saveProtocolsOrder() {
        if (!currentUserId) return;
        
        const orderData = protocols.map((protocol, index) => ({
            id: protocol.id,
            order: index
        }));
        
        try {
            await fetch('/api/protocols/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    orders: orderData
                })
            });
        } catch (err) {
            console.error('Ошибка сохранения порядка:', err);
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'Недавно';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Недавно';
        return date.toLocaleDateString('ru-RU');
    }
    
    window.openProgram = function(protocolId, protocolName) {
        window.location.href = `/program.html?id=${protocolId}&name=${encodeURIComponent(protocolName)}`;
    };
    
    function onProtocolNameClick(protocolId, protocolName, event) {
        event.stopPropagation();
        window.location.href = `/program.html?id=${protocolId}&name=${encodeURIComponent(protocolName)}`;
    }
    
    window.onProtocolNameClick = onProtocolNameClick;
    
    function renderProtocols() {
        if (!protocolsList) return;
        
        if (protocols.length === 0) {
            protocolsList.innerHTML = `
                <div class="empty-protocols">
                    <div class="empty-icon">📋</div>
                    <p>У вас пока нет протоколов тренировок</p>
                    <p class="empty-hint">Нажмите «+ Добавить протокол», чтобы создать первый</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        protocols.forEach((protocol, index) => {
            const safeName = escapeHtml(protocol.name).replace(/'/g, "\\'");
            const dateStr = protocol.formatted_date || formatDate(protocol.created_at);
            
            html += `
                <div class="protocol-card" data-id="${protocol.id}" data-index="${index}" onclick="openProgram(${protocol.id}, '${safeName}')">
                    <div class="drag-handle" draggable="true" onclick="event.stopPropagation()">⋮⋮</div>
                    <div class="protocol-info">
                        <div class="protocol-number">${index + 1}</div>
                        <div class="protocol-name">${escapeHtml(protocol.name)}</div>
                        <div class="protocol-date">📅 ${dateStr}</div>
                    </div>
                    <div class="protocol-actions" onclick="event.stopPropagation(); openProtoMenu(event, ${protocol.id})">
                        <button class="protocol-menu-btn">⋮</button>
                    </div>
                </div>
            `;
        });
        
        protocolsList.innerHTML = html;
        buildProtoMenus(protocols);
        
        document.querySelectorAll('.protocol-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                openEditModal(id);
            });
        });
        
        document.querySelectorAll('.protocol-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                openDeleteModal(id);
            });
        });
        
        setupDragAndDrop();
    }
    
    function setupDragAndDrop() {
        const cards = document.querySelectorAll('.protocol-card');
        const dragHandles = document.querySelectorAll('.drag-handle');
        
        dragHandles.forEach(handle => {
            handle.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const card = handle.closest('.protocol-card');
                if (card) {
                    dragStartIndex = parseInt(card.getAttribute('data-index'));
                    e.dataTransfer.setData('text/plain', dragStartIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    card.classList.add('dragging');
                }
            });
            
            handle.addEventListener('dragend', (e) => {
                document.querySelectorAll('.protocol-card').forEach(card => {
                    card.classList.remove('dragging');
                    card.classList.remove('drag-over');
                });
                dragStartIndex = null;
            });
            
            handle.setAttribute('draggable', 'true');
        });
        
        cards.forEach(card => {
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            card.addEventListener('dragenter', (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
            });
            
            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });
            
            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                card.classList.remove('drag-over');
                
                const dragIndex = dragStartIndex;
                const dropIndex = parseInt(card.getAttribute('data-index'));
                
                if (dragIndex !== null && dragIndex !== dropIndex) {
                    const [movedItem] = protocols.splice(dragIndex, 1);
                    protocols.splice(dropIndex, 0, movedItem);
                    await saveProtocolsOrder();
                    renderProtocols();
                    showNotification('Порядок протоколов сохранён');
                }
            });
        });
    }
    
    function openAddModal() {
        currentEditProtocolId = null;
        modalTitle.textContent = 'Новый протокол';
        protocolNameInput.value = '';
        updateNameCounter();
        protocolModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        protocolNameInput.focus();
    }
    
    function openEditModal(id) {
        const protocol = protocols.find(p => p.id === id);
        if (!protocol) return;
        
        currentEditProtocolId = id;
        modalTitle.textContent = 'Редактировать протокол';
        protocolNameInput.value = protocol.name;
        updateNameCounter();
        protocolModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        protocolNameInput.focus();
    }
    
    function openDeleteModal(id) {
        const protocol = protocols.find(p => p.id === id);
        if (!protocol) return;
        
        currentDeleteProtocolId = id;
        deleteConfirmText.textContent = `Вы уверены, что хотите удалить протокол «${escapeHtml(protocol.name)}»? Вместе с протоколом будут удалены все дни, упражнения, подходы, комментарии и фото.`;
        deleteModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    function closeModal() {
        protocolModal.style.display = 'none';
        document.body.style.overflow = '';
        currentEditProtocolId = null;
        protocolNameInput.value = '';
    }
    
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        document.body.style.overflow = '';
        currentDeleteProtocolId = null;
    }
    
    function updateNameCounter() {
        const len = protocolNameInput.value.length;
        nameCounter.textContent = `${len}/100`;
        if (len > 90) {
            nameCounter.classList.add('warning');
        } else {
            nameCounter.classList.remove('warning');
        }
    }
    
    async function saveProtocol() {
        const name = protocolNameInput.value.trim();
        
        if (!name) {
            showNotification('Введите название протокола', true);
            return;
        }
        
        if (name.length < 2) {
            showNotification('Название должно содержать минимум 2 символа', true);
            return;
        }
        
        if (name.length > 100) {
            showNotification('Название не более 100 символов', true);
            return;
        }
        
        try {
            let response;
            
            if (currentEditProtocolId) {
                response = await fetch('/api/protocols/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUserId,
                        protocolId: currentEditProtocolId,
                        name: name
                    })
                });
            } else {
                const newOrder = protocols.length;
                response = await fetch('/api/protocols/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUserId,
                        name: name,
                        order: newOrder
                    })
                });
            }
            
            const data = await response.json();
            
            if (data.success) {
                closeModal();
                await loadProtocols();
                showNotification(currentEditProtocolId ? 'Протокол обновлён' : 'Протокол создан');
            } else {
                showNotification(data.error || 'Ошибка сохранения', true);
            }
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            showNotification('Ошибка подключения к серверу', true);
        }
    }
    
    async function deleteProtocol() {
        if (!currentDeleteProtocolId) return;
        
        try {
            const response = await fetch('/api/protocols/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    protocolId: currentDeleteProtocolId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                closeDeleteModal();
                await loadProtocols();
                showNotification('Протокол удалён');
            } else {
                showNotification(data.error || 'Ошибка удаления', true);
            }
        } catch (err) {
            console.error('Ошибка удаления:', err);
            showNotification('Ошибка подключения к серверу', true);
        }
    }
    
    function searchProtocols() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderProtocols();
            return;
        }
        
        const filteredProtocols = protocols.filter(p => 
            p.name.toLowerCase().includes(searchTerm)
        );
        
        if (filteredProtocols.length === 0) {
            protocolsList.innerHTML = `
                <div class="empty-protocols">
                    <div class="empty-icon">🔍</div>
                    <p>Ничего не найдено</p>
                    <p class="empty-hint">Попробуйте изменить поисковый запрос</p>
                </div>
            `;
        } else {
            let html = '';
            filteredProtocols.forEach((protocol, index) => {
                const safeName = escapeHtml(protocol.name).replace(/'/g, "\\'");
                const dateStr = protocol.formatted_date || formatDate(protocol.created_at);
                html += `
                    <div class="protocol-card" data-id="${protocol.id}" data-index="${index}" onclick="openProgram(${protocol.id}, '${safeName}')">
                        <div class="drag-handle" draggable="true" onclick="event.stopPropagation()">⋮⋮</div>
                        <div class="protocol-info">
                            <div class="protocol-number">${index + 1}</div>
                            <div class="protocol-name">${escapeHtml(protocol.name)}</div>
                            <div class="protocol-date">📅 ${dateStr}</div>
                        </div>
                        <div class="protocol-actions" onclick="event.stopPropagation()">
                            <button class="protocol-edit-btn" data-id="${protocol.id}" title="Редактировать">✏️</button>
                            <button class="protocol-delete-btn" data-id="${protocol.id}" title="Удалить">🗑️</button>
                        </div>
                    </div>
                `;
            });
            protocolsList.innerHTML = html;
            
            document.querySelectorAll('.protocol-edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'));
                    openEditModal(id);
                });
            });
            
            document.querySelectorAll('.protocol-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = parseInt(btn.getAttribute('data-id'));
                    openDeleteModal(id);
                });
            });
            
            setupDragAndDrop();
        }
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function checkAuth() {
        currentUserId = localStorage.getItem('currentUserId');
        if (!currentUserId) {
            protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">🔐</div><p>Войдите в аккаунт, чтобы управлять протоколами</p><p class="empty-hint"><a href="/login.html" style="color: #E9AE67;">Войти</a></p></div>';
        }
    }
    
    if (addProtocolBtn) addProtocolBtn.addEventListener('click', openAddModal);
    if (saveProtocolBtn) saveProtocolBtn.addEventListener('click', saveProtocol);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteProtocol);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteModalClose) deleteModalClose.addEventListener('click', closeDeleteModal);
    if (protocolNameInput) protocolNameInput.addEventListener('input', updateNameCounter);
    if (searchInput) searchInput.addEventListener('input', searchProtocols);
    
    window.addEventListener('click', (e) => {
        if (e.target === protocolModal) closeModal();
        if (e.target === deleteModal) closeDeleteModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });
    
    if (navProfileBottom) {
        navProfileBottom.addEventListener('click', () => {
            if (currentUserId) window.location.href = '/user/' + currentUserId;
            else window.location.href = '/login.html';
        });
    }
    
    if (navMessagesBottom) {
        navMessagesBottom.addEventListener('click', () => {
            if (currentUserId) {
                if (typeof window.openChatWithUser === 'function') window.openChatWithUser(currentUserId);
                else window.location.href = '/user/' + currentUserId;
            } else window.location.href = '/login.html';
        });
    }
    
    if (navBlocksBottom) {
        navBlocksBottom.addEventListener('click', () => {
            window.location.href = '/blocks.html';
        });
    }
    
    // Слушаем событие перезагрузки из внешних функций
    document.addEventListener('reloadProtocols', function() {
        renderProtocols();
    });

    // Экспорт
    window.showNotification = showNotification;
    window.openEditModal = openEditModal;

    checkAuth();
    if (currentUserId) {
        loadProtocols();
    } else {
        protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">🔐</div><p>Войдите в аккаунт, чтобы управлять протоколами</p><p class="empty-hint"><a href="/login.html" style="color: #E9AE67;">Войти</a></p></div>';
    }
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'currentUserId') {
            currentUserId = localStorage.getItem('currentUserId');
            checkAuth();
            if (currentUserId) loadProtocols();
            else protocolsList.innerHTML = '<div class="empty-protocols"><div class="empty-icon">🔐</div><p>Войдите в аккаунт, чтобы управлять протоколами</p></div>';
        }
    });
});


function openProtoMenu(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.proto-dd.open').forEach(function(d){ d.classList.remove('open'); });
    var dd = document.getElementById('proto-dd-' + id);
    if (!dd) return;
    var r = e.currentTarget.getBoundingClientRect();
    var left = Math.max(8, r.right - 210);
    var top = (r.bottom + 240 > window.innerHeight) ? r.top - 240 : r.bottom + 4;
    dd.style.top = top + 'px';
    dd.style.left = left + 'px';
    dd.style.right = 'auto';
    dd.classList.add('open');
}

function buildProtoMenus(protocols) {
    document.querySelectorAll('.proto-dd').forEach(function(d){ d.remove(); });
    (protocols || []).forEach(function(p) {
        var dd = document.createElement('div');
        dd.className = 'proto-dd';
        dd.id = 'proto-dd-' + p.id;
        var isHidden = (p.is_public === 0 || p.is_public === false);
        var b1 = document.createElement('button'); b1.className = 'proto-dd-item';
        b1.textContent = isHidden ? '\uD83C\uDF0D Открыть доступ' : '\uD83D\uDD12 Скрыть';
        b1.onclick = function(){ protoVis(p.id); };
        var b2 = document.createElement('button'); b2.className = 'proto-dd-item';
        b2.textContent = '\uD83D\uDD17 Копировать ссылку';
        b2.onclick = function(){ protoShareF(p.id, p.share_token||''); };
        var b3 = document.createElement('button'); b3.className = 'proto-dd-item';
        b3.textContent = '\uD83D\uDCAC Отправить в чат';
        b3.onclick = function(){ protoChatF(p.id, p.name, p.share_token||''); };
        var b4 = document.createElement('button'); b4.className = 'proto-dd-item';
        b4.textContent = '\u270F\uFE0F Редактировать';
        b4.onclick = function(){ closeProtoMenus(); openEditModal(p.id); };
        var sep = document.createElement('div'); sep.className = 'proto-dd-sep';
        var b5 = document.createElement('button'); b5.className = 'proto-dd-item proto-dd-del';
        b5.textContent = '\uD83D\uDDD1\uFE0F Удалить';
        b5.onclick = function(){ protoDelF(p.id, p.name); };
        dd.appendChild(b1); dd.appendChild(b2); dd.appendChild(b3);
        dd.appendChild(b4); dd.appendChild(sep); dd.appendChild(b5);
        document.body.appendChild(dd);
    });
}

function closeProtoMenus() {
    document.querySelectorAll('.proto-dd.open').forEach(function(d){ d.classList.remove('open'); });
}

function protoVis(id) {
    closeProtoMenus();
    var p = protocols.find(function(x){ return x.id === id; });
    if (!p) return;
    var newPub = (p.is_public === 0 || p.is_public === false) ? 1 : 0;
    fetch('/api/protocols/visibility', {method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({userId:currentUserId,protocolId:id,isPublic:newPub,shareMode:p.share_mode||'all'})})
    .then(function(r){ return r.json(); })
    .then(function(d){ if(d.success){ p.is_public=newPub; document.dispatchEvent(new CustomEvent("reloadProtocols")); window.showNotification(newPub?'\uD83C\uDF0D Открыто':'\uD83D\uDD12 Скрыто'); }});
}

function protoShareF(id, token) {
    closeProtoMenus();
    var copy = function(tk){ navigator.clipboard.writeText(location.origin+'/program.html?token='+tk).catch(function(){}); showNotification('\uD83D\uDD17 Ссылка скопирована!'); };
    if (token) { copy(token); return; }
    fetch('/api/protocols/ensure-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUserId,protocolId:id})})
    .then(function(r){return r.json();}).then(function(d){ if(d.success) copy(d.token); });
}

function protoChatF(id, name, token) {
    closeProtoMenus();
    var send = function(tk){
        var msg = '\uD83D\uDCAA ' + name + '\n' + location.origin + '/program.html?token=' + tk;
        if (typeof openMessagesModal === 'function') openMessagesModal(msg);
        else { navigator.clipboard.writeText(msg).catch(function(){}); window.showNotification('\uD83D\uDCAC Скопировано'); }
    };
    if (token) { send(token); return; }
    fetch('/api/protocols/ensure-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUserId,protocolId:id})})
    .then(function(r){return r.json();}).then(function(d){ if(d.success) send(d.token); });
}

function protoDelF(id, name) {
    closeProtoMenus();
    if (!confirm('Удалить "' + name + '"?\nВсе упражнения будут удалены.')) return;
    fetch('/api/protocols/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:currentUserId,protocolId:id})})
    .then(function(r){return r.json();})
    .then(function(d){ if(d.success){ protocols=protocols.filter(function(x){return x.id!==id;}); document.dispatchEvent(new CustomEvent("reloadProtocols")); window.showNotification('Протокол удалён'); }});
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.proto-dd') && !e.target.closest('.protocol-actions')) {
        closeProtoMenus();
    }

});

// Экспорт после загрузки страницы
window.addEventListener('load', function() {
    // Эти функции уже определены внутри DOMContentLoaded и доступны через замыкание
    // Используем кастомное событие для вызова
});
