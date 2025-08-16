document.addEventListener('DOMContentLoaded', () => {
  // --- карта ---
  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 4,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    zoomControl: true,
    attributionControl: false
  });

  let svgW = 1000, svgH = 1000; // переопределим после парсинга viewBox
  let countryBounds = [[0, 0], [svgH, svgW]];
  let currentLevel = 'country';
  let marker = null;
  let titleMarker = null;
  const labelsLayer = L.layerGroup().addTo(map);

  // чтобы точно работал drag, даже поверх SVG:
  map.dragging.enable();
  map.scrollWheelZoom.enable();
  map.keyboard.enable();
  map.doubleClickZoom.enable();

  // --- утилиты ---
  function getBoundsFromPath(path) {
    const box = path.getBBox();
    // Leaflet Simple CRS: [y, x], ось Y инвертирована относительно SVG (top-left origin).
    const y1 = svgH - (box.y + box.height);
    const y2 = svgH - box.y;
    const x1 = box.x;
    const x2 = box.x + box.width;
    return [[y1, x1], [y2, x2]];
  }

  function centerOfBounds(b) {
    return [ (b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2 ];
  }

  function clearLabels() {
    labelsLayer.clearLayers();
  }

  function addLabel(name, latlng) {
    const icon = L.divIcon({
      className: 'kmap-label',
      html: `<div class="kmap-label__inner">${name}</div>`
    });
    L.marker(latlng, { icon, interactive: false }).addTo(labelsLayer);
  }

  function setTitleMarker(name, latlng) {
    if (titleMarker) map.removeLayer(titleMarker);
    titleMarker = L.marker(latlng, { opacity: 0 })
      .addTo(map)
      .bindTooltip(name, {
        permanent: true,
        direction: 'top',
        offset: [0, -6],
        className: 'kmap-title'
      })
      .openTooltip();
  }

  function formatStats(data) {
    if (!data || typeof data !== 'object') return '<p>Нет данных</p>';
    let html = '';
    for (const industry in data) {
      const v = data[industry] || {};
      html += `<h4 class="font-semibold">${industry}</h4>`;
      html += `<p>Сумма лизинга: ${v.leasing_amount ?? 0} млн сом</p>`;
      html += `<p>Количество техники: ${v.equipment_quantity ?? 0}</p>`;
      html += `<p>Новые рабочие места: ${v.new_jobs ?? 0}</p>`;
    }
    return html || '<p>Нет данных</p>';
  }

  function paintPathBase(path) {
    const isRegion = (path.getAttribute('data-level') === 'region');
    const isBishkek = (path.getAttribute('data-bishkek') === 'true');
    const base = (isRegion && isBishkek) ? '#1e3a8a' : '#022068';
    path.style.fill = base;
    path.dataset.defFill = base;
    path.style.cursor = 'pointer';
    path.style.stroke = '#fff';
    path.style.strokeWidth = '0.5';
    path.style.pointerEvents = 'all';
  }

  function attachPathHandlers(path, overlayRoot) {
    // hover
    path.addEventListener('mouseover', (e) => {
      e.stopImmediatePropagation();
      e.currentTarget.style.fill = '#CA9E67';
    });
    path.addEventListener('mouseout', (e) => {
      e.stopImmediatePropagation();
      const p = e.currentTarget;
      p.style.fill = p.dataset.defFill || '#022068';
    });

    // click
    path.addEventListener('click', (e) => {
      e.stopImmediatePropagation();

      // ВАЖНО: берем атрибуты только с элемента внутри overlay
      const el = e.currentTarget;
      const id = el.getAttribute('id') || '';        // 'region-4170...' или 'district-...'
      const name = el.getAttribute('display_name') || 'Без названия';
      const level = el.getAttribute('data-level') || (id.includes('-') ? id.split('-')[0] : 'unknown');
      const code  = el.getAttribute('code') || (id.includes('-') ? id.split('-')[1] : '');

      console.log(`Клик: level=${level}, code=${code}, name=${name}, id=${id}`);

      // стата (как у тебя было)
      fetch(`${kmapData.ajaxurl}?action=kmap_get_stats&level=${level}&name=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`)
        .then(r => r.json())
        .then(data => {
          document.getElementById('stats-title').textContent = name;
          document.getElementById('stats-content').innerHTML = formatStats(data);

          const b = getBoundsFromPath(el);
          map.fitBounds(b, { padding: [20, 20] });

          const center = centerOfBounds(b);

          if (marker) map.removeLayer(marker);
          marker = L.marker(center).addTo(map);

          // название над маркером
          setTitleMarker(name, center);

          // если это район — подгружаем список айыл аймаков
          if (level === 'district') {
            fetch(`${kmapData.ajaxurl}?action=kmap_get_ayyl_aymaks&district=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`)
              .then(r => r.json())
              .then(ayylList => {
                let html = '<h3 class="font-bold mb-2">Айыл аймактары:</h3><ul>';
                ayylList.forEach(ayyl => {
                  const ds = ayyl.stats ? JSON.stringify(ayyl.stats).replace(/"/g, '&quot;') : '{}';
                  html += `<li class="ayyl-item cursor-pointer hover:bg-blue-800 p-2" data-stats="${ds}">${ayyl.name}</li>`;
                });
                html += '</ul>';
                document.getElementById('ayyl-list').innerHTML = html;

                document.querySelectorAll('.ayyl-item').forEach(item => {
                  item.addEventListener('mouseover', () => {
                    const stats = JSON.parse(item.dataset.stats || '{}');
                    document.getElementById('stats-content').innerHTML = formatStats(stats);
                  });
                  item.addEventListener('mouseout', () => {
                    document.getElementById('stats-content').innerHTML = formatStats(data);
                  });
                });
              })
              .catch(err => {
                console.error('Ошибка загрузки айыл аймаков:', err);
                document.getElementById('ayyl-list').innerHTML = '';
              });
          } else {
            // если кликнули область — чистим список
            document.getElementById('ayyl-list').innerHTML = '';
          }

          // обновим метки (на следующем уровне)
          clearLabels();
          const nextLevel = (level === 'region') ? 'district' : 'district';
          overlayRoot.querySelectorAll(`path[data-level="${nextLevel}"]`).forEach(p => {
            const b2 = getBoundsFromPath(p);
            const c2 = centerOfBounds(b2);
            const nm = p.getAttribute('display_name');
            if (nm) addLabel(nm, c2);
          });
        })
        .catch(err => console.error('Ошибка загрузки статистики:', err));
    });
  }

  // --- загрузка SVG ---
  fetch(kmapData.mapUrl)
    .then(r => r.text())
    .then(svgText => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgEl  = svgDoc.documentElement;

      // viewBox обязательно! иначе центр и инверсия Y поедут
      const vb = (svgEl.getAttribute('viewBox') || '0 0 1000 1000').split(/\s+/).map(Number);
      svgW = vb[2] || 1000;
      svgH = vb[3] || 1000;
      countryBounds = [[0, 0], [svgH, svgW]];

      const overlay = L.svgOverlay(svgEl, countryBounds, {
        interactive: true,
        className: 'kmap-svg'
      }).addTo(map);

      // выставим стартовый вид на всю страну
      map.fitBounds(countryBounds);

      // ВАЖНО: работаем с реальным элементом внутри карты
      const overlayRoot = overlay.getElement();

      // окрасим и повесим ивенты на все пути
      overlayRoot.querySelectorAll('path').forEach(path => {
        paintPathBase(path);
        attachPathHandlers(path, overlayRoot);
      });

      // начальные метки: области
      clearLabels();
      overlayRoot.querySelectorAll('path[data-level="region"]').forEach(p => {
        const b = getBoundsFromPath(p);
        const c = centerOfBounds(b);
        const nm = p.getAttribute('display_name');
        if (nm) addLabel(nm, c);
      });
    })
    .catch(err => console.error('Ошибка загрузки SVG:', err));
});