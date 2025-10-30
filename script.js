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
let forecastData = null;
let airQualityData = null;
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
    "Радуга появляется, когда солнечный свет преломляется в каплях воды под определенным углом.",
    "Арбузный снег в горах пахнет свежим арбузом из-за водорослей, содержащих красный пигмент.",
    "В Бразилии бывают 'лысые грозы' - молнии без грома из-за особых атмосферных условий.",
    "Некоторые животные могут предсказывать землетрясения, чувствуя изменения в атмосферном давлении.",
    "В пустыне Атакама есть места, где дождь не выпадал более 400 лет.",
    "Снежинки всегда имеют шестиугольную форму из-за молекулярной структуры воды.",
    "Гром можно услышать на расстоянии до 25 км, а молнию - до 100 км.",
    "В Сахаре ночью температура может опускаться ниже нуля, несмотря на дневную жару.",
    "Каждую секунду в мире происходит около 100 ударов молний.",
    "Вода в облаках может оставаться жидкой даже при температуре -40°C.",
    "Самый длинный период непрерывного дождя длился 247 дней на Гавайях.",
    "Ветер может переносить пыль из Сахары через Атлантический океан в Америку.",
    "Некоторые виды пауков используют электрические поля для полёта на паутине.",
    "В Исландии есть горячие источники, которые не замерзают даже при -30°C.",
    "Один кучево-дождевой облак содержит столько воды, сколько вмещает 100 олимпийских бассейнов.",
    "В Японии существуют 'снежные монстры' - деревья, покрытые толстым слоем инея.",
    "Некоторые птицы могут спать во время полёта, используя восходящие потоки воздуха.",
    "В Австралии есть 'утренняя глория' - редкое облачное образование длиной до 1000 км.",
    "Луна влияет не только на приливы, но и на атмосферное давление.",
    "В некоторых пустынях роса - основной источник воды для растений и животных.",
    "Самый большой снеговик был высотой с 10-этажный дом и весил 6000 тонн.",
    "В Ботсване есть река, которая течет только раз в несколько лет после сильных дождей.",
    "Некоторые грибы могут создавать собственные воздушные потоки для распространения спор.",
    "В Норвегии есть город, где солнце не заходит с мая по июль.",
    "Падающие звезды - это не звезды, а метеоры, сгорающие в атмосфере Земли.",
    "В одном литре воздуха содержится около 25 секстиллионов молекул.",
    "Некоторые кактусы могут накапливать до 3000 литров воды.",
    "В России есть места, где температура опускалась до -71.2°C (Оймякон).",
    "Морская вода замерзает при -2°C из-за содержания соли.",
    "Самый большой айсберг был размером с Ямайку и весил 3 триллиона тонн."
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
    
    // КОРРЕКТИРОВКА: Используем текущее время без изменений
    // Фаза луны должна обновляться в реальном времени
    const calculationTime = currentTime;
    
    // Лунный цикл в миллисекундах (29.53 дня)
    const lunarCycleMs = 29.53 * 24 * 60 * 60 * 1000;
    
    // Возраст луны в днях (0-29.53)
    let moonAgeDays = ((calculationTime - knownNewMoon) % lunarCycleMs) / (24 * 60 * 60 * 1000);
    
    // Обеспечиваем положительное значение возраста
    if (moonAgeDays < 0) {
        moonAgeDays += 29.53;
    }
    
    // Фаза луны (0-1)
    const phase = moonAgeDays / 29.53;
    
    console.log('Локальный расчет луны:', { 
        currentTime: new Date(currentTime), 
        moonAgeDays: moonAgeDays.toFixed(2), 
        phase: phase.toFixed(3)
    });
    
    return formatMoonPhase(phase);
}

function formatMoonPhase(phase) {
    console.log('Phase from calculation:', phase.toFixed(3));
    
    let phaseName, phasePercent, isWaning;
    const age = Math.floor(phase * 29.53);

    if (phase < 0.02 || phase > 0.98) {
        phaseName = 'Новолуние';
        phasePercent = 0;
        isWaning = false;
    } else if (phase < 0.25) {
        phaseName = 'Молодая луна';
        phasePercent = Math.round(phase * 4 * 25);
        isWaning = false;
    } else if (phase < 0.27) {
        phaseName = 'Первая четверть';
        phasePercent = 50;
        isWaning = false;
    } else if (phase < 0.5) {
        phaseName = 'Растущая луна';
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
    
    // Рассчитываем время до следующей фазы
    const daysToNext = getDaysToNext(phase);
    const nextPhase = getNextPhase(phaseName);
    const nextPhaseTime = formatDaysToTime(daysToNext);
    
    console.log('Calculated moon data:', { 
        age: age,
        phase: phaseName,
        illumination: illumination,
        daysToNext: daysToNext,
        nextPhaseTime: nextPhaseTime
    });
    
    return {
        phase: phaseName,
        illumination: illumination,
        age: age,
        phasePercent: phasePercent,
        isWaning: isWaning,
        nextPhase: nextPhase,
        daysToNext: daysToNext,
        nextPhaseTime: nextPhaseTime // Добавляем форматированное время
    };
}

// Новая функция для форматирования времени
function formatDaysToTime(days) {
    const totalHours = Math.round(days * 24);
    const daysPart = Math.floor(totalHours / 24);
    const hoursPart = totalHours % 24;
    
    if (daysPart === 0) {
        return `${hoursPart}ч`;
    } else if (hoursPart === 0) {
        return `${daysPart}д`;
    } else {
        return `${daysPart}д ${hoursPart}ч`;
    }
}

// Обновляем функцию getDaysToNext для большей точности
function getDaysToNext(phase) {
    const lunarCycle = 29.5305882;
    
    if (phase < 0.25) {
        return (0.25 - phase) * lunarCycle;
    } else if (phase < 0.5) {
        return (0.5 - phase) * lunarCycle;
    } else if (phase < 0.75) {
        return (0.75 - phase) * lunarCycle;
    } else {
        return (1 - phase) * lunarCycle;
    }
}

function getNextPhase(currentPhase) {
    const phases = ['Новолуние', 'Молодая луна', 'Первая четверть', 'Растущая луна', 'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна'];
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
    moonPhase.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    moonPhase.style.boxShadow = 'inset 0 0 15px rgba(241, 196, 15, 0.8), 0 0 30px rgba(241, 196, 15, 0.4)';

    if (phasePercent === 0) {
        moonPhase.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        moonPhase.style.clipPath = 'inset(0 0 0 0%)';
        // Яркое свечение для полной луны
        moonPhase.style.background = '#f39c12';
    } else {
        if (isWaning) {
            const visiblePercent = phasePercent;
            moonPhase.style.clipPath = `inset(0 ${100 - visiblePercent}% 0 0)`;
        } else {
            const visiblePercent = phasePercent;
            moonPhase.style.clipPath = `inset(0 0 0 ${100 - visiblePercent}%)`;
        }
        
        // Усиленное свечение для почти полной луны
        if (phasePercent > 80) {
            moonPhase.style.boxShadow = 'inset 0 0 20px rgba(241, 196, 15, 0.85), 0 0 40px rgba(241, 196, 15, 0.5), 0 0 60px rgba(241, 196, 15, 0.2)';
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
            document.getElementById('moon-illumination').textContent = info.isWaning ? 'Статус: Убывание' : 'Статус: Возрастание';
            document.getElementById('moon-age').textContent = `Возраст: ${info.age} дней`;
            document.getElementById('moon-next').textContent = `Следующая фаза: ${info.nextPhase}`;

            updateMoonVisualization(info.phasePercent, info.isWaning);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки данных о луне:', error);
        document.getElementById('moon-phase-text').textContent = 'Фаза: Данные недоступны';
        document.getElementById('moon-illumination').textContent = '—';
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
// ========== ДЕБАГ ЛУНЫ В КОНСОЛИ ==========
function moonDebug(phasePercent = null, isWaning = false) {
    if (phasePercent === null) {
        // Показать текущую фазу
        const moonInfo = calculateMoonInfo();
        moonInfo.then(info => {
            console.log('🌙 ТЕКУЩАЯ ФАЗА ЛУНЫ:');
            console.log(`Фаза: ${info.phase}`);
            console.log(`Процент фазы: ${info.phasePercent}%`);
            console.log(`Убывающая: ${info.isWaning}`);
            console.log(`Возраст: ${info.age} дней`);
            console.log('---');
            console.log('Используй moonDebug(percentage, isWaning) для тестирования');
            console.log('Пример: moonDebug(100, false) - полная луна');
            console.log('Пример: moonDebug(0, false) - новолуние');
            console.log('Пример: moonDebug(50, false) - первая четверть');
            console.log('Пример: moonDebug(50, true) - последняя четверть');
        });
    } else {
        // Установить тестовую фазу
        console.log(`🌙 УСТАНОВЛЕНА ТЕСТОВАЯ ФАЗА: ${phasePercent}%`);
        updateMoonVisualization(phasePercent, isWaning);
        
        // Обновляем текстовую информацию
        document.getElementById('moon-phase-text').textContent = `Фаза: Тестовая (${phasePercent}%)`;
        document.getElementById('moon-illumination').textContent = isWaning ? 'Статус: Убывание' : 'Статус: Возрастание';
        document.getElementById('moon-age').textContent = `Возраст: тест`;
        document.getElementById('moon-next').textContent = `Следующая фаза: тест`;
    }
}

// Дебаг-команды для быстрого доступа
window.moonTest = {
    newMoon: () => moonDebug(0, false),
    firstQuarter: () => moonDebug(50, false),
    fullMoon: () => moonDebug(100, false),
    lastQuarter: () => moonDebug(50, true),
    waxing: (percent) => moonDebug(percent, false),
    waning: (percent) => moonDebug(percent, true)
};

// Автоматически добавляем функцию в глобальную область видимости
window.moonDebug = moonDebug;

// Показываем подсказку при загрузке (только в development)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        console.log('🌙 Moon Debug loaded!');
        console.log('Используй moonDebug() для просмотра текущей фазы');
        console.log('Используй moonDebug(percentage, isWaning) для тестирования');
        console.log('Быстрые команды: moonTest.fullMoon(), moonTest.newMoon() и т.д.');
    }, 2000);
}
// Детальный дебаг всех фаз
function moonDebugAllPhases() {
    console.log('🌙 ВСЕ ФАЗЫ ЛУНЫ ДЛЯ ТЕСТИРОВАНИЯ:');
    
    const testPhases = [
        { percent: 0, name: 'Новолуние', waning: false },
        { percent: 25, name: 'Растущий серп', waning: false },
        { percent: 50, name: 'Первая четверть', waning: false },
        { percent: 75, name: 'Растущая луна', waning: false },
        { percent: 100, name: 'Полнолуние', waning: false },
        { percent: 75, name: 'Убывающая луна', waning: true },
        { percent: 50, name: 'Последняя четверть', waning: true },
        { percent: 25, name: 'Старый серп', waning: true }
    ];
    
    testPhases.forEach(phase => {
        console.log(`moonDebug(${phase.percent}, ${phase.waning}) - ${phase.name}`);
    });
}

window.moonDebugAllPhases = moonDebugAllPhases;

// ========== ПОЛНЫЙ ДЕБАГ В КОНСОЛИ ==========
window.weatherDebug = {
    // Основная информация
    info: function() {
        console.log('🌐 WEATHER OVERCAST - DEBUG INFO');
        console.log('================================');
        console.log(`📍 Current City: ${currentCity || 'Not set'}`);
        console.log(`🌡️ Units: ${currentUnits}`);
        console.log(`🎨 Theme: ${currentTheme}`);
        console.log(`⭐ Favorites: ${favorites.length} cities`);
        console.log(`🗺️ Map: ${map ? 'Loaded' : 'Not loaded'}`);
        console.log('---');
    },
    
    // API информация
    api: function() {
        console.log('📡 API DEBUG INFO');
        console.log('=================');
        console.log(`🔑 API Key: ${API_KEY ? 'Set' : 'Not set'}`);
        console.log(`🌐 Base URL: ${BASE_URL}`);
        console.log(`💨 Air Quality URL: ${AIR_POLLUTION_URL}`);
        console.log(`📍 Current City Data:`, currentCityData);
        console.log('---');
    },
    
    // Производительность
    performance: function() {
        console.log('⚡ PERFORMANCE DEBUG');
        console.log('====================');
        console.log(`🕒 Load Time: ${Math.round(performance.now())}ms`);
        console.log(`📊 Memory: ${performance.memory ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB used` : 'N/A'}`);
        console.log(`🔗 Connections: ${performance.getEntriesByType('navigation')[0]?.nextHopProtocol || 'N/A'}`);
        console.log('---');
    },
    
    // Локальное хранилище
    storage: function() {
        console.log('💾 STORAGE DEBUG');
        console.log('================');
        console.log('🎯 Favorites:', favorites);
        console.log('⚙️ Settings:', {
            units: localStorage.getItem('weatherUnits'),
            theme: localStorage.getItem('weatherTheme')
        });
        console.log('📱 All localStorage:', { ...localStorage });
        console.log('---');
    },
    
    // Системная информация
    system: function() {
        console.log('🖥️ SYSTEM DEBUG');
        console.log('===============');
        console.log(`🌐 Online: ${navigator.onLine}`);
        console.log(`📱 User Agent: ${navigator.userAgent}`);
        console.log(`💾 Cookies: ${navigator.cookieEnabled}`);
        console.log(`📍 Geolocation: ${navigator.geolocation ? 'Available' : 'Not available'}`);
        console.log(`📦 Storage: ${navigator.storage ? 'Available' : 'Not available'}`);
        console.log('---');
    },
    
    // Погодные данные
    weather: function() {
        console.log('🌤️ WEATHER DATA DEBUG');
        console.log('=====================');
        console.log('📍 Current Data:', currentCityData);
        console.log('📈 Forecast Data:', forecastData || 'Not loaded');
        console.log('💨 Air Quality:', airQualityData || 'Not loaded');
        console.log('---');
    },
    
    // Луна
    moon: function() {
        calculateMoonInfo().then(moonInfo => {
            console.log('🌙 MOON DEBUG');
            console.log('=============');
            console.log('📊 Moon Info:', moonInfo);
            console.log('🎛️ Quick Commands:');
            console.log('  weatherDebug.moonTest(0, false)    - New Moon');
            console.log('  weatherDebug.moonTest(50, false)   - First Quarter');
            console.log('  weatherDebug.moonTest(100, false)  - Full Moon');
            console.log('  weatherDebug.moonTest(50, true)    - Last Quarter');
            console.log('---');
        });
    },
    
    // Тестирование луны
    moonTest: function(phasePercent, isWaning) {
        console.log(`🌙 Testing Moon Phase: ${phasePercent}% ${isWaning ? '(Waning)' : '(Waxing)'}`);
        updateMoonVisualization(phasePercent, isWaning);
        
        // Обновляем текстовую информацию
        document.getElementById('moon-phase-text').textContent = `Фаза: Тестовая (${phasePercent}%)`;
        document.getElementById('moon-illumination').textContent = isWaning ? 'Статус: Убывание' : 'Статус: Возрастание';
        document.getElementById('moon-age').textContent = `Возраст: тест`;
        document.getElementById('moon-next').textContent = `Следующая фаза: тест`;
    },
    
    // Все уведомления
    notifications: function() {
        console.log('🔔 NOTIFICATIONS DEBUG');
        console.log('=====================');
        console.log('📱 iOS Notifications System: Active');
        console.log('💬 Test Commands:');
        console.log('  weatherDebug.testNotification("success")');
        console.log('  weatherDebug.testNotification("error")');
        console.log('  weatherDebug.testNotification("warning")');
        console.log('  weatherDebug.testNotification("info")');
        console.log('---');
    },
    
    // Тестовые уведомления
    testNotification: function(type = 'info') {
        const messages = {
            success: { title: 'Успех!', message: 'Это тестовое успешное уведомление' },
            error: { title: 'Ошибка!', message: 'Это тестовое уведомление об ошибке' },
            warning: { title: 'Внимание!', message: 'Это тестовое предупреждение' },
            info: { title: 'Информация', message: 'Это тестовое информационное уведомление' }
        };
        
        const msg = messages[type] || messages.info;
        iosNotifications[type](msg.title, msg.message);
        console.log(`🔔 Sent ${type} notification:`, msg);
    },
    
    // Карта
    map: function() {
        console.log('🗺️ MAP DEBUG');
        console.log('============');
        console.log(`📍 Map Object:`, map);
        console.log(`📍 User Placemark:`, userPlacemark);
        console.log(`🎯 Current Coords:`, userPlacemark ? userPlacemark.geometry.getCoordinates() : 'Not set');
        console.log('---');
    },
    
    // Полный отчет
    full: function() {
        console.clear();
        console.log('🚀 WEATHER OVERCAST - FULL DEBUG REPORT');
        console.log('=======================================');
        this.info();
        this.api();
        this.performance();
        this.storage();
        this.system();
        this.weather();
        this.moon();
        this.notifications();
        this.map();
        
        console.log('🎮 QUICK COMMANDS:');
        console.log('  weatherDebug.info()       - Basic info');
        console.log('  weatherDebug.full()       - Full report');
        console.log('  weatherDebug.moon()       - Moon data');
        console.log('  weatherDebug.weather()    - Weather data');
        console.log('  weatherDebug.storage()    - Storage info');
        console.log('  weatherDebug.testNotification("success")');
        console.log('  weatherDebug.moonTest(100, false)');
    },
    
    // Экстренный сброс
    reset: function() {
        console.log('🔄 RESETTING APPLICATION...');
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
    },
    
    // Тест API
    testAPI: async function() {
        console.log('🧪 TESTING API CONNECTIONS...');
        
        try {
            // Test weather API
            const testResponse = await fetch(`${BASE_URL}/weather?q=London&appid=${API_KEY}&units=metric`);
            console.log(`🌤️ Weather API: ${testResponse.ok ? '✅ OK' : '❌ FAILED'}`);
            
            // Test geolocation
            if (navigator.geolocation) {
                console.log('📍 Geolocation: ✅ Available');
            } else {
                console.log('📍 Geolocation: ❌ Not available');
            }
            
            console.log('🎯 All tests completed');
        } catch (error) {
            console.log('❌ API Test failed:', error);
        }
    }
};

// Автоматически показываем подсказку при загрузке
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        console.log('🐛 Weather Debug loaded! Type "weatherDebug.full()" for complete report');
        console.log('📚 Available commands: weatherDebug.info(), weatherDebug.api(), weatherDebug.weather(), etc.');
    }, 3000);
}

// Глобальные переменные для дебага
window._weatherGlobals = {
    currentCity,
    currentCityData,
    currentUnits,
    currentTheme,
    favorites,
    map,
    userPlacemark,
    forecastData,
    airQualityData,
    iosNotifications
};
// ========== ПАНЕЛЬ ИНФОРМАЦИИ О ЛУНЕ ==========
function initMoonInfoPanel() {
    const questionBtn = document.getElementById('moon-info-question');
    const overlay = document.getElementById('moon-info-overlay');
    const closeBtn = document.getElementById('close-moon-info');

    if (!questionBtn || !overlay || !closeBtn) return;

    // Создаем кнопку вопроса если её нет
    if (!questionBtn) {
        const moonTile = document.querySelector('#moon-info .tile-header');
        if (moonTile) {
            const newQuestionBtn = document.createElement('div');
            newQuestionBtn.className = 'hint-question';
            newQuestionBtn.id = 'moon-info-question';
            newQuestionBtn.textContent = '?';
            newQuestionBtn.title = 'Что означают фазы луны?';
            moonTile.appendChild(newQuestionBtn);
            
            newQuestionBtn.addEventListener('click', showMoonInfoPanel);
        }
    } else {
        questionBtn.addEventListener('click', showMoonInfoPanel);
    }

    closeBtn.addEventListener('click', closeMoonInfoPanel);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeMoonInfoPanel();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            closeMoonInfoPanel();
        }
    });
}

function showMoonInfoPanel() {
    const overlay = document.getElementById('moon-info-overlay');
    if (!overlay) return;

    // Обновляем информацию о текущей фазе
    updateMoonInfoPanel();

    overlay.style.display = 'flex';
    document.body.classList.add('settings-open');
}

function closeMoonInfoPanel() {
    const overlay = document.getElementById('moon-info-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.classList.remove('settings-open');
    }
}

function updateMoonInfoPanel() {
    calculateMoonInfo().then(moonInfo => {
        // Обновляем текстовую информацию
        document.getElementById('info-moon-phase').textContent = moonInfo.phase;
        document.getElementById('info-moon-illumination').textContent = `${moonInfo.illumination}%`;
        document.getElementById('info-moon-age').textContent = `${moonInfo.age} дней`;
        document.getElementById('info-moon-status').textContent = moonInfo.isWaning ? 'Убывание' : 'Возрастание';
        document.getElementById('info-moon-next').textContent = `${moonInfo.nextPhase} (через ${moonInfo.daysToNext} д.)`;

        // Обновляем мини-луну
        updateMiniMoon(moonInfo.phasePercent, moonInfo.isWaning);
    });
}

function updateMiniMoon(phasePercent, isWaning) {
    const miniMoon = document.querySelector('.mini-moon-phase');
    if (!miniMoon) return;

    miniMoon.style.cssText = '';

    if (phasePercent === 0) {
        miniMoon.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        miniMoon.style.clipPath = 'inset(0 0 0 0%)';
        miniMoon.style.boxShadow = 'inset 0 0 8px rgba(241, 196, 15, 0.8), 0 0 15px rgba(241, 196, 15, 0.5)';
    } else {
        if (isWaning) {
            miniMoon.style.clipPath = `inset(0 ${100 - phasePercent}% 0 0)`;
        } else {
            miniMoon.style.clipPath = `inset(0 0 0 ${100 - phasePercent}%)`;
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', initMoonInfoPanel);

// ========== УЛУЧШЕННАЯ МИНИ-ЛУНА ==========
function updateMiniMoon(phasePercent, isWaning) {
    const miniMoon = document.querySelector('.mini-moon-phase');
    if (!miniMoon) return;

    // Сбрасываем стили
    miniMoon.style.cssText = '';
    miniMoon.style.position = 'absolute';
    miniMoon.style.top = '0';
    miniMoon.style.left = '0';
    miniMoon.style.width = '100%';
    miniMoon.style.height = '100%';
    miniMoon.style.borderRadius = '50%';
    miniMoon.style.background = '#f1c40f';
    miniMoon.style.transition = 'all 0.5s ease';
    miniMoon.style.boxShadow = 'inset 0 0 4px rgba(241, 196, 15, 0.6)';

    // Применяем фазу
    if (phasePercent === 0) {
        miniMoon.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        miniMoon.style.clipPath = 'inset(0 0 0 0%)';
        miniMoon.style.boxShadow = 'inset 0 0 6px rgba(241, 196, 15, 0.8), 0 0 10px rgba(241, 196, 15, 0.4)';
    } else {
        if (isWaning) {
            miniMoon.style.clipPath = `inset(0 ${100 - phasePercent}% 0 0)`;
        } else {
            miniMoon.style.clipPath = `inset(0 0 0 ${100 - phasePercent}%)`;
        }
    }
}

// Функция для обновления всех мини-лун в списке фаз
function updateAllMiniMoons() {
    const phases = [
        { percent: 0, waning: false, isNew: true },     // Новолуние
        { percent: 25, waning: false },                 // Растущий серп
        { percent: 50, waning: false },                 // Первая четверть
        { percent: 75, waning: false },                 // Растущая луна
        { percent: 100, waning: false, isFull: true },  // Полнолуние
        { percent: 75, waning: true },                  // Убывающая луна
        { percent: 50, waning: true },                  // Последняя четверть
        { percent: 25, waning: true }                   // Старый серп
    ];

    const moonIcons = document.querySelectorAll('.moon-phase-visual');
    moonIcons.forEach((icon, index) => {
        if (phases[index]) {
            const phase = phases[index];
            icon.style.cssText = '';
            icon.style.position = 'absolute';
            icon.style.top = '0';
            icon.style.left = '0';
            icon.style.width = '100%';
            icon.style.height = '100%';
            icon.style.borderRadius = '50%';
            icon.style.transition = 'all 0.5s ease';

            if (phase.isNew) {
                // Серое новолуние
                icon.style.background = 'radial-gradient(circle at 30% 30%, #e0e0e0 0%, #bdbdbd 40%, #9e9e9e 80%)';
                icon.style.boxShadow = 'inset 0 0 3px rgba(224, 224, 224, 0.3), 0 0 5px rgba(158, 158, 158, 0.3)';
                icon.style.clipPath = 'inset(0 0 0 100%)';
            } else if (phase.isFull) {
                // Яркое полнолуние
                icon.style.background = 'radial-gradient(circle at 30% 30%, #fff9c4 0%, #fff176 25%, #ffeb3b 50%, #fdd835 75%)';
                icon.style.boxShadow = 'inset 0 0 4px rgba(255, 255, 255, 0.6), inset 0 0 8px rgba(255, 235, 59, 0.4), 0 0 8px rgba(255, 235, 59, 0.6), 0 0 15px rgba(255, 235, 59, 0.3)';
                icon.style.clipPath = 'inset(0 0 0 0%)';
            } else {
                // Обычные фазы
                icon.style.background = 'radial-gradient(circle at 30% 30%, #fff176 0%, #ffeb3b 30%, #fdd835 60%, #f9a825 90%)';
                icon.style.boxShadow = 'inset 0 0 3px rgba(255, 255, 255, 0.4), 0 0 5px rgba(241, 196, 15, 0.3)';
                
                if (phase.percent === 0) {
                    icon.style.clipPath = 'inset(0 0 0 100%)';
                } else if (phase.waning) {
                    icon.style.clipPath = `inset(0 ${100 - phase.percent}% 0 0)`;
                } else {
                    icon.style.clipPath = `inset(0 0 0 ${100 - phase.percent}%)`;
                }
            }
        }
    });
}

function updateMoonInfoPanel() {
    calculateMoonInfo().then(moonInfo => {
        // Обновляем только существующие элементы
        const phaseElement = document.getElementById('info-moon-phase');
        const ageElement = document.getElementById('info-moon-age');
        const statusElement = document.getElementById('info-moon-status');
        const nextElement = document.getElementById('info-moon-next');
        
        if (phaseElement) phaseElement.textContent = moonInfo.phase;
        if (ageElement) ageElement.textContent = `${moonInfo.age} дней`;
        if (statusElement) statusElement.textContent = moonInfo.isWaning ? 'Убывание' : 'Возрастание';
        if (nextElement) nextElement.textContent = `${moonInfo.nextPhase} (через ${moonInfo.daysToNext} д.)`;

        // Обновляем мини-луну в заголовке
        updateMiniMoon(moonInfo.phasePercent, moonInfo.isWaning);
        
        // Обновляем все мини-луны в списке фаз
        updateAllMiniMoons();
    }).catch(error => {
        console.log('Ошибка обновления панели луны:', error);
        // Устанавливаем значения по умолчанию при ошибке
        const phaseElement = document.getElementById('info-moon-phase');
        const ageElement = document.getElementById('info-moon-age');
        const statusElement = document.getElementById('info-moon-status');
        const nextElement = document.getElementById('info-moon-next');
        
        if (phaseElement) phaseElement.textContent = 'Не доступно';
        if (ageElement) ageElement.textContent = '—';
        if (statusElement) statusElement.textContent = '—';
        if (nextElement) nextElement.textContent = '—';
    });
}
function showApiError() {
  document.getElementById('api-error').style.display = 'block';
}

function hideApiError() {
  document.getElementById('api-error').style.display = 'none';
}