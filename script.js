// Плавная прокрутка для меню
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        document.querySelector(targetId).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Обработка формы
document.getElementById('consult-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Спасибо! Мы свяжемся с вами в ближайшее время.');
    this.reset();
});