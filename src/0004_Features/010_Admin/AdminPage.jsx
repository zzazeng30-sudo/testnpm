import React, { useEffect, useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 초대 링크 관련 상태
  const [inviteRole, setInviteRole] = useState(1);
  const [generatedLink, setGeneratedLink] = useState('');

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert("데이터 로딩 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'members') fetchAllUsers();
  }, [activeTab]);

  // [핵심 로직] 회원 정보 업데이트 및 승인 시 ID 자동 생성
  const updateUserInfo = async (userId, updateData) => {
    try {
      let finalData = { ...updateData };

      // 승인(approved) 버튼을 눌렀을 때만 실행
      if (updateData.status === 'approved') {
        const targetUser = users.find(u => u.id === userId);
        
        // 이미 업체 ID가 있는 경우는 패스, 없는 경우만 새로 생성
        if (!targetUser.company_id) {
          // UUID v4 형식의 고유 식별자 생성
          const newId = crypto.randomUUID();
          finalData.company_id = newId;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(finalData)
        .eq('id', userId);

      if (error) throw error;
      
      // 성공 알림
      if (updateData.status === 'approved') {
        alert("승인 완료 및 업체 식별 ID가 발급되었습니다.");
      } else {
        alert("수정되었습니다.");
      }

      fetchAllUsers(); 
    } catch (error) {
      // 만약 여전히 외래키 에러가 난다면 하단의 SQL 가이드를 참고하세요.
      alert("업데이트 실패: " + error.message);
    }
  };

  const handleRoleChange = async (userId, userName, newRole) => {
    if (window.confirm(`[${userName}]님의 권한을 변경하시겠습니까?`)) {
      await updateUserInfo(userId, { role: newRole });
    } else {
      fetchAllUsers();
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("ID가 복사되었습니다.");
  };

  const handleGenerateLink = () => {
    const baseUrl = window.location.origin;
    const newLink = `${baseUrl}/signup?role=${inviteRole}`;
    setGeneratedLink(newLink);
    navigator.clipboard.writeText(newLink);
    alert(`초대 링크가 복사되었습니다!`);
  };

  const formatCompanyId = (id) => {
    if (!id) return '미발급';
    return `${id.slice(0, 5)}...${id.slice(-4)}`;
  };

  return (
    <div className={styles.adminContainer}>
      <header className={styles.topHeader}>
        <h1>System Admin</h1>
        <div className={styles.tabMenu}>
          <button className={activeTab === 'members' ? styles.activeTab : ''} onClick={() => setActiveTab('members')}>회원 관리</button>
          <button className={activeTab === 'invite' ? styles.activeTab : ''} onClick={() => setActiveTab('invite')}>초대장 관리</button>
        </div>
      </header>

      {activeTab === 'members' ? (
        <main className={styles.mainContent}>
          <div className={styles.tableHeader}>
            <h2>사용자 리스트 <span className={styles.count}>{users.length}</span></h2>
            <button onClick={fetchAllUsers} className={styles.refreshBtn}>🔄 새로고침</button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>사용자 정보</th>
                  <th>역할 설정</th>
                  <th>업체 식별 ID (클릭:복사)</th>
                  <th>상태</th>
                  <th>가입/접속</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className={styles.userInfo}>
                      <div className={styles.userName}>{user.name || '이름없음'}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                      <div className={styles.userPhone}>{user.phone}</div>
                    </td>
                    <td>
                      <select 
                        className={`${styles.roleSelect} ${styles[`roleColor${user.role}`]}`}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, user.name, parseInt(e.target.value))}
                      >
                        <option value={0}>관리자</option>
                        <option value={1}>사장</option>
                        <option value={2}>직원</option>
                      </select>
                    </td>
                    <td>
                      <div className={styles.idContainer}>
                        <span 
                          className={styles.idBadge} 
                          onClick={() => copyToClipboard(user.company_id)}
                          title="클릭하여 복사"
                        >
                          {formatCompanyId(user.company_id)}
                        </span>
                        <input 
                          type="text" 
                          className={styles.idInput} 
                          placeholder="수동 연결용 ID 입력"
                          onBlur={(e) => {
                            if(e.target.value) updateUserInfo(user.id, { company_id: e.target.value });
                            e.target.value = "";
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className={`${styles.statusPill} ${styles[user.status]}`}>
                        {user.status === 'approved' ? '활동 중' : '대기'}
                      </div>
                    </td>
                    <td className={styles.timeInfo}>
                      <div className={styles.createdAt}>{new Date(user.created_at).toLocaleDateString()}</div>
                      <div className={styles.lastLogin}>{user.last_sign_in_at ? "최근접속 중" : "기록없음"}</div>
                    </td>
                    <td>
                      {user.status === 'pending' ? (
                        <button onClick={() => updateUserInfo(user.id, { status: 'approved' })} className={styles.actionBtnApprove}>승인하기</button>
                      ) : (
                        <button onClick={() => updateUserInfo(user.id, { status: 'pending' })} className={styles.actionBtnWait}>대기전환</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      ) : (
        <section className={styles.inviteSection}>
          <div className={styles.inviteCard}>
            <h3>초대 링크 생성</h3>
            <div className={styles.inviteForm}>
              <select className={styles.modernSelect} value={inviteRole} onChange={(e) => setInviteRole(parseInt(e.target.value))}>
                <option value={1}>사장님용 (Role 1)</option>
                <option value={2}>직원용 (Role 2)</option>
              </select>
              <button className={styles.premiumBtn} onClick={handleGenerateLink}>링크 생성 및 복사</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}