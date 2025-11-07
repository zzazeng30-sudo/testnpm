import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// (중요!) react-pdf는 한글이 깨지므로, 'Noto Sans KR' 폰트를 '강제'로 등록해야 합니다.
// (이 작업은 코드가 알아서 해줍니다.)
Font.register({
  family: 'Noto Sans KR',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosanskr/v13/PbykFmztEEMs9E-T-WsVC0s-bM-t_A.ttf', fontWeight: 400 }, // Regular
    { src: 'https://fonts.gstatic.com/s/notosanskr/v13/Pby7FmztEEMs9E-T-WsVC0s-bM-t_Arm.ttf', fontWeight: 700 }, // Bold
  ],
});

// PDF의 '디자인'을 정의합니다. (CSS와 비슷하지만 조금 다릅니다)
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Noto Sans KR', // ★ (중요) 한글 폰트 적용
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 24,
    fontWeight: 700, // (Bold 700)
    color: '#007bff',
    marginBottom: 20,
    borderBottom: '2px solid #007bff',
    paddingBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  image: {
    width: '100%',
    height: 250,
    objectFit: 'cover',
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 16,
    fontWeight: 700, // (Bold 700)
    color: '#333',
    marginBottom: 5,
  },
  text: {
    fontSize: 12,
    color: '#555',
    lineHeight: 1.5,
    fontWeight: 400, // (Regular 400)
  },
  price: {
    fontSize: 20,
    fontWeight: 700, // (Bold 700)
    color: '#dc3545',
    marginTop: 10,
    textAlign: 'right',
  }
});

/* 11일차: '핀' 정보를 받아서 'PDF'를 그리는 '설계도' 컴포넌트 */
export default function IMDocument({ pin }) {
  // 핀이 없으면 빈 PDF를 반환합니다.
  if (!pin) {
    return (
      <Document>
        <Page style={styles.page}>
          <Text style={styles.title}>데이터 오류</Text>
          <Text style={styles.text}>PDF를 생성할 매물(핀) 정보가 없습니다.</Text>
        </Page>
      </Document>
    );
  }

  // 핀이 있으면 'IM 자료'를 그립니다.
  return (
    <Document title="매물 IM 자료">
      <Page size="A4" style={styles.page}>
        
        {/* 1. 헤더 */}
        <Text style={styles.header}>매물 상세 보고서 (IM)</Text>
        
        {/* 2. 대표 이미지 (지금은 '플레이스홀더' 이미지) */}
        <View style={styles.section}>
          <Text style={styles.title}>매물 대표 사진</Text>
          <Image
            style={styles.image}
            // (참고) 'picsum' 이미지는 PDF에서 안정적으로 작동합니다.
            src={`https://picsum.photos/seed/${pin.id}/600/400`}
          />
        </View>

        {/* 3. 메모 (상세 정보) */}
        <View style={styles.section}>
          <Text style={styles.title}>매물 상세 정보</Text>
          <Text style={styles.text}>
            {pin.memo || '입력된 메모가 없습니다.'}
          </Text>
        </View>

        {/* 4. 좌표 정보 */}
        <View style={styles.section}>
          <Text style={styles.title}>위치 정보 (좌표)</Text>
          <Text style={styles.text}>
            - 위도: {pin.lat.toFixed(6)}
          </Text>
          <Text style={styles.text}>
            - 경도: {pin.lng.toFixed(6)}
          </Text>
        </View>

        {/* 5. 가격 */}
        <View style={styles.section}>
          <Text style={styles.price}>
            가격: {pin.price ? `${pin.price.toLocaleString()} 만원` : '가격 미입력'}
          </Text>
        </View>

      </Page>
    </Document>
  );
}