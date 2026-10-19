/**
 * Alchemy Souls — Mobile Adapter Monolith (2026)
 * Полная изоляция мобильного порта: нативный скролл, тач-крафты и защита от автозума.
 */
(function() {
    // Проверка: мобильное устройство по разрешению ИЛИ по userAgent
    const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice) return; // Если открыто на ПК — адаптер полностью засыпает

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

    // Внедрение жестких мобильных CSS-правил для идеальной верстки
    const style = document.createElement('style');
    style.innerHTML = `
        /* Блокируем системный зум браузера ТОЛЬКО на игровом столе и активных элементах */
        #workspace, .item.on-desk { 
            touch-action: none !important; 
            user-select: none !important; 
            -webkit-user-select: none !important;
            -webkit-touch-callout: none !important;
        }
        
        /* Фиксируем высоту стола */
        #workspace { 
            position: relative; 
            overflow: hidden; 
            height: 48vh !important; 
            border: 2px dashed #ff007f;
            box-sizing: border-box;
        }
        
        /* Разрешаем боковым спискам нативный вертикальный скролл */
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            height: 48vh !important;
            padding-bottom: 140px !important; /* Гарантия видимости самого последнего элемента */
            box-sizing: border-box;
            -webkit-overflow-scrolling: touch;
        }

        #items-tab .item, #artists-tab .item {
            touch-action: pan-y !important; /* Элементы в меню мягко скользят вверх/вниз */
        }

        /* Имитация кнопки для поисковой строки без нативного зума клавиатуры */
        #search-box {
            cursor: pointer;
            caret-color: transparent !important;
            font-size: 16px !important;
        }

        .item img { transform: scale(1.05); }
    `;
    document.head.appendChild(style);

    // Защитный JavaScript-глушитель системного pinch-to-zoom и double-tap зума браузера
    window.addEventListener('DOMContentLoaded', () => {
        initMobileControls();
        ;
        initMobileAccelerometer();

        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
            let now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault(); // На корню режем системное приближение экрана
            }
            lastTouchEnd = now;
        }, { passive: false });
    });

    /**
     * 1. АДАПТАЦИЯ ТАЧ-УПРАВЛЕНИЯ (Вытаскивание и перемещение)
     */
    function initMobileControls() {
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        // Контроль тачей в боковом меню: скролл — вертикально, вытаскивание — строго вбок
        const menuTabs = document.querySelectorAll('#items-tab, #artists-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('touchstart', function(e) {
                const itemElement = e.target.closest('.item');
                if (!itemElement || itemElement.closest('.on-desk')) return;

                const startTouch = e.touches[0];
                const startX = startTouch.clientX;
                const startY = startTouch.clientY;
                let itemSpawned = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                function onTouchMove(moveEvent) {
                    if (itemSpawned) return;

                    const moveTouch = moveEvent.touches[0];
                    const diffX = Math.abs(moveTouch.clientX - startX);
                    const diffY = Math.abs(moveTouch.clientY - startY);

                    // Если палец явно потянули по горизонтали на игровой стол
                    if (diffX > 20 && diffX > diffY) {
                        itemSpawned = true;
                        moveEvent.preventDefault(); // Запрещаем вертикальный скролл списка, так как пошел вынос

                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: moveTouch.clientX,
                            clientY: moveTouch.clientY
                        };

                        // Вызываем оригинальный метод создания предмета из script.js
                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        // Мгновенно подхватываем созданный элемент на воркспейсе
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            cleanup();
                            startMobileDrag(moveTouch, lastSpawned, 50, 55);
                        }
                    }
                }

                function onTouchEnd() {
                    // Короткий быстрый тап по художнику открывает оригинальное окно портфолио
                    if (!itemSpawned && itemElement.classList.contains('artist-card')) {
                        showArtistModal(originalData);
                    }
                    cleanup();
                }

                function cleanup() {
                    tab.removeEventListener('touchmove', onTouchMove);
                    tab.removeEventListener('touchend', onTouchEnd);
                }

                tab.addEventListener('touchmove', onTouchMove, { passive: false });
                tab.addEventListener('touchend', onTouchEnd);
            }, { passive: true });
        });

        // ПЕРЕМЕЩЕНИЕ НА СТОЛЕ: Перехват тачей на воркспейсе
        workspace.addEventListener('touchstart', function(e) {
            const searchBox = document.getElementById('search-box');
            if (searchBox && document.activeElement === searchBox) {
                searchBox.blur(); // Сворачиваем поиск при клике на стол
            }

            if (isDraggingNow) return;
            const targetItem = e.target.closest('.item.on-desk');
            if (!targetItem) return;

            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = targetItem.getBoundingClientRect();
            const shiftX = touch.clientX - rect.left;
            const shiftY = touch.clientY - rect.top;

            // Долгий тап (LongPress) заменяет щелчок колесиком для Императора
            if (targetItem.dataset.name === "Император") {
                clearTimeout(longPressTimeout);
                longPressTimeout = setTimeout(() => {
                    window.emperorMiddleClicks = (window.emperorMiddleClicks || 0) + 1;
                    if (window.emperorMiddleClicks >= 10) {
                        checkQuests("emperor_click_trigger");
                    }
                    targetItem.style.transform = "scale(1.3)";
                    setTimeout(() => targetItem.style.transform = "none", 150);
                }, 800);
            }

            startMobileDrag(touch, targetItem, shiftX, shiftY);
        }, { passive: false });

        // Тянем зажатый элемент пальцем по столу
        window.addEventListener('touchmove', function(e) {
            if (!activeDraggedElement) {
                // Ачивка Slime Touch (провести пальцем по меню не беря в руки)
                const touch = e.touches[0];
                const overElement = document.elementFromPoint(touch.clientX, touch.clientY);
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

            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = workspace.getBoundingClientRect();
            
            let x = touch.clientX - rect.left - touchShiftX;
            let y = touch.clientY - rect.top - touchShiftY;

            // Жесткие рамки рабочей зоны стола
            x = Math.max(0, Math.min(x, workspace.clientWidth - activeDraggedElement.clientWidth));
            y = Math.max(0, Math.min(y, workspace.clientHeight - activeDraggedElement.clientHeight));

            activeDraggedElement.style.left = `${x}px`;
            activeDraggedElement.style.top = `${y}px`;

            handleFingerShake(touch, activeDraggedElement);
        }, { passive: false });

        // Отпускаем палец: запускается оригинальная десктопная проверка скрещиваний
        window.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimeout);

            if (!activeDraggedElement) return;
            const element = activeDraggedElement;
            activeDraggedElement = null;
            isDraggingNow = false;

            if (element.dataset.name === "Гнев") {
                window.isHoldingHulkNow = false;
            }

            checkCollisions(element);
            checkQuests();
        });

        // Мобильный поиск через Prompt: 100% спасение от ломающих зумов клавиатуры
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
        activeDraggedElement = element;
        touchShiftX = shiftX;
        touchShiftY = shiftY;
        isDraggingNow = true;

        if (element.dataset.name === "Гнев") {
            window.isHoldingHulkNow = true;
        }

        // Исправлено: берем координаты из первого активного тача массива touches
        const activeTouch = touch && touch[0] ? touch[0] : touch;
        touchStartData = {
            lastX: activeTouch ? activeTouch.clientX : 0,
            lastTime: Date.now(),
            shakeScore: 0
        };
    }

    function handleFingerShake(touch, element) {
        if (!touchStartData) return;
        const nameAttr = element.dataset.name;
        if (nameAttr === "Вишенка" || nameAttr === "Сладость" || nameAttr === "Мрак" || nameAttr === "Mрак") {
            let currentTime = Date.now();
            if (currentTime - touchStartData.lastTime > 40) {
                // Исправлено: безопасное чтение первого пальца для алгоритма ручной встряски
                const activeTouch = touch && touch[0] ? touch[0] : touch;
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
     * 2. КОНАМИ-КОД ЧЕРЕЗ МОБИЛЬНЫЕ СВАЙПЫ
     */
    function initMobileKonami() {
        let xDown = null;
        let yDown = null;
        
        // Панель вкладок сверху — идеальное изолированное место для ввода кода
        const topPanel = document.querySelector('.tabs') || document.body;

        topPanel.addEventListener('touchstart', function(e) {
            // Если игрок нажал одновременно двумя пальцами — это B или A кнопки кода
            if (e.touches.length === 2) {
                checkMobileKonamiSequence("two-tap");
                return;
            }
            if (e.touches && e.touches[0]) {
                xDown = e.touches[0].clientX;
                yDown = e.touches[0].clientY;
            }
        }, { passive: true });

        // Переносим регистрацию жеста на touchend, чтобы свайп считался строго ОДИН раз
        topPanel.addEventListener('touchend', function(e) {
            if (!xDown || !yDown || activeDraggedElement) return;

            // Считываем финальные координаты из ивента изменения (changedTouches)
            if (!e.changedTouches || !e.changedTouches[0]) return;
            let xUp = e.changedTouches[0].clientX;
            let yUp = e.changedTouches[0].clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            // Задаем порог чувствительности в 40 пикселей, чтобы исключить случайные микродвижения
            if (Math.abs(xDiff) > Math.abs(yDiff)) {
                if (Math.abs(xDiff) > 40) {
                    if (xDiff > 0) checkMobileKonamiSequence("left");
                    else checkMobileKonamiSequence("right");
                }
            } else {
                if (Math.abs(yDiff) > 40) {
                    if (yDiff > 0) checkMobileKonamiSequence("up");
                    else checkMobileKonamiSequence("down");
                }
            }
            
            // Обязательно сбрасываем стартовую точку для следующего свайпа
            xDown = null;
            yDown = null;
        }, { passive: true });
    }

    function checkMobileKonamiSequence(gesture) {
        if (gesture === mobileKonamiCode[mobileKonamiIndex]) {
            mobileKonamiIndex++;
            if (mobileKonamiIndex === mobileKonamiCode.length) {
                checkQuests("konami_trigger");
                mobileKonamiIndex = 0;
                if (navigator.vibrate) navigator.vibrate(100);
            }
        } else {
            mobileKonamiIndex = 0;
        }
    }

    /**
     * 3. РЕАЛИЗА─ИЯ ТРЯСКИ ТЕЛЕФОНА (DeviceMotion API)
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
