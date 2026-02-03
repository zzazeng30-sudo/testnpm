import React, { useState, useEffect } from 'react'
// ✅ (이렇게 수정하세요: 점 2개 + lib)
import { supabase } from "../../0005_Lib/supabaseClient";
import styles from './ContractPage.module.css'; 

/* 18일차 (수정): '계약 관리' (session prop 및 user_id 저장 로직 추가) */
export default function ContractPage({ session }) { // ★ session prop 받기
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [newClientName, setNewClientName] = useState('')
  const [newPropertyMemo, setNewPropertyMemo] = useState('')
  const [newContractPrice, setNewContractPrice] = useState(0)
  const [newBalanceDate, setNewBalanceDate] = useState('')

  // 1. (Read) 계약 목록 읽어오기
  const fetchContracts = async () => {
    setLoading(true)
    // (이제 user_id가 일치하는 본인 계약만 보입니다)
    const { data, error } = await supabase.from('contracts').select('*').order('created_at', { ascending: false }) 
    if (error) console.error('계약 목록 로드 오류:', error.message)
    else setContracts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  // 2. (Create) '새 계약 등록' 폼 제출 핸들러
  const handleCreateContract = async (event) => {
    event.preventDefault() 
    if (!newClientName || !newContractPrice) {
      console.error('고객명과 계약 가격은 필수입니다.')
      return
    }
    setLoading(true)
    const newContractData = { 
        client_name: newClientName, 
        property_memo: newPropertyMemo, 
        contract_price: Number(newContractPrice),
        balance_date: newBalanceDate || null,
        user_id: session.user.id // ★ 18일차: user_id 저장
    }
    const { data, error } = await supabase.from('contracts').insert(newContractData).select();
    if (error) console.error('계약 생성 오류:', error.message)
    else {
      const createdContract = data[0]
      setContracts(currentContracts => [createdContract, ...currentContracts])
      setNewClientName('')
      setNewPropertyMemo('')
      setNewContractPrice(0)
      setNewBalanceDate('')
    }
    setLoading(false)
  }

  // 3. (Delete) '계약 삭제' 버튼 클릭 핸들러
  const handleDeleteContract = async (contractId) => {
    setLoading(true)
    
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId)

    if (error) {
      console.error('계약 삭제 오류:', error.message)
    } else {
      setContracts(currentContracts => currentContracts.filter(c => c.id !== contractId))
    }
    setLoading(false)
  }

  // 화면 렌더링
  return (
    <div className={styles.pageContainer}>
      
      {/* 1. '새 계약 등록' 폼 (왼쪽) */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>
          새 계약서 등록
        </h2>
        <form className={styles.form} onSubmit={handleCreateContract}>
          <div>
            <label className={styles.label}>고객명 (필수)</label>
            <input
              className={styles.input}
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="고객명"
              required
            />
          </div>
          <div>
            <label className={styles.label}>계약 가격 (만원) (필수)</label>
            <input
              className={styles.input}
              type="number"
              value={newContractPrice}
              onChange={(e) => setNewContractPrice(e.target.value)}
              placeholder="10000"
              required
            />
          </div>
          <div>
            <label className={styles.label}>잔금일 (대시보드 연동)</label>
            <input
              className={styles.input}
              type="date"
              value={newBalanceDate}
              onChange={(e) => setNewBalanceDate(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.label}>매물 정보 요약 (메모)</label>
            <textarea
              className={styles.textarea}
              value={newPropertyMemo}
              onChange={(e) => setNewPropertyMemo(e.target.value)}
              placeholder="예: 강남구 아파트 30평, 30억, 입주일 협의..."
            />
          </div>
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? '등록 중...' : '계약 등록'}
          </button>
        </form>
      </aside>

      {/* 2. '계약 리스트' (오른쪽) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          계약 리스트 (총 {contracts.length}건)
        </h2>
        
        {loading && <p>계약 목록을 불러오는 중...</p>}
        {!loading && contracts.length === 0 && (
          <p className={styles.emptyText}>등록된 계약이 없습니다. 왼쪽 폼에서 새 계약을 등록하세요.</p>
        )}
        
        {/* 계약 리스트 (테이블) */}
        <div className={styles.table}>
          {/* 테이블 헤더 */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>계약 가격(만원)</div>
            <div className={styles.col3}>매물 정보 요약</div>
            <div className={styles.col4}>잔금일</div>
            <div className={styles.col5}>관리</div>
          </div>
          
          {/* 테이블 바디 */}
          <div>
            {contracts.map(contract => (
              <div 
                key={contract.id} 
                className={styles.tableRow}
              >
                <div className={styles.col1}>{contract.client_name}</div>
                <div className={styles.col2}>{contract.contract_price.toLocaleString()}</div>
                <div className={styles.col3}>{contract.property_memo || '-'}</div>
                <div className={styles.col4}>{contract.balance_date || '-'}</div>
                <div className={styles.col5}>
                  <button 
                    onClick={() => handleDeleteContract(contract.id)}
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
    </div>
  )
}