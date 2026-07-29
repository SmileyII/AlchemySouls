const BASE_ITEMS = [
    { name: "Идея", img: "идея.png" },
    { name: "Форма", img: "форма.png" },
    { name: "Цвет", img: "цвет.png" },
    { name: "Материал", img: "материал.png" }
];

// Список всех существующих в игре достижений (для отрисовки списка)
const ALL_ACHIEVEMENTS = [
    { id: "first_craft", title: "Первый шаг", desc: "Сделать один успешный крафт", reward: "Опыт", img: "опыт.png" },
    { id: "cleaner", title: "Чистый холст", desc: "Нажать кнопку 'Очистить стол' 3 раза", reward: "Перфекционизм", img: "перфекционизм.png" },
    { id: "searcher", title: "В поисках истины", desc: "Воспользоваться строкой поиска", reward: "Любопытство", img: "любопытство.png" },
    { id: "four_corners", title: "Абсолютная гармония", desc: "Расставить 4 любых элемента по четырём углам стола", reward: "Гармония", img: "гармония.png" },
    { id: "crisis", title: "Творческий кризис", desc: "Попробовать соединить неподходящие элементы 10 раз", reward: "Уныние", img: "уныние.png" },
    { id: "collector", title: "Коллекционер душ", desc: "Открыть 5 разных художников выставки", reward: "Признание", img: "признание.png" }
];

let discoveredItems = [];
let recipes = [];
let isDraggingNow = false;
let currentMoveHandler = null;
let currentActiveTab = "items"; // Текущая открытая вкладка

let stats = {
    totalCrafts: 0,
    clearDeskClicks: 0,
    failedCrafts: 0,
    searchUsed: false,
    unlockedQuests: []
};

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
    searchBox.oninput = () => {
        if (!stats.searchUsed && searchBox.value.length > 0) {
            stats.searchUsed = true;
            checkQuests();
        }
        renderCurrentTab();
    };
}

// Переключение вкладок меню
function switchTab(tabName) {
    currentActiveTab = tabName;
    
    // Переключаем активные кнопки в HTML
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Переключаем активные списки
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
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

// Отрисовка вкладки Элементов
function renderItemsTab() {
    const container = document.getElementById('items-tab');
    const searchQuery = document.getElementById('search-box').value.toLowerCase();
    container.innerHTML = '';
    
    discoveredItems.forEach(item => {
        if (item.url) return; 
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return;

        const div = document.createElement('div');
        div.className = 'item';
        
        const img = document.createElement('img');
        img.src = `images/${item.img}`; 
        img.onerror = () => { img.src = 'images/placeholder.png'; }; 
        
        const text = document.createElement('span');
        text.innerText = item.name;
        
        div.appendChild(img); div.appendChild(text);
        div.onmousedown = (e) => { if (!isDraggingNow) spawnItemOnDesk(e, item); };
        
        container.appendChild(div);
    });
}

// Отрисовка вкладки Художников
function renderArtistsTab() {
    const container = document.getElementById('artists-tab');
    const searchQuery = document.getElementById('search-box').value.toLowerCase();
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
}

// Отрисовка списка достижений
function renderAchievementsTab() {
    const container = document.getElementById('achievements-tab');
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
        reward.innerText = `Награда: + [${ach.reward}]`;
        
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
    clone.className = 'item on-desk' + (itemData.url ? ' artist-card' : '');
    clone.dataset.name = itemData.name;
    clone.dataset.img = itemData.img;
    if(itemData.url) clone.dataset.url = itemData.url;
    if(itemData.desc) clone.dataset.desc = itemData.desc;
    
    const img = document.createElement('img');
    img.src = `images/${itemData.img}`;
    img.onerror = () => { img.src = 'images/placeholder.png'; };
    
    const text = document.createElement('span');
    text.innerText = itemData.name;
    
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
    
    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        x = Math.max(0, Math.min(x, workspace.clientWidth - element.clientWidth));
        y = Math.max(0, Math.min(y, workspace.clientHeight - element.clientHeight));
        element.style.left = `${x}px`; element.style.top = `${y}px`;
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

// ВОССТАНОВЛЕННЫЙ БЛОК СКРЕЩИВАНИЯ, СТАТИСТИКИ И МОДАЛОК
function combineElements(el1, el2) {
    const name1 = el1.dataset.name;
    const name2 = el2.dataset.name;
    
    const match = recipes.find(r => (r.item1 === name1 && r.item2 === name2) || (r.item1 === name2 && r.item2 === name1));
    
if (match) {
        if (currentMoveHandler) { document.removeEventListener('mousemove', currentMoveHandler); currentMoveHandler = null; }
        window.onmouseup = null; isDraggingNow = false;

        stats.totalCrafts++;

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
        resultEl.className = 'item on-desk' + (newItemData.url ? ' artist-card' : '');
        resultEl.dataset.name = newItemData.name;
        resultEl.dataset.img = newItemData.img;
        if(newItemData.url) resultEl.dataset.url = newItemData.url;
        if(newItemData.desc) resultEl.dataset.desc = newItemData.desc;
        
        const img = document.createElement('img');
        // Исправлено: добавлены обратные кавычки для генерации пути
        img.src = `images/${newItemData.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        
        const text = document.createElement('span');
        text.innerText = newItemData.name;
        
        resultEl.appendChild(img); resultEl.appendChild(text);
        // Исправлено: добавлены обратные кавычки для стилей позиционирования
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
    }
    checkQuests();
}

// СИСТЕМА ПРОВЕРКИ УГЛОВ И КВЕСТОВ
function checkQuests() {
    const ws = document.getElementById('workspace');
    const deskItems = document.querySelectorAll('.item.on-desk');
    let cornersFilled = false;
    
    if (deskItems.length >= 4) {
        let topLeft = false, topRight = false, bottomLeft = false, bottomRight = false;
        const margin = 40;
        
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

    const checkList = [
        { id: "first_craft", condition: stats.totalCrafts >= 1 },
        { id: "cleaner", condition: stats.clearDeskClicks >= 3 },
        { id: "searcher", condition: stats.searchUsed === true },
        { id: "crisis", condition: stats.failedCrafts >= 10 },
        { id: "four_corners", condition: cornersFilled },
        { id: "collector", condition: discoveredItems.filter(i => i.url).length >= 5 }
    ];

    checkList.forEach(q => {
        if (q.condition && !stats.unlockedQuests.includes(q.id)) {
            stats.unlockedQuests.push(q.id);
            const achMeta = ALL_ACHIEVEMENTS.find(a => a.id === q.id);
            const alreadyHas = discoveredItems.some(i => i.name === achMeta.reward);
            
            if (!alreadyHas) {
                discoveredItems.push({ name: achMeta.reward, img: achMeta.img, url: "", desc: "" });
                showAchievementToast(achMeta.reward);
            }
            saveGame();
            renderAllTabs();
        }
    });
}

function showAchievementToast(itemName) {
    const toast = document.getElementById('achievement-popup');
    document.getElementById('ach-reward').innerText = itemName;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 4000);
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
    // Исправлено: добавлены обратные кавычки для пути к арту
    modalArt.src = `images/${item.img}`;
    modalArt.onerror = () => { modalArt.src = 'images/placeholder.png'; };
    document.getElementById('artist-modal').classList.add('active');
}

function closeModal(e) {
    if (e.target.id === 'artist-modal') document.getElementById('artist-modal').classList.remove('active');
}

// ИСПРАВЛЕННАЯ И ВОССТАНОВЛЕННАЯ ФУНКЦИЯ СБРОСА
function resetGame() {
    if (confirm("Вы уверены, что хотите полностью сбросить прогресс, открытых художников и все достижения?")) {
        localStorage.removeItem('alchemy_souls_progress');
        localStorage.removeItem('alchemy_souls_stats');
        discoveredItems = [...BASE_ITEMS];
        stats = { totalCrafts: 0, clearDeskClicks: 0, failedCrafts: 0, searchUsed: false, unlockedQuests: [] };
        document.getElementById('workspace').innerHTML = '';
        currentActiveTab = "items";
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById('items-tab').classList.add('active');
        renderAllTabs();
    }
}

function clearDesk() {
    stats.clearDeskClicks++;
    checkQuests();
    const ws = document.getElementById('workspace');
    if (ws) ws.innerHTML = '';
}
