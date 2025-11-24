// Конфигурация API
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

function getWeatherIcon(weatherCode) {
    const iconMap = {
        // Ясно
        '01d': 'sun',
        '01n': 'sun',
        
        // Переменная облачность
        '02d': 'cloud',
        '02n': 'cloud',
        
        // Облачно
        '03d': 'cloudy',
        '03n': 'cloudy',
        
        // Пасмурно
        '04d': 'cloudy',
        '04n': 'cloudy',
        
        // Дождь
        '09d': 'cloud-rain',
        '09n': 'cloud-rain',
        '10d': 'cloud-drizzle',
        '10n': 'cloud-drizzle',
        
        // Гроза
        '11d': 'cloud-lightning',
        '11n': 'cloud-lightning',
        
        // Снег
        '13d': 'cloud-snow',
        '13n': 'cloud-snow',
        
        // Туман
        '50d': 'eye',
        '50n': 'eye'
    };
    
    const iconName = iconMap[weatherCode] || 'sun';
    return `<i data-lucide="${iconName}" class="weather-icon"></i>`;
}

// Глобальные переменные
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let forecastData = null;
let airQualityData = null;
const TEMPERATURE_SHIFT = 0;

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

// ========== ФУНКЦИИ ДЛЯ ВРЕМЕНИ ==========
function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
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
    if (currentCity) {
        getWeatherByCity(currentCity);
    }
}

// ========== ФУНКЦИИ ДЛЯ ЛУНЫ ==========
// async function calculateMoonInfo() {
//     try {
//         return calculateSimpleMoonPhase();
//     } catch (error) {
//         console.log('Ошибка расчета луны:', error);
//         return {
//             phase: 'Растущая луна',
//             illumination: 45,
//             age: 7,
//             phasePercent: 45,
//             isWaning: false,
//             nextPhase: 'Первая четверть', 
//             daysToNext: 2
//         };
//     }
// }

// function calculateSimpleMoonPhase() {
//     const now = new Date();
//     const knownNewMoon = new Date('2024-12-01T06:21:00Z').getTime();
//     const currentTime = now.getTime();
//     const calculationTime = currentTime;
//     const lunarCycleMs = 29.53 * 24 * 60 * 60 * 1000;
    
//     let moonAgeDays = ((calculationTime - knownNewMoon) % lunarCycleMs) / (24 * 60 * 60 * 1000);
    
//     if (moonAgeDays < 0) {
//         moonAgeDays += 29.53;
//     }
    
//     const phase = moonAgeDays / 29.53;
//     return formatMoonPhase(phase);
// }

// function formatMoonPhase(phase) {
//     let phaseName, phasePercent, isWaning;
//     const age = Math.floor(phase * 29.53);

//     if (phase < 0.02 || phase > 0.98) {
//         phaseName = 'Новолуние';
//         phasePercent = 0;
//         isWaning = false;
//     } else if (phase < 0.25) {
//         phaseName = 'Молодая луна';
//         phasePercent = Math.round(phase * 4 * 25);
//         isWaning = false;
//     } else if (phase < 0.27) {
//         phaseName = 'Первая четверть';
//         phasePercent = 50;
//         isWaning = false;
//     } else if (phase < 0.5) {
//         phaseName = 'Растущая луна';
//         phasePercent = 50 + Math.round((phase - 0.25) * 4 * 25);
//         isWaning = false;
//     } else if (phase < 0.52) {
//         phaseName = 'Полнолуние';
//         phasePercent = 100;
//         isWaning = false;
//     } else if (phase < 0.75) {
//         phaseName = 'Убывающая луна';
//         phasePercent = 100 - Math.round((phase - 0.5) * 4 * 25);
//         isWaning = true;
//     } else if (phase < 0.77) {
//         phaseName = 'Последняя четверть';
//         phasePercent = 50;
//         isWaning = true;
//     } else {
//         phaseName = 'Старая луна';
//         phasePercent = 50 - Math.round((phase - 0.75) * 4 * 25);
//         isWaning = true;
//     }
    
//     const illumination = Math.round(Math.abs(Math.sin(2 * Math.PI * phase)) * 100);
//     const daysToNext = getDaysToNext(phase);
//     const nextPhase = getNextPhase(phaseName);
    
//     return {
//         phase: phaseName,
//         illumination: illumination,
//         age: age,
//         phasePercent: phasePercent,
//         isWaning: isWaning,
//         nextPhase: nextPhase,
//         daysToNext: daysToNext
//     };
// }

// function getDaysToNext(phase) {
//     if (phase < 0.25) return Math.round((0.25 - phase) * 29.53);
//     if (phase < 0.5) return Math.round((0.5 - phase) * 29.53);
//     if (phase < 0.75) return Math.round((0.75 - phase) * 29.53);
//     return Math.round((1 - phase) * 29.53);
// }

// function getNextPhase(currentPhase) {
//     const phases = ['Новолуние', 'Молодая луна', 'Первая четверть', 'Растущая луна', 'Полнолуние', 'Убывающая луна', 'Последняя четверть', 'Старая луна'];
//     const currentIndex = phases.indexOf(currentPhase);
//     return phases[(currentIndex + 1) % phases.length];
// }

// function updateMoonVisualization(phasePercent, isWaning) {
//     const moonPhase = document.getElementById('moon-phase');
//     if (!moonPhase) return;

//     moonPhase.style.cssText = '';
//     moonPhase.style.position = 'absolute';
//     moonPhase.style.top = '0';
//     moonPhase.style.left = '0';
//     moonPhase.style.width = '100%';
//     moonPhase.style.height = '100%';
//     moonPhase.style.borderRadius = '50%';
//     moonPhase.style.background = '#f1c40f';
//     moonPhase.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';

//     if (phasePercent === 0) {
//         moonPhase.style.clipPath = 'inset(0 0 0 100%)';
//     } else if (phasePercent === 100) {
//         moonPhase.style.clipPath = 'inset(0 0 0 0%)';
//     } else {
//         if (isWaning) {
//             moonPhase.style.clipPath = `inset(0 ${100 - phasePercent}% 0 0)`;
//         } else {
//             moonPhase.style.clipPath = `inset(0 0 0 ${100 - phasePercent}%)`;
//         }
//     }
// }

// ========== ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ О ПОГОДЕ ==========
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

async function getWeatherByCoords(lat, lon) {
    if (!navigator.onLine) {
        console.log('Нет подключения к интернету');
        iosNotifications.warning('Нет сети', 'Проверьте подключение к интернету', 4000);
        return;
    }
    
    try {
        showLoadingScreen();
        
        const controller = new AbortController();
        const timeoutDuration = 15000;
        
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeoutDuration);
        
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

            clearTimeout();

            if (weatherData.cod === 200) {
                currentCityData = weatherData;
                currentCity = weatherData.name;
                
                await updateWeatherData(weatherData, forecastData, airQualityData);
                
                if (!isFirstLoad) {
                    iosNotifications.success('Обновлено', `Погода для ${weatherData.name}`, 2000);
                }
            } else {
                throw new Error(weatherData.message || 'Неизвестная ошибка API');
            }
            
        } catch (fetchError) {
            clearTimeout();
            throw fetchError;
        }
        
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        
        let errorMessage = 'Не удалось загрузить данные';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Сервер не отвечает. Проверьте подключение';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Проблемы с подключением к серверу погоды';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = 'Ошибка сервера погоды';
        }
        
        iosNotifications.error('Ошибка', errorMessage, 4000);
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
    updateMobileWeather(data);

    // Обновляем мобильную версию полностью
    await updateAllMobileData(data, forecastData, airQualityData);

    // Обновляем кнопку избранного
    updateFavoriteButton(isCityInFavorites(data.name));

    // Обновляем тему
    updateThemeByWeather(data.weather[0].main, data.sys);
}

// ========== ФУНКЦИИ ДЛЯ МОБИЛЬНОЙ ВЕРСИИ ==========
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
        const iconSvg = getWeatherIcon(data.weather[0].icon);
        weatherIcon.innerHTML = iconSvg;
        
        const svgElement = weatherIcon.querySelector('svg');
        if (svgElement) {
            svgElement.style.stroke = '#ffffff';
            svgElement.style.strokeWidth = '1.5';
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
        }
        
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

function updateAllMobileData(data, forecastData, airQualityData) {
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
                    icon: item.weather[0].icon
                };
            }
        });
        
        let forecastHTML = '';
        Object.values(dailyForecasts).forEach(dayData => {
            forecastHTML += `
                <div class="mobile-forecast-item">
                    <div class="mobile-forecast-day">${dayData.day}</div>
                    <div class="mobile-weather-icon small">${getWeatherIcon(dayData.icon)}</div>
                    <div class="mobile-forecast-temp">${dayData.temp}°</div>
                </div>
            `;
        });
        
        forecastContainer.innerHTML = forecastHTML;
        updateMobileIcons();
        
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
            
            hourlyHTML += `
                <div class="mobile-hourly-item">
                    <div class="mobile-hourly-time">${timeString}</div>
                    <div class="mobile-weather-icon tiny">${getWeatherIcon(hour.weather[0].icon)}</div>
                    <div class="mobile-hourly-temp">${temp}°</div>
                </div>
            `;
        });
        
        hourlyContainer.innerHTML = hourlyHTML;
        updateMobileIcons();
        
    } catch (error) {
        console.log('Ошибка обновления почасового прогноза:', error);
        hourlyContainer.innerHTML = '<div class="mobile-hourly-item">—</div>'.repeat(8);
    }
}

function updateMobileAirQualityData(airQualityData) {
    const aqiElement = document.getElementById('mobile-aqi');
    const aqiLabel = document.getElementById('mobile-aqi-label');
    
    if (!aqiElement || !aqiLabel || !airQualityData?.list?.[0]) return;
    
    try {
        const aqi = airQualityData.list[0].main.aqi;
        const levels = {
            1: { text: 'Отлично', color: '#10b981' },
            2: { text: 'Хорошо', color: '#4ecdc4' },
            3: { text: 'Умеренно', color: '#ffe66d' },
            4: { text: 'Плохо', color: '#ff9e6d' },
            5: { text: 'Очень плохо', color: '#ff6b6b' }
        };
        
        const level = levels[aqi] || levels[1];
        aqiElement.textContent = aqi;
        aqiElement.style.color = level.color;
        aqiLabel.textContent = level.text;
        
    } catch (error) {
        console.log('Ошибка обновления качества воздуха:', error);
        aqiElement.textContent = '—';
        aqiLabel.textContent = 'Нет данных';
    }
}

function updateMobileSunData(data) {
    if (!data?.sys) return;
    
    try {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        
        document.getElementById('mobile-sunrise').textContent = formatTime(sunrise);
        document.getElementById('mobile-sunset').textContent = formatTime(sunset);
        
        calculateMoonInfo().then(moonInfo => {
            const moonElement = document.getElementById('mobile-moon-phase');
            if (moonElement) {
                updateMoonVisualizationElement(moonElement, moonInfo.phasePercent, moonInfo.isWaning);
            }
        });
        
    } catch (error) {
        console.log('Ошибка обновления времени солнца:', error);
        document.getElementById('mobile-sunrise').textContent = '--:--';
        document.getElementById('mobile-sunset').textContent = '--:--';
    }
}

function updateMobileIcons() {
    const icons = document.querySelectorAll('.mobile-weather-icon svg');
    icons.forEach(svg => {
        svg.style.stroke = '#ffffff';
        svg.style.strokeWidth = '1.5';
    });
}

function updateMoonVisualizationElement(element, phasePercent, isWaning) {
    if (!element) return;

    element.style.cssText = '';
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.borderRadius = '50%';
    element.style.background = '#f1c40f';
    element.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';

    if (phasePercent === 0) {
        element.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        element.style.clipPath = 'inset(0 0 0 0%)';
    } else {
        if (isWaning) {
            element.style.clipPath = `inset(0 ${100 - phasePercent}% 0 0)`;
        } else {
            element.style.clipPath = `inset(0 0 0 ${100 - phasePercent}%)`;
        }
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

// ========== ФУНКЦИИ ДЛЯ ЭКРАНА ЗАГРУЗКИ ==========
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}
// ========== ФУНКЦИИ ДЛЯ ТЕМ ==========
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

// ========== ГЕОЛОКАЦИЯ ==========
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                getWeatherByCoords(lat, lng);
            },
            error => {
                console.log('Ошибка геолокации:', error);
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
        showNotification('Ваш браузер не поддерживает геолокацию');
        const fallbackLat = 59.9343;
        const fallbackLng = 30.3351;
        getWeatherByCoords(fallbackLat, fallbackLng);
    }
}

// ========== PWA ФУНКЦИИ ==========
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    setTimeout(() => {
        if (deferredPrompt && !isAppInstalled()) {
            installPrompt.style.display = 'block';
        }
    }, 3000);
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            installPrompt.style.display = 'none';
        }

        deferredPrompt = null;
    });
}

if (installClose) {
    installClose.addEventListener('click', () => {
        installPrompt.style.display = 'none';
        localStorage.setItem('installPromptClosed', 'true');
    });
}

function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

if (installPrompt && localStorage.getItem('installPromptClosed') === 'true') {
    installPrompt.style.display = 'none';
}

if (installPrompt && isAppInstalled()) {
    installPrompt.style.display = 'none';
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    showLoadingScreen();
    loadSettings();
    getUserLocation();

    // Обработчики для плавающих кнопок
    const settingsBtn = document.querySelector('.settings-btn');
    const functionsBtn = document.querySelector('.functions-btn');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
        });
    }

    if (functionsBtn) {
        functionsBtn.addEventListener('click', () => {
        });
    }

    // Инициализация PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }
});

// Функция для получения короткого описания погоды
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

// Обновляем почасовой прогноз
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

// Обновляем 5-дневный прогноз
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
// Функция для получения текстового описания качества воздуха
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
    
// Обновляем функцию отображения качества воздуха
function updateMobileAirQualityData(airQualityData) {
    const aqiElement = document.getElementById('mobile-aqi');
    const aqiLabel = document.getElementById('mobile-aqi-label');
    
    if (!aqiElement || !aqiLabel || !airQualityData?.list?.[0]) return;
    
    try {
        const aqi = airQualityData.list[0].main.aqi;
        const airQualityInfo = getAirQualityText(aqi);
        
        // Убираем цифру, показываем только текст
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
// ========== СИСТЕМА УМНЫХ НАПОМИНАНИЙ ==========

class SmartReminders {
    constructor() {
        this.reminderElement = document.getElementById('weather-reminder');
        this.titleElement = document.getElementById('reminder-title');
        this.messageElement = document.getElementById('reminder-message');
        this.timeElement = document.getElementById('reminder-time');
        this.currentReminder = null;
    }

// Расчет вероятности снега
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
        // Проверяем температуру для возможного снега
        if (hour.main.temp <= 2 && (weather.includes('rain') || description.includes('shower'))) {
            snowCount += 0.5; // Возможен мокрый снег
        }
    });

    return {
        high: snowCount >= 2,
        medium: snowCount >= 1,
        snowCount: snowCount
    };
}

// Проверка актуальности для снежного напоминания
isRelevantTimeForSnow(currentHour) {
    // Напоминаем утром и днем, когда люди планируют день
    return (currentHour >= 6 && currentHour <= 14);
}

// Создание напоминания о снеге
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

// Обновляем анализ погоды - добавляем снег с высоким приоритетом
analyzeWeatherForReminders(weatherData, forecastData) {
    if (!weatherData || !forecastData) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentWeather = weatherData.weather[0].main.toLowerCase();
    
    const rainProbability = this.calculateRainProbability(forecastData);
    const snowProbability = this.calculateSnowProbability(forecastData);
    
    // НОВЫЙ ПРИОРИТЕТ: Снег идет перед дождем
    if (snowProbability.high && this.isRelevantTimeForSnow(currentHour)) {
        return this.createSnowReminder(snowProbability);
    }
    
    return this.createDefaultReminder(weatherData);
}

    // Анализ погодных данных для напоминаний
    analyzeWeatherForReminders(weatherData, forecastData) {
        if (!weatherData || !forecastData) return null;

        const now = new Date();
        const currentHour = now.getHours();
        const currentWeather = weatherData.weather[0].main.toLowerCase();
        const rainProbability = this.calculateRainProbability(forecastData);
        
        // Приоритеты: 1) Дождь, 2) Рассвет, 3) Закат
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

    // Расчет вероятности дождя
    calculateRainProbability(forecastData) {
        const next12Hours = forecastData.list.slice(0, 4); // Следующие 12 часов
        let rainChance = 0;
        let rainCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            if (weather.includes('rain') || weather.includes('drizzle')) {
                rainCount++;
            }
            if (hour.pop) { // Probability of precipitation
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

    // Проверка актуальности времени для напоминания о дожде
    isRelevantTimeForRain(currentHour) {
        // Напоминаем утром (6-10) и вечером (16-20)
        return (currentHour >= 6 && currentHour <= 10) || 
               (currentHour >= 16 && currentHour <= 20);
    }

    // Получение времени восхода/заката
    getSunTimes(weatherData) {
        return {
            sunrise: new Date(weatherData.sys.sunrise * 1000),
            sunset: new Date(weatherData.sys.sunset * 1000)
        };
    }

    // Проверка времени для напоминания о рассвете
    isTimeForSunriseReminder(currentHour, sunrise) {
        const sunriseHour = sunrise.getHours();
        // Напоминаем за 1-2 часа до рассвета
        return currentHour >= (sunriseHour - 2) && currentHour < sunriseHour;
    }

    // Проверка времени для напоминания о закате
    isTimeForSunsetReminder(currentHour, sunset) {
        const sunsetHour = sunset.getHours();
        // Напоминаем за 1-2 часа до заката
        return currentHour >= (sunsetHour - 2) && currentHour < sunsetHour;
    }

    // Создание напоминания о дожде
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

    // Создание напоминания о рассвете
    createSunriseReminder(sunrise) {
        const sunriseTime = this.formatTime(sunrise);
        
        return {
            type: 'sunrise',
            title: 'Не пропустите рассвет!',
            message: 'Идеальное время для утренних фото',
            time: `В ${sunriseTime}`,
            className: 'sunrise-reminder',
            icon: 'sunrise'
        };
    }

    // Создание напоминания о закате
    createSunsetReminder(sunset) {
        const sunsetTime = this.formatTime(sunset);
        
        return {
            type: 'sunset',
            title: 'Время заката приближается',
            message: 'Отличный момент для вечерней прогулки',
            time: `В ${sunsetTime}`,
            className: 'sunset-reminder',
            icon: 'sunset'
        };
    }

    // Напоминание по умолчанию
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

    // Форматирование времени
    formatTime(date) {
        return date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    }

    // Время следующего обновления
    getNextUpdateTime() {
        const nextUpdate = new Date(Date.now());
        return `Обновление: ${this.formatTime(nextUpdate)}`;
    }

    // Показать напоминание
    showReminder(reminderData) {
        if (!this.reminderElement || !reminderData) return;

        this.currentReminder = reminderData;
        
        // Обновляем контент
        this.titleElement.textContent = reminderData.title;
        this.messageElement.textContent = reminderData.message;
        this.timeElement.textContent = reminderData.time;
        
        // Обновляем классы и иконку
        this.reminderElement.className = `reminder-card ${reminderData.className}`;
        this.updateReminderIcon(reminderData.icon);
        
        // Показываем элемент
        this.reminderElement.style.display = 'flex';
        
        // Логируем для отладки
        console.log('Показано напоминание:', reminderData);
    }

    // Обновление иконки напоминания
    updateReminderIcon(iconType) {
        const iconSvg = this.getReminderIcon(iconType);
        const iconContainer = this.reminderElement.querySelector('.reminder-icon');
        if (iconContainer) {
            iconContainer.innerHTML = iconSvg;
        }
    }

    // Получение SVG иконок для напоминаний
    getReminderIcon(iconType) {
        const icons = {
            umbrella: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path>
                <line x1="8" y1="16" x2="8.01" y2="16"></line>
                <line x1="8" y1="20" x2="8.01" y2="20"></line>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                <line x1="12" y1="22" x2="12.01" y2="22"></line>
                <line x1="16" y1="16" x2="16.01" y2="16"></line>
                <line x1="16" y1="20" x2="16.01" y2="20"></line>
            </svg>
        `,
            sunset: `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 10v8"></path>
                    <path d="m4.93 18.93 1.41-1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m19.07 5.93-1.41-1.41"></path>
                    <path d="M22 22H2"></path>
                    <path d="m16 6-4 4-4-4"></path>
                    <path d="M16 18a4 4 0 0 0-8 0"></path>
                </svg>
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

    // Скрыть напоминание
    hideReminder() {
        if (this.reminderElement) {
            this.reminderElement.style.display = 'none';
        }
    }

    // Обновить напоминание на основе новых данных
    updateReminder(weatherData, forecastData) {
        const reminder = this.analyzeWeatherForReminders(weatherData, forecastData);
        if (reminder) {
            this.showReminder(reminder);
        } else {
            this.hideReminder();
        }
    }
}

// Инициализация системы напоминаний
const smartReminders = new SmartReminders();

// Интеграция с основной функцией обновления погоды
async function updateWeatherData(data, forecastData, airQualityData) {
    // Существующий код обновления погоды...
    updateMobileWeather(data);
    await updateAllMobileData(data, forecastData, airQualityData);
    
    // НОВОЕ: Обновляем умные напоминания
    smartReminders.updateReminder(data, forecastData);
    
    // Существующий код...
    updateFavoriteButton(isCityInFavorites(data.name));
    updateThemeByWeather(data.weather[0].main, data.sys);
}
// Убираем стандартный фокус у всех кнопок
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', function(e) {
            e.preventDefault();
        });
        
        btn.addEventListener('focus', function() {
            this.blur();
        });
    });
});
function openSettings() {
    window.location.href = 'settings.html';
}
// Функция для применения выбранных единиц измерения
function applyTemperatureUnits() {
    const savedUnits = localStorage.getItem('weatherUnits') || 'celsius';
    currentUnits = savedUnits;
    
    // Если есть данные о погоде - обновляем отображение
    if (currentCityData) {
        updateAllTemperatures();
    }
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    applyTemperatureUnits();
    
    // Слушаем сообщения от страницы настроек
    window.addEventListener('message', function(event) {
        if (event.data.type === 'unitsChanged') {
            currentUnits = event.data.units;
            updateAllTemperatures();
        }
    });
});
// Функция применения подсветки из настроек
function applyLightingFromSettings() {
    const savedColor = localStorage.getItem('weatherLighting') || 'green';
    const body = document.body;
    
    // Удаляем все старые классы подсветки
    body.classList.remove(
        'accent-green', 'accent-warm', 'accent-white', 
        'accent-blue', 'accent-pink', 'accent-orange', 'accent-red'
    );
    
    // Добавляем новый класс подсветки
    body.classList.add(`accent-${savedColor}`);
    
    console.log('Applied lighting:', savedColor);
}

// Применяем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    applyLightingFromSettings();
});

// Также применяем при возврате из настроек
window.addEventListener('storage', function(e) {
    if (e.key === 'weatherLighting') {
        applyLightingFromSettings();
    }
});

// Если открываем из настроек - сразу применяем
if (window.location.search.includes('fromSettings=true')) {
    applyLightingFromSettings();
}