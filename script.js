let discoveredItems = [
    { name: "Вода", img: "вода.png" },
    { name: "Огонь", img: "огонь.png" },
    { name: "Земля", img: "земля.png" },
    { name: "Воздух", img: "воздух.png" }
];
let recipes = [];
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
        
        // Перетаскивание элемента из инвентаря
        div.onmousedown = (e) => spawnItemOnDesk(e, item);
        
        inventory.appendChild(div);
    });
}

// Создание копии элемента на рабочем столе при клике/перетаскивании
function spawnItemOnDesk(e, itemData) {
    e.preventDefault();
    
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
    
    // Центрируем элемент под курсором мыши
    const rect = workspace.getBoundingClientRect();
    let x = e.clientX - rect.left - 50;
    let y = e.clientY - rect.top - 55;
    
    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    
    // Сразу активируем перетаскивание для созданного клона
    startDrag(e, clone);
}

// Логика перемещения элемента по столу
function startDrag(e, element) {
    const rect = workspace.getBoundingClientRect();
    let shiftX = e.clientX - element.getBoundingClientRect().left;
    let shiftY = e.clientY - element.getBoundingClientRect().top;
    
    function moveAt(clientX, clientY) {
        let x = clientX - rect.left - shiftX;
        let y = clientY - rect.top - shiftY;
        
        // Ограничиваем перемещение рамками стола
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
        
        // Проверяем, не наложили ли мы этот элемент на какой-то другой
        checkCollisions(element);
    };
}

// Проверка столкновения элементов
function checkCollisions(draggedElement) {
    const deskItems = document.querySelectorAll('.item.on-desk');
    const r1 = draggedElement.getBoundingClientRect();
    
    for (let other of deskItems) {
        if (other === draggedElement) continue;
        
        const r2 = other.getBoundingClientRect();
        
        // Простая проверка пересечения прямоугольников элементов (хитбокс)
        const isOverlapping = !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
        
        if (isOverlapping) {
            combineElements(draggedElement, other);
            return; // Прерываем цикл, так как соединение произошло
        }
    }
}

// Логика скрещивания
function combineElements(el1, el2) {
    const name1 = el1.dataset.name;
    const name2 = el2.dataset.name;
    
    // Ищем рецепт
    const match = recipes.find(r => 
        (r.item1 === name1 && r.item2 === name2) || (r.item1 === name2 && r.item2 === name1)
    );
    
    if (match) {
        // Вычисляем позицию между двумя старыми элементами, чтобы создать новый на их месте
        const x = (parseFloat(el1.style.left) + parseFloat(el2.style.left)) / 2;
        const y = (parseFloat(el1.style.top) + parseFloat(el2.style.top)) / 2;
        
        // Удаляем старые элементы со стола
        el1.remove();
        el2.remove();
        
        // Создаем новый элемент на столе
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
        
        // Позволяем перетаскивать и новый созданный элемент
        resultEl.onmousedown = (e) => startDrag(e, resultEl);
        workspace.appendChild(resultEl);
        
        // Проверяем, открыт ли он в инвентаре
        const alreadyOpened = discoveredItems.some(i => i.name === match.result);
        if (!alreadyOpened) {
            discoveredItems.push(newItemData);
            renderInventory(); // Обновляем боковую панель
        }
    }
}
