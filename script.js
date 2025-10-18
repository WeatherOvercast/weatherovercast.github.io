// Конфигурация API
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Глобальные переменные
let map = null;
let userPlacemark = null;
let currentUnits = localStorage.getItem('weatherUnits') || 'celsius';
let currentTheme = localStorage.getItem('weatherTheme') || 'dynamic';
let currentCity = '';
let currentCityData = null;
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
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

// ========== ФУНКЦИИ ДЛЯ ИЗБРАННОГО ==========
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
        showNotification('Город добавлен в избранное');
    }
}

function removeFromFavorites(cityName) {
    favorites = favorites.filter(fav => fav.name !== cityName);
    saveFavorites();
    if (currentCity === cityName) {
        updateFavoriteButton(false);
    }
    showNotification('Город удален из избранного');
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

function showFavoritesPanel() {
    const overlay = document.getElementById('favorites-overlay');
    const list = document.getElementById('favorites-list');
    const empty = document.getElementById('favorites-empty');
    
    if (!overlay || !list || !empty) return;
    
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
        
        // Показываем основной контент с анимацией
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

function updateWeatherTip(data, forecastData) {
    const tipText = document.getElementById('tip-text');
    const factText = document.getElementById('fact-text');
    
    if (!tipText || !factText) return;
    
    const hasRainToday = checkRainToday(forecastData);
    
    if (hasRainToday.found) {
        tipText.textContent = `Не забудьте зонт. Возможен дождь в ${hasRainToday.time}`;
    } else {
        const sunrise = new Date(data.sys.sunrise * 1000);
        const sunset = new Date(data.sys.sunset * 1000);
        const sunriseTime = formatTime(sunrise);
        const sunsetTime = formatTime(sunset);
        
        tipText.textContent = `Не пропустите рассвет в ${sunriseTime} и закат в ${sunsetTime}`;
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

function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatHour(date) {
    return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit',
        hour12: false 
    });
}

function calculateDewPoint(temp, humidity) {
    if (humidity === 0) return -273.15;
    
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100.0);
    return (b * alpha) / (a - alpha);
}

// ========== ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ О ПОГОДЕ ==========
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

async function getWeatherByCoords(lat, lon) {
    try {
        showLoadingScreen();
        const [weatherData, forecastData, airQualityData] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`).then(r => r.json()),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`).then(r => r.json()),
            getAirQuality(lat, lon)
        ]);
        
        if (weatherData.cod === 200) {
            currentCityData = weatherData;
            currentCity = weatherData.name;
            updateWeatherData(weatherData, forecastData, airQualityData);
            updateMapLocation(lat, lon);
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        showNotification('Ошибка: ' + error.message);
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
            
            updateWeatherData(weatherData, forecastData, airQualityData);
            updateMapLocation(weatherData.coord.lat, weatherData.coord.lon);
        } else {
            throw new Error(weatherData.message);
        }
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        showNotification('Ошибка: ' + error.message);
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
function updateWeatherData(data, forecastData, airQualityData) {
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
        updateHourlyForecast(forecastData);
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
    
    // ФАЗЫ ЛУНЫ
    const moonInfo = calculateMoonInfo();
    document.getElementById('moon-phase-text').textContent = `Фаза: ${moonInfo.phase}`;
    document.getElementById('moon-illumination').textContent = `Освещенность: ${moonInfo.illumination}%`;
    document.getElementById('moon-age').textContent = `Возраст: ${moonInfo.age} дней`;
    document.getElementById('moon-next').textContent = `Следующая фаза: ${moonInfo.nextPhase} (${moonInfo.daysToNext} дней)`;
    
    updateMoonVisualization(moonInfo.phasePercent);
}

// ========== ФУНКЦИИ ДЛЯ КАЧЕСТВА ВОЗДУХА ==========
function getPollutionLevel(value, pollutant) {
    const thresholds = {
        'pm2_5': [12, 35.4, 55.4, 150.4, 250.4],
        'pm10': [54, 154, 254, 354, 424],
        'o3': [54, 70, 85, 105, 200],
        'no2': [53, 100, 360, 649, 1249],
        'so2': [35, 75, 185, 304, 604],
        'co': [4.4, 9.4, 12.4, 15.4, 30.4] // Теперь в мг/м³ вместо мкг/м³
    };
    
    const levels = ['хороший', 'удовлетворительный', 'умеренный', 'плохой', 'очень плохой', 'опасный'];
    const threshold = thresholds[pollutant] || thresholds.pm2_5;
    
    // Для CO используем значение как есть (уже в мг/м³ после конвертации)
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

        // Обновляем данные в подсказке
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

// Добавляем стили для деталей качества воздуха
const airQualityStyles = `
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
`;

// Добавляем стили в документ
const styleSheet = document.createElement('style');
styleSheet.textContent = airQualityStyles;
document.head.appendChild(styleSheet);

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
        phase = 'Новолуние';
        phasePercent = 0;
        nextPhase = 'Молодая луна';
        daysToNext = Math.round(1.84566 - moonAge);
    } else if (moonAge < 5.53699) {
        phase = 'Молодая луна';
        phasePercent = Math.round((moonAge - 1.84566) / (5.53699 - 1.84566) * 25);
        nextPhase = 'Первая четверть';
        daysToNext = Math.round(5.53699 - moonAge);
    } else if (moonAge < 9.22831) {
        phase = 'Первая четверть';
        phasePercent = 25 + Math.round((moonAge - 5.53699) / (9.22831 - 5.53699) * 25);
        nextPhase = 'Прибывающая луна';
        daysToNext = Math.round(9.22831 - moonAge);
    } else if (moonAge < 12.91963) {
        phase = 'Прибывающая луна';
        phasePercent = 50 + Math.round((moonAge - 9.22831) / (12.91963 - 9.22831) * 25);
        nextPhase = 'Полнолуние';
        daysToNext = Math.round(12.91963 - moonAge);
    } else if (moonAge < 16.61096) {
        phase = 'Полнолуние';
        phasePercent = 75 + Math.round((moonAge - 12.91963) / (16.61096 - 12.91963) * 25);
        nextPhase = 'Убывающая луна';
        daysToNext = Math.round(16.61096 - moonAge);
    } else if (moonAge < 20.30228) {
        phase = 'Убывающая луна';
        phasePercent = 75 - Math.round((moonAge - 16.61096) / (20.30228 - 16.61096) * 25);
        nextPhase = 'Последняя четверть';
        daysToNext = Math.round(20.30228 - moonAge);
    } else if (moonAge < 23.99361) {
        phase = 'Последняя четверть';
        phasePercent = 50 - Math.round((moonAge - 20.30228) / (23.99361 - 20.30228) * 25);
        nextPhase = 'Старая луна';
        daysToNext = Math.round(23.99361 - moonAge);
    } else {
        phase = 'Старая луна';
        phasePercent = 25 - Math.round((moonAge - 23.99361) / (29.5305882 - 23.99361) * 25);
        nextPhase = 'Новолуние';
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

function updateMoonVisualization(phasePercent) {
    const moonPhase = document.getElementById('moon-phase');
    if (!moonPhase) return;
    
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

// ========== ФУНКЦИИ ДЛЯ ПРОГНОЗОВ ==========
function updateHourlyForecast(forecastData) {
    const container = document.getElementById('hourly-forecast');
    if (!container) return;
    
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
                <span>${temp}${getTemperatureSymbol(currentUnits)}</span>
            </div>
            <div class="hour-weather">${weatherDesc}</div>
        `;
        container.appendChild(hourCard);
    });
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
    const sunrise = sys.sunrise * 1000;
    const sunset = sys.sunset * 1000;
    
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
        return;
    }
    
    ymaps.ready(function() {
        map = new ymaps.Map('map', {
            center: [59.9343, 30.3351], // Центр Питера вместо Москвы
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
                console.log('Геолокация успешна:', lat, lng); // Логируем координаты
                getWeatherByCoords(lat, lng);
                
                if (map) {
                    // Удаляем старый маркер если есть
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
                
                // Более информативное уведомление
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
                

                
                // Используем координаты Питера как fallback
                const fallbackLat = 59.9343;
                const fallbackLng = 30.3351;
                console.log('Используем fallback координаты:', fallbackLat, fallbackLng);
                getWeatherByCoords(fallbackLat, fallbackLng);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000, // Увеличиваем таймаут до 15 секунд
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

// ========== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', () => {
    // Показываем экран загрузки сразу
    showLoadingScreen();
    
    // Загружаем настройки
    loadSettings();
    
    // Инициализируем компоненты
    initMap();
    initTipCarousel();
    initAirQualityHint(); // Инициализация подсказки качества воздуха
    
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
});
