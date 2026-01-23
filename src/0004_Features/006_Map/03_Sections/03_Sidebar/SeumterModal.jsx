import React, { useState } from 'react';

const SeumterModal = ({ isOpen, onClose, data }) => {
  // 기본 선택을 전유부로 유지하거나 원하시는 경우 변경 가능합니다.
  const [activeTab, setActiveTab] = useState('exclusive'); 

  if (!isOpen || !data) return null;

  // 서버 응답에서 normalList를 추가로 추출합니다.
  const { counts, units, generalList, titleList, normalList } = data;

  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 3000,
      backdropFilter: 'blur(4px)'
    },
    container: {
      backgroundColor: 'white', borderRadius: '20px', width: '900px', height: '640px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    header: {
      padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', background: '#fff'
    },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: {
      width: '240px', borderRight: '1px solid #f3f4f6', padding: '20px',
      backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px'
    },
    content: { flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#fff' },
    tabCard: (isActive) => ({
      padding: '16px', borderRadius: '12px', cursor: 'pointer',
      border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
      backgroundColor: isActive ? '#eff6ff' : '#fff',
      transition: 'all 0.2s ease', boxShadow: isActive ? '0 4px 6px -1px rgba(59, 130, 246, 0.1)' : 'none'
    }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', position: 'sticky', top: 0, backgroundColor: '#fff' },
    td: { padding: '12px 8px', borderBottom: '1px solid #f3f4f6' }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>🏛️ 건축물대장 통합 조회 대시보드</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={styles.body}>
          {/* 좌측: 건수 통계 및 탭 메뉴 */}
          <div style={styles.sidebar}>
            {/* 1. 총괄표제부 */}
            <div style={styles.tabCard(activeTab === 'general')} onClick={() => setActiveTab('general')}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>총괄표제부</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{counts?.general || 0} <span style={{ fontSize: '0.9rem' }}>건</span></div>
            </div>

            {/* 2. 일반건축물 (요청하신 대로 두 번째 순서에 배치) */}
            <div style={styles.tabCard(activeTab === 'normal')} onClick={() => setActiveTab('normal')}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>일반건축물</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{normalList?.length || 0} <span style={{ fontSize: '0.9rem' }}>건</span></div>
            </div>

            {/* 3. 표제부(동) */}
            <div style={styles.tabCard(activeTab === 'title')} onClick={() => setActiveTab('title')}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>표제부(동)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{counts?.title || 0} <span style={{ fontSize: '0.9rem' }}>건</span></div>
            </div>

            {/* 4. 전유부(호수) */}
            <div style={styles.tabCard(activeTab === 'exclusive')} onClick={() => setActiveTab('exclusive')}>
              <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginBottom: '4px', fontWeight: 'bold' }}>전유부(호수)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3b82f6' }}>{counts?.exclusive || 0} <span style={{ fontSize: '0.9rem' }}>세대</span></div>
            </div>
          </div>

          {/* 우측: 상세 리스트 콘텐츠 영역 */}
          <div style={styles.content}>
            {/* 전유부 탭 */}
            {activeTab === 'exclusive' && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>동명칭</th>
                    <th style={styles.th}>호명칭</th>
                    <th style={styles.th}>연면적(㎡)</th>
                    <th style={styles.th}>평수</th>
                  </tr>
                </thead>
                <tbody>
                  {units?.map((u, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{u.dong || '-'}</td>
                      <td style={styles.td}>{u.ho}</td>
                      <td style={styles.td}>{Number(u.area).toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#2563eb', fontWeight: 'bold' }}>
                        {(Number(u.area) * 0.3025).toFixed(1)}평
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 일반건축물 탭 */}
            {activeTab === 'normal' && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>건축물명칭</th>
                    <th style={styles.th}>동명칭</th>
                    <th style={styles.th}>주용도</th>
                    <th style={styles.th}>연면적(㎡)</th>
                  </tr>
                </thead>
                <tbody>
                  {normalList?.map((n, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{n.bldNm}</td>
                      <td style={styles.td}>{n.dongNm}</td>
                      <td style={styles.td}>{n.mainPurpsCdNm}</td>
                      <td style={styles.td}>{Number(n.totArea).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 표제부 탭 */}
            {activeTab === 'title' && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>건축물명칭</th>
                    <th style={styles.th}>동명칭</th>
                    <th style={styles.th}>연면적(㎡)</th>
                  </tr>
                </thead>
                <tbody>
                  {titleList?.map((t, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{t.bldNm}</td>
                      <td style={styles.td}>{t.dongNm}</td>
                      <td style={styles.td}>{Number(t.totArea).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 총괄표제부 탭 */}
            {activeTab === 'general' && (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>건축물명칭</th>
                    <th style={styles.th}>연면적(㎡)</th>
                  </tr>
                </thead>
                <tbody>
                  {generalList?.map((g, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>{g.bldNm}</td>
                      <td style={styles.td}>{Number(g.totArea).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeumterModal;
