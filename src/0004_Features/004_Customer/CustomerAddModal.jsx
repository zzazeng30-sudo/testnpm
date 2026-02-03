import React, { useState } from 'react';
// ▼ [수정] 라이브러리 경로 변경 (../../lib/...)
import { supabase } from '../../0005_Lib/supabaseClient';
// 스타일은 같은 폴더에 있으므로 그대로 둠
import styles from './CustomerPage.module.css';

export default function CustomerAddModal({ session, onClose, onAddSuccess }) {
  const [loading, setLoading] = useState(false);

  const [customerType, setCustomerType] = useState('개인');
  const [purpose, setPurpose] = useState('매수');
  const [managerName, setManagerName] = useState('');
  const [name, setName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

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
      onAddSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalHeader}>
            <h2 className={styles.sidebarTitle}>새 고객 등록</h2>
            <button type="button" className={styles.modalCloseButton} onClick={onClose}>
              &times;
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
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
              className={`${styles.button} ${styles.buttonGreen}`}
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