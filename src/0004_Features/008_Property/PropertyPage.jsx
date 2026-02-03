/**
 * [Revision Info]
 * Rev: 2.6 (Filter Sequence Update)
 * Author: Gemini AI
 */
import React, { useEffect, useState, useCallback } from 'react';
import styles from './PropertyPage.module.css';

import { useProperty } from './hooks/useProperty';
import { propertyService } from '../../services/propertyService'; 
import PropertyForm from './components/PropertyForm';
import PropertyList from './components/PropertyList';
import PropertyFilter from './components/PropertyFilter';

export default function PropertyPage({ session }) {
  const { 
    properties, 
    totalCount, 
    loading, 
    fetchProperties, 
    addProperty, 
    deleteProperty 
  } = useProperty(session);

  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterMode, setFilterMode] = useState('ALL');
  
  const [priceFilter, setPriceFilter] = useState({ 
    val1Min: '', val1Max: '', 
    val2Min: '', val2Max: '', 
    premiumMin: '', premiumMax: '' 
  });

  const loadData = useCallback(() => {
    fetchProperties(page, {
      searchQuery,
      status: filterStatus,
      property_type: filterType,
      filterMode,
      priceFilter
    });
  }, [page, searchQuery, filterStatus, filterType, filterMode, priceFilter, fetchProperties]);

  useEffect(() => {
    loadData();
    setSelectedIds([]);
  }, [loadData]);

  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(0);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`${selectedIds.length}건을 일괄 삭제하시겠습니까?`)) {
      const { error } = await propertyService.deleteProperties(selectedIds);
      if (error) alert(error.message);
      else {
        setSelectedIds([]);
        loadData();
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <PropertyForm 
        onAddProperty={async (data) => {
          const res = await addProperty(data);
          if (res.success) loadData();
        }} 
        session={session} 
        loading={loading} 
      />

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>
            매물 목록 <span className={styles.countBadge}>{totalCount}건</span>
          </h2>
          <div className={styles.headerActions}>
            {selectedIds.length > 0 && (
              <button className={styles.batchDeleteBtn} onClick={handleBatchDelete}>
                선택 삭제 ({selectedIds.length})
              </button>
            )}
          </div>
        </div>

        <PropertyFilter 
          searchQuery={searchQuery} setSearchQuery={(v) => handleFilterChange(setSearchQuery, v)}
          filterStatus={filterStatus} setFilterStatus={(v) => handleFilterChange(setFilterStatus, v)}
          filterType={filterType} setFilterType={(v) => handleFilterChange(setFilterType, v)}
          filterMode={filterMode} setFilterMode={(v) => handleFilterChange(setFilterMode, v)}
          priceFilter={priceFilter} setPriceFilter={(v) => handleFilterChange(setPriceFilter, v)}
        />

        <PropertyList 
          properties={properties} totalCount={totalCount} loading={loading}
          page={page} setPage={setPage}
          selectedIds={selectedIds} setSelectedIds={setSelectedIds}
          onEdit={(item) => alert(item.address)}
          onDelete={async (id) => { if (await deleteProperty(id)) loadData(); }}
        />
      </section>
    </div>
  );
}