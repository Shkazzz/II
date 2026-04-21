// file_handlers.js - Работа с файлами


function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'txt': 'text', 'pdf': 'pdf', 'doc': 'word', 'docx': 'word',
        'xls': 'excel', 'xlsx': 'excel', 'csv': 'excel',
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
        'mp3': 'audio', 'mp4': 'video', 'avi': 'video', 'webm': 'video'
    };
    return typeMap[ext] || 'file';
}

function getFileIcon(fileType) {
    const iconMap = {
        'text': 'fa-file-alt', 'pdf': 'fa-file-pdf', 'word': 'fa-file-word',
        'excel': 'fa-file-excel', 'image': 'fa-file-image', 'audio': 'fa-file-audio',
        'video': 'fa-file-video', 'file': 'fa-file'
    };
    return iconMap[fileType] || 'fa-file';
}




function attachFile() {
    document.getElementById('fileInput').click();
}


// --- ФАЙЛЫ ДЛЯ СООБЩЕНИЯ (Временные, перед отправкой) ---

function handleFileSelect(event) {
    const files = event.target.files;
    const maxSize = 300 * 1024 * 1024; // 300MB
    const allowedTypes = [
        'text/plain', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
        'audio/mpeg', 'video/x-msvideo', 'video/mpeg', 'video/mp4', 'video/webm', 'audio/x-m4a'
    ];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (attachedFiles.length >= 10) {
            alert('Максимальное количество файлов - 10');
            break;
        }
        
        if (file.size > maxSize) {
            alert(`Файл "${file.name}" превышает максимальный размер 300MB`);
            continue;
        }
        
        const isAllowedType = allowedTypes.includes(file.type) || 
                            file.name.match(/\.(txt|pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|mp3|avi|mpeg|mp4|webm|m4a|csv)$/i);
        
        if (!isAllowedType) {
            alert(`Файл "${file.name}" имеет неподдерживаемый тип.`);
            continue;
        }
        
        attachedFiles.push(file);
    }

    renderFilePreview();
    event.target.value = ''; // Сброс input
}

function renderFilePreview() {
    if (!filePreview) return;
    filePreview.innerHTML = '';

    if (attachedFiles.length === 0) {
        filePreview.style.display = 'none';
        return;
    }

    filePreview.style.display = 'flex';

    attachedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        
        let fileIcon = 'fa-file';
        let fileClass = '';
        
        if (file.type.includes('image')) {
            fileIcon = 'fa-image';
        } else if (file.type.includes('pdf')) {
            fileIcon = 'fa-file-pdf';
        } else if (file.type.includes('word') || file.name.match(/\.docx?$/i)) {
            fileIcon = 'fa-file-word';
        } else if (file.type.includes('excel') || file.name.match(/\.xlsx?$/i)) {
            fileIcon = 'fa-file-excel';
            fileClass = 'excel';
        } else if (file.type.includes('text') || file.name.match(/\.txt$/i)) {
            fileIcon = 'fa-file-text';
        } else if (file.type.includes('csv') || file.name.match(/\.csv$/i)) {
            fileIcon = 'fa-file-excel';
            fileClass = 'excel';
        }
        
        fileItem.innerHTML = `
            <i class="fas ${fileIcon} file-preview-icon ${fileClass}"></i>
            <span class="file-preview-name">${escapeHtml(file.name)}</span>
            <span class="file-preview-size">(${formatFileSize(file.size)})</span>
            <button class="file-preview-remove" data-index="${index}" title="Удалить">×</button>
        `;
        
        fileItem.querySelector('.file-preview-remove').onclick = function(e) {
            e.stopPropagation();
            const idx = parseInt(this.getAttribute('data-index')); 
            attachedFiles.splice(idx, 1);
            renderFilePreview();
        };
        
        filePreview.appendChild(fileItem);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0 || isNaN(bytes)) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

// === ФАЙЛЫ ЧАТА (Обновленная версия) ===
let chatFilesList = [];

function initChatFilesUI() {
    const addBtn = document.getElementById('addChatFilesBtn');
    const deleteBtn = document.getElementById('deleteChatFilesBtn');
    const sendBtn = document.getElementById('sendChatFilesBtn');
    const downloadBtn = document.getElementById('downloadChatFilesBtn');
    const fileInput = document.getElementById('chatFileInput');

    if (addBtn && fileInput) addBtn.onclick = () => fileInput.click();
    if (deleteBtn) deleteBtn.onclick = deleteSelectedChatFiles;
    if (sendBtn) sendBtn.onclick = attachSelectedFilesToMessage;
    if (downloadBtn) downloadBtn.onclick = downloadSelectedFiles;

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleChatFileUpload(e.target.files);
            e.target.value = '';
        });
    }
}

async function loadChatFiles(chatId) {
    if (!chatId || !authToken) {
        chatFilesList = [];
        renderChatFiles();
        return;
    }
    
    const formData = new FormData();
    formData.append('access_token', authToken);
    formData.append('chat', chatId);
    
    console.log(`📂 Загрузка файлов для чата: ${chatId}`);

    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_files/get_chat_files`,
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false
        });
        
        console.log(`📥 Ответ сервера для чата ${chatId}:`, response);

        if (response.status === 0 && Array.isArray(response.files)) {
            chatFilesList = response.files.map(file => ({
                id: file.id || file.name,
                name: file.name,
                size: file.size || 0,
                type: getFileType(file.name),
                selected: false
            }));
        } else {
            chatFilesList = [];
        }
    } catch (e) {
        console.error('Ошибка загрузки файлов:', e);
        chatFilesList = [];
    }
    
    renderChatFiles();
}

function renderChatFiles() {
    const container = document.getElementById('chatFilesList');
    if (!container) return;
    container.innerHTML = '';

    if (!chatFilesList.length) {
        container.innerHTML = '<div class="empty-files"><p>Нет загруженных файлов</p></div>';
        return;
    }

    chatFilesList.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = `file-item ${file.selected ? 'selected' : ''}`;
        item.innerHTML = `
            <input type="checkbox" class="file-checkbox" data-index="${index}" ${file.selected ? 'checked' : ''}>
            <i class="fas ${getFileIcon(file.type)} file-icon file-type-${file.type}"></i>
            <div class="file-info">
                <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
        `;
        // Клик по чекбоксу
        item.querySelector('.file-checkbox').onchange = (e) => {
            e.stopPropagation();
            chatFilesList[index].selected = e.target.checked;
            renderChatFiles();
        };
        // Клик по строке тоже переключает
        item.onclick = (e) => {
            if (e.target.type !== 'checkbox') {
                const cb = item.querySelector('.file-checkbox');
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change'));
            }
        };
        container.appendChild(item);
    });
}

async function attachSelectedFilesToMessage() {
    const selected = chatFilesList.filter(f => f.selected);
    if (!selected.length) return alert('Отметьте файлы галочками для прикрепления');
    if (!messageInput || messageInput.value.trim() === '') {
        alert('Поле сообщения должно быть заполнено');
        if (messageInput) messageInput.focus();
        return;
    }

    // Добавляем в attachedFiles (используется при sendMessage)
    selected.forEach(f => {
        if (!attachedFiles.some(af => af.name === f.name)) {
            // Создаем ссылку на серверный файл для совместимости с существующей логикой
            const blob = new Blob([]);
            const fileObj = new File([blob], f.name, { type: f.type || 'application/octet-stream' });
            fileObj.isServerFile = true;
            attachedFiles.push(fileObj);
        }
    });
    renderFilePreview();
    alert(`${selected.length} файл(ов) прикреплено к сообщению. Нажмите "Отправить".`);
    messageInput.focus();
}

async function deleteSelectedChatFiles() {
    const selected = chatFilesList.filter(f => f.selected);
    if (!selected.length) return alert('Выберите файлы для удаления');
    if (!confirm(`Удалить ${selected.length} файл(ов) из чата?`)) return;

    try {
        const res = await $.ajax({
            url: `${API_BASE_URL}/api/v1.1/route_files/delete_chat_files`,
            method: 'POST',
            data: { access_token: authToken, chat: currentChatId, files: JSON.stringify(selected.map(f => f.name)) }
        });
        if (res.status === 0) {
            chatFilesList = chatFilesList.filter(f => !f.selected);
            renderChatFiles();
            alert('Файлы удалены');
        } else { alert('Ошибка удаления: ' + (res.descr || 'Неизвестно')); }
    } catch (e) { console.error(e); alert('Ошибка при удалении'); }
}

async function downloadSelectedFiles() {
    const selected = chatFilesList.filter(f => f.selected);
    if (!selected.length) return alert('Выберите файлы для скачивания');
    selected.forEach(f => {
        const link = document.createElement('a');
        // Адаптируйте URL под ваш эндпоинт скачивания
        link.href = `${API_BASE_URL}/api/v1.1/route_files/download?chat=${currentChatId}&file=${encodeURIComponent(f.name)}`;
        link.download = f.name;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    });
}

async function handleChatFileUpload(files) {
    if (!currentChatId || !files.length || !authToken) return alert('Выберите чат перед загрузкой');
    const formData = new FormData();
    formData.append('access_token', authToken);
    formData.append('chat', currentChatId);
    Array.from(files).forEach(f => formData.append('files', f));
    try {
        await $.ajax({ url: `${API_BASE_URL}/api/v1.1/route_files/upload_chat_files`, method: 'POST', data: formData, processData: false, contentType: false });
        loadChatFiles(currentChatId);
    } catch (e) { alert('Ошибка загрузки файлов'); }
}

// Экспорт
window.initChatFilesUI = initChatFilesUI;
window.loadChatFiles = loadChatFiles;
window.renderChatFiles = renderChatFiles;
window.attachSelectedFilesToMessage = attachSelectedFilesToMessage;
window.deleteSelectedChatFiles = deleteSelectedChatFiles;
window.downloadSelectedFiles = downloadSelectedFiles;
window.handleChatFileUpload = handleChatFileUpload;