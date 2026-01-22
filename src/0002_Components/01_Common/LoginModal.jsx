import { useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient'; // 경로 확인 필요

const LoginModal = ({ onClose }) => {
  const [userId, setUserId] = useState('');
  const [userPw, setUserPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginRequest = async () => {
    if (!userId || !userPw) return alert("아이디와 비밀번호를 입력해주세요.");
    setLoading(true);

    try {
      // 1. 봇에게 '로그인 명령' 보내기
      const { error } = await supabase
        .from('bot_commands')
        .insert([{
          command_type: 'login',
          payload: { id: userId, pw: userPw },
          status: 'pending'
        }]);

      if (error) throw error;

      alert("봇에게 로그인 명령을 보냈습니다! 봇이 로그인을 시도합니다.");
      onClose(); // 창 닫기
    } catch (e) {
      alert("전송 실패: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={modalStyle.overlay}>
      <div style={modalStyle.content}>
        <h3>🤖 봇 자동 로그인</h3>
        <input 
          placeholder="세움터 아이디" 
          value={userId} 
          onChange={e => setUserId(e.target.value)}
          style={modalStyle.input}
        />
        <input 
          type="password" 
          placeholder="비밀번호" 
          value={userPw} 
          onChange={e => setUserPw(e.target.value)}
          style={modalStyle.input}
        />
        <div style={{ marginTop: '10px' }}>
          <button onClick={handleLoginRequest} disabled={loading} style={modalStyle.btn}>
            {loading ? '전송중...' : '로그인 실행'}
          </button>
          <button onClick={onClose} style={{...modalStyle.btn, background: '#ccc'}}>닫기</button>
        </div>
      </div>
    </div>
  );
};

// 간단한 스타일 (복사해서 쓰세요)
const modalStyle = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  content: { background: 'white', padding: '20px', borderRadius: '8px', width: '300px', textAlign: 'center' },
  input: { width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' },
  btn: { padding: '8px 15px', margin: '0 5px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: '#007bff', color: 'white' }
};

export default LoginModal;