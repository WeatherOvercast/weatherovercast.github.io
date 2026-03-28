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

// Оценка качества воздуха (0-10 баллов)
function calculateAirQualityScore(airQuality) {
    if (!airQuality?.list?.[0]?.components) return 7; // По умолчанию среднее качество
    
    const comp = airQuality.list[0].components;
    
    // Основные загрязнители и их пороги (ВОЗ)
    const pollutants = [
        { name: 'pm2_5', value: comp.pm2_5, thresholds: [12, 35, 55] }, // µг/м³
        { name: 'pm10', value: comp.pm10, thresholds: [20, 50, 100] },    // µг/м³
        { name: 'no2', value: comp.no2, thresholds: [40, 100, 200] },     // ppb
        { name: 'o3', value: comp.o3, thresholds: [60, 100, 140] },       // ppb
        { name: 'so2', value: comp.so2, thresholds: [20, 80, 250] }       // ppb
    ];
    
    // Рассчитываем средний балл качества воздуха
    let totalScore = 0;
    let validPollutants = 0;
    
    pollutants.forEach(pollutant => {
        if (pollutant.value !== undefined) {
            let score;
            if (pollutant.value <= pollutant.thresholds[0]) {
                score = 10; // Отлично
            } else if (pollutant.value <= pollutant.thresholds[1]) {
                score = 7; // Хорошо
            } else if (pollutant.value <= pollutant.thresholds[2]) {
                score = 4; // Умеренно
            } else {
                score = 1; // Плохо
            }
            totalScore += score;
            validPollutants++;
        }
    });
    
    // CO имеет свои пороги (в ppm)
    if (comp.co !== undefined) {
        const coPpm = comp.co / 1000;
        let score;
        if (coPpm <= 2) score = 10;
        else if (coPpm <= 9) score = 7;
        else if (coPpm <= 35) score = 4;
        else score = 1;
        totalScore += score;
        validPollutants++;
    }
    
    return validPollutants > 0 ? Math.round(totalScore / validPollutants) : 7;
}

// Расчет оценки для активности (с учетом качества воздуха)
function calculateActivityScore(activity, weather, airQuality) {
    if (!weather) return 5;
    
    const temp = weather.main.temp;
    const windSpeed = weather.wind.speed * 3.6; // м/с → км/ч
    const precipitation = weather.rain ? weather.rain['1h'] || weather.rain['3h'] || 0 : 0;
    const clouds = weather.clouds.all;
    
    // Базовые метеоусловия (0-10 баллов)
    let weatherScore = 5;
    
    // 1. Температурный комфорт (основной фактор)
    if (temp >= 15 && temp <= 25) {
        weatherScore = 9; // Идеальная температура
    } else if (temp >= 10 && temp < 15) {
        weatherScore = 7; // Прохладно, но комфортно
    } else if (temp > 25 && temp <= 30) {
        weatherScore = 6; // Тепло, но уже жарковато
    } else if (temp >= 5 && temp < 10) {
        weatherScore = 5; // Холодновато
    } else if (temp > 30 && temp <= 35) {
        weatherScore = 4; // Жарко
    } else if (temp >= 0 && temp < 5) {
        weatherScore = 3; // Холодно
    } else if (temp < 0 || temp > 35) {
        weatherScore = 1; // Экстремальная температура
    }
    
    // 2. Корректировка на ветер
    if (windSpeed > 30) {
        weatherScore -= 3; // Ураганный ветер
    } else if (windSpeed > 20) {
        weatherScore -= 2; // Сильный ветер
    } else if (windSpeed > 12) {
        weatherScore -= 1; // Умеренный ветер
    } else if (windSpeed < 3) {
        weatherScore += 1; // Штиль - бонус для некоторых активностей
    }
    
    // 3. Корректировка на осадки
    if (precipitation > 5) {
        weatherScore -= 4; // Сильный дождь/снег
    } else if (precipitation > 1) {
        weatherScore -= 2; // Небольшие осадки
    } else if (precipitation > 0) {
        weatherScore -= 1; // Легкая морось
    }
    
    // 4. Ограничиваем weatherScore
    weatherScore = Math.min(10, Math.max(0, weatherScore));
    
    // Получаем оценку качества воздуха
    const airQualityScore = calculateAirQualityScore(airQuality);
    
    // Финальная оценка активности
    let finalScore = weatherScore;
    
    // Применяем коэффициент важности качества воздуха для разных активностей
    switch(activity) {
        case 'running':
            // Бег: дыхание учащено, качество воздуха критично
            finalScore = weatherScore * 0.6 + airQualityScore * 0.4;
            
            // Дополнительные корректировки
            if (temp >= 15 && temp <= 20) finalScore += 0.5; // Идеально для бега
            if (windSpeed > 15) finalScore -= 0.5; // Ветер мешает бегу
            if (airQualityScore <= 4) finalScore -= 1; // Плохой воздух особенно вреден
            break;
            
        case 'cycling':
            // Велосипед: активное дыхание + скорость
            finalScore = weatherScore * 0.55 + airQualityScore * 0.45;
            
            // Ветер сильнее влияет на велосипед
            if (windSpeed > 20) finalScore -= 1;
            else if (windSpeed > 12) finalScore -= 0.5;
            
            // Бонус за хорошую погоду
            if (temp >= 18 && temp <= 25 && windSpeed < 10) finalScore += 0.5;
            break;
            
        case 'walking':
            // Прогулка: менее интенсивная нагрузка
            finalScore = weatherScore * 0.7 + airQualityScore * 0.3;
            
            // Бонусы для прогулок
            if (clouds <= 30 && temp >= 10 && temp <= 25) finalScore += 0.5; // Ясная погода
            if (windSpeed < 5) finalScore += 0.5; // Легкий ветерок приятен
            break;
            
        case 'photography':
            // Фото: качество воздуха влияет на видимость и цвета
            finalScore = weatherScore * 0.85 + airQualityScore * 0.15;
            
            // Основной фактор - освещение
            if (clouds <= 20) {
                finalScore += 1; // Ясное небо
            } else if (clouds >= 80) {
                finalScore -= 1.5; // Пасмурно
            }
            
            // Золотой час
            const now = new Date();
            const sunrise = new Date(weather.sys.sunrise * 1000);
            const sunset = new Date(weather.sys.sunset * 1000);
            
            const isGoldenHour = 
                (now >= new Date(sunrise.getTime() + 30*60000) && 
                 now <= new Date(sunrise.getTime() + 90*60000)) ||
                (now >= new Date(sunset.getTime() - 90*60000) && 
                 now <= new Date(sunset.getTime() - 30*60000));
            
            if (isGoldenHour && clouds <= 60) {
                finalScore += 1; // Бонус за золотой час
            }
            
            // Ухудшение видимости при плохом воздухе
            if (airQualityScore <= 4) {
                finalScore -= 0.5; // Смог портит фото
            }
            break;
    }
    
    // Ограничиваем от 0 до 10 и округляем до 1 десятичного знака
    finalScore = Math.min(10, Math.max(0, finalScore));
    return Math.round(finalScore * 2) / 2; // Округление до 0.5
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
        const score = calculateActivityScore(activity, weather, airQuality);
        const scoreElement = document.getElementById(`${activity}-score`);
        
        if (scoreElement) {
            scoreElement.textContent = `${score}/10`;
            
            // Добавляем цветовую индикацию
            const card = scoreElement.closest('.activity-card');
            if (card) {
                if (score >= 8) {
                    card.style.borderLeft = '4px solid #4caf50';
                } else if (score >= 6) {
                    card.style.borderLeft = '4px solid #ff9800';
                } else if (score >= 4) {
                    card.style.borderLeft = '4px solid #ffc107';
                } else {
                    card.style.borderLeft = '4px solid #f44336';
                }
            }
        }
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
            const valueElement = card.querySelector('.air-metric-value');
            if (valueElement) {
                valueElement.innerHTML = `${metric.value}<span class="air-metric-unit">${metric.unit}</span>`;
            }
            
            const statusEl = card.querySelector('.air-metric-status');
            if (statusEl) {
                statusEl.textContent = metric.status.text;
                statusEl.className = `air-metric-status status-${metric.status.level}`;
            }
        }
    });
    
    // Добавляем общую оценку качества воздуха
    const airQualityScore = calculateAirQualityScore(airQuality);
    const airQualityHeader = document.querySelector('.air-quality-header');
    if (airQualityHeader) {
        let qualityText = '';
        let qualityColor = '';
        
        if (airQualityScore >= 8) {
            qualityText = 'Отличное качество воздуха';
            qualityColor = '#4caf50';
        } else if (airQualityScore >= 6) {
            qualityText = 'Хорошее качество воздуха';
            qualityColor = '#8bc34a';
        } else if (airQualityScore >= 4) {
            qualityText = 'Удовлетворительное качество воздуха';
            qualityColor = '#ff9800';
        } else {
            qualityText = 'Плохое качество воздуха';
            qualityColor = '#f44336';
        }
        
        const qualitySpan = airQualityHeader.querySelector('.air-quality-status');
        if (qualitySpan) {
            qualitySpan.textContent = qualityText;
            qualitySpan.style.color = qualityColor;
        }
    }
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