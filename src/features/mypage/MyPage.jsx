// src/MyPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import styles from './MyPage.module.css';

export default function MyPage({ session, initialTab = 'info' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [newName, setNewName] = useState('');
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchMyProfile();
    if (activeTab === 'staff') {
      fetchStaffList();
    }
  }, [activeTab]);

  // 1. 내 정보 가져오기
  const fetchMyProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (data) {
      setMyProfile(data);
      setNewName(data.full_name || '');
    }
  };

  // 2. 직원 목록 가져오기 (같은 company_id)
  const fetchStaffList = async () => {
    if (!myProfile?.company_id) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', myProfile.company_id);
      
    if (data) setStaffList(data);
  };

  // 3. 이름 변경
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', session.user.id);
      
    if (error) alert('수정 실패: ' + error.message);
    else alert('정보가 수정되었습니다.');
    setLoading(false);
  };

  return (
    <div className={styles.pageContainer}>
      {/* 탭 네비게이션 */}
      <nav className={styles.tabNav}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
          onClick={() => setActiveTab('info')}
        >
          내 정보 수정
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'staff' ? styles.active : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          직원 관리
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'payment' ? styles.active : ''}`}
          onClick={() => setActiveTab('payment')}
        >
          결제 관리
        </button>
      </nav>

      <div className={styles.contentArea}>
        {/* 1. 내 정보 탭 */}
        {activeTab === 'info' && (
          <form className={styles.form} onSubmit={handleUpdateProfile}>
            <h2 className={styles.formTitle}>기본 정보</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>이메일 (변경 불가)</label>
              <input className={styles.input} type="text" value={session.user.email} disabled />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>이름</label>
              <input 
                className={styles.input} 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
            </div>
            <button className={styles.button} disabled={loading}>
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </form>
        )}

        {/* 2. 직원 관리 탭 */}
        {activeTab === 'staff' && (
          <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>우리 회사 직원 목록</h2>
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div className={styles.col1}>이름</div>
                <div className={styles.col2}>이메일</div>
                <div className={styles.col3}>가입일</div>
              </div>
              {staffList.map(staff => (
                <div key={staff.id} className={styles.tableRow}>
                  <div className={styles.col1}>{staff.full_name || '이름 없음'}</div>
                  <div className={styles.col2}>{staff.email}</div>
                  <div className={styles.col3}>{new Date(staff.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
            {staffList.length === 0 && <p className={styles.infoText}>등록된 직원이 없습니다.</p>}
          </div>
        )}

        {/* 3. 결제 관리 탭 */}
        {activeTab === 'payment' && (
          <div>
            <h2 className={styles.staffTitle}>결제 관리</h2>
            <p className={styles.infoText}>준비 중인 기능입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}