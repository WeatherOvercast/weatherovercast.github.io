// Конфигурация API
const API_KEY = '9b20db828ed34621c416eb444ec5cc3f';
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

// ERROR_TYPES для системы ошибок - добавляем, если их нет
const ERROR_TYPES = {
    'NO_INTERNET': { title: 'Нет соединения', message: 'Проверьте подключение к интернету', icon: 'no-wifi', color: '#ff6b6b' },
    'SERVER_ERROR': { title: 'Ошибка сервера', message: 'Сервер временно недоступен', icon: 'server', color: '#ff9e6d' },
    'API_LIMIT': { title: 'Лимит запросов', message: 'Слишком много запросов, попробуйте позже', icon: 'limit', color: '#ffe66d' },
    'MAINTENANCE': { title: 'Техработы', message: 'Сервер на обслуживании с 20:00 до 23:00', icon: 'maintenance', color: '#69a3dd' },
    'LOCATION_ERROR': { title: 'Ошибка геолокации', message: 'Не удалось определить местоположение', icon: 'location', color: '#ff9e6d' }
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
    if (!errorOverlay) {
        console.error('errorOverlay не найден');
        return;
    }
    
    const errorTitle = errorOverlay.querySelector('.error-title');
    const errorMessage = errorOverlay.querySelector('.error-message');
    const errorIcon = errorOverlay.querySelector('.error-icon svg');
    const errorCard = errorOverlay.querySelector('.error-card');
    
    const error = ERROR_TYPES[errorType] || ERROR_TYPES.SERVER_ERROR;
    
    // Обновляем контент
    if (errorTitle) errorTitle.textContent = error.title;
    if (errorMessage) errorMessage.textContent = customMessage || error.message;
    
    // Обновляем иконку
    if (errorIcon) errorIcon.innerHTML = getErrorIcon(error.icon);
    
    // Обновляем цвет
    if (errorCard) {
        errorCard.style.setProperty('--error-color', error.color);
        errorCard.style.boxShadow = `
            0 25px 50px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 0 20px ${error.color}30
        `;
    }
    
    // Показываем
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

// Модифицированная основная функция получения погоды с кешем
async function getWeatherByCoords(lat, lon) {
    // Проверяем наличие кеша
    const cache = weatherCache ? weatherCache.loadFromCache() : null;
    
    // Если есть кеш, сразу показываем данные
    if (cache && cache.weather) {
        console.log('📋 Показываем кешированные данные');
        if (weatherCache) {
            weatherCache.displayCachedData();
        }
    } else {
        console.log('⏳ Кеша нет, показываем заглушки');
    }

    if (!navigator.onLine) {
        console.log('❌ Нет интернета, используем только кеш');
        if (!cache) {
            showError('NO_INTERNET');
        } else if (weatherCache) {
            showOfflineNotification('Используются сохраненные данные');
        }
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        if (weatherCache) {
            weatherCache.showLoading();
        }
        
        const controller = new AbortController();
        const timeoutDuration = 15000;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutDuration);
        
        try {
            const [weatherData, forecastData, airQualityData] = await Promise.all([
                fetchWithTimeout(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`, {
                    signal: controller.signal,
                    timeout: 7000
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
                
                // Сохраняем новые данные в кеш
                if (weatherCache) {
                    weatherCache.saveToCache(weatherData, forecastData, airQualityData, weatherData.name, { lat, lon });
                }
                
                await updateWeatherData(weatherData, forecastData, airQualityData);

                    console.log('%c✨ Актуалочка подъехала! ✨', 'background: #4ecdc4; color: #000; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    console.log(`   Температура: ${Math.round(weatherData.main.temp)}°C`);
    console.log(`   Город: ${weatherData.name}`);
    console.log(`   Время: ${new Date().toLocaleTimeString()}`);
                
                // Прячем индикатор с анимацией
                if (weatherCache) {
                    weatherCache.hideLoadingWithAnimation();
                }
                
                if (!isFirstLoad) {
                    // iosNotifications.success('Обновлено', `Погода для ${weatherData.name}`, 2000);
                }
            } else {
                throw new Error(weatherData.message || 'Неизвестная ошибка API');
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            // В случае ошибки, если есть кеш, продолжаем показывать его
            if (cache && cache.weather && weatherCache) {
                console.log('⚠️ Ошибка получения данных, используем кеш');
                weatherCache.hideLoadingWithAnimation();
                
                // Показываем уведомление об использовании кеша
                showOfflineNotification('Используются сохраненные данные');
            } else {
                // Если нет кеша, показываем ошибку
                if (fetchError.name === 'AbortError') {
                    const now = new Date();
                    const currentHour = now.getHours();
                    
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
                if (weatherCache) {
                    weatherCache.hideLoadingWithAnimation();
                }
            }
        }
        
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        if (weatherCache) {
            weatherCache.hideLoadingWithAnimation();
        }
    }
}

// Модифицированная функция получения погоды по городу с кешем
async function getWeatherByCity(city) {
    // Проверяем наличие кеша
    const cache = weatherCache ? weatherCache.loadFromCache() : null;
    
    // Если есть кеш для этого города, сразу показываем данные
    if (cache && cache.weather && cache.city.toLowerCase() === city.toLowerCase() && weatherCache) {
        console.log('📋 Показываем кешированные данные для города', city);
        weatherCache.displayCachedData();
    }

    if (!navigator.onLine) {
        if (!cache) {
            showError('NO_INTERNET');
        } else if (weatherCache) {
            showOfflineNotification('Используются сохраненные данные');
        }
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        if (weatherCache) {
            weatherCache.showLoading();
        }
        
        const weatherResponse = await fetchWithTimeout(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=ru`,
            { timeout: 7000 }
        );
        
        const weatherData = await weatherResponse.json();

        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            currentCity = weatherData.name;
            const [forecastData, airQualityData] = await Promise.all([
                getForecast(weatherData.coord.lat, weatherData.coord.lon),
                getAirQuality(weatherData.coord.lat, weatherData.coord.lon)
            ]);

            // Сохраняем в кеш
            if (weatherCache) {
                weatherCache.saveToCache(
                    weatherData, 
                    forecastData, 
                    airQualityData, 
                    weatherData.name, 
                    { lat: weatherData.coord.lat, lon: weatherData.coord.lon }
                );
            }

            await updateWeatherData(weatherData, forecastData, airQualityData);

                console.log('%c✨ Актуалочка подъехала! ✨', 'background: #4ecdc4; color: #000; font-size: 14px; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    console.log(`   Температура: ${Math.round(weatherData.main.temp)}°C`);
    console.log(`   Город: ${weatherData.name}`);
    console.log(`   Время: ${new Date().toLocaleTimeString()}`);
            
            // Прячем индикатор с анимацией
            if (weatherCache) {
                weatherCache.hideLoadingWithAnimation();
            }
            
            if (!isFirstLoad) {
                // iosNotifications.success('Город изменен', `Теперь смотрим ${weatherData.name}`, 2000);
            }
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        
        // Прячем индикатор
        if (weatherCache) {
            weatherCache.hideLoadingWithAnimation();
        }
        
        if (error.name === 'AbortError') {
            const now = new Date();
            const currentHour = now.getHours();
            
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

// Геолокация с поддержкой кеша
function getUserLocation() {
    if (!navigator.onLine) {
        // Если нет интернета, пытаемся загрузить из кеша
        const cache = weatherCache ? weatherCache.loadFromCache() : null;
        if (cache && cache.coords && weatherCache) {
            console.log('📍 Офлайн: используем кешированные координаты');
            // Пытаемся показать данные из кеша
            if (weatherCache.displayCachedData()) {
                showOfflineNotification('Вы офлайн. Показаны сохраненные данные');
            } else {
                showError('NO_INTERNET');
            }
        } else {
            showError('NO_INTERNET');
        }
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
                
                // Пробуем загрузить из кеша при ошибке геолокации
                const cache = weatherCache ? weatherCache.loadFromCache() : null;
                if (cache && cache.coords && weatherCache) {
                    console.log('📍 Ошибка геолокации, используем кешированные координаты');
                    getWeatherByCoords(cache.coords.lat, cache.coords.lon);
                } else {
                    showError('LOCATION_ERROR');
                    const fallbackLat = 59.9343;
                    const fallbackLng = 30.3351;
                    getWeatherByCoords(fallbackLat, fallbackLng);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 600000
            }
        );
    } else {
        console.log('Геолокация не поддерживается браузером');
        
        // Пробуем загрузить из кеша
        const cache = weatherCache ? weatherCache.loadFromCache() : null;
        if (cache && cache.coords && weatherCache) {
            console.log('📍 Используем кешированные координаты');
            getWeatherByCoords(cache.coords.lat, cache.coords.lon);
        } else {
            showError('LOCATION_ERROR');
            const fallbackLat = 59.9343;
            const fallbackLng = 30.3351;
            getWeatherByCoords(fallbackLat, fallbackLng);
        }
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

// Система умных напоминаний (редач)
class SmartReminders {
    constructor() {
        this.reminderElement = document.getElementById('weather-reminder');
        this.titleElement = document.getElementById('reminder-title');
        this.messageElement = document.getElementById('reminder-message');
        this.timeElement = document.getElementById('reminder-time');
        this.currentReminder = null;
        this.lastUpdate = null;
        this.lastReminderTime = null;
        this.REMINDER_COOLDOWN = 30 * 60 * 1000; // 30 минут кулдаун
    }

    analyzeWeatherForReminders(weatherData, forecastData) {
        if (!weatherData || !forecastData) return null;

        const now = new Date();
        
        // Проверяем кулдаун
        if (this.lastReminderTime && 
            (now - this.lastReminderTime) < this.REMINDER_COOLDOWN) {
            return null;
        }
        
        // Получаем прогноз на ближайший час
        const nextHourData = this.getWeatherForNextHour(forecastData);
        
        // Обновляем время последнего обновления
        this.lastUpdate = now;
        
        // Проверка снега в ближайший час
        if (nextHourData && this.willSnowInNextHour(nextHourData)) {
            return this.createSnowReminder();
        }
        
        // Проверка дождя в ближайший час
        if (nextHourData && this.willRainInNextHour(nextHourData)) {
            return this.createRainReminder(nextHourData);
        }
        
        // Проверка рассвета/заката в ближайший час
        const sunTimes = this.getSunTimes(weatherData);
        const timeToSunrise = this.getHoursUntil(sunTimes.sunrise);
        const timeToSunset = this.getHoursUntil(sunTimes.sunset);
        
        if (timeToSunrise >= 0 && timeToSunrise < 1) {
            return this.createSunriseReminder(sunTimes.sunrise);
        }
        
        if (timeToSunset >= 0 && timeToSunset < 1) {
            return this.createSunsetReminder(sunTimes.sunset);
        }
        
        return this.createDefaultReminder(weatherData);
    }

    getWeatherForNextHour(forecastData) {
        if (!forecastData?.list) return null;
        
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
        
        // Ищем ближайший прогноз к следующему часу
        let closestForecast = null;
        let smallestDiff = Infinity;
        
        forecastData.list.forEach(item => {
            const forecastTime = new Date(item.dt * 1000);
            const timeDiff = Math.abs(forecastTime - nextHour);
            
            if (timeDiff < smallestDiff && timeDiff <= 90 * 60 * 1000) { // В пределах 1.5 часов
                smallestDiff = timeDiff;
                closestForecast = item;
            }
        });
        
        return closestForecast;
    }

    willSnowInNextHour(hourData) {
        if (!hourData) return false;
        
        const weather = hourData.weather[0].main.toLowerCase();
        const description = hourData.weather[0].description.toLowerCase();
        
        return weather.includes('snow') || 
               description.includes('snow') ||
               (hourData.main.temp <= 2 && weather.includes('rain'));
    }

    willRainInNextHour(hourData) {
        if (!hourData) return false;
        
        const weather = hourData.weather[0].main.toLowerCase();
        const pop = hourData.pop || 0;
        
        return weather.includes('rain') || 
               weather.includes('drizzle') ||
               pop > 0.3; // Вероятность осадков > 30%
    }

    getSunTimes(weatherData) {
        return {
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000)
        };
    }

    getHoursUntil(targetTime) {
        const now = new Date();
        const diffMs = targetTime - now;
        return diffMs / (1000 * 60 * 60); // Разница в часах
    }

    createSnowReminder() {
        const messages = [
            "Наслаждайтесь снегом! С Новым Годом!",
            "Идеальное время для снежных забав",
            "Можно слепить снеговика",
            "Прекрасный снежный день!"
        ];
        
        this.lastReminderTime = new Date();
        
        return {
            type: 'snow',
            title: 'Возможен снег',
            message: messages[Math.floor(Math.random() * messages.length)],
            time: `Снегопад ожидается`,
            className: 'snow-reminder important',
            icon: 'snow'
        };
    }

    createRainReminder(hourData) {
        const pop = hourData.pop ? Math.round(hourData.pop * 100) : 50;
        const messages = [
            "Возьмите зонт",
            "Ожидаются осадки",
            "Не забудьте зонтик!"
        ];
        
        const intensity = pop > 60 ? "сильный" : "небольшой";
        
        this.lastReminderTime = new Date();
        
        return {
            type: 'rain',
            title: `Возможен ${intensity} дождь`,
            message: messages[Math.floor(Math.random() * messages.length)],
            time: `Вероятность: ${pop}%`,
            className: 'rain-warning important',
            icon: 'umbrella'
        };
    }

    createSunriseReminder(sunrise) {
        const sunriseTime = this.formatTime(sunrise);
        
        this.lastReminderTime = new Date();
        
        return {
            type: 'sunrise',
            title: 'Рассвет через час',
            message: 'Идеальное время для утреннего кофе или чая',
            time: `В ${sunriseTime}`,
            className: 'sunrise-reminder',
            icon: 'sunrise'
        };
    }

    createSunsetReminder(sunset) {
        const sunsetTime = this.formatTime(sunset);
        
        this.lastReminderTime = new Date();
        
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
        // Только если нет других напоминаний
        if (this.lastReminderTime && 
            (new Date() - this.lastReminderTime) < 2 * 60 * 60 * 1000) {
            return null; // Кулдаун 2 часа для дефолтных напоминаний
        }
        
        const descriptions = {
            'clear': 'Сходите в парк, подышите свежим воздухом',
            'clouds': 'Можете остаться дома или погулять',
            'rain': 'Не забудьте зонт',
            'snow': 'Наслаждайтесь снегом. С Новым Годом!',
            'thunderstorm': 'Оставайтесь дома'
        };
        
        const weatherType = weatherData.weather[0].main.toLowerCase();
        const message = descriptions[weatherType] || 'Хорошего дня!';
        
        this.lastReminderTime = new Date();
        
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
            umbrella: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 12a8 8 0 0 1 16 0z" /><path d="M12 12v6a2 2 0 0 0 4 0" /></svg>`,
            sunrise: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7a4 4 0 0 1 8 0" /><path d="M3 21l18 0" /><path d="M12 9v-6l3 3m-6 0l3 -3" /></svg>`,
            snow: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 4l2 1l2 -1" /><path d="M12 2v6.5l3 1.72" /><path d="M17.928 6.268l.134 2.232l1.866 1.232" /><path d="M20.66 7l-5.629 3.25l.01 3.458" /><path d="M19.928 14.268l-1.866 1.232l-.134 2.232" /><path d="M20.66 17l-5.629 -3.25l-2.99 1.738" /><path d="M14 20l-2 -1l-2 1" /><path d="M12 22v-6.5l-3 -1.72" /><path d="M6.072 17.732l-.134 -2.232l-1.866 -1.232" /><path d="M3.34 17l5.629 -3.25l-.01 -3.458" /><path d="M4.072 9.732l1.866 -1.232l.134 -2.232" /><path d="M3.34 7l5.629 3.25l2.99 -1.738" /></svg>`,
            sunset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 17h1m16 0h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7m-9.7 5.7a4 4 0 0 1 8 0" /><path d="M3 21l18 0" /><path d="M12 3v6l3 -3m-6 0l3 3" /></svg>`,
            sun: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="4" /><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" /></svg>`
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

// Инициализация (меняем const на let)
let smartReminders = new SmartReminders();

// Инициализация системы кеширования
if (typeof WeatherCacheSystem !== 'undefined') {
    // weatherCache уже создан в cache-system.js, просто проверяем что он есть
    if (weatherCache) {
        console.log('✅ Система кеширования доступна');
        
        // Пытаемся сразу показать данные из кеша
        setTimeout(() => {
            if (weatherCache && !currentCityData) {
                const cache = weatherCache.loadFromCache();
                if (cache && cache.weather) {
                    console.log('📋 Загружаем данные из кеша при старте');
                    weatherCache.displayCachedData();
                }
            }
        }, 100);
    } else {
        console.warn('⚠️ Система кеширования не инициализирована');
    }
} else {
    console.warn('⚠️ Система кеширования не найдена');
}

// Загрузка приложения
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    applyTemperatureUnits();
    applyLightingFromSettings();
    getUserLocation();

    // Слушатели событий
    window.addEventListener('online', () => {
        hideError();
        // При возвращении интернета обновляем данные
        if (currentCityData) {
            // Если есть текущий город, обновляем по его координатам
            getWeatherByCoords(currentCityData.coord.lat, currentCityData.coord.lon);
        } else {
            // Иначе запрашиваем геолокацию
            getUserLocation();
        }
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
        navigator.serviceWorker.register('sw.js')
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

// Функция для показа уведомления об использовании кеша
function showOfflineNotification(message) {
    // Проверяем, есть ли уже такое уведомление
    if (document.querySelector('.cache-notification')) return;
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'cache-notification';
    notification.textContent = message;
    
    // Добавляем стили для уведомления, если их еще нет
    if (!document.getElementById('cache-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'cache-notification-styles';
        style.textContent = `
            .cache-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(26, 26, 26, 0.9);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #ffffff;
                padding: 10px 24px;
                border-radius: 30px;
                font-size: 14px;
                font-weight: 500;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 9999;
                animation: slideDown 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
                pointer-events: none;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translate(-50%, -20px);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, 0);
                }
            }
            
            @keyframes fadeOut {
                to {
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// ========== ЭФФЕКТЫ ЗАБРОШЕННОСТИ ==========

// Случайные сбои данных
function randomDataCorruption() {
    const elements = {
        temperature: document.getElementById('mobile-temperature'),
        humidity: document.getElementById('mobile-humidity'),
        wind: document.getElementById('mobile-wind'),
        pressure: document.getElementById('mobile-pressure'),
        feels: document.getElementById('mobile-feels-like'),
        city: document.getElementById('mobile-city'),
        description: document.getElementById('mobile-description'),
        date: document.getElementById('mobile-date')
    };
    
    // Сохраняем оригинальные значения
    if (!window.originalValues) {
        window.originalValues = {};
        for (let [key, el] of Object.entries(elements)) {
            if (el) window.originalValues[key] = el.textContent;
        }
    }
    
    setInterval(() => {
        // 15% шанс сбоя каждые 5 секунд
        if (Math.random() < 0.15) {
            const glitchElements = ['temperature', 'humidity', 'wind', 'pressure'];
            const randomElement = glitchElements[Math.floor(Math.random() * glitchElements.length)];
            const el = elements[randomElement];
            
            if (el) {
                const originalText = window.originalValues[randomElement];
                
                // Показываем битые данные
                const corruptData = [
                    'ERR',
                    '---',
                    'NaN',
                    '∞',
                    '000',
                    '???',
                    originalText ? originalText.replace(/\d/g, () => Math.floor(Math.random() * 10)) : 'ERR'
                ];
                
                el.textContent = corruptData[Math.floor(Math.random() * corruptData.length)];
                el.style.color = '#ff3333';
                el.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
                
                // Восстанавливаем через 1-2 секунды
                setTimeout(() => {
                    if (originalText) {
                        el.textContent = originalText;
                        el.style.color = '';
                        el.style.textShadow = '';
                    }
                }, 1000 + Math.random() * 2000);
            }
        }
    }, 5000);
}

// Случайные сбои прогресс-баров
function glitchProgressBars() {
    setInterval(() => {
        if (Math.random() < 0.2) {
            const bars = document.querySelectorAll('.mobile-progress-fill');
            bars.forEach(bar => {
                const originalWidth = bar.style.width;
                bar.style.width = (Math.random() * 100) + '%';
                bar.style.opacity = '0.3';
                
                setTimeout(() => {
                    bar.style.width = originalWidth;
                    bar.style.opacity = '1';
                }, 800 + Math.random() * 1500);
            });
        }
    }, 4000);
}

// Случайное отключение карточек
function corruptCards() {
    setInterval(() => {
        const cards = document.querySelectorAll('.mobile-detail-card, .mobile-additional-card');
        
        if (Math.random() < 0.1) {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];
            
            if (randomCard) {
                randomCard.style.transform = `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 10}px)`;
                randomCard.style.filter = 'brightness(1.5) contrast(0.8)';
                randomCard.style.transition = 'all 0.1s ease';
                
                setTimeout(() => {
                    randomCard.style.transform = '';
                    randomCard.style.filter = '';
                    randomCard.style.transition = 'all 0.3s ease';
                }, 200);
            }
        }
    }, 3000);
}

// Текст "последнее обновление: никогда"
function showLastUpdateNever() {
    const dateElement = document.getElementById('mobile-date');
    if (dateElement && Math.random() < 0.05) {
        const originalDate = dateElement.textContent;
        dateElement.textContent = 'Обновлено: никогда';
        dateElement.style.color = '#ff4444';
        dateElement.style.fontSize = '0.8rem';
        
        setTimeout(() => {
            dateElement.textContent = originalDate;
            dateElement.style.color = '';
            dateElement.style.fontSize = '';
        }, 2000);
    }
}

// Инициализация эффектов заброшенности
function initAbandonedEffects() {
    console.log('%c⚠️ СИСТЕМА НЕСТАБИЛЬНА ⚠️', 'color: red; font-size: 20px;');
    console.log('%cПоследнее обслуживание: 6 месяцев назад', 'color: orange;');
    console.log('%cРекомендуется отключение сервера...', 'color: #ff4444;');
    
    randomDataCorruption();
    glitchProgressBars();
    corruptCards();
    
    setInterval(showLastUpdateNever, 10000);
    
    // Случайный сбой всей страницы
    setInterval(() => {
        if (Math.random() < 0.03) {
            document.body.style.transform = `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 20}px)`;
            document.body.style.filter = 'hue-rotate(180deg) brightness(2)';
            
            setTimeout(() => {
                document.body.style.transform = '';
                document.body.style.filter = '';
            }, 100);
        }
    }, 15000);
}

// Запуск после загрузки
document.addEventListener('DOMContentLoaded', () => {
    // Задержка для инициализации основных данных
    setTimeout(initAbandonedEffects, 3000);
});

// Переопределяем console.log для эффекта "глючности"
const originalLog = console.log;
console.log = function(...args) {
    if (Math.random() < 0.1) {
        args = args.map(arg => 
            typeof arg === 'string' ? arg.replace(/[а-яё]/gi, c => 
                Math.random() < 0.2 ? '?' : c
            ) : arg
        );
    }
    originalLog.apply(console, args);
};

// ========== ЭКСТРЕМАЛЬНЫЕ ГЛЮКИ ==========

// Случайные черные буквы в названии города
function corruptCityName() {
    const cityElement = document.getElementById('mobile-city');
    if (!cityElement) return;
    
    if (!window.originalCityName) {
        window.originalCityName = cityElement.textContent;
    }
    
    setInterval(() => {
        if (Math.random() < 0.3) {
            const originalName = window.originalCityName;
            let corruptedName = '';
            
            for (let i = 0; i < originalName.length; i++) {
                if (Math.random() < 0.15) {
                    corruptedName += '█'; // Черный квадрат вместо буквы
                } else if (Math.random() < 0.1) {
                    corruptedName += ''; // Пропущенная буква
                } else if (Math.random() < 0.05) {
                    corruptedName += '?'; // Вопросительный знак
                } else {
                    corruptedName += originalName[i];
                }
            }
            
            cityElement.textContent = corruptedName;
            
            setTimeout(() => {
                if (window.originalCityName) {
                    cityElement.textContent = window.originalCityName;
                }
            }, 2000 + Math.random() * 3000);
        }
    }, 4000);
}

// Случайные исчезающие заголовки
function vanishingTitles() {
    const titles = document.querySelectorAll('.mobile-card-title');
    
    setInterval(() => {
        titles.forEach((title, index) => {
            if (Math.random() < 0.2) {
                // Сохраняем оригинальный текст
                if (!title.dataset.original) {
                    title.dataset.original = title.textContent;
                }
                
                const effects = [
                    () => { title.style.opacity = '0'; },
                    () => { 
                        title.style.opacity = '1';
                        title.style.color = '#ff0000';
                        title.style.textShadow = '0 0 20px rgba(255,0,0,0.8)';
                    },
                    () => { 
                        title.textContent = 'ERR_' + Math.random().toString(36).substring(7).toUpperCase();
                        title.style.color = '#ff4444';
                    },
                    () => { title.style.letterSpacing = '10px'; }
                ];
                
                effects[Math.floor(Math.random() * effects.length)]();
                
                setTimeout(() => {
                    title.style.opacity = '';
                    title.style.color = '';
                    title.style.textShadow = '';
                    title.style.letterSpacing = '';
                    if (title.dataset.original) {
                        title.textContent = title.dataset.original;
                    }
                }, 1500);
            }
        });
    }, 5000);
}

// Случайные дыры с анимацией "затягивания"
function createRandomHoles() {
    setInterval(() => {
        if (Math.random() < 0.15) {
            const cards = document.querySelectorAll('.mobile-detail-card, .mobile-additional-card');
            const randomCard = cards[Math.floor(Math.random() * cards.length)];
            
            if (randomCard && !randomCard.querySelector('.random-hole')) {
                const hole = document.createElement('div');
                hole.className = 'random-hole';
                hole.style.cssText = `
                    position: absolute;
                    width: ${10 + Math.random() * 30}px;
                    height: ${10 + Math.random() * 30}px;
                    background: radial-gradient(circle, #000000 50%, transparent 70%);
                    border-radius: 50%;
                    top: ${Math.random() * 80}%;
                    left: ${Math.random() * 80}%;
                    box-shadow: 0 0 20px rgba(0,0,0,0.9);
                    animation: holeAppear 2s ease-out forwards;
                    z-index: 100;
                    pointer-events: none;
                `;
                
                randomCard.appendChild(hole);
                
                setTimeout(() => {
                    if (hole.parentNode) {
                        hole.remove();
                    }
                }, 2000);
            }
        }
    }, 3000);
}

// Добавляем анимацию появления дыр
const holeStyle = document.createElement('style');
holeStyle.textContent = `
    @keyframes holeAppear {
        0% { 
            transform: scale(0); 
            opacity: 0;
        }
        50% { 
            transform: scale(1.5); 
            opacity: 1;
        }
        100% { 
            transform: scale(1); 
            opacity: 0.7;
        }
    }
`;
document.head.appendChild(holeStyle);

// Поломка скролла в почасовом прогнозе
function breakHourlyScroll() {
    const hourlyScroll = document.querySelector('.mobile-hourly-scroll');
    if (hourlyScroll) {
        // Полностью блокируем скролл
        hourlyScroll.style.overflowX = 'hidden';
        hourlyScroll.style.overflowY = 'hidden';
        hourlyScroll.style.touchAction = 'none';
        hourlyScroll.style.pointerEvents = 'none';
        
        // Случайные сдвиги элементов
        const items = hourlyScroll.querySelectorAll('.mobile-hourly-item');
        setInterval(() => {
            items.forEach((item, index) => {
                if (Math.random() < 0.3) {
                    item.style.transform = `translateX(${(Math.random() - 0.5) * 20}px)`;
                    item.style.opacity = Math.random() < 0.5 ? '0.2' : '1';
                    
                    setTimeout(() => {
                        item.style.transform = '';
                        item.style.opacity = '';
                    }, 1000 + Math.random() * 2000);
                }
            });
        }, 2000);
    }
}

// Мигание навигации с уходом по диагонали
function breakNavigation() {
    const nav = document.querySelector('.floating-nav');
    if (nav) {
        // Случайные рывки навигации
        setInterval(() => {
            if (Math.random() < 0.2) {
                const offsetX = (Math.random() - 0.5) * 30;
                const offsetY = Math.random() * 40;
                const rotation = (Math.random() - 0.5) * 15;
                
                nav.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
                nav.style.transform = `translateX(calc(-50% + ${offsetX}px)) translateY(${offsetY}px) rotate(${rotation}deg)`;
                nav.style.opacity = '0.6';
                
                setTimeout(() => {
                    nav.style.transition = 'all 1s ease';
                    nav.style.transform = 'translateX(-50%)';
                    nav.style.opacity = '1';
                }, 500);
            }
        }, 4000);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        corruptCityName();
        vanishingTitles();
        createRandomHoles();
        breakHourlyScroll();
        breakNavigation();
        
        console.log('%c💀 СИСТЕМА НА ГРАНИ ОТКАЗА 💀', 'color: red; font-size: 16px;');
        console.log('%cОбнаружены критические повреждения интерфейса', 'color: orange;');
        console.log('%cВосстановление невозможно', 'color: #ff0000;');
    }, 2000);
});

// Добавляем глобальные глюки
setInterval(() => {
    // Случайное "зависание" всего интерфейса
    if (Math.random() < 0.05) {
        document.body.style.pointerEvents = 'none';
        document.body.style.filter = 'grayscale(0.8) brightness(0.5)';
        
        setTimeout(() => {
            document.body.style.pointerEvents = '';
            document.body.style.filter = '';
        }, 300);
    }
    
    // Случайные красные вспышки
    if (Math.random() < 0.03) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 0, 0, 0.1);
            z-index: 9999;
            pointer-events: none;
            animation: redFlash 0.5s ease-out forwards;
        `;
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 500);
    }
}, 2000);