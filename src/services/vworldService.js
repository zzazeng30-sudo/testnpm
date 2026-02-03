const VWORLD_KEY = 'B7941404-230D-3C80-AD35-0D7766882694';

export const fetchPnuListInPolygon = async (polygonCoords) => {
  if (!polygonCoords || polygonCoords.length < 3) return [];

  const lngs = polygonCoords.map(c => c.lng);
  const lats = polygonCoords.map(c => c.lat);
  
  // BBOX 설정 (MinX, MinY, MaxX, MaxY)
  const bbox = `${Math.min(...lngs)},${Math.min(...lats)},${Math.max(...lngs)},${Math.max(...lats)}`;

  const params = new URLSearchParams({
    key: VWORLD_KEY,
    service: "WFS",
    version: "1.1.0",
    request: "GetFeature",
    typename: "lp_pa_cbnd_bubun",
    srsname: "EPSG:4326",
    output: "application/json",
    maxFeatures: "100",
    bbox: bbox
  });

  try {
    // [핵심] Mixed Content 방지를 위해 Vercel 상대 경로(/api/proxy) 사용
    const response = await fetch(`/api/proxy/vworld-proxy?${params.toString()}`);
    
    if (!response.ok) throw new Error("VWorld 프록시 응답 실패");

    const data = await response.json();
    
    if (!data.features) return [];

    return data.features
      .map(f => ({
        pnu: f.properties.pnu || f.properties.PNU,
        address: f.properties.addr || f.properties.ADDR || "주소 미표기"
      }))
      .filter(item => item.address.includes("아산")); // 아산시 필터링

  } catch (err) {
    console.error("VWorld API Error:", err);
    return [];
  }
};