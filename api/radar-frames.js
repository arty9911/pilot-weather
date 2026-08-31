module.exports = async (req, res) => {
  try {
    const r = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'RainViewer 데이터 조회 실패', detail: e.message });
  }
};
