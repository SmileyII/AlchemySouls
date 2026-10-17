/**
 * Alchemy Souls — Mobile Adapter Monolith (2026)
 * Изолированная мобильная логика: тачи, свайп-Конами, LongPress и акселерометр.
 */
(function() {
    // Проверка: мобильное устройство по разрешению ИЛИ по userAgent
    const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobileDevice) return; // Если десктоп — адаптер засыпает и ничего не трогает

    console.log("Alchemy Souls: Mobile Mode Activated 📱");

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
        }
        
        #items-tab, #artists-tab {
            touch-action: pan-y !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch;
        }

        /* Выталкиваем последний скрытый элемент */
        #items-tab, #artists-tab {
            padding-bottom: 120px !important;
        }

        .item { user-select: none; -webkit-user-select: none; }
    `;
    document.head.appendChild(style);

    // Ждем полной загрузки DOM и оригинального скрипта
    window.addEventListener('DOMContentLoaded', () => {
        ;
        initMobileKonami();
        initMobileAccelerometer();
    });

    function initMobileControls() {
        const workspace = document.getElementById('workspace');
        if (!workspace) return;

        // Фикс Бага №5 и №2: Нажатие пальцем в боковом меню элементов/художников
        const menuTabs = document.querySelectorAll('#items-tab, #artists-tab');
        menuTabs.forEach(tab => {
            tab.addEventListener('touchstart', function(e) {
                const itemElement = e.target.closest('.item');
                if (!itemElement || itemElement.closest('.on-desk')) return;

                const startX = e.touches[0].clientX;
                const startY = e.touches[0].clientY;
                let hasMovedSignificantly = false;

                const name = itemElement.querySelector('span') ? itemElement.querySelector('span').innerText.replace(" •", "") : "";
                const originalData = discoveredItems.find(i => i.name === name) || { name: name, img: "placeholder.png" };

                function onTouchMove(moveEvent) {
                    const diffX = Math.abs(moveEvent.touches[0].clientX - startX);
                    const diffY = Math.abs(moveEvent.touches[0].clientY - startY);

                    // Если палец потянули вбок (на стол) — вытаскиваем элемент
                    if (diffX > 20 && diffX > diffY && !hasMovedSignificantly) {
                        hasMovedSignificantly = true;
                        moveEvent.preventDefault();
                        
                        const fakeEvent = {
                            preventDefault: () => {},
                            clientX: moveEvent.touches[0].clientX,
                            clientY: moveEvent.touches[0].clientY
                        };

                        // Спавним на стол через оригинальный скрипт
                        spawnItemOnDesk(fakeEvent, originalData);
                        
                        // Сразу подхватываем его для движения пальцем
                        const deskItems = workspace.querySelectorAll('.item.on-desk');
                        const lastSpawned = deskItems[deskItems.length - 1];
                        if (lastSpawned) {
                            removeListeners();
                            startMobileDrag(moveEvent.touches[0], lastSpawned, 50, 55);
                        }
                    }
                }

                function onTouchEnd() {
                    // Баг №2: Если это просто короткий тап без движения и это карта художника — открываем модалку перед глазами
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
            // Баг №3: Прячем клавиатуру при тапе по столу
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

            // Баг с Императором (LongPress)
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

        // Непрерывное движение зажатого элемента по столу
        window.addEventListener('touchmove', function(e) {
            if (!activeDraggedElement) {
                // Логика ачивки Slime Touch
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

            e.preventDefault();
            
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

        // Отпускание пальца
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

        // Мобильный поиск через Prompt (Защита от зума)
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
