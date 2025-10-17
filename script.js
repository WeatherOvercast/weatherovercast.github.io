// Конфигурация API
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Глобальные переменные
let map = null;
let userPlacemark = null;
let currentLang = localStorage.getItem('weatherLang') || 'ru';
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
const TEMPERATURE_SHIFT = 0;

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

// Избранные города
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];

// Переводы
const translations = {
    ru: {
        'feels_like': 'Ощущается как',
        'gusts': 'Порывы до',
        'normal': 'Нормальное',
        'very_high': 'Очень высокая',
        'weather_info': 'Информация о погоде',
        'wind': 'Ветер',
        'pressure': 'Давление',
        'humidity': 'Влажность',
        'visibility': 'Видимость',
        'dew_point': 'Точка росы',
        'sun_times': 'Рассвет и Закат',
        'sunrise': 'Рассвет',
        'sunset': 'Закат',
        'weekly_forecast': 'Прогноз на неделю',
        'hourly_forecast': 'Прогноз на 24 часа',
        'find_me': 'Найти меня',
        'search_places': 'Поиск мест',
        'loading_weather': 'Загрузка данных о погоде...',
        'loading_maps': 'Загрузка карты осадков...',
        'no_precipitation': 'Без осадков',
        'precipitation': 'Осадки',
        'theme': 'Тема',
        'dynamic_theme': 'Динамичная',
        'light_theme': 'Светлая',
        'dark_theme': 'Тёмная',
        'temperature_units': 'Единицы температуры',
        'language_selection': 'Выбор языка',
        'report_bug': 'Сообщить о баге',
        'contact_developer': 'Связаться с разработчиком',
        'settings': 'Настройки',
        'sunrise_sunset': 'Рассвет и Закат',
        'dont_miss_sun': 'Не пропустите рассвет в --:-- и закат в --:--',
        'take_umbrella': 'Не забудьте зонт',
        'rain_expected': 'Возможен дождь в --:--',
        'air_quality': '?',
        'moon': 'Луна',
        'phase': 'Фаза',
        'illumination': 'Освещенность',
        'comfortable': 'Комфортно',
        'uncomfortable': 'Дискомфортно',
        'calm': 'Штиль',
        'light_breeze': 'Легкий ветер',
        'moderate_breeze': 'Умеренный ветер',
        'fresh_breeze': 'Свежий ветер',
        'strong_breeze': 'Сильный ветер',
        'high_wind': 'Очень сильный ветер',
        'gale': 'Штормовой ветер',
        'storm': 'Шторм',
        'additional_info': 'Дополнительная информация',
        'accuracy_note': '*Точность прогноза снижается после 3-го дня',
        'precipitation_map': 'Карта осадков',
        'good': 'Хорошо',
        'moderate': 'Умеренно',
        'unhealthy_sensitive': 'Вредно для чувствительных групп',
        'unhealthy': 'Вредно',
        'very_unhealthy': 'Очень вредно',
        'hazardous': 'Опасно',
        'air_quality_advice': 'Рекомендации по качеству воздуха',
        'add_to_favorites': 'В Избранное',
        'favorites': 'Избранные города',
        'no_favorites': 'Пока нет избранных городов',
        'city_added': 'Город добавлен в избранное',
        'city_removed': 'Город удален из избранного',
        'remove': 'Удалить'
    },
    en: {
        'feels_like': 'Feels like',
        'gusts': 'Gusts up to',
        'normal': 'Normal',
        'very_high': 'Very high',
        'weather_info': 'Weather Information',
        'wind': 'Wind',
        'pressure': 'Pressure',
        'humidity': 'Humidity',
        'visibility': 'Visibility',
        'dew_point': 'Dew point',
        'sun_times': 'Sunrise and Sunset',
        'sunrise': 'Sunrise',
        'sunset': 'Sunset',
        'weekly_forecast': 'Weekly Forecast',
        'hourly_forecast': '24-Hour Forecast',
        'find_me': 'Find me',
        'search_places': 'Search places',
        'loading_weather': 'Loading weather data...',
        'loading_maps': 'Loading precipitation map...',
        'no_precipitation': 'No precipitation',
        'precipitation': 'Precipitation',
        'theme': 'Theme',
        'dynamic_theme': 'Dynamic',
        'light_theme': 'Light',
        'dark_theme': 'Dark',
        'temperature_units': 'Temperature Units',
        'language_selection': 'Language Selection',
        'report_bug': 'Report a Bug',
        'contact_developer': 'Contact Developer',
        'settings': 'Settings',
        'sunrise_sunset': 'Sunrise and Sunset',
        'dont_miss_sun': "Don't miss sunrise at --:-- and sunset at --:--",
        'take_umbrella': "Don't forget umbrella",
        'rain_expected': 'Possible rain at --:--',
        'air_quality': '?',
        'moon': 'Moon',
        'phase': 'Phase',
        'illumination': 'Illumination',
        'comfortable': 'Comfortable',
        'uncomfortable': 'Uncomfortable',
        'calm': 'Calm',
        'light_breeze': 'Light breeze',
        'moderate_breeze': 'Moderate breeze',
        'fresh_breeze': 'Fresh breeze',
        'strong_breeze': 'Strong breeze',
        'high_wind': 'High wind',
        'gale': 'Gale',
        'storm': 'Storm',
        'additional_info': 'Additional Information',
        'accuracy_note': '*Forecast accuracy decreases after 3rd day',
        'precipitation_map': 'Precipitation Map',
        'good': 'Good',
        'moderate': 'Moderate',
        'unhealthy_sensitive': 'Unhealthy for Sensitive Groups',
        'unhealthy': 'Unhealthy',
        'very_unhealthy': 'Very Unhealthy',
        'hazardous': 'Hazardous',
        'air_quality_advice': 'Air Quality Advice',
        'add_to_favorites': 'Add to Favorites',
        'favorites': 'Favorite Cities',
        'no_favorites': 'No favorite cities yet',
        'city_added': 'City added to favorites',
        'city_removed': 'City removed from favorites',
        'remove': 'Remove'
    }
};

const weatherTranslations = {
    ru: {
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
    },
    en: {
        'clear sky': 'Clear sky',
        'few clouds': 'Few clouds',
        'scattered clouds': 'Scattered clouds',
        'broken clouds': 'Broken clouds',
        'overcast clouds': 'Overcast',
        'shower rain': 'Shower rain',
        'rain': 'Rain',
        'thunderstorm': 'Thunderstorm',
        'snow': 'Snow',
        'mist': 'Mist',
        'light rain': 'Light rain',
        'moderate rain': 'Moderate rain',
        'heavy intensity rain': 'Heavy rain'
    }
};

// Основные функции
function getTranslation(key) {
    return translations[currentLang][key] || key;
}

function translateWeather(description) {
    return weatherTranslations[currentLang][description] || description;
}

// Функции для работы с избранным
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
        showFavoritesNotification(getTranslation('city_added'));
    }
}

function removeFromFavorites(cityName) {
    favorites = favorites.filter(fav => fav.name !== cityName);
    saveFavorites();
    if (currentCity === cityName) {
        updateFavoriteButton(false);
    }
    showFavoritesNotification(getTranslation('city_removed'));
}

function saveFavorites() {
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
}

function isCityInFavorites(cityName) {
    return favorites.some(fav => fav.name === cityName);
}

function updateFavoriteButton(isFavorite) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (isFavorite) {
        favoriteBtn.classList.add('active');
        favoriteBtn.querySelector('svg').style.fill = 'currentColor';
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.querySelector('svg').style.fill = 'none';
    }
}

function showFavoritesNotification(message) {
    // Простая нотификация - можно заменить на красивый toast
    console.log(message); // Временное решение
}

function showFavoritesPanel() {
    const overlay = document.getElementById('favorites-overlay');
    const list = document.getElementById('favorites-list');
    const empty = document.getElementById('favorites-empty');
    
    list.innerHTML = '';
    
    if (favorites.length === 0) {
        empty.style.display = 'block';
        list.style.display = 'none';
    } else {
        empty.style.display = 'none';
        list.style.display = 'block';
        
        favorites.forEach(city => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
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
    
    overlay.style.display = 'flex';
    document.body.classList.add('settings-open');
}

function selectFavoriteCity(cityName, lat, lon) {
    getWeatherByCoords(lat, lon);
    closeFavoritesPanel();
}

function closeFavoritesPanel() {
    document.getElementById('favorites-overlay').style.display = 'none';
    document.body.classList.remove('settings-open');
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

// Функция для применения сдвига температуры
function applyTemperatureShift(temp) {
    return Math.round(temp + TEMPERATURE_SHIFT);
}

// Функция для определения силы ветра
function getWindStrength(speedMps) {
    const speedKmh = speedMps * 3.6;
    
    if (speedKmh < 1) return getTranslation('calm');
    else if (speedKmh < 11) return getTranslation('light_breeze');
    else if (speedKmh < 19) return getTranslation('moderate_breeze');
    else if (speedKmh < 29) return getTranslation('fresh_breeze');
    else if (speedKmh < 39) return getTranslation('strong_breeze');
    else if (speedKmh < 50) return getTranslation('high_wind');
    else if (speedKmh < 62) return getTranslation('gale');
    else return getTranslation('storm');
}

// Функция для обновления совета
function updateWeatherTip(data, forecastData) {
    const tipElement = document.getElementById('weather-tip');
    const tipText = document.getElementById('tip-text');
    
    const hasRainToday = checkRainToday(forecastData);
    
    if (hasRainToday.found) {
        tipText.textContent = `${getTranslation('take_umbrella')}. ${getTranslation('rain_expected').replace('--:--', hasRainToday.time)}`;
    } else {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        const sunriseTime = formatTime(sunrise);
        const sunsetTime = formatTime(sunset);
        
        tipText.textContent = getTranslation('dont_miss_sun')
            .replace('--:--', sunriseTime)
            .replace('--:--', sunsetTime);
    }
}

// Проверка дождя сегодня
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

// Получение данных о качестве воздуха
async function getAirQuality(lat, lon) {
    try {
        const response = await fetch(
            `${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка получения качества воздуха:', error);
        return null;
    }
}

// Функция для получения уровня загрязнения
function getPollutionLevel(value, pollutant) {
    const thresholds = {
        'pm2_5': [12, 35.4, 55.4, 150.4, 250.4],
        'pm10': [54, 154, 254, 354, 424],
        'o3': [54, 70, 85, 105, 200],
        'no2': [53, 100, 360, 649, 1249],
        'so2': [35, 75, 185, 304, 604],
        'co': [4.4, 9.4, 12.4, 15.4, 30.4]
    };
    
    const levels = [1, 2, 3, 4, 5, 6];
    const threshold = thresholds[pollutant] || thresholds.pm2_5;
    
    for (let i = 0; i < threshold.length; i++) {
        if (value <= threshold[i]) return levels[i];
    }
    return 6;
}

// Функция для получения описания уровня AQI
function getAQILevelDescription(aqi) {
    const levels = {
        1: { en: 'Good', ru: 'Хороший', class: 'level-good', advice: 'Идеальные условия для outdoor активности' },
        2: { en: 'Fair', ru: 'Удовлетворительный', class: 'level-moderate', advice: 'Хорошие условия, подходят для большинства людей' },
        3: { en: 'Moderate', ru: 'Умеренный', class: 'level-unhealthy-sensitive', advice: 'Чувствительным группам ограничить пребывание на улице' },
        4: { en: 'Poor', ru: 'Плохой', class: 'level-unhealthy', advice: 'Ограничить физическую активность на открытом воздухе' },
        5: { en: 'Very Poor', ru: 'Очень плохой', class: 'level-very-unhealthy', advice: 'Избегать длительного пребывания на улице' }
    };
    return levels[aqi] || levels[1];
}

// Получение погоды по координатам
async function getWeatherByCoords(lat, lon) {
    try {
        showLoading();
        const [weatherData, forecastData, airQualityData] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${currentLang}`).then(r => r.json()),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${currentLang}`).then(r => r.json()),
            getAirQuality(lat, lon)
        ]);
        
        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            updateWeatherData(weatherData, forecastData, airQualityData);
            updateMapLocation(lat, lon);
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        alert('Ошибка: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Получение погоды по названию города
async function getWeatherByCity(city) {
    try {
        showLoading();
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=${currentLang}`
        );
        const weatherData = await weatherResponse.json();
        
        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            currentCity = weatherData.name;
            const [forecastData, airQualityData] = await Promise.all([
                getForecast(weatherData.coord.lat, weatherData.coord.lon),
                getAirQuality(weatherData.coord.lat, weatherData.coord.lon)
            ]);
            
            updateWeatherData(weatherData, forecastData, airQualityData);
            updateMapLocation(weatherData.coord.lat, weatherData.coord.lon);
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        alert('Ошибка: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Получение прогноза
async function getForecast(lat, lon) {
    try {
        const response = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=${currentLang}`
        );
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения прогноза:', error);
        return null;
    }
}

// Основное обновление данных о погоде
function updateWeatherData(data, forecastData, airQualityData) {
    // ОСНОВНЫЕ ДАННЫЕ С УЧЕТОМ СДВИГА ТЕМПЕРАТУРЫ
    const temp = applyTemperatureShift(data.main.temp);
    const feelsLike = applyTemperatureShift(data.main.feels_like);
    const weatherDesc = translateWeather(data.weather[0].description);

    document.getElementById('current-temp').innerHTML = `
        <span class="temp-bullet">●</span>
        <span class="temp-value">${temp}°</span>
    `;
    document.getElementById('feels-like').textContent = `${getTranslation('feels_like')} ${feelsLike}°`;
    document.getElementById('weather-description').textContent = weatherDesc;

    // ВЕТЕР - РЕАЛЬНЫЕ ДАННЫЕ
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
            <span>${getTranslation('gusts')} ${windGust} км/ч</span>
        </div>
    `;

    // ДАВЛЕНИЕ
    const pressure = Math.round(data.main.pressure * 0.750062);
    const pressureStatus = pressure >= 745 && pressure <= 755 ? getTranslation('normal') : 
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
                             humidity < 60 ? getTranslation('comfortable') : 
                             humidity < 80 ? 'Влажно' : getTranslation('very_high');
    
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

    // РАССВЕТ И ЗАКАТ
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    document.getElementById('sunrise-time').textContent = formatTime(sunrise);
    document.getElementById('sunset-time').textContent = formatTime(sunset);
    document.getElementById('sun-times-city').textContent = data.name;

    // ОСАДКИ В ОСНОВНОМ БЛОКЕ
    if (data.rain) {
        const rainVolume = data.rain['1h'] || data.rain['3h'] || 0;
        document.getElementById('rain-info').innerHTML = `
            <span>●</span>
            <span>${getTranslation('precipitation')}: ${rainVolume} мм</span>
        `;
    } else {
        document.getElementById('rain-info').innerHTML = `
            <span>●</span>
            <span>${getTranslation('no_precipitation')}</span>
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
        updateHourlyForecast(forecastData);
        updateWeeklyForecast(forecastData);
        updateWeatherTip(data, forecastData);
    }

    // ОБНОВЛЯЕМ КНОПКУ ИЗБРАННОГО
    updateFavoriteButton(isCityInFavorites(data.name));

    updateThemeByWeather(data.weather[0].main, data.sys);
}

// Расчет точки росы
function calculateDewPoint(temp, humidity) {
    if (humidity === 0) return -273.15;
    
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);
    return (b * alpha) / (a - alpha);
}

// Обновление информации о качестве воздуха
function updateAirQualityInfo(airQualityData) {
    if (airQualityData && airQualityData.list && airQualityData.list.length > 0) {
        const airData = airQualityData.list[0];
        const aqi = airData.main.aqi;
        const components = airData.components;
        const aqiDesc = getAQILevelDescription(aqi);
        
        const pollutants = [
            { key: 'pm2_5', name: 'PM2.5', value: components.pm2_5, unit: 'мкг/м³' },
            { key: 'pm10', name: 'PM10', value: components.pm10, unit: 'мкг/м³' },
            { key: 'o3', name: 'O₃', value: components.o3, unit: 'мкг/м³' },
            { key: 'no2', name: 'NO₂', value: components.no2, unit: 'мкг/м³' },
            { key: 'so2', name: 'SO₂', value: components.so2, unit: 'мкг/м³' },
            { key: 'co', name: 'CO', value: components.co, unit: 'мг/м³' }
        ];

        let airQualityHTML = `
            <div class="tile-content-item">
                <span>●</span>
                <span><strong>Индекс AQI: ${aqi} (${aqiDesc[currentLang === 'ru' ? 'ru' : 'en']})</strong></span>
            </div>
            <div class="tile-content-item">
                <span>●</span>
                <span><em>${aqiDesc.advice}</em></span>
            </div>
            <div class="air-quality-details">
        `;

        pollutants.forEach(pollutant => {
            const level = getPollutionLevel(pollutant.value, pollutant.key);
            const levelDesc = getAQILevelDescription(level);
            
            airQualityHTML += `
                <div class="pollutant-item">
                    <span>${pollutant.name}: ${pollutant.value.toFixed(1)} ${pollutant.unit}</span>
                    <span class="pollutant-level ${levelDesc.class}">
                        ${getTranslation(levelDesc[currentLang === 'ru' ? 'ru' : 'en'].toLowerCase().replace(' ', '_'))}
                    </span>
                </div>
            `;
        });

        airQualityHTML += '</div>';
        document.getElementById('air-quality').innerHTML = airQualityHTML;
    } else {
        document.getElementById('air-quality').innerHTML = `
            <div class="tile-content-item">
                <span>●</span>
                <span>Данные о качестве воздуха недоступны</span>
            </div>
        `;
    }
}

// Обновление дополнительной информации
function updateAdditionalInfo(data, airQualityData) {
    updateAirQualityInfo(airQualityData);
    
    // ФАЗЫ ЛУНЫ
    const moonInfo = calculateMoonInfo();
    document.getElementById('moon-phase-text').textContent = `${getTranslation('phase')}: ${moonInfo.phase}`;
    document.getElementById('moon-illumination').textContent = `${getTranslation('illumination')}: ${moonInfo.illumination}%`;
    document.getElementById('moon-age').textContent = `Возраст: ${moonInfo.age} дней`;
    document.getElementById('moon-next').textContent = `Следующая фаза: ${moonInfo.nextPhase} (${moonInfo.daysToNext} дней)`;
    
    updateMoonVisualization(moonInfo.phasePercent);
}

// Расчет фаз луны
function calculateMoonInfo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    let age = 0;
    if (month <= 2) {
        age = Math.floor(365.25 * (year - 1)) + Math.floor(30.6 * (month + 12 - 3)) + day - 694039.09;
    } else {
        age = Math.floor(365.25 * year) + Math.floor(30.6 * (month - 3)) + day - 694039.09;
    }
    
    age /= 29.5305882;
    age -= Math.floor(age);
    if (age < 0) age += 1;
    
    const moonAge = age * 29.5305882;
    const illumination = Math.round((1 - Math.cos(Math.PI * moonAge / 14.7652941)) * 50);
    
    let phase, phasePercent, nextPhase, daysToNext;

    if (moonAge < 1.84566) {
        phase = currentLang === 'ru' ? 'Новолуние' : 'New Moon';
        phasePercent = 0;
        nextPhase = currentLang === 'ru' ? 'Молодая луна' : 'Waxing Crescent';
        daysToNext = Math.round(1.84566 - moonAge);
    } else if (moonAge < 5.53699) {
        phase = currentLang === 'ru' ? 'Молодая луна' : 'Waxing Crescent';
        phasePercent = Math.round((moonAge - 1.84566) / (5.53699 - 1.84566) * 25);
        nextPhase = currentLang === 'ru' ? 'Первая четверть' : 'First Quarter';
        daysToNext = Math.round(5.53699 - moonAge);
    } else if (moonAge < 9.22831) {
        phase = currentLang === 'ru' ? 'Первая четверть' : 'First Quarter';
        phasePercent = 25 + Math.round((moonAge - 5.53699) / (9.22831 - 5.53699) * 25);
        nextPhase = currentLang === 'ru' ? 'Прибывающая луна' : 'Waxing Gibbous';
        daysToNext = Math.round(9.22831 - moonAge);
    } else if (moonAge < 12.91963) {
        phase = currentLang === 'ru' ? 'Прибывающая луна' : 'Waxing Gibbous';
        phasePercent = 50 + Math.round((moonAge - 9.22831) / (12.91963 - 9.22831) * 25);
        nextPhase = currentLang === 'ru' ? 'Полнолуние' : 'Full Moon';
        daysToNext = Math.round(12.91963 - moonAge);
    } else if (moonAge < 16.61096) {
        phase = currentLang === 'ru' ? 'Полнолуние' : 'Full Moon';
        phasePercent = 75 + Math.round((moonAge - 12.91963) / (16.61096 - 12.91963) * 25);
        nextPhase = currentLang === 'ru' ? 'Убывающая луна' : 'Waning Gibbous';
        daysToNext = Math.round(16.61096 - moonAge);
    } else if (moonAge < 20.30228) {
        phase = currentLang === 'ru' ? 'Убывающая луна' : 'Waning Gibbous';
        phasePercent = 75 - Math.round((moonAge - 16.61096) / (20.30228 - 16.61096) * 25);
        nextPhase = currentLang === 'ru' ? 'Последняя четверть' : 'Last Quarter';
        daysToNext = Math.round(20.30228 - moonAge);
    } else if (moonAge < 23.99361) {
        phase = currentLang === 'ru' ? 'Последняя четверть' : 'Last Quarter';
        phasePercent = 50 - Math.round((moonAge - 20.30228) / (23.99361 - 20.30228) * 25);
        nextPhase = currentLang === 'ru' ? 'Старая луна' : 'Waning Crescent';
        daysToNext = Math.round(23.99361 - moonAge);
    } else {
        phase = currentLang === 'ru' ? 'Старая луна' : 'Waning Crescent';
        phasePercent = 25 - Math.round((moonAge - 23.99361) / (29.5305882 - 23.99361) * 25);
        nextPhase = currentLang === 'ru' ? 'Новолуние' : 'New Moon';
        daysToNext = Math.round(29.5305882 - moonAge);
    }
    
    phasePercent = Math.max(0, Math.min(100, phasePercent));
    
    return {
        phase,
        illumination: Math.max(0, Math.min(100, illumination)),
        age: Math.round(moonAge),
        nextPhase,
        daysToNext,
        phasePercent
    };
}

// Визуализация луны
function updateMoonVisualization(phasePercent) {
    const moonPhase = document.getElementById('moon-phase');
    
    moonPhase.style.transform = '';
    moonPhase.style.background = '';
    moonPhase.style.clipPath = '';
    
    if (phasePercent === 0) {
        moonPhase.style.clipPath = 'inset(0 0 0 100%)';
    } else if (phasePercent === 100) {
        moonPhase.style.clipPath = 'inset(0 0 0 0%)';
    } else if (phasePercent <= 50) {
        const clipPercent = 100 - (phasePercent * 2);
        moonPhase.style.clipPath = `inset(0 0 0 ${clipPercent}%)`;
    } else {
        const clipPercent = (phasePercent - 50) * 2;
        moonPhase.style.clipPath = `inset(0 ${clipPercent}% 0 0)`;
    }
}

// Обновление почасового прогноза
function updateHourlyForecast(forecastData) {
    const container = document.getElementById('hourly-forecast');
    container.innerHTML = '';

    const hourlyForecasts = forecastData.list.slice(0, 8);

    hourlyForecasts.forEach((forecast, index) => {
        const hourCard = document.createElement('div');
        hourCard.className = 'hour-card';
        
        const forecastTime = new Date(forecast.dt * 1000);
        const timeString = formatHour(forecastTime);
        const temp = applyTemperatureShift(forecast.main.temp);
        const weatherIcon = getWeatherIcon(forecast.weather[0].main, forecast.main.temp);
        const weatherDesc = translateWeather(forecast.weather[0].description);
        
        hourCard.innerHTML = `
            <div class="hour-time">${timeString}</div>
            <div class="hour-icon">${weatherIcon}</div>
            <div class="hour-temp">
                <span class="hour-temp-bullet">●</span>
                <span>${temp}°</span>
            </div>
            <div class="hour-weather">${weatherDesc}</div>
        `;
        container.appendChild(hourCard);
    });
}

// Обновление недельного прогноза
function updateWeeklyForecast(forecastData) {
    const container = document.getElementById('forecast-week');
    container.innerHTML = '';

    const dailyForecasts = [];
    for (let i = 0; i < forecastData.list.length; i += 8) {
        if (dailyForecasts.length < 7) {
            dailyForecasts.push(forecastData.list[i]);
        }
    }

    const dayNames = currentLang === 'ru' 
        ? ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
        : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const today = new Date();
    const todayIndex = today.getDay();

    dailyForecasts.forEach((forecast, index) => {
        const dayCard = document.createElement('div');
        dayCard.className = 'forecast-day';
        
        const dayIndex = (todayIndex + index) % 7;
        const dayName = index === 0 
            ? (currentLang === 'ru' ? 'СЕГОДНЯ' : 'TODAY') 
            : dayNames[dayIndex];

        const tempMax = applyTemperatureShift(forecast.main.temp_max);
        const tempMin = applyTemperatureShift(forecast.main.temp_min);
        
        dayCard.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="day-temps">
                <span class="temp-high">${tempMax}°</span>
                <span class="temp-low">${tempMin}°</span>
            </div>
        `;
        container.appendChild(dayCard);
    });
}

// Иконки погоды
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

function getWindDirection(degrees) {
    const directions = currentLang === 'ru' 
        ? ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
        : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function formatTime(date) {
    return date.toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatHour(date) {
    return date.toLocaleTimeString(currentLang === 'ru' ? 'ru-RU' : 'en-US', { 
        hour: '2-digit',
        hour12: false 
    });
}

function updateThemeByWeather(weatherMain, sys) {
    if (currentTheme !== 'dynamic') return;

    const now = new Date();
    const currentTime = now.getTime();
    const sunrise = sys.sunrise * 1000;
    const sunset = sys.sunset * 1000;
    
    const isNight = currentTime < sunrise || currentTime > sunset;
    const themeClass = isNight ? 'night' : weatherMain.toLowerCase();
    
    document.body.className = themeClass;
}
document.getElementById('favorites-list-btn').addEventListener('click', showFavoritesPanel);

// Обработчики для подсказки качества воздуха
function initAirQualityHint() {
    const questionBtn = document.getElementById('air-quality-question');
    const overlay = document.getElementById('air-quality-overlay');
    const closeBtn = document.getElementById('close-air-quality-hint');
    
    questionBtn.addEventListener('click', function() {
        overlay.style.display = 'flex';
        document.body.classList.add('settings-open');
    });
    
    closeBtn.addEventListener('click', function() {
        overlay.style.display = 'none';
        document.body.classList.remove('settings-open');
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        }
    });
    
    // Закрытие на Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.style.display === 'flex') {
            overlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        }
    });
}

// Вызовите эту функцию в DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {

    initAirQualityHint();
});
function initAirQualityHint() {
    const questionBtn = document.getElementById('air-quality-question');
    const overlay = document.getElementById('air-quality-overlay');
    const closeBtn = document.getElementById('close-air-quality-hint');
    const panel = document.querySelector('.air-quality-panel');
    
    questionBtn.addEventListener('click', function() {
        overlay.style.display = 'flex';
        document.body.classList.add('settings-open');
        
        // На мобильных добавляем плавный скролл к верху
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                panel.scrollTop = 0;
            }, 100);
        }
    });
    
    closeBtn.addEventListener('click', function() {
        closeAirQualityHint();
    });
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAirQualityHint();
        }
    });
    
    // Закрытие на Escape
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
// Инициализация карты осадков
function initMap() {
    ymaps.ready(function() {
        map = new ymaps.Map('map', {
            center: [55.7558, 37.6173],
            zoom: 10
        });

        // Упрощенные контролы
        map.controls.remove('zoomControl');
        map.controls.remove('geolocationControl');
        map.controls.remove('searchControl');
        map.controls.remove('trafficControl');
        map.controls.remove('typeSelector');
        map.controls.remove('fullscreenControl');
        map.controls.remove('rulerControl');

        // Добавляем информационную панель для карты осадков
        const overlay = document.createElement('div');
        overlay.className = 'map-overlay';
        overlay.innerHTML = 'Карта';
        document.querySelector('.precipitation-map').appendChild(overlay);

        document.querySelector('.map-loading').style.display = 'none';
        getUserLocation();
    });
}

function updateMapLocation(lat, lon) {
    if (map) {
        map.setCenter([lat, lon], 13);
        if (userPlacemark) {
            userPlacemark.geometry.setCoordinates([lat, lon]);
        }
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                getWeatherByCoords(lat, lng);
                
                if (map) {
                    userPlacemark = new ymaps.Placemark([lat, lng], {
                        balloonContent: 'Ваше местоположение'
                    }, {
                        preset: 'islands#blueCircleDotIcon'
                    });
                    
                    map.geoObjects.add(userPlacemark);
                }
            },
            error => {
                console.log('Геолокация недоступна:', error);
                const fallbackLat = 55.7558;
                const fallbackLng = 37.6173;
                getWeatherByCoords(fallbackLat, fallbackLng);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 600000
            }
        );
    } else {
        const fallbackLat = 55.7558;
        const fallbackLng = 37.6173;
        getWeatherByCoords(fallbackLat, fallbackLng);
    }
}

function saveSettings() {
    localStorage.setItem('weatherLang', currentLang);
    localStorage.setItem('weatherUnits', currentUnits);
    localStorage.setItem('weatherTheme', currentTheme);
}

function loadSettings() {
    const savedLang = localStorage.getItem('weatherLang');
    const savedUnits = localStorage.getItem('weatherUnits');
    const savedTheme = localStorage.getItem('weatherTheme');
    
    if (savedLang) {
        currentLang = savedLang;
        document.getElementById('current-lang').textContent = 
            currentLang === 'ru' ? 'Русский' : 'English';
    }
    
    if (savedUnits) {
        currentUnits = savedUnits;
        const unitsText = {
            'celsius': 'Цельсий (°C)',
            'fahrenheit': 'Фаренгейт (°F)',
            'kelvin': 'Кельвин (K)'
        };
        document.getElementById('current-units').textContent = unitsText[currentUnits];
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

function updateUITexts() {
    document.querySelector('.find-me-text').textContent = getTranslation('find_me');
    document.getElementById('city-search').placeholder = getTranslation('search_places');
    document.querySelector('.loading div:last-child').textContent = getTranslation('loading_weather');
    document.querySelector('.map-loading').textContent = getTranslation('loading_maps');
    document.querySelector('.section-title').textContent = getTranslation('weather_info');
    document.querySelector('.hourly-forecast .section-title').textContent = getTranslation('hourly_forecast');
    document.querySelector('.weekly-forecast .section-title').textContent = getTranslation('weekly_forecast');
    document.querySelector('.additional-info .section-title').textContent = getTranslation('additional_info');
    document.querySelector('.accuracy-note').textContent = getTranslation('accuracy_note');
    
    const tileTitles = document.querySelectorAll('.tile-title span:last-child');
    const newTitles = [
        getTranslation('wind'),
        getTranslation('pressure'),
        getTranslation('humidity'),
        getTranslation('visibility'),
        getTranslation('dew_point'),
        getTranslation('sun_times')
    ];
    
    tileTitles.forEach((title, index) => {
        if (index < newTitles.length) {
            title.textContent = newTitles[index];
        }
    });
    
    document.querySelector('.settings-header').textContent = getTranslation('settings');
    document.querySelector('.settings-title:first-child').textContent = getTranslation('theme');
    document.querySelectorAll('.theme-text').forEach((text, index) => {
        const themes = [
            getTranslation('dynamic_theme'),
            getTranslation('light_theme'),
            getTranslation('dark_theme')
        ];
        if (index < themes.length) {
            text.textContent = themes[index];
        }
    });
    
    document.querySelector('.units-selector .settings-title').textContent = getTranslation('temperature_units');
    document.querySelector('.language-selector .settings-title').textContent = getTranslation('language_selection');
    
    document.querySelectorAll('.settings-link').forEach((link, index) => {
        if (index === 0) {
            link.textContent = getTranslation('report_bug');
        } else if (index === 1) {
            link.textContent = getTranslation('contact_developer');
        }
    });
    
    document.querySelectorAll('.info-title span:last-child').forEach((title, index) => {
        const titles = [
            getTranslation('air_quality'),
            getTranslation('moon')
        ];
        if (index < titles.length) {
            title.textContent = titles[index];
        }
    });

    // Обновляем тексты для избранного
    document.querySelector('.favorite-text').textContent = getTranslation('add_to_favorites');
    document.querySelector('.favorites-header span').textContent = getTranslation('favorites');
    document.getElementById('favorites-empty').textContent = getTranslation('no_favorites');
}

// Функция автодополнения
function showSuggestions(query) {
    const suggestionsContainer = document.getElementById('search-suggestions');
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
            document.getElementById('city-search').value = city.name;
            suggestionsContainer.style.display = 'none';
            getWeatherByCity(city.name);
        });
        suggestionsContainer.appendChild(item);
    });
    
    suggestionsContainer.style.display = 'block';
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initMap();
    updateUITexts();
    
    document.getElementById('locate-btn').addEventListener('click', getUserLocation);
    
    document.getElementById('city-search').addEventListener('input', (e) => {
        showSuggestions(e.target.value);
    });
    
    document.getElementById('city-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = e.target.value.trim();
            if (city) {
                getWeatherByCity(city);
            }
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('search-suggestions').style.display = 'none';
        }
    });

    // Настройки
    const settingsBtn = document.getElementById('settings-btn');
    const settingsOverlay = document.getElementById('settings-overlay');
    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    const unitsBtn = document.getElementById('units-btn');
    const unitsDropdown = document.getElementById('units-dropdown');
    const themeOptions = document.querySelectorAll('.theme-option');

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

    languageBtn.addEventListener('click', () => {
        languageDropdown.style.display = languageDropdown.style.display === 'block' ? 'none' : 'block';
        unitsDropdown.style.display = 'none';
    });

    unitsBtn.addEventListener('click', () => {
        unitsDropdown.style.display = unitsDropdown.style.display === 'block' ? 'none' : 'block';
        languageDropdown.style.display = 'none';
    });

    document.querySelectorAll('#language-dropdown .selector-option').forEach(option => {
        option.addEventListener('click', () => {
            currentLang = option.getAttribute('data-lang');
            document.getElementById('current-lang').textContent = 
                currentLang === 'ru' ? 'Русский' : 'English';
            languageDropdown.style.display = 'none';
            
            saveSettings();
            updateUITexts();
            
            if (userPlacemark) {
                const coords = userPlacemark.geometry.getCoordinates();
                getWeatherByCoords(coords[0], coords[1]);
            }
        });
    });

    document.querySelectorAll('#units-dropdown .selector-option').forEach(option => {
        option.addEventListener('click', () => {
            currentUnits = option.getAttribute('data-units');
            document.getElementById('current-units').textContent = option.textContent;
            unitsDropdown.style.display = 'none';
            saveSettings();
        });
    });

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

    favoriteBtn.addEventListener('click', toggleFavorite);

    favoriteBtn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        showFavoritesPanel();
    });

    closeFavoritesBtn.addEventListener('click', closeFavoritesPanel);

    favoritesOverlay.addEventListener('click', (e) => {
        if (e.target === favoritesOverlay) {
            closeFavoritesPanel();
        }
    });
});