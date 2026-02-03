import React, { useState, useEffect } from 'react'
import { supabase } from '../../0005_Lib/supabaseClient.js'
import styles from './ConsultationLogPage.module.css'; // ★ 15일차: 전용 CSS

/* 15일차: '상담 이력 관리' 탭 페이지 */
export default function ConsultationLogPage({ session }) {
  const [logs, setLogs] = useState([])
  const [customers, setCustomers] = useState([]) // 고객 리스트
  const [loading, setLoading] = useState(true)
  
  // 폼 상태
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [newLogContent, setNewLogContent] = useState('')

  // 1. (Read) 고객 목록 및 상담 이력 읽어오기
  const fetchData = async () => {
    setLoading(true)
    try {
      // 1-1. 고객 목록 로드 (select box용)
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .order('name', { ascending: true });
      
      if (customerError) throw customerError;
      setCustomers(customerData || []);

      // 1-2. 상담 이력 로드 (고객 정보와 'JOIN')
      const { data: logData, error: logError } = await supabase
        .from('consultation_logs')
        .select(`
          id, 
          log_content, 
          created_at,
          customer:customers ( name, phone )
        `)
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      setLogs(logData || []);

    } catch (error) {
      console.error('데이터 로드 오류:', error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 2. (Create) '새 상담 이력' 폼 제출
  const handleCreateLog = async (event) => {
    event.preventDefault() 
    if (!selectedCustomerId || !newLogContent) {
      alert('고객과 상담 내용을 모두 입력하세요.')
      return
    }
    setLoading(true)
    const newLogData = { 
        customer_id: Number(selectedCustomerId), 
        log_content: newLogContent,
        user_id: session.user.id, // ★ user_id 추가
    }
    
    // insert 후 'JOIN'된 데이터를 받아오기 위해 select()를 사용
    const { data, error } = await supabase
      .from('consultation_logs')
      .insert(newLogData)
      .select(`
          id, 
          log_content, 
          created_at,
          customer:customers ( name, phone )
      `)
      .single(); // ★ .single()로 단일 객체 받기

    if (error) {
      console.error('상담 이력 생성 오류:', error.message)
    } else {
      setLogs(currentLogs => [data, ...currentLogs]) // 새 데이터를 리스트 맨 위에 추가
      setSelectedCustomerId('')
      setNewLogContent('')
    }
    setLoading(false)
  }

  // 3. (Delete) '상담 이력 삭제'
  const handleDeleteLog = async (logId) => {
    setLoading(true)
    const { error } = await supabase
      .from('consultation_logs')
      .delete()
      .eq('id', logId)

    if (error) {
      console.error('상담 이력 삭제 오류:', error.message)
    } else {
      setLogs(currentLogs => currentLogs.filter(log => log.id !== logId))
    }
    setLoading(false)
  }

  // 날짜 포맷팅 유틸리티
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
  }

  // 화면 렌더링
  return (
    <div className={styles.pageContainer}>
      
      {/* 1. '새 상담 이력' 폼 (왼쪽) */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>
          새 상담 이력 등록
        </h2>
        <form className={styles.form} onSubmit={handleCreateLog}>
          <div>
            <label className={styles.label}>고객 선택 (필수)</label>
            <select
              className={styles.input}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
            >
              <option value="" disabled>-- 고객을 선택하세요 --</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.phone || '연락처 없음'})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={styles.label}>상담 내용 (필수)</label>
            <textarea
              className={styles.textarea}
              value={newLogContent}
              onChange={(e) => setNewLogContent(e.target.value)}
              placeholder="예: 11/8 14시, 강남 30평대 아파트 문의. 30억 예산."
              required
            />
          </div>
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? '등록 중...' : '상담 이력 등록'}
          </button>
        </form>
      </aside>

      {/* 2. '상담 이력 리스트' (오른쪽) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          상담 이력 리스트 (총 {logs.length}건)
        </h2>
        
        {loading && <p>데이터를 불러오는 중...</p>}
        {!loading && logs.length === 0 && (
          <p className={styles.emptyText}>등록된 상담 이력이 없습니다. 왼쪽 폼에서 새 이력을 등록하세요.</p>
        )}
        
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.col1}>고객명</div>
            <div className={styles.col2}>상담 내용</div>
            <div className={styles.col3}>상담일</div>
            <div className={styles.col4}>관리</div>
          </div>
          
          <div>
            {logs.map(log => (
              <div 
                key={log.id} 
                className={styles.tableRow}
              >
                {/* log.customer가 null일 경우를 대비합니다. 
                  (Supabase RLS 정책 문제 등으로 JOIN이 실패했거나, 고객이 삭제된 경우)
                */}
                <div className={styles.col1}>
                  {log.customer ? log.customer.name : '삭제된 고객'}
                  <span className={styles.customerPhone}>
                    {log.customer ? log.customer.phone : ''}
                  </span>
                </div>
                <div className={styles.col2}>{log.log_content || '-'}</div>
                <div className={styles.col3}>{formatDate(log.created_at)}</div>
                <div className={styles.col4}>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
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