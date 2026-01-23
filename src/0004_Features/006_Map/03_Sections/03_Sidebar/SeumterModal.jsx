import React, { useState } from 'react';

const SeumterModal = ({ isOpen, onClose, data }) => {
  const [activeTab, setActiveTab] = useState('exclusive'); // 기본 선택: 전유부

  if (!isOpen || !data) return null;

  const { counts, units } = data;

  // 인라인 스타일 정의
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
          {/* 좌측: 건수 통계 */}
          <div style={styles.sidebar}>
            <div style={styles.tabCard(activeTab === 'general')} onClick={() => setActiveTab('general')}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>총괄표제부</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{counts.general} <span style={{ fontSize: '0.9rem' }}>건</span></div>
            </div>
            <div style={styles.tabCard(activeTab === 'title')} onClick={() => setActiveTab('title')}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>표제부(동)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{counts.title} <span style={{ fontSize: '0.9rem' }}>건</span></div>
            </div>
            <div style={styles.tabCard(activeTab === 'exclusive')} onClick={() => setActiveTab('exclusive')}>
              <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginBottom: '4px', fontWeight: 'bold' }}>전유부(호수)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#3b82f6' }}>{counts.exclusive} <span style={{ fontSize: '0.9rem' }}>세대</span></div>
            </div>
          </div>

          {/* 우측: 상세 리스트 */}
          <div style={styles.content}>
            {activeTab === 'exclusive' ? (
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
                  {units.map((u, i) => (
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
            ) : (
              <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9ca3af' }}>
                {activeTab === 'general' ? '총괄표제부 정보는 준비 중입니다.' : '표제부 상세 정보는 준비 중입니다.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeumterModal;
