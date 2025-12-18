// СОЛНЦЕ+ - КОСМИЧЕСКАЯ ПОГОДА
// РЕАЛЬНЫЕ ДАННЫЕ ИЗ NOAA

// API NOAA
const NOAA_API = {
    // Текущий Kp-индекс - РАБОЧИЙ
    KP_CURRENT: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
    
    // Прогноз Kp - РАБОЧИЙ
    KP_FORECAST: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
    
    // Солнечный ветер - РАБОЧИЙ
    SOLAR_WIND: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
    
    // Магнитное поле - РАБОЧИЙ
    IMF: 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json',
    
    // Рентгеновские вспышки - РАБОЧИЙ
    XRAY: 'https://services.swpc.noaa.gov/products/goes/xray-flux.json'
};

// Данные по умолчанию
let spaceWeather = {
    kp: 0,
    windSpeed: 0,
    flareChance: 0,
    fieldBz: 0,
    density: 0,
    temperature: 0,
    xrayFlux: 0,
    lastUpdate: null,
    source: 'NOAA SWPC'
};

// Шкала бурь
const STORM_LEVELS = [
    { level: 'G5', name: 'Экстремальная', kp: '9', color: 'level-g5', impact: 'Сильное воздействие на сети' },
    { level: 'G4', name: 'Сильная', kp: '8', color: 'level-g4', impact: 'Проблемы с навигацией' },
    { level: 'G3', name: 'Умеренная', kp: '7', color: 'level-g3', impact: 'Влияет на спутники' },
    { level: 'G2', name: 'Слабая', kp: '6', color: 'level-g2', impact: 'Возможны авроры' },
    { level: 'G1', name: 'Незначительная', kp: '5', color: 'level-g1', impact: 'Слабые колебания' },
    { level: 'G0', name: 'Спокойно', kp: '0-4', color: 'level-g0', impact: 'Минимальное воздействие' }
];

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    loadRealData(); // ЗАГРУЖАЕМ РЕАЛЬНЫЕ ДАННЫЕ
    setInterval(updateTime, 60000);
    setInterval(loadRealData, 300000); // Обновляем каждые 5 минут
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
    document.getElementById('solar-date').textContent = now.toLocaleDateString('ru-RU', options);
}

// ОСНОВНАЯ ФУНКЦИЯ - ЗАГРУЗКА РЕАЛЬНЫХ ДАННЫХ
async function loadRealData() {
    if (!navigator.onLine) {
        useOfflineData();
        return;
    }
    
    showUpdating();
    
    try {
        // 1. Загружаем Kp-индекс
        const kpData = await fetchData(NOAA_API.KP_CURRENT);
        if (kpData) {
            parseKpData(kpData);
        }
        
        // 2. Загружаем солнечный ветер
        const windData = await fetchData(NOAA_API.SOLAR_WIND);
        if (windData) {
            parseWindData(windData);
        }
        
        // 3. Загружаем магнитное поле
        const imfData = await fetchData(NOAA_API.IMF);
        if (imfData) {
            parseImfData(imfData);
        }
        
        // 4. Загружаем рентгеновские вспышки
        const xrayData = await fetchData(NOAA_API.XRAY);
        if (xrayData) {
            parseXrayData(xrayData);
        }
        
        // 5. Обновляем интерфейс
        updateAllDisplays();
        
        // 6. Сохраняем время обновления
        spaceWeather.lastUpdate = new Date();
        
    } catch (error) {
        console.log('Используем кэшированные данные:', error.message);
        useOfflineData();
    }
    
    hideUpdating();
}

// ПАРСИНГ Kp-ИНДЕКСА (РЕАЛЬНЫЕ ДАННЫЕ)
function parseKpData(data) {
    try {
        if (Array.isArray(data) && data.length > 0) {
            // Последняя запись - текущий Kp
            const lastEntry = data[data.length - 1];
            
            // Формат: ["2024-12-21 18:00:00", "1.67"]
            if (lastEntry[1]) {
                const kpValue = parseFloat(lastEntry[1]);
                if (!isNaN(kpValue)) {
                    spaceWeather.kp = kpValue;
                    console.log('Получен Kp из NOAA:', kpValue);
                }
            }
        }
    } catch (error) {
        console.log('Ошибка парсинга Kp:', error);
    }
}

// ПАРСИНГ СОЛНЕЧНОГО ВЕТРА (РЕАЛЬНЫЕ ДАННЫЕ)
function parseWindData(data) {
    try {
        if (Array.isArray(data) && data.length > 0) {
            const lastEntry = data[data.length - 1];
            
            // Формат: [time, density, speed, temperature]
            if (lastEntry[2]) {
                const speed = parseFloat(lastEntry[2]);
                if (!isNaN(speed)) {
                    spaceWeather.windSpeed = Math.round(speed);
                }
            }
            
            if (lastEntry[1]) {
                const density = parseFloat(lastEntry[1]);
                if (!isNaN(density)) {
                    spaceWeather.density = density;
                }
            }
            
            if (lastEntry[3]) {
                const temp = parseFloat(lastEntry[3]);
                if (!isNaN(temp)) {
                    spaceWeather.temperature = Math.round(temp);
                }
            }
        }
    } catch (error) {
        console.log('Ошибка парсинга ветра:', error);
    }
}

// ПАРСИНГ МАГНИТНОГО ПОЛЯ (РЕАЛЬНЫЕ ДАННЫЕ)
function parseImfData(data) {
    try {
        if (Array.isArray(data) && data.length > 0) {
            const lastEntry = data[data.length - 1];
            
            // Формат: [time, bx, by, bz, ...]
            if (lastEntry[3]) {
                const bz = parseFloat(lastEntry[3]);
                if (!isNaN(bz)) {
                    spaceWeather.fieldBz = bz;
                }
            }
        }
    } catch (error) {
        console.log('Ошибка парсинга IMF:', error);
    }
}

// ПАРСИНГ РЕНТГЕНОВСКИХ ВСПЫШЕК (РЕАЛЬНЫЕ ДАННЫЕ)
function parseXrayData(data) {
    try {
        if (Array.isArray(data) && data.length > 0) {
            // Берем последние 10 записей для анализа
            const recent = data.slice(-10);
            let maxFlux = 0;
            
            recent.forEach(entry => {
                if (entry[2]) { // Long flux
                    const flux = parseFloat(entry[2]);
                    if (!isNaN(flux) && flux > maxFlux) {
                        maxFlux = flux;
                    }
                }
            });
            
            // Преобразуем поток в вероятность вспышек
            // 1e-7 = спокойно, 1e-5 = вспышка M-класса, 1e-4 = X-класса
            if (maxFlux > 1e-4) {
                spaceWeather.flareChance = 90;
            } else if (maxFlux > 1e-5) {
                spaceWeather.flareChance = 70;
            } else if (maxFlux > 1e-6) {
                spaceWeather.flareChance = 40;
            } else {
                spaceWeather.flareChance = 20;
            }
            
            spaceWeather.xrayFlux = maxFlux;
        }
    } catch (error) {
        console.log('Ошибка парсинга X-ray:', error);
    }
}

// ФУНКЦИЯ ЗАПРОСА С ТАЙМАУТОМ
async function fetchData(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { 
            signal: controller.signal,
            mode: 'cors',
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.log(`Не загружено: ${url.split('/').pop()}`, error.name);
        return null;
    }
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА С РЕАЛЬНЫМИ ДАННЫМИ
function updateAllDisplays() {
    updateKpDisplay();
    updateIndicators();
    updateStormScale();
    updateSolarMetrics();
    updateEarthImpact();
}

// ОТОБРАЖЕНИЕ Kp С РЕАЛЬНЫМИ ДАННЫМИ
function updateKpDisplay() {
    const kp = spaceWeather.kp;
    const kpElement = document.getElementById('current-kp');
    
    // Динамический цвет
    let gradient;
    if (kp < 5) gradient = 'linear-gradient(135deg, #10b981, #34d399)';
    else if (kp < 6) gradient = 'linear-gradient(135deg, #84cc16, #a3e635)';
    else if (kp < 7) gradient = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
    else if (kp < 8) gradient = 'linear-gradient(135deg, #f97316, #fb923c)';
    else if (kp < 9) gradient = 'linear-gradient(135deg, #ef4444, #f87171)';
    else gradient = 'linear-gradient(135deg, #dc2626, #fca5a5)';
    
    kpElement.style.background = gradient;
    kpElement.textContent = `Kp ${kp.toFixed(1)}`;
    
    // Статус бури
    let status, impact;
    if (kp < 5) {
        status = 'Спокойно';
        impact = 'Геомагнитное поле стабильное';
    } else if (kp < 6) {
        status = 'Незначительные возмущения';
        impact = 'Слабые колебания магнитного поля';
    } else if (kp < 7) {
        status = 'Слабая магнитная буря';
        impact = 'Возможны помехи в радиосвязи';
    } else if (kp < 8) {
        status = 'Умеренная магнитная буря';
        impact = 'Влияет на спутники и навигацию';
    } else if (kp < 9) {
        status = 'Сильная магнитная буря';
        impact = 'Воздействие на энергосети и связь';
    } else {
        status = 'Экстремальная магнитная буря';
        impact = 'Серьезные перебои в системах';
    }
    
    document.getElementById('storm-status').textContent = status;
    document.getElementById('storm-impact').textContent = impact;
}

// ОБНОВЛЕНИЕ ИНДИКАТОРОВ С РЕАЛЬНЫМИ ДАННЫМИ
function updateIndicators() {
    const data = spaceWeather;
    
    // Реальные значения из NOAA
    document.getElementById('wind-value').textContent = data.windSpeed || '--';
    document.getElementById('flare-value').textContent = data.flareChance || '--';
    document.getElementById('field-value').textContent = data.fieldBz ? data.fieldBz.toFixed(1) : '--';
    
    // Рассчитываем активность на основе реальных данных
    const activity = calculateActivity();
    document.getElementById('activity-value').textContent = activity;
    
    // Прогресс-бары на основе реальных данных
    document.getElementById('wind-bar').style.width = Math.min(((data.windSpeed || 0) / 700) * 100, 100) + '%';
    document.getElementById('flare-bar').style.width = (data.flareChance || 0) + '%';
    document.getElementById('field-bar').style.width = Math.min((Math.abs(data.fieldBz || 0) / 15) * 100, 100) + '%';
}

// РАСЧЕТ АКТИВНОСТИ НА ОСНОВЕ РЕАЛЬНЫХ ДАННЫХ
function calculateActivity() {
    const data = spaceWeather;
    let score = 0;
    
    // Kp (макс 40 баллов)
    score += Math.min(data.kp * 4, 40);
    
    // Солнечный ветер (макс 30 баллов)
    if (data.windSpeed > 500) score += 30;
    else if (data.windSpeed > 400) score += 20;
    else if (data.windSpeed > 300) score += 10;
    
    // Вероятность вспышек (макс 20 баллов)
    score += Math.min(data.flareChance / 5, 20);
    
    // IMF Bz (макс 10 баллов)
    if (Math.abs(data.fieldBz) > 10) score += 10;
    else if (Math.abs(data.fieldBz) > 5) score += 5;
    
    return Math.min(score, 100);
}

// ОБНОВЛЕНИЕ ШКАЛЫ БУРЬ
function updateStormScale() {
    const kp = spaceWeather.kp;
    const container = document.getElementById('storm-scale');
    let html = '';
    
    STORM_LEVELS.forEach(level => {
        const isActive = kp >= parseFloat(level.kp);
        const activeClass = isActive ? 'active' : '';
        
        html += `
            <div class="storm-level-item ${activeClass}">
                <div class="level-color ${level.color}"></div>
                <div class="level-text">
                    <div class="level-name">${level.level} - ${level.name}</div>
                    <div class="level-desc">${level.impact}</div>
                </div>
                <div class="level-kp">Kp ${level.kp}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ОБНОВЛЕНИЕ СОЛНЕЧНЫХ ПОКАЗАТЕЛЕЙ
function updateSolarMetrics() {
    const data = spaceWeather;
    
    let state, spots, xray;
    
    // Состояние по Kp
    if (data.kp < 5) state = 'нормальное';
    else if (data.kp < 7) state = 'повышенная';
    else state = 'высокая';
    
    // Пятна по плотности солнечного ветра
    if (data.density < 5) spots = 'низкая';
    else if (data.density < 10) spots = 'средняя';
    else spots = 'высокая';
    
    // Рентгеновский поток
    if (data.xrayFlux < 1e-6) xray = 'спокойный';
    else if (data.xrayFlux < 1e-5) xray = 'умеренный';
    else xray = 'активный';
    
    document.getElementById('solar-state').textContent = state;
    document.getElementById('sunspots-count').textContent = spots;
    document.getElementById('xray-flux').textContent = xray;
}

// ОБНОВЛЕНИЕ ВОЗДЕЙСТВИЯ
function updateEarthImpact() {
    const kp = spaceWeather.kp;
    const container = document.getElementById('earth-impact');
    
    const impacts = [
        { icon: '📡', title: 'Радиосвязь' },
        { icon: '🛰️', title: 'Спутники' },
        { icon: '⚡', title: 'Энергосети' },
        { icon: '🧭', title: 'Навигация' },
        { icon: '🛩️', title: 'Авиация' },
        { icon: '🌌', title: 'Полярные сияния' }
    ];
    
    let html = '';
    
    // РЕАЛЬНОЕ ВОЗДЕЙСТВИЕ ПО УРОВНЮ Kp
    impacts.forEach((impact, index) => {
        let desc = '';
        
        switch(index) {
            case 0: // Радиосвязь
                if (kp < 5) desc = 'Стабильная работа на всех частотах';
                else if (kp < 6) desc = 'Незначительные помехи на ВЧ частотах';
                else if (kp < 7) desc = 'Помехи на коротких и средних волнах';
                else if (kp < 8) desc = 'Серьезные помехи, возможны отключения';
                else desc = 'Глобальные сбои в радиосвязи';
                break;
                
            case 1: // Спутники
                if (kp < 5) desc = 'Оборудование функционирует нормально';
                else if (kp < 6) desc = 'Незначительные сбои в передаче данных';
                else if (kp < 7) desc = 'Проблемы с ориентацией спутников';
                else if (kp < 8) desc = 'Опасность повреждения электроники';
                else desc = 'Высокий риск повреждений, потеря связи';
                break;
                
            case 2: // Энергосети
                if (kp < 5) desc = 'Напряжение в сетях стабильное';
                else if (kp < 6) desc = 'Слабые колебания в энергосистемах';
                else if (kp < 7) desc = 'Требуется контроль напряжения';
                else if (kp < 8) desc = 'Риск скачков напряжения';
                else desc = 'Возможны массовые отключения';
                break;
                
            case 3: // Навигация
                if (kp < 5) desc = 'GPS/ГЛОНАСС работают точно';
                else if (kp < 6) desc = 'Погрешности до 50 метров';
                else if (kp < 7) desc = 'Погрешности 100-200 метров';
                else if (kp < 8) desc = 'Системы могут быть недоступны';
                else desc = 'Навигация временно неработоспособна';
                break;
                
            case 4: // Авиация
                if (kp < 5) desc = 'Полеты без ограничений';
                else if (kp < 6) desc = 'Рекомендуется менять маршруты';
                else if (kp < 7) desc = 'Ограничения в полярных регионах';
                else if (kp < 8) desc = 'Отмена рейсов через полярные зоны';
                else desc = 'Полное прекращение полетов в регионах';
                break;
                
            case 5: // Полярные сияния
                if (kp < 5) desc = 'Только в высоких широтах';
                else if (kp < 6) desc = 'Могут наблюдаться на широтах 55°+';
                else if (kp < 7) desc = 'Хорошо видны на широтах 45°+';
                else if (kp < 8) desc = 'Видны на широтах до 40°';
                else desc = 'Могут наблюдаться в тропиках';
                break;
        }
        
        html += `
            <div class="impact-item">
                <div class="impact-icon">${impact.icon}</div>
                <div class="impact-text">
                    <div class="impact-title">${impact.title}</div>
                    <div class="impact-desc">${desc}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ОФФЛАЙН РЕЖИМ
function useOfflineData() {
    spaceWeather = {
        kp: 3.7,
        windSpeed: 420,
        flareChance: 35,
        fieldBz: 2.1,
        density: 3.2,
        temperature: 80000,
        xrayFlux: 1.2e-7,
        lastUpdate: new Date(),
        source: 'Кэшированные данные'
    };
    
    updateAllDisplays();
    showError('NO_INTERNET', 'Используются кэшированные данные');
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

function showError(type, message) {
    const overlay = document.getElementById('errorOverlay');
    if (!overlay) return;
    
    const title = overlay.querySelector('.error-title');
    const text = overlay.querySelector('.error-message');
    
    title.textContent = type === 'NO_INTERNET' ? 'Нет интернета' : 'Ошибка данных';
    text.textContent = message;
    
    overlay.classList.add('active');
}

function hideError() {
    const overlay = document.getElementById('errorOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    loadRealData();
}

// СЛУШАТЕЛИ СОБЫТИЙ
window.addEventListener('online', loadRealData);
window.addEventListener('offline', () => useOfflineData());

document.addEventListener('click', (e) => {
    const overlay = document.getElementById('errorOverlay');
    if (e.target === overlay) hideError();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideError();
});


// Плавное появление уведомления
document.addEventListener('DOMContentLoaded', () => {
    // Остальной код инициализации...
    
    // Показываем уведомление о разработке
    setTimeout(() => {
        const notification = document.querySelector('.dev-notification');
        if (notification) {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }
    }, 300);
});
