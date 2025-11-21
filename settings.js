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
    
    // Удаляем все тематические классы
    body.classList.remove('light-theme', 'dark-theme');
    
    switch(theme) {
        case 'light':
            body.classList.add('light-theme');
            // Удаляем погодные классы для чистой светлой темы
            const weatherClasses = [
                'clear', 'broken clouds', 'overcast clouds', 'mist', 'fog', 'haze',
                'rain', 'night', 'snow', 'thunderstorm', 'drizzle'
            ];
            weatherClasses.forEach(className => {
                body.classList.remove(className);
            });
            break;
            
        case 'dark':
            body.classList.add('dark-theme');
            // Удаляем погодные классы для чистой темной темы
            weatherClasses.forEach(className => {
                body.classList.remove(className);
            });
            break;
            
        case 'dynamic':
        default:
            // Для динамической темы восстанавливаем погодные классы
            if (window.currentCityData) {
                // Если есть данные о погоде, применяем соответствующую тему
                updateThemeByWeather(window.currentCityData.weather[0].main, window.currentCityData.sys);
            } else {
                // По умолчанию - чистая темная тема
                body.style.background = 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)';
                body.style.color = '#FFFFFF';
            }
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

// Функция для обновления темы по погоде (для динамической темы)
function updateThemeByWeather(weatherMain, sys) {
    const body = document.body;
    
    // Удаляем все погодные классы
    const weatherClasses = [
        'clear', 'broken clouds', 'overcast clouds', 'mist', 'fog', 'haze',
        'rain', 'night', 'snow', 'thunderstorm', 'drizzle'
    ];
    
    weatherClasses.forEach(className => {
        body.classList.remove(className);
    });

    // Определяем время для ночной темы
    const now = new Date();
    const currentTime = now.getTime();
    const sunrise = new Date(sys.sunrise * 1000).getTime();
    const sunset = new Date(sys.sunset * 1000).getTime();
    const isNight = currentTime < sunrise || currentTime > sunset;

    // Применяем соответствующий класс
    if (isNight) {
        body.classList.add('night');
    } else {
        // Дневные темы по погоде
        const weatherClass = getWeatherClass(weatherMain);
        body.classList.add(weatherClass);
    }
}

function getWeatherClass(weatherMain) {
    const classMap = {
        'Clear': 'clear',
        'Clouds': 'broken clouds',
        'Rain': 'rain',
        'Drizzle': 'drizzle',
        'Thunderstorm': 'thunderstorm',
        'Snow': 'snow',
        'Mist': 'mist',
        'Fog': 'fog',
        'Haze': 'haze'
    };
    return classMap[weatherMain] || 'clear';
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
    
    /* Предпросмотр тем */
    .light-theme .theme-preview {
        background: linear-gradient(135deg, #87CEEB, #E0F7FA);
    }
    
    .dark-theme .theme-preview {
        background: linear-gradient(135deg, #2C3E50, #34495E);
    }
    
    .dynamic-theme .theme-preview {
        background: linear-gradient(135deg, #3A6B95, #5A8BBF, #7AABE9);
    }
    
    .preview-sun, .preview-moon, .preview-cloud, .preview-star {
        position: absolute;
        border-radius: 50%;
    }
    
    .preview-sun {
        width: 20px;
        height: 20px;
        background: #FFD700;
        top: 8px;
        left: 8px;
        box-shadow: 0 0 10px #FFD700;
    }
    
    .preview-moon {
        width: 18px;
        height: 18px;
        background: #F1C40F;
        top: 10px;
        right: 10px;
        box-shadow: 0 0 8px #F1C40F;
    }
    
    .preview-cloud {
        width: 25px;
        height: 12px;
        background: rgba(255, 255, 255, 0.8);
        bottom: 10px;
        left: 12px;
        border-radius: 10px;
    }
    
    .preview-star {
        width: 3px;
        height: 3px;
        background: white;
        top: 15px;
        left: 15px;
    }
    
    .preview-star.small {
        width: 2px;
        height: 2px;
        top: 20px;
        left: 25px;
    }
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
// Функция для кнопки "Купи мне кофе"
function buyMeCoffee() {
    // Можно добавить ссылку на сервис донатов
    const donateUrl = 'https://www.buymeacoffee.com/'; // Замените на свою ссылку
    
    // Создаем красивое уведомление
    showNotification('Спасибо за поддержку! ☕️');
    
    // Открываем ссылку в новом окне
    setTimeout(() => {
        window.open(donateUrl, '_blank');
    }, 1000);
    
    // Добавляем анимацию нажатия
    const button = document.querySelector('.coffee-button');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

// Также обновим функцию showNotification для поддержки эмодзи
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

// Добавляем анимацию исчезновения для уведомлений
const style = document.createElement('style');
style.textContent += `
    @keyframes notificationSlideOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(style);