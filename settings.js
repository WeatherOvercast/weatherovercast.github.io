// ========== ПРОСТЫЕ НАСТРОЙКИ ==========

function goBack() {
    window.history.back();
}

document.addEventListener('DOMContentLoaded', function() {
    loadCurrentTheme();
    setupEventListeners();
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

function loadCurrentTheme() {
    const currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
    
    applyTheme(currentTheme);
}

function setupEventListeners() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedTheme = this.dataset.theme;
            
            themeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            localStorage.setItem('weatherTheme', selectedTheme);
            applyTheme(selectedTheme);
            showNotification(`Тема: ${getThemeName(selectedTheme)}`);
        });
    });
    
    // Убираем все выделения
    const elements = document.querySelectorAll('button, .theme-option');
    elements.forEach(el => {
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('focus', () => {
            el.style.outline = 'none';
            el.style.boxShadow = 'none';
        });
    });
}

function applyTheme(theme) {
    const body = document.body;
    
    switch(theme) {
        case 'light':
            body.style.background = 'linear-gradient(135deg, #87CEEB, #E0F7FA)';
            body.style.color = '#333';
            break;
        case 'dark':
            body.style.background = 'linear-gradient(135deg, #2C3E50, #34495E)';
            body.style.color = '#FFFFFF';
            break;
        case 'dynamic':
        default:
            body.style.background = 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)';
            body.style.color = '#FFFFFF';
            break;
    }
}

function getThemeName(theme) {
    return {
        'light': 'Светлая',
        'dark': 'Тёмная', 
        'dynamic': 'Динамическая'
    }[theme] || 'Динамическая';
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(20px);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-weight: 600;
        z-index: 10000;
        animation: notificationSlideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Добавляем стили
const style = document.createElement('style');
style.textContent = `
    @keyframes notificationSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    body { opacity: 0; transition: opacity 0.3s ease; }
    * { -webkit-tap-highlight-color: transparent !important; }
`;
document.head.appendChild(style);
// ========== ЗАПРЕТ СКРОЛЛА И ДВИЖЕНИЯ ==========

document.addEventListener('DOMContentLoaded', function() {
    // Запрещаем скролл всей страницы
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Запрещаем масштабирование
    document.addEventListener('touchmove', function(e) {
        // Разрешаем скролл только внутри .settings-content
        if (!e.target.closest('.settings-content')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Запрещаем горизонтальный скролл
    document.addEventListener('wheel', function(e) {
        if (e.deltaX !== 0) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Запрещаем жесты масштабирования
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Инициализация настроек
    loadCurrentTheme();
    setupEventListeners();
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// При закрытии страницы возвращаем скролл
window.addEventListener('beforeunload', function() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
});