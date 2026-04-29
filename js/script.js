// Adiciona um efeito de entrada suave nos cards ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transition = 'opacity 0.5s ease-in-out';
        
        setTimeout(() => {
            card.style.opacity = '1';
        }, index * 150); // Faz os cards aparecerem um por um
    });
});