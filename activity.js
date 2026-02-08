// Используем данные из main скрипта
const API_KEY = 'b5f3fc6e8095ecb49056466acb6c59da';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Проверяем, есть ли данные из main скрипта
async function getDataFromMainScript() {
    try {
        // Если main скрипт уже загрузил данные, используем их
        if (window.currentCityData && window.forecastData && window.airQualityData) {
            return {
                weather: window.currentCityData,
                forecast: window.forecastData,
                airQuality: window.airQualityData
            };
        }
        
        // Если нет, получаем геолокацию и загружаем данные
        const coords = await getLocation();
        const [weather, airQuality] = await Promise.all([
            fetchWeatherData(coords.latitude, coords.longitude),
            fetchAirQualityData(coords.latitude, coords.longitude)
        ]);
        
        return { weather, airQuality, forecast: null };
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        return null;
    }
}

// Получение геолокации
function getLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ latitude: 55.7558, longitude: 37.6173 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position.coords),
            () => resolve({ latitude: 55.7558, longitude: 37.6173 }),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 }
        );
    });
}

// Получение данных о погоде
async function fetchWeatherData(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`,
            { timeout: 7000 }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        return null;
    }
}

// Получение данных о качестве воздуха
async function fetchAirQualityData(lat, lon) {
    try {
        const response = await fetch(
            `${AIR_POLLUTION_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
            { timeout: 7000 }
        );
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка получения качества воздуха:', error);
        return null;
    }
}

//Расчет оценки для активности
function calculateActivityScore(activity, weather) {
    if (!weather) return 5;
    
    const temp = weather.main.temp;
    const windSpeed = weather.wind.speed * 3.6; // м/с → км/ч
    
    let score = 5;
    
    switch(activity) {
        case 'running':
        case 'cycling':
        case 'walking':
            // Логика для активностей на улице (бег, велосипед, прогулка)
            if (temp < 10) {
                // Холодно
                if (windSpeed > 20) {
                    score = 3; // Холодно + сильный ветер
                } else {
                    score = 6; // Холодно + слабый ветер
                }
            } else if (temp >= 10 && temp <= 25) {
                // Тепло/комфортно
                if (windSpeed > 15) {
                    score = 7; // Тепло + ветрено
                } else {
                    score = 9; // Тепло + безветренно
                }
            } else if (temp > 25) {
                // Жарко
                if (windSpeed > 15) {
                    score = 6; // Жарко + ветрено
                } else {
                    score = 4; // Жарко + безветренно (душно)
                }
            }
            
            // Небольшие корректировки для разных активностей
            if (activity === 'running') {
                // Для бега ветер немного критичнее
                if (windSpeed > 25) score -= 1;
                // Идеальная температура для бега 15-20°
                if (temp >= 15 && temp <= 20) score += 1;
            } else if (activity === 'cycling') {
                // Для велосипеда ветер очень критичен
                if (windSpeed > 20) score -= 2;
                else if (windSpeed > 10) score -= 1;
            }
            break;
            
        case 'photography':
            // Фотосъемка зависит ТОЛЬКО от облачности
            const clouds = weather.clouds.all;
            
            if (clouds <= 20) {
                score = 9; // Мало облаков - отлично
            } else if (clouds <= 40) {
                score = 8; // Немного облаков - хорошо
            } else if (clouds <= 60) {
                score = 6; // Умеренная облачность - нормально
            } else if (clouds <= 80) {
                score = 4; // Много облаков - плохо
            } else {
                score = 2; // Почти пасмурно - очень плохо
            }
            
            // Бонус для золотого часа
            const now = new Date();
            const sunrise = new Date(weather.sys.sunrise * 1000);
            const sunset = new Date(weather.sys.sunset * 1000);
            
            const isGoldenHour = 
                (now >= new Date(sunrise.getTime() + 30*60000) && 
                 now <= new Date(sunrise.getTime() + 90*60000)) ||
                (now >= new Date(sunset.getTime() - 90*60000) && 
                 now <= new Date(sunset.getTime() - 30*60000));
            
            if (isGoldenHour && clouds <= 60) {
                score += 1; // +1 балл в золотой час
            }
            break;
    }
    
    // Ограничиваем от 0 до 10 и округляем
    return Math.min(10, Math.max(0, Math.round(score)));
}

// Обновление UI
function updateUI(weather, airQuality) {
    if (!weather) {
        document.getElementById('activity-subtitle').textContent = 'Ошибка загрузки данных';
        return;
    }

    // Обновляем заголовок
    document.getElementById('activity-subtitle').textContent = 
        `Идеальные условия для занятий в ${weather.name}`;

    // Обновляем карточки активностей
    ['running', 'cycling', 'walking', 'photography'].forEach(activity => {
        const score = calculateActivityScore(activity, weather);
        document.getElementById(`${activity}-score`).textContent = `${score}/10`;
    });

    // Обновляем качество воздуха (если есть данные)
    if (airQuality) {
        updateAirQualityUI(airQuality);
    }
}

// Обновление качества воздуха
function updateAirQualityUI(airQuality) {
    if (!airQuality?.list?.[0]?.components) return;
    
    const comp = airQuality.list[0].components;
    
    const metrics = [
        { name: 'PM2.5', value: comp.pm2_5, unit: 'µg/m³', status: getPM25Status(comp.pm2_5) },
        { name: 'PM10', value: comp.pm10, unit: 'µg/m³', status: getPM10Status(comp.pm10) },
        { name: 'CO', value: (comp.co / 1000).toFixed(1), unit: 'ppm', status: getCOStatus(comp.co) },
        { name: 'NO₂', value: comp.no2.toFixed(1), unit: 'ppb', status: getNO2Status(comp.no2) },
        { name: 'O₃', value: comp.o3.toFixed(1), unit: 'ppb', status: getO3Status(comp.o3) },
        { name: 'SO₂', value: comp.so2.toFixed(1), unit: 'ppb', status: getSO2Status(comp.so2) }
    ];
    
    const cards = document.querySelectorAll('.air-metric-card');
    cards.forEach((card, index) => {
        if (metrics[index]) {
            const metric = metrics[index];
            card.querySelector('.air-metric-value').innerHTML = 
                `${metric.value}<span class="air-metric-unit">${metric.unit}</span>`;
            
            const statusEl = card.querySelector('.air-metric-status');
            statusEl.textContent = metric.status.text;
            statusEl.className = `air-metric-status status-${metric.status.level}`;
        }
    });
}

// Статусы качества воздуха (ВОЗ стандарты)
function getPM25Status(value) {
    if (value <= 12) return { text: 'Отлично', level: 'excellent' };
    if (value <= 35) return { text: 'Хорошо', level: 'good' };
    if (value <= 55) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

function getPM10Status(value) {
    if (value <= 20) return { text: 'Отлично', level: 'excellent' };
    if (value <= 50) return { text: 'Хорошо', level: 'good' };
    if (value <= 100) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

function getCOStatus(value) {
    const ppm = value / 1000;
    if (ppm <= 2) return { text: 'Отлично', level: 'excellent' };
    if (ppm <= 9) return { text: 'Хорошо', level: 'good' };
    if (ppm <= 35) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

function getNO2Status(value) {
    if (value <= 40) return { text: 'Отлично', level: 'excellent' };
    if (value <= 100) return { text: 'Хорошо', level: 'good' };
    if (value <= 200) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

function getO3Status(value) {
    if (value <= 60) return { text: 'Отлично', level: 'excellent' };
    if (value <= 100) return { text: 'Хорошо', level: 'good' };
    if (value <= 140) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

function getSO2Status(value) {
    if (value <= 20) return { text: 'Отлично', level: 'excellent' };
    if (value <= 80) return { text: 'Хорошо', level: 'good' };
    if (value <= 250) return { text: 'Умеренно', level: 'moderate' };
    return { text: 'Плохо', level: 'poor' };
}

// Основная функция
async function loadActivityData() {
    try {
        const data = await getDataFromMainScript();
        if (data) {
            updateUI(data.weather, data.airQuality);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('activity-subtitle').textContent = 
            'Ошибка загрузки. Проверьте соединение.';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadActivityData();
    
    // Обновление каждые 5 минут
    setInterval(loadActivityData, 5 * 60 * 1000);
    
    // Анимация при нажатии на карточки
    document.querySelectorAll('.activity-card, .air-metric-card').forEach(card => {
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.96)';
        });
        
        card.addEventListener('touchend', () => {
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        });
    });
});