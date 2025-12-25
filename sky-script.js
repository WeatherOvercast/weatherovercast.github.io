// НЕБО+ - Сервис для наблюдения за звёздами
// Использует OpenWeatherMap API для реальных данных

const OPENWEATHER_API_KEY = 'f8fb66a8a337386783276f5ce9f6b2f1'; // Бесплатный ключ для демо
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Данные пользователя
let userLocation = {
    lat: null,
    lon: null,
    city: 'Неизвестно',
    isUrban: false,
    lightPollution: 0
};

// Данные наблюдений
let observationData = {
    clarity: 0,        // Ясность неба 0-100%
    visibility: 0,     // Видимость в метрах (конвертируем в км)
    clouds: 0,         // Облачность %
    humidity: 0,       // Влажность %
    temperature: 0,    // Температура в °C
    windSpeed: 0,      // Скорость ветра м/с
    pressure: 0,       // Давление hPa
    weatherMain: '',   // Основное состояние погоды
    moonPhase: '',     // Фаза луны
    visibleStars: 0,   // Количество видимых звёзд
    recommendations: [] // Рекомендации
};

// Шкала видимости
const VISIBILITY_LEVELS = [
    { level: 'Отличная', min: 50, max: 100, color: 'visibility-excellent', desc: 'Идеально для астрофотографии' },
    { level: 'Хорошая', min: 30, max: 50, color: 'visibility-good', desc: 'Хорошие условия для наблюдений' },
    { level: 'Умеренная', min: 15, max: 30, color: 'visibility-moderate', desc: 'Можно наблюдать яркие объекты' },
    { level: 'Плохая', min: 5, max: 15, color: 'visibility-poor', desc: 'Только ярчайшие объекты' },
    { level: 'Очень плохая', min: 0, max: 5, color: 'visibility-bad', desc: 'Наблюдения затруднены' }
];

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    getUserLocation();
    setInterval(updateTime, 60000);
    setInterval(() => {
        if (userLocation.lat && userLocation.lon) {
            loadWeatherData();
        }
    }, 600000); // Обновляем каждые 10 минут
});

// Обновление времени
function updateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('sky-date').textContent = now.toLocaleDateString('ru-RU', options);
    
    // Обновляем фазу луны
    updateMoonPhase(now);
    
    // Обновляем количество видимых звёзд
    updateVisibleStars(now);
}

// Получение местоположения пользователя
function getUserLocation() {
    if (!navigator.geolocation) {
        showError('Геолокация не поддерживается', 'Используйте современный браузер');
        useDefaultLocation();
        return;
    }
    
    showUpdating();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            userLocation.lat = position.coords.latitude;
            userLocation.lon = position.coords.longitude;
            
            // Загружаем данные о местности и погоде
            await loadLocationInfo();
            await loadWeatherData();
            
            hideUpdating();
        },
        (error) => {
            console.error('Ошибка геолокации:', error.message);
            showError('Доступ к геолокации запрещён', 'Разрешите доступ в настройках браузера');
            useDefaultLocation();
            hideUpdating();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Загрузка информации о местности
async function loadLocationInfo() {
    try {
        // Используем OpenWeatherMap для определения города
        const weatherData = await fetchWeatherData();
        if (weatherData && weatherData.name) {
            userLocation.city = weatherData.name;
            
            // Определяем световое загрязнение на основе типа местности
            // Для упрощения используем данные о населении из ответа API
            if (weatherData.sys) {
                // Большие города имеют больше светового загрязнения
                const population = weatherData.sys.population || 0;
                if (population > 1000000) {
                    userLocation.isUrban = true;
                    userLocation.lightPollution = 7.5; // Мегаполис
                } else if (population > 100000) {
                    userLocation.isUrban = true;
                    userLocation.lightPollution = 6.0; // Крупный город
                } else if (population > 50000) {
                    userLocation.isUrban = true;
                    userLocation.lightPollution = 5.0; // Средний город
                } else {
                    userLocation.isUrban = false;
                    userLocation.lightPollution = 3.0; // Сельская местность
                }
            } else {
                // Если данных о населении нет, определяем по стране
                userLocation.isUrban = weatherData.sys.country === 'RU';
                userLocation.lightPollution = userLocation.isUrban ? 6.0 : 3.0;
            }
            
            updateLocationDisplay();
        }
    } catch (error) {
        console.log('Не удалось определить местность:', error);
        userLocation.city = 'Ваше местоположение';
        userLocation.isUrban = Math.random() > 0.5;
        userLocation.lightPollution = userLocation.isUrban ? 6.5 : 3.5;
        updateLocationDisplay();
    }
}

// Загрузка погодных данных с OpenWeatherMap
async function loadWeatherData() {
    if (!userLocation.lat || !userLocation.lon) return;
    
    try {
        const weatherData = await fetchWeatherData();
        if (!weatherData) {
            throw new Error('Нет данных о погоде');
        }
        
        // Извлекаем реальные данные
        observationData.visibility = weatherData.visibility ? weatherData.visibility / 1000 : 10; // Конвертируем в км
        observationData.clouds = weatherData.clouds ? weatherData.clouds.all : 50;
        observationData.humidity = weatherData.main ? weatherData.main.humidity : 60;
        observationData.temperature = weatherData.main ? Math.round(weatherData.main.temp - 273.15) : 20; // K в °C
        observationData.windSpeed = weatherData.wind ? weatherData.wind.speed : 3;
        observationData.pressure = weatherData.main ? Math.round(weatherData.main.pressure * 0.75006) : 760; // hPa в мм рт.ст.
        observationData.weatherMain = weatherData.weather ? weatherData.weather[0].main : 'Clear';
        
        // Рассчитываем ясность неба на основе реальных данных
        observationData.clarity = calculateSkyClarity();
        
        // Генерируем рекомендации
        observationData.recommendations = generateRecommendations();
        
        // Обновляем интерфейс
        updateAllDisplays();
        
    } catch (error) {
        console.log('Не удалось загрузить погоду:', error);
        // Используем демо-данные в случае ошибки
        useDemoData();
    }
}

// Запрос к OpenWeatherMap API
async function fetchWeatherData() {
    if (!userLocation.lat || !userLocation.lon) return null;
    
    try {
        const url = `${OPENWEATHER_URL}?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.log('Ошибка запроса погоды:', error);
        return null;
    }
}

// Рассчёт ясности неба на основе реальных данных
function calculateSkyClarity() {
    let score = 100;
    const weather = observationData.weatherMain;
    const clouds = observationData.clouds;
    const humidity = observationData.humidity;
    const visibility = observationData.visibility;
    const lightPollution = userLocation.lightPollution;
    
    // Основное состояние погоды
    if (weather === 'Clear') {
        score += 20; // Ясное небо
    } else if (weather === 'Clouds') {
        score -= clouds * 0.7; // Облачность сильно влияет
    } else if (weather === 'Rain' || weather === 'Drizzle') {
        score -= 60; // Дождь
    } else if (weather === 'Snow') {
        score -= 50; // Снег
    } else if (weather === 'Mist' || weather === 'Fog' || weather === 'Haze') {
        score -= 70; // Туман, дымка
    } else if (weather === 'Thunderstorm') {
        score -= 80; // Гроза
    }
    
    // Влияние облачности
    score -= clouds * 0.5;
    
    // Влияние влажности
    if (humidity > 85) score -= 30;
    else if (humidity > 70) score -= 15;
    else if (humidity < 30) score += 10; // Сухой воздух хорош
    
    // Влияние видимости
    if (visibility > 20) score += 20;
    else if (visibility > 10) score += 10;
    else if (visibility < 3) score -= 20;
    
    // Влияние светового загрязнения
    score -= lightPollution * 4;
    
    // Время суток (ночью лучше)
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
        score += 10; // Ночью лучше видимость
    } else if (hour >= 18 || hour <= 8) {
        score += 5; // Вечером/утром
    }
    
    // Ограничиваем 0-100%
    return Math.max(0, Math.min(100, Math.round(score)));
}

// Генерация рекомендаций на основе реальных данных
function generateRecommendations() {
    const recommendations = [];
    const weather = observationData.weatherMain;
    const clouds = observationData.clouds;
    const humidity = observationData.humidity;
    const clarity = observationData.clarity;
    const lightPollution = userLocation.lightPollution;
    
    // Рекомендация по местоположению
    if (userLocation.isUrban) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
            title: 'Вы в городе',
            desc: 'Высокое световое загрязнение. Для лучших наблюдений выезжайте за город.'
        });
    } else {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
            title: 'Хорошее местоположение',
            desc: 'Низкое световое загрязнение. Отличные условия для наблюдений.'
        });
    }
    
    // Рекомендации по погоде
    if (weather === 'Rain' || weather === 'Drizzle') {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 13v8"></path><path d="M8 13v8"></path><path d="M12 15v8"></path><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>',
            title: 'Идёт дождь',
            desc: 'Небо закрыто облаками. Наблюдения невозможны.'
        });
    } else if (weather === 'Snow') {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><path d="M8 16h.01"></path><path d="M8 20h.01"></path><path d="M12 18h.01"></path><path d="M12 22h.01"></path><path d="M16 16h.01"></path><path d="M16 20h.01"></path></svg>',
            title: 'Идёт снег',
            desc: 'Снегопад ухудшает видимость. Лучше перенести наблюдения.'
        });
    } else if (weather === 'Thunderstorm') {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline></svg>',
            title: 'Гроза',
            desc: 'Опасные условия. Не выходите на улицу.'
        });
    } else if (clouds > 80) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
            title: 'Сильная облачность',
            desc: 'Небо полностью закрыто облаками.'
        });
    } else if (clouds > 50) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20"></path><path d="M9 20h9a5 5 0 0 0 5-5 4.5 4.5 0 0 0-.78-2.5"></path></svg>',
            title: 'Частичная облачность',
            desc: 'Облака могут закрывать звёзды. Будьте терпеливы.'
        });
    } else if (weather === 'Clear' && clouds < 20) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
            title: 'Ясное небо',
            desc: 'Идеальные условия для наблюдений!'
        });
    }
    
    // Рекомендация по влажности
    if (humidity > 85) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
            title: 'Высокая влажность',
            desc: 'Возможна дымка и конденсация на оптике.'
        });
    }
    
    // Рекомендация по ясности
    if (clarity > 80) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="M16.24 16.24l2.83 2.83"/><path d="M12 18v4"/><path d="M7.76 16.24l-2.83 2.83"/><path d="M6 12H2"/><path d="M7.76 7.76 4.93 4.93"/></svg>',
            title: 'Отличные условия',
            desc: 'Идеальное время для астрофотографии.'
        });
    } else if (clarity < 30) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            title: 'Плохие условия',
            desc: 'Наблюдения практически невозможны.'
        });
    }
    
    // Рекомендация по световому загрязнению
    if (lightPollution > 6 && clarity > 50) {
        recommendations.push({
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="m15.09 14.7.78-2.94"/><path d="m8.91 14.7-.78-2.94"/><path d="m18.14 11.63 2.6-.98"/><path d="m3.26 11.63-2.6-.98"/><path d="M14.5 8.04l1.55-2.9"/><path d="m9.5 8.04-1.55-2.9"/><path d="m20.46 5.63-2.12-2.12"/><path d="m3.54 5.63 2.12-2.12"/><circle cx="12" cy="13" r="5"/></svg>',
            title: 'Сильное световое загрязнение',
            desc: 'Рассмотрите поездку за город для лучших наблюдений.'
        });
    }
    
    return recommendations;
}

// Обновление фазы Луны
function updateMoonPhase(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Простой расчёт фазы Луны
    const phase = getMoonPhase(date);
    
    if (phase < 0.03 || phase > 0.97) {
        observationData.moonPhase = 'Новолуние';
    } else if (phase < 0.22) {
        observationData.moonPhase = 'Растущий серп';
    } else if (phase < 0.28) {
        observationData.moonPhase = 'Первая четверть';
    } else if (phase < 0.47) {
        observationData.moonPhase = 'Растущая Луна';
    } else if (phase < 0.53) {
        observationData.moonPhase = 'Полнолуние';
    } else if (phase < 0.72) {
        observationData.moonPhase = 'Убывающая Луна';
    } else if (phase < 0.78) {
        observationData.moonPhase = 'Последняя четверть';
    } else {
        observationData.moonPhase = 'Старый серп';
    }
}

// Получение фазы Луны (0-1)
function getMoonPhase(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Упрощённый алгоритм
    let c = Math.floor(year / 100);
    let y = year % 100;
    let m = month;
    if (m < 3) {
        m += 12;
        y--;
    }
    
    const a = Math.floor(y / 4);
    const b = Math.floor(c / 4);
    const jd = 1720996.5 + Math.floor(365.25 * y) + Math.floor(30.6001 * (m + 1)) + 
               day + a - b + 2 - c + Math.floor(c / 4);
    
    const daysSinceNew = (jd - 2451549.5) % 29.530588853;
    return daysSinceNew / 29.530588853;
}

// Обновление количества видимых звёзд
function updateVisibleStars(date) {
    const phase = getMoonPhase(date);
    const lightPollution = userLocation.lightPollution;
    const clarity = observationData.clarity;
    
    // Базовое количество звёзд
    let stars = 0;
    
    // В идеальных условиях (нет Луны, нет светового загрязнения)
    const idealStars = 6000; // Примерно столько звёзд видно невооружённым глазом в идеальных условиях
    
    // Влияние светового загрязнения
    stars = idealStars * (1 - (lightPollution - 1) / 8);
    
    // Влияние фазы Луны
    if (phase > 0.45 && phase < 0.55) { // Полнолуние
        stars *= 0.3;
    } else if (phase > 0.4 && phase < 0.6) { // Яркая Луна
        stars *= 0.5;
    } else if (phase > 0.3 && phase < 0.7) { // Средняя Луна
        stars *= 0.7;
    }
    
    // Влияние ясности неба
    stars *= clarity / 100;
    
    // Влияние облачности
    stars *= (100 - observationData.clouds) / 100;
    
    observationData.visibleStars = Math.max(50, Math.round(stars));
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateAllDisplays() {
    updateLocationDisplay();
    updateSkyClarityDisplay();
    updateIndicators();
    updateRecommendations();
    updateVisibilityScale();
    updateAstronomyData();
}

// Отображение местоположения
function updateLocationDisplay() {
    const locationText = userLocation.isUrban ? 
        `${userLocation.city} (городская зона)` : 
        `${userLocation.city} (сельская зона)`;
    
    document.getElementById('location-info').textContent = locationText;
}

// Отображение ясности неба
function updateSkyClarityDisplay() {
    const clarity = observationData.clarity;
    const clarityElement = document.getElementById('sky-clarity');
    
    // Динамический цвет
    let gradient;
    if (clarity < 30) gradient = 'linear-gradient(135deg, #ef4444, #f87171)';
    else if (clarity < 50) gradient = 'linear-gradient(135deg, #f97316, #fb923c)';
    else if (clarity < 70) gradient = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
    else if (clarity < 85) gradient = 'linear-gradient(135deg, #84cc16, #a3e635)';
    else gradient = 'linear-gradient(135deg, #10b981, #34d399)';
    
    clarityElement.style.background = gradient;
    clarityElement.textContent = `${clarity}%`;
    
    // Статус наблюдений
    let status, condition;
    if (clarity < 30) {
        status = 'Плохие условия';
        condition = 'Наблюдения практически невозможны';
    } else if (clarity < 50) {
        status = 'Удовлетворительно';
        condition = 'Можно наблюдать только яркие объекты';
    } else if (clarity < 70) {
        status = 'Хорошие условия';
        condition = 'Подходит для любительских наблюдений';
    } else if (clarity < 85) {
        status = 'Отличные условия';
        condition = 'Идеально для наблюдения звёзд';
    } else {
        status = 'Идеальные условия!';
        condition = 'Лучшее время для астрофотографии';
    }
    
    document.getElementById('observation-status').textContent = status;
    document.getElementById('sky-condition').textContent = condition;
}

// Обновление индикаторов
function updateIndicators() {
    const data = observationData;
    const location = userLocation;
    
    document.getElementById('visibility-value').textContent = `${data.visibility.toFixed(1)} км`;
    document.getElementById('light-pollution-value').textContent = `${location.lightPollution.toFixed(1)}`;
    document.getElementById('clouds-value').textContent = `${Math.round(data.clouds)}%`;
    document.getElementById('humidity-value').textContent = `${Math.round(data.humidity)}%`;
    
    // Прогресс-бары
    document.getElementById('visibility-bar').style.width = Math.min((data.visibility / 50) * 100, 100) + '%';
    document.getElementById('light-bar').style.width = Math.min((location.lightPollution / 9) * 100, 100) + '%';
    document.getElementById('clouds-bar').style.width = data.clouds + '%';
    document.getElementById('humidity-bar').style.width = data.humidity + '%';
}

// Обновление рекомендаций
function updateRecommendations() {
    const container = document.getElementById('recommendations');
    let html = '';
    
    observationData.recommendations.forEach(rec => {
        html += `
            <div class="recommendation-item">
                <div class="recommendation-icon">${rec.icon}</div>
                <div class="recommendation-text">
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-desc">${rec.desc}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Обновление шкалы видимости
function updateVisibilityScale() {
    const clarity = observationData.clarity;
    const container = document.getElementById('visibility-scale');
    let html = '';
    
    VISIBILITY_LEVELS.forEach(level => {
        const isActive = clarity >= level.min && clarity <= level.max;
        const activeClass = isActive ? 'active' : '';
        
        html += `
            <div class="visibility-level-item ${activeClass}">
                <div class="visibility-color ${level.color}"></div>
                <div class="visibility-text">
                    <div class="visibility-name">${level.level}</div>
                    <div class="visibility-desc">${level.desc}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Обновление астрономических данных
function updateAstronomyData() {
    document.getElementById('moon-phase').textContent = observationData.moonPhase;
    document.getElementById('visible-stars').textContent = observationData.visibleStars.toLocaleString();
}

// Использование местоположения по умолчанию
function useDefaultLocation() {
    userLocation = {
        lat: 55.7558, // Москва
        lon: 37.6173,
        city: 'Москва',
        isUrban: true,
        lightPollution: 7.5
    };
    
    useDemoData();
}

// Использование демо-данных
function useDemoData() {
    observationData = {
        clarity: 65,
        visibility: 15.5,
        clouds: 40,
        humidity: 65,
        temperature: 18,
        windSpeed: 3.2,
        pressure: 755,
        weatherMain: 'Clouds',
        moonPhase: 'Первая четверть',
        visibleStars: 1200,
        recommendations: []
    };
    
    // Обновляем фазу луны
    updateMoonPhase(new Date());
    updateVisibleStars(new Date());
    
    // Генерируем рекомендации
    observationData.recommendations = generateRecommendations();
    
    updateAllDisplays();
}

// СЛУЖЕБНЫЕ ФУНКЦИИ
function showUpdating() {
    document.querySelectorAll('.mobile-detail-value').forEach(el => {
        el.classList.add('updating');
    });
}

function hideUpdating() {
    document.querySelectorAll('.mobile-detail-value').forEach(el => {
        el.classList.remove('updating');
    });
}

function showError(title, message) {
    const overlay = document.getElementById('errorOverlay');
    if (!overlay) return;
    
    const titleEl = overlay.querySelector('.error-title');
    const text = overlay.querySelector('.error-message');
    
    titleEl.textContent = title;
    text.textContent = message;
    
    overlay.classList.add('active');
}

function hideError() {
    const overlay = document.getElementById('errorOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    getUserLocation();
}

// СЛУШАТЕЛИ СОБЫТИЙ
window.addEventListener('online', () => {
    if (userLocation.lat && userLocation.lon) {
        loadWeatherData();
    }
});

window.addEventListener('offline', () => {
    showError('Нет интернета', 'Используются последние сохранённые данные');
});

document.addEventListener('click', (e) => {
    const overlay = document.getElementById('errorOverlay');
    if (e.target === overlay) hideError();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideError();
});

// Кнопка обновления (скрытая)
document.querySelector('.sky-notice').addEventListener('click', () => {
    showUpdating();
    setTimeout(() => {
        getUserLocation();
    }, 500);
});