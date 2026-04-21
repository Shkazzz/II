// Конфигурация API
const API_BASE_URL = 'http://10.10.0.15:9191';
const API_AUTH_URL = `${API_BASE_URL}/api/v1.1/route_auth/login`;
const API_USERS_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_user_list`;
const API_ADD_USER_URL = `${API_BASE_URL}/api/v1.1/route_admin/add_new_user`;
const API_UPDATE_FIO_URL = `${API_BASE_URL}/api/v1.1/route_admin/update_fio`;
const API_DELETE_USER_URL = `${API_BASE_URL}/api/v1.1/route_admin/update_delete`;
const API_UPDATE_PASSWORD_URL = `${API_BASE_URL}/api/v1.1/route_admin/update_password`;
const API_AUTH_LOG_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_log_list`;
const API_CHAT_LIST_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_chart_list`;
const API_CHAT_MESSAGES_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_chat_message`;
const API_LOG_FILES_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_log_files`;
const API_LOG_FILE_CONTENT_URL = `${API_BASE_URL}/api/v1.1/route_admin/get_log_file`;

// Переменные состояния
let currentTheme = 'light';
let currentUser = null;
let accessToken = Cookies.get('access_token') || '';
let usersData = [];
let authLogData = [];
let chatsData = [];
let selectedChatId = null;
let currentUserFilter = '';
let logFilesData = [];
let selectedFileName = null;

// Настройки для сортировки и фильтрации
let authLogSortConfig = {
    column: 'id',
    direction: 'desc'
};

let authLogFilters = {
    login: '',
    authType: '',
    hasError: ''
};

let chatsSortConfig = {
    column: 'dt',
    direction: 'desc'
};

let chatsFilters = {
    user: '',
    active: ''
};

// Настройки
const defaultSettings = {
    // Общие настройки
    darkMode: false,
    fontSize: 16,
    themeColor: 'blue',
    
    // Настройки интерфейса
    compactMode: false,
    animations: true,
    tooltips: true,
    autoRefresh: true,
    refreshInterval: 60,
    
    // Настройки безопасности
    autoLogout: 30,
    twoFactorAuth: false,
    activityLog: true,
    logLevel: 'info',
    
    // Настройки уведомлений
    notifyNewUsers: true,
    notifyAuthEvents: true,
    notifyErrors: true,
    notifySystemEvents: false,
    soundNotifications: true,
    volume: 70,
    
    // Настройки данных
    autoSave: true,
    autoSaveInterval: 5,
    exportFormat: 'csv'
};

let userSettings = { ...defaultSettings };

// Основная функция инициализации
$(document).ready(function() {
    initApp();
});

function initApp() {
     // 1. Загружаем настройки
    loadSettings();
    
    // 2. Применяем тему из настроек
    applyTheme();
    
    // 3. Инициализируем скрытие кнопки добавления пользователя
    $('#addUserBtn').hide();
    
    // 4. Проверяем авторизацию
    checkAuth();
    
    // 5. Инициализируем даты
    initDatePickers();
    
    // 6. Настраиваем обработчики событий
    setupEventHandlers();
}

// Загрузка настроек
function loadSettings() {
    const savedSettings = localStorage.getItem('adminPanelSettings');
    if (savedSettings) {
        try {
            const parsedSettings = JSON.parse(savedSettings);
            userSettings = { ...defaultSettings, ...parsedSettings };
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
}

// Сохранение настроек
function saveSettings() {
    localStorage.setItem('adminPanelSettings', JSON.stringify(userSettings));
    localStorage.setItem('theme', currentTheme);
}

// Применение темы
function applyTheme() {
    currentTheme = userSettings.darkMode ? 'dark' : 'light';
    setTheme(currentTheme);
    
    document.documentElement.style.fontSize = userSettings.fontSize + 'px';
    
    updateSettingsUI();
}

// Обновление UI настроек
function updateSettingsUI() {
    // Общие настройки
    $('#darkModeToggle').prop('checked', userSettings.darkMode);
    $('#fontSizeSlider').val(userSettings.fontSize);
    $('#fontSizeValue').text(userSettings.fontSize);
    
    // Цветовая схема
    $('.color-option').removeClass('selected');
    $(`.color-option[data-color="${userSettings.themeColor}"]`).addClass('selected');
    
    // Настройки интерфейса
    $('#compactModeToggle').prop('checked', userSettings.compactMode);
    $('#animationsToggle').prop('checked', userSettings.animations);
    $('#tooltipsToggle').prop('checked', userSettings.tooltips);
    $('#autoRefreshToggle').prop('checked', userSettings.autoRefresh);
    $('#refreshIntervalSelect').val(userSettings.refreshInterval);
    
    // Настройки безопасности
    $('#autoLogoutSelect').val(userSettings.autoLogout);
    $('#twoFactorToggle').prop('checked', userSettings.twoFactorAuth);
    $('#activityLogToggle').prop('checked', userSettings.activityLog);
    $('#logLevelSelect').val(userSettings.logLevel);
    
    // Настройки уведомлений
    $('#notifyNewUsers').prop('checked', userSettings.notifyNewUsers);
    $('#notifyAuthEvents').prop('checked', userSettings.notifyAuthEvents);
    $('#notifyErrors').prop('checked', userSettings.notifyErrors);
    $('#notifySystemEvents').prop('checked', userSettings.notifySystemEvents);
    $('#soundNotificationsToggle').prop('checked', userSettings.soundNotifications);
    $('#volumeSlider').val(userSettings.volume);
    $('#volumeValue').text(userSettings.volume);
    
    // Настройки данных
    $('#autoSaveToggle').prop('checked', userSettings.autoSave);
    $('#autoSaveIntervalSelect').val(userSettings.autoSaveInterval);
    $('#exportFormatSelect').val(userSettings.exportFormat);
}

// Применение цветовой схемы
function applyThemeColor(color) {
    const root = document.documentElement;
    switch(color) {
        case 'green':
            root.style.setProperty('--accent-color', '#28a745');
            root.style.setProperty('--accent-hover', '#218838');
            break;
        case 'purple':
            root.style.setProperty('--accent-color', '#6f42c1');
            root.style.setProperty('--accent-hover', '#5a32a3');
            break;
        case 'orange':
            root.style.setProperty('--accent-color', '#fd7e14');
            root.style.setProperty('--accent-hover', '#e06c0e');
            break;
        default: // blue
            root.style.setProperty('--accent-color', '#4a6fa5');
            root.style.setProperty('--accent-hover', '#3a5985');
    }
}

// Проверка авторизации
async function checkAuth() {
    const token = Cookies.get('access_token');
    if (token) {
        await verifyToken(token);
    } else {
        showLoginUI();
    }
}

// Проверка токена через API
async function verifyToken(token) {
    try {
        const data = {
            access_token: token
        };
        
        const result = await makeApiRequest(API_USERS_URL, 'POST', data, true);
        
        if (result.status === 0) {
            accessToken = token;
            currentUser = { username: 'Администратор' };
            showAdminUI();
            await loadUsers();
        } else {
            Cookies.remove('access_token');
            showLoginUI();
        }
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        showLoginUI();
    }
}

// Показать UI авторизации
function showLoginUI() {
    $('#userInfo').hide();
    $('#loginBtn').show();
    $('#appTabs').hide();
	$('#addUserBtn').hide();
    $('#usersTable tbody').html('<tr><td colspan="7" style="text-align: center;">Требуется авторизация</td></tr>');
}

// Показать UI администратора
function showAdminUI() {
    $('#currentUserName').text(currentUser?.username || 'Администратор');
    $('#userInfo').show();
    $('#loginBtn').hide();
    $('#appTabs').show();
	$('#addUserBtn').show();
}

// Настройка обработчиков событий
function setupEventHandlers() {
    // Обработчики темы
    $('#themeToggle').click(toggleTheme);
    $('#darkModeToggle').change(function() {
        userSettings.darkMode = $(this).is(':checked');
        currentTheme = userSettings.darkMode ? 'dark' : 'light';
        setTheme(currentTheme);
        saveSettings();
    });
    
    // Обработчики авторизации
    $('#loginBtn').click(openLoginDialog);
    $('#closeLoginBtn, #cancelLoginBtn').click(closeLoginDialog);
    $('#loginForm').submit(handleLogin);
    $('#logoutBtn').click(handleLogout);
    
    // Переход в чат с ИИ
    $('#goToChatBtn').click(function() {
        saveSettings();
        window.location.href = 'webui';
    });
    
    // Настройки
    $('#settingsBtn').click(function() {
        switchTab('settings');
    });
    
    $('#backFromSettingsBtn').click(function() {
        switchTab('users');
    });
    
    // Обработчики вкладок
    $('.tab').click(function() {
        const tabId = $(this).data('tab');
        switchTab(tabId);
        
        // Сброс фильтров при переключении вкладок
        if (tabId === 'auth-log') {
            resetAuthLogFilters();
        } else if (tabId === 'messages') {
            resetChatsFilters();
        }
    });

    // Обработчики пользователей
    $('#addUserBtn').click(openAddUserDialog);
    $('#closeAddUserBtn, #cancelAddUserBtn').click(closeAddUserDialog);
    $('#addUserForm').submit(handleAddUser);
    
    $('#closeEditUserBtn, #cancelEditUserBtn').click(closeEditUserDialog);
    $('#editUserForm').submit(handleEditUser);
    
    $('#closeChangePasswordBtn, #cancelChangePasswordBtn').click(closeChangePasswordDialog);
    $('#changePasswordForm').submit(handleChangePassword);

    // Обработчики журнала авторизации
    $('#loadAuthLogBtn').click(handleLoadAuthLog);
    $('#applyAuthLogFilters').click(applyAuthLogFilters);
    $('#resetAuthLogFilters').click(resetAuthLogFilters);
    $('#exportAuthLogBtn').click(exportAuthLog);

    // Обработчики переписки
    $('#loadMessagesBtn').click(handleLoadChats);
    $('#clearFilterBtn').click(clearUserFilter);
    $('#applyChatFilters').click(applyChatsFilters);
    $('#resetChatFilters').click(resetChatsFilters);
    $('#exportChatsBtn').click(exportChats);
    
    $('#userFilter').on('input', function() {
        currentUserFilter = $(this).val().trim();
        renderChatsTable();
    });
    
    // Обработчики журнала ошибок
    $('#loadErrorFilesBtn').click(handleLoadLogFiles);
    
    // Обработчики настроек
    $('#saveSettingsBtn').click(saveAllSettings);
    $('#resetSettingsBtn').click(resetAllSettings);
    
    // Обработчики элементов настроек
    $('#fontSizeSlider').on('input', function() {
        const value = $(this).val();
        $('#fontSizeValue').text(value);
        document.documentElement.style.fontSize = value + 'px';
        userSettings.fontSize = parseInt(value);
    });
    
    $('#volumeSlider').on('input', function() {
        const value = $(this).val();
        $('#volumeValue').text(value);
        userSettings.volume = parseInt(value);
    });
    
    // Цветовая схема
    $('.color-option').click(function() {
        const color = $(this).data('color');
        $('.color-option').removeClass('selected');
        $(this).addClass('selected');
        userSettings.themeColor = color;
        applyThemeColor(color);
    });
    
    // Обработчики переключателей и селектов
    $('#compactModeToggle').change(function() {
        userSettings.compactMode = $(this).is(':checked');
    });
    
    $('#animationsToggle').change(function() {
        userSettings.animations = $(this).is(':checked');
    });
    
    $('#tooltipsToggle').change(function() {
        userSettings.tooltips = $(this).is(':checked');
    });
    
    $('#autoRefreshToggle').change(function() {
        userSettings.autoRefresh = $(this).is(':checked');
    });
    
    $('#refreshIntervalSelect').change(function() {
        userSettings.refreshInterval = parseInt($(this).val());
    });
    
    $('#autoLogoutSelect').change(function() {
        userSettings.autoLogout = parseInt($(this).val());
    });
    
    $('#twoFactorToggle').change(function() {
        userSettings.twoFactorAuth = $(this).is(':checked');
    });
    
    $('#activityLogToggle').change(function() {
        userSettings.activityLog = $(this).is(':checked');
    });
    
    $('#logLevelSelect').change(function() {
        userSettings.logLevel = $(this).val();
    });
    
    $('#soundNotificationsToggle').change(function() {
        userSettings.soundNotifications = $(this).is(':checked');
    });
    
    $('#autoSaveToggle').change(function() {
        userSettings.autoSave = $(this).is(':checked');
    });
    
    $('#autoSaveIntervalSelect').change(function() {
        userSettings.autoSaveInterval = parseInt($(this).val());
    });
    
    $('#exportFormatSelect').change(function() {
        userSettings.exportFormat = $(this).val();
    });
    
    // Чекбоксы уведомлений
    $('#notifyNewUsers').change(function() {
        userSettings.notifyNewUsers = $(this).is(':checked');
    });
    
    $('#notifyAuthEvents').change(function() {
        userSettings.notifyAuthEvents = $(this).is(':checked');
    });
    
    $('#notifyErrors').change(function() {
        userSettings.notifyErrors = $(this).is(':checked');
    });
    
    $('#notifySystemEvents').change(function() {
        userSettings.notifySystemEvents = $(this).is(':checked');
    });
}

// Функции темы
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    userSettings.darkMode = currentTheme === 'dark';
    setTheme(currentTheme);
    saveSettings();
    
    $('#darkModeToggle').prop('checked', userSettings.darkMode);
}

function setTheme(theme) {
    $('body').attr('data-theme', theme);
    const icon = $('#themeToggle i');
    icon.removeClass('fa-moon fa-sun');
    icon.addClass(theme === 'light' ? 'fa-moon' : 'fa-sun');
}

// Функции вкладок
function switchTab(tabId) {
    $('.tab').removeClass('active');
    $(`.tab[data-tab="${tabId}"]`).addClass('active');
    
    $('.tab-content').removeClass('active');
    $(`#${tabId}-tab`).addClass('active');
    
    if (tabId === 'settings') {
        $('#appTabs').hide();
    } else {
        $('#appTabs').show();
    }
    
    if (tabId !== 'messages') {
        selectedChatId = null;
        $('#selectedChatName').text('-');
        $('#messagesView').html('<div style="text-align: center; padding: 20px; color: #999;">Выберите чат для просмотра сообщений</div>');
    }
    
    if (tabId !== 'error-log') {
        selectedFileName = null;
        $('#selectedFileName').text('-');
        $('#fileInfo').hide();
        $('#errorFileText').val('');
    }
}

// Функции отображения статуса
function showStatusMessage(elementId, message, type = 'info') {
    const element = $(elementId);
    element.removeClass('success error info').addClass(type).text(message).show();
    setTimeout(() => {
        element.fadeOut(500);
    }, 3000);
}

// Функции загрузки состояния
function showLoading(buttonId) {
    const button = $(buttonId);
    const originalText = button.text();
    button.data('original-text', originalText);
    button.html('<span class="loading"></span>');
    button.prop('disabled', true);
}

function hideLoading(buttonId) {
    const button = $(buttonId);
    const originalText = button.data('original-text');
    button.text(originalText);
    button.prop('disabled', false);
}

// Функции диалогов
function openLoginDialog() {
    $('#loginDialog').addClass('active');
    $('#loginStatusMessage').hide();
}

function closeLoginDialog() {
    $('#loginDialog').removeClass('active');
    $('#loginForm')[0].reset();
}

function openAddUserDialog() {
    $('#addUserDialog').addClass('active');
    $('#addUserStatusMessage').hide();
}

function closeAddUserDialog() {
    $('#addUserDialog').removeClass('active');
    $('#addUserForm')[0].reset();
}

function openEditUserDialog(userId) {
    const user = usersData.find(u => u.id == userId);
    if (user) {
        $('#editUserId').val(user.id);
        $('#editLogin').val(user.login);
        $('#editFullName').val(user.fio || '');
        $('#editRole').val(user.role);
        $('#editUserDialog').addClass('active');
        $('#editUserStatusMessage').hide();
    }
}

function closeEditUserDialog() {
    $('#editUserDialog').removeClass('active');
    $('#editUserForm')[0].reset();
}

function openChangePasswordDialog(userId) {
    const user = usersData.find(u => u.id == userId);
    if (user) {
        $('#passwordUserId').val(user.id);
        $('#passwordUserLogin').val(user.login);
        $('#changePasswordDialog').addClass('active');
        $('#changePasswordStatusMessage').hide();
    }
}

function closeChangePasswordDialog() {
    $('#changePasswordDialog').removeClass('active');
    $('#changePasswordForm')[0].reset();
}

// Функция инициализации выбора дат
function initDatePickers() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const formatDateTime = (date) => {
        return date.toISOString().slice(0, 16);
    };
    
    $('#authDateFrom').val(formatDateTime(oneHourAgo));
    $('#authDateTo').val(formatDateTime(now));
    $('#msgDateFrom').val(formatDateTime(oneHourAgo));
    $('#msgDateTo').val(formatDateTime(now));
}

// Функции API
async function makeApiRequest(url, method = 'POST', data = null, requiresAuth = false) {
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    
    if (requiresAuth && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const requestOptions = {
        method: method,
        headers: headers,
        credentials: 'omit'
    };
    
    if (data) {
        requestOptions.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, requestOptions);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.descr || `HTTP ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Функции обработки форм
async function handleLogin(e) {
    e.preventDefault();
    const username = $('#username').val();
    const password = $('#password').val();
    
    showLoading('#loginSubmitBtn');
    
    try {
        const data = {
            login: username,
            password: password
        };
        
        const result = await makeApiRequest(API_AUTH_URL, 'POST', data);
        
        if (result.status === 0) {
            accessToken = result.access_token;
            Cookies.set('access_token', accessToken, { expires: 7, path: '/' });
            
            currentUser = {
                username: username,
                role: 'admin'
            };
            
            showAdminUI();
            await loadUsers();
            
            showStatusMessage('#loginStatusMessage', 'Вход выполнен успешно', 'success');
            closeLoginDialog();
        } else {
            showStatusMessage('#loginStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showStatusMessage('#loginStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    } finally {
        hideLoading('#loginSubmitBtn');
    }
}

async function handleLogout() {
    Cookies.remove('access_token', { path: '/' });
    accessToken = '';
    currentUser = null;
    
    showLoginUI();
    
    showStatusMessage('#usersStatusMessage', 'Вы вышли из системы', 'info');
}

async function handleAddUser(e) {
    e.preventDefault();
    const login = $('#addLogin').val();
    const fullName = $('#addFullName').val();
    const role = $('#addRole').val();
    const password = $('#addPassword').val();
    const confirmPassword = $('#addConfirmPassword').val();
    
    if (password !== confirmPassword) {
        showStatusMessage('#addUserStatusMessage', 'Пароли не совпадают', 'error');
        return;
    }
    
    if (password.length < 6) {
        showStatusMessage('#addUserStatusMessage', 'Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    showLoading('#addUserSubmitBtn');
    
    try {
        const data = {
            access_token: accessToken,
            login: login,
            password: password,
            role: role,
            fio: fullName || ''
        };
        
        const result = await makeApiRequest(API_ADD_USER_URL, 'POST', data, true);
        
        if (result.status === 0) {
            showStatusMessage('#addUserStatusMessage', 'Пользователь успешно добавлен', 'success');
            closeAddUserDialog();
            await loadUsers();
        } else {
            showStatusMessage('#addUserStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showStatusMessage('#addUserStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    } finally {
        hideLoading('#addUserSubmitBtn');
    }
}

async function handleEditUser(e) {
    e.preventDefault();
    const userId = $('#editUserId').val();
    const fullName = $('#editFullName').val();
    const role = $('#editRole').val();
    
    showLoading('#editUserSubmitBtn');
    
    try {
        const data = {
            access_token: accessToken,
            id: userId,
            fio: fullName || '',
            role: role
        };
        
        const result = await makeApiRequest(API_UPDATE_FIO_URL, 'POST', data, true);
        
        if (result.status === 0) {
            showStatusMessage('#editUserStatusMessage', 'Данные пользователя успешно обновлены', 'success');
            closeEditUserDialog();
            await loadUsers();
        } else {
            showStatusMessage('#editUserStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showStatusMessage('#editUserStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    } finally {
        hideLoading('#editUserSubmitBtn');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const userId = $('#passwordUserId').val();
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmPassword').val();
    
    if (newPassword !== confirmPassword) {
        showStatusMessage('#changePasswordStatusMessage', 'Пароли не совпадают', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showStatusMessage('#changePasswordStatusMessage', 'Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    showLoading('#changePasswordSubmitBtn');
    
    try {
        const data = {
            access_token: accessToken,
            id: userId,
            password: newPassword
        };
        
        const result = await makeApiRequest(API_UPDATE_PASSWORD_URL, 'POST', data, true);
        
        if (result.status === 0) {
            showStatusMessage('#changePasswordStatusMessage', 'Пароль успешно изменен', 'success');
            closeChangePasswordDialog();
            await loadUsers();
        } else {
            showStatusMessage('#changePasswordStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showStatusMessage('#changePasswordStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    } finally {
        hideLoading('#changePasswordSubmitBtn');
    }
}

// Журнал авторизации - обновленные функции
async function handleLoadAuthLog() {
    const dateFrom = $('#authDateFrom').val();
    const dateTo = $('#authDateTo').val();
    
    if (!dateFrom || !dateTo) {
        showStatusMessage('#authLogStatusMessage', 'Выберите период дат', 'error');
        return;
    }
    
    if (!accessToken) {
        showStatusMessage('#authLogStatusMessage', 'Требуется авторизация', 'error');
        return;
    }
    
    const formatDateForApi = (dateTimeString) => {
        return dateTimeString.replace('T', ' ');
    };
    
    showLoading('#loadAuthLogBtn');
    
    try {
        const data = {
            access_token: accessToken,
            dts: formatDateForApi(dateFrom),
            dte: formatDateForApi(dateTo)
        };
        
        const result = await makeApiRequest(API_AUTH_LOG_URL, 'POST', data, true);
        
        if (result.status === 0) {
            authLogData = result.data || [];
            applyAuthLogFilters();
            showStatusMessage('#authLogStatusMessage', `Загружено записей: ${authLogData.length}`, 'success');
        } else {
            showStatusMessage('#authLogStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
            $('#authLogTable tbody').html(`<tr class="small-row"><td colspan="10" style="text-align: center; color: var(--error-color);">Ошибка: ${result.descr || 'Неизвестная ошибка'}</td></tr>`);
        }
    } catch (error) {
        showStatusMessage('#authLogStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
        $('#authLogTable tbody').html(`<tr class="small-row"><td colspan="10" style="text-align: center; color: var(--error-color);">Ошибка соединения: ${error.message}</td></tr>`);
    } finally {
        hideLoading('#loadAuthLogBtn');
    }
}

function applyAuthLogFilters() {
    // Получаем значения фильтров
    authLogFilters.login = $('#authLogFilterLogin').val().trim().toLowerCase();
    authLogFilters.authType = $('#authLogFilterType').val();
    authLogFilters.hasError = $('#authLogFilterError').val();
    
    // Фильтрация данных
    let filteredData = authLogData.filter(log => {
        // Фильтр по логину
        if (authLogFilters.login && log.login) {
            if (!log.login.toLowerCase().includes(authLogFilters.login)) {
                return false;
            }
        }
        
        // Фильтр по типу авторизации
        if (authLogFilters.authType && authLogFilters.authType !== 'all') {
            if (log.type !== authLogFilters.authType) {
                return false;
            }
        }
        
        // Фильтр по наличию ошибки
        if (authLogFilters.hasError && authLogFilters.hasError !== 'all') {
            const hasError = Boolean(log.error);
            if (authLogFilters.hasError === 'yes' && !hasError) {
                return false;
            }
            if (authLogFilters.hasError === 'no' && hasError) {
                return false;
            }
        }
        
        return true;
    });
    
    // Сортировка
    filteredData.sort((a, b) => {
        let aValue = a[authLogSortConfig.column];
        let bValue = b[authLogSortConfig.column];
        
        // Приведение к одному типу для сортировки
        if (authLogSortConfig.column === 'id') {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
        } else if (authLogSortConfig.column === 'dt') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (authLogSortConfig.column === 'valid') {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (authLogSortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    
    renderAuthLogTable(filteredData);
    
    // Обновляем счетчик
    $('#authLogCounter').text(`Найдено: ${filteredData.length} из ${authLogData.length}`);
}

function resetAuthLogFilters() {
    $('#authLogFilterLogin').val('');
    $('#authLogFilterType').val('all');
    $('#authLogFilterError').val('all');
    authLogFilters = {
        login: '',
        authType: '',
        hasError: ''
    };
    applyAuthLogFilters();
}

function sortAuthLogTable(column) {
    if (authLogSortConfig.column === column) {
        // Меняем направление сортировки, если кликаем по той же колонке
        authLogSortConfig.direction = authLogSortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Сортируем по новой колонке по убыванию
        authLogSortConfig.column = column;
        authLogSortConfig.direction = 'desc';
    }
    
    // Обновляем иконки сортировки
    $('#authLogTable th').removeClass('sort-asc sort-desc');
    $(`#authLogTable th[data-column="${column}"]`).addClass(`sort-${authLogSortConfig.direction}`);
    
    applyAuthLogFilters();
}

function renderAuthLogTable(data = null) {
    const displayData = data || authLogData;
    const tbody = $('#authLogTable tbody');
    tbody.empty();
    
    if (displayData.length === 0) {
        tbody.append('<tr class="small-row"><td colspan="10" style="text-align: center;">Нет данных за выбранный период</td></tr>');
        return;
    }
    
    displayData.forEach(log => {
        const formatDate = (dateString) => {
            if (!dateString) return '<span class="empty-value">-</span>';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
        };
        
        const getAuthTypeClass = (type) => {
            switch(type) {
                case 'token': return 'auth-type-token';
                case 'login': return 'auth-type-login';
                case 'logout': return 'auth-type-logout';
                default: return 'auth-type-error';
            }
        };
        
        const typeClass = getAuthTypeClass(log.type);
        const typeDisplay = log.type || '<span class="empty-value">-</span>';
        
        const password = log.password 
            ? (log.password.length > 10 ? '******' : log.password)
            : '<span class="empty-value">-</span>';
        
        const valid = log.valid || '<span class="empty-value">-</span>';
        const descr = log.descr || '<span class="empty-value">-</span>';
        
        const errorDisplay = log.error 
            ? '<span class="error-text">Да</span>' 
            : '<span class="success-text">Нет</span>';
        
        const row = `
            <tr class="small-row">
                <td>${log.id}</td>
                <td>${formatDate(log.dt)}</td>
                <td><span class="auth-type ${typeClass}">${typeDisplay}</span></td>
                <td>${log.login || '<span class="empty-value">-</span>'}</td>
                <td>${password}</td>
                <td>${valid}</td>
                <td>${formatDate(log.dtvalid)}</td>
                <td class="truncate-text" title="${descr}">${descr}</td>
                <td>${errorDisplay}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

function exportAuthLog() {
    if (authLogData.length === 0) {
        showStatusMessage('#authLogStatusMessage', 'Нет данных для экспорта', 'error');
        return;
    }
    
    const headers = ['ID', 'Дата', 'Тип', 'Пользователь', 'Пароль', 'Валидность (мин)', 'Дата валидности', 'Описание', 'Ошибка'];
    const csvRows = [];
    
    // Добавляем заголовки
    csvRows.push(headers.join(','));
    
    // Добавляем данные
    authLogData.forEach(log => {
        const formatDate = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toLocaleString('ru-RU');
        };
        
        const password = log.password ? (log.password.length > 10 ? '******' : log.password) : '';
        const error = log.error ? 'Да' : 'Нет';
        
        const row = [
            log.id,
            formatDate(log.dt),
            log.type || '',
            log.login || '',
            password,
            log.valid || '',
            formatDate(log.dtvalid),
            log.descr || '',
            error
        ].map(field => `"${field}"`).join(',');
        
        csvRows.push(row);
    });
    
    // Создаем и скачиваем файл
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `auth_log_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatusMessage('#authLogStatusMessage', 'Данные экспортированы в CSV', 'success');
}

// Переписка пользователей - обновленные функции
async function handleLoadChats() {
    const dateFrom = $('#msgDateFrom').val();
    const dateTo = $('#msgDateTo').val();
    
    if (!dateFrom || !dateTo) {
        showStatusMessage('#messagesStatusMessage', 'Выберите период дат', 'error');
        return;
    }
    
    if (!accessToken) {
        showStatusMessage('#messagesStatusMessage', 'Требуется авторизация', 'error');
        return;
    }
    
    const formatDateForApi = (dateTimeString) => {
        return dateTimeString.replace('T', ' ');
    };
    
    showLoading('#loadMessagesBtn');
    
    try {
        const data = {
            access_token: accessToken,
            dts: formatDateForApi(dateFrom),
            dte: formatDateForApi(dateTo)
        };
        
        const result = await makeApiRequest(API_CHAT_LIST_URL, 'POST', data, true);
        
        if (result.status === 0) {
            chatsData = result.data || [];
            applyChatsFilters();
            showStatusMessage('#messagesStatusMessage', `Загружено чатов: ${chatsData.length}`, 'success');
            
            selectedChatId = null;
            $('#selectedChatName').text('-');
            $('#messagesView').html('<div style="text-align: center; padding: 20px; color: #999;">Выберите чат для просмотра сообщений</div>');
        } else {
            showStatusMessage('#messagesStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
            $('#chatsTable tbody').html(`<tr class="small-row"><td colspan="6" style="text-align: center; color: var(--error-color);">Ошибка: ${result.descr || 'Неизвестная ошибка'}</td></tr>`);
        }
    } catch (error) {
        showStatusMessage('#messagesStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
        $('#chatsTable tbody').html(`<tr class="small-row"><td colspan="6" style="text-align: center; color: var(--error-color);">Ошибка соединения: ${error.message}</td></tr>`);
    } finally {
        hideLoading('#loadMessagesBtn');
    }
}

function applyChatsFilters() {
    // Получаем значения фильтров
    chatsFilters.user = $('#chatFilterUser').val().trim().toLowerCase();
    chatsFilters.active = $('#chatFilterActive').val();
    
    // Фильтрация данных
    let filteredData = chatsData.filter(chat => {
        // Фильтр по пользователю
        if (chatsFilters.user && chat.user) {
            if (!chat.user.toLowerCase().includes(chatsFilters.user)) {
                return false;
            }
        }
        
        // Фильтр по активности
        if (chatsFilters.active && chatsFilters.active !== 'all') {
            const isActive = Boolean(chat.active);
            if (chatsFilters.active === 'active' && !isActive) {
                return false;
            }
            if (chatsFilters.active === 'inactive' && isActive) {
                return false;
            }
        }
        
        return true;
    });
    
    // Сортировка
    filteredData.sort((a, b) => {
        let aValue = a[chatsSortConfig.column];
        let bValue = b[chatsSortConfig.column];
        
        // Приведение к одному типу для сортировки
        if (chatsSortConfig.column === 'dt') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (chatsSortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
    
    renderChatsTable(filteredData);
    
    // Обновляем счетчик
    $('#chatsCounter').text(`Найдено: ${filteredData.length} из ${chatsData.length}`);
}

function resetChatsFilters() {
    $('#chatFilterUser').val('');
    $('#chatFilterActive').val('all');
    $('#userFilter').val('');
    currentUserFilter = '';
    chatsFilters = {
        user: '',
        active: ''
    };
    applyChatsFilters();
}

function sortChatsTable(column) {
    if (chatsSortConfig.column === column) {
        // Меняем направление сортировки, если кликаем по той же колонке
        chatsSortConfig.direction = chatsSortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Сортируем по новой колонке по убыванию
        chatsSortConfig.column = column;
        chatsSortConfig.direction = 'desc';
    }
    
    // Обновляем иконки сортировки
    $('#chatsTable th').removeClass('sort-asc sort-desc');
    $(`#chatsTable th[data-column="${column}"]`).addClass(`sort-${chatsSortConfig.direction}`);
    
    applyChatsFilters();
}

function clearUserFilter() {
    $('#userFilter').val('');
    currentUserFilter = '';
    renderChatsTable();
}

function renderChatsTable(data = null) {
    const displayData = data || chatsData;
    const tbody = $('#chatsTable tbody');
    tbody.empty();
    
    if (displayData.length === 0) {
        const message = chatsData.length === 0 
            ? 'Выберите период и нажмите "Загрузить чаты"'
            : 'Нет данных, соответствующих фильтрам';
        tbody.append(`<tr class="small-row"><td colspan="6" style="text-align: center;">${message}</td></tr>`);
        return;
    }
    
    displayData.forEach(chat => {
        const formatDate = (dateString) => {
            if (!dateString) return '<span class="empty-value">-</span>';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU').slice(0, 5);
        };
        
        const activeBadge = chat.active 
            ? '<span class="active-badge active-yes">Активен</span>'
            : '<span class="active-badge active-no">Удален</span>';
        
        const truncatedUser = chat.user 
            ? (chat.user.length > 20 ? chat.user.substring(0, 17) + '...' : chat.user)
            : '<span class="empty-value">-</span>';
        
        const truncatedName = chat.name 
            ? (chat.name.length > 25 ? chat.name.substring(0, 22) + '...' : chat.name)
            : '<span class="empty-value">-</span>';
        
        const isSelected = chat.id === selectedChatId;
        const rowClass = `chat-row small-row ${isSelected ? 'selected' : ''}`;
        const countMessages=chat.mcount;;
        const row = `
            <tr class="${rowClass}" onclick="selectChat('${chat.id}', '')">
                <td class="hidden">${chat.id}</td>
                <td>${formatDate(chat.dt)}</td>
                <td class="truncate-text" title="${chat.user || ''}">${truncatedUser}</td>
                <td class="truncate-text" title="${chat.name || ''}">${truncatedName}</td>
                <td>${activeBadge}</td>
				<td>${countMessages}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

function exportChats() {
    if (chatsData.length === 0) {
        showStatusMessage('#messagesStatusMessage', 'Нет данных для экспорта', 'error');
        return;
    }
    
    const headers = ['ID', 'Дата создания', 'Пользователь', 'Название чата', 'Состояние', 'Кол-во сообщений'];
    const csvRows = [];
    
    // Добавляем заголовки
    csvRows.push(headers.join(','));
    
    // Добавляем данные
    chatsData.forEach(chat => {
        const formatDate = (dateString) => {
            if (!dateString) return '';
            return new Date(dateString).toLocaleString('ru-RU');
        };
        
        const active = chat.active ? 'Активен' : 'Удален';
        
        const row = [
            chat.id,
            formatDate(chat.dt),
            chat.user || '',
            chat.name || '',
            active,
            chat.message_count || 0
        ].map(field => `"${field}"`).join(',');
        
        csvRows.push(row);
    });
    
    // Создаем и скачиваем файл
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `chats_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatusMessage('#messagesStatusMessage', 'Данные экспортированы в CSV', 'success');
}

async function selectChat(chatId, chatName) {
    if (!accessToken) {
        showStatusMessage('#messagesStatusMessage', 'Требуется авторизация', 'error');
        return;
    }
    
    selectedChatId = chatId;
    $('#selectedChatName').text(chatName || 'Неизвестный чат');
    
    // Обновляем выделение в таблице
    renderChatsTable();
    
    $('#messagesView').html('<div style="text-align: center; padding: 40px;"><span class="loading"></span><div style="margin-top: 10px;">Загрузка сообщений...</div></div>');
    
    try {
        const data = {
            access_token: accessToken,
            chat_id: chatId
        };
        
        const result = await makeApiRequest(API_CHAT_MESSAGES_URL, 'POST', data, true);
        
        if (result.status === 0) {
            const messages = result.data || [];
            renderMessages(messages);
        } else {
            $('#messagesView').html(`<div style="text-align: center; padding: 20px; color: var(--error-color);">Ошибка: ${result.descr || 'Неизвестная ошибка'}</div>`);
            showStatusMessage('#messagesStatusMessage', `Ошибка загрузки сообщений: ${result.descr}`, 'error');
        }
    } catch (error) {
        $('#messagesView').html(`<div style="text-align: center; padding: 20px; color: var(--error-color);">Ошибка соединения: ${error.message}</div>`);
        showStatusMessage('#messagesStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    }
}

function renderMessages(messages) {
    const messagesView = $('#messagesView');
    messagesView.empty();
    
    if (messages.length === 0) {
        messagesView.html('<div style="text-align: center; padding: 20px; color: #999;">Нет сообщений в этом чате</div>');
        return;
    }
    
    const messageContainer = $('<div class="message-container"></div>');
    
    messages.forEach(msg => {
        const formatDate = (dateString) => {
            if (!dateString) return 'Неизвестно';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
        };
        
        const isUserMessage = msg.user === true;
        const isAssistantMessage = msg.assistent === true;
        const messageClass = isUserMessage ? 'user-message' : (isAssistantMessage ? 'assistant-message' : 'message');
        
        const messageContent = formatMessageContent(msg.message || '');
        
        const messageElement = `
            <div class="message ${messageClass}">
                <div class="message-header">${formatDate(msg.dt)}</div>
                <div class="message-content">${messageContent}</div>
            </div>
        `;
        
        messageContainer.append(messageElement);
    });
    
    messagesView.append(messageContainer);
    
    setTimeout(() => {
        messagesView.scrollTop(messagesView[0].scrollHeight);
    }, 100);
}

// Функция форматирования сообщений
function formatMessageContent(text) {
    if (!text) return '';
    
    // Экранируем HTML символы
    let formattedText = escapeHtml(text);
    
    // Обработка кода - блоки с тремя обратными кавычками
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Обработка inline кода с одной обратной кавычкой
    formattedText = formattedText.replace(/`([^`]+)`/g, function(match, code) {
        return `<code>${escapeHtml(code)}</code>`;
    });
    
    // Заголовки
    formattedText = formattedText.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    formattedText = formattedText.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    formattedText = formattedText.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Жирный текст с ** или __
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Курсив с * или _
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Зачеркнутый текст
    formattedText = formattedText.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Списки
    formattedText = formattedText.replace(/^\s*[-*+]\s+(.*$)/gm, '<li>$1</li>');
    formattedText = formattedText.replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>');
    
    // Блоки цитат
    formattedText = formattedText.replace(/^>\s*(.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Горизонтальные линии
    formattedText = formattedText.replace(/^---$/gm, '<hr>');
    
    // Ссылки
    formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Разделяем на абзацы
    const lines = formattedText.split('\n');
    let result = '';
    let inList = false;
    let inQuote = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim().startsWith('<li>')) {
            if (!inList) {
                result += '<ul>';
                inList = true;
            }
            result += line;
        } else if (line.trim().startsWith('<blockquote>')) {
            if (!inQuote) {
                inQuote = true;
            }
            result += line;
        } else if (line.trim().startsWith('</blockquote>')) {
            inQuote = false;
            result += line;
        } else {
            if (inList) {
                result += '</ul>';
                inList = false;
            }
            
            if (line.trim() === '' && !inQuote) {
                result += '</p><p>';
            } else if (line.trim() !== '') {
                if (!line.startsWith('<') && !inQuote) {
                    result += `<p>${line}</p>`;
                } else {
                    result += line;
                }
            }
        }
    }
    
    if (inList) {
        result += '</ul>';
    }
    
    // Убираем пустые параграфы
    result = result.replace(/<p><\/p>/g, '');
    
    return result;
}

// Журнал ошибок
async function handleLoadLogFiles() {
    if (!accessToken) {
        showStatusMessage('#errorLogStatusMessage', 'Требуется авторизация', 'error');
        return;
    }
    
    showLoading('#loadErrorFilesBtn');
    
    try {
        const data = {
            access_token: accessToken
        };
        
        const result = await makeApiRequest(API_LOG_FILES_URL, 'POST', data, true);
        
        if (result.status === 0) {
            logFilesData = result.data || [];
            renderLogFilesTable();
            showStatusMessage('#errorLogStatusMessage', `Загружено файлов: ${logFilesData.length}`, 'success');
            
            selectedFileName = null;
            $('#selectedFileName').text('-');
            $('#fileInfo').hide();
            $('#errorFileText').val('');
        } else {
            showStatusMessage('#errorLogStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
            $('#errorFilesTable tbody').html(`<tr class="medium-row"><td colspan="2" style="text-align: center; color: var(--error-color);">Ошибка: ${result.descr || 'Неизвестная ошибка'}</td></tr>`);
        }
    } catch (error) {
        showStatusMessage('#errorLogStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
        $('#errorFilesTable tbody').html(`<tr class="medium-row"><td colspan="2" style="text-align: center; color: var(--error-color);">Ошибка соединения: ${error.message}</td></tr>`);
    } finally {
        hideLoading('#loadErrorFilesBtn');
    }
}

function renderLogFilesTable() {
    const tbody = $('#errorFilesTable tbody');
    tbody.empty();
    
    if (logFilesData.length === 0) {
        tbody.append('<tr class="medium-row"><td colspan="2" style="text-align: center;">Нет файлов логов</td></tr>');
        return;
    }
    
    const sortedFiles = [...logFilesData].sort((a, b) => {
        return new Date(b.dt) - new Date(a.dt);
    });
    
    sortedFiles.forEach(file => {
        const formatDate = (dateString) => {
            if (!dateString) return '<span class="empty-value">-</span>';
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
        };
        
        const isSelected = file.name === selectedFileName;
        const rowClass = `log-row medium-row ${isSelected ? 'selected' : ''}`;
        
        const row = `
            <tr class="${rowClass}" onclick="selectLogFile('${escapeHtmlForAttribute(file.name || '')}')">
                <td>${formatDate(file.dt)}</td>
                <td class="truncate-text" title="${file.name || ''}">${file.name || '<span class="empty-value">-</span>'}</td>
            </tr>
        `;
        tbody.append(row);
    });
}

async function selectLogFile(fileName) {
    if (!accessToken) {
        showStatusMessage('#errorLogStatusMessage', 'Требуется авторизация', 'error');
        return;
    }
    
    selectedFileName = fileName;
    $('#selectedFileName').text(fileName || 'Неизвестный файл');
    
    renderLogFilesTable();
    
    $('#errorFileText').val('Загрузка файла...');
    $('#fileInfo').hide();
    
    try {
        const data = {
            access_token: accessToken,
            fname: fileName
        };
        
        const result = await makeApiRequest(API_LOG_FILE_CONTENT_URL, 'POST', data, true);
        
        if (result.status === 0) {
            const fileContent = result.data || '';
            $('#errorFileText').val(fileContent);
            
            updateFileInfo(fileContent, fileName);
            $('#fileInfo').show();
        } else {
            $('#errorFileText').val(`Ошибка загрузки файла: ${result.descr || 'Неизвестная ошибка'}`);
            showStatusMessage('#errorLogStatusMessage', `Ошибка загрузки файла: ${result.descr}`, 'error');
        }
    } catch (error) {
        $('#errorFileText').val(`Ошибка соединения: ${error.message}`);
        showStatusMessage('#errorLogStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    }
}

function updateFileInfo(content, fileName) {
    const fileSize = content.length;
    const fileSizeFormatted = formatFileSize(fileSize);
    $('#fileSize').text(fileSizeFormatted);
    
    const lines = content.split('\n').length;
    $('#fileLines').text(lines);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Функции загрузки данных пользователей
async function loadUsers() {
    if (!accessToken) {
        $('#usersTable tbody').html('<tr><td colspan="7" style="text-align: center;">Требуется авторизация</td></tr>');
        return;
    }
    
    try {
        const data = {
            access_token: accessToken
        };
        
        const result = await makeApiRequest(API_USERS_URL, 'POST', data, true);
        
        if (result.status === 0) {
            usersData = result.data || [];
            renderUsersTable();
        } else {
            $('#usersTable tbody').html(`<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Ошибка: ${result.descr || 'Неизвестная ошибка'}</td></tr>`);
        }
    } catch (error) {
        $('#usersTable tbody').html(`<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Ошибка соединения: ${error.message}</td></tr>`);
    }
}

function renderUsersTable() {
    const tbody = $('#usersTable tbody');
    tbody.empty();
    
    if (usersData.length === 0) {
        tbody.append('<tr><td colspan="7" style="text-align: center;">Нет данных</td></tr>');
        return;
    }
    
    usersData.forEach(user => {
        const createDate = new Date(user.create_date);
        const formattedDate = createDate.toLocaleDateString('ru-RU') + ' ' + createDate.toLocaleTimeString('ru-RU').slice(0, 5);
        
        const fio = user.fio || '-';
        
        const activeBadge = user.active 
            ? '<span class="active-badge active-yes">Да</span>'
            : '<span class="active-badge active-no">Нет</span>';
        
        const row = `
            <tr>
                <td class="hidden">${user.id}</td>
                <td>${formattedDate}</td>
                <td>${user.login}</td>
                <td>${fio}</td>
                <td>${user.role}</td>
                <td>${activeBadge}</td>
                <td>
                    <div class="actions">
                        <button class="action-btn edit-btn" onclick="openEditUserDialog('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn password-btn" onclick="openChangePasswordDialog('${user.id}')">
                            <i class="fas fa-key"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.append(row);
    });
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    try {
        const data = {
            access_token: accessToken,
            id: userId
        };
        
        const result = await makeApiRequest(API_DELETE_USER_URL, 'POST', data, true);
        
        if (result.status === 0) {
            usersData = usersData.filter(u => u.id != userId);
            renderUsersTable();
            
            showStatusMessage('#usersStatusMessage', 'Пользователь успешно удален', 'success');
        } else {
            showStatusMessage('#usersStatusMessage', `Ошибка: ${result.descr || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showStatusMessage('#usersStatusMessage', `Ошибка соединения: ${error.message}`, 'error');
    }
}

// Функции для работы с настройками
function saveAllSettings() {
    showLoading('#saveSettingsBtn');
    
    try {
        saveSettings();
        applyTheme();
        
        showStatusMessage('#settingsStatusMessage', 'Настройки успешно сохранены', 'success');
    } catch (error) {
        showStatusMessage('#settingsStatusMessage', `Ошибка сохранения: ${error.message}`, 'error');
    } finally {
        hideLoading('#saveSettingsBtn');
    }
}

function resetAllSettings() {
    if (!confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
        return;
    }
    
    showLoading('#resetSettingsBtn');
    
    try {
        userSettings = { ...defaultSettings };
        localStorage.removeItem('adminPanelSettings');
        applyTheme();
        
        showStatusMessage('#settingsStatusMessage', 'Настройки сброшены к значениям по умолчанию', 'success');
    } catch (error) {
        showStatusMessage('#settingsStatusMessage', `Ошибка сброса: ${error.message}`, 'error');
    } finally {
        hideLoading('#resetSettingsBtn');
    }
}

// Вспомогательные функции
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeHtmlForAttribute(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Экспортируем функции для использования в HTML
window.openEditUserDialog = openEditUserDialog;
window.openChangePasswordDialog = openChangePasswordDialog;
window.selectChat = selectChat;
window.selectLogFile = selectLogFile;
window.deleteUser = deleteUser;
window.sortAuthLogTable = sortAuthLogTable;
window.sortChatsTable = sortChatsTable;