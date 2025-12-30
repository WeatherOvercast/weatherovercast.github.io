// Конфигурация API
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Глобальные переменные
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let forecastData = null;
let airQualityData = null;
const TEMPERATURE_SHIFT = 0;
let isFirstLoad = true;

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

// Система ошибок
const ERROR_TYPES = {
    NO_INTERNET: {
        title: 'Нет интернет-соединения',
        message: 'Проверьте подключение к интернету и попробуйте снова',
        color: '#ef4444', // Красный
        icon: 'no-wifi'
    },
    SERVER_ERROR: {
        title: 'Сервер не отвечает',
        message: 'Проблемы с сервером погоды. Попробуйте позже',
        color: '#f97316', // Оранжевый
        icon: 'server'
    },
    API_LIMIT: {
        title: 'Превышен лимит запросов',
        message: 'Слишком много запросов к API. Попробуйте через 10 минут',
        color: '#eab308', // Желтый
        icon: 'limit'
    },
    MAINTENANCE: {
        title: 'Обновление серверов',
        message: 'Серверы API проходят плановое обслуживание с 20:00 до 23:00',
        color: '#8b5cf6', // Фиолетовый
        icon: 'maintenance'
    },
    LOCATION_ERROR: {
        title: 'Ошибка геолокации',
        message: 'Не удалось определить ваше местоположение',
        color: '#3b82f6', // Синий
        icon: 'location'
    }
};

// Получение иконки погоды
function getWeatherIcon(weatherCode) {
    const iconMap = {
        '01d': 'sunny',
        '01n': 'clear-night',
        '02d': 'cloudy',
        '02n': 'cloudy',
        '03d': 'cloudy',
        '03n': 'cloudy',
        '04d': 'overcast',
        '04n': 'overcast',
        '09d': 'rainy',
        '09n': 'rainy',
        '10d': 'rainy',
        '10n': 'rainy',
        '11d': 'thunderstorm',
        '11n': 'thunderstorm',
        '13d': 'snowy',
        '13n': 'snowy',
        '50d': 'foggy',
        '50n': 'foggy'
    };
    
    const iconName = iconMap[weatherCode] || 'sunny';
    return `<div class="weather-icon icon-${iconName}"></div>`;
}

// Получение короткого описания погоды
function getShortWeatherDescription(weatherCode) {
    const descriptions = {
        '01d': 'Ясно',
        '01n': 'Ясно',
        '02d': 'Мало облаков',
        '02n': 'Мало облаков',
        '03d': 'Облачно',
        '03n': 'Облачно',
        '04d': 'Пасмурно',
        '04n': 'Пасмурно',
        '09d': 'Дождь',
        '09n': 'Дождь',
        '10d': 'Дождь',
        '10n': 'Дождь',
        '11d': 'Гроза',
        '11n': 'Гроза',
        '13d': 'Снег',
        '13n': 'Снег',
        '50d': 'Туман',
        '50n': 'Туман'
    };
    
    return descriptions[weatherCode] || 'Ясно';
}

// Форматирование времени
function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Направление ветра
function getWindDirection(degrees) {
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

// Перевод погодных условий
function translateWeather(description) {
    return weatherTranslations[description] || description;
}

// Температурные преобразования
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

// Система ошибок соединения
function showError(errorType, customMessage = null) {
    const errorOverlay = document.getElementById('errorOverlay');
    const errorTitle = errorOverlay.querySelector('.error-title');
    const errorMessage = errorOverlay.querySelector('.error-message');
    const errorIcon = errorOverlay.querySelector('.error-icon svg');
    const errorCard = errorOverlay.querySelector('.error-card');
    
    const error = ERROR_TYPES[errorType] || ERROR_TYPES.SERVER_ERROR;
    
    // Обновляем контент
    errorTitle.textContent = error.title;
    errorMessage.textContent = customMessage || error.message;
    
    // Обновляем иконку
    errorIcon.innerHTML = getErrorIcon(error.icon);
    
    // Обновляем цвет
    errorCard.style.setProperty('--error-color', error.color);
    errorCard.style.boxShadow = `
        0 25px 50px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        0 0 20px ${error.color}30
    `;
    
    // Показываем
    errorOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideError() {
    const errorOverlay = document.getElementById('errorOverlay');
    errorOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function getErrorIcon(iconType) {
    const icons = {
        'no-wifi': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                    <path d="M9.172 15.172a4 4 0 0 1 5.656 0" />
                    <path d="M6.343 12.343a7.963 7.963 0 0 1 3.864 -2.14m4.163 .155a7.965 7.965 0 0 1 3.287 2" />
                    <path d="M3.515 9.515a12 12 0 0 1 3.544 -2.455m3.101 -.92a12 12 0 0 1 10.325 3.374" />
                    <line x1="3" y1="3" x2="21" y2="21" />`,
        'server': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                   <rect x="3" y="4" width="18" height="8" rx="3" />
                   <rect x="3" y="12" width="18" height="8" rx="3" />
                   <line x1="7" y1="8" x2="7" y2="8.01" />
                   <line x1="7" y1="16" x2="7" y2="16.01" />`,
        'limit': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M12 9v2m0 4v.01" />
                  <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75" />`,
        'maintenance': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M9 9v-1a3 3 0 0 1 6 0v1" />
                        <path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3" />
                        <path d="M3 13l4 0" />
                        <path d="M17 13l4 0" />
                        <path d="M12 20l0 -6" />
                        <path d="M4 19l3.35 -2" />
                        <path d="M20 19l-3.35 -2" />
                        <path d="M4 7l3.75 2.4" />
                        <path d="M20 7l-3.75 2.4" />`,
        'location': `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                     <path d="M12 18l-2 -4l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5l-2.901 8.034" />
                     <path d="M21 21l-6 -6" />
                     <path d="M3 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />`
    };
    
    return icons[iconType] || icons.server;
}

// Получение данных о погоде
async function getAirQuality(lat, lon) {
    try {
        const controller = new AbortController();
        const timeoutDuration = 10000;
        
        const timeoutId = setTimeout(() => {
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

// Функция для выполнения запроса с таймаутом
async function fetchWithTimeout(url, options = {}) {
    const { timeout = 7000 } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Модифицированная основная функция получения погоды
async function getWeatherByCoords(lat, lon) {
    if (!navigator.onLine) {
        console.log('Нет подключения к интернету');
        showError('NO_INTERNET');
        return;
    }
    
    try {
        // УДАЛИТЬ ЭТУ ПРОВЕРКУ (перенесена в обработчик таймаута)
        // const now = new Date();
        // const currentHour = now.getHours();
        // 
        // // Проверка на время обслуживания
        // if (currentHour >= 20 && currentHour <= 23) {
        //     showError('MAINTENANCE');
        // }
        
        const controller = new AbortController();
        const timeoutDuration = 15000;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutDuration);
        
        try {
            const [weatherData, forecastData, airQualityData] = await Promise.all([
                fetchWithTimeout(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`, {
                    signal: controller.signal,
                    timeout: 7000 // 7 секунд таймаут
                }).then(async r => {
                    if (!r.ok) {
                        if (r.status === 429) {
                            throw new Error('API_LIMIT');
                        }
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
                
                if (!isFirstLoad) {
                    // iosNotifications.success('Обновлено', `Погода для ${weatherData.name}`, 2000);
                }
            } else {
                throw new Error(weatherData.message || 'Неизвестная ошибка API');
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // Проверяем, был ли это таймаут 7 секунд
            if (fetchError.name === 'AbortError') {
                const now = new Date();
                const currentHour = now.getHours();
                
                // Показываем MAINTENANCE только если таймаут случился в часы обслуживания
                if (currentHour >= 20 && currentHour <= 23) {
                    showError('MAINTENANCE');
                } else {
                    showError('SERVER_ERROR', 'Сервер не отвечает. Проверьте подключение');
                }
            } else if (fetchError.message === 'API_LIMIT') {
                showError('API_LIMIT');
            } else if (fetchError.message.includes('Failed to fetch')) {
                showError('NO_INTERNET', 'Проблемы с подключением к серверу погоды');
            } else {
                showError('SERVER_ERROR', fetchError.message);
            }
        }
        
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        // Общая обработка ошибок
    }
}

// Аналогично модифицируйте getWeatherByCity
async function getWeatherByCity(city) {
    if (!navigator.onLine) {
        showError('NO_INTERNET');
        return;
    }
    
    try {
        // УДАЛИТЬ ЭТУ ПРОВЕРКУ
        // const now = new Date();
        // const currentHour = now.getHours();
        // 
        // // Проверка на время обслуживания
        // if (currentHour >= 20 && currentHour <= 23) {
        //     showError('MAINTENANCE');
        //     return;
        // }
        
        const weatherResponse = await fetchWithTimeout(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`,
            { timeout: 7000 } // 7 секунд таймаут
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
            
            if (!isFirstLoad) {
                // iosNotifications.success('Город изменен', `Теперь смотрим ${weatherData.name}`, 2000);
            }
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        
        // Проверяем, был ли это таймаут 7 секунд
        if (error.name === 'AbortError') {
            const now = new Date();
            const currentHour = now.getHours();
            
            // Показываем MAINTENANCE только если таймаут случился в часы обслуживания
            if (currentHour >= 20 && currentHour <= 23) {
                showError('MAINTENANCE');
            } else {
                showError('SERVER_ERROR', 'Сервер не отвечает. Проверьте подключение');
            }
        } else if (error.message === '429') {
            showError('API_LIMIT');
        } else {
            showError('SERVER_ERROR', 'Город не найден или ошибка сервера');
        }
    }
}

// Также обновите функцию getAirQuality для использования таймаута
async function getAirQuality(lat, lon) {
    try {
        const response = await fetchWithTimeout(
            `${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
            { 
                timeout: 7000,
                method: 'GET'
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.log('Качество воздуха недоступно:', error.message);
        return null;
    }
}

// Обновление всех данных
async function updateWeatherData(data, forecastData, airQualityData) {
    updateMobileWeather(data);
    await updateAllMobileData(data, forecastData, airQualityData);
    updateThemeByWeather(data.weather[0].main, data.sys);
    isFirstLoad = false;
}

// Мобильные функции
function updateMobileWeather(data) {
    if (!data) return;
    
    try {
        document.getElementById('mobile-city').textContent = data.name;
        document.getElementById('mobile-date').textContent = new Date().toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        document.getElementById('mobile-temperature').textContent = Math.round(data.main.temp) + '°';
        document.getElementById('mobile-description').textContent = data.weather[0].description;
        document.getElementById('mobile-feels-like').textContent = Math.round(data.main.feels_like) + '°';
        
        const weatherIcon = document.getElementById('mobile-weather-icon');
        const iconHtml = getWeatherIcon(data.weather[0].icon);
        weatherIcon.innerHTML = iconHtml;
        
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
    
    // Обновляем умные напоминания
    if (smartReminders) {
        smartReminders.updateReminder(data, forecastData);
    }
}

function updateMobileForecastData(forecastData) {
    const forecastContainer = document.getElementById('mobile-forecast');
    if (!forecastContainer || !forecastData?.list) return;
    
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
        
        let forecastHTML = '';
        Object.values(dailyForecasts).forEach(dayData => {
            forecastHTML += `
                <div class="mobile-forecast-item">
                    <div class="mobile-forecast-day">${dayData.day}</div>
                    <div class="mobile-forecast-temp">${dayData.temp}°</div>
                    <div class="mobile-forecast-desc">${dayData.weatherDesc}</div>
                </div>
            `;
        });
        
        forecastContainer.innerHTML = forecastHTML;
        
    } catch (error) {
        console.log('Ошибка обновления прогноза:', error);
        forecastContainer.innerHTML = '<div class="mobile-forecast-item">—</div>'.repeat(5);
    }
}

function updateMobileHourlyData(forecastData) {
    const hourlyContainer = document.getElementById('mobile-hourly');
    if (!hourlyContainer || !forecastData?.list) return;
    
    try {
        const hourlyItems = forecastData.list.slice(0, 8);
        let hourlyHTML = '';
        
        hourlyItems.forEach((hour, index) => {
            const time = new Date(hour.dt * 1000);
            const timeString = index === 0 ? 'Сейчас' : formatTime(time);
            const temp = Math.round(hour.main.temp);
            const weatherDesc = getShortWeatherDescription(hour.weather[0].icon);
            
            hourlyHTML += `
                <div class="mobile-hourly-item">
                    <div class="mobile-hourly-time">${timeString}</div>
                    <div class="mobile-hourly-temp">${temp}°</div>
                    <div class="mobile-hourly-desc">${weatherDesc}</div>
                </div>
            `;
        });
        
        hourlyContainer.innerHTML = hourlyHTML;
        
    } catch (error) {
        console.log('Ошибка обновления почасового прогноза:', error);
        hourlyContainer.innerHTML = '<div class="mobile-hourly-item">—</div>'.repeat(8);
    }
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

function updateMobileAirQualityData(airQualityData) {
    const aqiElement = document.getElementById('mobile-aqi');
    const aqiLabel = document.getElementById('mobile-aqi-label');
    
    if (!aqiElement || !aqiLabel || !airQualityData?.list?.[0]) return;
    
    try {
        const aqi = airQualityData.list[0].main.aqi;
        const airQualityInfo = getAirQualityText(aqi);
        
        aqiElement.innerHTML = `
            <div class="mobile-aqi-text ${airQualityInfo.class}">
                ${airQualityInfo.text}
            </div>
        `;
        
        aqiLabel.textContent = 'Качество воздуха';
        
    } catch (error) {
        console.log('Ошибка обновления качества воздуха:', error);
        aqiElement.innerHTML = `
            <div class="mobile-aqi-text aqi-moderate">
                Нет данных
            </div>
        `;
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
    
    if (isChristmasTime) {
        glowClass = 'weather-glow-christmas';
    } else if (isNight) {
        glowClass = 'weather-glow-night';
    } else if (isMorning) {
        glowClass = 'weather-glow-morning';
    } else if (isEvening) {
        glowClass = 'weather-glow-evening';
    }
    
    switch(weatherMain) {
        case 'rain':
            if (weatherDesc.includes('light') || weatherDesc.includes('drizzle')) {
                glowClass = 'weather-glow-drizzle';
            } else {
                glowClass = 'weather-glow-rain';
            }
            break;
            
        case 'snow':
            if (weatherDesc.includes('light')) {
                glowClass = 'weather-glow-snowfall';
            } else {
                glowClass = 'weather-glow-snow';
            }
            break;
            
        case 'thunderstorm':
            glowClass = 'weather-glow-thunderstorm';
            break;
            
        case 'clouds':
            if (weatherDesc.includes('broken') || weatherDesc.includes('few')) {
                glowClass = isNight ? 'weather-glow-night' : 'weather-glow-clouds';
            } else {
                glowClass = 'weather-glow-overcast';
            }
            break;
            
        case 'clear':
            glowClass = isNight ? 'weather-glow-night' : 'weather-glow-sunny';
            break;
            
        case 'mist':
        case 'fog':
        case 'haze':
            glowClass = 'weather-glow-mist';
            break;
    }
    
    mobileCard.classList.add(glowClass);
}

// Функции тем
function updateThemeByWeather(weatherMain, sys) {
    if (currentTheme !== 'dynamic') return;

    const now = new Date();
    const currentTime = now.getTime();
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
    }

    if (savedTheme) {
        currentTheme = savedTheme;
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(savedTheme);
    }
}

// Геолокация
function getUserLocation() {
    if (!navigator.onLine) {
        showError('NO_INTERNET');
        return;
    }
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                getWeatherByCoords(lat, lng);
            },
            error => {
                console.log('Ошибка геолокации:', error);
                showError('LOCATION_ERROR');
                const fallbackLat = 59.9343;
                const fallbackLng = 30.3351;
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
        showError('LOCATION_ERROR');
        const fallbackLat = 59.9343;
        const fallbackLng = 30.3351;
        getWeatherByCoords(fallbackLat, fallbackLng);
    }
}

// Навигация
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
            if (forecastCards[1]) {
                forecastCards[1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            break;
            
        case 'solar':
            window.location.href = 'solar.html';
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

// Применение настроек
function applyTemperatureUnits() {
    const savedUnits = localStorage.getItem('weatherUnits') || 'celsius';
    currentUnits = savedUnits;
    
    if (currentCityData) {
        updateMobileWeather(currentCityData);
    }
}

function applyLightingFromSettings() {
    const savedColor = localStorage.getItem('weatherLighting') || 'green';
    const body = document.body;
    
    body.classList.remove(
        'accent-neutral',
        'accent-green', 'accent-warm', 'accent-white', 
        'accent-blue', 'accent-pink', 'accent-orange', 'accent-red'
    );
    
    body.classList.add(`accent-${savedColor}`);
}

// Система умных напоминаний (исправленная)
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
        const currentWeather = weatherData.weather[0].main.toLowerCase();
        
        // Обновляем время последнего обновления
        this.lastUpdate = now;
        
        // Проверка снега с высоким приоритетом
        const snowProbability = this.calculateSnowProbability(forecastData);
        if (snowProbability.high && this.isRelevantTimeForSnow(currentHour)) {
            return this.createSnowReminder(snowProbability);
        }
        
        // Проверка дождя
        const rainProbability = this.calculateRainProbability(forecastData);
        if (rainProbability.high && this.isRelevantTimeForRain(currentHour)) {
            return this.createRainReminder(rainProbability);
        }
        
        // Проверка рассвета/заката
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
        let snowChance = 0;
        let snowCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            const description = hour.weather[0].description.toLowerCase();
            
            if (weather.includes('snow') || description.includes('snow')) {
                snowCount++;
            }
            if (hour.main.temp <= 2 && (weather.includes('rain') || description.includes('shower'))) {
                snowCount += 0.5;
            }
        });

        return {
            high: snowCount >= 2,
            medium: snowCount >= 1,
            snowCount: snowCount
        };
    }

    calculateRainProbability(forecastData) {
        const next12Hours = forecastData.list.slice(0, 4);
        let rainChance = 0;
        let rainCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            if (weather.includes('rain') || weather.includes('drizzle')) {
                rainCount++;
            }
            if (hour.pop) {
                rainChance = Math.max(rainChance, hour.pop * 100);
            }
        });

        return {
            high: rainCount >= 2 || rainChance > 60,
            medium: rainCount >= 1 || rainChance > 30,
            chance: rainChance,
            rainCount: rainCount
        };
    }

    isRelevantTimeForSnow(currentHour) {
        return (currentHour >= 6 && currentHour <= 14);
    }

    isRelevantTimeForRain(currentHour) {
        return (currentHour >= 6 && currentHour <= 10) || 
               (currentHour >= 16 && currentHour <= 20);
    }

    getSunTimes(weatherData) {
        return {
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000)
        };
    }

    isTimeForSunriseReminder(currentHour, sunrise) {
        const sunriseHour = sunrise.getHours();
        // Исправлено: с 12 часов до 1 часа перед рассветом
        return currentHour >= (sunriseHour - 1) && currentHour < sunriseHour;
    }

    isTimeForSunsetReminder(currentHour, sunset) {
        const sunsetHour = sunset.getHours();
        // Исправлено: с 12 часов до 1 часа перед закатом
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
        const messages = [
            "Возьмите зонт",
            "Ожидаются осадки",
            "Не забудьте зонтик!"
        ];
        
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
            time: this.getNextUpdateTime(),
            className: '',
            icon: 'sun'
        };
    }

    formatTime(date) {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    getNextUpdateTime() {
        if (!this.lastUpdate) return 'Обновление: --:--';
        const nextUpdate = new Date(this.lastUpdate.getTime()); 
        return `Обновление: ${this.formatTime(nextUpdate)}`;
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
        const iconSvg = this.getReminderIcon(iconType);
        const iconContainer = this.reminderElement.querySelector('.reminder-icon');
        if (iconContainer) {
            iconContainer.innerHTML = iconSvg;
        }
    }

    getReminderIcon(iconType) {
        const icons = {
            umbrella: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-umbrella"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 12a8 8 0 0 1 16 0z" /><path d="M12 12v6a2 2 0 0 0 4 0" /></svg>
            `,
            sunrise: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2v8"></path>
                    <path d="m4.93 10.93 1.41 1.41"></path>
                    <path d="M2 18h2"></path>
                    <path d="M20 18h2"></path>
                    <path d="m19.07 10.93-1.41 1.41"></path>
                    <path d="M22 22H2"></path>
                    <path d="m8 6 4-4 4 4"></path>
                    <path d="M16 18a4 4 0 0 0-8 0"></path>
                </svg>
            `,
            snow: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-snowflake"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 4l2 1l2 -1" /><path d="M12 2v6.5l3 1.72" /><path d="M17.928 6.268l.134 2.232l1.866 1.232" /><path d="M20.66 7l-5.629 3.25l.01 3.458" /><path d="M19.928 14.268l-1.866 1.232l-.134 2.232" /><path d="M20.66 17l-5.629 -3.25l-2.99 1.738" /><path d="M14 20l-2 -1l-2 1" /><path d="M12 22v-6.5l-3 -1.72" /><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232" /><path d="M3.34 17l5.629 -3.25l-.01 -3.458" /><path d="M4.072 9.732l1.866 -1.232l.134 -2.232" /><path d="M3.34 7l5.629 3.25l2.99 -1.738" /></svg>
            `,
            sunset: `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-sunset"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7a4 4 0 0 1 8 0" /><path d="M3 21l18 0" /><path d="M12 3v6l3 -3m-6 0l3 3" /></svg>
            `,
            sun: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
            `
        };
        
        return icons[iconType] || icons.sun;
    }

    hideReminder() {
        if (this.reminderElement) {
            this.reminderElement.style.display = 'none';
        }
    }

    updateReminder(weatherData, forecastData) {
        const reminder = this.analyzeWeatherForReminders(weatherData, forecastData);
        if (reminder) {
            this.showReminder(reminder);
        } else {
            this.hideReminder();
        }
    }
}

// Инициализация
const smartReminders = new SmartReminders();

// Загрузка приложения
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    applyTemperatureUnits();
    applyLightingFromSettings();
    getUserLocation();

    // Слушатели событий
    window.addEventListener('online', () => {
        hideError();
        getUserLocation();
    });
    
    window.addEventListener('offline', () => {
        showError('NO_INTERNET');
    });
    
    // Закрытие ошибки по клику на оверлей
    document.addEventListener('click', function(event) {
        const errorOverlay = document.getElementById('errorOverlay');
        if (errorOverlay && event.target === errorOverlay) {
            hideError();
        }
    });
    
    // Закрытие ошибки по Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideError();
        }
    });

    // Убираем стандартный фокус у кнопок
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
        });
        
        btn.addEventListener('focus', function() {
            this.blur();
        });
    });

    // PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }
});

// Обновление всех температур
function updateAllTemperatures() {
    if (currentCityData) {
        updateMobileWeather(currentCityData);
    }
}