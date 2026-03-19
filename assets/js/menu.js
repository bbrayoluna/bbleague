document.addEventListener('DOMContentLoaded', function() {
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        fetch('menu.html')
            .then(response => response.text())
            .then(html => {
                menuContainer.innerHTML = html;
                // Ajustar el elemento activo
                const pageMap = {
                    'index.html': 'Principal',
                    'reglas.html': 'Bases',
                    'clasificacion.html': 'Torneo',
                    'pairings.html': 'Emparejamientos',
                    'registro.html': 'Registro',
                    'miembros.html': 'Jugadores'
                };
                const currentPage = window.location.pathname.split('/').pop();
                const activeText = pageMap[currentPage];
                if (activeText) {
                    const activeLink = document.querySelector(`#menu-container a[href="${currentPage}"]`);
                    if (activeLink) {
                        activeLink.outerHTML = `<li class="nuffle yellow menu">${activeText}</li>`;
                    }
                }
            })
            .catch(error => console.error('Error loading menu:', error));
    }
});