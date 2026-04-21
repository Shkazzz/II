// chats.js - Управление чатами
async function loadChatsFromServer() {
    if (!authToken) {
        console.log('Нет токена для загрузки чатов');
        chats = [];
        renderChatsList();
        return;
    }
    console.log('Загрузка чатов с сервера...');

    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_get_chats`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken
        }),
        success: function(data) {
            console.log('Чаты загружены:', data);
            if (data.status === 0 && data.data && Array.isArray(data.data)) {
                chats = data.data.map(serverChat => ({
                    id: serverChat.id,
                    title: serverChat.name || `Чат ${serverChat.id.substring(0, 8)}`,
                    messages: [],
                    model: serverChat.model || '',
                    createdAt: serverChat.dt || new Date().toISOString(),
                    updatedAt: serverChat.dt || new Date().toISOString(),
                    isActive: false
                }));

                // Сортируем чаты по дате (самые новые сначала)
                chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                renderChatsList();

                if (chats.length > 0) {
                    openChat(chats[0].id);
                    loadChatMessages(chats[0].id);
                }
            } else {
                console.error('Ошибка загрузки чатов:', data);
                chats = [];
                renderChatsList();
            }
        },
        error: function(error) {
            console.error('Ошибка загрузки чатов с сервера:', error);
            chats = [];
            renderChatsList();
        }
    });
}

async function loadChatMessages(chatId) {
    if (!authToken || !chatId) return;
    console.log(`Загрузка сообщений для чата ${chatId}...`);

    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_get_chat_messages`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken,
            chat_id: chatId
        }),
        success: function(data) {
            console.log(`Сообщения для чата ${chatId} загружены:`, data);
            if (data.status === 0 && data.data && Array.isArray(data.data)) {
                const chat = chats.find(c => c.id === chatId);
                if (chat) {
                    chat.messages = data.data.map(msg => {
                        let role;
                        if (msg.user === true) {
                            role = 'user';
                        } else if (msg.server === true) {
                            role = 'assistant';
                        } else {
                            role = 'assistant';
                        }

                        return {
                            role: role,
                            content: msg.message || '',
                            timestamp: msg.timestamp || new Date().toISOString(),
                            user: msg.user || false,
                            server: msg.server || false
                        };
                    });

                    if (chat.messages.length > 0) {
                        const lastMessage = chat.messages[chat.messages.length - 1];
                        chat.updatedAt = lastMessage.timestamp || chat.updatedAt;
                    }

                    if (chat.id === currentChatId) {
                        renderMessagesWithGrouping(chat.messages);
                    }
                }
            }
        },
        error: function(error) {
            console.error(`Ошибка загрузки сообщений чата ${chatId}:`, error);
        }
    });
}

async function createNewChat() {
    if (!authToken) {
        alert('Для создания чата необходимо авторизоваться');
        showAuthModal();
        return null;
    }
    console.log('Создание нового чата...');

    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_create_chat`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                name: `Чат ${chats.length + 1}`
            }),
            success: function(data) {
                console.log('Чат создан:', data);
                if (data.status === 0 && data.chat_id) {
                    const newChat = {
                        id: data.chat_id,
                        title: `Чат ${chats.length + 1}`,
                        messages: [],
                        model: modelSelect ? modelSelect.value : '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        isActive: true
                    };

                    chats.forEach(chat => chat.isActive = false);
                    chats.push(newChat);
                    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

                    renderChatsList();
                    openChat(newChat.id);

                    resolve(newChat);
                } else {
                    console.error('Ошибка создания чата:', data);
                    alert(data.error || 'Ошибка создания чата');
                    resolve(null);
                }
            },
            error: function(error) {
                console.error('Ошибка создания чата:', error);
                alert(`Ошибка создания чата: ${error.statusText || error.message}`);
                resolve(null);
            }
        });
    });
}

async function deleteChatFromServer(chatId) {
    if (!authToken || !chatId) return false;
    console.log(`Удаление чата ${chatId}...`);

    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_delete_chat`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                chat_id: chatId
            }),
            success: function(data) {
                console.log(`Чат ${chatId} удален:`, data);
                resolve(data.status === 0);
            },
            error: function(error) {
                console.error(`Ошибка удаления чата ${chatId}:`, error);
                resolve(false);
            }
        });
    });
}

async function renameChatOnServer(chatId, newName) {
    if (!authToken || !chatId || !newName) return false;
    console.log(`Переименование чата ${chatId} в "${newName}"...`);

    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_rename_chat`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: authToken,
                chat_id: chatId,
                name: newName
            }),
            success: function(data) {
                console.log(`Чат ${chatId} переименован:`, data);
                resolve(data.status === 0);
            },
            error: function(error) {
                console.error(`Ошибка переименования чата ${chatId}:`, error);
                resolve(false);
            }
        });
    });
}

function renderChatsList() {
    if (!chatsList || !emptyChatsMessage) return;
    if (chats.length === 0) {
        emptyChatsMessage.style.display = 'block';
        chatsList.innerHTML = '';
        return;
    }

    emptyChatsMessage.style.display = 'none';
    chatsList.innerHTML = '';

    const sortedChats = [...chats];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayChats = [];
    const yesterdayChats = [];
    const lastWeekChats = [];
    const olderChats = [];

    sortedChats.forEach(chat => {
        const chatDate = new Date(chat.updatedAt);
        if (chatDate >= today) todayChats.push(chat);
        else if (chatDate >= yesterday) yesterdayChats.push(chat);
        else if (chatDate >= lastWeek) lastWeekChats.push(chat);
        else olderChats.push(chat);
    });

    renderChatGroup('Сегодня', todayChats);
    renderChatGroup('Вчера', yesterdayChats);
    renderChatGroup('На этой неделе', lastWeekChats);
    renderChatGroup('Ранее', olderChats);
}

function renderChatGroup(title, chatGroup) {
    if (chatGroup.length === 0 || !chatsList) return;
    const groupHeader = document.createElement('div');
    groupHeader.className = 'chat-group-header';
    groupHeader.textContent = title;
    chatsList.appendChild(groupHeader);

    chatGroup.forEach(chat => {
        const chatElement = createChatElement(chat);
        chatsList.appendChild(chatElement);
    });
}

function createChatElement(chat) {
    const preview = chat.messages.length > 0
        ? getLastMessagePreview(chat.messages[chat.messages.length - 1])
        : 'Нет сообщений';
    const date = formatDate(chat.updatedAt);

    const chatElement = document.createElement('div');
    chatElement.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
    chatElement.onclick = () => openChat(chat.id);

    chatElement.innerHTML = `
        <div class="chat-item-content">
            <div class="chat-title">${escapeHtml(chat.title)}</div>
            <div class="chat-preview">${preview}</div>
            <div class="chat-date">${date}</div>
        </div>
        <div class="chat-actions">
            <button class="chat-action-btn" title="Переименовать">✏️</button>
            <button class="chat-action-btn delete" title="Удалить">🗑️</button>
        </div>
    `;

    const renameBtn = chatElement.querySelector('.chat-action-btn:not(.delete)');
    const deleteBtn = chatElement.querySelector('.chat-action-btn.delete');

    if (renameBtn) {
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        };
    }
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            showDeleteModal(chat.id, chat.title);
        };
    }
    return chatElement;
}
async function openChat(chatId) {
    console.log(`Открытие чата ${chatId}...`);
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chats.forEach(c => c.isActive = false);
    chat.isActive = true;
    currentChatId = chatId;

    if (currentChatTitle) {
        currentChatTitle.textContent = chat.title;
    }

    // 1. Загружаем сообщения чата
    await loadChatMessages(chatId);

    // 2. ✅ ДОБАВЛЕНО: Загружаем файлы ТОЛЬКО для этого чата
    if (typeof loadChatFiles === 'function') {
        await loadChatFiles(chatId);
    }

    if (chat.model && modelSelect && modelSelect.value) {
        modelSelect.value = chat.model;
    }

    renderChatsList();

    setTimeout(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, 100);

    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }
}

function getLastMessagePreview(message) {
    if (!message) return 'Нет сообщений';
    const content = message.content || message.message || '';
    const maxLength = 50;
    return content.length <= maxLength ? escapeHtml(content) : escapeHtml(content.substring(0, maxLength)) + '...';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    else if (diffDays === 1) return 'Вчера';
    else if (diffDays < 7) return `${diffDays} дня назад`;
    else return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function confirmDeleteChat() {
    if (!currentDeleteChatId) return;
    const success = await deleteChatFromServer(currentDeleteChatId);
    if (success) {
        const chatIndex = chats.findIndex(chat => chat.id === currentDeleteChatId);
        if (chatIndex === -1) return;
        const isActiveChat = chats[chatIndex].id === currentChatId;
        chats.splice(chatIndex, 1);
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (isActiveChat) {
            if (chats.length > 0) {
                openChat(chats[0].id);
                await loadChatMessages(chats[0].id);
            } else {
                if (currentChatTitle) currentChatTitle.textContent = 'Новый чат';
                if (chatContainer) chatContainer.innerHTML = '';
                currentChatId = null;
            }
        }
        renderChatsList();
    } else {
        alert('Не удалось удалить чат на сервере');
    }
    hideDeleteModal();
}

async function renameChat(chatId) {
    const chat = chats.find(c => c.id === chatId.toString());
    if (!chat) return;
    const newTitle = prompt('Введите новое название чата:', chat.title);
    if (newTitle && newTitle.trim() !== '') {
        const success = await renameChatOnServer(chatId, newTitle.trim());
        if (success) {
            chat.title = newTitle.trim();
            chat.updatedAt = new Date().toISOString();
            chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            if (chatId === currentChatId && currentChatTitle) currentChatTitle.textContent = chat.title;
            renderChatsList();
        } else {
            alert('Не удалось переименовать чат');
        }
    }
}

async function updateChatTitle(chat) {
    if (chat.messages.length >= 2) {
        const userMessage = chat.messages[0].content;
        let newTitle = userMessage.length <= 30 ? userMessage : userMessage.substring(0, 30) + '...';
        const success = await renameChatOnServer(chat.id, newTitle);
        if (success) {
            chat.title = newTitle;
            chat.updatedAt = new Date().toISOString();
            chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            if (chat.id === currentChatId && currentChatTitle) currentChatTitle.textContent = chat.title;
            renderChatsList();
        }
    }
}

async function clearChat() {
    if (confirm('Вы уверены, что хотите очистить текущий чат?')) {
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages = [];
            chat.updatedAt = new Date().toISOString();
            if (chatContainer) chatContainer.innerHTML = '';
            chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    }
}

function exportChat() {
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat || chat.messages.length === 0) return alert('Нет сообщений для экспорта');
    let exportText = `Чат: ${chat.title}\nМодель: ${chat.model || 'Не указана'}\nДата: ${new Date().toLocaleString('ru-RU')}\n\n`;
    chat.messages.forEach(msg => {
        exportText += `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'} (${new Date(msg.timestamp).toLocaleTimeString('ru-RU')}):\n${msg.content}\n\n`;
    });
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${chat.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.loadChatsFromServer = loadChatsFromServer;
window.loadChatMessages = loadChatMessages;
window.createNewChat = createNewChat;
window.deleteChatFromServer = deleteChatFromServer;
window.renameChatOnServer = renameChatOnServer;
window.renderChatsList = renderChatsList;
window.renderChatGroup = renderChatGroup;
window.createChatElement = createChatElement;
window.openChat = openChat;
window.getLastMessagePreview = getLastMessagePreview;
window.formatDate = formatDate;
window.confirmDeleteChat = confirmDeleteChat;
window.renameChat = renameChat;
window.updateChatTitle = updateChatTitle;
window.clearChat = clearChat;
window.exportChat = exportChat;