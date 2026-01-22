import React, { useState, useEffect } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient.js';
import styles from './MyPage.module.css';

// 분리한 컴포넌트 import
import DataTab from './tabs/DataTab.jsx';

export default function MyPage({ session, initialTab = 'info' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  
  // 내 정보 관리용 전체 상태
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone_number: '',
    job_title: '',
    address: ''
  });

  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchMyProfile();
    if (activeTab === 'staff') fetchStaffList();
  }, [activeTab]);

  const fetchMyProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setMyProfile(data);
      setProfileForm({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        job_title: data.job_title || '',
        address: data.address || ''
      });
    }
  };

  const fetchStaffList = async () => {
    if (!myProfile?.company_id) return;
    const { data } = await supabase.from('profiles').select('*').eq('company_id', myProfile.company_id);
    if (data) setStaffList(data);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number,
      job_title: profileForm.job_title,
      address: profileForm.address
    }).eq('id', session.user.id);

    if (error) alert('수정 실패: ' + error.message);
    else alert('정보가 수정되었습니다.');
    
    setLoading(false);
  };

  const handleLogout = async () => {
    if (window.confirm('정말 로그아웃 하시겠습니까?')) {
      await supabase.auth.signOut();
      window.location.reload(); 
    }
  };

  return (
    <div className={styles.pageContainer}>
      <nav className={styles.tabNav}>
        {['info', 'staff', 'payment', 'data'].map((tab) => (
          <button 
            key={tab}
            className={`${styles.tabButton} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'info' ? '내 정보' : tab === 'staff' ? '직원 관리' : tab === 'payment' ? '결제 관리' : '데이터 관리'}
          </button>
        ))}
      </nav>

      <div className={styles.contentArea}>
        {/* 1. 내 정보 탭 */}
        {activeTab === 'info' && (
          <div className={styles.formContainer}>
            <form className={styles.form} onSubmit={handleUpdateProfile}>
              <h2 className={styles.formTitle}>내 정보 수정</h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>이메일 (ID)</label>
                <input className={styles.input} type="text" value={session.user.email} disabled style={{ backgroundColor: '#f3f4f6' }} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>이름</label>
                <input className={styles.input} name="full_name" value={profileForm.full_name} onChange={handleProfileChange} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>연락처</label>
                <input className={styles.input} name="phone_number" placeholder="010-0000-0000" value={profileForm.phone_number} onChange={handleProfileChange} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>직책</label>
                <input className={styles.input} name="job_title" placeholder="예: 대표, 실장" value={profileForm.job_title} onChange={handleProfileChange} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>주소</label>
                <input className={styles.input} name="address" value={profileForm.address} onChange={handleProfileChange} />
              </div>

              <button className={styles.button} disabled={loading}>
                {loading ? '저장 중...' : '정보 수정 저장'}
              </button>
            </form>

            <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid #eee' }} />

            <div style={{ textAlign: 'right' }}>
              <button 
                onClick={handleLogout}
                style={{ 
                  padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', 
                  border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

        {/* 2. 직원 관리 탭 */}
        {activeTab === 'staff' && (
          <div className={styles.staffContainer}>
            <h2 className={styles.staffTitle}>직원 목록</h2>
            <div className={styles.table}>
              {staffList.length > 0 ? staffList.map(staff => (
                <div key={staff.id} className={styles.tableRow}>
                  <div className={styles.col1}>{staff.full_name}</div>
                  <div className={styles.col2}>{staff.email}</div>
                </div>
              )) : <p style={{padding:'20px', color:'#999'}}>등록된 직원이 없습니다.</p>}
            </div>
          </div>
        )}
        
        {/* 3. 데이터 관리 탭 (분리된 컴포넌트 사용) */}
        {activeTab === 'data' && (
           <DataTab session={session} />
        )}

        {/* 4. 결제 관리 탭 */}
        {activeTab === 'payment' && <p className={styles.infoText}>결제 기능 준비 중...</p>}
      </div>
    </div>
  );
}