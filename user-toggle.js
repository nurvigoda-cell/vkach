// user-toggle.js - управление кнопкой Свернуть/Развернуть на странице пользователя

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const collapsibleBlock = document.getElementById('collapsibleDetails');
    
    if (!toggleBtn || !collapsibleBlock) return;
    
    // Проверяем сохранённое состояние в localStorage
    const savedState = localStorage.getItem('userProfileCollapsed');
    let isCollapsed = savedState === 'true';
    
    // Функция обновления состояния
    function updateCollapseState() {
        if (isCollapsed) {
            collapsibleBlock.style.display = 'none';
            toggleBtn.innerHTML = '▼ Развернуть';
            toggleBtn.title = 'Развернуть детали';
        } else {
            collapsibleBlock.style.display = 'block';
            toggleBtn.innerHTML = '▲ Свернуть';
            toggleBtn.title = 'Свернуть детали';
        }
        localStorage.setItem('userProfileCollapsed', isCollapsed);
    }
    
    // Применяем сохранённое состояние
    updateCollapseState();
    
    // Обработчик клика
    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        isCollapsed = !isCollapsed;
        updateCollapseState();
    });
});