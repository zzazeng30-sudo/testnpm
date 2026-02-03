import React, { useState, useEffect } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient.js';
import styles from './MyPage.module.css';

// 분리한 컴포넌트 import
import DataTab from './tabs/DataTab.jsx';

export default function MyPage({ session, initialTab = 'info' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  
  // [수정] 내 정보 관리용 상태 (DB 컬럼명과 일치시킴)
  const [profileForm, setProfileForm] = useState({
    name: '',       // 기존 full_name -> name
    phone: '',      // 기존 phone_number -> phone
    position: '',   // 기존 job_title -> position (에러 원인 해결)
    address: ''
  });

  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    fetchMyProfile();
    if (activeTab === 'staff') fetchStaffList();
  }, [activeTab]);

  // 내 프로필 가져오기
  const fetchMyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setMyProfile(data);
        // [수정] DB 데이터를 폼 상태에 연결 (없으면 빈 문자열)
        setProfileForm({
          name: data.name || '',           
          phone: data.phone || '',         
          position: data.position || '',   
          address: data.address || ''
        });
      }
    } catch (error) {
      console.error('프로필 불러오기 실패:', error);
    }
  };

  // 직원 목록 가져오기
  const fetchStaffList = async () => {
    if (!myProfile?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', myProfile.company_id);
      
      if (error) throw error;
      if (data) setStaffList(data);
    } catch (error) {
      console.error('직원 목록 불러오기 실패:', error);
    }
  };

  // 입력값 변경 핸들러
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  // [핵심] 프로필 업데이트 (저장)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // [수정] DB 컬럼명에 맞춰서 update 요청
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileForm.name,
          phone: profileForm.phone,
          position: profileForm.position, // 여기가 핵심! (job_title -> position)
          address: profileForm.address,
          // updated_at은 트리거가 있다면 자동이지만, 없으면 수동 갱신 (선택사항)
          updated_at: new Date() 
        })
        .eq('id', session.user.id);

      if (error) throw error;

      alert('정보가 성공적으로 수정되었습니다.');
      // 최신 정보로 다시 불러오기
      fetchMyProfile(); 

    } catch (error) {
      alert('수정 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
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
                <input 
                  className={styles.input} 
                  type="text" 
                  value={session.user.email} 
                  disabled 
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>이름</label>
                <input 
                  className={styles.input} 
                  name="name" // DB 컬럼명 name
                  value={profileForm.name} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>연락처</label>
                <input 
                  className={styles.input} 
                  name="phone" // DB 컬럼명 phone
                  placeholder="010-0000-0000" 
                  value={profileForm.phone} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>직책 (Position)</label>
                <input 
                  className={styles.input} 
                  name="position" // DB 컬럼명 position (수정됨)
                  placeholder="예: 대표, 부장, 실장" 
                  value={profileForm.position} 
                  onChange={handleProfileChange} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>주소</label>
                <input 
                  className={styles.input} 
                  name="address" 
                  value={profileForm.address} 
                  onChange={handleProfileChange} 
                />
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
                  {/* 여기도 name과 position으로 표시 */}
                  <div className={styles.col1}>
                    <strong>{staff.name}</strong> 
                    <span style={{fontSize:'0.8em', color:'#666', marginLeft:'5px'}}>
                      ({staff.position || '직책없음'})
                    </span>
                  </div>
                  <div className={styles.col2}>{staff.email}</div>
                  <div className={styles.col3}>{staff.phone}</div>
                </div>
              )) : (
                <p style={{padding:'20px', color:'#999', textAlign:'center'}}>
                  같은 회사(Company ID) 소속의 직원이 없습니다.
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* 3. 데이터 관리 탭 */}
        {activeTab === 'data' && (
           <DataTab session={session} />
        )}

        {/* 4. 결제 관리 탭 */}
        {activeTab === 'payment' && <p className={styles.infoText}>결제 기능 준비 중...</p>}
      </div>
    </div>
  );
}