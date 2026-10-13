(() => {
  const canvas = document.querySelector('#map'), ctx = canvas.getContext('2d');
  const select = document.querySelector('#country'), note = document.querySelector('#note');
  let atlas, background, pixels, overlay, selected, scale = 1, x = 0, y = 0, dragging = null;
  const image = src => new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
  function draw() {
    if (!background) return;
    ctx.fillStyle = '#172731'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(background, 0, 0); if (overlay) ctx.drawImage(overlay, 0, 0);
    for (const tag of selected?.map_tags || []) {
      const country = atlas.countries[tag], p = atlas.provinces[country?.capital];
      if (!p || p.owner !== tag) continue;
      ctx.beginPath(); ctx.arc(...p.center, 4 / scale, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#151c23'; ctx.lineWidth = 1.5 / scale; ctx.stroke();
    }
    ctx.restore();
  }
  function fit(world = false) {
    let bounds = [0, 0, atlas.width, atlas.height];
    const provinces = (selected?.map_tags || []).flatMap(t => atlas.countries[t].province_ids.map(id => atlas.provinces[id]));
    if (!world && provinces.length) bounds = [Math.min(...provinces.map(p => p.bounds[0])), Math.min(...provinces.map(p => p.bounds[1])), Math.max(...provinces.map(p => p.bounds[2])), Math.max(...provinces.map(p => p.bounds[3]))];
    const bw = Math.max(260, bounds[2] - bounds[0] + 100), bh = Math.max(150, bounds[3] - bounds[1] + 100);
    scale = Math.min(canvas.width / bw, canvas.height / bh, 4);
    x = canvas.width / 2 - (bounds[0] + bounds[2]) / 2 * scale;
    y = canvas.height / 2 - (bounds[1] + bounds[3]) / 2 * scale; draw();
  }
  function choose(tag) {
    selected = atlas.entries[tag]; if (!selected) return;
    document.querySelector('#title').textContent = `${selected.name_zh} · ${tag}`;
    note.textContent = selected.note;
    document.querySelector('#details').textContent = selected.map_tags.length ? '显示开局Tag：' + selected.map_tags.join('、') : '暂无可核实位置；显示世界全图，不用形成模板首都猜填。';
    const wanted = new Set(selected.map_tags), mask = ctx.createImageData(atlas.width, atlas.height);
    const owned = new Set(Object.values(atlas.provinces).filter(p => wanted.has(p.owner) && !p.water).map(p => p.id));
    for (let i = 0; i < pixels.length; i += 4) {
      if (owned.has(pixels[i] + pixels[i + 1] * 256)) { mask.data[i] = 255; mask.data[i + 1] = 202; mask.data[i + 2] = 62; mask.data[i + 3] = 195; }
    }
    overlay = document.createElement('canvas'); overlay.width = atlas.width; overlay.height = atlas.height; overlay.getContext('2d').putImageData(mask, 0, 0);
    history.replaceState(null, '', '?tag=' + encodeURIComponent(tag)); fit();
  }
  function resize() { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; if (atlas) fit(); }
  function zoom(factor, cx = canvas.width / 2, cy = canvas.height / 2) {
    const next = Math.max(Math.min(canvas.width / atlas.width, canvas.height / atlas.height) / 2, Math.min(8, scale * factor));
    x = cx - (cx - x) * next / scale; y = cy - (cy - y) * next / scale; scale = next; draw();
  }
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.offsetX, e.offsetY); }, {passive: false});
  canvas.addEventListener('pointerdown', e => { dragging = {clientX: e.clientX, clientY: e.clientY, x, y}; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; x = dragging.x + e.clientX - dragging.clientX; y = dragging.y + e.clientY - dragging.clientY; draw(); });
  canvas.addEventListener('pointerup', e => {
    if (!dragging) return;
    const moved = Math.hypot(e.clientX - dragging.clientX, e.clientY - dragging.clientY); dragging = null;
    if (moved > 4 || !atlas) return;
    const px = Math.floor((e.offsetX - x) / scale), py = Math.floor((e.offsetY - y) / scale);
    if (px < 0 || py < 0 || px >= atlas.width || py >= atlas.height) return;
    const i = (py * atlas.width + px) * 4, p = atlas.provinces[pixels[i] + pixels[i + 1] * 256];
    if (p) document.querySelector('#details').textContent = `${p.name} · 省份${p.id} · ${p.water ? '水域' : (atlas.countries[p.owner]?.name || p.owner || '无开局所有者')}${p.region ? ' · ' + p.region : ''}`;
  });
  select.onchange = () => choose(select.value);
  document.querySelector('#zoomIn').onclick = () => zoom(1.3); document.querySelector('#zoomOut').onclick = () => zoom(1 / 1.3);
  document.querySelector('#fit').onclick = () => fit(); document.querySelector('#world').onclick = () => fit(true);
  window.addEventListener('resize', resize);
  (async () => {
    const response = await fetch('data/map/atlas.json'); if (!response.ok) throw Error('请先运行 anbennar-map/build.py'); atlas = await response.json();
    const [base, ids] = await Promise.all([image('data/map/basemap.png'), image('data/map/province-id.png')]); background = base;
    const reader = document.createElement('canvas'); reader.width = atlas.width; reader.height = atlas.height;
    const r = reader.getContext('2d', {willReadFrequently: true}); r.drawImage(ids, 0, 0); pixels = r.getImageData(0, 0, atlas.width, atlas.height).data;
    Object.values(atlas.entries).sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh')).forEach(e => { const option = document.createElement('option'); option.value = e.tag; option.textContent = `${e.name_zh} · ${e.tag}${e.location_kind === 'unresolved' ? '（待定位）' : ''}`; select.append(option); });
    resize(); const requested = new URLSearchParams(location.search).get('tag'); select.value = atlas.entries[requested] ? requested : (atlas.entries.A21 ? 'A21' : select.options[0].value); choose(select.value);
    window.mapReady = true;
  })().catch(e => { document.querySelector('#error').textContent = '地图加载失败：' + e.message; });
})();
