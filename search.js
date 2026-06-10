// search.js - логика поиска товаров

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.service-card');

    if (!searchInput) {
        console.error('Элемент searchInput не найден!');
        return;
    }

    function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        cards.forEach(card => {
            const title = card.querySelector('.service-title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.service-description')?.textContent.toLowerCase() || '';
            const price = card.querySelector('.service-price')?.textContent.toLowerCase() || '';
            const dataName = card.getAttribute('data-name')?.toLowerCase() || '';
            
            const searchableText = title + ' ' + description + ' ' + price + ' ' + dataName;
            
            if (searchTerm === '') {
                card.classList.remove('hidden');
            } else if (searchableText.includes(searchTerm)) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    searchInput.addEventListener('input', filterProducts);
    
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            filterProducts();
        }
    });
});