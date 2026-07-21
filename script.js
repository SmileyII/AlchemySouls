// Базовые элементы теперь тоже объекты с названиями картинок
let discoveredItems = [
    { name: "Вода", img: "вода.png" },
    { name: "Огонь", img: "огонь.png" },
    { name: "Земля", img: "земля.png" },
    { name: "Воздух", img: "воздух.png" }
];
let selectedItems = [];
let recipes = [];

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
        
        // Создаем картинку для элемента
        const img = document.createElement('img');
        // Путь ведет в папку images, которую мы создадим позже
        img.src = `images/${item.img}`; 
        // Если картинка еще не загружена или её нет, покажется пустая заглушка, игра не сломается
        img.onerror = () => { img.src = 'images/placeholder.png'; }; 
        
        const text = document.createElement('span');
        text.innerText = item.name;
        
        div.appendChild(img);
        div.appendChild(text);
        
        div.onclick = () => selectItem(item, div);
        container.appendChild(div);
    });
}

function selectItem(item, element) {
    if (selectedItems.some(i => i.name === item.name)) return;
    
    selectedItems.push(item);
    element.classList.add('selected');

    if (selectedItems.length === 2) {
        checkCombination();
    }
}

function checkCombination() {
    const [i1, i2] = selectedItems;
    
    const match = recipes.find(r => 
        (r.item1 === i1.name && r.item2 === i2.name) || (r.item1 === i2.name && r.item2 === i1.name)
    );

    if (match) {
        const alreadyOpened = discoveredItems.some(i => i.name === match.result);
        if (!alreadyOpened) {
            // Добавляем новый элемент и прописываем ему имя картинки из рецепта
            discoveredItems.push({ name: match.result, img: match.result_img });
            alert(`Успех! Вы создали: ${match.result}`);
        } else {
            alert('Этот элемент вы уже открывали!');
        }
    } else {
        alert('Ничего не произошло...');
    }

    selectedItems = [];
    renderItems();
}
