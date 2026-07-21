let discoveredItems = ["Вода", "Огонь", "Земля", "Воздух"];
let selectedItems = [];
let recipes = [];

// Загружаем ваши рецепты из файла конфигурации
fetch('recipes.json')
    .then(response => response.json())
    .then(data => {
        recipes = data;
        renderItems();
    });

function renderItems() {
    const container = document.getElementById('inventory');
    container.innerHTML = '<h3>Открытые элементы</h3>';
    discoveredItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerText = item;
        div.onclick = () => selectItem(item, div);
        container.appendChild(div);
    });
}

function selectItem(item, element) {
    if (selectedItems.includes(item)) return;
    
    selectedItems.push(item);
    element.classList.add('selected');

    if (selectedItems.length === 2) {
        checkCombination();
    }
}

function checkCombination() {
    const [i1, i2] = selectedItems;
    // Ищем рецепт в обе стороны (А+Б или Б+А)
    const match = recipes.find(r => 
        (r.item1 === i1 && r.item2 === i2) || (r.item1 === i2 && r.item2 === i1)
    );

    if (match && !discoveredItems.includes(match.result)) {
        discoveredItems.push(match.result);
        alert(`Поздравляю! Вы открыли: ${match.result}`);
    } else if (match) {
        alert('Элемент уже открыт!');
    } else {
        alert('Ничего не происходит...');
    }

    selectedItems = [];
    renderItems();
}
