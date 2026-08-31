module.exports = async (req, res) => {
  const OWM_API_KEY = process.env.OWM_API_KEY || '';
  if (!OWM_API_KEY) {
    return res.status(500).json({ error: '서버에 OWM_API_KEY가 설정되어 있지 않습니다. Vercel 프로젝트 Environment Variables를 확인하세요.' });
  }
  const { z, x, y } = req.query;
  try {
    const url = `https://tile.openweathermap.org/map/clouds_new/${z}/${x}/${y}.png?appid=${OWM_API_KEY}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).send();
  }
};
