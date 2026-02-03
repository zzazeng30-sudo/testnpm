/**
 * [Revision Info]
 * Rev: 1.7 (Enhanced Thresholds & Stack Logic)
 * - 클러스터링 거리 수치를 상향 조정하여 더 넓은 범위에서 묶이도록 개선.
 * - 줌 레벨 4 이하에서도 아주 가까운 매물(약 10m 이내)은 'STACK'으로 묶어줌.
 */
import { useMemo } from 'react';

export default function useClustering(pins, zoomLevel, bounds) {
  return useMemo(() => {
    if (!pins || !Array.isArray(pins)) return [];

    // 1. 현재 지도 영역(bounds) 내의 핀만 1차 필터링
    const visiblePins = pins.filter(pin => {
      if (!bounds) return true;
      const lat = parseFloat(pin.lat);
      const lng = parseFloat(pin.lng);
      // 카카오맵 Bounds 객체의 contain 메소드 활용
      return bounds.contain(new window.kakao.maps.LatLng(lat, lng));
    });

    /**
     * 2. 줌 레벨별 거리 임계값(미터) 설정
     * 수치를 기존보다 약 2~2.5배 상향하여 더 잘 묶이도록 조정했습니다.
     */
    const getDistanceThreshold = (level) => {
      if (level <= 4) return 15;    // 상세 레벨: 15m 이내 (건물 스택용)
      if (level === 5) return 120;  // 기존 50m -> 120m
      if (level === 6) return 250;  // 기존 100m -> 250m
      if (level === 7) return 600;  // 기존 250m -> 600m
      if (level === 8) return 1200; // 기존 500m -> 1.2km
      return 2500;                  // 9레벨 이상: 2.5km
    };

    const meterDistance = getDistanceThreshold(zoomLevel);
    // 위도 1도당 약 111,000m 기준 환산
    const latThreshold = meterDistance / 111000;
    const lngThreshold = latThreshold / Math.cos(37 * Math.PI / 180);

    const clusters = [];

    visiblePins.forEach(pin => {
      let addedToCluster = false;
      const pLat = parseFloat(pin.lat);
      const pLng = parseFloat(pin.lng);

      for (const cluster of clusters) {
        const dLat = Math.abs(cluster.lat - pLat);
        const dLng = Math.abs(cluster.lng - pLng);

        // 설정된 거리(격자) 이내에 있으면 기존 클러스터에 합침
        if (dLat < latThreshold && dLng < lngThreshold) {
          cluster.items.push(pin);
          // 묶음의 중심점을 매물들의 평균 좌표로 실시간 보정
          cluster.lat = (cluster.lat * (cluster.items.length - 1) + pLat) / cluster.items.length;
          cluster.lng = (cluster.lng * (cluster.items.length - 1) + pLng) / cluster.items.length;
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        clusters.push({
          type: 'CLUSTER', // 임시 타입
          id: `group-${pin.id}`,
          lat: pLat,
          lng: pLng,
          items: [pin]
        });
      }
    });

    /**
     * 3. 최종 데이터 타입 결정 (SINGLE / STACK / CLUSTER)
     */
    return clusters.map(c => {
      const count = c.items.length;

      // [A] 매물이 1개뿐인 경우 -> 단일 핀
      if (count === 1) {
        return {
          type: 'SINGLE',
          id: c.items[0].id,
          lat: parseFloat(c.items[0].lat),
          lng: parseFloat(c.items[0].lng),
          data: c.items[0],
          items: c.items
        };
      }

      // [B] 매물이 여러 개인데, 지도 확대 상태(LV 4 이하)이거나 
      // 혹은 아주 좁은 범위(스택 기준)에 모여 있는 경우 -> 매물 스택
      if (zoomLevel <= 4 || meterDistance <= 20) {
        return {
          ...c,
          type: 'STACK',
          title: c.items[0].building_name || '동일 위치 매물',
          id: `stack-${c.items[0].id}`
        };
      }

      // [C] 그 외 넓은 지역에서 묶인 경우 -> 지역 클러스터
      return {
        ...c,
        type: 'CLUSTER'
      };
    });

  }, [pins, zoomLevel, bounds]);
}