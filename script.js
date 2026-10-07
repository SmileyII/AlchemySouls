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

const ALL_ACHIEVEMENTS = [
    { id: "first_craft", title: "Первый шаг", desc: "Сделать один успешный крафт", reward: "Ничего", img: "опыт.png" },
    { id: "cleaner", title: "Чистый холст", desc: "Нажать кнопку 'Очистить стол' 3 раза", reward: "Чистота", img: "чистота.png" },
    { id: "searcher", title: "В поисках истины", desc: "Воспользоваться строкой поиска", reward: "Изучение", img: "изучение.png" },
    { id: "four_corners", title: "Aбсолютная гармония", desc: "Расставить 4 любых элемента по четырём углам стола", reward: "Баланс, Гармония", img: "гармония.png" },
    { id: "tower_build", title: "Архитектор?", desc: "Выстроить 3 любых элемента на столе в один ровный вертикальный ряд", reward: "Конструкт", img: "структура.png" },
    { id: "chaos_desk", title: "Творческий хаос", desc: "Вытащить на рабочий стол одновременно больше 15 элементов", reward: "Блеск, Вспышка", img: "хаос.png" },
    { id: "philosopher", title: "Элемент Экзострайдера", desc: "Открыть 15 любых промежуточных элементов или смыслов", reward: "Элемент", img: "философия.png" },
    { id: "crisis", title: "Я тебя сейчас ЗААРТБЛОЧУ!", desc: "Попробовать соединить неподходящие элементы 10 раз", reward: "Грусть, Апатия", img: "уныние.png" },
    { id: "collector", title: "Коллекционер душ", desc: "Открыть 30 разных художников выставки", reward: "Величие", img: "признание.png" },
    { id: "duck_soup", title: "Duck Soup", desc: "Открыть 100 художников выставки", reward: "Душа", img: "душа.png" },
    { id: "madness", title: "Безумно ли?", desc: "Быстро нажать на один и тот же элемент в инвентаре 10 раз", reward: "Безумие", img: "безумие.png" },
    { id: "silence", title: "Ты ещё тут?", desc: "Ничего не делать в игре в течение 3 минут", reward: "Тишина", img: "тишина.png" },
    { id: "tengen_toppa", title: "Супер Тенген Топпа...", desc: "Получить 10 художников из двух одинаковых материалов", reward: "Совмещение", img: "совмещение.png" },
    { id: "aspect_shadow", title: "Встряхнём мракобесов!", desc: "Возьмите Мрак на столе и встряхните его как следует.", reward: "Тень", img: "тень.png" },
    { id: "gates_of_s", title: "Выбор врат Ш.", desc: "Открыть секретного художника umikirameki", reward: "Звезды, Чудо", img: "звезды.png" },
    { id: "graduation", title: "Наш выпускной", desc: "Открыть художников sasagichh и svknon", reward: "Цветы", img: "цветы.png" },
    { id: "eclipse_quest", title: "Eclipse", desc: "Попробовать закрыть (наложить) элементы Тепло и Свет элементами Мрак и Холод на столе", reward: "Затмение", img: "затмение.png" },
    { id: "zvezdec", title: "ЗВЕЗДец", desc: "Расположить на столе элементы в ряд горизонтально: Тепло/Холод, Затмение, Холод/Тепло", reward: "Рассвет, Закат", img: "рассвет.png" },
    { id: "cosmostars", title: "Космоstars", desc: "Расположить на столе элементы в ряд горизонтально: Рассвет/Закат, Затмение, Закат/Рассвет", reward: "Вселенная", img: "вселенная.png" },
    { id: "slime_attack", title: "Он меня обдал слизью!", desc: "Попробовать соединить Хаос и Судьбу", reward: "Призрачность", img: "призрачность.png" },
    { id: "gigawatts", title: "1.21 gigawatts!", desc: "Попробовать соединить Вспышку и Конструкт", reward: "Будущее, Прошлое", img: "будущее.png" },
    { id: "what_year", title: "Какой сейчас год?", desc: "Попробовать соединить Будущее и Прошлое", reward: "Время", img: "время.png" },
    { id: "project_2501", title: "Project 2501", desc: "Очистить стол, когда на нём есть Призрачность и 10 Конструктов", reward: "Кибернетика, Металл", img: "кибер.png" },
    { id: "moon_on_water", title: "MOON ON THE WATER", desc: "Очистить стол, когда на нём есть Закат, Тишина и Любовь", reward: "Луна, Ночь", img: "луна.png" },
    { id: "escanor_proud", title: "Эсканор будет доволен...", desc: "Очистить стол, когда на нём есть Рассвет, Тепло и Звёзды", reward: "Солнце, День", img: "солнце.png" }
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
            if (!stats.searchUsed && searchBox.value.length > 0) {
                stats.searchUsed = true;
                checkQuests();
            }
            renderCurrentTab();
        };
    }

    setInterval(() => {
        if (Date.now() - lastInputTime >= 180000) { 
            checkQuests("idle_timeout");
        }
    }, 10000);

    window.onmousemove = resetActivityTimer;
    window.onmousedown = resetActivityTimer;
}

function resetActivityTimer() {
    lastInputTime = Date.now();
}

function switchTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
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
        
        div.onmousedown = (e) => { 
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
    container.innerHTML = '';
    
    ALL_ACHIEVEMENTS.forEach(ach => {
        const isUnlocked = stats.unlockedQuests.includes(ach.id);
        const card = document.createElement('div');
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
    img.src = `images/${itemData.img}`;
    img.onerror = () => { img.src = 'images/placeholder.png'; };
    
    const text = document.createElement('span');
    text.innerText = itemData.name + (isDead ? " •" : "");
    
    clone.appendChild(img); clone.appendChild(text);
    workspace.appendChild(clone);
    
    const rect = workspace.getBoundingClientRect();
    let x = e.clientX - rect.left - 50;
    let y = e.clientY - rect.top - 55;
    clone.style.left = `${x}px`; clone.style.top = `${y}px`;
    
    startDragProcess(e, clone, 50, 55);
}

function startDragProcess(e, element, shiftX, shiftY) {
    const workspace = document.getElementById('workspace');
    const rect = workspace.getBoundingClientRect();
    if (currentMoveHandler) document.removeEventListener('mousemove', currentMoveHandler);
    
    let lastX = null;
    let lastTime = Date.now();
    let shakeScore = 0;

    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        x = Math.max(0, Math.min(x, workspace.clientWidth - element.clientWidth));
        y = Math.max(0, Math.min(y, workspace.clientHeight - element.clientHeight));
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        // Логика тряски для элемента Мрак
        if (element.dataset.name === "Мрак") {
            let currentTime = Date.now();
            if (lastX !== null && currentTime - lastTime > 50) {
                let speed = Math.abs(clientX - lastX) / (currentTime - lastTime);
                if (speed > 1.5) { // Если мышка движется действительно быстро
                    shakeScore++;
                    if (shakeScore >= 15) { // Набралось достаточно быстрых движений
                        checkQuests("shake_mrak");
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
        img.src = `images/${newItemData.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        const text = document.createElement('span');
        text.innerText = newItemData.name + (isDead ? " •" : "");
        resultEl.appendChild(img); resultEl.appendChild(text);
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
        stats.failedCrafts++;
        if ((name1 === "Мрак" && name2 === "Тень") || (name2 === "Мрак" && name1 === "Тень")) stats.shadowAttempts++;
        if ((name1 === "Хаос" && name2 === "Судьба") || (name2 === "Хаос" && name1 === "Судьба")) checkQuests("slime_fail");
        if ((name1 === "Вспышка" && name2 === "Конструкт") || (name2 === "Вспышка" && name1 === "Конструкт")) checkQuests("bttf_fail");
        if ((name1 === "Будущее" && name2 === "Прошлое") || (name2 === "Будущее" && name1 === "Прошлое")) checkQuests("year_fail");
    }
    checkQuests();
}

function checkQuests(triggerType) {
    const ws = document.getElementById('workspace');
    if (!ws) return;
    const deskItems = document.querySelectorAll('.item.on-desk');
    
    // 1. Геометрия стола (углы)
    let cornersFilled = false;
    if (deskItems.length >= 4) {
        let topLeft = false, topRight = false, bottomLeft = false, bottomRight = false;
        const margin = 50;
        deskItems.forEach(el => {
            let x = parseFloat(el.style.left || 0);
            let y = parseFloat(el.style.top || 0);
            let maxW = ws.clientWidth - el.clientWidth;
            let maxH = ws.clientHeight - el.clientHeight;
            if (x <= margin && y <= margin) topLeft = true;
            if (x >= maxW - margin && y <= margin) topRight = true;
            if (x <= margin && y >= maxH - margin) bottomLeft = true;
            if (x >= maxW - margin && y >= maxH - margin) bottomRight = true;
        });
        if (topLeft && topRight && bottomLeft && bottomRight) cornersFilled = true;
    }

    // 2. Вертикальная башня
    let towerBuilt = false;
    if (deskItems.length >= 3) {
        for (let i = 0; i < deskItems.length; i++) {
            let x1 = parseFloat(deskItems[i].style.left || 0);
            let matchCount = 1;
            for (let j = 0; j < deskItems.length; j++) {
                if (i === j) continue;
                let x2 = parseFloat(deskItems[j].style.left || 0);
                if (Math.abs(x1 - x2) <= 15) matchCount++;
            }
            if (matchCount >= 3) { towerBuilt = true; break; }
        }
    }

    // 3. Проверка горизонтальных цепочек С АВТОМАТИЧЕСКИМ УДАЛЕНИЕМ
    let zvezdecRow = false;
    let cosmostarsRow = false;
    if (deskItems.length >= 3) {
        // Превращаем в массив элементов с их реальными HTML-объектами
        let arr = Array.from(deskItems).map(el => ({
            el: el,
            name: el.dataset.name,
            x: parseFloat(el.style.left || 0),
            y: parseFloat(el.style.top || 0)
        })).sort((a, b) => a.x - b.x); // Сортируем слева направо

        for (let i = 0; i < arr.length - 2; i++) {
            let i1 = arr[i], i2 = arr[i+1], i3 = arr[i+2];
            let isLine = Math.abs(i1.y - i2.y) <= 30 && Math.abs(i2.y - i3.y) <= 30; // На одной высоте
            
            if (isLine) {
                // Проверка для ачивки ЗВЕЗДец
                if ((i1.name === "Тепло" || i1.name === "Холод") && i2.name === "Затмение" && (i3.name === "Холод" || i3.name === "Тепло") && i1.name !== i3.name) {
                    if (!stats.unlockedQuests.includes("zvezdec")) {
                        zvezdecRow = true;
                        // Красиво удаляем эту тройку со стола
                        i1.el.remove(); i2.el.remove(); i3.el.remove();
                        break;
                    }
                }
                // Проверка для ачивки Космоstars
                if ((i1.name === "Рассвет" || i1.name === "Закат") && i2.name === "Затмение" && (i3.name === "Закат" || i3.name === "Рассвет") && i1.name !== i3.name) {
                    if (!stats.unlockedQuests.includes("cosmostars")) {
                        cosmostarsRow = true;
                        // Красиво удаляем эту тройку со стола
                        i1.el.remove(); i2.el.remove(); i3.el.remove();
                        break;
                    }
                }
            }
        }
    }

    const artists = discoveredItems.filter(i => i.url).map(i => i.name);
    const totalArtists = artists.length;

    const checkList = [
        { id: "first_craft", condition: stats.totalCrafts >= 1 },
        { id: "cleaner", condition: stats.clearDeskClicks >= 3 },
        { id: "searcher", condition: stats.searchUsed === true },
        { id: "four_corners", condition: cornersFilled },
        { id: "tower_build", condition: towerBuilt },
        { id: "chaos_desk", condition: deskItems.length >= 15 },
        { id: "philosopher", condition: discoveredItems.filter(i => !i.url).length >= 15 },
        { id: "crisis", condition: stats.failedCrafts >= 10 },
        { id: "collector", condition: totalArtists >= 30 },
        { id: "duck_soup", condition: totalArtists >= 100 },
        { id: "madness", condition: triggerType === "spam_click" },
        { id: "silence", condition: triggerType === "idle_timeout" },
        { id: "tengen_toppa", condition: stats.sameMaterialCrafts >= 10 },
        { id: "aspect_shadow", condition: triggerType === "shake_mrak" }, // Новое условие тряски!
        { id: "gates_of_s", condition: artists.includes("umikirameki") },
        { id: "graduation", condition: artists.includes("sasagichh") && artists.includes("svknon") },
        { id: "eclipse_quest", condition: triggerType === "eclipse_trigger" },
        { id: "zvezdec", condition: zvezdecRow },
        { id: "cosmostars", condition: cosmostarsRow },
        { id: "slime_attack", condition: triggerType === "slime_fail" },
        { id: "gigawatts", condition: triggerType === "bttf_fail" },
        { id: "what_year", condition: triggerType === "year_fail" }
    ];

    checkList.forEach(q => {
        if (q.condition && !stats.unlockedQuests.includes(q.id)) {
            stats.unlockedQuests.push(q.id);
            const achMeta = ALL_ACHIEVEMENTS.find(a => a.id === q.id);
            
            if (achMeta.reward !== "Ничего") {
                const rewards = achMeta.reward.split(',').map(r => r.trim());
                rewards.forEach(rewardName => {
                    const alreadyHas = discoveredItems.some(i => i.name === rewardName);
                    if (!alreadyHas) {
                        discoveredItems.push({ name: rewardName, img: achMeta.img, url: "", desc: "" });
                    }
                });
                // Передаем весь объект ачивки, чтобы тост знал её название!
                showAchievementToast(achMeta);
            } else {
                showAchievementToast({ title: achMeta.title, reward: "Скрытый трофей" });
            }
            saveGame();
            renderAllTabs();
        }
    });
}

// Обновленный тост с выводом названия пасхалки
function showAchievementToast(ach) {
    const toast = document.getElementById('achievement-popup');
    if (toast) {
        // Находим внутренний текст плашки и меняем его структуру
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
        // Исправлено: добавлены корректные обратные кавычки
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
        stats = { totalCrafts: 0, clearDeskClicks: 0, failedCrafts: 0, searchUsed: false, sameMaterialCrafts: 0, shadowAttempts: 0, unlockedQuests: [] };
        document.getElementById('workspace').innerHTML = '';
        currentActiveTab = "items";
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => btn.classList.remove('active'));
        if (tabs && tabs[0]) tabs[0].classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const itemsTab = document.getElementById('items-tab');
        if (itemsTab) itemsTab.classList.add('active');
        renderAllTabs();
    }
}

function clearDesk() {
    checkClearDeskQuests();
    stats.clearDeskClicks++;
    checkQuests();
    const ws = document.getElementById('workspace');
    if (ws) ws.innerHTML = '';
}
