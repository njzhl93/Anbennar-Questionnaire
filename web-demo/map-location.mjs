/** Optional P1+ encyclopedia map view; do NOT display unlicensed local assets.
 *
 * Copy to web-demo/v22-preview/map-location.mjs and integrate in
 * encyclopedia.mjs after country hero and before historical narrative.
 * The source manifest may be absent in the public site; never substitute
 * the old full-world map, and never treat missing CACHE as missing COUNTRY.
 */
export const MAP_DATE = '1444-11-11';
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[c]));
const words = language => language === 'en' ? {
  unsupported:'Unsupported map manifest version', start:'Starting position in 1444',
  predecessor:'1444 position of the forming predecessor', missing:'Map manifest is unavailable or stale; this does not prove that the country has no location.',
  cache:'Map cache update required', cacheReason:'Run the local map builder first; this does not prove that the country has no starting position.',
  unresolved:'Starting position requires verification: ', unresolvedReason:'No verifiable static map record is available',
  notExported:'The regional map has not been exported or still requires local verification.',
  notPublished:'A full-region map exists locally, but the derived Mod asset is not approved for publication on this site.',
  normalNote:'The main image shows the complete game geographic scope; gold marks non-water provinces actually held on 11 November 1444.',
  predecessorNote:tags=>`Only the verified landholding predecessor ${tags||'awaiting verification'} is shown. This is not the formable country's own starting territory or future borders.`,
  legend:'The white capital dot marks the centre of the capital province, not an exact city location. Pale-blue leader lines and rings only locate small countries; they do not represent additional territory.',
  predecessorShown:'showing predecessor ', view:'View full-resolution image', panel:'Panel', scope:'full region, not future borders',
  open:'Click to enlarge or open in a new tab.', source:'Source: local Mod static history map; no start-up events were run. Redistribution remains subject to the site asset-approval boundary.',
  localeGap:'The English map asset is missing; the Chinese image is not substituted.', viewer:'Full-resolution map',
  zoomIn:'Zoom in',zoomOut:'Zoom out',fit:'Fit screen',native:'Native size',close:'Close',
  viewerHelp:'Zoom and scroll horizontally or vertically. Gold is held land; the white dot is the capital-province centre.'
} : null;
const scopeName = (image, language) => language === 'en'
  ? String(image.geographic_scope_zh||image.geographic_scope_id||'').split(' · ')[0]
  : image.geographic_scope_zh;

/** For an unbundled repo server, manifest is hosted at repository root.
 * For ChatGPT Site, copy the manifest to the build assets and pass its URL.
 */
export async function readMapManifest(url='../../anbennar-map/region-manifest.json') {
  try {
    const res = await fetch(url, {cache:'no-cache'});
    if (!res.ok) throw Error(`HTTP ${res.status}`);
    const data=await res.json();
    if (data.schema_version !== 2 || data.date !== MAP_DATE ||
        typeof data.entries !== 'object' || !data.source_fingerprint) {
      throw Error('地图清单版本不受支持');
    }
    const pairUrl=new URL('dedicated-predecessors.json',new URL(url,location.href));
    const pairResponse=await fetch(pairUrl,{cache:'no-cache'});
    if(pairResponse.ok){
      const pairs=await pairResponse.json();
      if(pairs.schema_version===1 && pairs.pairs) data._dedicated_pairs=pairs.pairs;
    }
    return {data, error:null};
  } catch (error) { return {data:null, error:String(error.message||error)}; }
}

/**
 * options.assetsApprovedAndHosted must be TRUE only after explicit rights
 * review AND confirmation that the images are actually hosted.
 * options.assetPrefix = '../../' from web-demo/v22-preview/ in an unbundled repo.
 * A deployed Site often requires a different static-asset path.
 */
export function mapSection(tag, manifest, options={}) {
  const language=options.language === 'en' ? 'en' : 'zh-CN';
  const en=words(language);
  const record = manifest?.entries?.[tag];
  const pair=manifest?._dedicated_pairs?.[tag];
  const documented=(options.identity?.predecessors||[]).some(p=>
    typeof p==='object'? p?.tag===record?.unique_predecessor_tag :
    typeof p==='string' && p.match(/(?<![A-Z0-9])[A-Z][A-Z0-9]{2}(?![A-Z0-9])/g)?.includes(record?.unique_predecessor_tag));
  // Empty render is deliberate for formables without one audited exclusive
  // starting predecessor. Even a stale old manifest with two displayed
  // precursors must never show those maps on a production site.
  const skipped = record && (record.status === 'not_applicable_no_unique_predecessor' ||
    (record.location_kind === 'predecessor' &&
      (record.map_tags?.length !== 1 || record.map_tags?.[0] !== record.unique_predecessor_tag ||
       !documented || pair?.tag!==record.unique_predecessor_tag || !pair?.evidence ||
       record.predecessor_evidence!==pair.evidence)));
  if (skipped) return '';
  const local=options.localPreview === true && typeof location !== 'undefined' &&
    ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const approved=options.assetsApprovedAndHosted === true || local;
  const prefix=options.assetPrefix ?? '../../';
  if (!record) return `<section class="panel map-location"><h2>${en?.start||'1444年开局位置'}</h2><p>${en?.missing||'地图清单尚未接入或未重新生成，不能据此判断该国没有位置。'}</p></section>`;
  // Other unresolved, proven starting countries may show a text-only gap.
  const predecessor=record.location_kind==='predecessor';
  const title=predecessor ? (en?.predecessor||'形成前身的1444位置') : (en?.start||'1444年开局位置');
  const note=predecessor
    ? (en?.predecessorNote(record.map_tags?.join(', '))||`仅显示确认实际持地的前身 ${record.map_tags?.join('、')||'待核实'}。这不是形成国自身的开局领土或未来疆域。`)
    : (en?.normalNote||'主图显示完整游戏地理大区；金色表示1444年11月11日实际持有的非水域省份。');
  const displayName=language==='en' ? (options.identity?.name_en||`[English name unavailable: ${tag}]`) : record.name_zh;
  const legend=en?.legend||'首都白点表示首都省份中心，并非精确城市坐标。浅蓝引线和圆环仅用于定位小国，不表示额外领土。';
  const intro=`<h2>${safe(title)}</h2><p class="map-identity"><strong>${safe(displayName)} (${safe(tag)})</strong> · ${MAP_DATE}</p><p class="map-legend">${safe(note)} ${safe(legend)}</p>`;
  if(record.status==='cache_update_required') {
    return `<section class="panel map-location"><h2>${en?.cache||'地图缓存需更新'}</h2><p>${safe(en?.cacheReason||record.reason||'请先运行本地地图构建器；不能据此判断国家没有开局位置。')}</p></section>`;
  }
  if(record.status==='unresolved' || record.status==='review_required') {
    return `<section class="panel map-location">${intro}<p>${en?.unresolved||'开局位置待核实：'}${safe(en?.unresolvedReason||record.reason||'缺少可核验的静态地图记录')}</p></section>`;
  }
  if (record.status!=='generated' || !record.images?.length) {
    return `<section class="panel map-location">${intro}<p>${en?.notExported||'区域图尚未导出或仍需本地校验。'}</p></section>`;
  }
  if (!approved) {
    return `<section class="panel map-location">${intro}<p>${en?.notPublished||'完整大区地图已在本地生成，但该站点尚未获授权发布相关 Mod 派生地图资源。'}</p></section>`;
  }
  let figures='';
  for(const [i, image] of record.images.entries()){
    const path=String(image.locale_paths?.[language]||(language==='zh-CN'?image.path:''));
    if(!path && language==='en'){
      figures+=`<p class="notice translation-gap">${safe(en.localeGap)}</p>`;
      continue;
    }
    if (!/^安本纳尔\/国家百科\/assets\/maps\/(?:en\/)?[A-Z0-9]{3}-1444(?:-\d{2})?\.png$/.test(path))
      throw Error(`Unsafe or invalid regional-map file for ${tag}`);
    const relative=path.split('/').map(encodeURIComponent).join('/');
    const url=prefix+relative;
    const scope=scopeName(image,language);
    const heading=language==='en'
      ? `${scope} · ${displayName} (${tag})${predecessor?' · '+en.predecessorShown+image.map_tag:''} · ${MAP_DATE}`
      : `${scope} · ${displayName} (${tag})${predecessor?' · 显示前身 '+image.map_tag:''} · ${MAP_DATE}`;
    const aria=language==='en'?`${en.view}: ${displayName}, ${scope}`:`查看 ${displayName} ${scope} 高清原图`;
    const alt=language==='en'?`${displayName} (${tag}) full-region starting-position map: ${scope}; displayed Tag ${image.map_tag}; panel ${i+1}`:`${displayName} (${tag}) 的完整大区开局位置图：${scope}，显示 ${image.map_tag}，分图${i+1}`;
    const caption=language==='en'
      ? `${en.panel} ${i+1}/${record.images.length}; ${en.scope}. <a class="map-fullsize" href="${safe(url)}" target="_blank" rel="noopener">${en.view} ↗</a> (${en.open})`
      : `分图 ${i+1}/${record.images.length}，完整大区而非未来疆域。<a class="map-fullsize" href="${safe(url)}" target="_blank" rel="noopener">查看高清原图 ↗</a>（点击放大查看；也可在新标签页打开）`;
    figures+=`<figure><h3 class="map-panel-heading">${safe(heading)}</h3><a class="map-fullsize" href="${safe(url)}" target="_blank" rel="noopener" aria-label="${safe(aria)}"><img loading="lazy" decoding="async" src="${safe(url)}" width="1920" height="1080" alt="${safe(alt)}" /></a><figcaption>${caption}</figcaption></figure>`;
  }
  return `<section class="panel map-location">${intro}<div class="map-region-images">${figures}</div><p class="fine">${en?.source||'来源：本地 Mod 静态历史地图，未执行开局事件；地图再分发范围以站点资源授权为准。'}</p></section>`;
}

/** Delegation survives country navigation; plain PNG links remain the fallback. */
export function installMapViewer(container, options={}) {
  const en=words(options.language==='en'?'en':'zh-CN');
  container.addEventListener('click', event => {
    const link=event.target.closest('.map-fullsize');
    if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    event.preventDefault();
    const dialog=document.createElement('dialog');
    dialog.className='map-viewer';
    dialog.setAttribute('aria-label',en?.viewer||'高清地图查看');
    dialog.innerHTML='<div class="map-viewer-tools"><strong>'+(en?.viewer||'高清地图')+'</strong>'+
      '<button type="button" data-zoom="in">'+(en?.zoomIn||'放大')+'</button><button type="button" data-zoom="out">'+(en?.zoomOut||'缩小')+'</button>'+
      '<button type="button" data-zoom="fit">'+(en?.fit||'适应屏幕')+'</button><button type="button" data-zoom="native">'+(en?.native||'原始大小')+'</button>'+
      '<button type="button" data-close>'+(en?.close||'关闭')+'</button></div>'+
      '<p>'+(en?.viewerHelp||'可放大后在图内横向、纵向滑动。金色为实际持地，白点为首都省份中心。')+'</p>'+
      '<div class="map-viewer-frame"><img alt="'+(en?.viewer||'高清完整大区地图')+'"></div>';
    const img=dialog.querySelector('img'),frame=dialog.querySelector('.map-viewer-frame');
    const native=dialog.querySelector('[data-zoom="native"]');
    native.disabled=true;
    img.addEventListener('load',()=>{native.disabled=false;},{once:true});
    img.src=link.href;
    let zoom=1;
    dialog.addEventListener('click', e=>{
      if(e.target.closest('[data-close]')){dialog.close();return;}
      const action=e.target.closest('[data-zoom]')?.dataset.zoom;
      if(!action)return;
      if(action==='fit')zoom=1;
      if(action==='native')zoom=img.naturalWidth/frame.clientWidth;
      if(action==='in')zoom=Math.min(8,zoom*1.5);
      if(action==='out')zoom=Math.max(1,zoom/1.5);
      img.style.width=zoom===1?'100%':Math.round(frame.clientWidth*zoom)+'px';
    });
    dialog.addEventListener('close',()=>{dialog.remove();link.focus();},{once:true});
    document.body.append(dialog);
    dialog.showModal();
  });
}

// Add to web-demo/v22-preview/style.css:
export const MAP_CSS = `
.map-location .map-region-images {display:grid;grid-template-columns:1fr;gap:15px}
.map-location figure {margin:0;max-width:100%;min-width:0}
.map-location img {display:block;width:100%;max-width:960px;height:auto;aspect-ratio:16 / 9;object-fit:contain;border:1px solid #51666b;border-radius:10px}
.map-location figcaption {font-size:1rem;color:#a9bdbb;margin:8px 0 0;overflow-wrap:anywhere}
.map-location .map-panel-heading {font-size:1rem;line-height:1.5;overflow-wrap:anywhere;margin:10px 0}
.map-location .map-legend,.map-location .map-identity {font-size:1rem;line-height:1.65}
.map-location .map-fullsize {display:block;max-width:100%;overflow-wrap:anywhere}
.map-viewer {box-sizing:border-box;width:calc(100% - 24px);max-width:1200px;max-height:calc(100dvh - 24px);padding:12px;background:#14262e;color:#ecf2ef;border:1px solid #647e87;border-radius:12px}
.map-viewer::backdrop {background:#000b}
.map-viewer-tools {display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.map-viewer-tools button {padding:8px 10px;min-height:44px}
.map-viewer p {font-size:1rem;line-height:1.5}
.map-viewer-frame {max-width:100%;height:min(65dvh,700px);overflow:auto;touch-action:pan-x pan-y pinch-zoom}
.map-viewer-frame img {display:block;width:100%;max-width:none;height:auto}
`;
