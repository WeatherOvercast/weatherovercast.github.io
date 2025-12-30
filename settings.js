// ========== НАСТРОЙКИ ВИЗУАЛЬНЫХ ЭФФЕКТОВ ==========

// Состояние настроек (синхронизировано с главной страницей)
let visualEffectsSettings = {
    glowEnabled: true,        // свечение вкл/выкл
    animationsEnabled: true   // анимации вкл/выкл
};

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

function goToMain() {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация настроек
    loadCurrentTheme();
    loadVisualEffectsSettings();
    
    // Настройка слушателей событий
    setupEventListeners();
    
    // Плавное появление
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Запрет скролла
    preventUnwantedBehavior();
});

// ========== ЗАГРУЗКА И СОХРАНЕНИЕ НАСТРОЕК ==========

function loadVisualEffectsSettings() {
    // Загружаем из localStorage
    const savedSettings = localStorage.getItem('weatherEffects');
    
    if (savedSettings) {
        try {
            visualEffectsSettings = JSON.parse(savedSettings);
            updateEffectsUI();
        } catch (e) {
            console.log('Ошибка загрузки настроек эффектов:', e);
        }
    }
}

function saveVisualEffectsSettings() {
    try {
        // Сохраняем в localStorage
        localStorage.setItem('weatherEffects', JSON.stringify(visualEffectsSettings));
        
        // Синхронизируем с главной страницей
        localStorage.setItem('effectsChanged', Date.now().toString());
        
        // Немедленно применяем эффекты
        applyVisualEffects();
        
        // Показываем уведомление
        showNotification(visualEffectsSettings.glowEnabled ? 
            'Свечение включено ✨' : 'Свечение выключено');
        
        console.log('Настройки эффектов сохранены:', visualEffectsSettings);
    } catch (e) {
        console.log('Ошибка сохранения настроек эффектов:', e);
    }
}

// ========== ОБНОВЛЕНИЕ UI ==========

function updateEffectsUI() {
    // Свечение элементов
    const glowToggle = document.getElementById('glow-toggle');
    const glowStatus = document.querySelector('.glow-status');
    
    if (glowToggle) {
        glowToggle.checked = visualEffectsSettings.glowEnabled;
    }
    
    if (glowStatus) {
        glowStatus.textContent = visualEffectsSettings.glowEnabled ? 'Включено' : 'Выключено';
        glowStatus.style.color = visualEffectsSettings.glowEnabled ? '#4ecdc4' : '#ff6b6b';
    }
    
    // Анимации
    const animationsToggle = document.getElementById('animations-toggle');
    const animationsStatus = document.querySelector('.animation-status');
    
    if (animationsToggle) {
        animationsToggle.checked = visualEffectsSettings.animationsEnabled;
    }
    
    if (animationsStatus) {
        animationsStatus.textContent = visualEffectsSettings.animationsEnabled ? 'Включены' : 'Выключены';
        animationsStatus.style.color = visualEffectsSettings.animationsEnabled ? '#4ecdc4' : '#ff6b6b';
    }
}

// ========== ПРИМЕНЕНИЕ ЭФФЕКТОВ ==========

function applyVisualEffects() {
    // Обновляем CSS переменные, которые будут читаться в мейне
    updateCSSGlowVariables();
    
    // Синхронизируем с главной страницей
    syncWithMainPage();
}

function updateCSSGlowVariables() {
    const root = document.documentElement;
    
    if (visualEffectsSettings.glowEnabled) {
        // Включаем все свечения
        root.style.setProperty('--glow-intensity', '1');
        root.style.setProperty('--text-glow', 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))');
        root.style.setProperty('--detail-glow', 'drop-shadow(0 0 4px currentColor)');
        root.style.setProperty('--card-glow', '0 0 20px rgba(78, 205, 196, 0.3)');
        root.style.setProperty('--progress-glow', '0 0 10px currentColor');
    } else {
        // Выключаем ВСЕ свечения
        root.style.setProperty('--glow-intensity', '0');
        root.style.setProperty('--text-glow', 'none');
        root.style.setProperty('--detail-glow', 'none');
        root.style.setProperty('--card-glow', 'none');
        root.style.setProperty('--progress-glow', 'none');
    }
}

function syncWithMainPage() {
    // Сохраняем флаг обновления
    localStorage.setItem('glowEnabled', visualEffectsSettings.glowEnabled.toString());
    localStorage.setItem('animationsEnabled', visualEffectsSettings.animationsEnabled.toString());
    
    // Отправляем событие если главная страница открыта
    if (window.opener) {
        window.opener.postMessage({
            type: 'UPDATE_GLOW',
            glow: visualEffectsSettings.glowEnabled,
            animations: visualEffectsSettings.animationsEnabled
        }, '*');
    }
}

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

function setupEventListeners() {
    // Тема
    setupThemeListeners();
    
    // Эффекты
    setupEffectsListeners();
    
    // Убираем выделения
    removeUnwantedHighlights();
}

function setupThemeListeners() {
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const selectedTheme = this.dataset.theme;
            
            if (selectedTheme === 'light' || selectedTheme === 'dynamic') {
                showNotification('Эта тема находится в разработке 🛠️');
                return;
            }
            
            themeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            localStorage.setItem('weatherTheme', selectedTheme);
            applyTheme(selectedTheme);
            showNotification(`Тема: ${getThemeName(selectedTheme)}`);
        });
    });
}

function setupEffectsListeners() {
    // Свечение
    const glowToggle = document.getElementById('glow-toggle');
    if (glowToggle) {
        glowToggle.addEventListener('change', function() {
            visualEffectsSettings.glowEnabled = this.checked;
            updateEffectsUI();
            saveVisualEffectsSettings();
        });
    }
    
    // Анимации
    const animationsToggle = document.getElementById('animations-toggle');
    if (animationsToggle) {
        animationsToggle.addEventListener('change', function() {
            visualEffectsSettings.animationsEnabled = this.checked;
            updateEffectsUI();
            saveVisualEffectsSettings();
        });
    }
}

function removeUnwantedHighlights() {
    const elements = document.querySelectorAll('button, .theme-option, .toggle-switch');
    elements.forEach(el => {
        el.addEventListener('mousedown', e => e.preventDefault());
        el.addEventListener('focus', () => {
            el.style.outline = 'none';
            el.style.boxShadow = 'none';
        });
    });
}

function preventUnwantedBehavior() {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
}

// ========== ТЕМЫ ==========

function loadCurrentTheme() {
    const currentTheme = localStorage.getItem('weatherTheme') || 'dark';
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.theme === currentTheme);
    });
    
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme');
    
    switch(theme) {
        case 'light':
            body.classList.add('light-theme');
            break;
        case 'dark':
            body.classList.add('dark-theme');
            break;
    }
}

function getThemeName(theme) {
    return {
        'light': 'Светлая',
        'dark': 'Тёмная', 
        'dynamic': 'Динамическая'
    }[theme] || 'Тёмная';
}

// ========== УВЕДОМЛЕНИЯ ==========

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
        notification.style.animation = 'notificationSlideOut 0.3s ease forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// Добавляем CSS переменные и стили
const effectStyles = document.createElement('style');
effectStyles.textContent = `
    :root {
        --glow-intensity: 1;
        --text-glow: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
        --detail-glow: drop-shadow(0 0 4px currentColor);
        --card-glow: 0 0 20px rgba(78, 205, 196, 0.3);
        --progress-glow: 0 0 10px currentColor;
    }
    
    @keyframes notificationSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes notificationSlideOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;

document.head.appendChild(effectStyles);