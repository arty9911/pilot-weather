// ===================== 공통 =====================
const $ = (id) => document.getElementById(id);

// 서비스 워커 등록 (PWA 홈 화면 설치 지원)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

function tickClock() {
  const now = new Date();
  $('utcClock').textContent = now.toISOString().substring(11, 19) + ' UTC';
}
setInterval(tickClock, 1000);
tickClock();

// 탭 전환
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.remove('hidden');
    if (btn.dataset.tab === 'radar') initRadar();
  });
});

// 자주 쓰는 공항 (확실한 ICAO 코드만 포함, 필요시 직접 입력)
const QUICK_AIRPORTS = [
  { name: '인천', icao: 'RKSI' },
  { name: '김포', icao: 'RKSS' },
  { name: '김해', icao: 'RKPK' },
  { name: '제주', icao: 'RKPC' },
  { name: '청주', icao: 'RKTU' },
];

// 레이더 지도에 표시할 국내 공항 목록 (좌표는 참고용, 정확한 항법정보는 AIP 확인 필요)
const KR_AIRPORTS = [
  { name: '인천', icao: 'RKSI', lat: 37.4602, lon: 126.4407 },
  { name: '김포', icao: 'RKSS', lat: 37.5583, lon: 126.7906 },
  { name: '김해(부산)', icao: 'RKPK', lat: 35.1795, lon: 128.9382 },
  { name: '제주', icao: 'RKPC', lat: 33.5113, lon: 126.4930 },
  { name: '청주', icao: 'RKTU', lat: 36.7166, lon: 127.4992 },
  { name: '대구', icao: 'RKTN', lat: 35.8941, lon: 128.6589 },
  { name: '광주', icao: 'RKJJ', lat: 35.1264, lon: 126.8089 },
  { name: '무안', icao: 'RKJB', lat: 34.9914, lon: 126.3828 },
  { name: '울산', icao: 'RKPU', lat: 35.5934, lon: 129.3517 },
  { name: '여수', icao: 'RKJY', lat: 34.8423, lon: 127.6169 },
  { name: '포항경주', icao: 'RKTH', lat: 35.9878, lon: 129.4203 },
  { name: '사천', icao: 'RKPS', lat: 35.0886, lon: 128.0708 },
  { name: '원주', icao: 'RKNW', lat: 37.4380, lon: 127.9601 },
  { name: '양양', icao: 'RKNY', lat: 37.9613, lon: 128.6690 },
  { name: '군산', icao: 'RKJK', lat: 35.9038, lon: 126.6158 },
  { name: '서울(성남)', icao: 'RKSM', lat: 37.4447, lon: 127.1132 },
  { name: '수원', icao: 'RKSW', lat: 37.2394, lon: 127.0075 },
  { name: '강릉', icao: 'RKNN', lat: 37.7536, lon: 128.9438 },
  { name: '예천', icao: 'RKTY', lat: 36.6319, lon: 128.3550 },
];
const quickWrap = $('quickAirports');
QUICK_AIRPORTS.forEach((a) => {
  const b = document.createElement('button');
  b.textContent = `${a.name} (${a.icao})`;
  b.addEventListener('click', () => {
    $('icaoInput').value = a.icao;
    loadStation(a.icao);
  });
  quickWrap.appendChild(b);
});

// ===================== 바람 나침반 그리기 =====================
function drawCompass(svgEl, dirDeg, speed, gust) {
  svgEl.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  const cx = 60, cy = 60, r = 46;

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', r);
  circle.setAttribute('fill', 'none'); circle.setAttribute('stroke', '#24384D'); circle.setAttribute('stroke-width', '2');
  svgEl.appendChild(circle);

  const n = document.createElementNS(ns, 'text');
  n.setAttribute('x', cx); n.setAttribute('y', cy - r - 4);
  n.setAttribute('fill', '#8FA3B8'); n.setAttribute('font-size', '10'); n.setAttribute('text-anchor', 'middle');
  n.textContent = 'N';
  svgEl.appendChild(n);

  if (dirDeg == null || isNaN(dirDeg)) {
    const vrb = document.createElementNS(ns, 'text');
    vrb.setAttribute('x', cx); vrb.setAttribute('y', cy + 4);
    vrb.setAttribute('fill', '#F2A93B'); vrb.setAttribute('font-size', '12'); vrb.setAttribute('text-anchor', 'middle');
    vrb.textContent = 'VRB';
    svgEl.appendChild(vrb);
    return;
  }

  const rad = (dirDeg - 90) * Math.PI / 180; // 0deg(N)이 위를 향하도록 보정
  const angle = (dirDeg) * Math.PI / 180;
  // 바람이 "불어오는" 방향을 화살표 머리로 표시 (바람의 근원 방향)
  const tipX = cx + r * Math.sin(angle);
  const tipY = cy - r * Math.cos(angle);
  const tailX = cx - (r * 0.5) * Math.sin(angle);
  const tailY = cy + (r * 0.5) * Math.cos(angle);

  const line = document.createElementNS(ns, 'line');
  line.setAttribute('x1', tailX); line.setAttribute('y1', tailY);
  line.setAttribute('x2', tipX); line.setAttribute('y2', tipY);
  line.setAttribute('stroke', gust ? '#E85D5D' : '#F2A93B');
  line.setAttribute('stroke-width', '3');
  line.setAttribute('stroke-linecap', 'round');
  svgEl.appendChild(line);

  // 화살촉
  const headLen = 8;
  const a1 = angle + Math.PI - 0.4;
  const a2 = angle + Math.PI + 0.4;
  const p1x = tipX + headLen * Math.sin(a1);
  const p1y = tipY - headLen * Math.cos(a1);
  const p2x = tipX + headLen * Math.sin(a2);
  const p2y = tipY - headLen * Math.cos(a2);
  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`);
  poly.setAttribute('fill', gust ? '#E85D5D' : '#F2A93B');
  svgEl.appendChild(poly);
}

// ===================== 공항(METAR/TAF) =====================
function fltCatClass(cat) {
  if (!cat) return '';
  return 'fltcat-' + cat;
}

function metersToVisText(visib) {
  // aviationweather.gov visib: 문자열("10+", "6", "1/2") 마일 단위
  if (visib == null) return '-';
  return `${visib} SM`;
}

// "10+", "6", "1/2", "M1/4" 등 다양한 표기를 숫자(SM)로 변환
function parseVisibSM(visib) {
  if (visib == null) return null;
  let s = String(visib).trim();
  s = s.replace('+', '').replace('M', '');
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    if (b) return a / b;
    return null;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function computeFlightCategory(visibSM, ceilingFt) {
  if (ceilingFt == null && visibSM == null) return null;
  const c = ceilingFt == null ? 99999 : ceilingFt;
  const v = visibSM == null ? 99 : visibSM;
  if (c < 500 || v < 1) return 'LIFR';
  if (c < 1000 || v < 3) return 'IFR';
  if (c <= 3000 || v <= 5) return 'MVFR';
  return 'VFR';
}

function getCeiling(clouds) {
  if (!clouds || !clouds.length) return null;
  const covers = ['BKN', 'OVC'];
  const relevant = clouds.filter((c) => covers.includes(c.cover)).map((c) => c.base);
  if (!relevant.length) return null;
  return Math.min(...relevant);
}

let lastWind = { dir: null, speed: null };
let lastStationLatLon = null; // 마지막으로 조회한 공항 좌표 (레이더 지도 중심 이동용)

async function loadStation(icao) {
  $('stationError').classList.add('hidden');
  $('stationResult').classList.add('hidden');
  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch(`/api/metar?icao=${icao}`).then((r) => r.json()),
      fetch(`/api/taf?icao=${icao}`).then((r) => r.json()),
    ]);

    if (!Array.isArray(metarRes) || !metarRes.length) {
      throw new Error('해당 ICAO 코드의 METAR를 찾을 수 없습니다. 코드가 정확한지, 또는 이 공항이 aviationweather.gov에 METAR를 배포하는지 확인이 필요합니다.');
    }
    const m = metarRes[0];

    $('stationName').textContent = `${m.name || icao} (${icao})`;
    $('obsTime').textContent = m.obsTime ? new Date(m.obsTime * 1000).toISOString().replace('T', ' ').substring(0, 16) + 'Z 관측' : '-';
    $('rawMetar').textContent = m.rawOb || '-';

    const visibNum = parseVisibSM(m.visib);
    const ceiling = getCeiling(m.clouds);
    const cat = m.fltCat || computeFlightCategory(visibNum, ceiling);
    const badge = $('fltCatBadge');
    badge.className = 'fltcat-badge ' + fltCatClass(cat);
    badge.textContent = cat || '--';

    lastWind = { dir: m.wdir, speed: m.wspd };
    if (typeof m.lat === 'number' && typeof m.lon === 'number') {
      lastStationLatLon = [m.lat, m.lon];
      if (radarMap) radarMap.setView(lastStationLatLon, radarMap.getZoom());
      if (radarStationMarker) radarStationMarker.setLatLng(lastStationLatLon);
    }
    const windText = m.wdir === 'VRB' || m.wdir == null
      ? `풍향 불규칙 ${m.wspd ?? '-'}kt${m.wgst ? ` (돌풍 ${m.wgst}kt)` : ''}`
      : `${String(m.wdir).padStart(3, '0')}° / ${m.wspd ?? '-'}kt${m.wgst ? ` (돌풍 ${m.wgst}kt)` : ''}`;
    $('windValue').textContent = windText;
    drawCompass($('windRose'), typeof m.wdir === 'number' ? m.wdir : null, m.wspd, m.wgst);

    $('visValue').textContent = metersToVisText(m.visib);

    if (m.clouds && m.clouds.length) {
      $('cloudValue').textContent = m.clouds.map((c) => `${c.cover}${c.base ? ' ' + c.base + 'ft' : ''}`).join(' / ');
    } else {
      $('cloudValue').textContent = 'CLR (구름 없음)';
    }

    $('tempValue').textContent = `${m.temp ?? '-'}°C / ${m.dewp ?? '-'}°C`;
    $('altimValue').textContent = m.altim ? `${m.altim} hPa` : '-';
    $('wxValue').textContent = m.wxString || '특이사항 없음';

    // TAF 렌더링
    renderTaf(tafRes);

    updateCrosswind();
    $('stationResult').classList.remove('hidden');
  } catch (e) {
    $('stationError').textContent = e.message;
    $('stationError').classList.remove('hidden');
  }
}

function renderTaf(tafRes) {
  const body = $('tafBody');
  if (!Array.isArray(tafRes) || !tafRes.length || !tafRes[0].fcsts) {
    body.textContent = '해당 지점의 TAF가 없습니다.';
    return;
  }
  const t = tafRes[0];
  body.innerHTML = '';
  t.fcsts.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'taf-period';
    const from = f.timeFrom ? new Date(f.timeFrom * 1000).toISOString().substring(5, 16).replace('T', ' ') : '-';
    const to = f.timeTo ? new Date(f.timeTo * 1000).toISOString().substring(5, 16).replace('T', ' ') : '-';
    const windTxt = f.wdir != null ? `${String(f.wdir).padStart(3, '0')}°/${f.wspd}kt${f.wgst ? ' G' + f.wgst : ''}` : '-';
    const visTxt = f.visib ? `${f.visib}SM` : '-';
    const cloudTxt = f.clouds && f.clouds.length ? f.clouds.map((c) => `${c.cover}${c.base ? c.base + 'ft' : ''}`).join('/') : '-';
    div.innerHTML = `
      <div class="taf-period-time">${f.fcstChange || 'BASE'} · ${from}Z ~ ${to}Z</div>
      <div>바람 ${windTxt} · 시정 ${visTxt} · 구름 ${cloudTxt}${f.wxString ? ' · ' + f.wxString : ''}</div>
    `;
    body.appendChild(div);
  });
}

// ===================== 크로스윈드 계산 =====================
function drawRunway(svgEl, rwyHeading, windDir, windSpeed) {
  svgEl.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';
  const cx = 100, cy = 100;

  // 활주로 스트립 (heading 방향으로 회전)
  const strip = document.createElementNS(ns, 'rect');
  strip.setAttribute('x', cx - 14); strip.setAttribute('y', cy - 70);
  strip.setAttribute('width', 28); strip.setAttribute('height', 140);
  strip.setAttribute('fill', '#1B2B3D');
  strip.setAttribute('stroke', '#4FD7DA');
  strip.setAttribute('stroke-width', '1.5');
  strip.setAttribute('transform', `rotate(${rwyHeading} ${cx} ${cy})`);
  svgEl.appendChild(strip);

  if (windDir != null && !isNaN(windDir)) {
    const angle = windDir * Math.PI / 180;
    const len = 80;
    const tipX = cx + len * Math.sin(angle);
    const tipY = cy - len * Math.cos(angle);
    const tailX = cx - len * 0.4 * Math.sin(angle);
    const tailY = cy + len * 0.4 * Math.cos(angle);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', tailX); line.setAttribute('y1', tailY);
    line.setAttribute('x2', tipX); line.setAttribute('y2', tipY);
    line.setAttribute('stroke', '#F2A93B');
    line.setAttribute('stroke-width', '2.5');
    svgEl.appendChild(line);
    const headLen = 9;
    const a1 = angle + Math.PI - 0.4, a2 = angle + Math.PI + 0.4;
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', `${tipX},${tipY} ${tipX + headLen * Math.sin(a1)},${tipY - headLen * Math.cos(a1)} ${tipX + headLen * Math.sin(a2)},${tipY - headLen * Math.cos(a2)}`);
    poly.setAttribute('fill', '#F2A93B');
    svgEl.appendChild(poly);
  }
}

function updateCrosswind() {
  const rwyInput = $('rwyHeading').value;
  const result = $('crosswindResult');
  if (rwyInput === '') {
    result.textContent = '활주로 방위를 입력하세요';
    drawRunway($('rwyDiagram'), 0, null, null);
    return;
  }
  const rwyHeading = parseFloat(rwyInput);
  if (lastWind.dir == null || typeof lastWind.dir !== 'number') {
    result.textContent = '풍향이 불규칙(VRB)하거나 없어 계산할 수 없습니다.';
    drawRunway($('rwyDiagram'), rwyHeading, null, null);
    return;
  }
  const angleDiff = (lastWind.dir - rwyHeading) * Math.PI / 180;
  const headwind = lastWind.speed * Math.cos(angleDiff);
  const crosswind = lastWind.speed * Math.sin(angleDiff);
  const side = crosswind > 0 ? '우측(right)' : '좌측(left)';
  const hwLabel = headwind >= 0 ? '정풍(headwind)' : '배풍(tailwind)';

  result.innerHTML = `
    <b>${hwLabel}</b>: ${Math.abs(headwind).toFixed(1)} kt<br>
    <b>측풍(crosswind)</b>: ${Math.abs(crosswind).toFixed(1)} kt (${side})
  `;
  drawRunway($('rwyDiagram'), rwyHeading, lastWind.dir, lastWind.speed);
}

$('rwyHeading').addEventListener('input', updateCrosswind);
$('rawToggleBtn').addEventListener('click', () => $('rawMetar').classList.toggle('hidden'));
$('fetchBtn').addEventListener('click', () => {
  const icao = $('icaoInput').value.trim().toUpperCase();
  if (icao.length === 4) loadStation(icao);
});
$('icaoInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('fetchBtn').click(); });

// ===================== 기상청(임의 지점) =====================
// 위경도 -> 기상청 격자(nx, ny) 변환 (Lambert Conformal Conic)
function latLonToGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0;
  const SLAT1 = 30.0 * Math.PI / 180, SLAT2 = 60.0 * Math.PI / 180;
  const OLON = 126.0 * Math.PI / 180, OLAT = 38.0 * Math.PI / 180;
  const XO = 43, YO = 136;

  const sn = Math.log(Math.cos(SLAT1) / Math.cos(SLAT2)) /
    Math.log(Math.tan(Math.PI * 0.25 + SLAT2 * 0.5) / Math.tan(Math.PI * 0.25 + SLAT1 * 0.5));
  const sf = Math.pow(Math.tan(Math.PI * 0.25 + SLAT1 * 0.5), sn) * Math.cos(SLAT1) / sn;
  const ro = RE / GRID * sf / Math.pow(Math.tan(Math.PI * 0.25 + OLAT * 0.5), sn);

  const ra = RE / GRID * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * Math.PI / 180 * 0.5), sn);
  let theta = lon * Math.PI / 180 - OLON;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;

  const x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

const PTY_MAP = { '0': '없음', '1': '비', '2': '비/눈', '3': '눈', '5': '빗방울', '6': '빗방울눈날림', '7': '눈날림' };

// ===================== 내 위치 (Geolocation) =====================
function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해주세요.'));
        } else {
          reject(new Error('위치를 가져오지 못했습니다: ' + err.message));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

$('myLocationBtn').addEventListener('click', async () => {
  const btn = $('myLocationBtn');
  btn.disabled = true;
  btn.textContent = '위치 확인 중...';
  try {
    const { lat, lon } = await getMyLocation();
    $('latInput').value = lat.toFixed(4);
    $('lonInput').value = lon.toFixed(4);
    $('kmaFetchBtn').click();
  } catch (e) {
    $('fieldError').textContent = e.message;
    $('fieldError').classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = '📍 내 위치로 조회';
  }
});

$('radarMyLocationBtn').addEventListener('click', async () => {
  const btn = $('radarMyLocationBtn');
  btn.disabled = true;
  btn.textContent = '⏳';
  try {
    const { lat, lon } = await getMyLocation();
    if (!radarMap) await initRadar();
    radarMap.setView([lat, lon], 9);
    if (radarMyMarker) radarMap.removeLayer(radarMyMarker);
    radarMyMarker = L.circleMarker([lat, lon], {
      radius: 7, color: '#4FD7DA', fillColor: '#4FD7DA', fillOpacity: 1,
    }).addTo(radarMap).bindPopup('내 위치').openPopup();

    await showMyLocationWeather(lat, lon);
  } catch (e) {
    alert(e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📍';
  }
});

async function showMyLocationWeather(lat, lon) {
  const row = $('myLocationWeatherRow');
  const text = $('myLocationWeatherText');
  text.textContent = '내 위치 날씨 불러오는 중...';
  row.classList.remove('hidden');
  try {
    const { nx, ny } = latLonToGrid(lat, lon);
    const res = await fetch(`/api/kma?nx=${nx}&ny=${ny}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const precip = PTY_MAP[data.precipType] ?? '-';
    text.textContent = `내 위치 · ${data.temp ?? '-'}°C · 바람 ${data.windDir ?? '-'}°/${data.windSpeed ?? '-'}m/s · ${precip}`;
  } catch (e) {
    text.textContent = '내 위치 날씨를 불러오지 못했습니다 (기상청 API 키 확인 필요)';
  }
}

$('kmaFetchBtn').addEventListener('click', async () => {
  $('fieldError').classList.add('hidden');
  $('fieldResult').classList.add('hidden');
  const lat = parseFloat($('latInput').value);
  const lon = parseFloat($('lonInput').value);
  if (isNaN(lat) || isNaN(lon)) {
    $('fieldError').textContent = '위도/경도를 올바르게 입력하세요.';
    $('fieldError').classList.remove('hidden');
    return;
  }
  const { nx, ny } = latLonToGrid(lat, lon);
  try {
    const r = await fetch(`/api/kma?nx=${nx}&ny=${ny}`);
    const data = await r.json();
    if (data.error) throw new Error(data.error);

    $('fieldWind').textContent = `${data.windDir ?? '-'}° / ${data.windSpeed ?? '-'} m/s`;
    drawCompass($('windRose2'), data.windDir != null ? parseFloat(data.windDir) : null, parseFloat(data.windSpeed));
    $('fieldTemp').textContent = `${data.temp ?? '-'}°C / 습도 ${data.humidity ?? '-'}%`;
    $('fieldPrecip').textContent = PTY_MAP[data.precipType] ?? '-';
    $('fieldTime').textContent = `${data.base_date} ${data.base_time} 발표`;

    $('fieldResult').classList.remove('hidden');
  } catch (e) {
    $('fieldError').textContent = e.message;
    $('fieldError').classList.remove('hidden');
  }
});

// ===================== 레이더 (강수: RainViewer / 구름: OpenWeatherMap) =====================
// 참고: RainViewer는 2026년 1월부터 무료 API에서 위성(구름) 레이어 제공을 중단했습니다.
// 색상 스킴도 "Universal Blue" 한 가지만 제공됩니다.
// "구름" 레이어는 OpenWeatherMap의 전운량(%) 타일로 대체했습니다 (고도 구분 없음, 실시간 단일 이미지 - 애니메이션 없음).
let radarMap = null;
let radarStationMarker = null;
let radarLayer = null;
let radarMyMarker = null;
let precipFrames = [];
let radarMode = 'precip'; // 'precip' | 'cloud'
let radarPlaying = false;
let radarTimer = null;

// Universal Blue 스킴 기준 강수강도 범례 (mm/h)
const PRECIP_LEGEND = [
  { v: '0.2', c: '#7DE6F0' },
  { v: '0.3', c: '#1C3FE0' },
  { v: '0.6', c: '#5FE84A' },
  { v: '1.3', c: '#2F7A1E' },
  { v: '3', c: '#F5E635' },
  { v: '6', c: '#F2941F' },
  { v: '12', c: '#D8341F' },
  { v: '24', c: '#8C1414' },
  { v: '50', c: '#E040E0' },
  { v: '100', c: '#9B2D9E' },
  { v: '205+', c: '#5B1560' },
];

function renderPrecipLegend() {
  const el = $('precipLegend');
  el.innerHTML = PRECIP_LEGEND.map(
    (s) => `<div class="legend-swatch" style="background:${s.c}">${s.v}</div>`
  ).join('');
}

function tileUrlFor(frame) {
  return `${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
}

async function initRadar() {
  if (radarMap) {
    radarMap.invalidateSize();
    return;
  }
  renderPrecipLegend();

  const center = lastStationLatLon || [36.5, 127.8]; // 기본: 대한민국 중심
  radarMap = L.map('radarMap', { zoomControl: false, maxZoom: 14 }).setView(center, lastStationLatLon ? 8 : 7);
  L.control.zoom({ position: 'bottomleft' }).addTo(radarMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 14,
  }).addTo(radarMap);

  radarStationMarker = L.circleMarker(center, {
    radius: 6, color: '#F2A93B', fillColor: '#F2A93B', fillOpacity: 1,
  }).addTo(radarMap);

  addAirportMarkers();
  await loadPrecipFrames();

  $('layerPrecipBtn').addEventListener('click', () => switchRadarMode('precip'));
  $('layerCloudBtn').addEventListener('click', () => switchRadarMode('cloud'));
}

async function loadPrecipFrames() {
  try {
    // CORS 이슈를 피하기 위해 서버 프록시를 통해 조회
    const res = await fetch('/api/radar-frames');
    const data = await res.json();
    const host = data.host || '';
    precipFrames = ((data.radar && data.radar.past) || []).map((f) => ({ ...f, host }));

    const slider = $('radarSlider');
    slider.max = String(Math.max(precipFrames.length - 1, 0));
    slider.value = String(precipFrames.length - 1);
    if (precipFrames.length) showRadarFrame(precipFrames.length - 1);
    else $('radarTime').textContent = '데이터 없음';

    slider.addEventListener('input', () => showRadarFrame(parseInt(slider.value, 10)));
  } catch (e) {
    $('radarTime').textContent = '레이더 데이터를 불러오지 못했습니다.';
  }
}

function switchRadarMode(mode) {
  if (radarMode === mode) return;
  radarMode = mode;
  $('layerPrecipBtn').classList.toggle('active', mode === 'precip');
  $('layerCloudBtn').classList.toggle('active', mode === 'cloud');

  const isPrecip = mode === 'precip';
  $('precipLegend').classList.toggle('hidden', !isPrecip);
  $('radarOverlayBottom').classList.toggle('hidden', !isPrecip);

  if (radarPlaying) {
    radarPlaying = false;
    clearInterval(radarTimer);
    $('radarPlayBtn').textContent = '▶';
  }

  if (radarLayer) radarMap.removeLayer(radarLayer);

  if (isPrecip) {
    const idx = precipFrames.length - 1;
    if (idx >= 0) showRadarFrame(idx);
  } else {
    radarLayer = L.tileLayer('/api/cloud-tile/{z}/{x}/{y}', {
      opacity: 0.6,
      maxZoom: 14,
    }).addTo(radarMap);
  }
}



function addAirportMarkers() {
  const icon = L.divIcon({
    className: 'airport-icon',
    html: '✈',
    iconSize: [20, 20],
  });
  KR_AIRPORTS.forEach((a) => {
    const marker = L.marker([a.lat, a.lon], { icon }).addTo(radarMap);
    marker.bindPopup(`<b>${a.name} (${a.icao})</b><br><span class="popup-loading">실시간 정보 불러오는 중...</span>`);
    marker.on('click', () => loadAirportPopup(marker, a));
  });
}

async function loadAirportPopup(marker, airport) {
  try {
    const [metarArr, tafArr] = await Promise.all([
      fetch(`/api/metar?icao=${airport.icao}`).then((r) => r.json()),
      fetch(`/api/taf?icao=${airport.icao}`).then((r) => r.json()).catch(() => null),
    ]);
    if (!Array.isArray(metarArr) || !metarArr.length) {
      marker.setPopupContent(`
        <b>${airport.name} (${airport.icao})</b><br>
        METAR 없음<br>
        <span style="font-size:11px;color:#888">이 공항은 aviationweather.gov에 METAR를 배포하지 않을 수 있습니다.</span>
      `);
      marker.getPopup().update();
      return;
    }
    const m = metarArr[0];
    const visibNum = parseVisibSM(m.visib);
    const ceiling = getCeiling(m.clouds);
    const cat = m.fltCat || computeFlightCategory(visibNum, ceiling);
    const windTxt = m.wdir === 'VRB' || m.wdir == null
      ? `VRB/${m.wspd ?? '-'}kt`
      : `${String(m.wdir).padStart(3, '0')}°/${m.wspd ?? '-'}kt`;

    let tafLine = 'TAF 없음';
    if (Array.isArray(tafArr) && tafArr.length && tafArr[0].fcsts && tafArr[0].fcsts.length) {
      const f0 = tafArr[0].fcsts[0];
      const tw = f0.wdir != null ? `${String(f0.wdir).padStart(3, '0')}°/${f0.wspd}kt` : '-';
      tafLine = `TAF 기준풍 ${tw} · 시정 ${f0.visib ?? '-'}SM`;
    }

    marker.setPopupContent(`
      <b>${airport.name} (${airport.icao})</b>
      <div class="popup-badge ${fltCatClass(cat)}">${cat || '--'}</div>
      <div>METAR 바람 ${windTxt} · 시정 ${m.visib ?? '-'}SM</div>
      <div>${tafLine}</div>
      <button class="popup-jump-btn" onclick="window.jumpToStation('${airport.icao}')">공항 탭에서 상세보기</button>
    `);
    marker.getPopup().update();
  } catch (e) {
    marker.setPopupContent(`<b>${airport.name} (${airport.icao})</b><br>조회 실패 (네트워크 오류)`);
    marker.getPopup().update();
  }
}

window.jumpToStation = function (icao) {
  document.querySelector('.tab[data-tab="station"]').click();
  $('icaoInput').value = icao;
  loadStation(icao);
};

function showRadarFrame(idx) {
  const frame = precipFrames[idx];
  if (!frame) return;
  if (radarLayer) radarMap.removeLayer(radarLayer);
  radarLayer = L.tileLayer(tileUrlFor(frame), {
    opacity: 0.75,
    maxZoom: 14,
    maxNativeZoom: 7, // RainViewer 타일은 줌 7까지만 제공 - 그 이상은 확대 렌더링
  }).addTo(radarMap);
  $('radarSlider').value = String(idx);
  $('radarTime').textContent = new Date(frame.time * 1000).toLocaleString('ko-KR', {
    hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit',
  });
}

$('radarPlayBtn').addEventListener('click', () => {
  radarPlaying = !radarPlaying;
  $('radarPlayBtn').textContent = radarPlaying ? '⏸' : '▶';
  if (radarPlaying) {
    radarTimer = setInterval(() => {
      const slider = $('radarSlider');
      let next = parseInt(slider.value, 10) + 1;
      if (next > precipFrames.length - 1) next = 0;
      showRadarFrame(next);
    }, 700);
  } else {
    clearInterval(radarTimer);
  }
});

// 페이지 로드 시 레이더 탭이 기본으로 보이므로 바로 초기화
initRadar();
