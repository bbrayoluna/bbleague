import { fetchSheet } from './main.js';
import * as constants from './constants.js';

document.addEventListener('DOMContentLoaded', async function() {
    const menuContainer = document.getElementById('menu-container');
    if (menuContainer) {
        try {
            const json = await fetchSheet(constants.CONFIG_MENU);
            const rows = json.table.rows;
            let menuHtml = '<ul>';
            const currentPath = window.location.pathname.split('/').pop();
            rows.forEach(row => {
                const texto = row.c[0].v; // Primera columna: texto
                const path = row.c[1].v; // Segunda columna: path
                if (path === currentPath) {
                    menuHtml += `<li class="nuffle yellow menu">${texto}</li>`;
                } else {
                    menuHtml += `<li><a href="${path}" class="nuffle yellow menu">${texto}</a></li>`;
                }
            });
            menuHtml += '</ul>';
            menuContainer.innerHTML = menuHtml;
        } catch (error) {
            console.error('Error loading menu:', error);
        }
    }
});