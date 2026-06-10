// preloader.js - быстрый preloader

document.addEventListener('DOMContentLoaded', function() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.querySelector('.preloader-progress-bar');
    const progressText = document.querySelector('.preloader-text');
    
    let progress = 0;
    
    // Быстрое заполнение до 90%
    const interval = setInterval(function() {
        progress += Math.random() * 30 + 10; // +10-40% за шаг
        if (progress >= 90) {
            progress = 90;
            clearInterval(interval);
        }
        progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = Math.floor(progress) + '%';
    }, 50); // каждые 50 мс вместо 150
    
    // Когда страница полностью загружена
    window.addEventListener('load', function() {
        progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        
        setTimeout(function() {
            preloader.classList.add('hide');
            setTimeout(function() {
                preloader.style.display = 'none';
            }, 300);
        }, 200);
    });
});