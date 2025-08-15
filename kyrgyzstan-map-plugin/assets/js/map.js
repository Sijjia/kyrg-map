document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: 0,
        maxZoom: 2,
        zoom: 0,
        zoomControl: true
    }).setView([500, 500], 0);

    let currentLevel = 'country';
    let currentBounds = [[0, 0], [1000, 1000]];
    let marker = null;

    // Load SVG map
    fetch(kmapData.mapUrl)
        .then(response => response.text())
        .then(svg => {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;

            // Проверяем viewBox
            const viewBox = svgElement.getAttribute('viewBox') || '0 0 1000 1000';
            const [, , svgWidth, svgHeight] = viewBox.split(' ').map(Number);
            console.log(`SVG viewBox: width=${svgWidth}, height=${svgHeight}`);

            L.svgOverlay(svgElement, currentBounds, {
                interactive: true,
                className: 'kmap-svg'
            }).addTo(map);

            console.log('Карта загружена, проверяю пути...');

            // Initialize with region labels
            updateLabels('region');

            // Handle click events
            svgElement.querySelectorAll('path').forEach(path => {
                const id = path.getAttribute('id') || '';
                console.log(`Найден путь: id=${id}, display_name=${path.getAttribute('display_name')}`);

                path.addEventListener('click', e => {
                    e.stopPropagation();  // Фикс для ai.js

                    const [level, code] = id.includes('-') ? id.split('-') : ['unknown', ''];
                    const name = path.getAttribute('display_name') || 'Без названия';

                    console.log(`Клик на: level=${level}, code=${code}, name=${name}, id=${id}`);

                    // Fetch stats
                    fetch(`${kmapData.ajaxurl}?action=kmap_get_stats&level=${level}&name=${name}&code=${code}`)
                        .then(response => response.json())
                        .then(data => {
                            document.getElementById('stats-title').textContent = name;
                            document.getElementById('stats-content').innerHTML = formatStats(data);

                            console.log('Статистика получена:', data);

                            // Zoom to selected area
                            const bounds = getBounds(path, svgHeight);
                            map.fitBounds(bounds);
                            currentLevel = level;
                            currentBounds = bounds;

                            // Add marker
                            if (marker) map.removeLayer(marker);
                            const center = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
                            marker = L.marker(center).addTo(map);
                            console.log('Маркер добавлен в центр:', center);

                            // If district level, fetch and show ayyl aymaks list
                            if (level === 'district') {
                                fetch(`${kmapData.ajaxurl}?action=kmap_get_ayyl_aymaks&district=${name}`)
                                    .then(response => response.json())
                                    .then(ayylList => {
                                        let html = '<h3 class="font-bold mb-2">Айылные аймаки:</h3><ul>';
                                        ayylList.forEach(ayyl => {
                                            html += `<li class="ayyl-item cursor-pointer hover:bg-blue-800 p-2" data-stats='${JSON.stringify(ayyl.stats)}'>${ayyl.name}</li>`;
                                        });
                                        html += '</ul>';
                                        document.getElementById('ayyl-list').innerHTML = html;

                                        console.log('Список айылных аймаков:', ayylList);

                                        // Hover on ayyl item
                                        document.querySelectorAll('.ayyl-item').forEach(item => {
                                            item.addEventListener('mouseover', () => {
                                                const stats = JSON.parse(item.dataset.stats);
                                                document.getElementById('stats-content').innerHTML = formatStats(stats);
                                                console.log('Наведение на айылный аймак, статистика:', stats);
                                            });
                                            item.addEventListener('mouseout', () => {
                                                document.getElementById('stats-content').innerHTML = formatStats(data);
                                                console.log('Уход мыши, возвращаю статистику района');
                                            });
                                        });
                                    }).catch(error => console.error('Ошибка загрузки айылных аймаков:', error));
                            } else {
                                document.getElementById('ayyl-list').innerHTML = '';
                            }
                        }).catch(error => console.error('Ошибка загрузки статистики:', error));
                });

                path.addEventListener('mouseover', e => {
                    e.stopPropagation();
                    e.target.style.fill = '#CA9E67';
                });
                path.addEventListener('mouseout', e => {
                    e.stopPropagation();
                    e.target.style.fill = e.target.getAttribute('data_bishkek') ? '#1e3a8a' : '#022068';
                });
            });
        }).catch(error => console.error('Ошибка загрузки SVG:', error));

    function getBounds(path, svgHeight) {
        const bbox = path.getBBox();
        svgHeight = svgHeight || 800; // Используем высоту из viewBox
        return [[svgHeight - (bbox.y + bbox.height), bbox.x], [svgHeight - bbox.y, bbox.x + bbox.width]];
    }

    function getNextLevel(currentLevel) {
        const levels = ['region', 'district'];
        const index = levels.indexOf(currentLevel);
        return index < levels.length - 1 ? levels[index + 1] : 'district';
    }

    function updateLabels(level) {
        document.querySelectorAll('.kmap-label').forEach(label => label.remove());
        document.querySelectorAll(`path[id^="${level}-"]`).forEach(path => {
            const bounds = getBounds(path);
            const center = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
            const name = path.getAttribute('display_name');
            if (name) {
                L.divIcon({ className: 'kmap-label', html: name }).addTo(map).setLatLng(center);
                console.log('Добавлена метка:', name, 'на уровне', level, 'центр:', center);
            } else {
                console.warn('Нет display_name для пути:', path.id);
            }
        });
    }

    function formatStats(data) {
        let html = '';
        for (const industry in data) {
            html += `<h4 class="font-semibold">${industry}</h4>`;
            html += `<p>Сумма лизинга: ${data[industry].leasing_amount} млн сом</p>`;
            html += `<p>Количество техники: ${data[industry].equipment_quantity}</p>`;
            html += `<p>Новые рабочие места: ${data[industry].new_jobs}</p>`;
        }
        return html || '<p>Нет данных</p>';
    }
});