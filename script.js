// ========== КОНФИГУРАЦИЯ ==========
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// ========== ПЕРЕМЕННЫЕ ==========
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let forecastData = null;
let airQualityData = null;
let isFirstLoad = true;
let isLoading = false;

// ========== ПЕРЕВОДЫ ==========
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

// ========== ОШИБКИ ==========
const ERROR_TYPES = {
    NO_INTERNET: {
        title: 'Нет интернет-соединения',
        message: 'Проверьте подключение к интернету и попробуйте снова',
        color: '#ef4444',
        icon: 'no-wifi'
    },
    SERVER_ERROR: {
        title: 'Сервер не отвечает',
        message: 'Проблемы с сервером погоды. Попробуйте позже',
        color: '#f97316',
        icon: 'server'
    },
    API_LIMIT: {
        title: 'Превышен лимит запросов',
        message: 'Слишком много запросов к API. Попробуйте через 10 минут',
        color: '#eab308',
        icon: 'limit'
    },
    MAINTENANCE: {
        title: 'Обновление серверов',
        message: 'Серверы API проходят плановое обслуживание с 20:00 до 23:00',
        color: '#8b5cf6',
        icon: 'maintenance'
    },
    LOCATION_ERROR: {
        title: 'Ошибка геолокации',
        message: 'Не удалось определить ваше местоположение',
        color: '#3b82f6',
        icon: 'location'
    }
};

// ========== КЛАСС УМНЫХ НАПОМИНАНИЙ ==========
class SmartReminders {
    constructor() {
        this.reminderElement = document.getElementById('weather-reminder');
        this.titleElement = document.getElementById('reminder-title');
        this.messageElement = document.getElementById('reminder-message');
        this.timeElement = document.getElementById('reminder-time');
        this.currentReminder = null;
        this.lastUpdate = null;
    }

    analyzeWeatherForReminders(weatherData, forecastData) {
        if (!weatherData || !forecastData) return null;

        const now = new Date();
        const currentHour = now.getHours();
        this.lastUpdate = now;

        const snowProbability = this.calculateSnowProbability(forecastData);
        if (snowProbability.high && this.isRelevantTimeForSnow(currentHour)) {
            return this.createSnowReminder(snowProbability);
        }

        const rainProbability = this.calculateRainProbability(forecastData);
        if (rainProbability.high && this.isRelevantTimeForRain(currentHour)) {
            return this.createRainReminder(rainProbability);
        }

        const sunTimes = this.getSunTimes(weatherData);
        if (this.isTimeForSunriseReminder(currentHour, sunTimes.sunrise)) {
            return this.createSunriseReminder(sunTimes.sunrise);
        }

        if (this.isTimeForSunsetReminder(currentHour, sunTimes.sunset)) {
            return this.createSunsetReminder(sunTimes.sunset);
        }

        return this.createDefaultReminder(weatherData);
    }

    calculateSnowProbability(forecastData) {
        const next12Hours = forecastData.list.slice(0, 4);
        let snowCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            const description = hour.weather[0].description.toLowerCase();
            
            if (weather.includes('snow') || description.includes('snow')) snowCount++;
            if (hour.main.temp <= 2 && (weather.includes('rain') || description.includes('shower'))) snowCount += 0.5;
        });

        return { high: snowCount >= 2, medium: snowCount >= 1, snowCount };
    }

    calculateRainProbability(forecastData) {
        const next12Hours = forecastData.list.slice(0, 4);
        let rainChance = 0;
        let rainCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            if (weather.includes('rain') || weather.includes('drizzle')) rainCount++;
            if (hour.pop) rainChance = Math.max(rainChance, hour.pop * 100);
        });

        return { 
            high: rainCount >= 2 || rainChance > 60, 
            medium: rainCount >= 1 || rainChance > 30, 
            chance: rainChance, 
            rainCount 
        };
    }

    isRelevantTimeForSnow(currentHour) {
        return currentHour >= 6 && currentHour <= 14;
    }

    isRelevantTimeForRain(currentHour) {
        return (currentHour >= 6 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 20);
    }

    getSunTimes(weatherData) {
        return {
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000)
        };
    }

    isTimeForSunriseReminder(currentHour, sunrise) {
        const sunriseHour = sunrise.getHours();
        return currentHour >= (sunriseHour - 1) && currentHour < sunriseHour;
    }

    isTimeForSunsetReminder(currentHour, sunset) {
        const sunsetHour = sunset.getHours();
        return currentHour >= (sunsetHour - 1) && currentHour < sunsetHour;
    }

    createSnowReminder(snowProbability) {
        const messages = [
            "Наслаждайтесь снегом!",
            "Идеальное время для снежных забав",
            "Можно слепить снеговика",
            "Прекрасный снежный день!",
        ];
        
        const intensity = snowProbability.high ? "сильный" : "небольшой";
        
        return {
            type: 'snow',
            title: `Возможен ${intensity} снег`,
            message: messages[Math.floor(Math.random() * messages.length)],
            time: `Снегопад ожидается`,
            className: 'snow-reminder important',
            icon: 'snow'
        };
    }

    createRainReminder(rainProbability) {
        const messages = ["Возьмите зонт", "Ожидаются осадки", "Не забудьте зонтик!"];
        const intensity = rainProbability.high ? "сильный" : "небольшой";
        
        return {
            type: 'rain',
            title: `Возможен ${intensity} дождь`,
            message: messages[Math.floor(Math.random() * messages.length)],
            time: `Вероятность: ${Math.round(rainProbability.chance)}%`,
            className: 'rain-warning important',
            icon: 'umbrella'
        };
    }

    createSunriseReminder(sunrise) {
        const sunriseTime = this.formatTime(sunrise);
        return {
            type: 'sunrise',
            title: 'Рассвет через час',
            message: 'Идеальное время для утренних фото',
            time: `В ${sunriseTime}`,
            className: 'sunrise-reminder',
            icon: 'sunrise'
        };
    }

    createSunsetReminder(sunset) {
        const sunsetTime = this.formatTime(sunset);
        return {
            type: 'sunset',
            title: 'Закат через час',
            message: 'Отличный момент для вечерней прогулки',
            time: `В ${sunsetTime}`,
            className: 'sunset-reminder',
            icon: 'sunset'
        };
    }

createDefaultReminder(weatherData) {
    const descriptions = {
        'clear': 'Можно погулять',
        'clouds': 'Можно остаться дома или погулять',
        'snow': 'Наслаждайтесь снегом',
        'thunderstorm': 'Лучше остаться дома'
    };
    
    const weatherType = weatherData.weather[0].main.toLowerCase();
    const message = descriptions[weatherType] || 'Хорошего дня!';
    
    return {
        type: 'default',
        title: 'Совет на сегодня',
        message: message,
        time: this.getNextUpdateTime(), // Используем реальное время
        className: '',
        icon: 'sun'
    };
}

    formatTime(date) {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

getNextUpdateTime() {
    if (!this.lastUpdate) return 'Обновлено: --:--';
    return `Обновлено: ${this.formatTime(this.lastUpdate)}`;
}

    showReminder(reminderData) {
        if (!this.reminderElement || !reminderData) return;

        this.currentReminder = reminderData;
        this.titleElement.textContent = reminderData.title;
        this.messageElement.textContent = reminderData.message;
        this.timeElement.textContent = reminderData.time;
        this.reminderElement.className = `reminder-card ${reminderData.className}`;
        this.updateReminderIcon(reminderData.icon);
        this.reminderElement.style.display = 'flex';
    }

    updateReminderIcon(iconType) {
        const iconContainer = this.reminderElement.querySelector('.reminder-icon');
        if (iconContainer) {
            const iconSvg = this.getReminderIcon(iconType);
            iconContainer.innerHTML = iconSvg;
        }
    }

getReminderIcon(iconType) {
    const icons = {
        umbrella: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
        sunrise: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7a4 4 0 0 1 8 0" /><path d="M3 21l18 0" /><path d="M12 3v6l3 -3m-6 0l3 3" /></svg>`,
        snow: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/></svg>`,
        sunset: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7a4 4 0 0 1 8 0" /><path d="M3 21l18 0" /><path d="M12 9v6l3 -3m-6 0l3 3" /></svg>`,
        sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    };
    return icons[iconType] || icons.sun;
}

    hideReminder() {
        if (this.reminderElement) this.reminderElement.style.display = 'none';
    }

    updateReminder(weatherData, forecastData) {
        const reminder = this.analyzeWeatherForReminders(weatherData, forecastData);
        if (reminder) this.showReminder(reminder);
        else this.hideReminder();
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
const smartReminders = new SmartReminders();

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getWeatherIcon(weatherCode) {
    const iconMap = {
        '01d': 'sunny', '01n': 'clear-night',
        '02d': 'cloudy', '02n': 'cloudy',
        '03d': 'cloudy', '03n': 'cloudy',
        '04d': 'overcast', '04n': 'overcast',
        '09d': 'rainy', '09n': 'rainy',
        '10d': 'rainy', '10n': 'rainy',
        '11d': 'thunderstorm', '11n': 'thunderstorm',
        '13d': 'snowy', '13n': 'snowy',
        '50d': 'foggy', '50n': 'foggy'
    };
    return `<div class="weather-icon icon-${iconMap[weatherCode] || 'sunny'}"></div>`;
}

function getShortWeatherDescription(weatherCode) {
    const descriptions = {
        '01d': 'Ясно', '01n': 'Ясно',
        '02d': 'Мало облаков', '02n': 'Мало облаков',
        '03d': 'Облачно', '03n': 'Облачно',
        '04d': 'Пасмурно', '04n': 'Пасмурно',
        '09d': 'Дождь', '09n': 'Дождь',
        '10d': 'Дождь', '10n': 'Дождь',
        '11d': 'Гроза', '11n': 'Гроза',
        '13d': 'Снег', '13n': 'Снег',
        '50d': 'Туман', '50n': 'Туман'
    };
    return descriptions[weatherCode] || 'Ясно';
}

function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    return directions[Math.round(degrees / 45) % 8];
}

function translateWeather(description) {
    return weatherTranslations[description] || description;
}

function getAirQualityText(aqi) {
    const levels = {
        1: { text: 'Отлично', class: 'aqi-good' },
        2: { text: 'Хорошо', class: 'aqi-moderate' },
        3: { text: 'Умеренно', class: 'aqi-unhealthy-sensitive' },
        4: { text: 'Плохо', class: 'aqi-unhealthy' },
        5: { text: 'Очень плохо', class: 'aqi-very-unhealthy' }
    };
    return levels[aqi] || levels[1];
}

// ========== СИСТЕМА ОШИБОК ==========
function showError(errorType, customMessage = null) {
    const errorOverlay = document.getElementById('errorOverlay');
    if (!errorOverlay) return;
    
    const error = ERROR_TYPES[errorType] || ERROR_TYPES.SERVER_ERROR;
    errorOverlay.querySelector('.error-title').textContent = error.title;
    errorOverlay.querySelector('.error-message').textContent = customMessage || error.message;
    errorOverlay.querySelector('.error-icon svg').innerHTML = getErrorIcon(error.icon);
    
    const errorCard = errorOverlay.querySelector('.error-card');
    errorCard.style.setProperty('--error-color', error.color);
    errorCard.style.boxShadow = `
        0 25px 50px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        0 0 20px ${error.color}30
    `;
    
    errorOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideError() {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay) {
        errorOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function getErrorIcon(iconType) {
    const icons = {
        'no-wifi': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" />`,
        'server': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" />`,
        'limit': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" />`,
        'maintenance': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" />`,
        'location': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 9v-1a3 3 0 0 1 6 0v1" /><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" /><path d="M3 13l4 0" /><path d="M17 13l4 0" /><path d="M12 20l0 -6" /><path d="M4 19l3.35 -2" /><path d="M20 19l-3.35 -2" /><path d="M4 7l3.75 2.4" /><path d="M20 7l-3.75 2.4" />`
    };
    return icons[iconType] || icons.server;
}
// ========== API ФУНКЦИИ ==========
async function getAirQuality(lat, lon) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.log('Качество воздуха недоступно:', error.message);
        return null;
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

async function getWeatherByCoords(lat, lon) {
    if (isLoading) return;
    if (!navigator.onLine) {
        showError('NO_INTERNET');
        return;
    }
    
    isLoading = true;
    
    try {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour >= 20 && currentHour <= 23) {
            showError('MAINTENANCE');
            return;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const [weatherData, forecastData, airQualityData] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`, {
                signal: controller.signal
            }).then(async r => {
                if (!r.ok) {
                    if (r.status === 429) throw new Error('API_LIMIT');
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
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

        clearTimeout(timeoutId);

        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            currentCity = weatherData.name;
            await updateWeatherData(weatherData, forecastData, airQualityData);
        } else {
            throw new Error(weatherData.message || 'Неизвестная ошибка API');
        }
        
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        
        if (error.message === 'API_LIMIT') showError('API_LIMIT');
        else if (error.name === 'AbortError') showError('SERVER_ERROR', 'Сервер не отвечает. Проверьте подключение');
        else if (error.message.includes('Failed to fetch')) showError('NO_INTERNET', 'Проблемы с подключением к серверу погоды');
        else showError('SERVER_ERROR', error.message);
    } finally {
        isLoading = false;
    }
}

async function getWeatherByCity(city) {
    if (isLoading) return;
    if (!navigator.onLine) {
        showError('NO_INTERNET');
        return;
    }
    
    isLoading = true;
    
    try {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (currentHour >= 20 && currentHour <= 23) {
            showError('MAINTENANCE');
            return;
        }
        
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
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        if (error.message === '429') showError('API_LIMIT');
        else showError('SERVER_ERROR', 'Город не найден или ошибка сервера');
    } finally {
        isLoading = false;
    }
}

// ========== ОБНОВЛЕНИЕ ДАННЫХ ==========
async function updateWeatherData(data, forecastData, airQualityData) {
    updateMobileWeather(data);
    await updateAllMobileData(data, forecastData, airQualityData);
    updateThemeByWeather(data.weather[0].main, data.sys);
    isFirstLoad = false;
}

function updateMobileWeather(data) {
    if (!data) return;
    
    try {
        document.getElementById('mobile-city').textContent = data.name;
        document.getElementById('mobile-date').textContent = new Date().toLocaleDateString('ru-RU', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        document.getElementById('mobile-temperature').textContent = Math.round(data.main.temp) + '°';
        document.getElementById('mobile-description').textContent = data.weather[0].description;
        document.getElementById('mobile-feels-like').textContent = Math.round(data.main.feels_like) + '°';
        
        document.getElementById('mobile-weather-icon').innerHTML = getWeatherIcon(data.weather[0].icon);
        
        document.getElementById('mobile-humidity').textContent = data.main.humidity + '%';
        document.getElementById('mobile-wind').textContent = Math.round(data.wind.speed) + ' км/ч';
        document.getElementById('mobile-wind-direction').textContent = 'Ветер ' + getWindDirection(data.wind.deg);
        document.getElementById('mobile-pressure').textContent = Math.round(data.main.pressure * 0.750062) + ' мм';
        
        document.getElementById('mobile-humidity-bar').style.width = data.main.humidity + '%';
        document.getElementById('mobile-wind-bar').style.width = Math.min(data.wind.speed / 20 * 100, 100) + '%';
        document.getElementById('mobile-pressure-bar').style.width = Math.min(((data.main.pressure - 950) / (1050 - 950) * 100), 100) + '%';
        
        updateWeatherGlow(data);
    } catch (error) {
        console.log('Ошибка обновления мобильного блока:', error);
    }
}

async function updateAllMobileData(data, forecastData, airQualityData) {
    if (!data) return;
    
    updateMobileWeather(data);
    
    if (forecastData) {
        updateMobileForecastData(forecastData);
        updateMobileHourlyData(forecastData);
    }
    
    if (airQualityData) {
        updateMobileAirQualityData(airQualityData);
    }
    
    updateMobileSunData(data);
    smartReminders.updateReminder(data, forecastData);
}

function updateMobileForecastData(forecastData) {
    const container = document.getElementById('mobile-forecast');
    if (!container || !forecastData?.list) return;
    
    try {
        const dailyForecasts = {};
        const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            if (!dailyForecasts[dayKey] && Object.keys(dailyForecasts).length < 5) {
                dailyForecasts[dayKey] = {
                    day: dayNames[date.getDay()],
                    temp: Math.round(item.main.temp),
                    weatherDesc: getShortWeatherDescription(item.weather[0].icon)
                };
            }
        });
        
        let html = '';
        Object.values(dailyForecasts).forEach(dayData => {
            html += `<div class="mobile-forecast-item">
                <div class="mobile-forecast-day">${dayData.day}</div>
                <div class="mobile-forecast-temp">${dayData.temp}°</div>
                <div class="mobile-forecast-desc">${dayData.weatherDesc}</div>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.log('Ошибка обновления прогноза:', error);
        container.innerHTML = '<div class="mobile-forecast-item">—</div>'.repeat(5);
    }
}

function updateMobileHourlyData(forecastData) {
    const container = document.getElementById('mobile-hourly');
    if (!container || !forecastData?.list) return;
    
    try {
        const hourlyItems = forecastData.list.slice(0, 8);
        let html = '';
        
        hourlyItems.forEach((hour, index) => {
            const time = new Date(hour.dt * 1000);
            const timeString = index === 0 ? 'Сейчас' : formatTime(time);
            const temp = Math.round(hour.main.temp);
            const weatherDesc = getShortWeatherDescription(hour.weather[0].icon);
            
            html += `<div class="mobile-hourly-item">
                <div class="mobile-hourly-time">${timeString}</div>
                <div class="mobile-hourly-temp">${temp}°</div>
                <div class="mobile-hourly-desc">${weatherDesc}</div>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (error) {
        console.log('Ошибка обновления почасового прогноза:', error);
        container.innerHTML = '<div class="mobile-hourly-item">—</div>'.repeat(8);
    }
}

function updateMobileAirQualityData(airQualityData) {
    const aqiElement = document.getElementById('mobile-aqi');
    const aqiLabel = document.getElementById('mobile-aqi-label');
    
    if (!aqiElement || !aqiLabel || !airQualityData?.list?.[0]) return;
    
    try {
        const aqi = airQualityData.list[0].main.aqi;
        const airQualityInfo = getAirQualityText(aqi);
        
        aqiElement.innerHTML = `<div class="mobile-aqi-text ${airQualityInfo.class}">${airQualityInfo.text}</div>`;
        aqiLabel.textContent = 'Качество воздуха';
    } catch (error) {
        console.log('Ошибка обновления качества воздуха:', error);
        aqiElement.innerHTML = `<div class="mobile-aqi-text aqi-moderate">Нет данных</div>`;
        aqiLabel.textContent = 'Качество воздуха';
    }
}

function updateMobileSunData(data) {
    if (!data?.sys) return;
    
    try {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        document.getElementById('mobile-sunrise').textContent = formatTime(sunrise);
        document.getElementById('mobile-sunset').textContent = formatTime(sunset);
    } catch (error) {
        console.log('Ошибка обновления времени солнца:', error);
        document.getElementById('mobile-sunrise').textContent = '--:--';
        document.getElementById('mobile-sunset').textContent = '--:--';
    }
}

function updateWeatherGlow(weatherData) {
    const mobileCard = document.querySelector('.mobile-weather-card');
    if (!mobileCard) return;

    mobileCard.className = mobileCard.className.replace(/\bweather-glow-\w+/g, '');
    
    const weatherMain = weatherData.weather[0].main.toLowerCase();
    const weatherDesc = weatherData.weather[0].description.toLowerCase();
    const now = new Date();
    const hour = now.getHours();
    
    const isMorning = hour >= 5 && hour < 12;
    const isEvening = hour >= 17 && hour < 22;
    const isNight = hour >= 22 || hour < 5;
    const isDecember = now.getMonth() === 11;
    const isChristmasTime = isDecember && now.getDate() >= 15 && now.getDate() <= 31;

    let glowClass = 'weather-glow-clear';
    
    if (isChristmasTime) glowClass = 'weather-glow-christmas';
    else if (isNight) glowClass = 'weather-glow-night';
    else if (isMorning) glowClass = 'weather-glow-morning';
    else if (isEvening) glowClass = 'weather-glow-evening';
    
    if (weatherMain === 'rain') {
        glowClass = weatherDesc.includes('light') || weatherDesc.includes('drizzle') ? 
            'weather-glow-drizzle' : 'weather-glow-rain';
    } else if (weatherMain === 'snow') {
        glowClass = weatherDesc.includes('light') ? 'weather-glow-snowfall' : 'weather-glow-snow';
    } else if (weatherMain === 'thunderstorm') {
        glowClass = 'weather-glow-thunderstorm';
    } else if (weatherMain === 'clouds') {
        glowClass = weatherDesc.includes('broken') || weatherDesc.includes('few') ? 
            (isNight ? 'weather-glow-night' : 'weather-glow-clouds') : 'weather-glow-overcast';
    } else if (weatherMain === 'clear') {
        glowClass = isNight ? 'weather-glow-night' : 'weather-glow-sunny';
    } else if (['mist', 'fog', 'haze'].includes(weatherMain)) {
        glowClass = 'weather-glow-mist';
    }
    
    mobileCard.classList.add(glowClass);
}

// ========== НАСТРОЙКИ ==========
function updateThemeByWeather(weatherMain, sys) {
    if (currentTheme !== 'dynamic') return;

    const now = new Date();
    const currentTime = now.getTime();
    const sunrise = new Date(sys.sunrise * 1000).getTime();
    const sunset = new Date(sys.sunset * 1000).getTime();

    const isNight = currentTime < sunrise || currentTime > sunset;
    document.body.className = isNight ? 'night' : weatherMain.toLowerCase();
}

function loadSettings() {
    const savedUnits = localStorage.getItem('weatherUnits');
    const savedTheme = localStorage.getItem('weatherTheme');

    if (savedUnits) currentUnits = savedUnits;
    if (savedTheme) {
        currentTheme = savedTheme;
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(savedTheme);
    }
}

function applyTemperatureUnits() {
    const savedUnits = localStorage.getItem('weatherUnits') || 'celsius';
    currentUnits = savedUnits;
    if (currentCityData) updateMobileWeather(currentCityData);
}

// ========== ГЕОЛОКАЦИЯ И НАВИГАЦИЯ ==========
function getUserLocation() {
    if (!navigator.onLine) {
        showError('NO_INTERNET');
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => getWeatherByCoords(position.coords.latitude, position.coords.longitude),
            error => {
                console.log('Ошибка геолокации:', error);
                showError('LOCATION_ERROR');
                getWeatherByCoords(59.9343, 30.3351);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 }
        );
    } else {
        console.log('Геолокация не поддерживается браузером');
        showError('LOCATION_ERROR');
        getWeatherByCoords(59.9343, 30.3351);
    }
}

function navigateTo(section) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    switch(section) {
        case 'home':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
        case 'forecast':
            const forecastCards = document.querySelectorAll('.mobile-additional-card');
            if (forecastCards[1]) forecastCards[1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
        case 'donate':
            window.location.href = 'donate.html';
            break;
        case 'settings':
            window.location.href = 'settings.html';
            break;
    }
    
    event.preventDefault();
    return false;
}

function openSettings() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    window.location.href = 'settings.html';
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    applyTemperatureUnits();
    getUserLocation();
    
    window.addEventListener('online', () => {
        hideError();
        getUserLocation();
    });
    
    window.addEventListener('offline', () => {
        showError('NO_INTERNET');
    });
    
    document.addEventListener('click', function(event) {
        const errorOverlay = document.getElementById('errorOverlay');
        if (errorOverlay && event.target === errorOverlay) hideError();
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') hideError();
    });

    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('focus', function() { this.blur(); });
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }
});

// ========== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ==========
function updateAllTemperatures() {
    if (currentCityData) updateMobileWeather(currentCityData);
}