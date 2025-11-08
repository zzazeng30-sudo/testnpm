import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './CustomerPage.module.css'; // ★ 9일차: CSS 모듈을 임포트합니다.

/* 18일차 (수정): '고객 관리' (user_id 저장 로직 추가) */
export default function CustomerPage({ session }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // 1. (Read) 고객 읽어오기
  const fetchCustomers = async () => {
    setLoading(true)
    // (이제 user_id가 일치하는 본인 고객만 보입니다)
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false }) 
    if (error) console.error('고객 로드 오류:', error.message)
    else setCustomers(data || [])
    setLoading(false)
  }

  // 컴포넌트가 처음 로드될 때 고객 리스트를 가져옵니다.
  useEffect(() => {
    fetchCustomers()
  }, [])

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
        user_id: session.user.id // ★ 18일차: user_id 저장
    }
    const { data, error } = await supabase.from('customers').insert(newCustomerData).select() 
    if (error) console.error('고객 생성 오류:', error.message)
    else {
      const createdCustomer = data[0]
      setCustomers(currentCustomers => [createdCustomer, ...currentCustomers])
      setNewName('')
      setNewPhone('')
      setNewNotes('')
    }
    setLoading(false)
  }

  // 3. (Delete) '고객 삭제' 버튼 클릭 핸들러
  const handleDeleteCustomer = async (customerId) => {
    setLoading(true)
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (error) {
      console.error('고객 삭제 오류:', error.message)
    } else {
      setCustomers(currentCustomers => currentCustomers.filter(c => c.id !== customerId))
    }
    setLoading(false)
  }

  // 화면 렌더링 (이하 JSX는 15일차와 동일)
  return (
    <main className={styles.pageContainer}>
      
      {/* 1. '새 고객 등록' 폼 (왼쪽) */}
      <aside className={styles.sidebar}>
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

      {/* 2. '고객 리스트' (오른쪽) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          내 고객 리스트 (총 {customers.length}명)
        </h2>
        
        {loading && <p>고객 목록을 불러오는 중...</p>}
        {!loading && customers.length === 0 && (
          <p className={styles.emptyText}>등록된 고객이 없습니다. 왼쪽 폼에서 새 고객을 등록하세요.</p>
        )}
        
        {/* 고객 리스트 (테이블) */}
        <div className={styles.table}>
          {/* 테이블 헤더 */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>연락처</div>
            <div className={styles.col3}>희망 조건 (메모)</div>
            <div className={styles.col4}>관리</div>
          </div>
          
          {/* 테이블 바디 */}
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