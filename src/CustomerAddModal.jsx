import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import styles from './CustomerPage.module.css'; // ★ CustomerPage의 CSS를 재사용

// ★ [모달] CustomerPage로부터 3개의 props를 받음:
// 1. session: user_id 저장을 위해
// 2. onClose: '닫기' 버튼 클릭 시 모달을 닫기 위해
// 3. onAddSuccess: 고객 추가 성공 시 부모(CustomerPage)의 리스트를 새로고침하기 위해
export default function CustomerAddModal({ session, onClose, onAddSuccess }) {
  const [loading, setLoading] = useState(false);

  // ★ 폼 필드 state
  const [customerType, setCustomerType] = useState('개인');
  const [purpose, setPurpose] = useState('매수');
  const [managerName, setManagerName] = useState('');
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // '추가' 버튼 클릭 핸들러
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name) {
      alert('고객이름은 필수입니다.');
      return;
    }
    setLoading(true);

    const newCustomerData = {
      name,
      phone,
      address,
      notes,
      keywords,
      customer_type: customerType,
      purpose,
      manager_name: managerName,
      user_id: session.user.id,
    };

    const { error } = await supabase.from('customers').insert(newCustomerData);

    if (error) {
      console.error('고객 생성 오류:', error.message);
      alert('고객 등록에 실패했습니다.');
    } else {
      alert('고객이 성공적으로 등록되었습니다.');
      onAddSuccess(); // ★ 부모에게 성공 신호
      onClose(); // ★ 모달 닫기
    }
    setLoading(false);
  };

  return (
    // 1. 모달 배경 (어둡게)
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* 2. 모달 본체 (클릭해도 안 닫힘) */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* 3. 모달 헤더 */}
          <div className={styles.modalHeader}>
            <h2 className={styles.sidebarTitle}>새 고객 등록</h2>
            <button type="button" className={styles.modalCloseButton} onClick={onClose}>
              &times;
            </button>
          </div>

          {/* 4. 모달 바디 (폼) */}
          <div className={styles.modalBody}>
            {/* 2x2 그리드 폼 */}
            <div className={styles.formGrid}>
              {/* --- 1열 --- */}
              <div>
                <label className={styles.label}>유형</label>
                <select
                  className={styles.input}
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                >
                  <option value="개인">개인</option>
                  <option value="부동산">부동산</option>
                  <option value="법인">법인</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>구분</label>
                <select
                  className={styles.input}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="매수">매수</option>
                  <option value="매도">매도</option>
                  <option value="임차">임차</option>
                  <option value="임대">임대</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>담당자</label>
                <input
                  className={styles.input}
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="담당 직원 이름"
                />
              </div>

              {/* --- 2열 --- */}
              <div>
                <label className={styles.label}>고객이름 (필수)</label>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div>
                <label className={styles.label}>키워드</label>
                <input
                  className={styles.input}
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="#강남, #30억, #아파트"
                />
              </div>
              <div>
                <label className={styles.label}>연락처</label>
                <input
                  className={styles.input}
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* --- 하단 (주소, 메모) --- */}
            <div className={styles.formFullWidth}>
              <label className={styles.label}>주소</label>
              <input
                className={styles.input}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="고객 거주지 또는 사무실 주소"
              />
            </div>
            <div className={styles.formFullWidth}>
              <label className={styles.label}>메모</label>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="고객 관련 기타 메모..."
              />
            </div>
          </div>

          {/* 5. 모달 푸터 (버튼) */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonGray}`}
              onClick={onClose}
              disabled={loading}
            >
              닫기
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonGreen}`} // (초록색 버튼으로 변경)
              disabled={loading}
            >
              {loading ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}