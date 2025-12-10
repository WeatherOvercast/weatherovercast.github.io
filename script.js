const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

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
    const iconName = iconMap[weatherCode] || 'sunny';
    return `<div class="weather-icon icon-${iconName}"></div>`;
}

let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
let forecastData = null;
let airQualityData = null;
const TEMPERATURE_SHIFT = 0;
let isFirstLoad = true;
let errorTimeout = null;
let weatherLoaded = false;

const weatherTranslations = {
    'clear sky': 'Ясно', 'few clouds': 'Небольшая облачность',
    'scattered clouds': 'Рассеянные облака', 'broken clouds': 'Облачно с прояснениями',
    'overcast clouds': 'Пасмурно', 'shower rain': 'Ливень',
    'rain': 'Дождь', 'thunderstorm': 'Гроза',
    'snow': 'Снег', 'mist': 'Туман',
    'light rain': 'Небольшой дождь', 'moderate rain': 'Умеренный дождь',
    'heavy intensity rain': 'Сильный дождь'
};

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
}

function isCityInFavorites(city) {
    return favorites.some(fav => fav.name === city);
}

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

function convertTemperature(temp, units) {
    const celsius = temp;
    switch(units) {
        case 'fahrenheit': return Math.round((celsius * 9/5) + 32);
        case 'kelvin': return Math.round(celsius + 273.15);
        default: return Math.round(celsius);
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
        default: return '°C';
    }
}

function updateAllTemperatures() {
    if (currentCity) getWeatherByCity(currentCity);
}

async function getAirQuality(lat, lon) {
    try {
        const controller = new AbortController();
        const timeoutDuration = 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        
        const response = await fetch(
            `${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
            { signal: controller.signal, method: 'GET' }
        );
        
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.log('Качество воздуха недоступно:', error.message);
        return null;
    }
}

async function getWeatherByCoords(lat, lon) {
    if (!navigator.onLine) {
        console.log('Нет подключения к интернету');
        showConnectionError();
        return;
    }
    
    try {
        showLoadingScreen();
        checkWeatherLoading();
        
        const controller = new AbortController();
        const timeoutDuration = 15000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
        
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

            clearTimeout(timeoutId);

            if (weatherData.cod === 200) {
                currentCityData = weatherData;
                currentCity = weatherData.name;
                await updateWeatherData(weatherData, forecastData, airQualityData);
                weatherLoadedSuccessfully();
                if (!isFirstLoad) iosNotifications.success('Обновлено', `Погода для ${weatherData.name}`, 2000);
            } else {
                throw new Error(weatherData.message || 'Неизвестная ошибка API');
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        showConnectionError();
    } finally {
        setTimeout(hideLoadingScreen, 1000);
    }
}

async function getWeatherByCity(city) {
    try {
        showLoadingScreen();
        checkWeatherLoading();
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
            weatherLoadedSuccessfully();
            if (!isFirstLoad) iosNotifications.success('Город изменен', `Теперь смотрим ${weatherData.name}`, 2000);
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        showConnectionError();
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

async function updateWeatherData(data, forecastData, airQualityData) {
    updateMobileWeather(data);
    await updateAllMobileData(data, forecastData, airQualityData);
    smartReminders.updateReminder(data, forecastData);
    updateThemeByWeather(data.weather[0].main, data.sys);
}

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

function updateAllMobileData(data, forecastData, airQualityData) {
    if (!data) return;
    
    updateMobileWeather(data);
    if (forecastData) {
        updateMobileForecastData(forecastData);
        updateMobileHourlyData(forecastData);
    }
    if (airQualityData) updateMobileAirQualityData(airQualityData);
    updateMobileSunData(data);
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

function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
}

function updateThemeByWeather(weatherMain, sys) {
    if (currentTheme !== 'dark') return;

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

    if (savedUnits) currentUnits = savedUnits;

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
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 }
        );
    } else {
        console.log('Геолокация не поддерживается браузером');
        const fallbackLat = 59.9343;
        const fallbackLng = 30.3351;
        getWeatherByCoords(fallbackLat, fallbackLng);
    }
}

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
        if (outcome === 'accepted') installPrompt.style.display = 'none';
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

if (installPrompt) {
    if (localStorage.getItem('installPromptClosed') === 'true' || isAppInstalled()) {
        installPrompt.style.display = 'none';
    }
}

class SmartReminders {
    constructor() {
        this.reminderElement = document.getElementById('weather-reminder');
        this.titleElement = document.getElementById('reminder-title');
        this.messageElement = document.getElementById('reminder-message');
        this.timeElement = document.getElementById('reminder-time');
        this.currentReminder = null;
    }

    calculateSnowProbability(forecastData) {
        const next12Hours = forecastData.list.slice(0, 4);
        let snowChance = 0;
        let snowCount = 0;

        next12Hours.forEach(hour => {
            const weather = hour.weather[0].main.toLowerCase();
            const description = hour.weather[0].description.toLowerCase();
            
            if (weather.includes('snow') || description.includes('snow')) snowCount++;
            if (hour.main.temp <= 2 && (weather.includes('rain') || description.includes('shower'))) snowCount += 0.5;
        });

        return { high: snowCount >= 2, medium: snowCount >= 1, snowCount: snowCount };
    }

    isRelevantTimeForSnow(currentHour) {
        return (currentHour >= 6 && currentHour <= 14);
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

    analyzeWeatherForReminders(weatherData, forecastData) {
        if (!weatherData || !forecastData) return null;

        const now = new Date();
        const currentHour = now.getHours();
        const currentWeather = weatherData.weather[0].main.toLowerCase();
        
        const rainProbability = this.calculateRainProbability(forecastData);
        const snowProbability = this.calculateSnowProbability(forecastData);
        
        if (snowProbability.high && this.isRelevantTimeForSnow(currentHour)) return this.createSnowReminder(snowProbability);
        return this.createDefaultReminder(weatherData);
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

        return { high: rainCount >= 2 || rainChance > 60, medium: rainCount >= 1 || rainChance > 30, chance: rainChance, rainCount: rainCount };
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
        return currentHour >= (sunriseHour - 2) && currentHour < sunriseHour;
    }

    isTimeForSunsetReminder(currentHour, sunset) {
        const sunsetHour = sunset.getHours();
        return currentHour >= (sunsetHour - 2) && currentHour < sunsetHour;
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
            title: 'Не пропустите рассвет!',
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
            title: 'Время заката приближается',
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
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    getNextUpdateTime() {
        const nextUpdate = new Date(Date.now());
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
        if (iconContainer) iconContainer.innerHTML = iconSvg;
    }

    getReminderIcon(iconType) {
        const icons = {
            umbrella: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
            sunrise: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v8"></path><path d="m4.93 10.93 1.41 1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41 1.41"></path><path d="M22 22H2"></path><path d="m8 6 4-4 4 4"></path><path d="M16 18a4 4 0 0 0-8 0"></path></svg>`,
            snow: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line></svg>`,
            sunset: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 10v8"></path><path d="m4.93 18.93 1.41-1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m19.07 5.93-1.41-1.41"></path><path d="M22 22H2"></path><path d="m16 6-4 4-4-4"></path><path d="M16 18a4 4 0 0 0-8 0"></path></svg>`,
            sun: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
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

const smartReminders = new SmartReminders();

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.addEventListener('mousedown', e => e.preventDefault());
        btn.addEventListener('focus', function() { this.blur(); });
    });
});

function openSettings() {
    window.location.href = 'settings.html';
}

function applyTemperatureUnits() {
    const savedUnits = localStorage.getItem('weatherUnits') || 'celsius';
    currentUnits = savedUnits;
    if (currentCityData) updateAllTemperatures();
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

function showConnectionError() {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay) {
        errorOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideError() {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay) {
        errorOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function checkWeatherLoading() {
    const cityElement = document.getElementById('mobile-city');
    const tempElement = document.getElementById('mobile-temperature');
    
    errorTimeout = setTimeout(() => {
        if (!weatherLoaded && (cityElement.textContent === 'Загрузка...' || 
            tempElement.textContent === '--°' || !navigator.onLine)) {
            showConnectionError();
        }
    }, 7000);
}

function weatherLoadedSuccessfully() {
    weatherLoaded = true;
    if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
    }
    hideError();
}

document.addEventListener('DOMContentLoaded', () => {
    showLoadingScreen();
    loadSettings();
    getUserLocation();
    applyTemperatureUnits();
    applyLightingFromSettings();

    const settingsBtn = document.querySelector('.settings-btn');
    const functionsBtn = document.querySelector('.functions-btn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => {});
    if (functionsBtn) functionsBtn.addEventListener('click', () => {});

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    }

    window.addEventListener('online', () => {
        if (!weatherLoaded) getUserLocation();
    });
    
    window.addEventListener('offline', () => showConnectionError());
    
    if (!navigator.onLine) setTimeout(showConnectionError, 1000);
});

document.addEventListener('click', function(event) {
    const errorOverlay = document.getElementById('errorOverlay');
    if (errorOverlay && event.target === errorOverlay) hideError();
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') hideError();
});

window.addEventListener('storage', function(e) {
    if (e.key === 'weatherLighting') applyLightingFromSettings();
});

window.addEventListener('message', function(event) {
    if (event.data.type === 'unitsChanged') {
        currentUnits = event.data.units;
        updateAllTemperatures();
    }
});

if (window.location.search.includes('fromSettings=true')) applyLightingFromSettings();