module.exports = async (req, res) => {
  const icao = String(req.query.icao || '').toUpperCase().trim();
  if (!icao) return res.status(400).json({ error: 'icao 파라미터가 필요합니다.' });
  try {
    const url = `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(icao)}&format=json`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'METAR 조회 실패', detail: e.message });
  }
};
