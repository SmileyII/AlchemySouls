const BASE_ITEMS = [
    { name: "Вода", img: "вода.png" },
    { name: "Огонь", img: "огонь.png" },
    { name: "Земля", img: "земля.png" },
    { name: "Воздух", img: "воздух.png" }
];

let discoveredItems = [];
let recipes = [];
let isDraggingNow = false;
let currentMoveHandler = null;
const workspace = document.getElementById('workspace');

// Инициализация игры
initGame();

function initGame() {
    // Загрузка сохранения из LocalStorage
    const saved = localStorage.getItem('alchemy_souls_progress');
    if (saved) {
        discoveredItems = JSON.parse(saved);
    } else {
        discoveredItems = [...BASE_ITEMS];
    }

    // Загрузка базы рецептов
    fetch('recipes.json')
        .then(response => response.json())
        .then(data => {
            recipes = data;
            renderInventory();
        });

    // Слушатель для строки поиска
    document.getElementById('search-box').oninput = renderInventory;
}

// Отрисовка инвентаря с учетом поиска
function renderInventory() {
    const inventory = document.getElementById('inventory');
    const searchQuery = document.getElementById('search-box').value.toLowerCase();
    inventory.innerHTML = '';
    
    discoveredItems.forEach(item => {
        // Если есть поисковый запрос и он не совпадает с именем, пропускаем элемент
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery)) return;

        const div = document.createElement('div');
        div.className = 'item';
        
        const img = document.createElement('img');
        img.src = `images/${item.img}`; 
        img.onerror = () => { img.src = 'images/placeholder.png'; }; 
        
        const text = document.createElement('span');
        text.innerText = item.name;
        
        div.appendChild(img);
        div.appendChild(text);
        
        // По зажатию — тянем на стол
        div.onmousedown = (e) => {
            if (isDraggingNow) return; 
            spawnItemOnDesk(e, item);
        };
        
        // По обычному клику на уже открытого художника — показываем его карточку повторно
        div.onclick = () => {
            if (item.url) showArtistModal(item);
        };
        
        inventory.appendChild(div);
    });
}

function spawnItemOnDesk(e, itemData) {
    e.preventDefault();
    isDraggingNow = true; 
    
    const clone = document.createElement('div');
    clone.className = 'item on-desk';
    clone.dataset.name = itemData.name;
    clone.dataset.img = itemData.img;
    if(itemData.url) clone.dataset.url = itemData.url;
    if(itemData.desc) clone.dataset.desc = itemData.desc;
    
    const img = document.createElement('img');
    img.src = `images/${itemData.img}`;
    img.onerror = () => { img.src = 'images/placeholder.png'; };
    
    const text = document.createElement('span');
    text.innerText = itemData.name;
    
    clone.appendChild(img);
    clone.appendChild(text);
    workspace.appendChild(clone);
    
    const rect = workspace.getBoundingClientRect();
    
    // Сначала точно рассчитываем координаты появления элемента на столе
    let x = e.clientX - rect.left - 50;
    let y = e.clientY - rect.top - 55;
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    
    // И только ПОСЛЕ этого запускаем процесс движения
    startDragProcess(e, clone, 50, 55);
}

function startDragProcess(e, element, shiftX, shiftY) {
    const rect = workspace.getBoundingClientRect();
    if (currentMoveHandler) document.removeEventListener('mousemove', currentMoveHandler);
    
    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        x = Math.max(0, Math.min(x, workspace.clientWidth - element.clientWidth));
        y = Math.max(0, Math.min(y, workspace.clientHeight - element.clientHeight));
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        checkCollisions(element);
    }
    
    currentMoveHandler = function(event) { moveAt(event.clientX, event.clientY); };
    document.addEventListener('mousemove', currentMoveHandler);
    
    window.onmouseup = function() {
        if (currentMoveHandler) { document.removeEventListener('mousemove', currentMoveHandler); currentMoveHandler = null; }
        window.onmouseup = null; element.onmouseup = null; isDraggingNow = false; 
    };
    element.onmouseup = window.onmouseup;
}

workspace.onmousedown = function(e) {
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
    const padding = 40; 
    
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
    
    const match = recipes.find(r => (r.item1 === name1 && r.item2 === name2) || (r.item1 === name2 && r.item2 === name1));
    
    if (match) {
        if (currentMoveHandler) { document.removeEventListener('mousemove', currentMoveHandler); currentMoveHandler = null; }
        window.onmouseup = null; isDraggingNow = false;

        const x = (parseFloat(el1.style.left) + parseFloat(el2.style.left)) / 2;
        const y = (parseFloat(el1.style.top) + parseFloat(el2.style.top)) / 2;
        
        el1.remove(); el2.remove();
        
        // Создаем объект данных нового элемента/художника
        const newItemData = { 
            name: match.result, 
            img: match.result_img,
            url: match.artist_url || "", // Ссылка на портфолио
            desc: match.artist_desc || "Потрясающий автор PortfolioDay!" // Описание
        };
        
        const resultEl = document.createElement('div');
        resultEl.className = 'item on-desk';
        resultEl.dataset.name = newItemData.name;
        resultEl.dataset.img = newItemData.img;
        if(newItemData.url) resultEl.dataset.url = newItemData.url;
        if(newItemData.desc) resultEl.dataset.desc = newItemData.desc;
        
        const img = document.createElement('img');
        img.src = `images/${newItemData.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        
        const text = document.createElement('span');
        text.innerText = newItemData.name;
        
        resultEl.appendChild(img); resultEl.appendChild(text);
        resultEl.style.left = `${x}px`; resultEl.style.top = `${y}px`;
        workspace.appendChild(resultEl);
        
        const alreadyOpened = discoveredItems.some(i => i.name === match.result);
        if (!alreadyOpened) {
            discoveredItems.push(newItemData);
            // Сохраняем обновленный список в браузер
            localStorage.setItem('alchemy_souls_progress', JSON.stringify(discoveredItems));
            renderInventory(); 
            
            // Если это именно художник (есть ссылка), сразу красиво показываем карточку!
            if (newItemData.url) {
                showArtistModal(newItemData);
            }
        }
    }
}

// Показ карточки художника
function showArtistModal(item) {
    document.getElementById('m-name').innerText = item.name;
    document.getElementById('m-desc').innerText = item.desc;
    document.getElementById('m-link').href = item.url;
    
    const modalArt = document.getElementById('m-art');
    modalArt.src = `images/${item.img}`;
    modalArt.onerror = () => { modalArt.src = 'images/placeholder.png'; };

    document.getElementById('artist-modal').classList.add('active');
}

// Закрытие модалки при клике на темную область вокруг
function closeModal(e) {
    if (e.target.id === 'artist-modal') {
        document.getElementById('artist-modal').classList.remove('active');
    }
}

// Функция сброса прогресса для тестов
function resetGame() {
    if (confirm("Вы уверены, что хотите сбросить весь прогресс игры?")) {
        localStorage.removeItem('alchemy_souls_progress');
        discoveredItems = [...BASE_ITEMS];
        workspace.innerHTML = '';
        renderInventory();
    }
function clearDesk() {
    document.getElementById('workspace').innerHTML = ''; // Исправлено: теперь браузер точно знает, какой стол очищать
}

}
}
