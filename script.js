const BASE_ITEMS = [
    { name: "Свет", img: "свет.png" },
    { name: "Мрак", img: "мрак.png" },
    { name: "Холод", img: "холод.png" },
    { name: "Тепло", img: "тепло.png" },
    { name: "Хаос", img: "хаос.png" },
    { name: "Порядок", img: "порядок.png" },
    { name: "Вдохновение", img: "вдохновение.png" },
    { name: "Меланхолия", img: "меланхолия.png" }
];

let discoveredItems = [];
let recipes = [];
let isDraggingNow = false;
let currentMoveHandler = null;
let currentActiveTab = "items"; 

let stats = {
    totalCrafts: 0,
    clearDeskClicks: 0,
    failedCrafts: 0,
    searchUsed: false,
    sameMaterialCrafts: 0,
    shadowAttempts: 0,
    deletedArtistsCount: 0, 
    tabSwitchCount: 0,       
    cabbageRemoveCount: 0,   
    notInPublicCount: 0,     
    cancelResetCount: 0,      
    scoobyClicksCount: 0,     
    room302ClicksCount: 0,    
    lazyTownClearCount: 0,    
    scissorsClearCount: 0,    
    volumeMoveCount: 0,       
    metroidBloodCount: 0,     
    metroidMoonCount: 0,
    metroidPathCount: 0,
    frierenAdvCount: 0,       
    frierenFrCount: 0,
    frierenTimeCount: 0,
    frierenFateCount: 0,
    unlockedQuests: []
};

let clickCounts = {};
let lastInputTime = Date.now();

initGame();

function initGame() {
    const savedProgress = localStorage.getItem('alchemy_souls_progress');
    if (savedProgress) {
        discoveredItems = JSON.parse(savedProgress);
    } else {
        discoveredItems = [...BASE_ITEMS];
    }

    const savedStats = localStorage.getItem('alchemy_souls_stats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }

    fetch('recipes.json')
        .then(response => response.json())
        .then(data => {
            recipes = data;
            renderAllTabs();
        });

    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.oninput = () => {
            resetActivityTimer();
            const currentSearch = searchBox.value.trim().toLowerCase();
            if (currentSearch === "you got damn right") checkQuests("walter_text");
            if (currentSearch === "love") checkQuests("someday_love_trigger");
            if (currentSearch === "red or blue") checkQuests("matrix_text");
            
            if (currentSearch === "zandatsu") {
                const dNames = Array.from(document.querySelectorAll('.item.on-desk')).map(el => el.dataset.name);
                if (dNames.includes("Кибернетика") && dNames.includes("Мурамаса") && dNames.includes("Металл")) {
                    checkQuests("zandatsu_trigger");
                }
            }

            if (!stats.searchUsed && searchBox.value.length > 0) {
                stats.searchUsed = true;
                checkQuests();
            }
            renderCurrentTab();
        };
    }

    const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let konamiIndex = 0;
    window.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                checkQuests("konami_trigger");
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    let wheelTotalTicks = 0;
    window.addEventListener('wheel', () => {
        wheelTotalTicks++;
        if (wheelTotalTicks >= 35) {
            checkQuests("gandalf_wheel_trigger");
            wheelTotalTicks = 0; 
        }
        clearTimeout(window.wheelResetTimeout);
        window.wheelResetTimeout = setTimeout(() => { wheelTotalTicks = 0; }, 1000);
    });

    const volumeControl = document.getElementById('volume-control');
    const bgMusic = document.getElementById('bg-music');
    if (volumeControl && bgMusic) {
        bgMusic.volume = volumeControl.value;
        volumeControl.oninput = (e) => {
            resetActivityTimer();
            let currentVolume = parseFloat(e.target.value);
            bgMusic.volume = currentVolume;
            if (bgMusic.paused) {
                bgMusic.play().catch(() => {});
            }
            if (currentVolume >= 0.99) {
                checkQuests("vocaloid_volume_max");
            }
            
            const dNames = Array.from(document.querySelectorAll('.item.on-desk')).map(el => el.dataset.name);
            if (dNames.includes("Кибернетика") && dNames.includes("Металл") && dNames.includes("Душа")) {
                stats.volumeMoveCount++;
                if (stats.volumeMoveCount >= 30) checkQuests("xj9_trigger");
            }
        };
    }

    setInterval(() => {
        const deskItems = Array.from(document.querySelectorAll('.item.on-desk'));
        const deskNames = deskItems.map(el => el.dataset.name);
        let idleTime = Date.now() - lastInputTime;

        if (window.isHoldingHulkNow === true) {
            window.hulkHoldTimer = (window.hulkHoldTimer || 0) + 2;
            if (window.hulkHoldTimer >= 120) { 
                checkQuests("hulk_hold_success");
            }
        } else {
            window.hulkHoldTimer = 0;
        }

        if (idleTime >= 30000) { 
            if (deskNames.includes("Вдохновение") && deskNames.includes("Чистота")) checkQuests("wait_see_trigger");
            if (deskNames.includes("Кисть") && deskNames.includes("Краски")) checkQuests("live_learn_trigger");
        }

        if (idleTime >= 60000) { 
            let hasFeelings = deskNames.includes("Чувства");
            let hasEmotions = deskNames.includes("Эмоции");
            let hasHeat = deskNames.includes("Тепло");
            let totalVoid = deskNames.filter(name => name === "Пустота").length;
            if (hasFeelings && hasEmotions && hasHeat && totalVoid >= 10) {
                checkQuests("ghoul_trigger");
            }
        }

        if (idleTime >= 180000) { 
            checkQuests("idle_timeout");
        }
    }, 2000);

    window.onmousemove = resetActivityTimer;
    window.onmousedown = resetActivityTimer;
}

function resetActivityTimer() {
    lastInputTime = Date.now();
}

function switchTab(tabName) {
    stats.totalTabClicksCount = (stats.totalTabClicksCount || 0) + 1;

    if (currentActiveTab !== tabName) {
        if ((currentActiveTab === "items" && tabName === "artists") || (currentActiveTab === "artists" && tabName === "items")) {
            stats.tabSwitchCount++;
            
            const deskItems = Array.from(document.querySelectorAll('.item.on-desk'));
            const deskNames = deskItems.map(el => el.dataset.name);
            if (deskNames.includes("Незыблимость") && deskNames.includes("Скорость") && deskNames.includes("Металл") && deskNames.includes("Монстроподобие")) {
                window.scpTabCount = (window.scpTabCount || 0) + 1;
                if (window.scpTabCount >= 5) checkQuests("scp_173_trigger");
            } else {
                window.scpTabCount = 0;
            }

            if (deskNames.includes("Призрачность")) {
                window.ghostStrafeCount = (window.ghostStrafeCount || 0) + 1;
                if (window.ghostStrafeCount >= 5) checkQuests("ghost_strafe_trigger");
            } else {
                window.ghostStrafeCount = 0;
            }

            if (stats.tabSwitchCount >= 28) checkQuests("season_trigger");
        }
    }

    currentActiveTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName)) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`${tabName}-tab`);
    if (targetContent) targetContent.classList.add('active');
    renderCurrentTab();
}

function renderAllTabs() {
    renderItemsTab();
    renderArtistsTab();
    renderAchievementsTab();
}

function renderCurrentTab() {
    if (currentActiveTab === "items") renderItemsTab();
    if (currentActiveTab === "artists") renderArtistsTab();
    if (currentActiveTab === "achievements") renderAchievementsTab();
}

function isElementDeadEnd(item) {
    if (BASE_ITEMS.some(b => b.name === item.name) || item.url) return false;
    const usedInRecipes = recipes.some(r => r.item1 === item.name || r.item2 === item.name);
    return !usedInRecipes;
}

function renderItemsTab() {
    const container = document.getElementById('items-tab');
    if (!container) return;
    const searchBox = document.getElementById('search-box');
    const searchQuery = searchBox ? searchBox.value.toLowerCase() : '';
    container.innerHTML = '';
    
    discoveredItems.forEach(item => {
        if (item.url) return; 
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return;

        const div = document.createElement('div');
        const isDead = isElementDeadEnd(item);
        div.className = `item ${isDead ? 'dead-end' : ''}`;
        
        const img = document.createElement('img');
        img.src = `images/${item.img}`; 
        img.onerror = () => { img.src = 'images/placeholder.png'; }; 
        
        const text = document.createElement('span');
        text.innerText = item.name + (isDead ? " •" : "");
        
        div.appendChild(img); div.appendChild(text);
        
        div.onmouseenter = () => {
            if (!stats.unlockedQuests.includes("slime_touch")) {
                window.slimeHovers = (window.slimeHovers || 0) + 1;
                if (window.slimeHovers >= 50) {
                    checkQuests("slime_hover_trigger");
                    window.slimeHovers = 0;
                }
                clearTimeout(window.slimeHoverTimeout);
                window.slimeHoverTimeout = setTimeout(() => { window.slimeHovers = 0; }, 4000);
            }
            
                    if (item.name === "Затмение") {
            window.noobSaibotTimeout = setTimeout(() => {
                checkQuests("noob_saibot_trigger");
            }, 60000);
        }
    };
    
    div.onmouseleave = () => {
        if (item.name === "Затмение" && window.noobSaibotTimeout) {
            clearTimeout(window.noobSaibotTimeout);
        }
    };
    
    div.onauxclick = (e) => {
        if (e.button === 1 && item.name === "Император") {
            e.preventDefault();
            window.emperorMiddleClicks = (window.emperorMiddleClicks || 0) + 1;
            if (window.emperorMiddleClicks >= 10) checkQuests("emperor_click_trigger");
        }
    };
    
    div.onmousedown = (e) => {
        if (e.button === 1) return;
        const dItemsOnDesk = Array.from(document.querySelectorAll('.item.on-desk')).map(el => el.dataset.name);
        if (dItemsOnDesk.includes("Элемент")) {
            if (item.name === "Кровь") { stats.metroidBloodCount++; if(stats.metroidBloodCount >= 5 && stats.metroidMoonCount >= 5 && stats.metroidPathCount >= 5) checkQuests("metroid_trigger"); }
            if (item.name === "Луна") { stats.metroidMoonCount++; if(stats.metroidBloodCount >= 5 && stats.metroidMoonCount >= 5 && stats.metroidPathCount >= 5) checkQuests("metroid_trigger"); }
            if (item.name === "Путь") { stats.metroidPathCount++; if(stats.metroidBloodCount >= 5 && stats.metroidMoonCount >= 5 && stats.metroidPathCount >= 5) checkQuests("metroid_trigger"); }
        }
        let artCountDesk = Array.from(document.querySelectorAll('.item.on-desk.artist-card')).length;
        if (artCountDesk >= 3) {
            if (item.name === "Приключение") stats.frierenAdvCount++;
            if (item.name === "Дружба") stats.frierenFrCount++;
            if (item.name === "Время") stats.frierenTimeCount++;
            if (item.name === "Судьба") stats.frierenFateCount++;
            if (stats.frierenAdvCount >= 1 && stats.frierenFrCount >= 1 && stats.frierenTimeCount >= 1 && stats.frierenFateCount >= 1) checkQuests("frieren_trigger");
        }
        if (item.name === "Призрачность") {
            stats.scoobyClicksCount = (stats.scoobyClicksCount || 0) + 1;
            if (stats.scoobyClicksCount >= 25) {
                checkQuests("scooby_doo_trigger");
            }
        }
        clickCounts[item.name] = (clickCounts[item.name] || 0) + 1;
        if (clickCounts[item.name] >= 10) {
            checkQuests("spam_click");
        }
        setTimeout(() => { clickCounts[item.name] = 0; }, 2000);
        if (!isDraggingNow) spawnItemOnDesk(e, item);
    };
    container.appendChild(div);
});
}

function renderArtistsTab() {
    const container = document.getElementById('artists-tab');
    if (!container) return;
    const searchBox = document.getElementById('search-box');
    const searchQuery = searchBox ? searchBox.value.toLowerCase() : '';
    container.innerHTML = '';
    discoveredItems.forEach(item => {
        if (!item.url) return;
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return;
        const div = document.createElement('div');
        div.className = 'item artist-card';
        const img = document.createElement('img');
        // Восстановлены обратные кавычки
        img.src = `images/${item.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        const text = document.createElement('span');
        text.innerText = item.name;
        div.appendChild(img); div.appendChild(text);
        div.onmousedown = (e) => { if (!isDraggingNow) spawnItemOnDesk(e, item); };
        div.onclick = () => showArtistModal(item);
        container.appendChild(div);
    });
    const totalArtists = discoveredItems.filter(i => i.url).length;
    const counterEl = document.getElementById('artists-count');
    if (counterEl) counterEl.innerText = totalArtists;
}

function renderAchievementsTab() {
    const container = document.getElementById('achievements-tab');
    if (!container) return;
    const searchBox = document.getElementById('search-box');
    const searchQuery = searchBox ? searchBox.value.toLowerCase() : '';
    container.innerHTML = '';
    ALL_ACHIEVEMENTS.forEach(ach => {
        if (searchQuery && !ach.title.toLowerCase().includes(searchQuery) && !ach.desc.toLowerCase().includes(searchQuery)) return;
        const isUnlocked = stats.unlockedQuests.includes(ach.id);
        const card = document.createElement('div');
        // Восстановлены обратные кавычки
        card.className = `ach-card ${isUnlocked ? 'unlocked' : ''}`;
        const icon = document.createElement('div');
        icon.className = 'ach-icon';
        icon.innerText = isUnlocked ? '🏆' : '🔒';
        const info = document.createElement('div');
        info.className = 'ach-info';
        const title = document.createElement('div');
        title.className = 'ach-title';
        title.innerText = ach.title;
        const desc = document.createElement('div');
        desc.className = 'ach-desc';
        desc.innerText = ach.desc;
        const reward = document.createElement('span');
        reward.className = 'ach-reward-tag';
        // Восстановлены обратные кавычки
        reward.innerText = ach.reward === "Ничего" ? "Награда: Скрытый трофей" : `Награда: + [${ach.reward}]`;
        info.appendChild(title); info.appendChild(desc); info.appendChild(reward);
        card.appendChild(icon); card.appendChild(info);
        container.appendChild(card);
    });
}

function spawnItemOnDesk(e, itemData) {
    e.preventDefault();
    isDraggingNow = true;
    const workspace = document.getElementById('workspace');
    const clone = document.createElement('div');
    const isDead = isElementDeadEnd(itemData);
    clone.className = 'item on-desk' + (itemData.url ? ' artist-card' : '') + (isDead ? ' dead-end' : '');
    clone.dataset.name = itemData.name;
    clone.dataset.img = itemData.img;
    if(itemData.url) clone.dataset.url = itemData.url;
    if(itemData.desc) clone.dataset.desc = itemData.desc;
    const img = document.createElement('img');
    // Восстановлены обратные кавычки
    img.src = `images/${itemData.img}`;
    img.onerror = () => { img.src = 'images/placeholder.png'; };
    const text = document.createElement('span');
    text.innerText = itemData.name + (isDead ? " •" : "");
    clone.appendChild(img); clone.appendChild(text);
    workspace.appendChild(clone);
    const rect = workspace.getBoundingClientRect();
    let x = e.clientX - rect.left - 50;
    let y = e.clientY - rect.top - 55;
    // Восстановлены обратные кавычки
    clone.style.left = `${x}px`; clone.style.top = `${y}px`;
    startDragProcess(e, clone, 50, 55);
}

function startDragProcess(e, element, shiftX, shiftY) {
    const workspace = document.getElementById('workspace');
    const rect = workspace.getBoundingClientRect();
    if (currentMoveHandler) document.removeEventListener('mousemove', currentMoveHandler);
    if (element.dataset.name === "Гнев") {
        window.isHoldingHulkNow = true;
    }
    let lastX = null;
    let lastTime = Date.now();
    let shakeScore = 0;
    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        x = Math.max(0, Math.min(x, workspace.clientWidth - element.clientWidth));
        y = Math.max(0, Math.min(y, workspace.clientHeight - element.clientHeight));
        // Восстановлены обратные кавычки
        element.style.left = `${x}px`; element.style.top = `${y}px`;
        const nameAttr = element.dataset.name;
        if (nameAttr === "Мрак" || nameAttr === "Mрак" || nameAttr === "Вишенка" || nameAttr === "Сладость") {
            let currentTime = Date.now();
            if (lastX !== null && currentTime - lastTime > 40) {
                let speed = Math.abs(clientX - lastX) / (currentTime - lastTime);
                if (speed > 1.3) {
                    shakeScore++;
                    if (shakeScore >= 12) {
                        if (nameAttr === "Мрак" || nameAttr === "Mрак") checkQuests("shake_mrak");
                        if (nameAttr === "Вишенка") checkQuests("shake_cherry");
                        if (nameAttr === "Сладость") checkQuests("shake_sweet");
                    }
                }
                lastTime = currentTime;
            }
            lastX = clientX;
        }
    }
    currentMoveHandler = function(event) { moveAt(event.clientX, event.clientY); };
    document.addEventListener('mousemove', currentMoveHandler);
    window.onmouseup = function() {
        if (currentMoveHandler) { document.removeEventListener('mousemove', currentMoveHandler); currentMoveHandler = null; }
        window.onmouseup = null; element.onmouseup = null; isDraggingNow = false;
        if (element.dataset.name === "Гнев") {
            window.isHoldingHulkNow = false;
        }
        checkCollisions(element);
        checkQuests();
    };
    element.onmouseup = window.onmouseup;
}

document.getElementById('workspace').onmousedown = function(e) {
    if (isDraggingNow) return;
    const targetItem = e.target.closest('.item.on-desk');
    if (!targetItem) return;
    e.preventDefault();
    isDraggingNow = true;
    let shiftX = e.clientX - targetItem.getBoundingClientRect().left;
    let shiftY = e.clientY - targetItem.getBoundingClientRect().top;
    startDragProcess(e, targetItem, shiftX, shiftY);
};

function checkCollisions(draggedElement) {
    if (!draggedElement.parentNode) return;
    const deskItems = document.querySelectorAll('.item.on-desk');
    const r1 = draggedElement.getBoundingClientRect();
    const padding = 15;
    for (let other of deskItems) {
    if (other === draggedElement) continue;
    const r2 = other.getBoundingClientRect();
    const isOverlapping = !((r1.right + padding) < r2.left || (r1.left - padding) > r2.right || (r1.bottom + padding) < r2.top || (r1.top - padding) > r2.bottom);
        
        if (isOverlapping) { combineElements(draggedElement, other); return; }
    }
}

function combineElements(el1, el2) {
    const name1 = el1.dataset.name;
    const name2 = el2.dataset.name;
    if (((name1 === "Мрак" || name1 === "Холод") && (name2 === "Тепло" || name2 === "Свет")) ||
        ((name2 === "Мрак" || name2 === "Холод") && (name1 === "Тепло" || name1 === "Свет"))) {
        checkQuests("eclipse_trigger");
    }
    const match = recipes.find(r => (r.item1 === name1 && r.item2 === name2) || (r.item1 === name2 && r.item2 === name1));
    if (match) {
        if (currentMoveHandler) { document.removeEventListener('mousemove', currentMoveHandler); currentMoveHandler = null; }
        window.onmouseup = null; isDraggingNow = false;
        stats.totalCrafts++;
        if (name1 === name2) {
            stats.sameMaterialCrafts++;
        }
        const x = (parseFloat(el1.style.left) + parseFloat(el2.style.left)) / 2;
        const y = (parseFloat(el1.style.top) + parseFloat(el2.style.top)) / 2;
        el1.remove(); el2.remove();
        const newItemData = {
            name: match.result,
            img: match.result_img,
            url: match.artist_url || "",
            desc: match.artist_desc || ""
        };
        const workspace = document.getElementById('workspace');
        const resultEl = document.createElement('div');
        const isDead = isElementDeadEnd(newItemData);
        resultEl.className = 'item on-desk' + (newItemData.url ? ' artist-card' : '') + (isDead ? ' dead-end' : '');
        resultEl.dataset.name = newItemData.name;
        resultEl.dataset.img = newItemData.img;
        if(newItemData.url) resultEl.dataset.url = newItemData.url;
        if(newItemData.desc) resultEl.dataset.desc = newItemData.desc;
        const img = document.createElement('img');
        // Исправлено: Восстановлены обратные кавычки
        img.src = `images/${newItemData.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        const text = document.createElement('span');
        text.innerText = newItemData.name + (isDead ? " •" : "");
        resultEl.appendChild(img); resultEl.appendChild(text);
        // Исправлено: Восстановлены обратные кавычки
        resultEl.style.left = `${x}px`; resultEl.style.top = `${y}px`;
        workspace.appendChild(resultEl);
        const alreadyOpened = discoveredItems.some(i => i.name === match.result);
        if (!alreadyOpened) {
            discoveredItems.push(newItemData);
            saveGame();
            renderAllTabs();
            if (newItemData.url) {
                showArtistModal(newItemData);
            }
        }
    } else {
        if (!el1.classList.contains('craft-error') && isDraggingNow === false) {
            stats.failedCrafts++;
            el1.classList.add('craft-error');
            el2.classList.add('craft-error');
            setTimeout(() => {
                el1.classList.remove('craft-error');
                el2.classList.remove('craft-error');
            }, 4000);
        }

            if ((name1 === "Хаос" && name2 === "Порядок") || (name2 === "Хаос" && name1 === "Порядок")) {
            const artistCount = document.querySelectorAll('.item.on-desk.artist-card').length;
            if (artistCount >= 6) checkQuests("circus_trigger");
        }
        if ((name1 === "Вспышка" && name2 === "Конструкт") || (name2 === "Вспышка" && name1 === "Конструкт")) {
            const currentConstructs = document.querySelectorAll('.item.on-desk[data-name="Конструкт"]').length;
            if (currentConstructs >= 10) {
                checkQuests("bttf_fail");
            }
        }
        if ((name1 === "Огонь" && name2 === "Кристаллизация") || (name2 === "Огонь" && name1 === "Кристаллизация")) checkQuests("gold_fail_trigger");
        if ((name1 === "Гнев" && name2 === "Безумие") || (name2 === "Гнев" && name1 === "Безумие")) checkQuests("hulk_fail_trigger");
        if ((name1 === "Судьба" && name2 === "Огонь") || (name2 === "Судьба" && name1 === "Огонь")) checkQuests("lotr_fail_trigger");
        if ((name1 === "Слёзы" && name2 === "Музыка") || (name2 === "Слёзы" && name1 === "Музыка")) checkQuests("april_fail_trigger");
        if ((name1 === "Мрак" && name2 === "Тень") || (name2 === "Мрак" && name1 === "Тень")) stats.shadowAttempts++;
        if ((name1 === "Хаос" && name2 === "Судьба") || (name2 === "Хаос" && name1 === "Судьба")) checkQuests("slime_fail");
    }
    checkQuests();
}

function checkQuests(triggerType) {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    const deskItems = document.querySelectorAll('.item.on-desk');
    const deskNames = Array.from(deskItems).map(el => el.dataset.name);
    
    let hasGeometrySmash = false;
    let orderItemsOnDesk = Array.from(deskItems).filter(el => el.dataset.name === "Порядок");
    if (orderItemsOnDesk.length >= 5) {
        orderItemsOnDesk.forEach(item => {
            let ix = item.offsetLeft; let iy = item.offsetTop;
            let closeOrders = orderItemsOnDesk.filter(el => Math.abs(el.offsetLeft - ix) <= 35 && Math.abs(el.offsetTop - iy) <= 35).length;
            if (closeOrders >= 5) hasGeometrySmash = true;
        });
    }
    
    let cornersFilled = false;
    if (deskItems.length >= 4) {
        let topLeft = false, topRight = false, bottomLeft = false, bottomRight = false;
        deskItems.forEach(el => {
            let x = el.offsetLeft;
            let y = el.offsetTop;
            let maxW = ws.clientWidth - el.clientWidth;
            let maxH = ws.clientHeight - el.clientHeight;
            if (x <= 50 && y <= 50) topLeft = true;
            if (x >= maxW - 50 && y <= 50) topRight = true;
            if (x <= 50 && y >= maxH - 50) bottomLeft = true;
            if (x >= maxW - 50 && y >= maxH - 50) bottomRight = true;
        });
        if (topLeft && topRight && bottomLeft && bottomRight) cornersFilled = true;
    }
    
    let towerBuilt = false;
    if (deskItems.length >= 3) {
        let arrY = Array.from(deskItems).map(el => ({
            x: el.offsetLeft,
            y: el.offsetTop
        })).sort((a, b) => a.y - b.y);
        for (let i = 0; i < arrY.length - 2; i++) {
            let i1 = arrY[i], i2 = arrY[i+1], i3 = arrY[i+2];
            let sameColumn = Math.abs(i1.x - i2.x) <= 20;
            let separatedByY = (i2.y - i1.y >= 60) && (i3.y - i2.y >= 60);
            if (sameColumn && separatedByY) { towerBuilt = true; break; }
        }
    }
    
    let zvezdecRow = deskNames.includes("Тепло") && deskNames.includes("Холод") && deskNames.includes("Затмение");
    let cosmostarsRow = deskNames.includes("Тепло") && deskNames.includes("Холод") && deskNames.includes("Затмение") && deskNames.includes("Закат") && deskNames.includes("Рассвет");
    let hasBigThree = deskNames.includes("Богоподобие") && deskNames.includes("Монстроподобие") && deskNames.includes("Животноподобие");
    let hasNotFriends = deskNames.includes("Ярость") && deskNames.includes("Огонь") && deskNames.includes("Вода") && deskNames.includes("Тишина");
    let hasThtOne = deskNames.includes("Величие") && deskNames.includes("Свет") && deskNames.includes("А́гг҃лъ");
    let hasNowFlag = deskNames.includes("Огонь") && deskNames.includes("Закат") && deskNames.includes("Солнце") && deskNames.includes("Природа") && deskNames.includes("Небо") && deskNames.includes("Вода") && deskNames.includes("Магия");
    
    let hasPrismPower = false;
    let hasNicoleDead = false;
    let hasOrgyStyle = false;
    let hasLustyMaid = false;
    let hasBlueEyed = false;
    let hasLeviPain = false;
    let hasDeliciousGuro = false;
    let hasCozyLife = false;
    let hasTrueLoveExists = false;
    let hasGetOverHere = false;
    
    let tableArtists = Array.from(deskItems).filter(el => el.classList.contains('artist-card'));
    if (tableArtists.length >= 20) {
        let first = tableArtists[0];
        let closeCount = 0;
        tableArtists.forEach(a => {
            if (Math.abs(a.offsetLeft - first.offsetLeft) <= 40 && Math.abs(a.offsetTop - first.offsetTop) <= 40) closeCount++;
        });
        if (closeCount >= 20) hasPrismPower = true;
    }
    
    let hasMixStyle = false;
    if (tableArtists.length >= 5) {
        let tL = false, tR = false, bL = false, bR = false, cN = false;
        tableArtists.forEach(el => {
            let x = el.offsetLeft; let y = el.offsetTop;
            let maxW = ws.clientWidth - el.clientWidth; let maxH = ws.clientHeight - el.clientHeight;
            if (x <= 70 && y <= 70) tL = true;
            if (x >= maxW - 70 && y <= 70) tR = true;
            if (x <= 70 && y >= maxH - 70) bL = true;
            if (x >= maxW - 70 && y >= maxH - 70) bR = true;
            if (Math.abs(x - maxW/2) <= 80 && Math.abs(y - maxH/2) <= 80) cN = true;
        });
        if (tL && tR && bL && bR && cN) hasMixStyle = true;
    }
    
    let doubleArtistsWithElementsCount = 0;
    tableArtists.forEach(art => {
        let ax = art.offsetLeft; let ay = art.offsetTop;
        let stackedItems = Array.from(deskItems).filter(el => Math.abs(el.offsetLeft - ax) <= 35 && Math.abs(el.offsetTop - ay) <= 35);
        
        let universes = stackedItems.filter(el => el.dataset.name === "Вселенная").length;
        let monsters = stackedItems.filter(el => el.dataset.name === "Монстроподобие").length;
        if (universes >= 5 && monsters >= 5) hasNicoleDead = true;
        
        let stackedNames = stackedItems.map(el => el.dataset.name);
        if (stackedNames.includes("Животноподобие") && stackedNames.includes("Сок") && stackedNames.includes("Вкус") && stackedNames.includes("Вишенка") && stackedNames.includes("Тот самый батон")) hasLustyMaid = true;
        if (stackedNames.includes("Мясо") && stackedNames.includes("Кровь") && stackedNames.includes("Садизм") && stackedNames.includes("Хрупкость") && stackedNames.includes("Эротика") && stackedNames.includes("Мурамаса") && stackedNames.includes("Свобода")) hasDeliciousGuro = true;
        if (stackedNames.includes("Тепло") && stackedNames.includes("Нежность") && stackedNames.includes("Мягкость") && stackedNames.includes("Гармонию")) hasCozyLife = true;
        if (stackedNames.includes("Нежность") && stackedNames.includes("Осязание") && stackedNames.includes("Чистота") && stackedNames.includes("Улыбка") && stackedNames.includes("Мгновение")) hasTrueLoveExists = true;
        if (stackedNames.includes("Огонь") && stackedNames.includes("Вода")) doubleArtistsWithElementsCount++;
        
        let otherArtists = stackedItems.filter(el => el.classList.contains('artist-card') && el !== art);
        if (otherArtists.length >= 1 && stackedNames.includes("Душа")) {
            let namesInStack = stackedItems.map(el => el.dataset.name);
            if (namesInStack.includes("Sovka") && namesInStack.includes("illusolis_art")) hasLeviPain = true;
        }
    });
    
    if (tableArtists.length >= 2 && doubleArtistsWithElementsCount >= 2) hasGetOverHere = true;
    if (hasMixStyle) {
        let fireItems = Array.from(deskItems).filter(el => el.dataset.name === "Огонь");
        if (fireItems.length >= 2) hasBlueEyed = true;
    }
    let o1 = deskNames.includes("Эротика"), o2 = deskNames.includes("Ночь"), o3 = deskNames.includes("Вспышка");
    if (o1 && o2 && o3 && cornersFilled) hasOrgyStyle = true;
    
    const artistsNames = discoveredItems.filter(i => i.url).map(i => i.name);
    const totalArtistsCount = artistsNames.length;

        const checkList = [
        { id: "first_craft", condition: stats.totalCrafts >= 1 },
        { id: "cleaner", condition: stats.clearDeskClicks >= 3 },
        { id: "searcher", condition: stats.searchUsed === true },
        { id: "four_corners", condition: cornersFilled },
        { id: "tower_build", condition: towerBuilt },
        { id: "chaos_desk", condition: deskItems.length >= 15 },
        { id: "philosopher", condition: discoveredItems.filter(i => !i.url).length >= 15 },
        { id: "crisis", condition: stats.failedCrafts >= 10 },
        { id: "duck_soup", condition: totalArtists >= 100 },
        { id: "madness", condition: triggerType === "spam_click" },
        { id: "silence", condition: triggerType === "idle_timeout" },
        { id: "tengen_toppa", condition: stats.sameMaterialCrafts >= 10 },
        { id: "aspect_shadow", condition: triggerType === "shake_mrak" },
        { id: "gates_of_s", condition: artistsNames.includes("umikirameki") },
        { id: "graduation", condition: artistsNames.includes("sasagichh") && artistsNames.includes("svknon") },
        { id: "eclipse_quest", condition: triggerType === "eclipse_trigger" },
        { id: "zvezdec", condition: zvezdecRow },
        { id: "cosmostars", condition: cosmostarsRow },
        { id: "slime_attack", condition: triggerType === "slime_fail" },
        { id: "circus_time", condition: triggerType === "circus_trigger" },
        { id: "dice_roll", condition: artistsNames.includes("K'hath") || artistsNames.includes("Khath") },
        { id: "legend_speed", condition: artistsNames.includes("shakunetsu") },
        { id: "wait_and_see", condition: triggerType === "wait_see_trigger" },
        { id: "live_and_learn", condition: triggerType === "live_learn_trigger" },
        { id: "pride_sin", condition: artistsNames.includes("Akasakiii") },
        { id: "walter_fly", condition: triggerType === "walter_text" },
        { id: "chaos_era", condition: deskItems.length >= 50 },
        { id: "ghoul_inside", condition: triggerType === "ghoul_trigger" },
        { id: "geometry_smash", condition: hasGeometrySmash },
        { id: "bite_the_hand", condition: triggerType === "bite_hand_success" },
        { id: "big_three", condition: hasBigThree },
        { id: "konami_code", condition: triggerType === "konami_trigger" },
        { id: "prism_power", condition: hasPrismPower },
        { id: "vocaloid_sound", condition: triggerType === "vocaloid_volume_max" },
        { id: "mix_style", condition: hasMixStyle },
        { id: "kirito_clear", condition: triggerType === "kirito_success" },
        { id: "rero_cherry", condition: triggerType === "shake_cherry" },
        { id: "nicole_dead", condition: hasNicoleDead },
        { id: "not_friends", condition: hasNotFriends },
        { id: "my_cabbage", condition: triggerType === "cabbage_success" },
        { id: "cherry_on_cake", condition: triggerType === "shake_sweet" },
        { id: "orgy_style", condition: hasOrgyStyle },
        { id: "lusty_maid", condition: hasLustyMaid },
        { id: "collector", condition: totalArtists >= 30 },
        { id: "blue_eyed", condition: hasBlueEyed },
        { id: "levi_pain", condition: hasLeviPain },
        { id: "delicious_guro", condition: hasDeliciousGuro },
        { id: "cozy_life", condition: hasCozyLife },
        { id: "someday_love", condition: triggerType === "someday_love_trigger" },
        { id: "true_love_exists", condition: hasTrueLoveExists || triggerType === "true_love_clear" },
        { id: "not_in_public", condition: triggerType === "public_clear_success" },
        { id: "elephant_feathers", condition: artistsNames.includes("sapfirachibtelegram") },
        { id: "gigawatts", condition: triggerType === "bttf_fail" && deskNames.filter(n => n === "Конструкт").length >= 10 },
        { id: "more_gold", condition: stats.totalTabClicksCount >= 100 },
        { id: "hulk_hold", condition: triggerType === "hulk_hold_success" },
        { id: "for_emperor", condition: triggerType === "emperor_click_trigger" },
        { id: "gandalf_wheel", condition: triggerType === "gandalf_wheel_trigger" },
        { id: "april_lie", condition: triggerType === "april_lie_success" },
        { id: "that_one", condition: hasThtOne },
        { id: "jack_zandatsu", condition: triggerType === "zandatsu_trigger" },
        { id: "scp_173", condition: triggerType === "scp_173_trigger" },
        { id: "slime_touch", condition: triggerType === "slime_hover_trigger" },
        { id: "legend_michael", condition: artistsNames.includes("zewikus") },
        { id: "now_flag", condition: hasNowFlag },
        { id: "get_over_here", condition: hasGetOverHere },
        { id: "scooby_doo", condition: triggerType === "scooby_doo_trigger" },
        { id: "in_and_out", condition: stats.cancelResetCount >= 10 },
        { id: "xj9_robot", condition: triggerType === "xj9_trigger" },
        { id: "noob_saibot", condition: triggerType === "noob_saibot_trigger" },
        { id: "what_year", condition: deskNames.filter(n => n === "Будущее").length >= 10 && deskNames.filter(n => n === "Прошлое").length >= 10 },
        { id: "lazy_town", condition: stats.lazyTownClearCount >= 5 },
        { id: "scissors_master", condition: triggerType === "scissors_master_success" },
        { id: "metroidvania", condition: triggerType === "metroid_trigger" },
        { id: "ghost_strafe", condition: triggerType === "ghost_strafe_trigger" },
        { id: "frieren_way", condition: triggerType === "frieren_trigger" },
        { id: "room_302", condition: stats.clearDeskClicks >= 21 },
        { id: "i_am_fired", condition: triggerType === "fired_clear_success" },
        { id: "no_second_season", condition: stats.tabSwitchCount >= 28 },
        { id: "matrix_pills", condition: triggerType === "matrix_text" }
    ];

    checkList.forEach(q => {
        if (q.condition && !stats.unlockedQuests.includes(q.id)) {
            stats.unlockedQuests.push(q.id);
            const achMeta = ALL_ACHIEVEMENTS.find(a => a.id === q.id);
            if (achMeta && achMeta.reward !== "Ничего") {
                const rewards = achMeta.reward.split(',').map(r => r.trim());
                rewards.forEach(rewardName => {
                    const alreadyHas = discoveredItems.some(i => i.name === rewardName);
                    if (!alreadyHas) {
                        discoveredItems.push({ name: rewardName, img: achMeta.img, url: "", desc: "" });
                    }
                });
                showAchievementToast(achMeta);
            } else if (achMeta) {
                showAchievementToast({ title: achMeta.title, reward: "Скрытый трофей" });
            }
            saveGame();
            renderAllTabs();
        }
    });
}

function checkClearDeskQuests() {
    const wsItems = document.querySelectorAll('.item.on-desk');
    const deskItems = Array.from(wsItems).map(el => el.dataset.name);
    let artistCountOnDesk = Array.from(wsItems).filter(el => el.classList.contains('artist-card')).length;
    
    if (artistCountOnDesk > 0) {
        stats.deletedArtistsCount += artistCountOnDesk;
        if (stats.deletedArtistsCount >= 213) checkQuests("kirito_trigger");
    }
    
    let sadismCount = deskItems.filter(name => name === "Садизм").length;
    if (sadismCount > 0) {
        stats.cabbageRemoveCount += sadismCount;
        if (stats.cabbageRemoveCount >= 30) checkQuests("cabbage_trigger");
    }
    
    let hasFakeLove = deskItems.includes("Фальшивая любовь");
    let hasLovePack = deskItems.includes("Свобода") && deskItems.includes("Чувства") && deskItems.includes("Эмоции") && deskItems.includes("Танец") && deskItems.includes("Краски");
    if (hasFakeLove && hasLovePack) checkQuests("true_love_clear");
    
    let pubLove = deskItems.includes("Любовь"), pubV = deskItems.includes("Вязкость"), pubN = deskItems.includes("Ночь"), pubD = deskItems.includes("День");
    if (pubLove && pubV && pubN && pubD) {
        stats.notInPublicCount++;
        if (stats.notInPublicCount >= 7) checkQuests("public_clear_success");
    }
    
    if (deskItems.includes("Время") && deskItems.includes("Организм") && deskItems.includes("Энергия")) {
        stats.lazyTownClearCount++;
    }
    
    if (deskItems.filter(n => n === "Меч").length >= 7) checkQuests("scissors_master_success");
    
    let fireCheck = ["Элемент", "Огонь", "Металл", "Ветер", "Молния", "Яд", "Свет", "Тень"].every(n => deskItems.includes(n));
    if (fireCheck) checkQuests("fired_clear_success");
    
    const bgMusic = document.getElementById('bg-music');
    if (deskItems.includes("Любовь") && bgMusic && bgMusic.volume <= 0.01) {
        checkQuests("april_lie_success");
    }
    
    if (wsItems.length >= 50 && !stats.unlockedQuests.includes("void_era")) {
        stats.unlockedQuests.push("void_era");
        unlockClearReward("void_era");
    }
    
    let artistCount = document.querySelectorAll('.item.on-desk.artist-card').length;
    let monsterCount = deskItems.filter(name => name === "Монстроподобие").length;
    if (artistCount >= 9 && monsterCount >= 10) checkQuests("bite_hand_success");
    
    let hasGhost = deskItems.includes("Призрачность");
    let constructCount = deskItems.filter(name => name === "Конструкт").length;
    if (hasGhost && constructCount >= 10 && !stats.unlockedQuests.includes("project_2501")) {
        stats.unlockedQuests.push("project_2501");
        unlockClearReward("project_2501");
    }
    let hasSunset = deskItems.includes("Закат");
    let hasSilence = deskItems.includes("Тишина");
    let hasLove = deskItems.includes("Любовь");
    if (hasSunset && hasSilence && hasLove && !stats.unlockedQuests.includes("moon_on_water")) {
        stats.unlockedQuests.push("moon_on_water");
        unlockClearReward("moon_on_water");
    }
    let hasDawn = deskItems.includes("Рассвет");
    let hasHeat = deskItems.includes("Тепло");
    let hasStars = deskItems.includes("Звезды");
    if (hasDawn && hasHeat && hasStars && !stats.unlockedQuests.includes("escanor_proud")) {
        stats.unlockedQuests.push("escanor_proud");
        unlockClearReward("escanor_proud");
    }
}

function unlockClearReward(id) {
    const achMeta = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (!achMeta) return;
    const rewards = achMeta.reward.split(',').map(r => r.trim());
    rewards.forEach(rewardName => {
        if (!discoveredItems.some(i => i.name === rewardName)) {
            discoveredItems.push({ name: rewardName, img: achMeta.img, url: "", desc: "" });
        }
    });
    showAchievementToast(achMeta);
    saveGame();
    renderAllTabs();
}

function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-popup');
    if (toast) {
        // Восстановлены обратные кавычки
        toast.innerHTML = `<span class="icon">🏆</span> Достижение: <span style="color:#ff007f;">«${ach.title}»</span>! Получен элемент: <span class="reward">${ach.reward}</span>`;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 4500);
    }
}

function saveGame() {
    localStorage.setItem('alchemy_souls_progress', JSON.stringify(discoveredItems));
    localStorage.setItem('alchemy_souls_stats', JSON.stringify(stats));
}

function showArtistModal(item) {
    document.getElementById('m-name').innerText = item.name;
    document.getElementById('m-desc').innerText = item.desc;
    document.getElementById('m-link').href = item.url;
    const modalArt = document.getElementById('m-art');
    if (modalArt) {
        // Восстановлены обратные кавычки
        modalArt.src = `images/${item.img}`;
        modalArt.onerror = () => { modalArt.src = 'images/placeholder.png'; };
    }
    document.getElementById('artist-modal').classList.add('active');
}

function closeModal(e) {
    if (e.target.id === 'artist-modal') document.getElementById('artist-modal').classList.remove('active');
}

function resetGame() {
    if (confirm("Вы уверены, что хотите полностью сбросить прогресс, открытых художников и все достижения?")) {
        localStorage.removeItem('alchemy_souls_progress');
        localStorage.removeItem('alchemy_souls_stats');
        discoveredItems = [...BASE_ITEMS];
        stats = { totalCrafts: 0, clearDeskClicks: 0, failedCrafts: 0, searchUsed: false, sameMaterialCrafts: 0, shadowAttempts: 0, deletedArtistsCount: 0, tabSwitchCount: 0, cabbageRemoveCount: 0, notInPublicCount: 0, cancelResetCount: 0, unlockedQuests: [] };
        document.getElementById('workspace').innerHTML = '';
        currentActiveTab = "items";
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => btn.classList.remove('active'));
        if (tabs && tabs[0]) tabs[0].classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const itemsTab = document.getElementById('items-tab');
        if (itemsTab) itemsTab.classList.add('active');
        renderAllTabs();
    } else {
        stats.cancelResetCount = (stats.cancelResetCount || 0) + 1;
        saveGame();
        checkQuests(); 
    }
}

function clearDesk() {
    checkClearDeskQuests();
    stats.clearDeskClicks++;
    checkQuests();
    const ws = document.getElementById('workspace');
    if (ws) ws.innerHTML = '';
}
