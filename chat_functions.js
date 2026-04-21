// chat_functions.js - Функции чата (обновленная версия)

async function sendMessage() {
    if (!authToken) {
        alert('Для отправки сообщений необходимо авторизоваться');
        showAuthModal();
        return;
    }
    
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    const selectedModel = modelSelect ? modelSelect.value : '';
    
    if (!message && attachedFiles.length === 0) return;
    
    if (!selectedModel) {
        alert('Пожалуйста, выберите модель для общения');
        if (modelSelect) modelSelect.focus();
        return;
    }
    
    let chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        const newChat = await createNewChat();
        if (!newChat) return;
        chat = newChat;
    }
    
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
    }
    
    // Сохраняем сообщение пользователя на сервере
    const savedMessage = await saveUserMessageToServer(chat.id, message);
    
    if (savedMessage) {
        const userMessage = { 
            role: 'user', 
            content: message,
            user: true,
            server: false,
            timestamp: savedMessage.timestamp || new Date().toISOString(),
            files: attachedFiles.length > 0 ? attachedFiles.map(f => f.name) : []
        };
        chat.messages.push(userMessage);
        chat.model = selectedModel;
        chat.updatedAt = new Date().toISOString();
        
        // Сортируем чаты по дате (самые новые сначала)
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        // Используем новую функцию для отображения с группировкой
        renderMessagesWithGrouping(chat.messages);
        renderChatsList();
    } else {
        alert('Не удалось сохранить сообщение');
        return;
    }
    
    showTypingIndicator();
    if (sendButton) sendButton.disabled = true;
    if (messageInput) messageInput.disabled = true;
    
    const isValid = await validateAccessToken(authToken);
    if (!isValid) {
        handleAuthError();
        removeTypingIndicator();
        addFormattedMessageToChat('assistant', 'Сессия истекла. Пожалуйста, авторизуйтесь снова.');
        showAuthModal();
        return;
    }
    

    // Формируем запрос в зависимости от наличия файлов
    if (attachedFiles.length > 0) {
        await sendMessageWithFiles(chat, message, selectedModel);
    } else {
        await sendMessageWithoutFiles(chat, message, selectedModel);
    }
    
    // Очищаем прикрепленные файлы после отправки
    attachedFiles = [];
    renderFilePreview();
}



function pollTaskResult(taskId, chat, params) {
    const { API_BASE_URL, authToken, handleAssistantResponse, handleSendError, completeMessageSending, handleSendTask } = params;
   // console.log(taskId); 
    let attempts = 0;
    const maxRetries = 3600; // ~1 минута ожидания (60 попыток по 1 сек)
    const retryDelay = 2000; // 1 секунда
     let lastDescr = null;
    function checkResult() {
        if (attempts >= maxRetries) {
            console.warn('⏱ Таймаут ожидания результата задачи');
            handleSendError(chat, new Error('Превышено время ожидания ответа от ИИ'));
            completeMessageSending();
            return;
        }

        attempts++;
        console.log(`🔄 Опрос результата: попытка ${attempts}/${maxRetries}`);
        const formData = new FormData();
        formData.append('access_token', authToken);
        formData.append('task_id', taskId);
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_files/get_task_result`,
            method: 'POST', // или 'GET' — уточните в документации вашего API
            data: formData,
            processData: false,
            contentType: false,
            success: function(res) {
                console.log('📥 Ответ от get_task_result:', res.status);
                
                if (res.status === 0) {
                    // ✅ Задача завершена успешно
                    console.log('✅ Задача выполнена, обрабатываем ответ...');
                    handleAssistantResponse(chat, res);
                    completeMessageSending();
                    
                } else if (res.status === 2 & res.ret < 100  ) {
                    // 🔄 Задача всё ещё в процессе — повторяем опрос
                    //handleSendTask( res.descr);

                    
                     const currentDescr = res.descr || '';
                    
                    // 🎯 Вызываем handleSendTask ТОЛЬКО если описание изменилось
                    if (currentDescr !== lastDescr) {
                        console.log(`📝 Описание изменилось: "${lastDescr}" → "${currentDescr}"`);
                        handleSendTask(currentDescr);
                        lastDescr = currentDescr; // ✅ Обновляем последнее значение
                    } else {
                        console.log(`⏭ Описание не изменилось: "${currentDescr}", пропускаем обновление`);
                    }

                    setTimeout(checkResult, retryDelay);
                    console.log(res);
                 } 
                 else if (res.status === 2 & res.ret === 100  ) {
                    console.log('✅ Задача выполнена, обрабатываем ответ...');
                   // handleAssistantResponse(chat, res);
                   // completeMessageSending();
                    console.log(res.descr);
                    //onsole.log(res.data);
                    handleAssistantResponse(chat, res.data);
                    //handleSendError(chat, new Error(`Задача выполнена: ${res.status}. ${res.descr || ''}`));
                    //completeMessageSending();  

                 }                  

                 else if (res.status === 1 ) {

                    handleSendError(chat, new Error(`Ошибка выполнения задачи: ${res.status}. ${res.descr || ''}`));
                    completeMessageSending();  
                 }                  
                else if (res.status === 3) {
                    // ✅ Задача завершена успешно
                    console.log('✅ Задача выполнена, обрабатываем ответ...');
                    handleAssistantResponse(chat, res);
                    completeMessageSending();
                
                } else {
                    // ❌ Неожиданный статус
                    console.error('❌ Неожиданный статус задачи:', res.status, res);
                    handleSendError(chat, new Error(`Статус задачи: ${res.status}. ${res.descr || ''}`));
                    completeMessageSending();
                }
            },
            error: function(err) {
                console.error('❌ Ошибка при опросе результата:', err);
                // При ошибке сети тоже повторяем опрос (можно добавить экспоненциальную задержку)
                setTimeout(checkResult, retryDelay);
            }
        });
    }

    // Запускаем первую проверку сразу
    checkResult();
}










async function sendMessageWithFiles(chat, message, selectedModel) {
    console.log('Отправка сообщения с файлами:', {
        filesCount: attachedFiles.length,
        model: selectedModel
    });
    
    // Создаем FormData
    const formData = new FormData();
    formData.append('access_token', authToken);
    formData.append('message', message);
    formData.append('model', selectedModel);
    
    const pollParams = {
        API_BASE_URL,
        authToken,
        handleAssistantResponse,
        handleSendError,
        completeMessageSending,
        handleSendTask
    };


    // Добавляем файлы
    attachedFiles.forEach(file => {
        formData.append('files', file);
    });
    //console.log('formdata:', formData);
    //console.log('chat:', chat.id);
    formData.append('chat', chat.id);
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_files/send_message_files`,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                console.log('Ответ от ИИ с файлами:', data);
                console.log('Status:', data.status);
                if (data.status === 2) {
                    console.log('descr:', data.descr);
                    console.log('id:', data.id);
                    pollTaskResult(data.id, chat, pollParams);
                }    
                if (data.status === 0) {
                    handleAssistantResponse(chat, data);
                }
            },
            error: function(error) {
                console.error('Ошибка отправки сообщения с файлами:', error);
                handleSendError(chat, error);
            },
            complete: function() {
                completeMessageSending();
            }
        });
        
    } catch (error) {
        console.error('Исключение при отправке сообщения с файлами:', error);
        handleSendError(chat, error);
        completeMessageSending();
    }
}

async function sendMessageWithoutFiles(chat, message, selectedModel) {
  //  console.log('Отправка сообщения без файлов:', {
   //     model: selectedModel,
   //     messageLength: message.length
   // });

//// изменение для отправки только последнего сообщения
const userMessages = chat.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
let lastUserMessage = message; // по умолчанию используем текущее сообщение
    
//console.log(userMessages)

if (userMessages.length > 0) {
        // Берем последнее сообщение пользователя из истории
        lastUserMessage = userMessages[userMessages.length - 1].content;


//lastUserMessage = userMessages.content;

}    
const apiMessages = [{
        role: 'user',
        content: lastUserMessage
//        content: userMessages
}];  

//apiMessages = userMessages
////////////////////////////////////////////    
    
    
    
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/chat`,
            method: 'POST',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            
            
            data: JSON.stringify({
                //messages: apiMessages,
                messages: userMessages,
                model: selectedModel,
                stream: false,
                temperature: 0.7
            }),
            success: function(data) {
            //    console.log('Ответ от ИИ:', data);
                handleAssistantResponse(chat, data);
            },
            error: function(error) {
             //   console.error('Ошибка отправки сообщения:', error);
                handleSendError(chat, error);
            },
            complete: function() {
                completeMessageSending();
            }
        });
        
    } catch (error) {
       // console.error('Исключение при отправке сообщения:', error);
        handleSendError(chat, error);
        completeMessageSending();
    }
}

function handleAssistantResponse(chat, data) {
    removeTypingIndicator();
    
    let assistantMessage = data.message || data;
    if (data.ollama_response) {
        assistantMessage = data.ollama_response;
    }
    
    if (assistantMessage && (assistantMessage.content || assistantMessage.response)) {
        const content = assistantMessage.content || assistantMessage.response;
        
        saveAssistantMessageToServer(chat.id, content);
        
        const assistantMsg = {
            role: 'assistant',
            content: content,
            user: false,
            server: true,
            timestamp: new Date().toISOString()
        };
        chat.messages.push(assistantMsg);
        chat.updatedAt = new Date().toISOString();
        
        // Сортируем чаты по дате (самые новые сначала)
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        
        if (chat.messages.length === 2) {
            updateChatTitle(chat);
        }
        
        // Используем новую функцию для отображения с группировкой
        renderMessagesWithGrouping(chat.messages);
        renderChatsList();
    }
}

function handleSendError(chat, error) {
    removeTypingIndicator();
    
    if (error.status === 401) {
        handleAuthError();
        addFormattedMessageToChat('assistant', 'Сессия истекла. Пожалуйста, авторизуйтесь снова.');
        showAuthModal();
    } else {
        const errorMessage = error.responseJSON?.error || error.statusText || error.message || 'Неизвестная ошибка';
        addFormattedMessageToChat('assistant', `Ошибка: ${errorMessage}`);
    }
}

function handleSendTask(message) {

    
//        const errorMessage = error.responseJSON?.error || error.statusText || error.message || 'Неизвестная ошибка';
       // addFormattedMessageToChat('assistant', `${message}`);

    changeFormattedMessageToChat( 'assistant', `${message}`,  true, 'task-progress'   );

}

function completeMessageSending() {
    if (sendButton) sendButton.disabled = false;
    if (messageInput) messageInput.disabled = false;
    
    // Очищаем прикрепленные файлы после отправки
    attachedFiles = [];
    renderFilePreview();
    
    setTimeout(() => {
        if (messageInput) messageInput.focus();
    }, 100);
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Экспорт функций в глобальную область видимости
window.sendMessage = sendMessage;
window.handleKeyPress = handleKeyPress;