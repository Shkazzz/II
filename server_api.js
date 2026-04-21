// server_api.js - API-функции сервера

async function checkHealth() {
    console.log('Проверка здоровья сервиса...');
    
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/health`,
        method: 'GET',
        success: function(data) {
            console.log('Статус здоровья:', data);
            if (data.status === 'healthy') {
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator';
                }
                if (statusText) {
                    statusText.textContent = 'Ollama подключен';
                }
            } else {
                if (statusIndicator) {
                    statusIndicator.className = 'status-indicator offline';
                }
                if (statusText) {
                    statusText.textContent = 'Ollama отключен';
                }
            }
        },
        error: function(error) {
            console.error('Ошибка проверки здоровья:', error);
            if (statusIndicator) {
                statusIndicator.className = 'status-indicator offline';
            }
            if (statusText) {
                statusText.textContent = 'Ошибка подключения';
            }
        }
    });
}

async function saveUserMessageToServer(chatId, message) {
    if (!authToken || !chatId || !message) return null;
    
    console.log(`Сохранение сообщения пользователя для чата ${chatId}...`);
    
    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_save_message`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                message: message,
                chat_id: chatId
            }),
            success: function(data) {
                console.log(`Сообщение пользователя сохранено:`, data);
                if (data.status === 0) {
                    resolve({
                        timestamp: new Date().toISOString(),
                        success: true
                    });
                } else {
                    console.error('Ошибка сохранения сообщения:', data);
                    resolve(null);
                }
            },
            error: function(error) {
                console.error('Ошибка сохранения сообщения пользователя:', error);
                resolve(null);
            }
        });
    });
}

async function saveAssistantMessageToServer(chatId, message) {
    if (!authToken || !chatId || !message) return null;
    
    console.log(`Сохранение сообщения ассистента для чата ${chatId}...`);
    
    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_save_message_server`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                message: message,
                chat_id: chatId
            }),
            success: function(data) {
                console.log(`Сообщение ассистента сохранено:`, data);
                if (data.status === 0) {
                    console.log('Сообщение сервера успешно сохранено');
                    resolve({ 
                        success: true,
                        data: data
                    });
                } else {
                    console.error('Ошибка сохранения сообщения сервера:', data);
                    resolve(null);
                }
            },
            error: function(error) {
                console.error('Ошибка сохранения сообщения сервера:', error);
                resolve(null);
            }
        });
    });
}
// Экспорт функций в глобальную область видимости
window.checkHealth = checkHealth;
window.saveUserMessageToServer = saveUserMessageToServer;
window.saveAssistantMessageToServer = saveAssistantMessageToServer;