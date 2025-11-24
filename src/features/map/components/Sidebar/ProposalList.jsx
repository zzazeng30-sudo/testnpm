import React, { useState } from 'react';
import { useMap } from '../../../../contexts/MapContext';
import { supabase } from '../../../../lib/supabaseClient';
import styles from '../../styles/MapSidebar.module.css';

export default function ProposalList() {
  const { proposalPins, setProposalPins, setIsProposalOpen, session } = useMap();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleRemove = (id) => {
    setProposalPins(prev => prev.filter(p => p.id !== id));
  };

  const handleCreateLink = async () => {
    if (proposalPins.length === 0) return;
    if (!title.trim()) {
        alert('제안서 제목을 입력해주세요.');
        return;
    }
    setLoading(true);

    // proposals 테이블에 저장
    const { data, error } = await supabase.from('proposals').insert({
      user_id: session.user.id,
      title: title,
      property_ids: proposalPins.map(p => p.id)
    }).select().single();

    if (error) {
        alert('제안서 생성 실패: ' + error.message);
    } else if (data) {
        const url = `${window.location.origin}?share=${data.id}`;
        setShareLink(url);
    }
    setLoading(false);
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(shareLink);
      alert('링크가 복사되었습니다! 고객에게 전달하세요.');
  };

  return (
    <div className={styles.readOnlyContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={styles.readOnlyTitle}>내보내기 목록</h2>
          <button 
            onClick={() => setIsProposalOpen(false)}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af' }}
          >
            &times;
          </button>
      </div>
      
      <div className={styles.manageInfoText}>
         매물을 우클릭하여 이 목록에 추가하세요.<br/>
         고객에게 보낼 제안서를 생성할 수 있습니다.
      </div>

      {/* 목록 영역 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0', maxHeight: '400px', overflowY: 'auto' }}>
        {proposalPins.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>담은 매물이 없습니다.</p>
        ) : (
            proposalPins.map((pin, index) => (
                <div key={pin.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#374151' }}>{pin.building_name || '건물명 없음'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.address}</div>
                    </div>
                    <button 
                        onClick={() => handleRemove(pin.id)}
                        style={{ marginLeft: '0.5rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                        삭제
                    </button>
                </div>
            ))
        )}
      </div>
      
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <label className={styles.label}>제안서 제목</label>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="예: 홍길동 고객님 추천 매물 3선"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          {shareLink ? (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                      {shareLink}
                  </p>
                  <button className={`${styles.button} ${styles.buttonBlue}`} onClick={handleCopyLink}>
                      🔗 링크 복사하기
                  </button>
                  <button 
                    className={`${styles.button} ${styles.buttonGray}`} 
                    onClick={() => { setShareLink(''); setTitle(''); setProposalPins([]); }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    새로 만들기
                  </button>
              </div>
          ) : (
              <button 
                className={`${styles.button} ${styles.buttonGreen}`} 
                style={{ marginTop: '1rem' }}
                onClick={handleCreateLink}
                disabled={loading || proposalPins.length === 0}
              >
                {loading ? '링크 생성 중...' : '📤 공유 링크 생성'}
              </button>
          )}
      </div>
    </div>
  );
}