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
        /* Стили для имитации кнопки на мобильном поиске */
        #search-box {
            cursor: pointer;
            caret-color: transparent !important; /* Прячем курсор */
        }
        
        #workspace { 
            touch-action: none; 
            position: relative; 
            overflow: hidden; 
            height: 50vh !important; /* Устанавливаем высоту воркспейса */
            border: 2px dashed #ff007f;
            box-sizing: border-box;
        }
        
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            height: 50vh !important; /* Строго равна высоте воркспейса */
            padding-bottom: 120px !important; /* Решает баг скрытого элемента: добавляет пустоту внизу списка */
            box-sizing: border-box;
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

        // Возврат к первому рабочему билду: мгновенный перехват тача в меню без блокировок
        document.addEventListener('touchstart', function(e) {
            const itemElement = e.target.closest('#items-tab .item, #artists-tab .item');
            
            // Если тач пришелся на меню и элемент еще не на столе
            if (itemElement && !e.target.closest('.on-desk')) {
                // Если это карточка художника и по ней просто быстро тапнули — открываем оригинальную модалку
                if (itemElement.classList.contains('artist-card') && e.touches.length === 1) {
                    // Страхуем обычный просмотр карточки автора перед глазами
                    const checkTapName = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                    const artistData = discoveredItems.find(i => i.name === checkTapName);
                    
                    // Запоминаем время тача, чтобы отличить короткий тап от долгого зажатия
                    let tapTimer = setTimeout(() => {
                        // Если палец задержался дольше 150мс — это уже вытаскивание на стол, модалку не открываем
                        itemElement.dataset.isDragging = "true";
                    }, 150);

                    itemElement.addEventListener('touchend', function onArtistTapEnd() {
                        clearTimeout(tapTimer);
                        if (itemElement.dataset.isDragging !== "true" && artistData) {
                            showArtistModal(artistData); // Открываем просмотр портфолио перед глазами
                        }
                        delete itemElement.dataset.isDragging;
                        itemElement.removeEventListener('touchend', onArtistTapEnd);
                    });
                }

                // Симулируем оригинальный десктопный ивент спавна элемента на стол
                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };
                
                const touchInfo = e.touches[0];
                const fakeEvent = {
                    preventDefault: () => {},
                    clientX: touchInfo.clientX,
                    clientY: touchInfo.clientY
                };

                // Вызываем оригинальный метод из script.js
                spawnItemOnDesk(fakeEvent, originalData);
                
                // Мгновенно находим созданный элемент на столе и привязываем его к пальцу
                const deskItems = workspace.querySelectorAll('.item.on-desk');
                const lastSpawned = deskItems[deskItems.length - 1];
                if (lastSpawned) {
                    // Передаем ивент и рассчитываем смещение строго по первому пальцу (индекс 0)
                    startMobileDrag(e.touches[0], lastSpawned, 50, 55);
                }
            }
        }, { passive: true });

        // Перехват тачей на самом воркспейсе для перемещения уже созданных элементов
        workspace.addEventListener('touchstart', function(e) {
            const searchBox = document.getElementById('search-box');
            if (searchBox && document.activeElement === searchBox) {
                searchBox.blur();
            }

            if (isDraggingNow) return;
            const targetItem = e.target.closest('.item.on-desk');
            if (!targetItem) return;

            e.preventDefault();
            
            const touchInfo = e.touches[0];
            const rect = targetItem.getBoundingClientRect();
            const shiftX = touchInfo.clientX - rect.left;
            const shiftY = touchInfo.clientY - rect.top;

            // LongPress для ачивки «ЗА ИМПЕРАТОРА!!!»
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

            startMobileDrag(touchInfo, targetItem, shiftX, shiftY);
        }, { passive: false });

        // Движение пальца по экрану во время перетаскивания
        window.addEventListener('touchmove', function(e) {
            if (!activeDraggedElement) return;

            e.preventDefault(); // Полностью блокируем скролл всей страницы, пока тащим элемент по столу
            
            const touchInfo = e.touches[0];
            const rect = workspace.getBoundingClientRect();
            
            let x = touchInfo.clientX - rect.left - touchShiftX;
            let y = touchInfo.clientY - rect.top - touchShiftY;

            x = Math.max(0, Math.min(x, workspace.clientWidth - activeDraggedElement.clientWidth));
            y = Math.max(0, Math.min(y, workspace.clientHeight - activeDraggedElement.clientHeight));

            activeDraggedElement.style.left = `${x}px`;
            activeDraggedElement.style.top = `${y}px`;

            handleFingerShake(touchInfo, activeDraggedElement);
        }, { passive: false });

        // Отпускание пальца с фиксацией коллизий крафтов
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

        // Мобильный поиск через Prompt (Полная защита от зума)
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('touchstart', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const userQuery = prompt("Поиск элементов и авторов:", searchBox.value);
                if (userQuery !== null) {
                    searchBox.value = userQuery;
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
            // Исправлено: считываем clientX из первого активного тача массива touches
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
                // Исправлено: безопасное чтение координаты для симуляции встряски пальцем
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
            navigator.vibrate([100, 50, 100]);
        }
    }
})();
