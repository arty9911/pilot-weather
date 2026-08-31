function getBaseDateTime() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000); // KST
  let hour = now.getUTCHours();
  let date = now;
  if (now.getUTCMinutes() < 45) {
    date = new Date(now.getTime() - 60 * 60 * 1000);
    hour = date.getUTCHours();
  }
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return {
    base_date: `${yyyy}${mm}${dd}`,
    base_time: `${String(hour).padStart(2, '0')}00`,
  };
}

module.exports = async (req, res) => {
  const KMA_SERVICE_KEY = process.env.KMA_SERVICE_KEY || '';
  if (!KMA_SERVICE_KEY) {
    return res.status(500).json({ error: '서버에 KMA_SERVICE_KEY가 설정되어 있지 않습니다. Vercel 프로젝트 Environment Variables를 확인하세요.' });
  }
  const { nx, ny } = req.query;
  if (!nx || !ny) return res.status(400).json({ error: 'nx, ny 파라미터가 필요합니다.' });

  const { base_date, base_time } = getBaseDateTime();
  const params = new URLSearchParams({
    serviceKey: KMA_SERVICE_KEY,
    pageNo: '1',
    numOfRows: '20',
    dataType: 'JSON',
    base_date,
    base_time,
    nx,
    ny,
  });
  try {
    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${params.toString()}`;
    const r = await fetch(url);
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('기상청 응답 파싱 실패 (서비스키 확인 필요)');
    }
    const items = data?.response?.body?.items?.item;
    if (!items) {
      return res.status(502).json({ error: '기상청 데이터 없음', raw: data?.response?.header });
    }
    const map = {};
    for (const it of items) map[it.category] = it.obsrValue;
    res.status(200).json({
      base_date,
      base_time,
      temp: map.T1H,
      humidity: map.REH,
      windDir: map.VEC,
      windSpeed: map.WSD,
      precipType: map.PTY,
      rain1h: map.RN1,
    });
  } catch (e) {
    res.status(502).json({ error: '기상청 API 조회 실패', detail: e.message });
  }
};
