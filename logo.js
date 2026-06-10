// logo.js - клик по логотипу на всех страницах

document.addEventListener('DOMContentLoaded', function() {
    const logo = document.getElementById('mainLogo');
    if (logo) {
        logo.addEventListener('click', function() {
            window.location.href = '/index.html';
        });
        logo.style.cursor = 'pointer';
    }
});