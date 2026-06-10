// timer.js - супер-таймер для тренировок

let currentMode = 'stopwatch'; // stopwatch, countdown, interval
let timerInterval = null;
let currentSeconds = 0;
let totalSeconds = 0;
let isRunning = false;
let isPaused = false;

// Интервальные переменные
let intervalWorkSeconds = 30;
let intervalRestSeconds = 15;
let intervalRounds = 3;
let currentRound = 1;
let currentPhase = 'work'; // work or rest
let intervalTimerRunning = false;

// DOM элементы
const timerMinutes = document.getElementById('timerMinutes');
const timerSeconds = document.getElementById('timerSeconds');
const timerStatus = document.getElementById('timerStatus');
const progressCircle = document.querySelector('.timer-circle-progress');
const modeBtns = document.querySelectorAll('.mode-btn');
const stopwatchControls = document.getElementById('stopwatchControls');
const countdownControls = document.getElementById('countdownControls');
const intervalControls = document.getElementById('intervalControls');

// Длина окружности (2 * π * 90)
const CIRCUMFERENCE = 2 * Math.PI * 90;

// Инициализация
function init() {
    updateProgressCircle(0, 100);
    
    // Обработчики режимов
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });
    
    // Секундомер
    document.querySelectorAll('#stopwatchControls .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.time;
            if (action === '0') startStopwatch();
            else if (action === '-1') pauseStopwatch();
            else if (action === '-2') resetStopwatch();
        });
    });
    
    // Обработчики пикера для обратного отсчёта
    setupTimePicker('cdMinutes', 1, 59);
    setupTimePicker('cdSeconds', 0, 59);
    
    // Пресеты для обратного отсчёта
    document.querySelectorAll('#countdownControls .preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const seconds = parseInt(btn.dataset.time);
            if (!isNaN(seconds)) {
                setCountdownPreset(seconds);
            }
        });
    });
    
    document.getElementById('startCountdown').addEventListener('click', () => startCountdown());
    document.getElementById('resetCountdown').addEventListener('click', () => resetCountdown());
    
    // Интервальный режим
    setupIntervalPicker('workMinutes', 0, 9);
    setupIntervalPicker('workSeconds', 0, 59);
    setupIntervalPicker('restMinutes', 0, 9);
    setupIntervalPicker('restSeconds', 0, 59);
    setupIntervalPicker('roundsCount', 1, 20);
    
    document.getElementById('startInterval').addEventListener('click', () => startInterval());
    document.getElementById('resetInterval').addEventListener('click', () => resetInterval());
    
    // Сохраняем выбранный режим
    const savedMode = localStorage.getItem('timerMode');
    if (savedMode && ['stopwatch', 'countdown', 'interval'].includes(savedMode)) {
        switchMode(savedMode);
    } else {
        switchMode('stopwatch');
    }
}

function switchMode(mode) {
    currentMode = mode;
    stopAllTimers();
    localStorage.setItem('timerMode', mode);
    
    modeBtns.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    stopwatchControls.style.display = 'none';
    countdownControls.style.display = 'none';
    intervalControls.style.display = 'none';
    
    if (mode === 'stopwatch') {
        stopwatchControls.style.display = 'block';
        updateDisplayFromSeconds(currentSeconds);
        timerStatus.textContent = 'Секундомер';
    } else if (mode === 'countdown') {
        countdownControls.style.display = 'block';
        const minutes = parseInt(document.getElementById('cdMinutes').textContent);
        const seconds = parseInt(document.getElementById('cdSeconds').textContent);
        totalSeconds = minutes * 60 + seconds;
        currentSeconds = totalSeconds;
        updateDisplayFromSeconds(currentSeconds);
        updateProgressCircle(currentSeconds, totalSeconds);
        timerStatus.textContent = 'Обратный отсчёт';
    } else if (mode === 'interval') {
        intervalControls.style.display = 'block';
        readIntervalValues();
        currentSeconds = intervalWorkSeconds;
        totalSeconds = intervalWorkSeconds;
        updateDisplayFromSeconds(currentSeconds);
        updateProgressCircle(currentSeconds, totalSeconds);
        currentRound = 1;
        currentPhase = 'work';
        timerStatus.textContent = `Интервал • Раунд 1/${intervalRounds} • Работа`;
    }
}

function stopAllTimers() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isRunning = false;
    isPaused = false;
    intervalTimerRunning = false;
}

// ========== СЕКУНДОМЕР ==========
function startStopwatch() {
    if (isRunning && !isPaused) return;
    
    if (!isRunning && !isPaused) {
        currentSeconds = 0;
        totalSeconds = 0;
        updateDisplayFromSeconds(0);
    }
    
    isRunning = true;
    isPaused = false;
    timerStatus.textContent = '▶️ Идёт';
    startTimer('stopwatch');
}

function pauseStopwatch() {
    if (!isRunning) return;
    isRunning = false;
    isPaused = true;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerStatus.textContent = '⏸️ Пауза';
}

function resetStopwatch() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    isPaused = false;
    currentSeconds = 0;
    totalSeconds = 0;
    updateDisplayFromSeconds(0);
    updateProgressCircle(0, 100);
    timerStatus.textContent = 'Секундомер';
}

// ========== ОБРАТНЫЙ ОТСЧЁТ ==========
function setupTimePicker(elementId, minVal, maxVal) {
    const valueSpan = document.getElementById(elementId);
    const parent = valueSpan.closest('.time-picker-group');
    const downBtn = parent.querySelector('.down');
    const upBtn = parent.querySelector('.up');
    
    downBtn.addEventListener('click', () => {
        let val = parseInt(valueSpan.textContent);
        val = Math.max(minVal, val - 1);
        valueSpan.textContent = val;
        if (!isRunning) updateCountdownPreview();
    });
    
    upBtn.addEventListener('click', () => {
        let val = parseInt(valueSpan.textContent);
        val = Math.min(maxVal, val + 1);
        valueSpan.textContent = val;
        if (!isRunning) updateCountdownPreview();
    });
}

function updateCountdownPreview() {
    const minutes = parseInt(document.getElementById('cdMinutes').textContent);
    const seconds = parseInt(document.getElementById('cdSeconds').textContent);
    totalSeconds = minutes * 60 + seconds;
    currentSeconds = totalSeconds;
    updateDisplayFromSeconds(currentSeconds);
    updateProgressCircle(currentSeconds, totalSeconds);
}

function setCountdownPreset(seconds) {
    if (isRunning) return;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    document.getElementById('cdMinutes').textContent = minutes;
    document.getElementById('cdSeconds').textContent = secs;
    updateCountdownPreview();
}

function startCountdown() {
    if (isRunning) return;
    const minutes = parseInt(document.getElementById('cdMinutes').textContent);
    const seconds = parseInt(document.getElementById('cdSeconds').textContent);
    totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds === 0) {
        playSoundAlert();
        return;
    }
    
    currentSeconds = totalSeconds;
    updateDisplayFromSeconds(currentSeconds);
    updateProgressCircle(currentSeconds, totalSeconds);
    isRunning = true;
    timerStatus.textContent = '⏳ Обратный отсчёт...';
    startTimer('countdown');
}

function resetCountdown() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
    updateCountdownPreview();
    timerStatus.textContent = 'Обратный отсчёт';
}

// ========== ИНТЕРВАЛЬНЫЙ РЕЖИМ ==========
function setupIntervalPicker(elementId, minVal, maxVal) {
    const valueSpan = document.getElementById(elementId);
    const parent = valueSpan.closest('.time-picker-group') || valueSpan.parentElement.parentElement;
    const downBtn = parent.querySelector('.down');
    const upBtn = parent.querySelector('.up');
    
    if (downBtn && upBtn) {
        downBtn.addEventListener('click', () => {
            let val = parseInt(valueSpan.textContent);
            val = Math.max(minVal, val - 1);
            valueSpan.textContent = val;
            if (!intervalTimerRunning) updateIntervalPreview();
        });
        
        upBtn.addEventListener('click', () => {
            let val = parseInt(valueSpan.textContent);
            val = Math.min(maxVal, val + 1);
            valueSpan.textContent = val;
            if (!intervalTimerRunning) updateIntervalPreview();
        });
    }
}

function readIntervalValues() {
    intervalWorkSeconds = (parseInt(document.getElementById('workMinutes').textContent) || 0) * 60 +
                         (parseInt(document.getElementById('workSeconds').textContent) || 0);
    intervalRestSeconds = (parseInt(document.getElementById('restMinutes').textContent) || 0) * 60 +
                         (parseInt(document.getElementById('restSeconds').textContent) || 0);
    intervalRounds = parseInt(document.getElementById('roundsCount').textContent) || 1;
    
    if (intervalWorkSeconds === 0) intervalWorkSeconds = 30;
    if (intervalRestSeconds === 0) intervalRestSeconds = 15;
}

function updateIntervalPreview() {
    readIntervalValues();
    currentSeconds = intervalWorkSeconds;
    totalSeconds = intervalWorkSeconds;
    updateDisplayFromSeconds(currentSeconds);
    updateProgressCircle(currentSeconds, totalSeconds);
    currentRound = 1;
    currentPhase = 'work';
    timerStatus.textContent = `Интервал • Раунд 1/${intervalRounds} • Работа`;
}

function startInterval() {
    if (intervalTimerRunning) return;
    readIntervalValues();
    currentRound = 1;
    currentPhase = 'work';
    currentSeconds = intervalWorkSeconds;
    totalSeconds = intervalWorkSeconds;
    updateDisplayFromSeconds(currentSeconds);
    updateProgressCircle(currentSeconds, totalSeconds);
    intervalTimerRunning = true;
    isRunning = true;
    timerStatus.textContent = `🔥 Работа • Раунд 1/${intervalRounds}`;
    startTimer('interval');
}

function resetInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    intervalTimerRunning = false;
    isRunning = false;
    updateIntervalPreview();
}

function nextIntervalPhase() {
    if (currentPhase === 'work') {
        currentPhase = 'rest';
        currentSeconds = intervalRestSeconds;
        totalSeconds = intervalRestSeconds;
        timerStatus.textContent = `💤 Отдых • Раунд ${currentRound}/${intervalRounds}`;
        playSoundAlert('rest');
    } else {
        if (currentRound >= intervalRounds) {
            finishInterval();
            return;
        }
        currentRound++;
        currentPhase = 'work';
        currentSeconds = intervalWorkSeconds;
        totalSeconds = intervalWorkSeconds;
        timerStatus.textContent = `🔥 Работа • Раунд ${currentRound}/${intervalRounds}`;
        playSoundAlert('work');
    }
    updateDisplayFromSeconds(currentSeconds);
    updateProgressCircle(currentSeconds, totalSeconds);
}

function finishInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    intervalTimerRunning = false;
    isRunning = false;
    timerStatus.textContent = `✅ Завершено! ${intervalRounds} раундов`;
    playSoundAlert('finish');
    updateDisplayFromSeconds(0);
    updateProgressCircle(0, 1);
}

// ========== ОБЩИЙ ТАЙМЕР ==========
function startTimer(type) {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!isRunning) return;
        
        if (type === 'stopwatch') {
            currentSeconds++;
            updateDisplayFromSeconds(currentSeconds);
            updateProgressCircle(currentSeconds % 3600, 3600);
        } else if (type === 'countdown') {
            if (currentSeconds <= 0) {
                if (timerInterval) clearInterval(timerInterval);
                timerInterval = null;
                isRunning = false;
                timerStatus.textContent = '✅ Время вышло!';
                playSoundAlert('finish');
                return;
            }
            currentSeconds--;
            updateDisplayFromSeconds(currentSeconds);
            updateProgressCircle(currentSeconds, totalSeconds);
        } else if (type === 'interval') {
            if (currentSeconds <= 0) {
                nextIntervalPhase();
            } else {
                currentSeconds--;
                updateDisplayFromSeconds(currentSeconds);
                updateProgressCircle(currentSeconds, totalSeconds);
            }
        }
    }, 1000);
}

function updateDisplayFromSeconds(totalSecs) {
    const mins = Math.floor(Math.abs(totalSecs) / 60);
    const secs = Math.abs(totalSecs) % 60;
    timerMinutes.textContent = String(mins).padStart(2, '0');
    timerSeconds.textContent = String(secs).padStart(2, '0');
}

function updateProgressCircle(current, total) {
    let percent = total === 0 ? 0 : current / total;
    percent = Math.min(1, Math.max(0, percent));
    const dashoffset = CIRCUMFERENCE * (1 - percent);
    progressCircle.style.strokeDashoffset = dashoffset;
}

function playSoundAlert(phase = 'finish') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (phase === 'finish') {
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.3;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
        oscillator.stop(audioContext.currentTime + 0.5);
        
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 440;
            gain2.gain.value = 0.3;
            osc2.start();
            gain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
            osc2.stop(audioContext.currentTime + 0.5);
        }, 300);
    } else {
        oscillator.frequency.value = 660;
        gainNode.gain.value = 0.2;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // Показать визуальный фидбек
    showSoundToast();
}

function showSoundToast() {
    const toast = document.getElementById('soundToast');
    if (!toast) return;
    toast.style.display = 'block';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 800);
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Нижняя навигация
    const currentUserId = localStorage.getItem('currentUserId');
    const navProfileBottom = document.getElementById('navProfileBottom');
    const navMessagesBottom = document.getElementById('navMessagesBottom');
    const navBlocksBottom = document.getElementById('navBlocksBottom');
    
    if (navProfileBottom) {
        navProfileBottom.addEventListener('click', () => {
            if (currentUserId) window.location.href = '/user/' + currentUserId;
            else window.location.href = '/login.html';
        });
    }
    
    if (navMessagesBottom) {
        navMessagesBottom.addEventListener('click', () => {
            if (currentUserId) {
                if (typeof window.openMessagesModal === 'function') window.openMessagesModal();
                else window.location.href = '/user/' + currentUserId;
            } else {
                window.location.href = '/login.html';
            }
        });
    }
    
    if (navBlocksBottom) {
        navBlocksBottom.addEventListener('click', () => {
            window.location.href = '/blocks.html';
        });
    }
});