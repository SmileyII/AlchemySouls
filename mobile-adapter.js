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

    const mobileKonamiCode = [
        "items", "items", "items", "items", 
        "artists", "artists", "artists", "artists", 
        "achievements", "achievements"
    ];
    let mobileKonamiIndex = 0;

    // Внедрение жестких мобильных CSS-правил для идеальной верстки
    const style = document.createElement('style');
    style.innerHTML = `
        /* Блокируем системный зум браузера ТОЛЬКО на игровом столе и активных элементах */
        #workspace, .item.on-desk, #items-tab { 
            touch-action: none !important; 
            user-select: none !important; 
            -webkit-user-select: none !important;
            -webkit-touch-callout: none !important;
        }
        
        #achievements-tab {
            touch-action: auto !important; 
            overflow-y: auto !important;
            height: 89vh !important;
            padding-bottom: 240px !important;
            box-sizing: border-box;
        }
        
        /* Фиксируем высоту стола */
        #workspace { 
            position: relative; 
            overflow: hidden; 
            height: 89vh !important; 
            border: 2px dashed #ff007f;
            box-sizing: border-box;
        }

#items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            height: 89vh !important;
            padding-bottom: 240px !important; 
            box-sizing: border-box;
            -webkit-overflow-scrolling: touch;
        }

        #items-tab .item, #artists-tab .item {
            touch-action: pan-y !important;
        }

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
        // Запуск базового управления и акселерометра
        initMobileControls();
        initMobileAccelerometer();

        // 1. ДИНАМИЧЕСКАЯ ПОДМЕНА НАЗВАНИЙ И ОПИСАНИЙ ДЛЯ СМАРТФОНОВ
        if (typeof ALL_ACHIEVEMENTS !== 'undefined') {
            // Подмена для Конами-кода
            const konamiAch = ALL_ACHIEVEMENTS.find(a => a.id === "konami_code");
            if (konamiAch) {
                konamiAch.title = "Не KONAMIт";
                konamiAch.desc = "Ввести секретное кодовое слово в поисковой строке";
            }
            // Подмена для Гендальфа
            const gandalfAch = ALL_ACHIEVEMENTS.find(a => a.id === "gandalf_wheel");
            if (gandalfAch) {
                gandalfAch.desc = "Прокрутите список элементов от души";
            }
            // Подмена для Робота XJ-9
            const xj9Ach = ALL_ACHIEVEMENTS.find(a => a.id === "xj9_robot");
            if (xj9Ach) {
                xj9Ach.desc = "Вытащить на стол Кибернетику, Металл и Душу и просто активно двигать элементы по столу";
            }
            // РЕДАКТИРОВАНИЕ ОПИСАНИЯ: Скуби-Ду (Пункт 5)
            const scoobyAch = ALL_ACHIEVEMENTS.find(a => a.id === "scooby_doo");
            if (scoobyAch) {
                scoobyAch.desc = "Зажмите пальцем элемент Призрачность во вкладке меню на 4 секунды";
            }
            // РЕДАКТИРОВАНИЕ ОПИСАНИЯ: За Императора (Пункт 5)
            const emperorAch = ALL_ACHIEVEMENTS.find(a => a.id === "for_emperor");
            if (emperorAch) {
                emperorAch.desc = "Сделайте 10 долгих тапов (удержаний на 2 секунды) на элемент Император находящийся на столе";
            }
            // РЕДАКТИРОВАНИЕ ОПИСАНИЯ: Метроидвания
            const metroidAch = ALL_ACHIEVEMENTS.find(a => a.id === "metroidvania");
            if (metroidAch) {
                metroidAch.desc = "Положите Элемент на стол и нажмите по 1 разу во вкладке элементы на Кровь, Луну и Путь";
            }
            // РЕДАКТИРОВАНИЕ ОПИСАНИЯ: Где он? Где?!
            const whereIsHeAch = ALL_ACHIEVEMENTS.find(a => a.id === "where_is_he");
            if (whereIsHeAch) {
                whereIsHeAch.desc = "Быстро нажмите на элемент Ярость во вкладке элементов 20 раз подряд";
            }
        }

        // 2. БЕЗОПАСНЫЙ ФОНОВЫЙ ТРИГГЕР ДЛЯ АЧИВКИ «СКУБИ-ДУ»
        setInterval(() => {
            if (typeof isDraggingNow !== 'undefined' && isDraggingNow && activeDraggedElement) {
                if (activeDraggedElement.dataset.name === "Призрачность") {
                    stats.scoobyClicksCount = (stats.scoobyClicksCount || 0) + 1;
                    if (stats.scoobyClicksCount >= 25) {
                        checkQuests("scooby_doo_trigger");
                    }
                }
            }
        }, 150);

        // 3. БЕЗОПАСНЫЙ ФОНОВЫЙ ТРИГГЕР ДЛЯ АЧИВКИ «XJ-9»
        window.addEventListener('touchmove', () => {
            if (typeof isDraggingNow !== 'undefined' && isDraggingNow && activeDraggedElement) {
                const dNames = Array.from(document.querySelectorAll('.item.on-desk')).map(el => el.dataset.name);
                if (dNames.includes("Кибернетика") && dNames.includes("Металл") && dNames.includes("Душа")) {
                    stats.volumeMoveCount = (stats.volumeMoveCount || 0) + 0.5;
                    if (stats.volumeMoveCount >= 30) {
                        checkQuests("xj9_trigger");
                        if (navigator.vibrate) navigator.vibrate(60);
                    }
                }
            }
        }, { passive: true });

        // 4. ЖЕЛЕЗНЫЙ ГЛУШИТЕЛЬ СИСТЕМНОГО ЗУМА БРАУЗЕРА
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (e) {
            let now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
    });
    
    function initMobileControls() {
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        // Контроль тачей в боковом меню: скролл — вертикально, вытаскивание — строго вбок
        let artistLongPressTimeout = null;
        const menuTabs = document.querySelectorAll('#items-tab, #artists-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('touchstart', function(e) {
                const itemElement = e.target.closest('.item');
                if (!itemElement || itemElement.closest('.on-desk')) return;

                const startTouch = e.touches[0];
                const startX = startTouch.clientX;
                const startY = startTouch.clientY;
                let itemSpawned = false;
                let isLongPressTriggered = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                // Спам-счетчики ачивок
                if (typeof clickCounts !== 'undefined') {
                    clickCounts[originalData.name] = (clickCounts[originalData.name] || 0) + 1;
                    if (clickCounts[originalData.name] >= 10) checkQuests("spam_click");
                    setTimeout(() => { if (clickCounts[originalData.name]) clickCounts[originalData.name] = 0; }, 2000);
                }
                if (originalData.name === "Призрачность") {
                    stats.scoobyClicksCount = (stats.scoobyClicksCount || 0) + 1;
                    if (stats.scoobyClicksCount >= 25) checkQuests("scooby_doo_trigger");
                }
                if (originalData.name === "Ярость") {
                    stats.furyMaxVolumeClicks = (stats.furyMaxVolumeClicks || 0) + 1;
                    if (stats.furyMaxVolumeClicks >= 20) checkQuests("where_is_he_trigger");
                }
                const dItemsOnDesk = Array.from(workspace.querySelectorAll('.item.on-desk')).map(el => el.dataset.name);
                if (dItemsOnDesk.includes("Элемент")) {
                    if (originalData.name === "Кровь") stats.metroidBloodCount = 5;
                    if (originalData.name === "Луна") stats.metroidMoonCount = 5;
                    if (originalData.name === "Путь") stats.metroidPathCount = 5;
                    if (stats.metroidBloodCount >= 5 && stats.metroidMoonCount >= 5 && stats.metroidPathCount >= 5) checkQuests("metroid_trigger");
                }

                // ИСПРАВЛЕНИЕ ПУНКТА 1: Модалка художника только по долгому нажатию (0.7 сек)
                if (itemElement.classList.contains('artist-card')) {
                    clearTimeout(artistLongPressTimeout);
                    artistLongPressTimeout = setTimeout(() => {
                        isLongPressTriggered = true;
                        showArtistModal(originalData); // Открываем портфолио перед глазами
                        if (navigator.vibrate) navigator.vibrate(40); // Легкий виброотклик удержания
                    }, 700);
                }

                function onTouchMove(moveEvent) {
                    // Если палец двинулся во время удержания — отменяем лонгпресс, так как пошел скролл или вынос
                    clearTimeout(artistLongPressTimeout);
                    if (itemSpawned || isLongPressTriggered) return;

                    const moveTouch = moveEvent.touches[0];
                    const diffX = Math.abs(moveTouch.clientX - startX);
                    const diffY = Math.abs(moveTouch.clientY - startY);

                    if (diffX > 20 && diffX > diffY) {
                        itemSpawned = true;
                        moveEvent.preventDefault();

                        const menuWidth = tab.clientWidth || 120;
                        const safeX = moveTouch.clientX + menuWidth;

                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: safeX,
                            clientY: moveTouch.clientY
                        };

                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        // Мгновенно подхватываем созданный элемент на воркспейсе
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            cleanup();
                            // Просто передаем управление в базовую функцию
                            startMobileDrag(moveTouch, lastSpawned, 50, 55);
                        }

                            if (lastSpawned.dataset.name === "Гнев") window.isHoldingHulkNow = true;

                            touchStartData = {
                                lastX: moveTouch.clientX,
                                lastTime: Date.now(),
                                shakeScore: 0
                            };
                        }
                    }
                }

                function onTouchEnd() {
                    clearTimeout(artistLongPressTimeout); // Сбрасываем таймер при отпускании
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
            
            const touch = e.touches;
            const rect = targetItem.getBoundingClientRect();
            
            // Возвращаем нативный расчет смещения пальца из первого билда
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
        
        // Мобильный поиск через Prompt с секретным кодом KONAMI (Защита от зума)
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const userQuery = prompt("Поиск элементов и авторов:", searchBox.value);
                if (userQuery !== null) {
                    searchBox.value = userQuery;
                    
                    // Мобильное условие для получения достижения «Не KONAMIт»
                    if (userQuery.toLowerCase().trim() === 'konami') {
                        checkQuests("konami_trigger");
                        if (navigator.vibrate) navigator.vibrate(100); // Виброотклик успеха
                    }

                    if (typeof searchBox.oninput === 'function') {
                        searchBox.oninput();
                    }
                }
            }, { passive: false });
        }

        const itemsContainer = document.getElementById('items-tab');
        if (itemsContainer) {
            let lastScrollTop = itemsContainer.scrollTop;
            let mobileWheelTicks = 0;
            let scrollTimeout = null;

            itemsContainer.addEventListener('scroll', function() {
                const currentScrollTop = itemsContainer.scrollTop;
                const scrollSpeed = Math.abs(currentScrollTop - lastScrollTop);

                // Исправлено: снизили требуемую скорость скролла с 25 до 12
                if (scrollSpeed > 12) { 
                    mobileWheelTicks++;
                    
                    // Исправлено: снизили общее количество быстрых тиков с 35 до 15
                    if (mobileWheelTicks >= 15) {
                        checkQuests("gandalf_wheel_trigger"); // Триггерим ачивку Гендальфа
                        mobileWheelTicks = 0;
                        if (navigator.vibrate) navigator.vibrate(80);
                    }
                }

                lastScrollTop = currentScrollTop;

                // Сбрасываем тики при остановке скролла
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    mobileWheelTicks = 0;
                }, 800);
            }, { passive: true });
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

    function initMobileKonami() {
        // Переопределяем оригинальную десктопную последовательность на простую мобильную:
        // 4 раза нажать "Элементы", 4 раза нажать "Художники", 2 раза нажать "Достижения"
        const mobileButtonsSequence = [
            "items", "items", "items", "items", 
            "artists", "artists", "artists", "artists", 
            "achievements", "achievements"
        ];
        
        // Находим кнопки переключения вкладок в HTML игры
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(btn => {
            btn.addEventListener('touchstart', function() {
                // Извлекаем тип вкладки из оригинального атрибута onclick (например, switchTab('items'))
                const clickAttr = btn.getAttribute('onclick') || '';
                let tabType = "";
                
                if (clickAttr.includes('items')) tabType = "items";
                if (clickAttr.includes('artists')) tabType = "artists";
                if (clickAttr.includes('achievements')) tabType = "achievements";
                
                if (!tabType) return;

                // Проверяем шаги комбо-кода
                if (tabType === mobileButtonsSequence[mobileKonamiIndex]) {
                    mobileKonamiIndex++;
                    if (mobileKonamiIndex === mobileButtonsSequence.length) {
                        checkQuests("konami_trigger"); // Вызываем оригинальное достижение
                        mobileKonamiIndex = 0;
                        if (navigator.vibrate) navigator.vibrate([80, 50, 80]); // Тройной вибро-отклик триумфа
                    }
                } else {
                    mobileKonamiIndex = 0; // Сброс при ошибке
                }
            }, { passive: true });
        });
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
