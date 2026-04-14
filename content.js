// Глобальные переменные
let isProcessing = false;

// 0. БРОНЕЖИЛЕТ ДЛЯ ПЛАГИНА (Проверка контекста)
function isExtensionValid() {
    // Проверяем, существует ли объект chrome, runtime и есть ли у него активный id
    return typeof chrome !== 'undefined' && chrome.runtime && !!chrome.runtime.id;
}

// 1. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА И СТИЛЕЙ
async function initUI() {
    if (!isExtensionValid()) return;
    
    const data = await chrome.storage.local.get(['targetUrl', 'isActive']);
    if (!data.targetUrl || !window.location.href.includes(data.targetUrl)) return;

    // Внедряем стили
    const style = document.createElement('style');
    style.innerHTML = `
        #plugin-fab { position: fixed; bottom: 20px; right: 20px; z-index: 999999; width: 50px; height: 50px; background-color: #2196F3; color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.2); font-size: 24px; font-family: Arial; }
        #plugin-modal { position: fixed; bottom: 80px; right: 20px; z-index: 999999; width: 420px; box-sizing: border-box; background: white; border: 1px solid #ccc; box-shadow: 0 4px 12px rgba(0,0,0,0.3); padding: 15px; font-family: Arial, sans-serif; display: none; max-height: 80vh; overflow-y: auto; overflow-x: hidden; color: black; border-radius: 8px; }
        #plugin-modal h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .plugin-row { display: flex; gap: 8px; margin-bottom: 5px; align-items: center; width: 100%; }
        .plugin-row input { flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 3px; box-sizing: border-box; min-width: 0; font-size: 13px; }
        .plugin-btn { margin-top: 10px; width: 100%; padding: 6px; cursor: pointer; border: none; border-radius: 4px; box-sizing: border-box; }
        .btn-delete { background: #ff4d4d; color: white; border: none; cursor: pointer; padding: 6px 10px; border-radius: 3px; font-weight: bold; }
        #plugin-logs { height: 100px; overflow-y: auto; overflow-x: hidden; background: #f4f4f4; padding: 5px; font-size: 11px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px; word-wrap: break-word; }
        .log-entry { border-bottom: 1px dashed #ccc; padding: 2px 0; color: #333; }
        .schedule-section { background: #f9f9f9; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 13px; border: 1px solid #eee; box-sizing: border-box; }
        .days-row { display: flex; flex-wrap: wrap; gap: 5px; margin: 5px 0; }
        .day-label { font-size: 11px; display: flex; align-items: center; gap: 2px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // Создаем кнопку в правом нижнем углу
    const fab = document.createElement('div');
    fab.id = 'plugin-fab';
    fab.innerText = '⚙️';
    document.body.appendChild(fab);

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'plugin-modal';
    modal.innerHTML = `
        <h3>Настройки парсера</h3>
        <button id="togglePlugin" style="background:#4CAF50; color:white; width:100%; padding:8px; margin-bottom:10px;">Запустить мониторинг</button>
        
        <h4>Правила (Подтип -> Папка)</h4>
        <div id="rulesContainer"></div>
        <button id="addRuleBtn" class="plugin-btn">+ Добавить правило</button>
        
        <div class="schedule-section">
            <h4>Расписание и Перезагрузка</h4>
            <div class="days-row" id="schedule-days">
                <label class="day-label"><input type="checkbox" value="1"> Пн</label>
                <label class="day-label"><input type="checkbox" value="2"> Вт</label>
                <label class="day-label"><input type="checkbox" value="3"> Ср</label>
                <label class="day-label"><input type="checkbox" value="4"> Чт</label>
                <label class="day-label"><input type="checkbox" value="5"> Пт</label>
                <label class="day-label"><input type="checkbox" value="6"> Сб</label>
                <label class="day-label"><input type="checkbox" value="0"> Вс</label>
            </div>
            <div style="margin-top:5px; font-size:12px;">
                Часы: с <input type="number" id="h-start" min="0" max="23" style="width:40px"> 
                до <input type="number" id="h-end" min="0" max="24" style="width:40px">
            </div>
            <div style="margin-top:5px; font-size:12px;">
                Обновление страницы (мин): <input type="number" id="reload-interval" min="1" style="width:50px">
            </div>
        </div>

        <button id="saveSettingsBtn" class="plugin-btn" style="background:#2196F3; color:white; margin-top:10px;">Сохранить настройки</button>
        
        <h4>Логи</h4>
        <div id="plugin-logs"></div>

        <h4 style="margin-top:15px;">Резервная копия (JSON)</h4>
        <div style="display:flex; gap:5px;">
            <button id="exportBtn" class="plugin-btn" style="flex:1;">Экспорт</button>
            <button id="importBtnTrigger" class="plugin-btn" style="flex:1;">Импорт</button>
            <input type="file" id="importFile" accept=".json" style="display:none;">
        </div>
    `;
    document.body.appendChild(modal);

    // Обработчики событий интерфейса
    fab.addEventListener('click', () => {
        modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'block' : 'none';
        renderSettings();
        renderLogs();
    });

    document.getElementById('togglePlugin').addEventListener('click', async () => {
        if (!isExtensionValid()) return window.location.reload();
        const currentData = await chrome.storage.local.get(['isActive']);
        const newState = !currentData.isActive;
        
        await chrome.storage.local.set({ isActive: newState });
        updateToggleBtn(newState);
        
        if (newState) {
            logEvent('Мониторинг запущен вручную');
            await markExistingAsProcessed(); 
        } else {
            logEvent('Мониторинг остановлен');
        }
    });

    document.getElementById('addRuleBtn').addEventListener('click', () => addRuleRow('', ''));
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtnTrigger').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importData);

    updateToggleBtn(data.isActive || false);
    renderSettings();
}

function updateToggleBtn(isActive) {
    const btn = document.getElementById('togglePlugin');
    if (!btn) return;
    btn.innerText = isActive ? 'Остановить мониторинг' : 'Запустить мониторинг';
    btn.style.background = isActive ? '#f44336' : '#4CAF50';
}

// 2. УПРАВЛЕНИЕ НАСТРОЙКАМИ И РЕНДЕР UI
function addRuleRow(subtype, folder) {
    const container = document.getElementById('rulesContainer');
    const div = document.createElement('div');
    div.className = 'plugin-row';
    div.innerHTML = `
        <input type="text" class="r-subtype" value="${subtype}" placeholder="Подтип">
        <input type="text" class="r-folder" value="${folder}" placeholder="Папка">
        <button class="btn-delete" title="Удалить правило">×</button>
    `;
    div.querySelector('.btn-delete').onclick = () => div.remove();
    container.appendChild(div);
}

function renderSettings() {
    if (!isExtensionValid()) return;
    chrome.storage.local.get({ 
        rules: {}, 
        schedule: { days: [1,2,3,4,5], start: 8, end: 20, interval: 15 } 
    }, (data) => {
        const container = document.getElementById('rulesContainer');
        if (container) {
            container.innerHTML = '';
            for (const [subtype, folder] of Object.entries(data.rules)) addRuleRow(subtype, folder);
            if (Object.keys(data.rules).length === 0) addRuleRow('', '');
        }
        const sched = data.schedule;
        document.querySelectorAll('#schedule-days input').forEach(cb => {
            cb.checked = sched.days.includes(parseInt(cb.value));
        });
        if (document.getElementById('h-start')) document.getElementById('h-start').value = sched.start;
        if (document.getElementById('h-end')) document.getElementById('h-end').value = sched.end;
        if (document.getElementById('reload-interval')) document.getElementById('reload-interval').value = sched.interval;
    });
}

function saveSettings() {
    if (!isExtensionValid()) return window.location.reload();
    const rules = {};
    document.querySelectorAll('.plugin-row').forEach(row => {
        const subtype = row.querySelector('.r-subtype').value.trim();
        const folder = row.querySelector('.r-folder').value.trim();
        if (subtype && folder) rules[subtype] = folder;
    });

    const days = Array.from(document.querySelectorAll('#schedule-days input:checked')).map(cb => parseInt(cb.value));
    const schedule = {
        days: days,
        start: parseInt(document.getElementById('h-start').value) || 0,
        end: parseInt(document.getElementById('h-end').value) || 24,
        interval: parseInt(document.getElementById('reload-interval').value) || 15
    };

    chrome.storage.local.set({ rules, schedule }, () => {
        logEvent('Настройки успешно сохранены');
        const btn = document.getElementById('saveSettingsBtn');
        const oldText = btn.innerText;
        btn.innerText = 'Сохранено ✓';
        setTimeout(() => btn.innerText = oldText, 2000);
    });
}

// 3. ЛОГИРОВАНИЕ
function logEvent(message) {
    if (!isExtensionValid()) return;
    const time = new Date().toLocaleTimeString();
    chrome.storage.local.get({ logs: [] }, (data) => {
        const logs = data.logs;
        logs.unshift(`[${time}] ${message}`);
        if (logs.length > 200) logs.pop();
        chrome.storage.local.set({ logs }, renderLogs);
    });
}

function renderLogs() {
    if (!isExtensionValid()) return;
    chrome.storage.local.get({ logs: [] }, (data) => {
        const logsContainer = document.getElementById('plugin-logs');
        if(logsContainer) logsContainer.innerHTML = data.logs.map(l => `<div class="log-entry">${l}</div>`).join('');
    });
}

// 4. ЭКСПОРТ / ИМПОРТ
function exportData() {
    if (!isExtensionValid()) return window.location.reload();
    chrome.storage.local.get(null, (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `plugin_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        logEvent('Создана резервная копия настроек');
    });
}

function importData(e) {
    if (!isExtensionValid()) return window.location.reload();
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            chrome.storage.local.set(data, () => {
                logEvent('Конфигурация успешно импортирована');
                renderSettings();
                renderLogs();
                updateToggleBtn(data.isActive || false);
                document.getElementById('importFile').value = "";
            });
        } catch (err) { alert('Ошибка чтения JSON файла'); }
    };
    reader.readAsText(file);
}

// 5. ЛОГИКА ПАРСИНГА И РАСПИСАНИЯ
async function markExistingAsProcessed() {
    const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
    const idIndex = headers.findIndex(h => h.includes('Идентификатор'));
    if (idIndex === -1) return;

    if (!isExtensionValid()) return;
    const data = await chrome.storage.local.get({ processedIds: [] });
    const processedIds = new Set(data.processedIds);
    let count = 0;
    
    document.querySelectorAll('tbody tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > idIndex) {
            const id = cells[idIndex].innerText.trim();
            if (id && !processedIds.has(id)) { processedIds.add(id); count++; }
        }
    });
    
    if (!isExtensionValid()) return;
    await chrome.storage.local.set({ processedIds: Array.from(processedIds) });
    if (count > 0) logEvent(`Добавлено ${count} старых записей в игнор-лист`);
}

async function checkSchedule() {
    if (!isExtensionValid()) return false;
    const data = await chrome.storage.local.get({
        schedule: { days: [1,2,3,4,5], start: 8, end: 20, interval: 15 },
        lastReload: 0,
        isActive: false
    });

    if (!data.isActive) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();

    const isWorkingDay = data.schedule.days.includes(currentDay);
    const isWorkingHour = currentHour >= data.schedule.start && currentHour < data.schedule.end;

    if (!isWorkingDay || !isWorkingHour) return false;

    const minutesSinceLastReload = (now.getTime() - data.lastReload) / 60000;
    if (minutesSinceLastReload >= data.schedule.interval) {
        logEvent("⏱ Плановая перезагрузка страницы...");
        if (isExtensionValid()) await chrome.storage.local.set({ lastReload: now.getTime() });
        location.reload(); 
        return false;
    }
    return true; 
}

async function checkTable() {
    if (isProcessing) return;
    
    try {
        const canRun = await checkSchedule();
        if (!canRun) return;

        isProcessing = true;

        if (!isExtensionValid()) throw new Error("Extension context invalidated");
        const data = await chrome.storage.local.get({ rules: {}, processedIds: [], isActive: false });
        if (!data.isActive) { isProcessing = false; return; }

        const rules = data.rules;
        const processedIds = data.processedIds;

        const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
        const idIndex = headers.findIndex(h => h.includes('Идентификатор'));
        const subtypeIndex = headers.findIndex(h => h.includes('Подтип рассылки'));

        if (idIndex === -1 || subtypeIndex === -1) { isProcessing = false; return; }

        const rows = document.querySelectorAll('tbody tr');

        for (const row of rows) {
            if (!isExtensionValid()) throw new Error("Extension context invalidated");
            const currentData = await chrome.storage.local.get(['isActive']);
            if(!currentData.isActive) break; 

            const cells = row.querySelectorAll('td');
            if (cells.length === 0) continue;

            const id = cells[idIndex]?.innerText.trim();
            const subtype = cells[subtypeIndex]?.innerText.trim();

            if (id && !processedIds.includes(id) && rules[subtype]) {
                logEvent(`Обработка новой записи: ${id} (${subtype})`);
                
                if (!isExtensionValid()) throw new Error("Extension context invalidated");
                await chrome.runtime.sendMessage({ action: "setNextDownloadFolder", folder: rules[subtype] });
                row.click();

                const btnFound = await waitForElement('.mc-button-overlay', 5000);
                if (btnFound) {
                    document.querySelector('.mc-button-overlay').click();
                    processedIds.push(id);
                    
                    if (!isExtensionValid()) throw new Error("Extension context invalidated");
                    await chrome.storage.local.set({ processedIds });
                    logEvent(`✅ Отправлен на скачивание в /${rules[subtype]}`);
                    await sleep(2500); 
                } else {
                    logEvent(`❌ Ошибка: Кнопка скачивания для ${id} не появилась`);
                }
            }
        }
    } catch (error) {
        if (error.message && error.message.includes("Extension context invalidated")) {
            console.warn("Контекст плагина устарел. Перезагружаю страницу для обновления...");
            window.location.reload();
        } else {
            console.error("Внутренняя ошибка парсера:", error);
        }
    } finally {
        isProcessing = false;
    }
}

// 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function waitForElement(selector, timeout) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) return resolve(true);
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect(); resolve(true);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(false); }, timeout);
    });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// 7. БЕЗОПАСНЫЙ И "ТИХИЙ" ЗАПУСК
let mainTimer = setInterval(() => {
    // Проверяем пульс. Если контекста нет — молча останавливаем таймер и делаем F5
    if (!isExtensionValid()) {
        clearInterval(mainTimer);
        window.location.reload();
        return;
    }
    
    // Запускаем парсер и фильтруем системные ошибки
    checkTable().catch(e => {
        // Если ошибка всё же проскочила, просто игнорируем её
        if (e.message && e.message.includes("Extension context invalidated")) {
            return; 
        }
        // В лог попадут только реальные ошибки (например, если на сайте изменится дизайн)
        console.error("Ошибка парсера:", e);
    });
}, 5000);

setTimeout(() => {
    if (isExtensionValid()) initUI();
}, 1000);