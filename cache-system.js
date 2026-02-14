// cache-system.js
// Система кеширования данных погоды

class WeatherCacheSystem {
    constructor() {
        this.CACHE_KEY = 'weatherCache';
        this.CACHE_TIMESTAMP_KEY = 'weatherCacheTimestamp';
        this.cacheDuration = 30 * 60 * 1000; // 30 минут
        this.loadingIndicator = null;
        this.isUpdating = false;
        
        // Создаем индикатор загрузки при инициализации
        this.createLoadingIndicator();
    }

    // Создание кружка загрузки - НОВЫЙ ДИЗАЙН
    createLoadingIndicator() {
        // Удаляем существующий индикатор, если есть
        const existingIndicator = document.querySelector('.weather-loading-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Создаем новый индикатор (только кружок, без текста)
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'weather-loading-indicator';
        this.loadingIndicator.innerHTML = `
            <div class="loading-spinner">
                <svg viewBox="0 0 50 50" class="spinner-svg">
                    <circle class="spinner-circle-bg" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="2"/>
                    <circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
            </div>
        `;
        
        // Добавляем стили, если их еще нет
        this.addLoadingStyles();
        
        document.body.appendChild(this.loadingIndicator);
    }

    // Добавление стилей для индикатора - ОБНОВЛЕННЫЕ СТИЛИ
    addLoadingStyles() {
        // Проверяем, есть ли уже стили
        if (document.getElementById('weather-cache-styles')) return;

        const style = document.createElement('style');
        style.id = 'weather-cache-styles';
        style.textContent = `
            /* Индикатор загрузки - минималистичный дизайн */
            .weather-loading-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .weather-loading-indicator.visible {
                opacity: 1;
            }

            .weather-loading-indicator.flying-up {
                animation: flyUpAndFade 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .loading-spinner {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 60px;
                height: 60px;
            }

            .spinner-svg {
                width: 50px;
                height: 50px;
                animation: rotate 1.2s linear infinite;
                filter: drop-shadow(0 0 8px rgba(78, 205, 196, 0.5));
            }

            .spinner-circle-bg {
                stroke: rgba(78, 205, 196, 0.2);
            }

            .spinner-circle {
                stroke: #4ecdc4;
                stroke-dasharray: 125;
                stroke-dashoffset: 100;
                animation: dash 1.5s ease-in-out infinite;
            }

            /* Анимации */
            @keyframes rotate {
                100% {
                    transform: rotate(360deg);
                }
            }

            @keyframes dash {
                0% {
                    stroke-dashoffset: 125;
                }
                50% {
                    stroke-dashoffset: 30;
                }
                100% {
                    stroke-dashoffset: 125;
                }
            }

            @keyframes flyUpAndFade {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                30% {
                    opacity: 1;
                    transform: translate(-50%, -80%) scale(1.1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -150%) scale(0.8);
                }
            }

            /* Адаптивность */
            @media (max-width: 480px) {
                .loading-spinner {
                    width: 50px;
                    height: 50px;
                }
                
                .spinner-svg {
                    width: 40px;
                    height: 40px;
                }
            }

            @media (max-width: 380px) {
                .loading-spinner {
                    width: 45px;
                    height: 45px;
                }
                
                .spinner-svg {
                    width: 36px;
                    height: 36px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    // Сохранение данных в кеш
    saveToCache(weatherData, forecastData, airQualityData, cityName, coords) {
        const cacheData = {
            weather: weatherData,
            forecast: forecastData,
            airQuality: airQualityData,
            city: cityName,
            coords: coords,
            timestamp: new Date().getTime()
        };

        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
            localStorage.setItem(this.CACHE_TIMESTAMP_KEY, cacheData.timestamp.toString());
            console.log('✅ Данные погоды сохранены в кеш', new Date().toLocaleTimeString());
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения в кеш:', error);
            return false;
        }
    }

    // Загрузка данных из кеша
    loadFromCache() {
        try {
            const cachedData = localStorage.getItem(this.CACHE_KEY);
            if (!cachedData) {
                console.log('ℹ️ Кеш пуст');
                return null;
            }

            const data = JSON.parse(cachedData);
            const timestamp = data.timestamp;
            const now = new Date().getTime();
            const age = now - timestamp;

            console.log(`📦 Данные из кеша: возраст ${Math.round(age / 60000)} минут`);

            return {
                ...data,
                age: age,
                isValid: age < this.cacheDuration
            };
        } catch (error) {
            console.error('❌ Ошибка загрузки из кеша:', error);
            return null;
        }
    }

    // Проверка наличия валидного кеша
    hasValidCache() {
        const cache = this.loadFromCache();
        return cache && cache.isValid;
    }

    // Отображение данных из кеша
    displayCachedData() {
        const cache = this.loadFromCache();
        if (!cache || !cache.weather) {
            console.log('ℹ️ Нет данных в кеше для отображения');
            return false;
        }

        console.log('🔄 Отображаем данные из кеша');
        
        if (typeof window.updateMobileWeather === 'function') {
            window.updateMobileWeather(cache.weather);
        }
        
        if (cache.forecast) {
            if (typeof window.updateMobileForecastData === 'function') {
                window.updateMobileForecastData(cache.forecast);
            }
            if (typeof window.updateMobileHourlyData === 'function') {
                window.updateMobileHourlyData(cache.forecast);
            }
        }
        
        if (cache.airQuality && typeof window.updateMobileAirQualityData === 'function') {
            window.updateMobileAirQualityData(cache.airQuality);
        }
        
        if (typeof window.updateMobileSunData === 'function') {
            window.updateMobileSunData(cache.weather);
        }
        
        if (typeof window.smartReminders !== 'undefined' && window.smartReminders && 
            typeof window.smartReminders.updateReminder === 'function') {
            window.smartReminders.updateReminder(cache.weather, cache.forecast);
        }
        
        return true;
    }

    // Показать индикатор загрузки
    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('flying-up', 'hidden');
            this.loadingIndicator.classList.add('visible');
            this.isUpdating = true;
        }
    }

    // Скрыть индикатор загрузки с анимацией
    hideLoadingWithAnimation() {
        if (this.loadingIndicator && this.isUpdating) {
            this.loadingIndicator.classList.add('flying-up');
            
            setTimeout(() => {
                this.loadingIndicator.classList.remove('visible', 'flying-up');
                this.isUpdating = false;
            }, 800);
        }
    }

    // Очистка кеша
    clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            localStorage.removeItem(this.CACHE_TIMESTAMP_KEY);
            console.log('🗑️ Кеш очищен');
            return true;
        } catch (error) {
            console.error('❌ Ошибка очистки кеша:', error);
            return false;
        }
    }

    // Получение времени последнего обновления
    getLastUpdateTime() {
        const cache = this.loadFromCache();
        if (cache && cache.timestamp) {
            return new Date(cache.timestamp);
        }
        return null;
    }

    // Форматирование времени последнего обновления
    getLastUpdateTimeFormatted() {
        const lastUpdate = this.getLastUpdateTime();
        if (!lastUpdate) return 'никогда';
        
        return lastUpdate.toLocaleString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'numeric'
        });
    }
}

// Создаем глобальный экземпляр системы кеширования
const weatherCache = new WeatherCacheSystem();

// Функция для показа уведомления об использовании кеша
function showOfflineNotification(message) {
    if (document.querySelector('.cache-notification')) return;
    
    const notification = document.createElement('div');
    notification.className = 'cache-notification';
    notification.textContent = message;
    
    const style = document.createElement('style');
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
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

window.weatherCache = weatherCache;
window.showOfflineNotification = showOfflineNotification;