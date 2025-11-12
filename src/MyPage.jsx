import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import styles from './MyPage.module.css';

/* 21일차 (수정): 연락처, 주소 필드 추가 */
export default function MyPage({ session, initialTab }) {
    const user = session.user;
    
    // 내 정보 상태
    const [loading, setLoading] = useState(true);
    const [fullName, setFullName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [phone, setPhone] = useState('');     // ★ 21일차 추가
    const [address, setAddress] = useState(''); // ★ 21일차 추가

    // 직원 목록 상태
    const [staffList, setStaffList] = useState([]);
    
    // 현재 활성화된 탭
    const [activeTab, setActiveTab] = useState(initialTab || 'info'); 

    // 1. (★수정★) 내 프로필 정보 (phone, address 포함)
    const fetchUserData = async () => {
        setLoading(true);
        try {
            // 1-1. 내 프로필 정보 로드
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, company_id, phone, address') // ★ 21일차: phone, address 추가
                .eq('id', user.id) 
                .single();

            if (profileError) throw profileError;

            setFullName(profile.full_name || user.email);
            setCompanyId(profile.company_id);
            setPhone(profile.phone || '');     // ★ 21일차 추가
            setAddress(profile.address || ''); // ★ 21일차 추가

            // 1-2. 회사 직원 목록 로드 (변경 없음)
            if (profile.company_id) {
                const { data: staff, error: staffError } = await supabase
                    .from('profiles')
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
    
    // 2. (★수정★) 내 프로필 정보 수정 (phone, address 포함)
    const handleUpdateProfile = async (event) => {
        event.preventDefault();
        setLoading(true);
        try {
            const updates = {
                id: user.id, 
                full_name: fullName,
                phone: phone,     // ★ 21일차 추가
                address: address, // ★ 21일차 추가
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
    }, [user.id]); // (의존성 배열 수정)

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
                    
                    {/* --- ★ 21일차: 연락처, 주소 필드 추가 --- */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>연락처</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>사무실 주소 (지도 초기 위치)</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    {/* --- (여기까지) --- */}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>회사 ID (읽기 전용)</label>
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
                    {/* ... (직원 관리 JSX - 변경 없음) ... */}
                </div>
            );
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* ... (탭 네비게이션, 컨텐츠 영역 JSX - 변경 없음) ... */}
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
            
            <div className={styles.contentArea}>
                {renderPageContent()}
            </div>
        </div>
    );
}