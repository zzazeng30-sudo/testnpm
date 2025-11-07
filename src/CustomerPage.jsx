import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'

/* 8일차: 'Tailwind CSS'로 디자인된 '고객 관리' 탭 페이지 (★'이중 포장' 제거★) */
export default function CustomerPage({ session }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // 1. (Read) 고객 읽어오기
  const fetchCustomers = async () => {
    setLoading(true)
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
    const newCustomerData = { name: newName, phone: newPhone, notes: newNotes }
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

  // 화면 렌더링
  return (
    // ★ 8일차 높이 문제 해결 ★: 'page-container-map' 클래스를 사용
    <main className="page-container-map">
      
      {/* 1. '새 고객 등록' 폼 (왼쪽) */}
      <aside className="w-96 bg-white p-6 border-r border-gray-200 overflow-y-auto flex-shrink-0">
        <h2 className="text-xl font-bold mb-5 text-gray-800">
          새 고객 등록
        </h2>
        <form className="space-y-4" onSubmit={handleCreateCustomer}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">고객명 (필수)</label>
            <input
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              type="text"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">희망 조건 (메모)</label>
            <textarea
              className="w-full h-28 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="예: 강남 30억 이하 아파트, 30평대..."
            />
          </div>
          <button 
            type="submit" 
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md shadow-sm disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '등록 중...' : '고객 등록'}
          </button>
        </form>
      </aside>

      {/* 2. '고객 리스트' (오른쪽) */}
      <section className="flex-1 p-6 overflow-y-auto bg-white">
        <h2 className="text-xl font-bold mb-5 text-gray-800">
          내 고객 리스트 (총 {customers.length}명)
        </h2>
        
        {loading && <p>고객 목록을 불러오는 중...</p>}
        {!loading && customers.length === 0 && (
          <p className="text-gray-500">등록된 고객이 없습니다. 왼쪽 폼에서 새 고객을 등록하세요.</p>
        )}
        
        {/* 고객 리스트 (테이블) */}
        <div className="w-full border-t border-gray-200">
          {/* 테이블 헤더 */}
          <div className="flex bg-gray-50 border-b border-gray-200 p-3 font-bold text-sm text-gray-600">
            <div className="w-1/5">고객명</div>
            <div className="w-1/5">연락처</div>
            <div className="w-2/5">희망 조건 (메모)</div>
            <div className="w-1/5 text-right">관리</div>
          </div>
          
          {/* 테이블 바디 */}
          <div className="divide-y divide-gray-100">
            {customers.map(customer => (
              <div 
                key={customer.id} 
                className="flex p-3 text-sm items-center"
              >
                <div className="w-1/5 font-medium text-gray-800">{customer.name}</div>
                <div className="w-1/5 text-gray-600">{customer.phone}</div>
                <div className="w-2/5 text-gray-700 whitespace-pre-wrap break-words">{customer.notes}</div>
                <div className="w-1/5 text-right">
                  <button 
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50"
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