// settings.js - Настройки и темы (компактная версия)

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        // Обновляем кнопки в настройках
        const darkBtn = document.getElementById('darkThemeBtnSettings');
        const lightBtn = document.getElementById('lightThemeBtnSettings');
        if (darkBtn) darkBtn.classList.add('active');
        if (lightBtn) lightBtn.classList.remove('active');
    } else {
        document.body.classList.remove('dark-theme');
        // Обновляем кнопки в настройках
        const darkBtn = document.getElementById('darkThemeBtnSettings');
        const lightBtn = document.getElementById('lightThemeBtnSettings');
        if (lightBtn) lightBtn.classList.add('active');
        if (darkBtn) darkBtn.classList.remove('active');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Функции для настроек с сервера
async function loadSettingsFromServer() {
    if (!authToken) {
        console.log('Нет токена для загрузки настроек');
        return;
    }
    
    console.log('Загрузка настроек с сервера...');
    
    const serverSettingsContainer = document.getElementById('serverSettingsContainer');
    if (!serverSettingsContainer) return;
    
    serverSettingsContainer.innerHTML = '<div class="loading-settings"><p>Загрузка настроек с сервера...</p></div>';
    
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/get_settings`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken
            })
        });
        
        console.log('Настройки загружены:', response);
        serverSettingsContainer.innerHTML = '';
        
        if (response.status === 0 && response.data && Array.isArray(response.data) && response.data.length > 0) {
            serverSettings = response.data;
            
            // Создаем компактный контейнер с табами
            const settingsWrapper = document.createElement('div');
            settingsWrapper.className = 'compact-settings-container';
            
            // Создаем табы для каждой модели
            const tabsContainer = document.createElement('div');
            tabsContainer.className = 'settings-tabs';
            
            response.data.forEach((setting, index) => {
                const tab = document.createElement('button');
                tab.className = 'settings-tab';
                tab.textContent = `Модель #${index + 1}`;
                tab.setAttribute('data-index', index);
                
                if (index === 0) tab.classList.add('active');
                
                tab.onclick = function() {
                    // Убираем активный класс у всех табов
                    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    // Показываем соответствующую панель
                    document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
                    document.getElementById(`settings-panel-${index}`).style.display = 'block';
                };
                
                tabsContainer.appendChild(tab);
            });
            
            settingsWrapper.appendChild(tabsContainer);
            
            // Создаем панели для каждой модели
            const panelsContainer = document.createElement('div');
            panelsContainer.className = 'settings-panels';
            
            response.data.forEach((setting, index) => {
                const panel = document.createElement('div');
                panel.className = 'settings-panel';
                panel.id = `settings-panel-${index}`;
                panel.setAttribute('data-index', index);
                
                // Скрываем все панели кроме первой
                if (index !== 0) {
                    panel.style.display = 'none';
                }
                
                let content = `
                    <div class="panel-header">
                        <h4>Настройки модели #${index + 1}</h4>
                        <div class="model-id">ID: ${escapeHtml(setting.id || 'Не указан')}</div>
                    </div>
                    
                    <div class="settings-grid">
                        <div class="settings-group">
                            <h5><i class="fas fa-brain"></i> Основные параметры</h5>
                `;
                
                // Группа 1: Основные параметры
                content += createCompactSettingField('num_predict', setting.num_predict || 128, 'Макс. токены', 
                    'Ограничивает максимальное количество токенов в ответе модели', 1, 8192, 1, 'tokens');
                content += createCompactSettingField('temperature', setting.temperature || 0.7, 'Температура', 
                    'Контролирует случайность ответов (0-детерминировано, 2-креативно)', 0, 2, 0.1);
                content += createCompactSettingField('top_p', setting.top_p || 0.9, 'Top-p', 
                    'Учитывает только токены с суммарной вероятностью p', 0, 1, 0.05);
                content += createCompactSettingField('top_k', setting.top_k || 40, 'Top-k', 
                    'Ограничивает выборку k наиболее вероятными токенами', 0, 1000, 1);
                
                content += `
                        </div>
                        
                        <div class="settings-group">
                            <h5><i class="fas fa-balance-scale"></i> Контроль повторений</h5>
                `;
                
                // Группа 2: Контроль повторений
                content += createCompactSettingField('repeat_penalty', setting.repeat_penalty || 1.1, 'Штраф за повторы', 
                    'Штрафует повторяющиеся токены (>1 уменьшает повторения)', 0, 2, 0.1);
                content += createCompactSettingField('presence_penalty', setting.presence_penalty || 0.0, 'Штраф за присутствие', 
                    'Штраф за использование уже упомянутых токенов', -2, 2, 0.1);
                content += createCompactSettingField('frequency_penalty', setting.frequency_penalty || 0.0, 'Штраф за частоту', 
                    'Штраф за частое использование токенов', -2, 2, 0.1);
                content += createCompactSettingField('seed', setting.seed || -1, 'Случайное зерно', 
                    'Случайное зерно для воспроизводимых результатов (-1=случайно)', -1, 2147483647, 1);
                
                content += `
                        </div>
                        
                        <div class="settings-group">
                            <h5><i class="fas fa-memory"></i> Память и производительность</h5>
                `;
                
                // Группа 3: Память и производительность
                content += createCompactSettingField('num_ctx', setting.num_ctx || 2048, 'Размер контекста', 
                    'Максимальное количество токенов в контексте модели', 128, 32768, 128, 'tokens');
                content += createCompactSettingField('num_batch', setting.num_batch || 512, 'Размер пакета', 
                    'Количество токенов для параллельной обработки', 1, 4096, 32, 'tokens');
                content += createCompactSettingField('num_thread', setting.num_thread || 4, 'Потоки CPU', 
                    'Количество CPU потоков для вычислений', 1, 64, 1);
                content += createCompactSettingField('num_keep', setting.num_keep || 0, 'Сохраняемые токены', 
                    'Количество токенов из начала диалога, которые всегда сохраняются', 0, 2048, 1, 'tokens');
                
                content += `
                        </div>
                        
                        <div class="settings-group">
                            <h5><i class="fas fa-microchip"></i> GPU и оптимизация</h5>
                `;
                
                // Группа 4: GPU и оптимизация
                content += createCompactSettingField('num_gpu', setting.num_gpu || 1, 'Количество GPU', 
                    'Количество используемых GPU для вычислений', 0, 16, 1);
                content += createCompactSettingField('main_gpu', setting.main_gpu || 0, 'Основной GPU', 
                    'Индекс основного GPU для вычислений', 0, 16, 1);
                
                // Булевы параметры в компактном виде
                const boolSettings = [
                    {name: 'low_vram', value: setting.low_vram || false, label: 'Режим низкой VRAM', 
                     tooltip: 'Экономит память GPU за счет скорости'},
                    {name: 'f16_kv', value: setting.f16_kv || false, label: 'F16 для ключей/значений', 
                     tooltip: 'Использовать половинную точность для ключей и значений'},
                    {name: 'use_mmap', value: setting.use_mmap !== false, label: 'Использовать mmap', 
                     tooltip: 'Использовать mmap для загрузки модели (уменьшает RAM)'},
                    {name: 'use_mlock', value: setting.use_mlock || false, label: 'Блокировать в памяти', 
                     tooltip: 'Блокировать модель в памяти (требует много RAM)'},
                    {name: 'vocab_only', value: setting.vocab_only || false, label: 'Только словарь', 
                     tooltip: 'Загружать только словарь модели'},
                    {name: 'embedding_only', value: setting.embedding_only || false, label: 'Только эмбеддинги', 
                     tooltip: 'Генерировать только векторные представления текста'}
                ];
                
                boolSettings.forEach(boolSetting => {
                    content += createCompactBooleanField(boolSetting.name, boolSetting.value, boolSetting.label, boolSetting.tooltip);
                });
                
                content += `
                        </div>
                        
                        <div class="settings-group full-width">
                            <h5><i class="fas fa-stop-circle"></i> Стоп-токены</h5>
                `;
                
                // Стоп-токены
                const stopValue = setting.stop && Array.isArray(setting.stop) ? setting.stop.join(', ') : '';
                content += `
                    <div class="setting-field full-width">
                        <div class="setting-tooltip" data-tooltip="Токены, при встрече которых генерация останавливается. Пример: '\\n', '[STOP]'. Разделяйте запятыми.">
                            <div class="setting-label">
                                <span>Стоп-токены:</span>
                                <i class="fas fa-info-circle info-icon"></i>
                            </div>
                            <input type="text" class="setting-input setting-stop" value="${escapeHtml(stopValue)}" placeholder="Например: \n, [STOP]">
                        </div>
                    </div>
                `;
                
                content += `
                        </div>
                    </div>
                `;
                
                panel.innerHTML = content;
                panelsContainer.appendChild(panel);
                
                // Добавляем обработчики событий для слайдеров
                setTimeout(() => {
                    const sliders = panel.querySelectorAll('.setting-slider');
                    sliders.forEach(slider => {
                        const name = slider.getAttribute('data-name');
                        const valueSpan = panel.querySelector(`.slider-value[data-name="${name}"]`);
                        const inputField = panel.querySelector(`.setting-input.setting-${name}`);
                        
                        slider.addEventListener('input', function() {
                            if (valueSpan) {
                                valueSpan.textContent = this.value;
                            }
                            if (inputField) {
                                inputField.value = this.value;
                            }
                        });
                        
                        if (inputField) {
                            inputField.addEventListener('input', function() {
                                const value = parseFloat(this.value);
                                if (!isNaN(value)) {
                                    const min = parseFloat(slider.min);
                                    const max = parseFloat(slider.max);
                                    if (value >= min && value <= max) {
                                        slider.value = value;
                                        if (valueSpan) {
                                            valueSpan.textContent = value;
                                        }
                                    }
                                }
                            });
                        }
                    });
                }, 100);
            });
            
            settingsWrapper.appendChild(panelsContainer);
            serverSettingsContainer.appendChild(settingsWrapper);
            
        } else {
            serverSettingsContainer.innerHTML = '<div class="no-settings"><p>На сервере нет сохраненных настроек</p></div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        serverSettingsContainer.innerHTML = '<div class="no-settings"><p>Ошибка загрузки настроек с сервера</p></div>';
    }
}

// Создание компактного поля настройки
function createCompactSettingField(name, value, label, tooltip, min, max, step, unit = '') {
    const displayValue = name === 'temperature' || name === 'top_p' || name === 'repeat_penalty' || 
                        name === 'presence_penalty' || name === 'frequency_penalty' 
                        ? parseFloat(value).toFixed(2) : value;
    
    const unitText = unit ? ` ${unit}` : '';
    
    return `
        <div class="setting-field">
            <div class="setting-tooltip" data-tooltip="${escapeHtml(tooltip)}">
                <div class="setting-label">
                    <span>${label}:</span>
                    <i class="fas fa-info-circle info-icon"></i>
                </div>
                <div class="setting-controls">
                    <input type="range" class="setting-slider" 
                           value="${value}" min="${min}" max="${max}" step="${step}"
                           data-name="${name}">
                    <div class="slider-info">
                        <span class="slider-value" data-name="${name}">${displayValue}${unitText}</span>
                        <input type="number" class="setting-input setting-${name}" 
                               value="${value}" step="${step}" min="${min}" max="${max}"
                               data-name="${name}">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Создание компактного булевого поля
function createCompactBooleanField(name, value, label, tooltip) {
    const checked = value ? 'checked' : '';
    return `
        <div class="setting-field boolean-field">
            <div class="setting-tooltip" data-tooltip="${escapeHtml(tooltip)}">
                <label class="boolean-label">
                    <input type="checkbox" class="setting-checkbox setting-${name}" ${checked}
                           data-name="${name}">
                    <span class="checkbox-custom"></span>
                    <span class="boolean-text">${label}</span>
                    <i class="fas fa-info-circle info-icon"></i>
                </label>
            </div>
        </div>
    `;
}

// Функция сохранения настроек на сервере
async function saveServerSettings() {
    if (!authToken) {
        alert('Для сохранения настроек необходимо авторизоваться');
        showAuthModal();
        return;
    }
    
    if (!serverSettings || serverSettings.length === 0) {
        alert('Нет настроек для сохранения');
        return;
    }
    
    // Собираем обновленные настройки
    const updatedSettings = [];
    const panels = document.querySelectorAll('.settings-panel');
    
    panels.forEach((panel, index) => {
        const originalSetting = serverSettings[index];
        if (!originalSetting) return;
        
        // Создаем объект настроек
        const settingData = {
            id: originalSetting.id || '',
            num_predict: parseInt(panel.querySelector('.setting-num_predict')?.value) || 128,
            num_keep: originalSetting.num_keep || 0,
            temperature: parseFloat(panel.querySelector('.setting-temperature')?.value) || 0.7,
            top_p: parseFloat(panel.querySelector('.setting-top_p')?.value) || 0.9,
            top_k: parseInt(panel.querySelector('.setting-top_k')?.value) || 40,
            repeat_penalty: parseFloat(panel.querySelector('.setting-repeat_penalty')?.value) || 1.1,
            presence_penalty: parseFloat(panel.querySelector('.setting-presence_penalty')?.value) || 0.0,
            frequency_penalty: parseFloat(panel.querySelector('.setting-frequency_penalty')?.value) || 0.0,
            seed: parseInt(panel.querySelector('.setting-seed')?.value) || -1,
            num_ctx: parseInt(panel.querySelector('.setting-num_ctx')?.value) || 2048,
            num_batch: parseInt(panel.querySelector('.setting-num_batch')?.value) || 512,
            num_gpu: parseInt(panel.querySelector('.setting-num_gpu')?.value) || 1,
            main_gpu: parseInt(panel.querySelector('.setting-main_gpu')?.value) || 0,
            low_vram: panel.querySelector('.setting-low_vram')?.checked || false,
            f16_kv: panel.querySelector('.setting-f16_kv')?.checked || false,
            vocab_only: panel.querySelector('.setting-vocab_only')?.checked || false,
            use_mmap: panel.querySelector('.setting-use_mmap')?.checked !== false,
            use_mlock: panel.querySelector('.setting-use_mlock')?.checked || false,
            embedding_only: panel.querySelector('.setting-embedding_only')?.checked || false,
            num_thread: parseInt(panel.querySelector('.setting-num_thread')?.value) || 4
        };
        
        // Обрабатываем стоп-токены
        const stopInput = panel.querySelector('.setting-stop');
        if (stopInput && stopInput.value.trim()) {
            settingData.stop = stopInput.value.split(',').map(s => s.trim()).filter(s => s);
        }
        
        updatedSettings.push(settingData);
    });
    
    console.log('Сохранение настроек на сервере:', updatedSettings);
    
    try {
        // Сохраняем каждую настройку отдельно
        for (const setting of updatedSettings) {
            const response = await $.ajax({
                url: `${API_BASE_URL}/api/v1.1/route_ollama/set_settings`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    access_token: authToken,
                    id: setting.id,
                    num_predict: setting.num_predict,
                    num_keep: setting.num_keep,
                    temperature: setting.temperature,
                    top_p: setting.top_p,
                    top_k: setting.top_k,
                    repeat_penalty: setting.repeat_penalty,
                    presence_penalty: setting.presence_penalty,
                    frequency_penalty: setting.frequency_penalty,
                    seed: setting.seed,
                    num_ctx: setting.num_ctx,
                    num_batch: setting.num_batch,
                    num_gpu: setting.num_gpu,
                    main_gpu: setting.main_gpu,
                    low_vram: setting.low_vram,
                    f16_kv: setting.f16_kv,
                    vocab_only: setting.vocab_only,
                    use_mmap: setting.use_mmap,
                    use_mlock: setting.use_mlock,
                    embedding_only: setting.embedding_only,
                    num_thread: setting.num_thread
                })
            });
            
            console.log('Ответ сервера для настройки', setting.id, ':', response);
            
            if (response.status !== 0) {
                throw new Error(response.descr || `Ошибка сохранения настройки ${setting.id}`);
            }
        }
        
        alert('Настройки успешно сохранены на сервере!');
        // Обновляем локальные настройки
        serverSettings = updatedSettings;
        
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        alert(`Ошибка сохранения настроек: ${error.message || error}`);
    }
}
function closeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
}

// Экспорт функций в глобальную область видимости
window.loadTheme = loadTheme;
window.setTheme = setTheme;
window.loadSettingsFromServer = loadSettingsFromServer;
window.saveServerSettings = saveServerSettings;
window.closeSettings = closeSettings;