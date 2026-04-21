// api_endpoints.js - Дополнительные API-функции

/**
 * Отправка сообщения с файлами
 * @param {string} message - Текст сообщения
 * @param {string} model - Модель ИИ
 * @param {Array} files - Массив файлов
 * @returns {Promise} - Promise с ответом сервера
 */
async function sendMessageWithFilesAPI(message, model, files) {
    if (!authToken) {
        throw new Error('Необходима авторизация');
    }
    
    const formData = new FormData();
    formData.append('access_token', authToken);
    formData.append('message', message || '');
    formData.append('model', model);
    
    // Добавляем файлы
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('files', file);
        });
    }
    
    return new Promise((resolve, reject) => {
        $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_files/send_message_files`,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(data) {
                resolve(data);
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

/**
 * Проверка поддержки формата файла
 * @param {string} filename - Имя файла
 * @returns {boolean} - Поддерживается ли формат
 */
function isFileFormatSupported(filename) {
    const supportedFormats = [
        '.txt', '.pdf', '.doc', '.docx', 
        '.xls', '.xlsx', '.jpg', '.jpeg', 
        '.png', '.gif' , '.csv'
    ];
    
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return supportedFormats.includes(extension);
}

/**
 * Получение иконки для типа файла
 * @param {string} filename - Имя файла
 * @returns {string} - Класс иконки FontAwesome
 */
function getFileIcon(filename) {
    const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    
    switch(extension) {
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.gif':
            return 'fa-image';
        case '.pdf':
            return 'fa-file-pdf';
        case '.doc':
        case '.docx':
            return 'fa-file-word';
        case '.xls':
        case '.xlsx':
            return 'fa-file-excel';
        case '.csv':
            return 'fa-file-excel';            
        case '.txt':
            return 'fa-file-text';
        default:
            return 'fa-file';
    }
}

// Экспорт функций в глобальную область видимости
window.sendMessageWithFilesAPI = sendMessageWithFilesAPI;
window.isFileFormatSupported = isFileFormatSupported;
window.getFileIcon = getFileIcon;