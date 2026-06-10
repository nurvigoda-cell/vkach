// Трекер препаратов v4

const API = '/api/injection';
let userId = localStorage.getItem('currentUserId');

let drugs   = [];
let logs    = [];
let selectedCalDate = null;
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let addDrugColor = '#E9AE67';

const MONTHS_RU  = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const n=new Date(); return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`; }
function formatDateFull(str){ if(!str) return ''; const dt=new Date(str+'T00:00:00'); return `${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]} ${dt.getFullYear()}`; }
function nowTime(){ const n=new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; }
function uid(){ return 'log_'+Date.now()+'_'+Math.random().toString(36).substr(2,5); }
function esc(s){ if(!s) return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ===== ХРАНИЛИЩЕ =====
function saveLocal(){
    localStorage.setItem('inj_drugs_v3', JSON.stringify(drugs));
    localStorage.setItem('inj_logs_v3',  JSON.stringify(logs));
}
function loadLocal(){
    const d=localStorage.getItem('inj_drugs_v3');
    const l=localStorage.getItem('inj_logs_v3');
    if(d) try{ drugs=JSON.parse(d); }catch(e){}
    if(l) try{ logs=JSON.parse(l);  }catch(e){}
}

// ===== API =====
async function syncToServer(){
    if(!userId) return;
    try{
        await fetch(`${API}/protocol`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ userId, protocol: JSON.stringify({ v3:true, drugs, logs }) })
        });
    }catch(e){ console.error('sync error',e); }
}
async function loadFromServer(){
    if(!userId) return;
    try{
        const r=await fetch(`${API}/protocol/${userId}`);
        const j=await r.json();
        if(j.success && j.protocol){
            try{
                const p=JSON.parse(j.protocol);
                if(p.v3){ drugs=p.drugs||[]; logs=p.logs||[]; }
            }catch(e){}
        }
    }catch(e){ console.error('load error',e); }
}

// ===== ПРЕПАРАТЫ =====
function renderDrugs(){
    const c=document.getElementById('drugsList');
    if(!c) return;
    if(drugs.length===0){
        c.innerHTML='<div class="empty-drugs">📦 Нет препаратов. Нажмите «+ Добавить»</div>';
        return;
    }
    c.innerHTML=drugs.map((d,i)=>`
        <div class="drug-item" style="animation-delay:${i*0.05}s">
            <div class="drug-color" style="background:${d.color}"></div>
            <div class="drug-info">
                <div class="drug-name">${esc(d.name)}</div>
                ${d.dose?`<div class="drug-dose">${esc(d.dose)}</div>`:''}
            </div>
            <button class="drug-use-btn" onclick="useDrug('${d.id}')">💉 Исп.</button>
            <button class="drug-del" onclick="deleteDrug(event,'${d.id}')">🗑️</button>
        </div>
    `).join('');
}

function deleteDrug(e, drugId){
    e.stopPropagation();
    const drug=drugs.find(d=>d.id===drugId);
    if(!drug) return;
    if(!confirm(`Удалить «${drug.name}»?`)) return;
    drugs=drugs.filter(d=>d.id!==drugId);
    saveLocal(); syncToServer();
    renderDrugs(); renderCalendar(); renderStats();
    if(selectedCalDate) renderHistoryDay(selectedCalDate);
    showToast(`🗑️ «${drug.name}» удалён`);
}

function openAddDrug(){
    document.getElementById('drugNameInput').value='';
    document.getElementById('drugDoseInput').value='';
    addDrugColor='#E9AE67';
    document.querySelectorAll('.cp-dot').forEach(b=>b.classList.toggle('active',b.dataset.c==='#E9AE67'));
    document.getElementById('addDrugModal').classList.add('open');
}

function saveDrug(){
    const name=document.getElementById('drugNameInput').value.trim();
    const dose=document.getElementById('drugDoseInput').value.trim();
    if(!name){ showToast('❗ Введите название'); return; }
    drugs.push({ id:'drug_'+Date.now(), name, dose, color:addDrugColor });
    document.getElementById('addDrugModal').classList.remove('open');
    saveLocal(); syncToServer();
    renderDrugs();
    showToast(`✅ «${name}» добавлен`);
}

// ===== ИСПОЛЬЗОВАЛ (для конкретной даты) =====
function useDrug(drugId){
    // Всегда используем выбранную дату (или сегодня)
    const targetDate = selectedCalDate || todayStr();
    const today = todayStr();
    const drug=drugs.find(d=>d.id===drugId);
    if(!drug) return;

    // Время: если прошлый день — спрашиваем; если сегодня — текущее время
    let time;
    if(targetDate !== today){
        const inputTime = prompt(
            `Добавить «${drug.name}» на ${formatDateFull(targetDate)}\nВведите время (ЧЧ:ММ) или оставьте пустым:`,
            '12:00'
        );
        if(inputTime === null) return; // отмена
        time = inputTime.trim() || '00:00';
        // Проверяем формат
        if(!/^\d{1,2}:\d{2}$/.test(time)) time = '12:00';
    } else {
        time = nowTime();
    }

    const entry={
        id:uid(), date:targetDate, time,
        drugId:drug.id, drugName:drug.name,
        drugDose:drug.dose||'', drugColor:drug.color
    };
    logs.push(entry);
    // Сортируем по дате+времени
    logs.sort((a,b)=> (a.date+a.time) > (b.date+b.time) ? 1 : -1);

    saveLocal(); syncToServer();
    renderTodayUses();
    renderCalendar();
    renderStats();
    renderHistoryDay(targetDate);

    if(targetDate !== today){
        showToast(`✅ ${drug.name} добавлен в ${formatDateFull(targetDate)}`);
    } else {
        showToast(`💉 ${drug.name} — ${time}`);
    }
}

// ===== ЖУРНАЛ СЕГОДНЯ =====
function renderTodayUses(){
    const today=todayStr();
    const c=document.getElementById('todayUses');
    const card=document.getElementById('todayUsesCard');
    if(!c) return;
    const todayLogs=logs.filter(l=>l.date===today).slice().reverse();
    if(todayLogs.length===0){
        c.innerHTML='';
        c.style.maxHeight='';
        c.classList.remove('scrollable');
        if(card) card.style.display='none';
        return;
    }
    if(card) card.style.display='';
    c.innerHTML=todayLogs.map(l=>`
        <div class="use-log-item">
            <div class="use-log-color" style="background:${l.drugColor}"></div>
            <div class="use-log-icon">💉</div>
            <div class="use-log-info">
                <div class="use-log-name">${esc(l.drugName)}${l.drugDose?' — '+esc(l.drugDose):''}</div>
                <div class="use-log-time">${l.time}</div>
            </div>
            <button class="use-log-del" onclick="deleteLog('${l.id}')">🗑️</button>
        </div>
    `).join('');

    // Скролл после 5 элементов
    const maxVisible=5;
    if(todayLogs.length>maxVisible){
        requestAnimationFrame(()=>{
            const item=c.querySelector('.use-log-item');
            const itemH=item ? item.offsetHeight+5 : 44;
            c.style.maxHeight=(itemH*maxVisible)+'px';
            c.classList.add('scrollable');
        });
    } else {
        c.style.maxHeight='';
        c.classList.remove('scrollable');
    }
}

function deleteLog(logId){
    logs=logs.filter(l=>l.id!==logId);
    saveLocal(); syncToServer();
    renderTodayUses();
    renderCalendar();
    renderStats();
    const today=todayStr();
    if(selectedCalDate===today) renderHistoryDay(today);
}

// ===== ТЕКУЩИЙ ДЕНЬ =====
function renderCurrentDay(){
    const today=todayStr();
    const dt=new Date(today+'T00:00:00');
    const el=document.getElementById('currentDayValue');
    if(el) el.textContent=`${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ===== КАЛЕНДАРЬ =====
function renderCalendar(){
    const today=todayStr();
    const todayDt=new Date(today+'T00:00:00');
    const c=document.getElementById('calDaysRow');
    if(!c) return;
    document.getElementById('calMonthTitle').textContent=`${MONTHS_RU[calMonth]} ${calYear}`;

    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    const isCurrentMonth=(calYear===todayDt.getFullYear()&&calMonth===todayDt.getMonth());
    const isPastMonth=(calYear*100+calMonth)<(todayDt.getFullYear()*100+todayDt.getMonth());
    const maxDay=isCurrentMonth ? todayDt.getDate() : (isPastMonth ? daysInMonth : 0);

    document.getElementById('calNext').disabled=isCurrentMonth;

    let html='';
    for(let d=1;d<=maxDay;d++){
        const ds=`${calYear}-${pad(calMonth+1)}-${pad(d)}`;
        const dt2=new Date(ds+'T00:00:00');
        const dow=DAYS_SHORT[dt2.getDay()];
        const isToday=ds===today;
        const isSel=ds===selectedCalDate;

        const dayLogs=logs.filter(l=>l.date===ds);
        const uniqueDrugs=[...new Map(dayLogs.map(l=>[l.drugId,l])).values()];
        const dotsHtml=uniqueDrugs.slice(0,4).map(l=>
            `<div class="cal-dot" style="background:${l.drugColor}"></div>`
        ).join('');

        html+=`<div class="cal-day${isToday?' today':''}${isSel?' selected':''}"
            data-date="${ds}" onclick="selectCalDay('${ds}')">
            <div class="cal-day-dow">${dow}</div>
            <div class="cal-day-num">${d}</div>
            <div class="cal-day-dots">${dotsHtml}</div>
        </div>`;
    }
    c.innerHTML=html;

    setTimeout(()=>{
        const el=c.querySelector(`[data-date="${selectedCalDate||today}"]`);
        if(el) el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
    },50);
}

function selectCalDay(ds){
    selectedCalDate=ds;
    renderCalendar();
    renderHistoryDay(ds);
    // Прокручиваем к блоку истории
    setTimeout(()=>{
        const el=document.getElementById('historyDayCard');
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    },100);
}

// ===== ИСТОРИЯ ДНЯ =====
function renderHistoryDay(ds){
    const title=document.getElementById('historyDayTitle');
    const list=document.getElementById('historyDayList');
    const addBtn=document.getElementById('historyDayAddBtn');
    if(!title||!list) return;

    const today=todayStr();
    const isPast=ds<today;
    const dt=new Date(ds+'T00:00:00');
    const dateStr=`${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]} ${dt.getFullYear()}`;

    // Заголовок + метка если прошлый день
    title.innerHTML=dateStr+(isPast?' <span class="past-badge">прошлый</span>':'');

    // Кнопки добавить препарат в прошлый/текущий день
    if(addBtn){
        addBtn.style.display=drugs.length>0?'':'none';
        addBtn.textContent=isPast?'+ Добавить в этот день':'+ Добавить сейчас';
        addBtn.onclick=()=>showAddToDayPanel(ds);
    }

    const dayLogs=logs.filter(l=>l.date===ds).slice().reverse();
    if(dayLogs.length===0){
        list.innerHTML='<div class="empty-history">В этот день нет записей</div>';
        return;
    }
    list.innerHTML=dayLogs.map((l,i)=>`
        <div class="hist-item" style="animation-delay:${i*0.05}s">
            <div class="hist-clr" style="background:${l.drugColor}"></div>
            <div class="hist-icon">💉</div>
            <div class="hist-info">
                <div class="hist-name">${esc(l.drugName)}${l.drugDose?' — '+esc(l.drugDose):''}</div>
                <div class="hist-time">${l.time}</div>
            </div>
            <button class="hist-del" onclick="deleteLogFromHistory('${l.id}','${ds}')">🗑️</button>
        </div>
    `).join('');
}

// ===== ПАНЕЛЬ ДОБАВЛЕНИЯ В ДЕНЬ =====
function showAddToDayPanel(ds){
    const today=todayStr();
    const isPast=ds<today;

    // Открываем модал с выбором препарата для этого дня
    const modal=document.getElementById('addToDayModal');
    const title=document.getElementById('addToDayTitle');
    const drugsList=document.getElementById('addToDayDrugsList');
    const timeInput=document.getElementById('addToDayTime');

    title.textContent=`Добавить в ${formatDateFull(ds)}`;
    timeInput.style.display=isPast?'':'none';
    document.getElementById('addToDayTimeLabel').style.display=isPast?'':'none';
    if(isPast) timeInput.value='12:00';

    drugsList.innerHTML=drugs.map(d=>`
        <div class="atd-drug-item" onclick="addToDayConfirm('${d.id}','${ds}')">
            <div class="atd-drug-color" style="background:${d.color}"></div>
            <div class="atd-drug-info">
                <div class="atd-drug-name">${esc(d.name)}</div>
                ${d.dose?`<div class="atd-drug-dose">${esc(d.dose)}</div>`:''}
            </div>
            <div class="atd-drug-arrow">→</div>
        </div>
    `).join('');

    modal.classList.add('open');
}

function addToDayConfirm(drugId, ds){
    const drug=drugs.find(d=>d.id===drugId);
    if(!drug) return;
    const today=todayStr();
    const isPast=ds<today;

    let time;
    if(isPast){
        const inp=document.getElementById('addToDayTime');
        time=inp && inp.value ? inp.value : '12:00';
        if(!/^\d{1,2}:\d{2}$/.test(time)) time='12:00';
    } else {
        time=nowTime();
    }

    const entry={
        id:uid(), date:ds, time,
        drugId:drug.id, drugName:drug.name,
        drugDose:drug.dose||'', drugColor:drug.color
    };
    logs.push(entry);
    logs.sort((a,b)=>(a.date+a.time)>(b.date+b.time)?1:-1);

    document.getElementById('addToDayModal').classList.remove('open');
    saveLocal(); syncToServer();
    renderCalendar();
    renderStats();
    renderHistoryDay(ds);
    if(ds===today) renderTodayUses();

    showToast(isPast
        ? `✅ ${drug.name} добавлен в ${formatDateFull(ds)}`
        : `💉 ${drug.name} — ${time}`
    );
}

function deleteLogFromHistory(logId, ds){
    logs=logs.filter(l=>l.id!==logId);
    saveLocal(); syncToServer();
    renderHistoryDay(ds);
    renderCalendar();
    renderStats();
    const today=todayStr();
    if(ds===today) renderTodayUses();
    showToast('🗑️ Запись удалена');
}

// ===== СТАТИСТИКА =====
function renderStats(){
    const today=todayStr();
    const dt=new Date(today+'T00:00:00');
    const m=dt.getMonth(); const y=dt.getFullYear();
    const todayCount=logs.filter(l=>l.date===today).length;
    const monthCount=logs.filter(l=>{
        if(!l.date) return false;
        const [ly,lm]=l.date.split('-');
        return parseInt(ly)===y&&parseInt(lm)-1===m;
    }).length;
    document.getElementById('statToday').textContent=todayCount;
    document.getElementById('statMonth').textContent=monthCount;
    document.getElementById('statMonthName').textContent=MONTHS_NOM[m];
}

// ===== ТОСТ =====
function showToast(msg){
    document.querySelectorAll('.toast').forEach(t=>t.remove());
    const t=document.createElement('div');
    t.className='toast'; t.textContent=msg;
    document.body.appendChild(t);
    setTimeout(()=>{ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(()=>t.remove(),300); },2500);
}

// ===== НАВИГАЦИЯ МЕСЯЦА =====
function setupCalNav(){
    document.getElementById('calPrev').onclick=()=>{
        calMonth--; if(calMonth<0){ calMonth=11; calYear--; }
        selectedCalDate=null;
        document.getElementById('historyDayList').innerHTML='<div class="empty-history">Нажмите на день в календаре</div>';
        document.getElementById('historyDayTitle').innerHTML='История дня';
        const addBtn=document.getElementById('historyDayAddBtn');
        if(addBtn) addBtn.style.display='none';
        renderCalendar();
    };
    document.getElementById('calNext').onclick=()=>{
        const todayDt=new Date(todayStr()+'T00:00:00');
        if(calYear===todayDt.getFullYear()&&calMonth===todayDt.getMonth()) return;
        calMonth++; if(calMonth>11){ calMonth=0; calYear++; }
        renderCalendar();
    };
}

function setupNav(){
    const uid2=localStorage.getItem('currentUserId');
    document.getElementById('navProfileBottom')?.addEventListener('click',()=>uid2?location.href='/user/'+uid2:location.href='/login.html');
    document.getElementById('navMessagesBottom')?.addEventListener('click',()=>uid2?(typeof openMessagesModal==='function'?openMessagesModal():location.href='/user/'+uid2):location.href='/login.html');
    document.getElementById('navBlocksBottom')?.addEventListener('click',()=>location.href='/blocks.html');
}

function setupCurrentDayClick(){
    document.getElementById('currentDayValue').onclick=()=>{
        const today=todayStr();
        calYear=new Date().getFullYear();
        calMonth=new Date().getMonth();
        selectedCalDate=today;
        renderCalendar();
        renderHistoryDay(today);
    };
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function init(){
    userId=localStorage.getItem('currentUserId');
    loadLocal();
    if(userId) await loadFromServer();

    selectedCalDate=todayStr();
    renderCurrentDay();
    renderDrugs();
    renderTodayUses();
    renderCalendar();
    renderHistoryDay(selectedCalDate);
    renderStats();

    setupCalNav();
    setupNav();
    setupCurrentDayClick();

    document.getElementById('openAddDrugBtn').onclick=openAddDrug;
    document.getElementById('closeAddDrugModal').onclick=()=>document.getElementById('addDrugModal').classList.remove('open');
    document.getElementById('cancelAddDrug').onclick=()=>document.getElementById('addDrugModal').classList.remove('open');
    document.getElementById('saveDrugBtn').onclick=saveDrug;
    document.getElementById('closeAddToDayModal')?.addEventListener('click',()=>document.getElementById('addToDayModal').classList.remove('open'));
    document.getElementById('addToDayModal')?.addEventListener('click',(e)=>{ if(e.target===document.getElementById('addToDayModal')) document.getElementById('addToDayModal').classList.remove('open'); });

    document.querySelectorAll('.cp-dot').forEach(b=>{
        b.onclick=()=>{ addDrugColor=b.dataset.c; document.querySelectorAll('.cp-dot').forEach(x=>x.classList.toggle('active',x===b)); };
    });
    document.getElementById('addDrugModal').onclick=(e)=>{ if(e.target===document.getElementById('addDrugModal')) document.getElementById('addDrugModal').classList.remove('open'); };
    document.getElementById('drugNameInput').addEventListener('keydown',e=>{ if(e.key==='Enter') saveDrug(); });
}

document.addEventListener('DOMContentLoaded',init);
