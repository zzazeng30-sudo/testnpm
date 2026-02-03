/**
 * [Revision Info]
 * Rev: 2.3 (Updated Status Badges)
 * Author: Gemini AI
 */
import React from 'react';
import styles from '../PropertyPage.module.css';

const PropertyList = ({ 
  properties, totalCount, loading, page, setPage, 
  selectedIds, setSelectedIds, onDelete, onEdit 
}) => {
  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading) return <div className={styles.loadingContainer}>데이터를 불러오는 중입니다...</div>;

  return (
    <div className={styles.listContainer}>
      <div className={styles.tableWrapper}>
        <table className={styles.modernTable}>
          <thead>
            <tr>
              <th className={styles.checkCol}>
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelectedIds(properties.map(p => p.id));
                  else setSelectedIds([]);
                }} checked={properties.length > 0 && selectedIds.length === properties.length} />
              </th>
              <th>상태</th>
              <th>유형</th>
              <th>키워드</th>
              <th>주소/상세주소</th>
              <th>가격 정보 (만원)</th>
              <th>메모</th>
              <th>등록일</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr><td colSpan="8" className={styles.noData}>검색 결과가 없습니다.</td></tr>
            ) : (
              properties.map((item) => (
                <tr key={item.id} className={selectedIds.includes(item.id) ? styles.selectedRow : ''}>
                  <td className={styles.checkCol}>
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => {
                      setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                    }} />
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[item.status?.replace(' ', '')]}`}>
                      {item.status || '거래전'}
                    </span>
                  </td>
                  <td>{item.property_type}</td>
                  <td className={styles.boldText}>{item.keywords || item.building_name || '-'}</td>
                  <td className={styles.addressText}>
                    <div className={styles.mainAddr}>{item.address}</div>
                    <div className={styles.subAddr}>{item.detailed_address}</div>
                  </td>
                  <td className={styles.priceCell}>
                    {item.is_sale && <div className={styles.priceDivider}><span className={styles.priceLabelSale}>매</span> {item.sale_price?.toLocaleString()}</div>}
                    {item.is_jeonse && <div className={styles.priceDivider}><span className={styles.priceLabelJeonse}>전</span> {item.jeonse_deposit?.toLocaleString()}</div>}
                    {item.is_rent && <div className={styles.priceDivider}><span className={styles.priceLabelRent}>월</span> {item.rent_deposit?.toLocaleString()}/{item.rent_amount}</div>}
                    {item.premium > 0 && <div className={styles.priceDivider}><span className={styles.priceLabelPremium}>권</span> {item.premium?.toLocaleString()}</div>}
                  </td>
                  <td className={styles.memoTextCell}>{item.notes || '-'}</td>
                  <td className={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationContainer}>
        <button className={styles.pageArrowBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>&lt; 이전</button>
        <div className={styles.pageIndicator}><strong>{page + 1}</strong> / {totalPages || 1}</div>
        <button className={styles.pageArrowBtn} disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>다음 &gt;</button>
      </div>
    </div>
  );
};

export default PropertyList;