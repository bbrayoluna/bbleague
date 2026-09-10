// torneos_previos.js
// Lista estática de torneos previos (se puede ampliar para leer desde Sheet)
document.addEventListener('DOMContentLoaded', function() {
    const list = document.getElementById('torneos-list');
    const torneos = [
        { title: 'Torneo Primavera 2026', href: 'torneo_primavera_2026.html' }
    ];
    torneos.forEach(t => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = t.href;
        a.textContent = t.title;
        li.appendChild(a);
        list.appendChild(li);
    });
});
