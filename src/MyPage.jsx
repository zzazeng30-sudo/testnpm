import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import styles from './MyPage.module.css';

/* 13일차: '마이페이지' (내 정보 수정 & 직원 관리) */
export default function MyPage({ session, initialTab }) {
    const user = session.user;
    
    // 내 정보 상태
    const [loading, setLoading] = useState(true);
    const [fullName, setFullName] = useState('');
    const [companyId, setCompanyId] = useState('');

    // 직원 목록 상태
    const [staffList, setStaffList] = useState([]);
    
    // 현재 활성화된 탭
    const [activeTab, setActiveTab] = useState(initialTab || 'info'); 

    // 1. 내 프로필 정보 및 회사 직원 목록을 불러오는 함수
    const fetchUserData = async () => {
        setLoading(true);
        try {
            // 1-1. 내 프로필 정보 로드
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, company_id')
                .eq('id', user.id) 
                .single();

            if (profileError) throw profileError;

            setFullName(profile.full_name || user.email);
            setCompanyId(profile.company_id);

            // 1-2. 회사 직원 목록 로드 (내 회사 ID가 있다면)
            if (profile.company_id) {
                const { data: staff, error: staffError } = await supabase
                    .from('profiles')
                    // ✅ 데이터베이스 관계가 깨끗해졌으므로, 이 표준 쿼리가 작동합니다.
                    .select('id, full_name, updated_at, email')
                    .eq('company_id', profile.company_id)
                    .order('updated_at', { ascending: true });

                if (staffError) throw staffError;
                setStaffList(staff);
            }

        } catch (error) {
            console.error('프로필 로드 오류:', error.message);
        } finally {
            setLoading(false);
        }
    };
    
    // 2. 내 프로필 정보 수정 함수
    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const updates = {
                id: user.id, 
                full_name: fullName,
                updated_at: new Date().toISOString(),
            };
            
            const { error } = await supabase.from('profiles').upsert(updates, {
                onConflict: 'id', 
                ignoreDuplicates: false,
            });

            if (error) throw error;
            alert('프로필이 성공적으로 업데이트되었습니다!');
        } catch (error) {
            console.error('프로필 업데이트 오류:', error.message);
            alert('프로필 업데이트에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchUserData();
    }, [user.D]);

    const renderPageContent = () => {
        if (loading) return <p>로딩 중...</p>;

        if (activeTab === 'info') {
            return (
                <form onSubmit={handleUpdateProfile} className={styles.form}>
                    <h2 className={styles.formTitle}>내 정보 수정</h2>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>이메일 (읽기 전용)</label>
                        <input className={styles.input} type="email" value={user.email} disabled />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>이름</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>회사 ID</label>
                        <input className={styles.input} type="text" value={companyId || '없음'} disabled />
                    </div>
                    
                    <button type="submit" className={styles.button} disabled={loading}>
                        {loading ? '저장 중...' : '정보 저장'}
                    </button>
                </form>
            );
        }

        if (activeTab === 'staff') {
            return (
                <div className={styles.staffContainer}>
                    <h2 className={styles.staffTitle}>우리 회사 직원 관리 (총 {staffList.length}명)</h2>
                    
                    <div className={styles.table}>
                        {/* 테이블 헤더 */}
                        <div className={styles.tableHeader}>
                            <div className={styles.col1}>이름</div>
                            <div className={styles.col2}>이메일</div>
                            <div className={styles.col3}>가입일</div>
                        </div>
                        {/* 테이블 바디 */}
                        {staffList.map((staff) => (
                            <div key={staff.id} className={styles.tableRow}> 
                                <div className={styles.col1}>{staff.full_name || '-'}</div>
                                {/* 렌더링은 staff.users.email을 사용합니다. */}
                                <div className={styles.col2}>{staff.email || '이메일 정보 없음'}</div>
                                <div className={styles.col3}>{new Date(staff.updated_at).toLocaleDateString()}</div>
                            </div>
                        ))}
                    </div>
                    
                    <p className={styles.infoText}>
                        * 직원 정보는 같은 Company ID를 가진 사용자만 표시됩니다.
                    </p>
                </div>
            );
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* 탭 네비게이션 */}
            <div className={styles.tabNav}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    내 정보 수정
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'staff' ? styles.active : ''}`}
                    onClick={() => setActiveTab('staff')}
                    disabled={loading}
                >
                    직원 관리 ({staffList.length}명)
                </button>
            </div>
            
            {/* 컨텐츠 영역 */}
            <div className={styles.contentArea}>
                {renderPageContent()}
            </div>
        </div>
    );
}