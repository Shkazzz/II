// prompts.js - Управление промтами

// Загрузить личные промты с сервера
async function loadPromptsFromServer() {
    if (!authToken) {
        console.log('Нет токена для загрузки промтов');
        personalPromptsList = [];
        renderPersonalPrompts();
        return;
    }
    
    console.log('Загрузка личных промтов с сервера...');
    
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/get_promts`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken
        }),
        success: function(data) {
            console.log('Личные промты загружены:', data);
            if (data.status === 0 && data.data && Array.isArray(data.data)) {
                personalPromptsList = data.data.map(prompt => ({
                    id: prompt.id || '',
                    name: prompt.name || 'Без названия',
                    content: prompt.prompt || '',
                    createdAt: prompt.dt || new Date().toISOString(), // ИСПРАВЛЕНО: используем поле dt
                    updatedAt: prompt.dt || new Date().toISOString(),
                    isCommon: prompt.is_common || false
                }));
                renderPersonalPrompts();
            } else {
                console.error('Ошибка загрузки личных промтов:', data);
                personalPromptsList = [];
                renderPersonalPrompts();
            }
        },
        error: function(error) {
            console.error('Ошибка загрузки личных промтов:', error);
            personalPromptsList = [];
            renderPersonalPrompts();
        }
    });
}

// Загрузить общие промты с сервера
async function loadSharedPromptsFromServer() {
    if (!authToken) {
        console.log('Нет токена для загрузки общих промтов');
        sharedPromptsList = [];
        renderSharedPrompts();
        return;
    }
    
    console.log('Загрузка общих промтов с сервера...');
    
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/get_promts_common`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken
        }),
        success: function(data) {
            console.log('Общие промты загружены:', data);
            if (data.status === 0 && data.data && Array.isArray(data.data)) {
                sharedPromptsList = data.data.map(prompt => ({
                    id: prompt.id || '',
                    name: prompt.name || 'Без названия',
                    content: prompt.prompt || '',
                    createdAt: prompt.dt || new Date().toISOString(), // ИСПРАВЛЕНО: используем поле dt
                    updatedAt: prompt.dt || new Date().toISOString(),
                    isCommon: true,
                    author: prompt.user || 'Неизвестно'
                }));
                renderSharedPrompts();
            } else {
                console.error('Ошибка загрузки общих промтов:', data);
                sharedPromptsList = [];
                renderSharedPrompts();
            }
        },
        error: function(error) {
            console.error('Ошибка загрузки общих промтов:', error);
            sharedPromptsList = [];
            renderSharedPrompts();
        }
    });
}

// Добавить новый промт на сервер
async function addPromptToServer(promptContent, name) {
    if (!authToken || !promptContent || !name) {
        alert('Недостаточно данных для сохранения промта');
        return;
    }
    
    console.log('Добавление нового промта на сервер...', { name, contentLength: promptContent.length });
    
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/add_prompt`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken,
            prompt: promptContent,
            name: name
        }),
        success: function(data) {
            console.log('Промт добавлен:', data);
            if (data.status === 0) {
                alert('Промт успешно сохранен!');
                // Перезагружаем промты с сервера
                loadPromptsFromServer();
            } else {
                alert('Ошибка сохранения промта: ' + (data.descr || 'Неизвестная ошибка'));
            }
        },
        error: function(error) {
            console.error('Ошибка добавления промта:', error);
            alert('Ошибка подключения к серверу');
        }
    });
}

// Удалить промт с сервера
async function deletePromptFromServer(promptId) {
    if (!authToken || !promptId) {
        alert('Не удалось удалить промт');
        return false;
    }
    
    console.log(`Удаление промта ${promptId} с сервера...`);
    
    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/update_prompt_delete`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                id: promptId
            }),
            success: function(data) {
                console.log(`Промт ${promptId} удален:`, data);
                if (data.status === 0) {
                    resolve(true);
                } else {
                    console.error('Ошибка удаления промта:', data);
                    resolve(false);
                }
            },
            error: function(error) {
                console.error('Ошибка удаления промта:', error);
                resolve(false);
            }
        });
    });
}

// Добавить промт в общие
async function sharePromptOnServer(promptId) {
    if (!authToken || !promptId) {
        alert('Не удалось поделиться промтом');
        return false;
    }
    
    console.log(`Добавление промта ${promptId} в общие...`);
    
    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/update_prompt_common`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                id: promptId
            }),
            success: function(data) {
                console.log(`Промт ${promptId} добавлен в общие:`, data);
                if (data.status === 0) {
                    resolve(true);
                } else {
                    console.error('Ошибка добавления промта в общие:', data);
                    resolve(false);
                }
            },
            error: function(error) {
                console.error('Ошибка добавления промта в общие:', error);
                resolve(false);
            }
        });
    });
}

function renderPrompts() {
    renderPersonalPrompts();
    renderSharedPrompts();
}

// Новая функция: рендеринг личных промтов с группировкой по датам
function renderPersonalPrompts() {
    const personalPrompts = document.getElementById('personalPrompts');
    if (!personalPrompts) return;
    
    personalPrompts.innerHTML = '';
    
    if (personalPromptsList.length === 0) {
        personalPrompts.innerHTML = `
            <div class="empty-prompts">
                <p>Нет сохраненных промтов</p>
            </div>
        `;
        return;
    }
    
    // Сортируем промты по дате создания (новые сначала)
    const sortedPrompts = [...personalPromptsList].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Группируем промты по датам
    const groupedPrompts = {};
    sortedPrompts.forEach(prompt => {
        const date = new Date(prompt.createdAt);
        const dateKey = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (!groupedPrompts[dateKey]) {
            groupedPrompts[dateKey] = [];
        }
        groupedPrompts[dateKey].push(prompt);
    });
    
    // Отображаем промты по группам
    Object.keys(groupedPrompts).forEach(dateKey => {
        // Добавляем заголовок с датой
        const dateHeader = document.createElement('div');
        dateHeader.className = 'prompt-group-header';
        dateHeader.textContent = dateKey;
        personalPrompts.appendChild(dateHeader);
        
        // Добавляем промты для этой даты
        groupedPrompts[dateKey].forEach(prompt => {
            const promptElement = createPromptElement(prompt, 'personal');
            personalPrompts.appendChild(promptElement);
        });
    });
}

// Новая функция: рендеринг общих промтов с группировкой по датам
function renderSharedPrompts() {
    const sharedPrompts = document.getElementById('sharedPrompts');
    if (!sharedPrompts) return;
    
    sharedPrompts.innerHTML = '';
    
    if (sharedPromptsList.length === 0) {
        sharedPrompts.innerHTML = `
            <div class="empty-prompts">
                <p>Нет общих промтов</p>
            </div>
        `;
        return;
    }
    
    // Сортируем промты по дате создания (новые сначала)
    const sortedPrompts = [...sharedPromptsList].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Группируем промты по датам
    const groupedPrompts = {};
    sortedPrompts.forEach(prompt => {
        const date = new Date(prompt.createdAt);
        const dateKey = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (!groupedPrompts[dateKey]) {
            groupedPrompts[dateKey] = [];
        }
        groupedPrompts[dateKey].push(prompt);
    });
    
    // Отображаем промты по группам
    Object.keys(groupedPrompts).forEach(dateKey => {
        // Добавляем заголовок с датой
        const dateHeader = document.createElement('div');
        dateHeader.className = 'prompt-group-header';
        dateHeader.textContent = dateKey;
        sharedPrompts.appendChild(dateHeader);
        
        // Добавляем промты для этой даты
        groupedPrompts[dateKey].forEach(prompt => {
            const promptElement = createPromptElement(prompt, 'shared');
            sharedPrompts.appendChild(promptElement);
        });
    });
}

function createPromptElement(prompt, type) {
    const time = new Date(prompt.createdAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const content = prompt.content.length > 100 
        ? prompt.content.substring(0, 100) + '...' 
        : prompt.content;
    
    let actions = '';
    if (type === 'personal') {
        actions = `
            <div class="prompt-actions">
                ${!prompt.isCommon ? `
                <button class="prompt-action-btn share-btn" title="Поделиться">
                    <i class="fas fa-share"></i>
                </button>
                ` : ''}
                <button class="prompt-action-btn delete-btn" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    } else {
        // Для общих промтов кнопка удаления доступна всем
        actions = `
            <div class="prompt-actions">
                <button class="prompt-action-btn delete-btn" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    const element = document.createElement('div');
    element.className = 'prompt-item';
    element.setAttribute('data-id', prompt.id);
    element.innerHTML = `
        <div class="prompt-title">${escapeHtml(prompt.name || 'Без названия')}</div>
        <div class="prompt-content">${escapeHtml(content)}</div>
        <div class="prompt-date">
            <span>${time}</span>
            ${actions}
        </div>
    `;
    
    // Обработчик клика по всему элементу промта (для подстановки текста)
    element.onclick = function(e) {
        console.log('Клик по промту:', prompt.id);
        // Проверяем, не была ли нажата кнопка действия
        if (!e.target.closest('.prompt-actions')) {
            console.log('Вызов usePrompt для промта:', prompt.id);
            usePrompt(prompt.id);
        } else {
            console.log('Клик на кнопке действия, игнорируем подстановку');
        }
    };
    
    if (type === 'personal') {
        const shareBtn = element.querySelector('.share-btn');
        if (shareBtn) {
            shareBtn.onclick = function(e) {
                e.stopPropagation();
                sharePrompt(prompt.id);
            };
        }
        
        const deleteBtn = element.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                deletePrompt(prompt.id, type);
            };
        }
    } else {
        const deleteBtn = element.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = function(e) {
                e.stopPropagation();
                deletePrompt(prompt.id, type);
            };
        }
    }
    
    return element;
}

function addNewPrompt() {
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) {
        alert('Введите текст промта');
        messageInput.focus();
        return;
    }
    
    // Автоматически генерируем название из первых 20 символов
    const name = content.substring(0, 20) + (content.length > 20 ? '...' : '');
    
    addPromptToServer(content, name);
}

function usePrompt(promptId) {
    console.log(`Использование промта ${promptId}`);
    
    if (!authToken) {
        alert('Для использования промтов необходимо авторизоваться');
        showAuthModal();
        return;
    }
    
    // Запрашиваем содержимое промта с сервера
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/get_prompt_id`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken,
            id: promptId
        }),
        success: function(data) {
            console.log('Промт получен с сервера:', data);
            
            if (data.status === 0 && data.data && data.data.length > 0) {
                const prompt = data.data[0];
                const promptContent = prompt.prompt || '';
                
                if (promptContent && messageInput) {
                    messageInput.value = promptContent;
                    messageInput.style.height = 'auto';
                    messageInput.style.height = messageInput.scrollHeight + 'px';
                    messageInput.focus();
                    
                    console.log('Текст промта подставлен в поле ввода:', promptContent.substring(0, 50) + '...');
                    
                    // Показать уведомление о успешной подстановке
                    showPromptAppliedNotification(prompt.name || 'Промт');
                    
                    // Сворачиваем панель промтов на мобильных устройствах
                    if (window.innerWidth <= 992) {
                        const promptsSidebar = document.querySelector('.prompts-sidebar');
                        if (promptsSidebar) {
                            promptsSidebar.classList.add('collapsed');
                        }
                    }
                } else {
                    console.error('Пустой контент промта или поле ввода не существует');
                    alert('Промт не содержит текста');
                }
            } else {
                console.error('Промт не найден на сервере:', data);
                alert('Промт не найден');
            }
        },
        error: function(error) {
            console.error('Ошибка получения промта:', error);
            alert('Ошибка загрузки промта');
        }
    });
}

// Вспомогательная функция для показа уведомления о подстановке промта
function showPromptAppliedNotification(promptName) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'prompt-applied-notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Промт "${escapeHtml(promptName.substring(0, 30) + (promptName.length > 30 ? '...' : ''))}" подставлен</span>
    `;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background-color: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
    `;
    
    // Анимация
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

async function sharePrompt(promptId) {
    if (!confirm('Вы уверены, что хотите поделиться этим промтом? Он станет доступен всем пользователями.')) {
        return;
    }
    
    const success = await sharePromptOnServer(promptId);
    if (success) {
        alert('Промт успешно добавлен в общие!');
        // Обновляем списки промтов
        await loadPromptsFromServer();
        await loadSharedPromptsFromServer();
    } else {
        alert('Не удалось поделиться промтом');
    }
}

async function deletePrompt(promptId, type) {
    if (!confirm('Вы уверены, что хотите удалить этот промт?')) return;
    
    const success = await deletePromptFromServer(promptId);
    if (success) {
        alert('Промт успешно удален!');
        // Обновляем соответствующий список
        if (type === 'personal') {
            await loadPromptsFromServer();
        } else if (type === 'shared') {
            await loadSharedPromptsFromServer();
        }
    } else {
        alert('Не удалось удалить промт');
    }
}

function saveToPersonalPrompts() {
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content) {
        alert('Введите текст для сохранения');
        return;
    }
    
    addNewPrompt();
}

function toggleSection(section) {
    let elementId;
    if (section === 'personal') elementId = 'personalPrompts';
    else if (section === 'shared') elementId = 'sharedPrompts';
    else if (section === 'files') elementId = 'chatFilesList'; // ✅ ИСПРАВЛЕНО: скрываем только список, не кнопки
    else return;
    
    const element = document.getElementById(elementId);
    if (!element) return;

    // Проверяем текущее состояние
    const isHidden = element.style.display === 'none' || element.style.display === '';

    // Переключаем
    element.style.display = isHidden ? 'block' : 'none';

    // Поворот стрелки
    const header = element.previousElementSibling;
    if (header && header.classList.contains('section-header')) {
        const arrow = header.querySelector('.fa-chevron-down, .fa-chevron-up');
        if (arrow) {
            arrow.classList.toggle('fa-chevron-down');
            arrow.classList.toggle('fa-chevron-up');
        }
    }
}

function showPrompts() {
    togglePromptsSidebar();
}

function togglePrompts() {
    togglePromptsSidebar();
}

// Экспорт функций в глобальную область видимости
window.loadPromptsFromServer = loadPromptsFromServer;
window.loadSharedPromptsFromServer = loadSharedPromptsFromServer;
window.addPromptToServer = addPromptToServer;
window.deletePromptFromServer = deletePromptFromServer;
window.sharePromptOnServer = sharePromptOnServer;
window.renderPrompts = renderPrompts;
window.renderPersonalPrompts = renderPersonalPrompts;
window.renderSharedPrompts = renderSharedPrompts;
window.createPromptElement = createPromptElement;
window.addNewPrompt = addNewPrompt;
window.usePrompt = usePrompt;
window.showPromptAppliedNotification = showPromptAppliedNotification;
window.sharePrompt = sharePrompt;
window.deletePrompt = deletePrompt;
window.saveToPersonalPrompts = saveToPersonalPrompts;
window.toggleSection = toggleSection;
window.showPrompts = showPrompts;
window.togglePrompts = togglePrompts;