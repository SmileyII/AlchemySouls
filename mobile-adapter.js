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
        /* Блокируем зум и системные жесты только на столе и уже вытащенных предметах */
        #workspace, .item.on-desk { 
            touch-action: none !important; 
            user-select: none !important; 
            -webkit-user-select: none !important;
        }
        
        /* Разрешаем элементам в боковом меню свободно скроллиться вверх и вниз */
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 120px !important; /* Безопасный отступ для последнего элемента */
            box-sizing: border-box;
        }

        #items-tab .item, #artists-tab .item {
            touch-action: pan-y !important; /* Палец мягко листает список, не заедая */
        }
    `;
    document.head.appendChild(style);

    // Ждем полной загрузки DOM и оригинального скрипта
    window.addEventListener('DOMContentLoaded', () => {
        initMobileControls();
        initMobileKonami();
        initMobileAccelerometer();
        
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
    let now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault(); // Глушим системный зум браузера
    }
    lastTouchEnd = now;
}, { passive: false });
    });

    /**
     * 1. АДАПТАЦИЯ ТАЧ-УПРАВЛЕНИЯ (Вытаскивание и перемещение)
     */
            // Четкое разделение: скролл меню — вверх/вниз, вытаскивание на стол — вбок
        const menuTabs = document.querySelectorAll('#items-tab, #artists-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('touchstart', function(e) {
                const itemElement = e.target.closest('.item');
                if (!itemElement || itemElement.closest('.on-desk')) return;

                // Запоминаем стартовую точку касания пальца
                const startX = e.touches[0].clientX;
                const startY = e.touches[0].clientY;
                let itemSpawned = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                function onTouchMove(moveEvent) {
                    if (itemSpawned) return;

                    const currentX = moveEvent.touches[0].clientX;
                    const currentY = moveEvent.touches[0].clientY;

                    const diffX = Math.abs(currentX - startX);
                    const diffY = Math.abs(currentY - startY);

                    // Если палец движется преимущественно по горизонтали (вбок на стол)
                    if (diffX > 20 && diffX > diffY) {
                        itemSpawned = true;
                        moveEvent.preventDefault(); // Блокируем вертикальный скролл меню только сейчас

                        // Передаем координаты в оригинальный спавнер строго на игровой стол
                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: currentX,
                            clientY: currentY
                        };

                        // Спавним элемент на воркспейс через оригинальную функцию
                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        // Принудительно корректируем координаты нового элемента, чтобы он не улетал под меню
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            cleanup();
                            // Подхватываем палец и тащим элемент по столу
                            startMobileDrag(moveEvent.touches[0], lastSpawned, 50, 55);
                        }
                    }
                }

                function onTouchEnd() {
                    // Если это был просто короткий тап без скролла и это карточка художника
                    if (!itemSpawned && itemElement.classList.contains('artist-card')) {
                        showArtistModal(originalData); // Открываем модалку портфолио перед глазами
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

        // ДВИЖЕНИЕ НА СТОЛЕ: Перехват тачей на самом воркспейсе
        workspace.addEventListener('touchstart', function(e) {
            // Прячем клавиатуру при тапе по столу
            const searchBox = document.getElementById('search-box');
            if (searchBox && document.activeElement === searchBox) {
                searchBox.blur();
            }

            if (isDraggingNow) return;
            const targetItem = e.target.closest('.item.on-desk');
            if (!targetItem) return;

            e.preventDefault(); // Полная изоляция от системных жестов браузера
            
            const touch = e.touches[0];
            const rect = targetItem.getBoundingClientRect();
            const shiftX = touch.clientX - rect.left;
            const shiftY = touch.clientY - rect.top;

            // Логика LongPress для ачивки «ЗА ИМПЕРАТОРА!!!»
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

        // Непрерывное перемещение зажатого элемента по столу
        window.addEventListener('touchmove', function(e) {
            if (!activeDraggedElement) {
                // Логика ачивки Slime Touch
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

            e.preventDefault(); // Намертво блокируем скролл страницы во время игры
            
            const touch = e.touches[0];
            const rect = workspace.getBoundingClientRect();
            
            let x = touch.clientX - rect.left - touchShiftX;
            let y = touch.clientY - rect.top - touchShiftY;

            x = Math.max(0, Math.min(x, workspace.clientWidth - activeDraggedElement.clientWidth));
            y = Math.max(0, Math.min(y, workspace.clientHeight - activeDraggedElement.clientHeight));

            activeDraggedElement.style.left = `${x}px`;
            activeDraggedElement.style.top = `${y}px`;

            handleFingerShake(touch, activeDraggedElement);
        }, { passive: false });

        // Отпускание пальца с расчетом оригинального крафта
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
        // Безопасный мобильный поиск через Prompt (Защита от зума)
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
        touchStartData = {
            // Исправлено: если передан массив touches, берем координаты первого пальца [0]
            lastX: touch[0] ? touch[0].clientX : touch.clientX,
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
                // Исправлено: если передан массив touches, берем clientX первого пальца [0]
                const currentX = touch[0] ? touch[0].clientX : touch.clientX;
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
        document.addEventListener('touchstart', function(e) {
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
            navigator.vibrate([80, 50, 80]);
        }
    }
})();
