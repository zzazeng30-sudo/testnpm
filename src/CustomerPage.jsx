import React, { useState, useEffect, useRef } from 'react' // ★ [수정] useRef 추가
import { supabase } from './supabaseClient.js'
import styles from './CustomerPage.module.css'; 
import CustomerAddModal from './CustomerAddModal.jsx'; 

// ★ [수정] modalTrigger prop 받기
export default function CustomerPage({ session, modalTrigger }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ★ [수정] modalTrigger의 이전 값을 기억하기 위한 Ref
  const prevModalTriggerRef = useRef(modalTrigger); // ✅ 수정된 코드

  // ★ [수정] '고객 추가' 탭 클릭(modalTrigger)을 감지하여 모달 열기
  useEffect(() => {
    // 1. modalTrigger가 0보다 크고 (신호가 왔고)
    // 2. modalTrigger가 이전 Ref 값과 다를 때 (새로운 신호일 때)만 모달을 엽니다.
    // (이렇게 하면 '고객 관리' 탭을 다시 눌러도 팝업이 열리지 않습니다.)
    if (modalTrigger > 0 && modalTrigger !== prevModalTriggerRef.current) {
      setIsModalOpen(true);
    }
    
    // 3. 현재 신호 값을 Ref에 저장하여 다음 렌더링과 비교할 수 있도록 합니다.
    prevModalTriggerRef.current = modalTrigger;
    
  }, [modalTrigger]); // modalTrigger prop이 변경될 때마다 실행

  // 1. (Read) 고객 읽어오기
  const fetchCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*') // ★ (DB 수정 후) '*'로 모든 컬럼(유형, 구분 등)을 가져옴
      .order('created_at', { ascending: false }) 
      
    if (error) console.error('고객 로드 오류:', error.message)
    else setCustomers(data || [])
    setLoading(false)
  }

  // ★ 'mode' 의존성 제거, 최초 1회만 실행
  useEffect(() => {
    fetchCustomers()
  }, []) 

  // 'handleCreateCustomer' 로직은 CustomerAddModal.jsx로 이동함

  // 3. (Delete) '고객 삭제'
  const handleDeleteCustomer = async (customerId) => {
    setLoading(true)
    const { error } = await supabase.from('customers').delete().eq('id', customerId)
    if (error) {
      console.error('고객 삭제 오류:', error.message)
    } else {
      setCustomers(currentCustomers => currentCustomers.filter(c => c.id !== customerId))
    }
    setLoading(false)
  }

  // --- 렌더링 ---

  // ★ 'mode' 분기 제거, '고객 관리' 리스트만 렌더링
  return (
    <main className={styles.pageContainerList}>
    
      {/* ★ 모달 렌더링 (isModalOpen이 true일 때) */}
      {isModalOpen && (
        <CustomerAddModal 
          session={session} 
          onClose={() => setIsModalOpen(false)} // 모달 닫기
          onAddSuccess={() => fetchCustomers()} // 추가 성공 시 리스트 새로고침
        />
      )}

      <section className={styles.listSectionFull}>
        <div className={styles.listHeader}> {/* ★ 리스트 헤더 컨테이너 추가 */}
          <h2 className={styles.listTitle}>
            내 고객 리스트 (총 {customers.length}명)
          </h2>
          {/* ★ '고객 관리' 탭 내부에도 '새 고객 등록' 버튼 추가 */}
          <button 
            className={`${styles.button} ${styles.buttonGreen}`}
            onClick={() => setIsModalOpen(true)}
          >
            + 새 고객 등록
          </button>
        </div>
        
        {loading && <p>고객 목록을 불러오는 중...</p>}
        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>등록된 고객이 없습니다. '고객 추가' 탭 또는 버튼을 눌러 새 고객을 등록하세요.</p>
        )}
        
        <div className={styles.table}>
          {/* ★ 테이블 헤더 수정 (새 컬럼 반영) */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>연락처</div>
            <div className={styles.col3}>유형/구분</div>
            <div className={styles.col5}>키워드</div>
            <div className={styles.col6}>메모</div>
            {/* ★★★ [오류 수정] className= 추가 ★★★ */}
            <div className={styles.col4}>관리</div> 
          </div>
          
          <div className={styles.tableBody}>
            {customers.map(customer => (
              <div 
                key={customer.id} 
                className={styles.tableRow}
              >
                {/* ★ 테이블 바디 수정 (새 컬럼 반영) */}
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
  )
}