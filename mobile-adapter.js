/**
 * Alchemy Souls — Mobile Adapter Monolith (2026)
 * Изолированная мобильная логика: тачи, свайп-Конами, LongPress и акселерометр.
 */
(function() {
    // Проверка: мобильное устройство по разрешению ИЛИ по userAgent
    const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice) return; // Если десктоп — адаптер засыпает и ничего не трогает

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

    // Инициализация кастомных стилей для удобства тачей (без изменения HTML/CSS игры)
     const style = document.createElement('style');
    style.innerHTML = `
        /* Исправление поисковой строки */
        #search-box { font-size: 16px !important; }
        
        /* Выравниваем нижнюю границу стола по уровню вкладок */
        #workspace { 
            touch-action: none; 
            position: relative; 
            overflow: hidden; 
            height: 50vh !important; /* Корректируем высоту под уровень боковых вкладок */
            border: 2px dashed #ff007f;
            box-sizing: border-box;
        }
        
        /* Разрешаем скролл в меню элементов и художников */
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            height: 50vh !important; /* Меню и стол теперь строго одной высоты */
            -webkit-overflow-scrolling: touch;
        }

        .item { user-select: none; -webkit-user-select: none; }
        .item img { transform: scale(1.05); }
    `;
    document.head.appendChild(style);

    // Ждем полной загрузки DOM и оригинального скрипта
    window.addEventListener('DOMContentLoaded', () => {
        initMobileControls();
        initMobileKonami();
        initMobileAccelerometer();
    });

    /**
     * 1. АДАПТАЦИЯ ТАЧ-УПРАВЛЕНИЯ (Вытаскивание и перемещение)
     */
    function initMobileControls() {
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        // Перехват кликов/тачей в боковом меню с поддержкой скролла и тапов
        document.addEventListener('touchstart', function(e) {
            const itemElement = e.target.closest('#items-tab .item, #artists-tab .item');
            if (itemElement && !e.target.closest('.on-desk')) {
                
                // Фиксируем начальные координаты тача для вычисления скролла
                const startX = e.touches[0].clientX;
                const startY = e.touches[0].clientY;
                let isScrolling = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                // Временный обработчик для разделения скролла меню и вытаскивания элемента
                function onTouchMoveCheck(moveEvent) {
                    const diffX = Math.abs(moveEvent.touches[0].clientX - startX);
                    const diffY = Math.abs(moveEvent.touches[0].clientY - startY);

                    // Если палец двигается преимущественно вертикально — это скролл меню
                    if (diffY > diffX && diffY > 10) {
                        isScrolling = true;
                        cleanup();
                    } 
                    // Если движение вбок на стол — активируем вытаскивание
                    else if (diffX > 15) {
                        moveEvent.preventDefault();
                        cleanup();
                        
                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: moveEvent.touches[0].clientX,
                            clientY: moveEvent.touches[0].clientY
                        };

                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            startMobileDrag(moveEvent.touches[0], lastSpawned, 50, 55);
                        }
                    }
                }

                function onTouchEndCheck() {
                    // Баг №2: Если это был просто короткий быстрый тап без скролла и перетаскивания
                    if (!isScrolling && itemElement.classList.contains('artist-card')) {
                        showArtistModal(originalData); // Открываем модалку художника перед глазами
                    }
                    cleanup();
                }

                function cleanup() {
                    document.removeEventListener('touchmove', onTouchMoveCheck);
                    document.removeEventListener('touchend', onTouchEndCheck);
                }

                document.addEventListener('touchmove', onTouchMoveCheck, { passive: false });
                document.addEventListener('touchend', onTouchEndCheck);
            }
        }, { passive: false });

        workspace.addEventListener('touchstart', function(e) {
            const searchBox = document.getElementById('search-box');
            if (searchBox && document.activeElement === searchBox) {
                searchBox.blur();
            }

            if (isDraggingNow) return;
            const targetItem = e.target.closest('.item.on-desk');
            if (!targetItem) return;

            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = targetItem.getBoundingClientRect();
            const shiftX = touch.clientX - rect.left;
            const shiftY = touch.clientY - rect.top;

            // Обработка ачивки «ЗА ИМПЕРАТОРА!!!» (LongPress вместо клика колесиком)
            if (targetItem.dataset.name === "Император") {
                clearTimeout(longPressTimeout);
                longPressTimeout = setTimeout(() => {
                    window.emperorMiddleClicks = (window.emperorMiddleClicks || 0) + 1;
                    if (window.emperorMiddleClicks >= 10) {
                        checkQuests("emperor_click_trigger");
                    }
                    // Визуальный отклик долгого нажатия
                    targetItem.style.transform = "scale(1.3)";
                    setTimeout(() => targetItem.style.transform = "none", 150);
                }, 800); // 0.8 секунды удержания заменяют среднюю кнопку мыши
            }

            startMobileDrag(touch, targetItem, shiftX, shiftY);
        }, { passive: false });

        // Непрерывное движение пальца по экрану
        window.addEventListener('touchmove', function(e) {
            if (!activeDraggedElement) {
                // Если мы ничего не тащим, проверяем ачивку «Slime touch» (провести пальцем по меню)
                const overElement = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                const listItem = overElement ? overElement.closest('#items-tab .item') : null;
                
                if (listItem && !stats.unlockedQuests.includes("slime_touch")) {
                    window.slimeHovers = (window.slimeHovers || 0) + 1;
                    if (window.slimeHovers >= 50) {
                        checkQuests("slime_hover_trigger");
                        window.slimeHovers = 0;
                    }
                    clearTimeout(window.slimeHoverTimeout);
                    window.slimeHoverTimeout = setTimeout(() => { window.slimeHovers = 0; }, 4000);
                }
                return;
            }

            e.preventDefault(); // Запрещаем скролл страницы во время перетаскивания элементов
            
            const touch = e.touches[0];
            const rect = workspace.getBoundingClientRect();
            
            let x = touch.clientX - rect.left - touchShiftX;
            let y = touch.clientY - rect.top - touchShiftY;

            // Ограничения стола (фиксация внутри workspace)
            x = Math.max(0, Math.min(x, workspace.clientWidth - activeDraggedElement.clientWidth));
            y = Math.max(0, Math.min(y, workspace.clientHeight - activeDraggedElement.clientHeight));

            activeDraggedElement.style.left = `${x}px`;
            activeDraggedElement.style.top = `${y}px`;

            // Дублирующий алгоритм "встряхивания" пальцем (на случай, если гироскоп отключен)
            handleFingerShake(touch, activeDraggedElement);
        }, { passive: false });

        // Отпускание пальца
        window.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimeout); // Сбрасываем лонгпресс Императора

            if (!activeDraggedElement) return;

            const element = activeDraggedElement;
            activeDraggedElement = null;
            isDraggingNow = false;

            if (element.dataset.name === "Гнев") {
                window.isHoldingHulkNow = false;
            }

            // Вызываем оригинальный метод проверки коллизий и квестов из script.js
            checkCollisions(element);
            checkQuests();
        });
    }

    // Вспомогательная функция старта тач-перетаскивания
    function startMobileDrag(touch, element, shiftX, shiftY) {
        activeDraggedElement = element;
        touchShiftX = shiftX;
        touchShiftY = shiftY;
        isDraggingNow = true;

        if (element.dataset.name === "Гнев") {
            window.isHoldingHulkNow = true;
        }

        // Данные для отслеживания ручной тряски пальцем
        touchStartData = {
            lastX: touch.clientX,
            lastTime: Date.now(),
            shakeScore: 0
        };
    }

    // Алгоритм быстрой тряски зажатого элемента влево-вправо пальцем
    function handleFingerShake(touch, element) {
        if (!touchStartData) return;
        const nameAttr = element.dataset.name;
        if (nameAttr === "Вишенка" || nameAttr === "Сладость" || nameAttr === "Мрак" || nameAttr === "Mрак") {
            let currentTime = Date.now();
            if (currentTime - touchStartData.lastTime > 40) {
                let speed = Math.abs(touch.clientX - touchStartData.lastX) / (currentTime - touchStartData.lastTime);
                if (speed > 1.1) {
                    touchStartData.shakeScore++;
                    if (touchStartData.shakeScore >= 12) {
                        if (nameAttr === "Мрак" || nameAttr === "Mрак") checkQuests("shake_mrak");
                        if (nameAttr === "Вишенка") checkQuests("shake_cherry");
                        if (nameAttr === "Сладость") checkQuests("shake_sweet");
                    }
                }
                touchStartData.lastTime = currentTime;
                touchStartData.lastX = touch.clientX;
            }
        }
    }


    /**
     * 2. КОНАМИ-КОД ЧЕРЕЗ МОБИЛЬНЫЕ СВАЙПЫ
     */
    function initMobileKonami() {
        let xDown = null;
        let yDown = null;

        document.addEventListener('touchstart', function(e) {
            // Если тач двумя пальцами — это заменяет кнопки B или A Конами-кода
            if (e.touches.length === 2) {
                checkMobileKonamiSequence("two-tap");
                return;
              }
            xDown = e.touches[0].clientX;
            yDown = e.touches[0].clientY;
        }, false);

        document.addEventListener('touchmove', function(e) {
            if (!xDown || !yDown || activeDraggedElement) return;

            let xUp = e.touches[0].clientX;
            let yUp = e.touches[0].clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > 40) {
                    if (xDiff > 0) checkMobileKonamiSequence("left");
                    else checkMobileKonamiSequence("right");
                    xDown = null; yDown = null;
                }
            } else {
                if (Math.abs(yDiff) > 40) {
                    if (yDiff > 0) checkMobileKonamiSequence("up");
                    else checkMobileKonamiSequence("down");
                    xDown = null; yDown = null;
                }
            }
        }, false);
    }

    function checkMobileKonamiSequence(gesture) {
        if (gesture === mobileKonamiCode[mobileKonamiIndex]) {
            mobileKonamiIndex++;
            if (mobileKonamiIndex === mobileKonamiCode.length) {
                checkQuests("konami_trigger");
                mobileKonamiIndex = 0;
            }
        } else {
            mobileKonamiIndex = 0;
        }
    }

    function initMobileAccelerometer() {
        let lastX = null, lastY = null, lastZ = null;
        let threshold = 25;

        // Просто вешаем событие напрямую без генерации раздражающих кнопок
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
            navigator.vibrate([100, 50, 100]);
        }
    }

})();
