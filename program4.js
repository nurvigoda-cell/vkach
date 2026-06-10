// program4.js - Слайдер фото, экспорт PDF/TXT

// ПЕРЕМЕННЫЕ currentSliderExerciseId, currentSliderPhotoIndex, currentSliderPhotos
// УЖЕ ОПРЕДЕЛЕНЫ В program1.js, НЕ ОБЪЯВЛЯЙ ИХ ЗДЕСЬ СНОВА!

function openPhotoSlider(exerciseId, photoIndex) {
    const exercises = getCurrentExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise?.photos?.length) return;
    
    currentSliderExerciseId = exerciseId;
    currentSliderPhotoIndex = photoIndex;
    currentSliderPhotos = exercise.photos;
    
    const sliderModal = document.getElementById('sliderModal');
    const sliderImg = document.getElementById('sliderImg');
    const sliderCounter = document.getElementById('sliderCounter');
    
    sliderImg.src = currentSliderPhotos[currentSliderPhotoIndex];
    sliderCounter.textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
    sliderModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSlider() {
    document.getElementById('sliderModal').style.display = 'none';
    document.body.style.overflow = '';
}

function nextPhoto() {
    if (!currentSliderPhotos.length) return;
    currentSliderPhotoIndex = (currentSliderPhotoIndex + 1) % currentSliderPhotos.length;
    const sliderImg = document.getElementById('sliderImg');
    const sliderCounter = document.getElementById('sliderCounter');
    sliderImg.src = currentSliderPhotos[currentSliderPhotoIndex];
    sliderCounter.textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
}

function prevPhoto() {
    if (!currentSliderPhotos.length) return;
    currentSliderPhotoIndex = (currentSliderPhotoIndex - 1 + currentSliderPhotos.length) % currentSliderPhotos.length;
    document.getElementById('sliderImg').src = currentSliderPhotos[currentSliderPhotoIndex];
    document.getElementById('sliderCounter').textContent = `${currentSliderPhotoIndex + 1} / ${currentSliderPhotos.length}`;
}

// Генерация TXT
function generateTXT() {
    let txt = `${programData.title}\n${'='.repeat(programData.title.length)}\n📅 ${new Date().toLocaleDateString('ru-RU')}\n\n`;
    programData.days.forEach(day => {
        txt += `📌 ${day.name}\n${'-'.repeat(day.name.length + 2)}\n`;
        if (day.exercises.length === 0) {
            txt += `Нет упражнений\n\n`;
        } else {
            day.exercises.forEach((ex, idx) => {
                txt += `${idx + 1}. ${ex.name}\n`;
                ex.sets?.forEach((set, setIdx) => {
                    const reps = set.reps === '0' ? '—' : (set.reps || '—');
                    const weight = set.weight === '0' ? '—' : (set.weight || '—');
                    txt += `   Подход ${setIdx + 1}: ${reps} × ${weight} кг\n`;
                });
                if (ex.comments?.length) txt += `   💬 ${ex.comments[0]}\n`;
                txt += `\n`;
            });
        }
        if (day.comments?.trim()) txt += `📝 Заметки:\n${day.comments}\n\n`;
    });
    return txt;
}

function downloadTXT() {
    const content = generateTXT();
    try {
        const encoded = encodeURIComponent(content);
        const link = document.createElement('a');
        link.href = `data:application/octet-stream;charset=utf-8,${encoded}`;
        link.download = `${programData.title.replace(/[^a-zа-яё0-9]/gi, '_')}_тренировка.txt`;
        link.click();
    } catch (e) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${programData.title.replace(/[^a-zа-яё0-9]/gi, '_')}_тренировка.txt`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}

// PDF
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function generatePDF() {
    const pdfDialog = document.getElementById('pdfDialog');
    if (!pdfDialog) return;
    
    pdfDialog.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    if (typeof window.html2pdf === 'undefined') {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }
    
    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = 'background:#2a2a2a;padding:40px;font-family:Segoe UI,sans-serif;color:#fff;max-width:800px;margin:0 auto';
    
    let html = `<div style="text-align:center;margin-bottom:30px"><div style="background:linear-gradient(135deg,#E9AE67,#c4894a);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><span style="font-size:40px;">📋</span></div><h1 style="color:#E9AE67">${escapeHtml(programData.title)}</h1><p style="color:#aaa">📅 ${new Date().toLocaleDateString('ru-RU')}</p></div>`;
    
    programData.days.forEach((day, dayIdx) => {
        html += `<div style="margin-top:30px;page-break-before:${dayIdx > 0 ? 'always' : 'avoid'}"><div style="background:#444;border-radius:16px;padding:15px;margin-bottom:20px"><h2 style="color:#E9AE67;margin:0">📅 ${escapeHtml(day.name)}</h2></div>`;
        if (day.exercises.length === 0) {
            html += `<div style="text-align:center;padding:30px;background:#333;border-radius:16px"><p style="color:#999">Нет упражнений</p></div>`;
        } else {
            day.exercises.forEach((ex, idx) => {
                html += `<div style="margin-bottom:30px;page-break-inside:avoid;background:#333;border-radius:16px;padding:20px"><div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;border-bottom:2px solid #E9AE67;padding-bottom:10px"><div style="background:#E9AE67;color:#222;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold">${idx + 1}</div><h2 style="color:#E9AE67;margin:0">${escapeHtml(ex.name)}</h2></div>`;
                if (ex.photos?.length) {
                    html += `<div style="margin-bottom:15px;display:flex;gap:10px;flex-wrap:wrap">`;
                    ex.photos.slice(0, 4).forEach(photo => {
                        html += `<div style="width:70px;height:70px;border-radius:50%;overflow:hidden;border:2px solid #E9AE67"><img src="${photo}" style="width:100%;height:100%;object-fit:cover"></div>`;
                    });
                    html += `</div>`;
                }
                html += `<table style="width:100%;border-collapse:collapse;margin-bottom:15px"><thead><tr style="background:#444"><th style="padding:10px;border:1px solid #555;color:#E9AE67">Подход</th><th style="padding:10px;border:1px solid #555;color:#E9AE67">Повторения</th><th style="padding:10px;border:1px solid #555;color:#E9AE67">Вес/кг</th></table></thead><tbody>`;
                if (ex.sets?.length) {
                    ex.sets.forEach((set, setIdx) => {
                        const reps = set.reps === '0' ? '—' : (set.reps || '—');
                        const weight = set.weight === '0' ? '—' : (set.weight || '—');
                        html += `<tr><td style="padding:10px;border:1px solid #555;color:#ddd">${setIdx + 1}</td><td style="padding:10px;border:1px solid #555;color:#ddd">${escapeHtml(reps)}</td><td style="padding:10px;border:1px solid #555;color:#ddd">${escapeHtml(weight)}</td></tr>`;
                    });
                } else {
                    html += `<tr><td colspan="3" style="padding:10px;text-align:center;color:#666">Нет подходов</td><\/tr>`;
                }
                html += `</tbody></table>`;
                if (ex.comments?.length) {
                    html += `<div style="background:#444;padding:12px;border-radius:12px"><p style="font-weight:bold;color:#E9AE67;margin:0 0 8px">💬 Комментарии:</p>`;
                    ex.comments.forEach(c => html += `<p style="margin:6px 0;font-size:13px;color:#ccc">• ${escapeHtml(c)}</p>`);
                    html += `</div>`;
                }
                html += `</div>`;
            });
        }
        if (day.comments?.trim()) {
            html += `<div style="margin-top:20px;background:#2a2a2a;border-radius:12px;padding:15px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span>📝</span><h4 style="color:#E9AE67;margin:0">Заметки</h4></div><div style="color:#ccc;font-size:12px;white-space:pre-wrap">${escapeHtml(day.comments).replace(/\n/g, '<br>')}</div></div>`;
        }
        html += `</div>`;
    });
    
    pdfContainer.innerHTML = html;
    document.body.appendChild(pdfContainer);
    
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `${programData.title.replace(/[^a-zа-яё0-9]/gi, '_')}_тренировка.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#2a2a2a' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(pdfContainer).save();
    document.body.removeChild(pdfContainer);
    pdfDialog.style.display = 'none';
    document.body.style.overflow = '';
}

function openExportFormatModal() {
    document.getElementById('exportFormatModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeExportFormatModal() {
    document.getElementById('exportFormatModal').style.display = 'none';
    document.body.style.overflow = '';
}

function exportToFormat(format) {
    closeExportFormatModal();
    if (format === 'pdf') generatePDF();
    else if (format === 'txt') downloadTXT();
}

// Обработчики
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) shareBtn.addEventListener('click', openExportFormatModal);

const exportModalClose = document.querySelector('.export-modal-close');
const exportCancelBtn = document.querySelector('.export-cancel-btn');
if (exportModalClose) exportModalClose.addEventListener('click', closeExportFormatModal);
if (exportCancelBtn) exportCancelBtn.addEventListener('click', closeExportFormatModal);
document.querySelector('.pdf-option')?.addEventListener('click', () => exportToFormat('pdf'));
document.querySelector('.txt-option')?.addEventListener('click', () => exportToFormat('txt'));

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportFormatModal')) closeExportFormatModal();
    if (e.target === document.getElementById('sliderModal')) closeSlider();
    if (e.target === document.getElementById('pdfDialog')) {
        document.getElementById('pdfDialog').style.display = 'none';
        document.body.style.overflow = '';
    }
});

document.querySelector('.slider-close')?.addEventListener('click', closeSlider);
document.querySelector('.slider-prev')?.addEventListener('click', prevPhoto);
document.querySelector('.slider-next')?.addEventListener('click', nextPhoto);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('sliderModal')?.style.display === 'flex') closeSlider();
        if (document.getElementById('exportFormatModal')?.style.display === 'flex') closeExportFormatModal();
        if (document.getElementById('pdfDialog')?.style.display === 'flex') {
            document.getElementById('pdfDialog').style.display = 'none';
            document.body.style.overflow = '';
        }
    }
});

window.openPhotoSlider = openPhotoSlider;
window.closeSlider = closeSlider;
window.prevPhoto = prevPhoto;
window.nextPhoto = nextPhoto;