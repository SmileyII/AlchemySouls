let discoveredItems = [
    { name: "Вода", img: "вода.png" },
    { name: "Огонь", img: "огонь.png" },
    { name: "Земля", img: "земля.png" },
    { name: "Воздух", img: "воздух.png" }
];
let recipes = [];
let isDraggingNow = false; // Блокировка: занята ли рука игрока прямо сейчас
const workspace = document.getElementById('workspace');

// Загрузка рецептов
fetch('recipes.json')
    .then(response => response.json())
    .then(data => {
        recipes = data;
        renderInventory();
    });

// Отрисовка панели элементов справа
function renderInventory() {
    const inventory = document.getElementById('inventory');
    inventory.innerHTML = '';
    
    discoveredItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        
        const img = document.createElement('img');
        img.src = `images/${item.img}`; 
        img.onerror = () => { img.src = 'images/placeholder.png'; }; 
        
        const text = document.createElement('span');
        text.innerText = item.name;
        
        div.appendChild(img);
        div.appendChild(text);
        
        // Зажимаем мышь в меню — активируется вытягивание элемента на стол
        div.onmousedown = (e) => {
            if (isDraggingNow) return; // Если уже что-то тащим, игнорируем
            spawnItemOnDesk(e, item);
        };
        
        inventory.appendChild(div);
    });
}

// Создание копии элемента на рабочем столе и мгновенный захват
function spawnItemOnDesk(e, itemData) {
    e.preventDefault();
    isDraggingNow = true; // Занимаем руку
    
    const clone = document.createElement('div');
    clone.className = 'item on-desk';
    clone.dataset.name = itemData.name;
    clone.dataset.img = itemData.img;
    
    const img = document.createElement('img');
    img.src = `images/${itemData.img}`;
    img.onerror = () => { img.src = 'images/placeholder.png'; };
    
    const text = document.createElement('span');
    text.innerText = itemData.name;
    
    clone.appendChild(img);
    clone.appendChild(text);
    workspace.appendChild(clone);
    
    const rect = workspace.getBoundingClientRect();
    
    // Сдвиг, чтобы элемент создался ровно центром под курсором
    let x = e.clientX - rect.left - 50;
    let y = e.clientY - rect.top - 55;
    
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    
    // Запускаем перетаскивание с фиксированным сдвигом ровно по центру
    startDragProcess(e, clone, 50, 55);
}

// Универсальная логика перемещения элемента
function startDragProcess(e, element, shiftX, shiftY) {
    const rect = workspace.getBoundingClientRect();
    
    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        
        // Ограничиваем рамками стола
        x = Math.max(0, Math.min(x, workspace.clientWidth - element.clientWidth));
        y = Math.max(0, Math.min(y, workspace.clientHeight - element.clientHeight));
        
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
    }
    
    function onMouseMove(event) {
        moveAt(event.clientX, event.clientY);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    
    element.onmouseup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        element.onmouseup = null;
        isDraggingNow = false; // Освобождаем руку после отпускания кнопки
        
        checkCollisions(element);
    };
}

// Включение перетаскивания для элементов, которые УЖЕ лежат на столе
workspace.onmousedown = function(e) {
    if (isDraggingNow) return; // Защита от мульти-хвата
    
    const targetItem = e.target.closest('.item.on-desk');
    if (!targetItem) return;
    
    e.preventDefault();
    isDraggingNow = true; // Занимаем руку
    
    // Вычисляем точную точку клика внутри элемента, чтобы он не прыгал при переносе
    let shiftX = e.clientX - targetItem.getBoundingClientRect().left;
    let shiftY = e.clientY - targetItem.getBoundingClientRect().top;
    
    startDragProcess(e, targetItem, shiftX, shiftY);
};

// Проверка столкновения элементов (с увеличенным радиусом)
function checkCollisions(draggedElement) {
    const deskItems = document.querySelectorAll('.item.on-desk');
    const r1 = draggedElement.getBoundingClientRect();
    
    // На сколько пикселей расширяем зону чувствительности (магнит соединения)
    const padding = 40; 
    
    for (let other of deskItems) {
        if (other === draggedElement) continue;
        
        const r2 = other.getBoundingClientRect();
        
        // Проверка пересечения с учетом увеличенной зоны чувствительности
        const isOverlapping = !(
            (r1.right + padding) < r2.left || 
            (r1.left - padding) > r2.right || 
            (r1.bottom + padding) < r2.top || 
            (r1.top - padding) > r2.bottom
        );
        
        if (isOverlapping) {
            combineElements(draggedElement, other);
            return; 
        }
    }
}

// Логика скрещивания
function combineElements(el1, el2) {
    const name1 = el1.dataset.name;
    const name2 = el2.dataset.name;
    
    const match = recipes.find(r => 
        (r.item1 === name1 && r.item2 === name2) || (r.item1 === name2 && r.item2 === name1)
    );
    
    if (match) {
        // Создаем новый элемент ровно посередине между двумя старыми
        const x = (parseFloat(el1.style.left) + parseFloat(el2.style.left)) / 2;
        const y = (parseFloat(el1.style.top) + parseFloat(el2.style.top)) / 2;
        
        el1.remove();
        el2.remove();
        
        const newItemData = { name: match.result, img: match.result_img };
        
        const resultEl = document.createElement('div');
        resultEl.className = 'item on-desk';
        resultEl.dataset.name = newItemData.name;
        resultEl.dataset.img = newItemData.img;
        
        const img = document.createElement('img');
        img.src = `images/${newItemData.img}`;
        img.onerror = () => { img.src = 'images/placeholder.png'; };
        
        const text = document.createElement('span');
        text.innerText = newItemData.name;
        
        resultEl.appendChild(img);
        resultEl.appendChild(text);
        
        resultEl.style.left = `${x}px`;
        resultEl.style.top = `${y}px`;
        
        workspace.appendChild(resultEl);
        
        // Проверяем, открыт ли он в книге рецептов
        const alreadyOpened = discoveredItems.some(i => i.name === match.result);
        if (!alreadyOpened) {
            discoveredItems.push(newItemData);
            renderInventory(); 
        }
    }
}
