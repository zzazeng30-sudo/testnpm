/**
 * [Revision Info]
 * Rev: 1.4
 * Date: 2026-01-10
 * Author: AI Assistant
 * [Logic Change Log]
 * - 모달 종료 시 MainLayout의 탭 상태를 복구하기 위한 onModalClose 추가
 * - modalTrigger 감시 로직 최적화 (useRef 대신 단순 비교 및 탭 동기화)
 */
import React, { useState, useEffect } from 'react';
import styles from './CustomerPage.module.css'; 
import CustomerAddModal from './CustomerAddModal.jsx'; 
import { customerService } from '../../services/customerService';

export default function CustomerPage({ session, modalTrigger, onModalClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. 외부(MainLayout)에서 모달 트리거 값이 변경될 때 모달 열기
  useEffect(() => {
    if (modalTrigger > 0) {
      setIsModalOpen(true);
    }
  }, [modalTrigger]);

  // 2. 고객 목록 로드 (Read)
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await customerService.getCustomers();
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('고객 로드 오류:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // 3. 고객 삭제 (Delete)
  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    
    setLoading(true);
    const { error } = await customerService.deleteCustomer(customerId);
    
    if (error) {
      console.error('고객 삭제 오류:', error.message);
    } else {
      setCustomers(current => current.filter(c => c.id !== customerId));
    }
    setLoading(false);
  };

  // 4. 모달 닫기 핸들러 (MainLayout과 탭 상태 동기화)
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // 모달이 닫힐 때 부모 레이아웃의 '고객 추가' 탭 활성화를 '고객 관리'로 돌려줌
    if (onModalClose) {
      onModalClose();
    }
  };

  return (
    <main className={styles.pageContainerList}>
      {/* 고객 등록 모달 */}
      {isModalOpen && (
        <CustomerAddModal 
          session={session} 
          onClose={handleCloseModal} 
          onAddSuccess={() => {
            fetchCustomers();
            handleCloseModal();
          }} 
        />
      )}

      <section className={styles.listSectionFull}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>
            내 고객 리스트 (총 {customers.length}명)
          </h2>
          <button 
            className={`${styles.button} ${styles.buttonGreen}`}
            onClick={() => setIsModalOpen(true)}
          >
            + 새 고객 등록
          </button>
        </div>
        
        {loading && <p>목록을 처리 중입니다...</p>}
        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>등록된 고객이 없습니다.</p>
        )}
        
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>연락처</div>
            <div className={styles.col3}>유형/구분</div>
            <div className={styles.col5}>키워드</div>
            <div className={styles.col6}>메모</div>
            <div className={styles.col4}>관리</div> 
          </div>
          
          <div className={styles.tableBody}>
            {customers.map(customer => (
              <div key={customer.id} className={styles.tableRow}>
                <div className={styles.col1}>{customer.name}</div>
                <div className={styles.col2}>{customer.phone || '-'}</div>
                <div className={styles.col3}>
                  <span className={styles.customerType}>{customer.customer_type || '미지정'}</span>
                  <span className={styles.customerPurpose}>{customer.purpose || '미지정'}</span>
                </div>
                <div className={styles.col5}>{customer.keywords || '-'}</div>
                <div className={styles.col6}>{customer.notes || '-'}</div>
                <div className={styles.col4}>
                  <button 
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className={styles.deleteButton}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}