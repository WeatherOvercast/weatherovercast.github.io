// Конфигурация API
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Функция уведомлений
function showNotification(message) {
    console.log('🔔 ' + message);
}

// Глобальные переменные
let map = null;
let userPlacemark = null;
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
const TEMPERATURE_SHIFT = 0;



// ========== СИСТЕМА УВЕДОМЛЕНИЙ ==========
let isFirstLoad = true;

class IOSNotifications {
    constructor() {
        this.notificationQueue = [];
        this.isShowing = false;
        this.init();
    }

    init() {
        const container = document.createElement('div');
        container.id = 'ios-notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 0;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    show(options) {
        return new Promise((resolve) => {
            const notification = {
                id: Date.now().toString(),
                type: options.type || 'info',
                title: options.title || '',
                message: options.message || '',
                duration: options.duration || 3000,
                onClose: resolve
            };

            this.notificationQueue.push(notification);
            this.processQueue();
        });
    }

    processQueue() {
        if (this.isShowing || this.notificationQueue.length === 0) return;
        this.isShowing = true;
        const notification = this.notificationQueue.shift();
        this.createNotificationElement(notification);
    }

    createNotificationElement(notification) {
        const container = document.getElementById('ios-notifications-container');
        const notificationEl = document.createElement('div');
        notificationEl.className = `ios-notification ${notification.type}`;
        notificationEl.id = `notification-${notification.id}`;

        const timeString = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit', 
            minute: '2-digit'
        });

        notificationEl.innerHTML = `
            <div class="notification-header">
                <div class="notification-app">
                    <div class="app-icon">W</div>
                    <span>Weather Overcast</span>
                </div>
                <div class="notification-time">${timeString}</div>
            </div>
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
        `;

        container.appendChild(notificationEl);

        requestAnimationFrame(() => {
            notificationEl.classList.add('show');
        });

        setTimeout(() => {
            this.hideNotification(notification.id, notification.onClose);
        }, notification.duration);
    }

    hideNotification(id, onClose) {
        const notificationEl = document.getElementById(`notification-${id}`);
        if (!notificationEl) {
            this.isShowing = false;
            this.processQueue();
            if (onClose) onClose();
            return;
        }

        notificationEl.classList.remove('show');
        notificationEl.classList.add('hide');

        setTimeout(() => {
            notificationEl.remove();
            this.isShowing = false;
            this.processQueue();
            if (onClose) onClose();
        }, 500);
    }

    success(title, message, duration = 2000) {
        return this.show({ type: 'success', title, message, duration });
    }

    warning(title, message, duration = 4000) {
        return this.show({ type: 'warning', title, message, duration });
    }

    error(title, message, duration = 5000) {
        return this.show({ type: 'error', title, message, duration });
    }

    info(title, message, duration = 3000) {
        return this.show({ type: 'info', title, message, duration });
    }
}

const iosNotifications = new IOSNotifications();

// Заменяем старую функцию showNotification
function showNotification(message, type = 'info') {
    switch(type) {
        case 'error': iosNotifications.error('Ошибка', message); break;
        case 'warning': iosNotifications.warning('Внимание', message); break;
        case 'success': iosNotifications.success('Успешно', message); break;
        default: iosNotifications.info('Информация', message);
    }
}


// База данных для автодополнения
const cityDatabase = [
    { name: "Санкт-Петербург", region: "Санкт-Петербург и Ленинградская область", type: "город" },
    { name: "Новоселье", region: "Ленинградская область", type: "городской посёлок", distance: "20 км" },
    { name: "Янино-1", region: "Ленинградская область", type: "городской посёлок", distance: "14 км" },
    { name: "Песочный", region: "Санкт-Петербург", type: "посёлок", distance: "22 км" },
    { name: "Павловск", region: "Санкт-Петербург", type: "город", distance: "29 км" },
    { name: "имени Свердлова", region: "Ленинградская область", type: "городской посёлок", distance: "24 км" },
    { name: "Москва", region: "Московская область", type: "город" },
    { name: "Питер", region: "Санкт-Петербург", type: "город" },
    { name: "Подкаменка", region: "Ленинградская область", type: "деревня", distance: "35 км" },
    { name: "Выборг", region: "Ленинградская область", type: "город", distance: "130 км" },
    { name: "Гатчина", region: "Ленинградская область", type: "город", distance: "45 км" },
    { name: "Кронштадт", region: "Санкт-Петербург", type: "город", distance: "30 км" }
];

// Переводы погодных условий
const weatherTranslations = {
    'clear sky': 'Ясно',
    'few clouds': 'Небольшая облачность',
    'scattered clouds': 'Рассеянные облака',
    'broken clouds': 'Облачно с прояснениями',
    'overcast clouds': 'Пасмурно',
    'shower rain': 'Ливень',
    'rain': 'Дождь',
    'thunderstorm': 'Гроза',
    'snow': 'Снег',
    'mist': 'Туман',
    'light rain': 'Небольшой дождь',
    'moderate rain': 'Умеренный дождь',
    'heavy intensity rain': 'Сильный дождь'
};

// ========== УЛУЧШЕННЫЕ ФУНКЦИИ ДЛЯ ВРЕМЕНИ ==========
function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function getCorrectLocalTime(utcTimestamp, lat, lon) {
    return new Promise(async (resolve) => {
        try {
            // OpenWeatherMap уже возвращает локальное время, используем как есть
            const localTime = new Date(utcTimestamp * 1000);
            console.log('Время из OpenWeatherMap (уже локальное):', localTime);
            resolve(localTime);
            
        } catch (error) {
            console.log('Ошибка расчета времени, используем локальное время устройства');
            resolve(new Date());
        }
    });
}

function calculateTimezoneForRussia(longitude) {
    let offset = 3 * 3600; // UTC+3 по умолчанию
    return offset;
}

function getLocalTimeFromUTC(utcTimestamp, timezoneOffset) {
    // OpenWeatherMap уже возвращает локальное время, используем как есть
    return new Date(utcTimestamp * 1000);
}

function formatHourWithMinutes(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ТЕМПЕРАТУРОЙ ==========
function convertTemperature(temp, units) {
    const celsius = temp;
    switch(units) {
        case 'fahrenheit':
            return Math.round((celsius * 9/5) + 32);
        case 'kelvin':
            return Math.round(celsius + 273.15);
        case 'celsius':
        default:
            return Math.round(celsius);
    }
}

function applyTemperatureShift(temp) {
    const shiftedTemp = temp + TEMPERATURE_SHIFT;
    return convertTemperature(shiftedTemp, currentUnits);
}

function getTemperatureSymbol(units) {
    switch(units) {
        case 'fahrenheit': return '°F';
        case 'kelvin': return 'K';
        case 'celsius':
        default: return '°C';
    }
}

function updateAllTemperatures() {
    if (userPlacemark) {
        const coords = userPlacemark.geometry.getCoordinates();
        getWeatherByCoords(coords[0], coords[1]);
    } else if (currentCity) {
        getWeatherByCity(currentCity);
    }
}

function addToFavorites(cityData) {
    if (!isCityInFavorites(cityData.name)) {
        const favoriteCity = {
            name: cityData.name,
            country: cityData.sys.country,
            lat: cityData.coord.lat,
            lon: cityData.coord.lon,
            timestamp: Date.now()
        };
        favorites.push(favoriteCity);
        saveFavorites();
        updateFavoriteButton(true);
        iosNotifications.success('Добавлено', `${cityData.name} в избранном`, 2000);
    }
}

function removeFromFavorites(cityName) {
    favorites = favorites.filter(fav => fav.name !== cityName);
    saveFavorites();
    if (currentCity === cityName) {
        updateFavoriteButton(false);
    }
    iosNotifications.info('Удалено', `${cityName} из избранного`, 2000);
}

function saveFavorites() {
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
}

function isCityInFavorites(cityName) {
    return favorites.some(fav => fav.name === cityName);
}

function updateFavoriteButton(isFavorite) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (!favoriteBtn) return;

    if (isFavorite) {
        favoriteBtn.classList.add('active');
        favoriteBtn.querySelector('svg').style.fill = 'currentColor';
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.querySelector('svg').style.fill = 'none';
    }
}

// ========== АНИМИРОВАННЫЕ ФУНКЦИИ ДЛЯ ОКОН ==========

function showFavoritesPanel() {
    const overlay = document.getElementById('favorites-overlay');
    const list = document.getElementById('favorites-list');
    const empty = document.getElementById('favorites-empty');

    if (!overlay || !list || !empty) return;

    // Сбрасываем анимации
    overlay.style.animation = 'none';
    list.innerHTML = '';

    if (favorites.length === 0) {
        empty.style.display = 'block';
        list.style.display = 'none';
    } else {
        empty.style.display = 'none';
        list.style.display = 'block';

        favorites.forEach((city, index) => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.style.animationDelay = `${0.1 + index * 0.05}s`;
            item.innerHTML = `
                <div class="favorite-info" onclick="selectFavoriteCity('${city.name}', ${city.lat}, ${city.lon})">
                    <div class="favorite-city">${city.name}</div>
                    <div class="favorite-region">${city.country}</div>
                </div>
                <button class="remove-favorite" onclick="event.stopPropagation(); removeFromFavorites('${city.name}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;
            list.appendChild(item);
        });
    }

    // Запускаем анимацию
    requestAnimationFrame(() => {
        overlay.style.display = 'flex';
        overlay.style.animation = 'fadeInOverlay 0.3s ease-out';
        document.body.classList.add('settings-open');
    });
}

function closeFavoritesPanel() {
    const overlay = document.getElementById('favorites-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeInOverlay 0.3s ease-out reverse';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        }, 250);
    }
}

// Обновляем функцию для настроек
function showSettingsPanel() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.style.animation = 'none';
        requestAnimationFrame(() => {
            overlay.style.display = 'flex';
            overlay.style.animation = 'fadeInOverlay 0.3s ease-out';
            document.body.classList.add('settings-open');
        });
    }
}

function closeSettingsPanel() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeInOverlay 0.3s ease-out reverse';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        }, 250);
    }
}

// Обновляем функцию для качества воздуха
function initAirQualityHint() {
    const questionBtn = document.getElementById('air-quality-question');
    const overlay = document.getElementById('air-quality-overlay');
    const closeBtn = document.getElementById('close-air-quality-hint');

    if (!questionBtn || !overlay || !closeBtn) return;

    questionBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        overlay.style.animation = 'none';
        requestAnimationFrame(() => {
            overlay.style.display = 'flex';
            overlay.style.animation = 'fadeInOverlay 0.3s ease-out';
            document.body.classList.add('settings-open');
        });
    });

    closeBtn.addEventListener('click', function() {
        closeAirQualityHint();
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAirQualityHint();
        }
    });

    function closeAirQualityHint() {
        overlay.style.animation = 'fadeInOverlay 0.3s ease-out reverse';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        }, 250);
    }
}

// Обновляем функцию для сервисов
function showServicesDetails() {
    const normal = document.getElementById('services-normal');
    const details = document.getElementById('services-details');
    
    if (normal && details) {
        normal.style.animation = 'scaleIn 0.3s ease-out reverse';
        setTimeout(() => {
            normal.style.display = 'none';
            details.style.display = 'block';
            details.style.animation = 'scaleIn 0.3s ease-out';
        }, 150);
    }
}

function hideServicesDetails() {
    const normal = document.getElementById('services-normal');
    const details = document.getElementById('services-details');
    
    if (normal && details) {
        details.style.animation = 'scaleIn 0.3s ease-out reverse';
        setTimeout(() => {
            details.style.display = 'none';
            normal.style.display = 'block';
            normal.style.animation = 'scaleIn 0.3s ease-out';
        }, 150);
    }
}

function selectFavoriteCity(cityName, lat, lon) {
    getWeatherByCoords(lat, lon);
    closeFavoritesPanel();
}

function closeFavoritesPanel() {
    const overlay = document.getElementById('favorites-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.classList.remove('settings-open');
    }
}

function toggleFavorite() {
    if (currentCityData) {
        if (isCityInFavorites(currentCity)) {
            removeFromFavorites(currentCity);
        } else {
            addToFavorites(currentCityData);
        }
    } else {
        showFavoritesPanel();
    }
}

// ========== ФУНКЦИИ ДЛЯ ЭКРАНА ЗАГРУЗКИ ==========
function updateLoadingText() {
    const now = new Date();
    const hour = now.getHours();
    const loadingText = document.getElementById('loading-time-text');

    if (!loadingText) return;

    if (hour >= 5 && hour < 8) {
        loadingText.textContent = "Загружаем сайт, пока вы готовите утренний кофе";
    } else if (hour >= 8 && hour < 15) {
        loadingText.textContent = "Загружаем сайт пока вы работаете";
    } else if (hour >= 15 && hour < 19) {
        const eveningTexts = [
            "Загружаем сайт пока вы наслаждаетесь вечером",
            "Загружаем сайт пока вы отдыхаете после работы",
            "Загружаем сайт пока вы планируете вечерние дела"
        ];
        loadingText.textContent = eveningTexts[Math.floor(Math.random() * eveningTexts.length)];
    } else if (hour >= 19 && hour < 23) {
        loadingText.textContent = "Загружаем сайт пока вы готовитесь ко сну";
    } else {
        loadingText.textContent = "Загружаем сайт пока вы спите";
    }
}

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        updateLoadingText();
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;

    loadingScreen.classList.add('fade-out');

    setTimeout(() => {
        loadingScreen.style.display = 'none';

        // ТОЛЬКО при первой загрузке
        if (isFirstLoad) {
            iosNotifications.success('Готово', 'Weather Overcast загружен', 3000);
            isFirstLoad = false;
        }

        const container = document.querySelector('.container');
        const header = document.querySelector('header');

        if (container) container.classList.add('show');
        if (header) header.classList.add('show');
    }, 500);
}

// ========== ФУНКЦИИ ДЛЯ КАРУСЕЛИ СОВЕТОВ ==========
function initTipCarousel() {
    const dots = document.querySelectorAll('.dot');
    const slides = document.querySelectorAll('.tip-slide');

    dots.forEach(dot => {
        dot.addEventListener('click', function() {
            const slideIndex = parseInt(this.getAttribute('data-slide'));

            // Убираем активный класс у всех
            dots.forEach(d => d.classList.remove('active'));
            slides.forEach(s => s.classList.remove('active'));

            // Добавляем активный класс выбранному
            this.classList.add('active');
            slides[slideIndex].classList.add('active');
        });
    });

    // Автопереключение каждые 8 секунд
    setInterval(() => {
        const activeDot = document.querySelector('.dot.active');
        if (!activeDot) return;

        const nextIndex = (parseInt(activeDot.getAttribute('data-slide')) + 1) % dots.length;

        dots.forEach(d => d.classList.remove('active'));
        slides.forEach(s => s.classList.remove('active'));

        dots[nextIndex].classList.add('active');
        slides[nextIndex].classList.add('active');
    }, 8000);
}

async function updateWeatherTip(data, forecastData) {
    const tipText = document.getElementById('tip-text');
    const factText = document.getElementById('fact-text');

    if (!tipText || !factText) return;

    const hasRainToday = checkRainToday(forecastData);

    if (hasRainToday.found) {
        tipText.textContent = `Не забудьте зонт. Возможен дождь в ${hasRainToday.time}`;
    } else {
        try {
            const sunrise = await getCorrectLocalTime(data.sys.sunrise, data.coord.lat, data.coord.lon);
            const sunset = await getCorrectLocalTime(data.sys.sunset, data.coord.lat, data.coord.lon);
            const sunriseTime = formatTime(sunrise);
            const sunsetTime = formatTime(sunset);

            tipText.textContent = `Не пропустите рассвет в ${sunriseTime} и закат в ${sunsetTime}`;
        } catch (error) {
            tipText.textContent = 'Сегодня хорошая погода для прогулок!';
        }
    }

    // Интересные факты о погоде
    const facts = [
        "Знаете ли вы, что самая высокая температура на Земле была зафиксирована в Долине Смерти: 56.7°C!",
        "Ледяные дожди образуются, когда снег тает в теплом слое воздуха, а затем замерзает в холодном у поверхности.",
        "Молния может нагревать воздух вокруг себя до 30,000°C - это в 5 раз горячее поверхности Солнца!",
        "В Антарктиде находится самое сухое место на Земле - некоторые районы не видели дождя 2 миллиона лет.",
        "Облака кажутся белыми потому, что капли воды рассеивают все цвета спектра одинаково.",
        "Самый большой град весил около 1 кг и выпал в Бангладеш в 1986 году.",
        "Радуга появляется, когда солнечный свет преломляется в каплях воды под определенным углом."
    ];

    factText.textContent = facts[Math.floor(Math.random() * facts.length)];
}

function checkRainToday(forecastData) {
    if (!forecastData || !forecastData.list) return { found: false };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);

    for (let item of forecastData.list) {
        const itemTime = new Date(item.dt * 1000);
        if (itemTime >= today && itemTime < tomorrow) {
            if (item.rain || item.snow || 
                (item.weather && item.weather[0].main.toLowerCase().includes('rain'))) {
                return {
                    found: true,
                    time: formatTime(itemTime)
                };
            }
        }
    }

    return { found: false };
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getWindStrength(speedMps) {
    const speedKmh = speedMps * 3.6;

    if (speedKmh < 1) return 'Штиль';
    else if (speedKmh < 11) return 'Легкий ветер';
    else if (speedKmh < 19) return 'Умеренный ветер';
    else if (speedKmh < 29) return 'Свежий ветер';
    else if (speedKmh < 39) return 'Сильный ветер';
    else if (speedKmh < 50) return 'Очень сильный ветер';
    else if (speedKmh < 62) return 'Штормовой ветер';
    else return 'Шторм';
}

function getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function translateWeather(description) {
    return weatherTranslations[description] || description;
}

function calculateDewPoint(temp, humidity) {
    if (humidity === 0) return -273.15;

    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);
    return (b * alpha) / (a - alpha);
}

// ========== ПРОСТЫЕ ФУНКЦИИ ДЛЯ ЛУНЫ БЕЗ ВНЕШНИХ API ==========
async function calculateMoonInfo() {
    try {
        console.log('Вычисляем фазу луны локально...');
        return calculateSimpleMoonPhase();
    } catch (error) {
        console.log('Ошибка расчета луны:', error);
        // Возвращаем реалистичные данные по умолчанию
        return {
            phase: 'Растущая луна',
            illumination: 45,
            age: 7,
            phasePercent: 45,
            isWaning: false,
            nextPhase: 'Первая четверть', 
            daysToNext: 2
        };
    }
}

function calculateSimpleMoonPhase() {
    const now = new Date();
    
    // Используем известное новолуние как точку отсчета
    const knownNewMoon = new Date('2024-12-01T06:21:00Z').getTime();
    const currentTime = now.getTime();
    
    // Лунный цикл в миллисекундах (29.53 дня)
    const lunarCycleMs = 29.53 * 24 * 60 * 60 * 1000;
    
    // Возраст луны в днях (0-29.53)
    const moonAgeDays = ((currentTime - knownNewMoon) % lunarCycleMs) / (24 * 60 * 60 * 1000);
    
    // Фаза луны (0-1)
    const phase = moonAgeDays / 29.53;
    
    console.log('Локальный расчет луны:', { moonAgeDays, phase });
    
    return formatMoonPhase(phase);
}

function formatMoonPhase(phase) {
    console.log('Phase from calculation:', phase);
    
    let phaseName, phasePercent, isWaning;
    
    if (phase < 0.02 || phase > 0.98) {
        phaseName = 'Новолуние';
        phasePercent = 0;
        isWaning = false;
    } else if (phase < 0.25) {
        phaseName = 'Растущая луна';
        phasePercent = Math.round(phase * 4 * 25);
        isWaning = false;
    } else if (phase < 0.27) {
        phaseName = 'Первая четверть';
        phasePercent = 50;
        isWaning = false;
    } else if (phase < 0.5) {
        phaseName = 'Прибывающая луна';
        phasePercent = 50 + Math.round((phase - 0.25) * 4 * 25);
        isWaning = false;
    } else if (phase < 0.52) {
        phaseName = 'Полнолуние';
        phasePercent = 100;
        isWaning = false;
    } else if (phase < 0.75) {
        phaseName = 'Убывающая луна';
        phasePercent = 100 - Math.round((phase - 0.5) * 4 * 25);
        isWaning = true;
    } else if (phase < 0.77) {
        phaseName = 'Последняя четверть';
        phasePercent = 50;
        isWaning = true;
    } else {
        phaseName = 'Старая луна';
        phasePercent = 50 - Math.round((phase - 0.75) * 4 * 25);
        isWaning = true;
    }
    
    const illumination = Math.round(Math.abs(Math.sin(2 * Math.PI * phase)) * 100);
    
    console.log('Calculated illumination:', illumination);
    
    return {
        phase: phaseName,
        illumination: illumination,
        age: Math.round(phase * 29.53),
        phasePercent: phasePercent,
        isWaning: isWaning,
        nextPhase: getNextPhase(phaseName),
        daysToNext: getDaysToNext(phase)
    };
}

function getNextPhase(currentPhase) {
    const phases = ['Новолуние', 'Растущая луна', 'Первая четверть', 'Прибывающая луна', 'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна'];
    const currentIndex = phases.indexOf(currentPhase);
    return phases[(currentIndex + 1) % phases.length];
}

function getDaysToNext(phase) {
    if (phase < 0.25) return Math.round((0.25 - phase) * 29.53);
    if (phase < 0.5) return Math.round((0.5 - phase) * 29.53);
    if (phase < 0.75) return Math.round((0.75 - phase) * 29.53);
    return Math.round((1 - phase) * 29.53);
}

function updateMoonVisualization(phasePercent, isWaning) {
    const moonPhase = document.getElementById('moon-phase');
    if (!moonPhase) return;

    console.log('Визуализация луны:', { phasePercent, isWaning });

    // Полностью сбрасываем стили
    moonPhase.style.cssText = '';

    // Базовые стили
    moonPhase.style.position = 'absolute';
    moonPhase.style.top = '0';
    moonPhase.style.left = '0';
    moonPhase.style.width = '100%';
    moonPhase.style.height = '100%';
    moonPhase.style.borderRadius = '50%';
    moonPhase.style.background = '#f1c40f';
    moonPhase.style.boxShadow = 'inset 0 0 10px rgba(241, 196, 15, 0.8)';

    if (phasePercent === 0) {
        moonPhase.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        moonPhase.style.clipPath = 'inset(0 0 0 0%)';
    } else {
        if (isWaning) {
            const visiblePercent = phasePercent;
            moonPhase.style.clipPath = `inset(0 ${100 - visiblePercent}% 0 0)`;
        } else {
            const visiblePercent = phasePercent;
            moonPhase.style.clipPath = `inset(0 0 0 ${100 - visiblePercent}%)`;
        }
    }
}

// ========== ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ О ПОГОДЕ ==========
async function getAirQuality(lat, lon) {
    try {
        const controller = new AbortController();
        const timeoutDuration = 10000; // 10 секунд
        
        const timeoutId = setTimeout(() => {
            console.log('⏰ Таймаут качества воздуха - отменяем...');
            controller.abort();
        }, timeoutDuration);
        
        const response = await fetch(
            `${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
            { 
                signal: controller.signal,
                method: 'GET'
            }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.log('⚠️ Качество воздуха недоступно:', error.message);
        // Возвращаем null вместо выброса ошибки
        return null;
    }
}

// ========== РЕЗЕРВНЫЕ ДАННЫЕ ПРИ ОШИБКАХ ==========
function showFallbackWeatherData() {
    console.log('🔄 Показываем резервные данные...');
    
    // Базовые данные по умолчанию
    const fallbackData = {
        name: currentCity || 'Санкт-Петербург',
        main: {
            temp: 15,
            feels_like: 14,
            humidity: 65,
            pressure: 750
        },
        weather: [{ description: 'Данные обновляются', main: 'Clouds' }],
        wind: { speed: 3 },
        sys: { 
            sunrise: Math.floor(Date.now() / 1000) + 21600, // +6 часов
            sunset: Math.floor(Date.now() / 1000) + 64800   // +18 часов
        },
        visibility: 10
    };
    
    // Обновляем интерфейс с резервными данными
    const temp = convertTemperature(fallbackData.main.temp, currentUnits);
    const feelsLike = convertTemperature(fallbackData.main.feels_like, currentUnits);
    
    document.getElementById('current-temp').innerHTML = `
        <span class="temp-bullet">●</span>
        <span class="temp-value">${temp}${getTemperatureSymbol(currentUnits)}</span>
    `;
    document.getElementById('feels-like').textContent = `Ощущается как ${feelsLike}${getTemperatureSymbol(currentUnits)}`;
    document.getElementById('weather-description').textContent = 'Данные временно недоступны';
    
    // Обновляем остальные поля
    document.getElementById('wind-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>-- км/ч</span>
        </div>
    `;
    
    document.getElementById('pressure-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${fallbackData.main.pressure} мм рт. ст.</span>
        </div>
    `;
    
    document.getElementById('humidity-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${fallbackData.main.humidity}%</span>
        </div>
    `;
    
    document.getElementById('rain-info').innerHTML = `
        <span>●</span>
        <span>Данные обновляются</span>
    `;
    
    document.getElementById('wind-info').innerHTML = `
        <span>●</span>
        <span>Данные обновляются</span>
    `;
    
    // Показываем сообщение
    iosNotifications.info('Временные данные', 'Используем резервную информацию', 3000);
}

async function getWeatherByCoords(lat, lon) {
    // Добавляем проверку на доступность сети
    if (!navigator.onLine) {
        console.log('📡 Нет подключения к интернету');
        iosNotifications.warning('Нет сети', 'Проверьте подключение к интернету', 4000);
        hideLoadingScreen();
        showFallbackWeatherData();
        return;
    }
    
    try {
        showLoadingScreen();
        
        // Создаем AbortController с правильной логикой
        const controller = new AbortController();
        const timeoutDuration = 15000; // 15 секунд
        
        // Устанавливаем таймаут
        const timeoutId = setTimeout(() => {
            console.log('⏰ Таймаут запроса - отменяем...');
            controller.abort();
        }, timeoutDuration);
        
        // Функция для очистки таймаута
        const clearTimeout = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
        
        try {
            const [weatherData, forecastData, airQualityData] = await Promise.all([
                fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`, {
                    signal: controller.signal
                }).then(async r => {
                    if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                    return await r.json();
                }),
                fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`, {
                    signal: controller.signal
                }).then(async r => {
                    if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
                    return await r.json();
                }),
                getAirQuality(lat, lon)
            ]);

            // Очищаем таймаут если запросы успешны
            clearTimeout();

            if (weatherData.cod === 200) {
                currentCityData = weatherData;
                currentCity = weatherData.name;
                
                await updateWeatherData(weatherData, forecastData, airQualityData);
                updateMapLocation(lat, lon);
                
                // Короткое уведомление только при успехе
                if (!isFirstLoad) {
                    iosNotifications.success('Обновлено', `Погода для ${weatherData.name}`, 2000);
                }
            } else {
                throw new Error(weatherData.message || 'Неизвестная ошибка API');
            }
            
        } catch (fetchError) {
            clearTimeout();
            throw fetchError; // Пробрасываем ошибку дальше
        }
        
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        
        // Более детальная обработка ошибок
        let errorMessage = 'Не удалось загрузить данные';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Сервер не отвечает. Проверьте подключение';
            console.log('🕒 Превышено время ожидания сервера');
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Проблемы с подключением к серверу погоды';
            console.log('🌐 Ошибка сети - нет подключения к API');
        } else if (error.message.includes('HTTP error')) {
            errorMessage = 'Ошибка сервера погоды';
            console.log('🚫 Ошибка HTTP от API');
        } else {
            console.log('❌ Другая ошибка:', error.message);
        }
        
        iosNotifications.error('Ошибка', errorMessage, 4000);
        
        // Показываем данные по умолчанию
        showFallbackWeatherData();
    } finally {
        setTimeout(hideLoadingScreen, 1000);
    }
}

async function getWeatherByCity(city) {
    try {
        showLoadingScreen();
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`
        );
        const weatherData = await weatherResponse.json();

        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            currentCity = weatherData.name;
            const [forecastData, airQualityData] = await Promise.all([
                getForecast(weatherData.coord.lat, weatherData.coord.lon),
                getAirQuality(weatherData.coord.lat, weatherData.coord.lon)
            ]);

            await updateWeatherData(weatherData, forecastData, airQualityData);
            updateMapLocation(weatherData.coord.lat, weatherData.coord.lon);
            
            // Короткое уведомление только при успехе
            if (!isFirstLoad) {
                iosNotifications.success('Город изменен', `Теперь смотрим ${weatherData.name}`, 2000);
            }
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        iosNotifications.error('Ошибка', 'Город не найден', 3000);
    } finally {
        setTimeout(hideLoadingScreen, 1000);
    }
}

async function getForecast(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`
        );
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения прогноза:', error);
        return null;
    }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ДАННЫХ ==========
async function updateWeatherData(data, forecastData, airQualityData) {
    // ОСНОВНЫЕ ДАННЫЕ
    const temp = applyTemperatureShift(data.main.temp);
    const feelsLike = applyTemperatureShift(data.main.feels_like);
    const weatherDesc = translateWeather(data.weather[0].description);

    document.getElementById('current-temp').innerHTML = `
        <span class="temp-bullet">●</span>
        <span class="temp-value">${temp}${getTemperatureSymbol(currentUnits)}</span>
    `;
    document.getElementById('feels-like').textContent = `Ощущается как ${feelsLike}${getTemperatureSymbol(currentUnits)}`;
    document.getElementById('weather-description').textContent = weatherDesc;

    // ВЕТЕР
    const windSpeed = Math.round(data.wind.speed * 3.6);
    const windGust = data.wind.gust ? Math.round(data.wind.gust * 3.6) : windSpeed + 5;
    const windDir = getWindDirection(data.wind.deg);
    const windStrength = getWindStrength(data.wind.speed);

    document.getElementById('wind-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${windSpeed} км/ч</span>
        </div>
        <div class="tile-content-item">
            <span>●</span>
            <span>${windDir} - ${windStrength}</span>
        </div>
        <div class="tile-content-item">
            <span>●</span>
            <span>Порывы до ${windGust} км/ч</span>
        </div>
    `;

    // ДАВЛЕНИЕ
    const pressure = Math.round(data.main.pressure * 0.750062);
    const pressureStatus = pressure >= 745 && pressure <= 755 ? 'Нормальное' : 
                             pressure > 755 ? 'Высокое' : 'Низкое';

    document.getElementById('pressure-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${pressure} мм рт. ст.</span>
        </div>
        <div class="tile-content-item">
            <span>●</span>
            <span>${pressureStatus}</span>
        </div>
    `;

    // ВЛАЖНОСТЬ
    const humidity = data.main.humidity;
    const humidityStatus = humidity < 30 ? 'Сухо' : 
                             humidity < 60 ? 'Комфортно' : 
                             humidity < 80 ? 'Влажно' : 'Очень высокая';

    document.getElementById('humidity-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${humidity}%</span>
        </div>
        <div class="tile-content-item">
            <span>●</span>
            <span>${humidityStatus}</span>
        </div>
    `;

    // ВИДИМОСТЬ
    const visibility = (data.visibility / 1000).toFixed(1);
    const visibilityStatus = visibility > 20 ? 'Отличная' : 
                               visibility > 10 ? 'Хорошая' : 
                               visibility > 5 ? 'Умеренная' : 'Ограниченная';

    document.getElementById('visibility-details').innerHTML = `
        <div class="tile-content-item">
            <span>●</span>
            <span>${visibility} км</span>
        </div>
        <div class="tile-content-item">
            <span>●</span>
            <span>${visibilityStatus}</span>
        </div>
    `;

    // ТОЧКА РОСЫ
    const dewPoint = calculateDewPoint(data.main.temp, data.main.humidity);
    let comfortLevel, comfortDescription;

    if (dewPoint < 10) {
        comfortLevel = 'Очень комфортно';
        comfortDescription = 'Сухой и приятный воздух';
    } else if (dewPoint < 13) {
        comfortLevel = 'Комфортно';
        comfortDescription = 'Приятные условия';
    } else if (dewPoint < 16) {
        comfortLevel = 'Умеренно';
        comfortDescription = 'Нормальные условия';
    } else if (dewPoint < 18) {
        comfortLevel = 'Немного влажно';
        comfortDescription = 'Чувствуется влажность';
    } else if (dewPoint < 21) {
        comfortLevel = 'Влажно';
        comfortDescription = 'Не очень комфортно';
    } else if (dewPoint < 24) {
        comfortLevel = 'Очень влажно';
        comfortDescription = 'Ощущается тяжело';
    } else {
        comfortLevel = 'Крайне влажно';
        comfortDescription = 'Очень некомфортно';
    }

    document.getElementById('dew-point-details').innerHTML = `
        <div class="dew-point-value">${dewPoint.toFixed(1)}°C</div>
        <div class="dew-point-comfort">${comfortLevel}</div>
        <div class="dew-point-info">${comfortDescription}</div>
        <div class="dew-point-info">Влажность: ${data.main.humidity}%</div>
        <div class="dew-point-info">Температура: ${Math.round(data.main.temp)}°C</div>
    `;

           // РАССВЕТ И ЗАКАТ - ИСПОЛЬЗУЕМ ВРЕМЯ КАК ЕСТЬ ИЗ API
    try {
        // OpenWeatherMap уже возвращает локальное время в timestamp
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        
        console.log('Рассвет:', sunrise);
        console.log('Закат:', sunset);
        
        document.getElementById('sunrise-time').textContent = formatTime(sunrise);
        document.getElementById('sunset-time').textContent = formatTime(sunset);
        document.getElementById('sun-times-city').textContent = data.name;
    } catch (error) {
        console.log('Ошибка времени:', error);
        // Просто используем timestamp как есть
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        
        document.getElementById('sunrise-time').textContent = formatTime(sunrise);
        document.getElementById('sunset-time').textContent = formatTime(sunset);
        document.getElementById('sun-times-city').textContent = data.name;
    }

    // ОСАДКИ В ОСНОВНОМ БЛОКЕ
    if (data.rain) {
        const rainVolume = data.rain['1h'] || data.rain['3h'] || 0;
        document.getElementById('rain-info').innerHTML = `
            <span>●</span>
            <span>Осадки: ${rainVolume} мм</span>
        `;
    } else {
        document.getElementById('rain-info').innerHTML = `
            <span>●</span>
            <span>Без осадков</span>
        `;
    }

    // ВЕТЕР В ОСНОВНОМ БЛОКЕ
    document.getElementById('wind-info').innerHTML = `
        <span>●</span>
        <span>${data.wind.speed} м/с, ${windDir}, ${windStrength}</span>
    `;

    // ОБНОВЛЯЕМ ДОПОЛНИТЕЛЬНУЮ ИНФОРМАЦИЮ
    updateAdditionalInfo(data, airQualityData);

    // ОБНОВЛЯЕМ ПРОГНОЗЫ И СОВЕТ
    if (forecastData) {
        updateHourlyForecast(forecastData, data);
        updateWeeklyForecast(forecastData);
        updateWeatherTip(data, forecastData);
    }

    // ОБНОВЛЯЕМ КНОПКУ ИЗБРАННОГО
    updateFavoriteButton(isCityInFavorites(data.name));

    // ОБНОВЛЯЕМ ТЕМУ
    updateThemeByWeather(data.weather[0].main, data.sys);
}

// ========== ФУНКЦИИ ДЛЯ ДОПОЛНИТЕЛЬНОЙ ИНФОРМАЦИИ ==========
function updateAdditionalInfo(data, airQualityData) {
    updateAirQualityInfo(airQualityData);

    // ФАЗЫ ЛУНЫ - асинхронно загружаем данные
    loadMoonInfo();
}

function loadMoonInfo() {
    try {
        const moonInfo = calculateMoonInfo();
        
        moonInfo.then(info => {
            console.log('Moon info:', info); 
            
            document.getElementById('moon-phase-text').textContent = `Фаза: ${info.phase}`;
            document.getElementById('moon-illumination').textContent = `Освещенность: ${info.illumination}%`;
            document.getElementById('moon-age').textContent = `Возраст: ${info.age} дней`;
            document.getElementById('moon-next').textContent = `Следующая фаза: ${info.nextPhase} (через ${info.daysToNext} дней)`;

            updateMoonVisualization(info.phasePercent, info.isWaning);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки данных о луне:', error);
        document.getElementById('moon-phase-text').textContent = 'Фаза: Данные недоступны';
    }
}

// ========== ФУНКЦИИ ДЛЯ КАЧЕСТВА ВОЗДУХА ==========
function getPollutionLevel(value, pollutant) {
    const thresholds = {
        'pm2_5': [12, 35.4, 55.4, 150.4, 250.4],
        'pm10': [54, 154, 254, 354, 424],
        'o3': [54, 70, 85, 105, 200],
        'no2': [53, 100, 360, 649, 1249],
        'so2': [35, 75, 185, 304, 604],
        'co': [4.4, 9.4, 12.4, 15.4, 30.4]
    };

    const levels = ['хороший', 'удовлетворительный', 'умеренный', 'плохой', 'очень плохой', 'опасный'];
    const threshold = thresholds[pollutant] || thresholds.pm2_5;

    const adjustedValue = pollutant === 'co' ? value / 1000 : value;

    for (let i = 0; i < threshold.length; i++) {
        if (adjustedValue <= threshold[i]) return levels[i];
    }
    return levels[5];
}

function getPollutionLevelClass(level) {
    switch(level) {
        case 'хороший': return 'level-good';
        case 'удовлетворительный': return 'level-moderate';
        case 'умеренный': return 'level-unhealthy-sensitive';
        case 'плохой': return 'level-unhealthy';
        case 'очень плохой': return 'level-very-unhealthy';
        case 'опасный': return 'level-hazardous';
        default: return 'level-good';
    }
}

function updateAirQualityInfo(airQualityData) {
    const airQualityElement = document.getElementById('air-quality');
    if (!airQualityElement) return;

    if (airQualityData && airQualityData.list && airQualityData.list.length > 0) {
        const airData = airQualityData.list[0];
        const aqi = airData.main.aqi;
        const components = airData.components;

        const aqiLevels = {
            1: { text: 'Хороший', class: 'level-good', advice: 'Идеальные условия для прогулок' },
            2: { text: 'Удовлетворительный', class: 'level-moderate', advice: 'Хорошие условия, подходят для большинства людей' },
            3: { text: 'Умеренный', class: 'level-unhealthy-sensitive', advice: 'Чувствительным группам ограничить пребывание на улице' },
            4: { text: 'Плохой', class: 'level-unhealthy', advice: 'Ограничить физическую активность на открытом воздухе' },
            5: { text: 'Очень плохой', class: 'level-very-unhealthy', advice: 'Избегать длительного пребывания на улице' }
        };

        const aqiInfo = aqiLevels[aqi] || aqiLevels[1];

        airQualityElement.innerHTML = `
            <div class="tile-content-item">
                <span>●</span>
                <span>Индекс AQI: ${aqi} (${aqiInfo.text})</span>
            </div>
            <div class="tile-content-item">
                <span>●</span>
                <span>${aqiInfo.advice}</span>
            </div>
            <div class="air-quality-details">
                <div class="pollutant-item">
                    <span>PM2.5: ${components.pm2_5.toFixed(1)} мкг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.pm2_5, 'pm2_5'))}">
                        ${getPollutionLevel(components.pm2_5, 'pm2_5')}
                    </span>
                </div>
                <div class="pollutant-item">
                    <span>PM10: ${components.pm10.toFixed(1)} мкг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.pm10, 'pm10'))}">
                        ${getPollutionLevel(components.pm10, 'pm10')}
                    </span>
                </div>
                <div class="pollutant-item">
                    <span>O₃: ${components.o3.toFixed(1)} мкг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.o3, 'o3'))}">
                        ${getPollutionLevel(components.o3, 'o3')}
                    </span>
                </div>
                <div class="pollutant-item">
                    <span>NO₂: ${components.no2.toFixed(1)} мкг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.no2, 'no2'))}">
                        ${getPollutionLevel(components.no2, 'no2')}
                    </span>
                </div>
                <div class="pollutant-item">
                    <span>SO₂: ${components.so2.toFixed(1)} мкг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.so2, 'so2'))}">
                        ${getPollutionLevel(components.so2, 'so2')}
                    </span>
                </div>
                <div class="pollutant-item">
                    <span>CO: ${(components.co / 1000).toFixed(1)} мг/м³</span>
                    <span class="pollutant-level ${getPollutionLevelClass(getPollutionLevel(components.co, 'co'))}">
                        ${getPollutionLevel(components.co, 'co')}
                    </span>
                </div>
            </div>
        `;

        updateAirQualityHint(airData);
    } else {
        airQualityElement.innerHTML = `
            <div class="tile-content-item">
                <span>●</span>
                <span>Данные о качестве воздуха недоступны</span>
            </div>
        `;
    }
}

function updateAirQualityHint(airData) {
    const readings = document.querySelector('.current-readings');
    if (!readings || !airData) return;

    const components = airData.components;
    const aqi = airData.main.aqi;

    const aqiLevels = {
        1: 'Хороший',
        2: 'Удовлетворительный', 
        3: 'Умеренный',
        4: 'Плохой',
        5: 'Очень плохой'
    };

    readings.innerHTML = `
        <div class="reading-item">
            <span>AQI:</span>
            <span class="reading-value">${aqi} (${aqiLevels[aqi] || 'Хороший'})</span>
        </div>
        <div class="reading-item">
            <span>PM2.5:</span>
            <span class="reading-value">${components.pm2_5.toFixed(1)} мкг/м³</span>
        </div>
        <div class="reading-item">
            <span>PM10:</span>
            <span class="reading-value">${components.pm10.toFixed(1)} мкг/м³</span>
        </div>
        <div class="reading-item">
            <span>O₃:</span>
            <span class="reading-value">${components.o3.toFixed(1)} мкг/м³</span>
        </div>
        <div class="reading-item">
            <span>NO₂:</span>
            <span class="reading-value">${components.no2.toFixed(1)} мкг/м³</span>
        </div>
        <div class="reading-item">
            <span>SO₂:</span>
            <span class="reading-value">${components.so2.toFixed(1)} мкг/м³</span>
        </div>
        <div class="reading-item">
            <span>CO:</span>
            <span class="reading-value">${(components.co / 1000).toFixed(1)} мг/м³</span>
        </div>
    `;
}

function initAirQualityHint() {
    const questionBtn = document.getElementById('air-quality-question');
    const overlay = document.getElementById('air-quality-overlay');
    const closeBtn = document.getElementById('close-air-quality-hint');

    if (!questionBtn || !overlay || !closeBtn) return;

    questionBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        overlay.style.display = 'flex';
        document.body.classList.add('settings-open');
    });

    closeBtn.addEventListener('click', function() {
        closeAirQualityHint();
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAirQualityHint();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            closeAirQualityHint();
        }
    });

    function closeAirQualityHint() {
        overlay.style.display = 'none';
        document.body.classList.remove('settings-open');
    }
}

// ========== ИСПРАВЛЕННЫЕ ФУНКЦИИ ДЛЯ ПРОГНОЗОВ ==========
function updateHourlyForecast(forecastData, currentWeatherData) {
    const container = document.getElementById('hourly-forecast');
    if (!container) return;

    container.innerHTML = '';

    const currentData = forecastData.city;
    const timezoneOffset = currentData.timezone;
    
    // Получаем время с учетом часового пояса и коррекции -1 час
    const timeShift = 3600; // 1 час в секундах
const sunrise = new Date(currentData.sunrise * 1000);
const sunset = new Date(currentData.sunset * 1000);
    
    const now = new Date();

    // ИСПРАВЛЕНИЕ: Берем только 7 прогнозов + текущая погода = 8 карточек
    const forecastToShow = forecastData.list.slice(0, 7);

    // Добавляем текущую погоду
    const currentTemp = applyTemperatureShift(currentWeatherData.main.temp);
    const currentWeatherIcon = getWeatherIcon(currentWeatherData.weather[0].main, currentWeatherData.main.temp);
    const currentWeatherDesc = translateWeather(currentWeatherData.weather[0].description);

    const currentHourCard = document.createElement('div');
    currentHourCard.className = 'hour-card current-card';
    currentHourCard.innerHTML = `
        <div class="hour-time">Сейчас</div>
        <div class="hour-icon">${currentWeatherIcon}</div>
        <div class="hour-temp">
            <span class="hour-temp-bullet">●</span>
            <span>${currentTemp}${getTemperatureSymbol(currentUnits)}</span>
        </div>
        <div class="hour-weather">${currentWeatherDesc}</div>
    `;
    container.appendChild(currentHourCard);

    // Добавляем прогноз на следующие часы
    forecastToShow.forEach((forecast, index) => {
        // Учитываем часовой пояс для времени прогноза с коррекцией -1 час
const forecastTime = new Date(forecast.dt * 1000);

        // Пропускаем если это уже прошлое время
        if (forecastTime < now) return;

        const timeString = formatTime(forecastTime);
        const temp = applyTemperatureShift(forecast.main.temp);
        const weatherIcon = getWeatherIcon(forecast.weather[0].main, forecast.main.temp);
        const weatherDesc = translateWeather(forecast.weather[0].description);

        const hourCard = document.createElement('div');
        hourCard.className = 'hour-card forecast-card';

        hourCard.innerHTML = `
            <div class="hour-time">${timeString}</div>
            <div class="hour-icon">${weatherIcon}</div>
            <div class="hour-temp">
                <span class="hour-temp-bullet">●</span>
                <span>${temp}${getTemperatureSymbol(currentUnits)}</span>
            </div>
            <div class="hour-weather">${weatherDesc}</div>
        `;
        container.appendChild(hourCard);
    });

    // Обновляем заголовок
    const title = document.querySelector('.hourly-forecast .section-title');
    if (title) {
        title.innerHTML = 'Прогноз на 8 часов <span style="font-size: 14px; opacity: 0.7;">(точность ~90%)</span>';
    }
}

function updateWeeklyForecast(forecastData) {
    const container = document.getElementById('forecast-week');
    if (!container) return;

    container.innerHTML = '';

    const dailyForecasts = [];
    for (let i = 0; i < forecastData.list.length; i += 8) {
        if (dailyForecasts.length < 7) {
            dailyForecasts.push(forecastData.list[i]);
        }
    }

    const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
    const today = new Date();
    const todayIndex = today.getDay();

    dailyForecasts.forEach((forecast, index) => {
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-day';

        const dayIndex = (todayIndex + index) % 7;
        const dayName = index === 0 ? 'СЕГОДНЯ' : dayNames[dayIndex];

        const tempMax = applyTemperatureShift(forecast.main.temp_max);
        const tempMin = applyTemperatureShift(forecast.main.temp_min);

        dayCard.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-temps">
                <span class="temp-high">${tempMax}${getTemperatureSymbol(currentUnits)}</span>
                <span class="temp-low">${tempMin}${getTemperatureSymbol(currentUnits)}</span>
            </div>
        `;
        container.appendChild(dayCard);
    });
}

function getWeatherIcon(weatherMain, temperature) {
    const main = weatherMain.toLowerCase();
    const isNight = isCurrentlyNight();

    if (isNight) {
        switch(main) {
            case 'clear': return '●';
            case 'clouds': return '●';
            case 'rain': return '●';
            case 'snow': return '●';
            case 'thunderstorm': return '●';
            case 'drizzle': return '●';
            case 'mist': case 'fog': case 'haze': return '●';
            default: return '●';
        }
    } else {
        switch(main) {
            case 'clear': return '●';
            case 'clouds': 
                if (temperature > 20) return '●';
                return '●';
            case 'rain': 
                if (temperature > 15) return '●';
                return '●';
            case 'snow': return '●';
            case 'thunderstorm': return '●';
            case 'drizzle': return '●';
            case 'mist': case 'fog': case 'haze': return '●';
            default: return '●';
        }
    }
}

function isCurrentlyNight() {
    const now = new Date();
    const hour = now.getHours();
    return hour < 6 || hour > 20;
}

// ========== ФУНКЦИИ ДЛЯ ТЕМ ==========
function updateThemeByWeather(weatherMain, sys) {
    if (currentTheme !== 'dynamic') return;

    const now = new Date();
    const currentTime = now.getTime();
    const timezoneOffset = sys.timezone || 0;
const sunrise = new Date(sys.sunrise * 1000).getTime();
const sunset = new Date(sys.sunset * 1000).getTime();

    const isNight = currentTime < sunrise || currentTime > sunset;
    const themeClass = isNight ? 'night' : weatherMain.toLowerCase();

    document.body.className = themeClass;
}

function saveSettings() {
    localStorage.setItem('weatherUnits', currentUnits);
    localStorage.setItem('weatherTheme', currentTheme);
}

function loadSettings() {
    const savedUnits = localStorage.getItem('weatherUnits');
    const savedTheme = localStorage.getItem('weatherTheme');

    if (savedUnits) {
        currentUnits = savedUnits;
        const unitsText = {
            'celsius': 'Цельсий (°C)',
            'fahrenheit': 'Фаренгейт (°F)',
            'kelvin': 'Кельвин (K)'
        };
        const unitsElement = document.getElementById('current-units');
        if (unitsElement) {
            unitsElement.textContent = unitsText[currentUnits];
        }
    }

    if (savedTheme) {
        currentTheme = savedTheme;
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === currentTheme) {
                option.classList.add('active');
            }
        });

        if (currentTheme === 'light') {
            document.body.style.background = 'linear-gradient(135deg, #87CEEB, #E0F7FA)';
            document.body.style.color = '#333';
        } else if (currentTheme === 'dark') {
            document.body.style.background = 'linear-gradient(135deg, #2C3E50, #34495E)';
            document.body.style.color = '#FFFFFF';
        } else {
            document.body.style.background = '';
            document.body.style.color = '';
        }
    }
}

// ========== ФУНКЦИИ ДЛЯ КАРТЫ ==========
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API не загружена');
        // Показываем сообщение пользователю
        showNotification('Карты временно недоступны');
        return;
    }

    try {
        ymaps.ready(function() {
            map = new ymaps.Map('map', {
                center: [59.9343, 30.3351],
                zoom: 10
            });

            map.controls.remove('zoomControl');
            map.controls.remove('geolocationControl');
            map.controls.remove('searchControl');
            map.controls.remove('trafficControl');
            map.controls.remove('typeSelector');
            map.controls.remove('fullscreenControl');
            map.controls.remove('rulerControl');

            const overlay = document.createElement('div');
            overlay.className = 'map-overlay';
            overlay.innerHTML = 'Карта';
            document.querySelector('.precipitation-map').appendChild(overlay);

            const mapLoading = document.querySelector('.map-loading');
            if (mapLoading) mapLoading.style.display = 'none';

            getUserLocation();
        });
    } catch (error) {
        console.error('Ошибка инициализации карты:', error);
        showNotification('Ошибка загрузки карты');
    }
}

function updateMapLocation(lat, lon) {
    if (map) {
        map.setCenter([lat, lon], 13);
        if (userPlacemark) {
            userPlacemark.geometry.setCoordinates([lat, lon]);
        }
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                console.log('Геолокация успешна:', lat, lng);
                getWeatherByCoords(lat, lng);

                if (map) {
                    if (userPlacemark) {
                        map.geoObjects.remove(userPlacemark);
                    }

                    userPlacemark = new ymaps.Placemark([lat, lng], {
                        balloonContent: 'Ваше местоположение'
                    }, {
                        preset: 'islands#blueCircleDotIcon',
                        draggable: false
                    });

                    map.geoObjects.add(userPlacemark);
                }
            },
            error => {
                console.log('Ошибка геолокации:', error);

                let errorMessage = 'Геолокация недоступна';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Доступ к геолокации запрещен. Разрешите доступ в настройках браузера.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Информация о местоположении недоступна.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Время ожидания геолокации истекло.';
                        break;
                }

                const fallbackLat = 59.9343;
                const fallbackLng = 30.3351;
                console.log('Используем fallback координаты:', fallbackLat, fallbackLng);
                getWeatherByCoords(fallbackLat, fallbackLng);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 600000
            }
        );
    } else {
        console.log('Геолокация не поддерживается браузером');
        showNotification('Ваш браузер не поддерживает геолокацию');

        const fallbackLat = 59.9343;
        const fallbackLng = 30.3351;
        getWeatherByCoords(fallbackLat, fallbackLng);
    }
}

// ========== ФУНКЦИИ ДЛЯ АВТОДОПОЛНЕНИЯ ==========
function showSuggestions(query) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!suggestionsContainer) return;

    suggestionsContainer.innerHTML = '';

    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    const filteredCities = cityDatabase.filter(city => 
        city.name.toLowerCase().includes(query.toLowerCase()) ||
        city.region.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredCities.length === 0) {
        suggestionsContainer.style.display = 'none';
        return;
    }

    filteredCities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.innerHTML = `
            <div class="suggestion-name">${city.name}</div>
            <div class="suggestion-details">${city.region}${city.distance ? ` • ${city.distance}` : ''}</div>
        `;
        item.addEventListener('click', () => {
            const searchInput = document.getElementById('city-search');
            if (searchInput) searchInput.value = city.name;
            suggestionsContainer.style.display = 'none';
            getWeatherByCity(city.name);
        });
        suggestionsContainer.appendChild(item);
    });

    suggestionsContainer.style.display = 'block';
}

// ========== ФУНКЦИИ ДЛЯ ИНФОРМАЦИИ О РАЗРАБОТЧИКЕ ==========
function initDeveloperInfo() {
    const developerBtn = document.getElementById('developer-info-btn');
    const developerOverlay = document.getElementById('developer-info-overlay');
    const closeDeveloperBtn = document.getElementById('close-developer-info');
    const avatarUpload = document.getElementById('avatar-upload');
    const avatarImage = document.getElementById('developer-avatar');
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    const colorOptions = document.querySelectorAll('.color-option');
    const developerPanel = document.querySelector('.developer-panel');

    if (!developerBtn || !developerOverlay || !closeDeveloperBtn) return;

    // Загружаем сохраненные настройки
    loadDeveloperSettings();

    // Открытие панели разработчика
    developerBtn.addEventListener('click', function() {
        developerOverlay.style.display = 'flex';
        document.body.classList.add('settings-open');
    });

    // Закрытие панели разработчика
    closeDeveloperBtn.addEventListener('click', function() {
        closeDeveloperInfo();
    });

    developerOverlay.addEventListener('click', function(e) {
        if (e.target === developerOverlay) {
            closeDeveloperInfo();
        }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && developerOverlay.style.display === 'flex') {
            closeDeveloperInfo();
        }
    });

    // Загрузка аватарки
    if (avatarUpload && avatarImage) {
        avatarUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarImage.src = e.target.result;
                    avatarImage.style.display = 'block';
                    avatarPlaceholder.style.display = 'none';
                    
                    // Сохраняем в localStorage
                    localStorage.setItem('developerAvatar', e.target.result);
                    showNotification('Аватарка успешно загружена!');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Смена цветовой схемы
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            
            // Убираем активный класс у всех
            colorOptions.forEach(opt => opt.classList.remove('active'));
            // Добавляем активный класс выбранному
            this.classList.add('active');
            
            // Применяем тему
            applyDeveloperTheme(color);
            
            // Сохраняем выбор
            localStorage.setItem('developerTheme', color);
        });
    });

    function closeDeveloperInfo() {
        developerOverlay.style.display = 'none';
        document.body.classList.remove('settings-open');
    }
}

function loadDeveloperSettings() {
    // Загружаем аватарку
    const savedAvatar = localStorage.getItem('developerAvatar');
    const avatarImage = document.getElementById('developer-avatar');
    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
    
    if (savedAvatar && avatarImage) {
        avatarImage.src = savedAvatar;
        avatarImage.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    }
    
    // Загружаем цветовую тему
    const savedTheme = localStorage.getItem('developerTheme') || 'blue';
    applyDeveloperTheme(savedTheme);
    
    // Активируем соответствующую кнопку
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        if (option.getAttribute('data-color') === savedTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

function applyDeveloperTheme(color) {
    const developerPanel = document.querySelector('.developer-panel');
    if (!developerPanel) return;
    
    // Убираем все темы
    developerPanel.classList.remove('blue-theme', 'purple-theme', 'green-theme', 'orange-theme');
    
    // Добавляем выбранную тему
    developerPanel.classList.add(`${color}-theme`);
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Показываем экран загрузки сразу
    showLoadingScreen();

    // Загружаем настройки
    loadSettings();

    // Инициализируем компоненты
    initMap();
    initTipCarousel();
    initAirQualityHint();
    initDeveloperInfo();

    // Обработчики для поиска
    const citySearch = document.getElementById('city-search');
    if (citySearch) {
        citySearch.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });

        citySearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const city = e.target.value.trim();
                if (city) {
                    getWeatherByCity(city);
                }
            }
        });
    }

    // Закрываем подсказки при клике вне поиска
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            const suggestionsContainer = document.getElementById('search-suggestions');
            if (suggestionsContainer) suggestionsContainer.style.display = 'none';
        }
    });

    // Обработчики для кнопок
    const locateBtn = document.getElementById('locate-btn');
    if (locateBtn) {
        locateBtn.addEventListener('click', getUserLocation);
    }

    // Настройки
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const unitsBtn = document.getElementById('units-btn');
    const unitsDropdown = document.getElementById('units-dropdown');
    const themeOptions = document.querySelectorAll('.theme-option');

    if (settingsBtn && settingsOverlay) {
        settingsBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'flex';
            document.body.classList.add('settings-open');
        });

        settingsOverlay.addEventListener('click', (e) => {
            if (e.target === settingsOverlay) {
                settingsOverlay.style.display = 'none';
                document.body.classList.remove('settings-open');
            }
        });
    }

    if (unitsBtn && unitsDropdown) {
        unitsBtn.addEventListener('click', () => {
            unitsDropdown.style.display = unitsDropdown.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Обработчики выбора единиц измерения
    document.querySelectorAll('#units-dropdown .selector-option').forEach(option => {
        option.addEventListener('click', () => {
            currentUnits = option.getAttribute('data-units');
            const currentUnitsElement = document.getElementById('current-units');
            if (currentUnitsElement) {
                currentUnitsElement.textContent = option.textContent;
            }
            if (unitsDropdown) unitsDropdown.style.display = 'none';
            saveSettings();
            updateAllTemperatures();
        });
    });

    // Обработчики тем
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            currentTheme = option.getAttribute('data-theme');

            if (currentTheme === 'light') {
                document.body.style.background = 'linear-gradient(135deg, #87CEEB, #E0F7FA)';
                document.body.style.color = '#333';
            } else if (currentTheme === 'dark') {
                document.body.style.background = 'linear-gradient(135deg, #2C3E50, #34495E)';
                document.body.style.color = '#FFFFFF';
            } else {
                document.body.style.background = '';
                document.body.style.color = '';
            }

            saveSettings();
        });
    });

    // Обработчики для избранного
    const favoriteBtn = document.getElementById('favorite-btn');
    const closeFavoritesBtn = document.getElementById('close-favorites');
    const favoritesOverlay = document.getElementById('favorites-overlay');
    const favoritesListBtn = document.getElementById('favorites-list-btn');

    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', toggleFavorite);
        favoriteBtn.addEventListener('dblclick', (e) => {
            e.preventDefault();
            showFavoritesPanel();
        });
    }

    if (favoritesListBtn) {
        favoritesListBtn.addEventListener('click', showFavoritesPanel);
    }

    if (closeFavoritesBtn && favoritesOverlay) {
        closeFavoritesBtn.addEventListener('click', closeFavoritesPanel);
        favoritesOverlay.addEventListener('click', (e) => {
            if (e.target === favoritesOverlay) {
                closeFavoritesPanel();
            }
        });
    }

        document.addEventListener('click', function(e) {
        if (e.target.closest('#services-normal')) {
            showServicesDetails();
        }
        
        if (e.target.closest('#services-details button')) {
            hideServicesDetails();
        }
    });
    

});

// Кастомная кнопка установки PWA
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');

// Показываем кастомную кнопку когда можно установить
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  setTimeout(() => {
    if (deferredPrompt && !isAppInstalled()) {
      installPrompt.style.display = 'block';
    }
  }, 3000);
});

// Обработчик установки
if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('Пользователь установил приложение');
        installPrompt.style.display = 'none';
      }


      deferredPrompt = null;
    });
    // В конце файла, в обработчике PWA
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    setTimeout(() => {
        if (deferredPrompt && !isAppInstalled()) {
            const installPrompt = document.getElementById('install-prompt');
            if (installPrompt) {
                installPrompt.style.animation = 'none';
                requestAnimationFrame(() => {
                    installPrompt.style.display = 'block';
                    installPrompt.style.animation = 'slideUpBounce 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                });
            }
        }
    }, 3000);
});
}

// Закрытие кнопки
if (installClose) {
    installClose.addEventListener('click', () => {
      installPrompt.style.display = 'none';
      localStorage.setItem('installPromptClosed', 'true');
    });
}

// Проверка установлено ли уже приложение
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

// Проверяем не закрывал ли пользователь кнопку ранее
if (installPrompt && localStorage.getItem('installPromptClosed') === 'true') {
  installPrompt.style.display = 'none';
}

// Скрываем кнопку если приложение уже установлено
if (installPrompt && isAppInstalled()) {
  installPrompt.style.display = 'none';
}

// Добавляем стили для расширенного прогноза
const extendedForecastStyles = `
.air-quality-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
}

.pollutant-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 13px;
}

.pollutant-item:last-child {
    border-bottom: none;
}

.pollutant-level {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 600;
}

.level-good { background: #4CAF50; color: white; }
.level-moderate { background: #FFEB3B; color: #333; }
.level-unhealthy-sensitive { background: #FF9800; color: white; }
.level-unhealthy { background: #F44336; color: white; }
.level-very-unhealthy { background: #9C27B0; color: white; }
.level-hazardous { background: #795548; color: white; }

/* Стили для плиток рассвета и заката */
.sun-event-card {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2)) !important;
    border: 1px solid rgba(255, 215, 0, 0.4) !important;
}

.sun-event-card .sun-mini-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    position: relative;
    margin: 0 auto 8px auto;
}

.sun-event-card .sunrise-icon {
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
}

.sun-event-card .sunset-icon {
    background: linear-gradient(135deg, #ff6b6b, #ff8c00, #ff4757);
    box-shadow: 0 0 10px rgba(255, 107, 107, 0.7);
}

.sun-event-card .sun-mini-icon::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    border-radius: 50%;
}

.sun-event-card .sunrise-icon::after {
    background: #ffeb3b;
    box-shadow: 0 0 8px rgba(255, 235, 59, 0.8);
}

.sun-event-card .sunset-icon::after {
    background: #ff7f50;
    box-shadow: 0 0 8px rgba(255, 127, 80, 0.8);
}

/* Стили для исторических данных */
.history-card {
    background: var(--card-bg) !important;
    border: 1px solid var(--card-border) !important;
    opacity: 0.7;
}

.history-card .hour-time {
    opacity: 0.7;
}

.history-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(128, 128, 128, 0.7);
    color: white;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: 600;
}

/* Стили для текущего времени - такой же цвет как у других плиток */
.current-card {
    background: var(--card-bg) !important;
    border: 2px solid rgba(255, 255, 255, 0.5) !important;
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
    position: relative;
}

.current-card::before {
    content: 'СЕЙЧАС';
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
    z-index: 2;
}

.current-card .hour-time {
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
}

/* Стили для прогноза */
.forecast-card {
    background: var(--card-bg) !important;
    border: 1px solid var(--card-border) !important;
}

/* Ограничиваем количество карточек до 8 */
.hours-container .hour-card:nth-child(n+9) {
    display: none !important;
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
    .sun-event-card .sun-mini-icon {
        width: 25px;
        height: 25px;
    }
    
    .sun-event-card .sun-mini-icon::after {
        width: 16px;
        height: 16px;
    }
    
    .history-badge {
        font-size: 8px;
        padding: 1px 4px;
    }
    
    .current-card::before {
        font-size: 9px;
        padding: 1px 6px;
        top: -6px;
    }
}

@media (max-width: 480px) {
    .sun-event-card .sun-mini-icon {
        width: 22px;
        height: 22px;
    }
    
    .sun-event-card .sun-mini-icon::after {
        width: 14px;
        height: 14px;
    }
    
    .history-badge {
        font-size: 7px;
        padding: 1px 3px;
    }
    
    .current-card::before {
        font-size: 8px;
        padding: 1px 4px;
        top: -5px;
    }
}

/* Улучшенная прокрутка для часового прогноза */
.hours-container {
    scroll-behavior: smooth;
    scroll-padding: 0 20px;
}

.hour-card {
    transition: all 0.3s ease;
    position: relative;
}

.hour-card:hover {
    transform: translateY(-2px);
}
`;

// Добавляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = extendedForecastStyles;
document.head.appendChild(styleSheet);


// ========== СЕРВИСЫ (Внешние API) ==========
function showServicesDetails() {
    const normal = document.getElementById('services-normal');
    const details = document.getElementById('services-details');
    if (normal && details) {
        normal.style.display = 'none';
        details.style.display = 'block';
    }
}

function hideServicesDetails() {
    const normal = document.getElementById('services-normal');
    const details = document.getElementById('services-details');
    if (normal && details) {
        normal.style.display = 'block';
        details.style.display = 'none';
    }
}

// ========== АДМИН РЕЖИМ ==========
let adminMode = false;
let adminLoginTime = null;
let siteEnabled = localStorage.getItem('siteEnabled') !== 'false';

// ========== СИСТЕМА ВЫКЛЮЧЕНИЯ САЙТА ==========
function checkSiteStatus() {
    if (!siteEnabled) {
        showSiteDisabledScreen();
        return false;
    }
    return true;
}

function showSiteDisabledScreen() {
    document.body.innerHTML = '';
    document.body.style.cssText = `
        margin: 0;
        padding: 0;
        background: linear-gradient(135deg, #ff6b6b, #ee5a52);
        color: white;
        font-family: 'Segoe UI', sans-serif;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;
    `;
    
    const hour = new Date().getHours();
    let greeting;
    if (hour >= 5 && hour < 12) greeting = 'Доброе утро!';
    else if (hour >= 12 && hour < 18) greeting = 'Добрый день!';
    else if (hour >= 18 && hour < 23) greeting = 'Добрый вечер!';
    else greeting = 'Доброй ночи!';

    const container = document.createElement('div');
    container.style.cssText = `
        max-width: 500px;
        padding: 40px;
    `;
    
    container.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🔧</div>
        <h1 style="font-size: 32px; margin-bottom: 10px;">Weather Overcast</h1>
        <div style="font-size: 24px; margin-bottom: 10px; opacity: 0.9;">${greeting}</div>
        <div style="font-size: 20px; margin-bottom: 30px;">Сайт отключен</div>
        <div style="font-size: 18px; margin-bottom: 40px; line-height: 1.5;">
            Сайт временно отключен для технического обслуживания.<br>
            Мы работаем над улучшением сервиса и скоро вернемся!
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; font-size: 14px;">
            💻 Для восстановления откройте консоль (F12) и введите:<br>
            <code style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 5px; font-size: 16px; margin-top: 10px; display: inline-block;">
                rebot_site()
            </code>
        </div>
    `;
    
    document.body.appendChild(container);
}

// ========== ОСНОВНЫЕ АДМИН КОМАНДЫ ==========
function admin() {
    if (adminMode) {
        console.log('%c⚠️ Админ-режим уже активирован!', 'color: #FFA500; font-size: 14px;');
        return;
    }
    
    adminMode = true;
    adminLoginTime = new Date();
    
    // Красивое лого W
    console.log(`%c
    ██╗    ██╗███████╗███████╗████████╗██╗  ██╗███████╗██████╗ 
    ██║    ██║██╔════╝██╔════╝╚══██╔══╝██║  ██║██╔════╝██╔══██╗
    ██║ █╗ ██║█████╗  █████╗     ██║   ███████║█████╗  ██████╔╝
    ██║███╗██║██╔══╝  ██╔══╝     ██║   ██╔══██║██╔══╝  ██╔══██╗
    ╚███╔███╔╝███████╗███████╗   ██║   ██║  ██║███████╗██║  ██║
     ╚══╝╚══╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
    `, 'color: #5D8AA8; font-size: 10px;');
    
    // Приветствие по времени суток
    const hour = new Date().getHours();
    let greeting;
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Доброе утро! ☀️';
    } else if (hour >= 12 && hour < 18) {
        greeting = 'Добрый день! 🌤️';
    } else if (hour >= 18 && hour < 23) {
        greeting = 'Добрый вечер! 🌙';
    } else {
        greeting = 'Доброй ночи! 🌌';
    }
    
    console.log(`%c${greeting}`, 'color: #87CEEB; font-size: 16px; font-weight: bold;');
    
    // Информация о входе
    console.log(`%c🕐 Вход выполнен: ${adminLoginTime.toLocaleString('ru-RU')}`, 'color: #34C759; font-size: 12px;');
    console.log(`%c🔧 Админ-режим активирован`, 'color: #FF9500; font-size: 12px;');
    
    // Список команд
    console.log(`%c
Доступные команды:
%cadmin_help()%c - Показать это сообщение
%cadmin_time()%c - Текущее время и uptime
%cadmin_stats()%c - Статистика приложения
%cdrop_site()%c - 💀 ВЫРУБИТЬ сайт на всех устройствах
%crebot_site()%c - ✅ ВОССТАНОВИТЬ сайт
%cadmin_theme(theme)%c - Сменить тему (light/dark/dynamic)
%cadmin_notify(message)%c - Показать уведомление
%cadmin_clear()%c - Очистить localStorage
%cadmin_exit()%c - Выйти из админ-режима
    `.trim(), 
    'color: #FFFFFF; font-size: 12px;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FF453A;', 'color: #FFFFFF;',
    'color: #32D74B;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;',
    'color: #FFD60A;', 'color: #FFFFFF;'
    );
    
    // Показываем уведомление
    iosNotifications.success('Админ-режим', 'Режим разработчика активирован', 3000);
}

function admin_help() {
    if (!checkAdminMode()) return;
    
    console.log(`%c
📖 Справка по админ-командам:

%cОсновные команды:
%cadmin_help()%c - Эта справка
%cadmin_time()%c - Время и uptime
%cadmin_stats()%c - Статистика приложения

%cГЛОБАЛЬНОЕ УПРАВЛЕНИЕ (ОПАСНО!):
%cdrop_site()%c - 💀 ВЫРУБИТЬ сайт на ВСЕХ устройствах
%crebot_site()%c - ✅ ВОССТАНОВИТЬ сайт глобально  
%csite_status()%c - 🌐 Статус сайта

%cУправление темой:
%cadmin_theme('light')%c - Светлая тема
%cadmin_theme('dark')%c - Тёмная тема  
%cadmin_theme('dynamic')%c - Динамическая тема

%cУтилиты:
%cadmin_notify('Текст')%c - Тестовое уведомление
%cadmin_clear()%c - Очистка данных
%cadmin_exit()%c - Выход из режима
%cforce_refresh()%c - 🔄 Принудительное обновление
%ctest_connection()%c - 🧪 Тест соединения

%cОтладочные команды:
%csimulateError()%c - Имитация ошибки
%cdebugInfo()%c - Отладочная информация
    `.trim(),
    'color: #FFFFFF; font-size: 12px;',
    'color: #FFD60A; font-size: 11px;',
    'color: #32D74B;', 'color: #FFFFFF; font-size: 11px;',
    'color: #32D74B;', 'color: #FFFFFF; font-size: 11px;', 
    'color: #32D74B;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FF453A; font-size: 11px; font-weight: bold;',
    'color: #FF453A;', 'color: #FFFFFF; font-size: 11px;',
    'color: #32D74B;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FFD60A;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FFD60A; font-size: 11px;',
    'color: #FF453A;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FF453A;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FF453A;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FFD60A; font-size: 11px;',
    'color: #0A84FF;', 'color: #FFFFFF; font-size: 11px;',
    'color: #0A84FF;', 'color: #FFFFFF; font-size: 11px;',
    'color: #0A84FF;', 'color: #FFFFFF; font-size: 11px;',
    'color: #0A84FF;', 'color: #FFFFFF; font-size: 11px;',
    'color: #0A84FF;', 'color: #FFFFFF; font-size: 11px;',
    'color: #FFD60A; font-size: 11px;',
    'color: #BF5AF2;', 'color: #FFFFFF; font-size: 11px;',
    'color: #BF5AF2;', 'color: #FFFFFF; font-size: 11px;'
    );
}

function admin_time() {
    if (!checkAdminMode()) return;
    
    const now = new Date();
    const uptime = adminLoginTime ? Math.round((now - adminLoginTime) / 1000) : 0;
    
    console.log(`%c⏰ Время системы:`, 'color: #FFD60A; font-size: 14px;');
    console.log(`%c   Текущее: ${now.toLocaleString('ru-RU')}`, 'color: #FFFFFF;');
    console.log(`%c   Uptime: ${uptime} секунд`, 'color: #32D74B;');
    console.log(`%c   Вход в админ: ${adminLoginTime.toLocaleString('ru-RU')}`, 'color: #0A84FF;');
}

function admin_stats() {
    if (!checkAdminMode()) return;
    
    const favoritesCount = favorites.length;
    const storageUsage = JSON.stringify(localStorage).length;
    const theme = currentTheme;
    const units = currentUnits;
    
    console.log(`%c📊 Статистика приложения:`, 'color: #FFD60A; font-size: 14px;');
    console.log(`%c   Избранные города: ${favoritesCount}`, 'color: #32D74B;');
    console.log(`%c   Размер localStorage: ${storageUsage} байт`, 'color: #0A84FF;');
    console.log(`%c   Текущая тема: ${theme}`, 'color: #FF453A;');
    console.log(`%c   Единицы измерения: ${units}`, 'color: #BF5AF2;');
    console.log(`%c   Текущий город: ${currentCity || 'Не выбран'}`, 'color: #FF9F0A;');
}

function admin_theme(theme) {
    if (!checkAdminMode()) return;
    
    const validThemes = ['light', 'dark', 'dynamic'];
    if (!validThemes.includes(theme)) {
        console.log(`%c❌ Неверная тема. Доступные: ${validThemes.join(', ')}`, 'color: #FF453A;');
        return;
    }
    
    updateTheme(theme);
    saveSettings();
    console.log(`%c✅ Тема изменена на: ${theme}`, 'color: #32D74B;');
    iosNotifications.success('Админ', `Тема изменена на ${theme}`, 2000);
}

function admin_notify(message = 'Тестовое уведомление из админ-режима') {
    if (!checkAdminMode()) return;
    
    iosNotifications.info('Админ-уведомление', message, 3000);
    console.log(`%c📢 Уведомление отправлено: "${message}"`, 'color: #0A84FF;');
}

function admin_clear() {
    if (!checkAdminMode()) return;
    
    if (confirm('Очистить все данные приложения?')) {
        localStorage.clear();
        location.reload();
    }
}

function admin_exit() {
    if (!adminMode) {
        console.log(`%c⚠️ Админ-режим не активирован`, 'color: #FFA500;');
        return;
    }
    
    const sessionTime = Math.round((new Date() - adminLoginTime) / 1000);
    adminMode = false;
    adminLoginTime = null;
    
    console.log(`%c👋 Выход из админ-режима`, 'color: #FF453A; font-size: 14px;');
    console.log(`%c   Сессия длилась: ${sessionTime} секунд`, 'color: #FFA500;');
    
    iosNotifications.info('Админ-режим', 'Режим разработчика деактивирован', 2000);
}

// ========== ГЛОБАЛЬНОЕ УПРАВЛЕНИЕ САЙТОМ ==========
function drop_site() {
    if (!checkAdminMode()) return;
    
    console.log(`%c
    ██████╗ ██████╗  ██████╗ ██████╗     ███████╗██╗████████╗███████╗
    ██╔══██╗██╔══██╗██╔═══██╗██╔══██╗    ██╔════╝██║╚══██╔══╝██╔════╝
    ██║  ██║██████╔╝██║   ██║██████╔╝    █████╗  ██║   ██║   █████╗  
    ██║  ██║██╔══██╗██║   ██║██╔═══╝     ██╔══╝  ██║   ██║   ██╔══╝  
    ██████╔╝██║  ██║╚██████╔╝██║         ██║     ██║   ██║   ███████╗
    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝         ╚═╝     ╚═╝   ╚═╝   ╚══════╝
    `, 'color: #FF453A; font-size: 8px;');
    
    localStorage.setItem('siteEnabled', 'false');
    localStorage.setItem('siteDisabledTime', new Date().toISOString());
    siteEnabled = false;
    
    console.log(`%c💀 САЙТ ВЫРУБЛЕН НА ВСЕХ УСТРОЙСТВАХ!`, 'color: #FF453A; font-size: 18px; font-weight: bold;');
    console.log(`%c⏰ Время отключения: ${new Date().toLocaleString('ru-RU')}`, 'color: #FFA500;');
    console.log(`%c🔧 Для восстановления введите: %crebot_site()%c`, 
        'color: #FFFFFF;', 'color: #32D74B; font-weight: bold;', 'color: #FFFFFF;');
    
    setTimeout(() => {
        showSiteDisabledScreen();
    }, 1000);
}

function rebot_site() {
    console.log(`%c
    ██████╗ ███████╗██████╗  ██████╗ ████████╗    ███████╗██╗████████╗███████╗
    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗╚══██╔══╝    ██╔════╝██║╚══██╔══╝██╔════╝
    ██████╔╝█████╗  ██████╔╝██║   ██║   ██║       █████╗  ██║   ██║   █████╗  
    ██╔══██╗██╔══╝  ██╔══██╗██║   ██║   ██║       ██╔══╝  ██║   ██║   ██╔══╝  
    ██║  ██║███████╗██████╔╝╚██████╔╝   ██║       ██║     ██║   ██║   ███████╗
    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝    ╚═╝       ╚═╝     ╚═╝   ╚═╝   ╚══════╝
    `, 'color: #32D74B; font-size: 8px;');
    
    localStorage.setItem('siteEnabled', 'true');
    localStorage.setItem('siteRestoredTime', new Date().toISOString());
    siteEnabled = true;
    
    console.log(`%c✅ САЙТ ВОССТАНОВЛЕН!`, 'color: #32D74B; font-size: 18px; font-weight: bold;');
    console.log(`%c⏰ Время восстановления: ${new Date().toLocaleString('ru-RU')}`, 'color: #32D74B;');
    
    const disabledTime = localStorage.getItem('siteDisabledTime');
    if (disabledTime) {
        const downtime = Math.round((new Date() - new Date(disabledTime)) / 1000);
        console.log(`%c📊 Сайт был выключен: ${downtime} секунд`, 'color: #FFD60A;');
    }
    
    console.log(`%c🔄 Перезагрузка через 2 секунды...`, 'color: #0A84FF;');
    setTimeout(() => {
        location.reload();
    }, 2000);
}

function site_status() {
    if (!checkAdminMode()) return;
    
    const enabled = localStorage.getItem('siteEnabled') !== 'false';
    const disabledTime = localStorage.getItem('siteDisabledTime');
    
    console.log(`%c🌐 Статус сайта:`, 'color: #FFD60A; font-size: 16px;');
    console.log(`%c   Состояние: ${enabled ? '✅ ВКЛЮЧЕН' : '❌ ВЫКЛЮЧЕН'}`, 
                `color: ${enabled ? '#32D74B' : '#FF453A'}; font-weight: bold;`);
    
    if (!enabled && disabledTime) {
        const downtime = Math.round((new Date() - new Date(disabledTime)) / 1000);
        console.log(`%c   Отключен: ${new Date(disabledTime).toLocaleString('ru-RU')}`, 'color: #FFA500;');
        console.log(`%c   Простой: ${downtime} секунд`, 'color: #FFA500;');
    }
}

// ========== УТИЛИТЫ И ОТЛАДКА ==========
function force_refresh() {
    if (!checkAdminMode()) return;
    
    console.log(`%c🔄 Принудительное обновление данных...`, 'color: #0A84FF;');
    
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => {
                console.log(`🗑️ Удаляем кэш: ${name}`);
                caches.delete(name);
            });
        });
    }
    
    sessionStorage.clear();
    console.log('🗑️ Очищен sessionStorage');
    
    iosNotifications.info('Обновление', 'Очистка кэша и обновление данных', 2000);
    
    setTimeout(() => {
        if (userPlacemark) {
            const coords = userPlacemark.geometry.getCoordinates();
            console.log(`📍 Обновляем данные для координат: ${coords[0]}, ${coords[1]}`);
            getWeatherByCoords(coords[0], coords[1]);
        } else if (currentCity) {
            console.log(`🏙️ Обновляем данные для города: ${currentCity}`);
            getWeatherByCity(currentCity);
        } else {
            console.log('🎯 Обновляем данные по геолокации');
            getUserLocation();
        }
    }, 1000);
}

function test_connection() {
    if (!checkAdminMode()) return;
    
    console.log(`%c🧪 Тестирование соединения...`, 'color: #FFD60A;');
    
    console.log(`%c📡 Online: ${navigator.onLine}`, 'color: #32D74B;');
    console.log(`%c🌐 User Agent: ${navigator.userAgent}`, 'color: #0A84FF;');
    
    const testUrls = [
        'https://api.openweathermap.org/data/2.5/weather?q=London&appid=demo',
        'https://api.openweathermap.org/data/2.5/forecast?q=London&appid=demo'
    ];
    
    testUrls.forEach(url => {
        fetch(url, { method: 'HEAD' })
            .then(response => {
                console.log(`%c✅ ${url} - Доступен (${response.status})`, 'color: #32D74B;');
            })
            .catch(error => {
                console.log(`%c❌ ${url} - Недоступен: ${error.message}`, 'color: #FF453A;');
            });
    });
    
    iosNotifications.info('Тест связи', 'Проверка соединения с API', 3000);
}

function simulateError() {
    if (!checkAdminMode()) return;
    
    try {
        throw new Error('Тестовая ошибка из админ-режима');
    } catch (error) {
        console.error(`%c🔧 Имитация ошибки:`, 'color: #FF453A;', error);
        iosNotifications.error('Тест ошибки', 'Имитация ошибки выполнена', 3000);
    }
}

function debugInfo() {
    if (!checkAdminMode()) return;
    
    console.log(`%c🐛 Отладочная информация:`, 'color: #FFD60A; font-size: 14px;');
    console.log(`%c   User Agent: ${navigator.userAgent}`, 'color: #FFFFFF; font-size: 11px;');
    console.log(`%c   Online: ${navigator.onLine}`, 'color: #32D74B;');
    console.log(`%c   Screen: ${screen.width}x${screen.height}`, 'color: #0A84FF;');
    console.log(`%c   Viewport: ${window.innerWidth}x${window.innerHeight}`, 'color: #BF5AF2;');
    console.log(`%c   Cookies: ${navigator.cookieEnabled}`, 'color: #FF9F0A;');
    console.log(`%c   JavaScript: enabled`, 'color: #FF453A;');
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function checkAdminMode() {
    if (!adminMode) {
        console.log(`%c❌ Админ-режим не активирован! Введите %cadmin()%c для доступа.`, 
            'color: #FF453A;', 'color: #FFD60A;', 'color: #FF453A;');
        return false;
    }
    return true;
}

// Автоматически предлагаем админ-режим при ошибках
window.addEventListener('error', function(event) {
    if (!adminMode) {
        console.log(`%c🚨 Обнаружена ошибка! Введите %cadmin()%c для отладки.`, 
            'color: #FF453A;', 'color: #FFD60A;', 'color: #FF453A;');
    }
});