/**
 * [Revision: 1.2]
 * - [매물 전체삭제] 버튼 추가 및 useCsvManager의 삭제 로직 연결
 * - 버튼 레이아웃 최적화 (flexWrap 추가)
 */
import React, { useRef } from 'react';
import styles from '../MyPage.module.css'; // 기존 스타일 재사용
import { useCsvManager } from '../hooks/useCsvManager';

export default function DataTab({ session }) {
  const fileInputRef = useRef(null);
  
  // hook에서 handleClearAllProperties(전체삭제 함수)를 추가로 가져옵니다.
  const { 
    loading, 
    handleDownloadCSV, 
    handleUploadCSV, 
    handleClearAllProperties 
  } = useCsvManager(session);

  return (
    <div className={styles.staffContainer}>
      <h2 className={styles.staffTitle}>데이터 관리</h2>
      <p className={styles.infoText}>CSV 백업 및 복원, 데이터 관리</p>
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        {/* 1. 다운로드 버튼 */}
        <button 
          className={styles.button} 
          onClick={handleDownloadCSV} 
          disabled={loading}
        >
          {loading ? '처리 중...' : '📥 다운로드'}
        </button>
        
        {/* 2. 업로드 버튼 */}
        <button 
          className={styles.button} 
          style={{ backgroundColor: loading ? '#9ca3af' : '#3b82f6' }} 
          onClick={() => fileInputRef.current.click()} 
          disabled={loading}
        >
          {loading ? '업로드 중...' : '📤 업로드'}
        </button>

        {/* 3. ★ 추가: 매물 전체 삭제 버튼 (빨간색) */}
        <button 
          className={styles.button} 
          style={{ backgroundColor: loading ? '#9ca3af' : '#ef4444' }} 
          onClick={handleClearAllProperties} 
          disabled={loading}
        >
          {loading ? '삭제 중...' : '🗑 매물 전체삭제'}
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".csv" 
          onChange={handleUploadCSV} 
        />
      </div>

      {loading && (
        <p style={{ marginTop: '10px', color: '#2563eb', fontSize: '14px' }}>
          데이터 처리 및 작업을 진행 중입니다. 잠시만 기다려주세요...
        </p>
      )}
    </div>
  );
}