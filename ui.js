// ui.js - UI-функции и вспомогательные

// ================ ФУНКЦИИ КОПИРОВАНИЯ С СОХРАНЕНИЕМ ФОРМАТИРОВАНИЯ ================

/**
 * Копирование всего сообщения с сохранением форматирования
 * @param {HTMLElement} messageElement - Элемент сообщения
 */
function copyFullMessage(messageElement) {
    const messageBubble = messageElement?.querySelector('.message-bubble');
    if (!messageBubble) return;
    
    // 1. Чистый текст для блокнота/чатов
    const plainText = extractStructuredText(messageBubble);
    
    // 2. HTML для Word/Google Docs (сохраняет цвета кода, таблицы, списки)
    const htmlContent = messageBubble.innerHTML;
    
    // 3. Markdown для Obsidian/GitHub
    const markdownContent = convertBubbleToMarkdown(messageBubble);
    
    // Используем Clipboard API с множественными форматами
    if (navigator.clipboard && window.ClipboardItem) {
        const items = {
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([`<div>${htmlContent}</div>`], { type: 'text/html' }),
            'text/markdown': new Blob([markdownContent], { type: 'text/markdown' })
        };
        
        const clipboardItem = new ClipboardItem(items);
        navigator.clipboard.write([clipboardItem]).then(() => {
            showCopyFeedback(messageElement.querySelector('.message-copy-btn'));
        }).catch(() => {
            fallbackCopyPlain(plainText, messageElement);
        });
    } else {
        fallbackCopyPlain(plainText, messageElement);
    }
}

/**
 * Извлечение структурированного текста из сообщения
 */
function extractStructuredText(element) {
    let text = '';
    
    function processNode(node, depth = 0) {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tag)) {
                if (text && !text.endsWith('\n')) text += '\n';
            }
            
            if (tag === 'pre' || tag === 'code') {
                if (!text.endsWith('\n')) text += '\n```\n';
                text += node.textContent;
                text += '\n```\n';
            }
            else if (tag === 'table') {
                text += '\n' + tableToMarkdown(node) + '\n';
            }
            else if (tag === 'ul' || tag === 'ol') {
                Array.from(node.children).forEach((item, idx) => {
                    const prefix = tag === 'ul' ? '- ' : `${idx + 1}. `;
                    text += '  '.repeat(depth) + prefix + item.textContent.trim() + '\n';
                });
            }
            else if (tag === 'blockquote') {
                const lines = node.textContent.trim().split('\n');
                lines.forEach(line => {
                    text += '> ' + line + '\n';
                });
            }
            else {
                Array.from(node.childNodes).forEach(child => {
                    processNode(child, depth + 1);
                });
            }
            
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'blockquote'].includes(tag)) {
                if (!text.endsWith('\n\n')) text += '\n';
            }
        }
    }
    
    Array.from(element.childNodes).forEach(node => processNode(node));
    return text.trim();
}

/**
 * Конвертация таблицы в Markdown
 */
function tableToMarkdown(table) {
    const rows = table.querySelectorAll('tr');
    if (!rows.length) return '';
    
    let md = '';
    rows.forEach((row, idx) => {
        const cells = row.querySelectorAll('th, td');
        const rowText = Array.from(cells).map(c => c.textContent.trim()).join(' | ');
        md += '| ' + rowText + ' |\n';
        if (idx === 0) {
            md += '| ' + Array.from(cells).map(() => '---').join(' | ') + ' |\n';
        }
    });
    return md.trim();
}

/**
 * Конвертация содержимого bubble в Markdown
 */
function convertBubbleToMarkdown(element) {
    let md = element.innerHTML;
    
    md = md
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<blockquote>(.*?)<\/blockquote>/gis, '> $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    
    return md;
}

/**
 * Fallback: копирование простого текста
 */
function fallbackCopyPlain(text, messageElement) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(messageElement?.querySelector('.message-copy-btn'));
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

/**
 * Визуальная обратная связь при копировании
 */
function showCopyFeedback(btn) {
    if (!btn) return;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i>';
    btn.classList.add('copied');
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied');
    }, 2000);
}

// ================ ФУНКЦИИ ФОРМАТИРОВАНИЯ КОДА И ТАБЛИЦ ================

/**
 * Простая подсветка синтаксиса
 */
function highlightSyntax(code, language) {
    let highlighted = escapeHtml(code);
    
    if (language === 'javascript' || language === 'js') {
        highlighted = highlighted
            .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|new|this|typeof|instanceof)\b/g, '<span class="code-keyword">$1</span>')
            .replace(/(['"`])(.*?)\1/g, '<span class="code-string">$1$2$1</span>')
            .replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>')
            .replace(/\b([a-zA-Z_]\w*)(?=\()/g, '<span class="code-function">$1</span>');
    } else if (language === 'python' || language === 'py') {
        highlighted = highlighted
            .replace(/\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|with|lambda|True|False|None)\b/g, '<span class="code-keyword">$1</span>')
            .replace(/(['"])(.*?)\1/g, '<span class="code-string">$1$2$1</span>')
            .replace(/(#.*$)/gm, '<span class="code-comment">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
    } else if (language === 'html') {
        highlighted = highlighted
            .replace(/(&lt;\/?)(\w+)(.*?)(\/?&gt;)/g, '<span class="code-tag">$1$2</span>$3<span class="code-tag">$4</span>')
            .replace(/(\s)(\w+)=/g, '$1<span class="code-attr">$2</span>=')
            .replace(/(".*?")/g, '<span class="code-string">$1</span>');
    } else if (language === 'css') {
        highlighted = highlighted
            .replace(/([a-zA-Z-]+)(?=:)/g, '<span class="code-attr">$1</span>')
            .replace(/(:)\s*([^;]+)/g, '$1 <span class="code-string">$2</span>')
            .replace(/(\..+?)(?=\{)/g, '<span class="code-function">$1</span>');
    } else if (language === 'json') {
        highlighted = highlighted
            .replace(/"([^"]+)":/g, '<span class="code-attr">"$1"</span>:')
            .replace(/: "([^"]+)"/g, ': <span class="code-string">"$1"</span>')
            .replace(/: (\d+)/g, ': <span class="code-number">$1</span>')
            .replace(/: (true|false)/g, ': <span class="code-keyword">$1</span>');
    }
    
    return highlighted;
}

/**
 * Функция для копирования кода
 */
function copyCodeBlock(btn) {
    const codeBlock = btn.closest('.code-block-wrapper')?.querySelector('code');
    if (!codeBlock) return;
    
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
    });
}

/**
 * Функция для копирования таблицы в формате для Excel
 */
function copyTable(btn) {
    const table = btn.closest('.table-wrapper')?.querySelector('table') || 
                  btn.closest('.message-bubble')?.querySelector('table.markdown-table');
    
    if (!table) return;
    
    let tsvContent = '';
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        const rowValues = [];
        
        cells.forEach(cell => {
            let cellText = cell.textContent.trim()
                .replace(/\t/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/"/g, '""');
            
            if (cellText.includes(',') || cellText.includes('"')) {
                rowValues.push(`"${cellText}"`);
            } else {
                rowValues.push(cellText);
            }
        });
        
        tsvContent += rowValues.join('\t') + '\r\n';
    });
    
    if (navigator.clipboard && window.ClipboardItem) {
        const blobText = new Blob([tsvContent], { type: 'text/plain' });
        const blobHtml = new Blob([`<table>${table.innerHTML}</table>`], { type: 'text/html' });
        
        const clipboardItem = new ClipboardItem({
            'text/plain': blobText,
            'text/html': blobHtml
        });
        
        navigator.clipboard.write([clipboardItem]).then(() => {
            showCopyFeedback(btn);
        }).catch(() => {
            fallbackCopy(tsvContent, btn);
        });
    } else {
        fallbackCopy(tsvContent, btn);
    }
}

function fallbackCopy(text, btn) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopyFeedback(btn);
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
}

// ================ РЕНДЕРИНГ СООБЩЕНИЙ С ГРУППИРОВКОЙ ПО ДАТАМ ================

function renderMessagesWithGrouping(messages) {
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    
    if (!messages || messages.length === 0) {
        return;
    }
    
    const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const groupedMessages = {};
    sortedMessages.forEach(msg => {
        const date = new Date(msg.timestamp);
        const dateKey = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        if (!groupedMessages[dateKey]) {
            groupedMessages[dateKey] = [];
        }
        groupedMessages[dateKey].push(msg);
    });
    
    Object.keys(groupedMessages).forEach(dateKey => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'chat-group-header';
        dateHeader.textContent = dateKey;
        chatContainer.appendChild(dateHeader);
        
        groupedMessages[dateKey].forEach(msg => {
            if (msg.user === true || msg.role === 'user') {
                addFormattedMessageToChat('user', msg.content);
            } else if (msg.server === true || msg.role === 'assistant') {
                addFormattedMessageToChat('assistant', msg.content);
            } else {
                addFormattedMessageToChat('assistant', msg.content);
            }
        });
    });
    
    setTimeout(() => {
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, 100);
}

// ================ ФОРМАТИРОВАНИЕ ДАТЫ ДЛЯ ЧАТОВ ================

function formatChatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Сегодня';
    } else if (diffDays === 1) {
        return 'Вчера';
    } else if (diffDays < 7) {
        const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
        return days[date.getDay()];
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

function addMessageToChat(role, content) {
    const messageElement = createMessageElement(role, content);
    if (chatContainer) {
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function addFormattedMessageToChat(role, content) {
    const messageElement = createFormattedMessageElement(role, content);
    if (chatContainer) {
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// ================ ПРОГРЕСС-БАР ДЛЯ ДЛИТЕЛЬНЫХ ЗАДАЧ ================

function parseProgressFromString(content) {
    const match = content.match(/\((\d+)\s*\*\s*(\d+)\)/);
    if (match && match[1] && match[2]) {
        const current = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        if (total > 0) {
            const percent = Math.min(100, Math.round((current / total) * 100));
            return { current, total, percent };
        }
    }
    return null;
}

function createProgressBarElement(current, total, percent) {
    const progressWrapper = document.createElement('div');
    progressWrapper.className = 'progress-wrapper';
    progressWrapper.style.cssText = `
        margin: 8px 0;
        max-width: 100px;
        background: #f0f2f5;
        width: 100%;
        border-radius: 4px;
        overflow: hidden;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    `;
    
    progressWrapper.innerHTML = `
        <div style="display: flex; justify-content: space-between; padding: 4px 8px; color: #666;">
            <span>${current} из ${total}</span>
            <span>${percent}%</span>
        </div>
        <div style="height: 16px; background: #e0e0e0;">
            <div style="
                height: 100%;
                width: ${percent}%;
                background: linear-gradient(90deg, #2196f3, #1976d2);
                transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 4px;
            "></div>
        </div>
    `;
    return progressWrapper;
}

function createFormattedMessageContent(role, content) {
    const progressData = parseProgressFromString(content);
    const cleanContent = content.replace(/\s*\(\d+\s*\*\s*\d+\)/, '').trim();
    
    let html = `<div class="message-text">${cleanContent}</div>`;
    
    if (progressData) {
        const progressHTML = createProgressBarElement(
            progressData.current,
            progressData.total,
            progressData.percent
        ).innerHTML;
        html += `<div class="message-progress">${progressHTML}</div>`;
    }
    
    return html;
}

function changeFormattedMessageToChat(role, content, isUpdatable = false, messageId = 'task-progress') {
    let messageElement = null;
    
    if (isUpdatable && messageId) {
        messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    }
    
    if (messageElement) {
        const contentContainer = messageElement.querySelector('.message-content') || messageElement;
        contentContainer.innerHTML = createFormattedMessageContent(role, content);
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return messageElement;
    }
    
    messageElement = createFormattedMessageElement2(role, content);
    
    if (isUpdatable && messageId) {
        messageElement.setAttribute('data-message-id', messageId);
    }
    
    if (chatContainer) {
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    return messageElement;
}

function createFormattedMessageElement2(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = createFormattedMessageContent(role, content);
    
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

// ================ СОЗДАНИЕ ЭЛЕМЕНТОВ СООБЩЕНИЙ ================

function createMessageElement(role, content, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    if (id) messageDiv.id = id;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `avatar ${role}-avatar`;
    avatarDiv.textContent = role === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = content;
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'message-buttons';
    
    // Кнопка копирования - ИСПРАВЛЕНО: используем copyFullMessage
    const copyButton = document.createElement('button');
    copyButton.className = 'message-copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = 'Копировать сообщение';
    copyButton.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        copyFullMessage(this.closest('.message'));
    };
    
    buttonsDiv.appendChild(copyButton);
    
    // Кнопка сохранения в промты только для пользовательских сообщений
    if (role === 'user') {
        const savePromptButton = document.createElement('button');
        savePromptButton.className = 'message-save-btn';
        savePromptButton.innerHTML = '<i class="fas fa-bookmark"></i>';
        savePromptButton.title = 'Сохранить в личные промты';
        savePromptButton.onclick = function(e) {
            e.stopPropagation();
            const name = content.substring(0, 20) + (content.length > 20 ? '...' : '');
            saveMessageToPromptsWithName(content, name);
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                this.innerHTML = originalHTML;
            }, 2000);
        };
        
        buttonsDiv.appendChild(savePromptButton);
    }
    
    contentDiv.appendChild(bubbleDiv);
    contentDiv.appendChild(buttonsDiv);
    
    if (role === 'user') {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    } else {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    }
    
    return messageDiv;
}

function createFormattedMessageElement(role, content, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.setAttribute('data-raw-content', content);
    messageDiv.className = `message ${role}-message`;
    if (id) messageDiv.id = id;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = `avatar ${role}-avatar`;
    avatarDiv.textContent = role === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    // Форматируем текст для ВСЕХ сообщений
    bubbleDiv.innerHTML = formatText(content);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'message-buttons';
    
    // Кнопка копирования - ИСПРАВЛЕНО: используем copyFullMessage
    const copyButton = document.createElement('button');
    copyButton.className = 'message-copy-btn';
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.title = 'Копировать сообщение';
    copyButton.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        copyFullMessage(this.closest('.message'));
    };
    
    buttonsDiv.appendChild(copyButton);
    
    // Кнопка сохранения в промты только для пользовательских сообщений
    if (role === 'user') {
        const savePromptButton = document.createElement('button');
        savePromptButton.className = 'message-save-btn';
        savePromptButton.innerHTML = '<i class="fas fa-bookmark"></i>';
        savePromptButton.title = 'Сохранить в личные промты';
        savePromptButton.onclick = function(e) {
            e.stopPropagation();
            const name = content.substring(0, 20) + (content.length > 20 ? '...' : '');
            saveMessageToPromptsWithName(content, name);
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                this.innerHTML = originalHTML;
            }, 2000);
        };
        
        buttonsDiv.appendChild(savePromptButton);
    }
    
    contentDiv.appendChild(bubbleDiv);
    contentDiv.appendChild(buttonsDiv);
    
    if (role === 'user') {
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(avatarDiv);
    } else {
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
    }
    
    return messageDiv;
}

// ================ ФОРМАТИРОВАНИЕ ТЕКСТА (MARKDOWN) ================

function formatText(text) {
    if (!text) return '';
    
    let html = escapeHtml(text);
    html = applyMarkdownFormatting(html);
    
    return html;
}

function applyMarkdownFormatting(html) {
    // 1. Блоки кода с языком (должны быть до других замен)
    html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, function(match, lang, code) {
        const language = lang || 'plaintext';
        const highlightedCode = highlightSyntax(code.trim(), language);
        return `<div class="code-block-wrapper">
            <div class="code-header">
                <span class="code-lang">${language}</span>
                <button class="copy-code-btn" onclick="copyCodeBlock(this)" title="Копировать код">
                    <i class="fas fa-copy"></i> Копировать
                </button>
            </div>
            <pre class="code-block"><code class="language-${language}">${highlightedCode}</code></pre>
        </div>`;
    });

    // 2. Inline код
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 3. Таблицы Markdown
    html = html.replace(/\|(.+)\|\s*\n\|[-\s|:]+\|\s*\n((?:\|.+\|\s*\n?)*)/g, function(match, header, body) {
        const headers = header.split('|').filter(c => c.trim());
        let tableHTML = '<div class="table-wrapper"><table class="markdown-table"><thead><tr>';
        headers.forEach(h => {
            tableHTML += `<th>${h.trim()}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        const rows = body.trim().split('\n');
        rows.forEach(row => {
            const cells = row.split('|').filter(c => c.trim());
            tableHTML += '<tr>';
            cells.forEach(cell => {
                tableHTML += `<td>${cell.trim()}</td>`;
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        tableHTML += `<button class="copy-table-btn" onclick="copyTable(this)" title="Копировать таблицу"><i class="fas fa-copy"></i> Копировать таблицу</button></div>`;
        return tableHTML;
    });

    // 4. Заголовки
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 5. Форматирование текста
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

    // 6. Списки
    html = html.replace(/^(\s*)[-*+] (.+)$/gm, function(match, spaces, content) {
        const depth = Math.floor(spaces.length / 2);
        return `${'<ul>'.repeat(depth)}<li style="margin-left: ${depth * 20}px;">${content}</li>${'</ul>'.repeat(depth)}`;
    });
    html = html.replace(/^(\s*)\d+\. (.+)$/gm, function(match, spaces, content) {
        const depth = Math.floor(spaces.length / 2);
        return `${'<ol>'.repeat(depth)}<li style="margin-left: ${depth * 20}px;">${content}</li>${'</ol>'.repeat(depth)}`;
    });

    // 7. Цитаты
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^>> (.+)$/gm, '<blockquote class="nested-quote"><blockquote>$1</blockquote></blockquote>');

    // 8. Горизонтальные линии
    html = html.replace(/^---$/gm, '<hr class="markdown-hr">');
    html = html.replace(/^\*\*\*$/gm, '<hr class="markdown-hr">');
    html = html.replace(/^___$/gm, '<hr class="markdown-hr">');

    // 9. Ссылки
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 10. Письма/Email форматирование
    html = html.replace(/From:\s*(.+?)\n/g, '<div class="email-header"><strong>От:</strong> $1</div>');
    html = html.replace(/To:\s*(.+?)\n/g, '<div class="email-header"><strong>Кому:</strong> $1</div>');
    html = html.replace(/Subject:\s*(.+?)\n/g, '<div class="email-header"><strong>Тема:</strong> $1</div>');
    html = html.replace(/Date:\s*(.+?)\n/g, '<div class="email-header"><strong>Дата:</strong> $1</div>');

    // 11. Параграфы и переносы строк
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n(?![<])/g, '<br>');

    // 12. Обёртка в параграфы
    if (!html.match(/^<(p|h[1-6]|ul|ol|li|pre|code|blockquote|hr|div|span|a|strong|em|table|thead|tbody|tr|th|td|br|hr)/i)) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

// ================ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================

function copyToClipboard(text) {
    if (!text) return;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const cleanText = tempDiv.textContent || tempDiv.innerText || '';

    navigator.clipboard.writeText(cleanText).then(() => {
        console.log('✅ Текст скопирован');
    }).catch(err => {
        console.error('❌ Ошибка копирования:', err);
        const textArea = document.createElement('textarea');
        textArea.value = cleanText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

function saveMessageToPrompts(content) {
    if (!content || content.trim() === '') {
        alert('Нельзя сохранить пустое сообщение');
        return;
    }
    
    const trimmedContent = content.trim();
    
    if (personalPromptsList.some(p => p.content === trimmedContent)) {
        alert('Это сообщение уже сохранено в промтах');
        return;
    }
    
    const name = trimmedContent.substring(0, 20) + (trimmedContent.length > 20 ? '...' : '');
    addPromptToServer(trimmedContent, name);
}

function saveMessageToPromptsWithName(content, name) {
    if (!content || content.trim() === '') {
        alert('Нельзя сохранить пустое сообщение');
        return;
    }
    
    const trimmedContent = content.trim();
    
    if (personalPromptsList.some(p => p.content === trimmedContent)) {
        alert('Это сообщение уже сохранено в промтах');
        return;
    }
    
    addPromptToServer(trimmedContent, name);
}

function showTypingIndicator() {
    if (!chatContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant-message';
    typingDiv.id = 'typing-indicator';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar assistant-avatar';
    avatarDiv.textContent = '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'typing-indicator';
    bubbleDiv.innerHTML = '<span></span><span></span><span></span>';
    
    contentDiv.appendChild(bubbleDiv);
    
    typingDiv.appendChild(avatarDiv);
    typingDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// ================ УПРАВЛЕНИЕ БОКОВЫМИ ПАНЕЛЯМИ ================

function toggleChatsSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const collapseBtn = sidebar.querySelector('.collapse-sidebar-btn i');
        if (collapseBtn) {
            if (sidebar.classList.contains('collapsed')) {
                collapseBtn.classList.remove('fa-chevron-left');
                collapseBtn.classList.add('fa-chevron-right');
            } else {
                collapseBtn.classList.add('fa-chevron-left');
                collapseBtn.classList.remove('fa-chevron-right');
            }
        }
    }
}

function togglePromptsSidebar() {
    const promptsSidebar = document.querySelector('.prompts-sidebar');
    if (promptsSidebar) {
        promptsSidebar.classList.toggle('collapsed');
        const collapseBtn = promptsSidebar.querySelector('.collapse-prompts-btn i');
        if (collapseBtn) {
            if (promptsSidebar.classList.contains('collapsed')) {
                collapseBtn.classList.remove('fa-chevron-right');
                collapseBtn.classList.add('fa-chevron-left');
            } else {
                collapseBtn.classList.add('fa-chevron-right');
                collapseBtn.classList.remove('fa-chevron-left');
            }
        }
    }
}

// ================ НАСТРОЙКИ ================

function showSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.display = 'flex';
        if (typeof loadSettingsFromServer === 'function') {
            loadSettingsFromServer();
        }
    }
}

function closeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
        settingsModal.style.display = 'none';
    }
}

// ================ ЭКСПОРТ ФУНКЦИЙ ================

window.copyFullMessage = copyFullMessage;
window.extractStructuredText = extractStructuredText;
window.convertBubbleToMarkdown = convertBubbleToMarkdown;
window.tableToMarkdown = tableToMarkdown;
window.showCopyFeedback = showCopyFeedback;
window.highlightSyntax = highlightSyntax;
window.copyCodeBlock = copyCodeBlock;
window.copyTable = copyTable;
window.renderMessagesWithGrouping = renderMessagesWithGrouping;
window.formatChatDate = formatChatDate;
window.addMessageToChat = addMessageToChat;
window.addFormattedMessageToChat = addFormattedMessageToChat;
window.createMessageElement = createMessageElement;
window.createFormattedMessageElement = createFormattedMessageElement;
window.formatText = formatText;
window.applyMarkdownFormatting = applyMarkdownFormatting;
window.copyToClipboard = copyToClipboard;
window.saveMessageToPrompts = saveMessageToPrompts;
window.saveMessageToPromptsWithName = saveMessageToPromptsWithName;
window.showTypingIndicator = showTypingIndicator;
window.removeTypingIndicator = removeTypingIndicator;
window.toggleChatsSidebar = toggleChatsSidebar;
window.togglePromptsSidebar = togglePromptsSidebar;
window.showSettings = showSettings;
window.closeSettings = closeSettings;