// auth.js - Функции авторизации

async function checkAndValidateAuth() {
    console.log('Проверка авторизации...');
    
    authToken = getCookie(TOKEN_COOKIE_NAME);
    currentUser = getCookie(USER_COOKIE_NAME);
    currentUserRole = getCookie(USER_ROLE_COOKIE_NAME);
    
    console.log('Найден токен:', !!authToken);
    console.log('Найден пользователь:', currentUser);
    console.log('Найдена роль пользователя:', currentUserRole);
    
    if (authToken && currentUser) {
        console.log('Проверяем валидность токена...');
        const isValid = await validateAccessToken(authToken);
        
        if (isValid) {
            console.log('Токен валиден, обновляем UI');
            updateAuthUI(true);
            await loadModelsWithToken();
            await loadChatsFromServer();
            // Загружаем промты с сервера
            await loadPromptsFromServer();
            await loadSharedPromptsFromServer();
        } else {
            console.log('Токен невалиден, очищаем cookies');
            clearAuthCookies();
            updateAuthUI(false);
            updateModelSelector([]);
            setTimeout(() => showAuthModal(), 500);
        }
    } else {
        console.log('Нет сохраненного токена, показываем форму авторизации');
        updateAuthUI(false);
        updateModelSelector([]);
        setTimeout(() => showAuthModal(), 500);
    }
}

function clearAuthCookies() {
    deleteCookie(TOKEN_COOKIE_NAME);
    deleteCookie(USER_COOKIE_NAME);
    deleteCookie(USER_ROLE_COOKIE_NAME);
    authToken = null;
    currentUser = null;
    currentUserRole = null;
}

function updateAdminButton() {
    if (!adminLink) return;
    
    if (currentUserRole === 'admin') {
        adminLink.style.display = 'block';
    } else {
        adminLink.style.display = 'none';
    }
}

async function validateAccessToken(token) {
    return new Promise((resolve) => {
        console.log('Отправка запроса валидации токена...');
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_auth/access_token`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: token
            }),
            success: function(data) {
                console.log('Ответ валидации токена:', data);
                if (data.status === 0 && data.user) {
                    currentUserRole = data.user.role || 'user';
                    setCookie(USER_ROLE_COOKIE_NAME, currentUserRole, 7);
                }
                resolve(data.status === 0);
            },
            error: function(error) {
                console.error('Ошибка валидации токена:', error);
                resolve(false);
            },
            timeout: 10000
        });
    });
}

async function loadModelsWithToken() {
    if (!authToken) {
        console.log('Нет токена для загрузки моделей');
        updateModelSelector([]);
        return;
    }
    
    console.log('Загрузка моделей...');
    
    $.ajax({
        url: `${API_BASE_URL}/api/v1.1/route_ollama/ollama_get_models`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            access_token: authToken
        }),
        success: function(data) {
            console.log('Модели загружены:', data);
            if (data.status === 0 && data.data && Array.isArray(data.data)) {
                updateModelSelector(data.data);
            } else {
                console.error('Ошибка загрузки моделей:', data);
                updateModelSelector([]);
            }
        },
        error: function(error) {
            console.error('Ошибка загрузки моделей:', error);
            updateModelSelector([]);
        }
    });
}

function updateModelSelector(models) {
    if (!modelSelect) return;
    
    modelSelect.innerHTML = '';
    
    if (!models || models.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = authToken ? 'Нет доступных моделей' : 'Требуется авторизация';
        option.disabled = true;
        option.selected = true;
        modelSelect.appendChild(option);
        return;
    }
    
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        modelSelect.appendChild(option);
    });
    
    if (models.length > 0) {
        modelSelect.value = models[0].name;
    }
}

function updateAuthUI(isAuthenticated) {
    if (!authInfo) return;
    
    if (isAuthenticated) {
        authInfo.innerHTML = `
            <div class="user-dropdown">
                <button class="user-dropdown-btn">
                    <i class="fas fa-user"></i> ${escapeHtml(currentUser)}
                    <i class="fas fa-chevron-down dropdown-arrow"></i>
                </button>
                <div class="user-dropdown-menu">
                    <div class="dropdown-item" onclick="window.location.href='webui'">
                        <i class="fas fa-comments"></i> Чат с ИИ
                    </div>
                    <div class="dropdown-item" onclick="window.location.href='admin'">
                        <i class="fas fa-cog"></i> Панель администратора
                    </div>
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item logout-item" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Выйти
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            initUserDropdown();
        }, 100);
    } else {
        authInfo.innerHTML = '<button class="login-btn" id="loginButton"><i class="fas fa-sign-in-alt"></i> Войти</button>';
        
        setTimeout(() => {
            const loginButton = document.getElementById('loginButton');
            if (loginButton) {
                loginButton.addEventListener('click', showAuthModal);
            }
        }, 100);
    }
}

function initUserDropdown() {
    const dropdownBtn = document.querySelector('.user-dropdown-btn');
    const dropdownMenu = document.querySelector('.user-dropdown-menu');
    
    if (dropdownBtn && dropdownMenu) {
        dropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });
        
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

function switchToUserMode() {
    const dropdownMenu = document.querySelector('.user-dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
    }
    console.log('Переключение в режим пользователя');
}

function switchToAdminMode() {
    if (currentUserRole === 'admin') {
        window.open(ADMIN_PANEL_URL, '_blank');
        const dropdownMenu = document.querySelector('.user-dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.classList.remove('show');
        }
    } else {
        alert('У вас нет прав администратора');
    }
}

function showAuthModal() {
    console.log('Показать модальное окно авторизации');
    if (authModal) {
        authModal.style.display = 'flex';
    }
    if (authMessage) {
        authMessage.textContent = '';
    }
    if (loginInput) {
        loginInput.value = '';
    }
    if (passwordInput) {
        passwordInput.value = '';
    }
    setTimeout(() => {
        if (loginInput) {
            loginInput.focus();
        }
    }, 100);
}

function hideAuthModal() {
    if (!authToken) return; // Не скрываем, если нет токена
    if (authModal) {
        authModal.style.display = 'none';
    }
    if (authMessage) {
        authMessage.textContent = '';
    }
}

async function performLogin() {
    console.log('Выполнение авторизации...');
    
    if (!loginInput || !passwordInput) {
        console.error('Не найдены поля ввода');
        return;
    }
    
    const login = loginInput.value.trim();
    const password = passwordInput.value.trim();
    
    console.log('Логин:', login);
    console.log('Пароль:', password ? '***' : 'пустой');
    
    if (!login) {
        showAuthMessage('Введите логин', 'error');
        if (loginInput) loginInput.focus();
        return;
    }
    
    if (!password) {
        showAuthMessage('Введите пароль', 'error');
        if (passwordInput) passwordInput.focus();
        return;
    }
    
    showAuthMessage('Выполняется вход...', '');
    
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_auth/login`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                login: login,
                password: password
            }),
            timeout: 10000
        });
        
        console.log('Ответ сервера авторизации:', response);
        
        if (response.status === 0 && response.access_token) {
            setCookie(TOKEN_COOKIE_NAME, response.access_token, 7);
            setCookie(USER_COOKIE_NAME, login, 7);
            
            if (response.user && response.user.role) {
                currentUserRole = response.user.role;
                setCookie(USER_ROLE_COOKIE_NAME, currentUserRole, 7);
            } else {
                const userInfo = await getUserInfo(response.access_token);
                if (userInfo && userInfo.role) {
                    currentUserRole = userInfo.role;
                    setCookie(USER_ROLE_COOKIE_NAME, currentUserRole, 7);
                }
            }
            
            authToken = response.access_token;
            currentUser = login;
            
            updateAuthUI(true);
            showAuthMessage('Авторизация успешна!', 'success');
            
            await loadModelsWithToken();
            await loadChatsFromServer();
            // Загружаем промты с сервера
            await loadPromptsFromServer();
            await loadSharedPromptsFromServer();
            
            setTimeout(() => {
                hideAuthModal();
            }, 1000);
            
        } else {
            showAuthMessage(response.error || 'Ошибка авторизации', 'error');
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        let errorMessage = 'Ошибка подключения';
        if (error.status === 0) {
            errorMessage = 'Не удалось подключиться к серверу. Проверьте соединение.';
        } else if (error.statusText) {
            errorMessage = `Ошибка: ${error.statusText}`;
        }
        showAuthMessage(errorMessage, 'error');
    }
}

async function getUserInfo(token) {
    return new Promise((resolve) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_auth/get_user_info`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                access_token: token
            }),
            success: function(data) {
                console.log('Информация о пользователе:', data);
                if (data.status === 0 && data.user) {
                    resolve(data.user);
                } else {
                    resolve(null);
                }
            },
            error: function(error) {
                console.error('Ошибка получения информации о пользователе:', error);
                resolve(null);
            }
        });
    });
}

function handleAuthError() {
    console.log('Обработка ошибки авторизации');
    clearAuthCookies();
    chats = [];
    updateAuthUI(false);
    updateModelSelector([]);
    renderChatsList();
    if (chatContainer) chatContainer.innerHTML = '';
    if (currentChatTitle) currentChatTitle.textContent = 'Новый чат';
}

async function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        clearAuthCookies();
        chats = [];
        updateAuthUI(false);
        updateModelSelector([]);
        renderChatsList();
        if (chatContainer) chatContainer.innerHTML = '';
        if (currentChatTitle) currentChatTitle.textContent = 'Новый чат';
        showAuthModal();
    }
}

function showAuthMessage(message, type) {
    if (!authMessage) return;
    
    authMessage.textContent = message;
    authMessage.className = '';
    if (type === 'error') {
        authMessage.classList.add('error-message');
    } else if (type === 'success') {
        authMessage.classList.add('success-message');
    }
}
// Экспорт функций в глобальную область видимости
window.checkAndValidateAuth = checkAndValidateAuth;
window.clearAuthCookies = clearAuthCookies;
window.updateAdminButton = updateAdminButton;
window.validateAccessToken = validateAccessToken;
window.loadModelsWithToken = loadModelsWithToken;
window.updateModelSelector = updateModelSelector;
window.updateAuthUI = updateAuthUI;
window.initUserDropdown = initUserDropdown;
window.switchToUserMode = switchToUserMode;
window.switchToAdminMode = switchToAdminMode;
window.showAuthModal = showAuthModal;
window.hideAuthModal = hideAuthModal;
window.performLogin = performLogin;
window.getUserInfo = getUserInfo;
window.handleAuthError = handleAuthError;
window.logout = logout;
window.showAuthMessage = showAuthMessage;