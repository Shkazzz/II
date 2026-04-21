// main.js - Основной файл инициализации

// Конфигурация
const API_BASE_URL = 'http://10.10.0.15:9191';
const ADMIN_PANEL_URL = 'http://10.10.0.15:9191/admin';
const TOKEN_COOKIE_NAME = 'ollama_auth_token';
const USER_COOKIE_NAME = 'ollama_user_login';
const USER_ROLE_COOKIE_NAME = 'ollama_user_role';
const THEME_STORAGE_KEY = 'ollama_theme';
const PROMPTS_STORAGE_KEY = 'ollama_prompts';

// Глобальные переменные
let chatContainer, messageInput, sendButton, modelSelect;
let statusIndicator, statusText, authModal, deleteModal;
let loginInput, passwordInput, authMessage, authInfo;
let chatsList, emptyChatsMessage, deleteChatName;
let currentChatTitle, sidebar, adminLink;
let filePreview, fileInput;

// Данные приложения
let chats = [];
let currentChatId = null;
let authToken = null;
let currentUser = null;
let currentUserRole = null;
let currentDeleteChatId = null;
let personalPromptsList = [];
let sharedPromptsList = [];
let attachedFiles = [];
let serverSettings = [];

// Инициализация
$(document).ready(async function() {
    console.log('Инициализация приложения...');
    
    // Инициализируем элементы DOM
    initDOMElements();
    
    // Загружаем тему
    loadTheme();
    
    // Проверяем наличие сохраненного токена
    await checkAndValidateAuth();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Проверяем подключение к серверу
    await checkHealth();
    
    
 // ✅ Инициализация нового управления файлами чата
if (typeof initChatFilesUI === 'function') initChatFilesUI();

setTimeout(() => {
    if (messageInput) messageInput.focus();
}, 500);
});

function initDOMElements() {
    console.log('Инициализация DOM элементов...');
    
    chatContainer = document.getElementById('chatContainer');
    messageInput = document.getElementById('messageInput');
    sendButton = document.getElementById('sendButton');
    modelSelect = document.getElementById('modelSelect');
    statusIndicator = document.getElementById('statusIndicator');
    statusText = document.getElementById('statusText');
    authModal = document.getElementById('authModal');
    deleteModal = document.getElementById('deleteModal');
    loginInput = document.getElementById('loginInput');
    passwordInput = document.getElementById('passwordInput');
    authMessage = document.getElementById('authMessage');
    authInfo = document.getElementById('authInfo');
    chatsList = document.getElementById('chatsList');
    emptyChatsMessage = document.getElementById('emptyChatsMessage');
    deleteChatName = document.getElementById('deleteChatName');
    currentChatTitle = document.getElementById('currentChatTitle');
    sidebar = document.getElementById('sidebar');
    adminLink = document.getElementById('adminLink');
    filePreview = document.getElementById('filePreview');
    fileInput = document.getElementById('fileInput');
    
    console.log('Элементы DOM инициализированы:', {
        authModal: !!authModal,
        loginInput: !!loginInput,
        sendButton: !!sendButton,
        authInfo: !!authInfo,
        adminLink: !!adminLink,
        filePreview: !!filePreview,
        fileInput: !!fileInput
    });
}

function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Обработчики для формы авторизации
    if (loginInput) {
        loginInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performLogin();
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performLogin();
        });
    }
    
    // Добавляем обработчик для кнопки отправки
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Добавляем обработчик для поля ввода
    if (messageInput) {
        messageInput.addEventListener('keydown', handleKeyPress);
        
        // Автоматическое изменение высоты textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Обработчик для кнопки логина в шапке
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'loginButton') {
            showAuthModal();
        }
    });
    
    // Обработчик для загрузки файлов
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Закрытие модальных окон при клике вне их
    window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        // 🔒 ЗАПРЕЩАЕМ закрытие окна авторизации, пока пользователь не вошёл
        if (event.target.id === 'authModal' && !authToken) {
            return;
        }
        event.target.style.display = 'none';
    }
    });
    
    // Закрытие боковой панели на мобильных при клике вне её
    window.addEventListener('click', function(event) {
        if (window.innerWidth <= 992 && 
            !event.target.closest('.sidebar') && 
            !event.target.closest('.sidebar-toggle') &&
            sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    });
    
    // Открытие настроек загружает настройки с сервера
  document.addEventListener('click', function(event) {
    if (event.target && (event.target.classList.contains('settings-btn') || 
        event.target.closest('.settings-btn'))) {
        setTimeout(() => {
            if (typeof showSettings === 'function') {
                showSettings();
            }
        }, 100);
    }
});
}

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Функция для очистки прикрепленных файлов
function clearAttachedFiles() {
    attachedFiles = [];
    if (filePreview) {
        filePreview.innerHTML = '';
        filePreview.style.display = 'none';
    }
    if (fileInput) {
        fileInput.value = '';
    }
}

// Экспорт функций в глобальную область видимости
window.escapeHtml = escapeHtml;
window.setCookie = setCookie;
window.getCookie = getCookie;
window.deleteCookie = deleteCookie;
window.clearAttachedFiles = clearAttachedFiles;