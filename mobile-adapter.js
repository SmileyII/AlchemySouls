/**
 * Alchemy Souls — Mobile Adapter Monolith (2026)
 * Полная изоляция мобильного управления: фикс зума, скролла и тач-перетаскивания.
 */
(function() {
    // Проверка: мобильное устройство по разрешению ИЛИ по userAgent
    const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice) return; // Если десктоп — адаптер полностью засыпает

    console.log("Alchemy Souls: Mobile Mode Activated 📱");

    // Глобальные переменные для мобильных жестов
    let touchStartData = null;
    let longPressTimeout = null;
    let activeDraggedElement = null;
    let touchShiftX = 0;
    let touchShiftY = 0;

    // Переменные для Конами-кода по свайпам
    const mobileKonamiCode = ["up", "up", "down", "down", "left", "right", "left", "right", "two-tap", "two-tap"];
    let mobileKonamiIndex = 0;

    // Внедрение жестких мобильных стилей для полной блокировки браузерного зума и скролла страницы
    const style = document.createElement('style');
    style.innerHTML = `
        #workspace, .item.on-desk { 
            touch-action: none !important; 
            user-select: none !important; 
            -webkit-user-select: none !important;
        }
        
        /* Безопасное ограничение стола: углы теперь четко на экране, без каши */
        #workspace { 
            position: relative; 
            overflow: hidden; 
            max-height: 45vh !important; 
            border: 2px dashed #ff007f;
            box-sizing: border-box;
        }
        
        /* Полностью восстанавливаем нативный вертикальный скролл меню элементов */
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: scroll !important;
            max-height: 45vh !important;
            padding-bottom: 130px !important;
            box-sizing: border-box;
            -webkit-overflow-scrolling: touch;
        }

        #items-tab .item, #artists-tab .item {
            touch-action: pan-y !important;
        }
    `;
    document.head.appendChild(style);

    // Ждем полной загрузки DOM и оригинального скрипта
    window.addEventListener('DOMContentLoaded', () => {
        initMobileControls();
        initMobileKonami();
        initMobileAccelerometer();
        
        // Дополнительный жесткий запрет pinch-to-zoom на всем документе игры
        document.addEventListener('gesturestart', function(e) {
            e.preventDefault();
        }, { passive: false });
    });

    /**
     * 1. АДАПТАЦИЯ ТАЧ-УПРАВЛЕНИЯ (Вытаскивание и перемещение)
     */
    function initMobileControls() {
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        // Фикс Бага №5 и №2: Контроль тачей внутри бокового меню элементов/художников
        const menuTabs = document.querySelectorAll('#items-tab, #artists-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('touchstart', function(e) {
                const itemElement = e.target.closest('.item');
                if (!itemElement || itemElement.closest('.on-desk')) return;

                // Запоминаем координаты первого касания из массива touches
                const startTouch = e.touches[0];
                const startX = startTouch.clientX;
                const startY = startTouch.clientY;
                let hasMovedSignificantly = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                function onTouchMove(moveEvent) {
                    const moveTouch = moveEvent.touches[0];
                    const diffX = Math.abs(moveTouch.clientX - startX);
                    const diffY = Math.abs(moveTouch.clientY - startY);

                    // Если палец явно потянули вбок (на игровой стол) — отменяем вертикальный скролл меню и создаем элемент
                    if (diffX > 15 && diffX > diffY && !hasMovedSignificantly) {
                        hasMovedSignificantly = true;
                        moveEvent.preventDefault(); // Запрещаем скролл меню
                        
                        // Передаем точные координаты первого касания в оригинальный спавнер
                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: moveTouch.clientX,
                            clientY: moveTouch.clientY
                        };

                        // Вызываем оригинальный метод из script.js
                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        // Находим созданный элемент на столе
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            removeListeners();
                            // Подхватываем элемент для перетаскивания
                            startMobileDrag(moveTouch, lastSpawned, 50, 55);
                        }
                    }
                }

                function onTouchEnd() {
                    // Баг №2: Быстрый тап по художнику открывает модальное окно просмотра
                    if (!hasMovedSignificantly && itemElement.classList.contains('artist-card')) {
                        showArtistModal(originalData);
                    }
                    removeListeners();
                }

                function removeListeners() {
                    tab.removeEventListener('touchmove', onTouchMove);
                    tab.removeEventListener('touchend', onTouchEnd);
                }

                tab.addEventListener('touchmove', onTouchMove, { passive: false });
                tab.addEventListener('touchend', onTouchEnd);
            }, { passive: true });
        });

        // ДВИЖЕНИЕ НА СТОЛЕ: Перехват тачей на самом воркспейсе
        workspace.addEventListener('touchstart', function(e) {
            // Прячем клавиатуру при тапе по столу
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const userQuery = prompt("Поиск элементов и авторов:", searchBox.value);
                if (userQuery !== null) {
                    searchBox.value = userQuery;
                    if (typeof searchBox.oninput === 'function') {
                        searchBox.oninput();
                    }
                }
            }, { passive: false });
        }
    }

    function startMobileDrag(touch, element, shiftX, shiftY) {
        if (!touch || !element) return;
        activeDraggedElement = element;
        touchShiftX = shiftX;
        touchShiftY = shiftY;
        isDraggingNow = true;

        if (element.dataset.name === "Гнев") {
            window.isHoldingHulkNow = true;
        }

        // Безопасное извлечение координат без риска получить NaN
        const activeTouch = touch[0] || touch;
        touchStartData = {
            lastX: activeTouch ? activeTouch.clientX : 0,
            lastTime: Date.now(),
            shakeScore: 0
        };
    }

    function handleFingerShake(touch, element) {
        if (!touchStartData || !touch) return;
        const nameAttr = element.dataset.name;
        if (nameAttr === "Вишенка" || nameAttr === "Сладость" || nameAttr === "Мрак" || nameAttr === "Mрак") {
            let currentTime = Date.now();
            if (currentTime - touchStartData.lastTime > 40) {
                const activeTouch = touch[0] || touch;
                const currentX = activeTouch ? activeTouch.clientX : 0;
                
                let speed = Math.abs(currentX - touchStartData.lastX) / (currentTime - touchStartData.lastTime);
                if (speed > 1.1) {
                    touchStartData.shakeScore++;
                    if (touchStartData.shakeScore >= 12) {
                        if (nameAttr === "Мрак" || nameAttr === "Mрак") checkQuests("shake_mrak");
                        if (nameAttr === "Вишенка") checkQuests("shake_cherry");
                        if (nameAttr === "Сладость") checkQuests("shake_sweet");
                    }
                }
                touchStartData.lastTime = currentTime;
                touchStartData.lastX = currentX;
            }
        }
    }

    /**
     * 2. КОНАМИ-КОД ЧЕРЕЗ МОБИЛЬНЫЕ СВАЙПЫ (Привязан к логотипу/шапке игры)
     */
    function initMobileKonami() {
        let xDown = null;
        let yDown = null;
        
        // Считываем жесты Конами только на самом верхнем контейнере (заголовке) во избежание сбросов
        const topHeader = document.querySelector('header') || document.body;

        topHeader.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
                checkMobileKonamiSequence("two-tap");
                return;
            }
            const t = e.touches[0];
            xDown = t.clientX;
            yDown = t.clientY;
        }, { passive: true });

        topHeader.addEventListener('touchmove', function(e) {
            if (!xDown || !yDown || activeDraggedElement) return;

            const t = e.touches[0];
            let xUp = t.clientX;
            let yUp = t.clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > 45) {
                    if (xDiff > 0) checkMobileKonamiSequence("left");
                    else checkMobileKonamiSequence("right");
                    xDown = null; yDown = null;
                }
            } else {
                if (Math.abs(yDiff) > 45) {
                    if (yDiff > 0) checkMobileKonamiSequence("up");
                    else checkMobileKonamiSequence("down");
                    xDown = null; yDown = null;
                }
            }
        }, { passive: true });
    }

    function checkMobileKonamiSequence(gesture) {
        if (gesture === mobileKonamiCode[mobileKonamiIndex]) {
            mobileKonamiIndex++;
            if (mobileKonamiIndex === mobileKonamiCode.length) {
                checkQuests("konami_trigger");
                mobileKonamiIndex = 0;
                if (navigator.vibrate) navigator.vibrate([50, 50]);
            }
        } else {
            mobileKonamiIndex = 0;
        }
    }

    /**
     * 3. РЕАЛИЗАЦИЯ ТРЯСКИ ТЕЛЕФОНА (DeviceMotion API)
     */
    function initMobileAccelerometer() {
        let lastX = null, lastY = null, lastZ = null;
        let threshold = 25;
        window.addEventListener('devicemotion', handleMotion, false);

        function handleMotion(event) {
            let acceleration = event.accelerationIncludingGravity;
            if (!acceleration || !activeDraggedElement) return;
            let currentX = acceleration.x;
            let currentY = acceleration.y;
            let currentZ = acceleration.z;

            if (lastX !== null) {
                let deltaX = Math.abs(lastX - currentX);
                let deltaY = Math.abs(lastY - currentY);
                let deltaZ = Math.abs(lastZ - currentZ);

                if ((deltaX > threshold && deltaY > threshold) || deltaZ > threshold + 10) {
                    const nameAttr = activeDraggedElement.dataset.name;
                    if (nameAttr === "Вишенка") {
                        checkQuests("shake_cherry");
                        playMobileVibrate();
                    }
                    if (nameAttr === "Сладость") {
                        checkQuests("shake_sweet");
                        playMobileVibrate();
                    }
                    if (nameAttr === "Мрак" || nameAttr === "Mрак") {
                        checkQuests("shake_mrak");
                        playMobileVibrate();
                    }
                }
            }
            lastX = currentX;
            lastY = currentY;
            lastZ = currentZ;
        }
    }

    function playMobileVibrate() {
        if (navigator.vibrate) {
            navigator.vibrate(60);
        }
    }
})();
