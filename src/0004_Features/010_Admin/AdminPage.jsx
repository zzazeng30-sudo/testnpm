import React, { useEffect, useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient'; // 경로가 맞는지 확인 필요 (상위 폴더 갯수 체크)

// [핵심] 여기에 'export default'가 반드시 있어야 합니다!
export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 대기 목록 불러오기
  const fetchPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      alert("목록을 불러오지 못했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // 승인/거절 처리
  const handleStatusChange = async (userId, status) => {
    if (!window.confirm(`${status === 'approved' ? '승인' : '거절'} 하시겠습니까?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: status })
        .eq('id', userId);

      if (error) throw error;

      alert("처리되었습니다.");
      fetchPendingUsers(); 
    } catch (error) {
      alert("처리 실패: " + error.message);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>데이터 로딩 중...</div>;

  return (
    <div style={{ padding: '40px' }}>
      <h2>👮‍♂️ 회원가입 승인 관리</h2>
      <p>대기 인원: {users.length}명</p>

      {users.length === 0 ? (
        <p>대기 중인 회원이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.map(user => (
            <li key={user.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', background: 'white' }}>
              <h3>{user.name} ({user.position})</h3>
              <p>{user.email} / {user.phone}</p>
              <div style={{ marginTop: '10px' }}>
                <button onClick={() => handleStatusChange(user.id, 'approved')} style={{ marginRight: '10px' }}>승인</button>
                <button onClick={() => handleStatusChange(user.id, 'rejected')}>거절</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}