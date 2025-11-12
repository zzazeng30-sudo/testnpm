import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './CustomerPage.module.css'; 

/* 21일차 (수정): 'mode' prop을 받아 폼/리스트를 분리 */
export default function CustomerPage({ session, mode = 'manage' }) { // 기본값 'manage'
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // 1. (Read) 고객 읽어오기
  const fetchCustomers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false }) 
      
    if (error) console.error('고객 로드 오류:', error.message)
    else setCustomers(data || [])
    setLoading(false)
  }

  // mode가 'manage'(리스트)일 때만 데이터를 불러옵니다.
  useEffect(() => {
    if (mode === 'manage') {
      fetchCustomers()
    }
  }, [mode]) // mode가 바뀔 때마다 실행

  // 2. (Create) '새 고객 등록' 폼 제출 핸들러
  const handleCreateCustomer = async (event) => {
    event.preventDefault() 
    if (!newName) {
      console.error('고객 이름은 필수입니다.')
      return
    }
    setLoading(true)
    const newCustomerData = { 
        name: newName, 
        phone: newPhone, 
        notes: newNotes,
        user_id: session.user.id
    }
    const { data, error } = await supabase.from('customers').insert(newCustomerData).select() 
    if (error) {
      console.error('고객 생성 오류:', error.message)
      alert('고객 등록에 실패했습니다.');
    } else {
      alert('고객이 성공적으로 등록되었습니다.');
      // 폼 초기화
      setNewName('')
      setNewPhone('')
      setNewNotes('')
    }
    setLoading(false)
  }

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

  // ★ 21일차: '고객 등록' (폼) 렌더링
  if (mode === 'upload') {
    return (
      // ★ 'pageContainerForm' (새 CSS 클래스) 사용
      <main className={styles.pageContainerForm}>
        <aside className={styles.sidebarFull}>
          <h2 className={styles.sidebarTitle}>
            새 고객 등록
          </h2>
          <form className={styles.form} onSubmit={handleCreateCustomer}>
            <div>
              <label className={styles.label}>고객명 (필수)</label>
              <input
                className={styles.input}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="홍길동"
                required
              />
            </div>
            <div>
              <label className={styles.label}>연락처</label>
              <input
                className={styles.input}
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="010-1234-5678"
              />
            </div>
            <div>
              <label className={styles.label}>희망 조건 (메모)</label>
              <textarea
                className={styles.textarea}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="예: 강남 30억 이하 아파트, 30평대..."
              />
            </div>
            <button 
              type="submit" 
              className={styles.button}
              disabled={loading}
            >
              {loading ? '등록 중...' : '고객 등록'}
            </button>
          </form>
        </aside>
      </main>
    );
  }

  // ★ 21일차: '고객 관리' (리스트) 렌더링 (기본값)
  return (
    // ★ 'pageContainerList' (새 CSS 클래스) 사용
    <main className={styles.pageContainerList}>
      <section className={styles.listSectionFull}>
        <h2 className={styles.listTitle}>
          내 고객 리스트 (총 {customers.length}명)
        </h2>
        
        {loading && <p>고객 목록을 불러오는 중...</p>}
        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>등록된 고객이 없습니다. '고객 등록' 탭에서 새 고객을 등록하세요.</p>
        )}
        
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>연락처</div>
            <div className={styles.col3}>희망 조건 (메모)</div>
            <div className={styles.col4}>관리</div>
          </div>
          
          <div className={styles.tableBody}>
            {customers.map(customer => (
              <div 
                key={customer.id} 
                className={styles.tableRow}
              >
                <div className={styles.col1}>{customer.name}</div>
                <div className={styles.col2}>{customer.phone}</div>
                <div className={styles.col3}>{customer.notes}</div>
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