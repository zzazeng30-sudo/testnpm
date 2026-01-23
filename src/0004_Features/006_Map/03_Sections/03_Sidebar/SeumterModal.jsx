import React, { useState } from 'react';

const SeumterModal = ({ isOpen, onClose, data }) => {
  const [activeTab, setActiveTab] = useState('exclusive');
  const [selectedRow, setSelectedRow] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null); // 호버 상태 추가

  if (!isOpen || !data) return null;

  const { counts, units, generalList, titleList, normalList } = data;

  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex',
      justifyContent: 'center', alignItems: 'center', zIndex: 3000,
      backdropFilter: 'blur(4px)'
    },
    container: {
      backgroundColor: 'white', borderRadius: '20px', width: '900px', height: '700px',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    header: {
      padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', background: '#fff'
    },
    selectionBar: {
      padding: '12px 24px', backgroundColor: '#f0f9ff', borderBottom: '1px solid #bae6fd',
      display: 'flex', alignItems: 'center', gap: '20px', minHeight: '50px'
    },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    sidebar: {
      width: '220px', borderRight: '1px solid #f3f4f6', padding: '20px',
      backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px'
    },
    content: { flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#fff' },
    tabCard: (isActive) => ({
      padding: '16px', borderRadius: '12px', cursor: 'pointer',
      border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb',
      backgroundColor: isActive ? '#eff6ff' : '#fff', transition: 'all 0.2s ease'
    }),
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: {
      textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #f3f4f6',
      color: '#6b7280', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 10
    },
    td: { padding: '12px 8px', borderBottom: '1px solid #f3f4f6' },
    // 행 스타일 로직 통합
    tr: (isSelected, isHovered) => ({
      cursor: 'pointer',
      backgroundColor: isSelected ? '#e0f2fe' : isHovered ? '#f8fafc' : 'transparent',
      // 선택된 행은 진한 파랑 테두리, 호버 중인 행은 연한 회색 테두리 효과
      boxShadow: isSelected 
        ? 'inset 0 0 0 2px #3b82f6' 
        : isHovered ? 'inset 0 0 0 2px #cbd5e1' : 'none',
      transition: 'all 0.15s ease-in-out'
    })
  };

  const handleRowClick = (rowData) => {
    setSelectedRow(rowData);
  };

  const currentList = () => {
    switch (activeTab) {
      case 'exclusive': return units;
      case 'normal': return normalList;
      case 'title': return titleList;
      case 'general': return generalList;
      default: return [];
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.container} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111827', margin: 0 }}>🏛️ 건축물대장 통합 조회 대시보드</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={styles.selectionBar}>
          {selectedRow ? (
            <>
              <span style={{ fontSize: '0.9rem', color: '#0369a1', fontWeight: 'bold' }}>📍 선택된 매물:</span>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#0c4a6e' }}>
                {selectedRow.dong || selectedRow.dongNm || selectedRow.bldNm || '-'} {selectedRow.ho ? `${selectedRow.ho}호` : ''}
              </span>
              <span style={{ fontSize: '0.95rem', color: '#0c4a6e' }}>
                연면적: <strong>{selectedRow.area || selectedRow.totArea}㎡</strong> 
                ({(Number(selectedRow.area || selectedRow.totArea) * 0.3025).toFixed(1)}평)
              </span>
              {/* 선택 완료 버튼 예시 */}
              <button 
                onClick={() => alert('해당 매물 정보로 폼을 채웁니다.')}
                style={{ marginLeft: 'auto', padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                선택 완료
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>표에서 분석할 매물을 선택해주세요.</span>
          )}
        </div>

        <div style={styles.body}>
          <div style={styles.sidebar}>
            {[
              { id: 'general', label: '총괄표제부', count: counts?.general, list: generalList, unit: '건' },
              { id: 'normal', label: '일반건축물', count: counts?.normal, list: normalList, unit: '건' },
              { id: 'title', label: '표제부(동)', count: counts?.title, list: titleList, unit: '건' },
              { id: 'exclusive', label: '전유부(호수)', count: counts?.exclusive, list: units, unit: '세대', color: '#3b82f6' }
            ].map(tab => (
              <div 
                key={tab.id} 
                style={styles.tabCard(activeTab === tab.id)} 
                onClick={() => { 
                  setActiveTab(tab.id); 
                  setSelectedRow(null); 
                  setHoveredRow(null);
                }}
              >
                <div style={{ fontSize: '0.75rem', color: tab.color || '#6b7280', marginBottom: '4px', fontWeight: tab.color ? 'bold' : 'normal' }}>{tab.label}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: tab.color || '#111827' }}>
                  {tab.count ?? tab.list?.length ?? 0} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>{tab.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.content}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>명칭/동</th>
                  {activeTab === 'exclusive' && <th style={styles.th}>호수</th>}
                  {activeTab === 'normal' && <th style={styles.th}>주용도</th>}
                  <th style={styles.th}>연면적(㎡)</th>
                  <th style={styles.th}>평수</th>
                </tr>
              </thead>
              <tbody>
                {currentList()?.map((item, i) => {
                  const isSelected = selectedRow === item;
                  const isHovered = hoveredRow === i;
                  return (
                    <tr 
                      key={i} 
                      style={styles.tr(isSelected, isHovered)} 
                      onClick={() => handleRowClick(item)}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={{ ...styles.td, fontWeight: 'bold' }}>
                        {item.dong || item.dongNm || item.bldNm || '-'}
                      </td>
                      {activeTab === 'exclusive' && <td style={styles.td}>{item.ho}</td>}
                      {activeTab === 'normal' && <td style={styles.td}>{item.mainPurpsCdNm || '-'}</td>}
                      <td style={styles.td}>{Number(item.area || item.totArea).toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#2563eb', fontWeight: 'bold' }}>
                        {(Number(item.area || item.totArea) * 0.3025).toFixed(1)}평
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeumterModal;
