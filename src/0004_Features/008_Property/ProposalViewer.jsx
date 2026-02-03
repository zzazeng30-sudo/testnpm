import React, { useEffect, useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';

export default function ProposalViewer() {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    // URL에서 '?share=...' ID 가져오기
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');

    if (shareId) {
      fetchProposal(shareId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProposal = async (shareId) => {
    // 1. 제안서 정보 가져오기
    const { data: propData, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error || !propData) {
      alert("유효하지 않거나 삭제된 제안서입니다.");
      setLoading(false);
      return;
    }

    setProposal(propData);

    // 2. 제안서에 포함된 매물 ID들로 실제 매물 정보 가져오기
    if (propData.property_ids && propData.property_ids.length > 0) {
        const { data: pinsData } = await supabase
        .from('pins')
        .select('*')
        .in('id', propData.property_ids); 

        setProperties(pinsData || []);
    }
    setLoading(false);
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center', fontSize: '1.2rem'}}>제안서를 불러오는 중입니다... 🎁</div>;
  if (!proposal) return <div style={{padding: '50px', textAlign: 'center'}}>제안서를 찾을 수 없습니다.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: '"Noto Sans KR", sans-serif', color: '#333' }}>
      <header style={{ textAlign: 'center', marginBottom: '50px', paddingBottom: '20px', borderBottom: '2px solid #eee' }}>
        <h1 style={{ color: '#2563eb', marginBottom: '10px', fontSize: '2rem' }}>{proposal.title || '고객님을 위한 추천 매물'}</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>전문가가 엄선한 <strong>{properties.length}개</strong>의 추천 매물을 확인해보세요.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
        {properties.map((pin, index) => (
          <div key={pin.id} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            {/* 이미지 영역 */}
            <div style={{ height: '300px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
               {pin.image_urls && pin.image_urls[0] ? (
                 <img src={pin.image_urls[0]} alt="매물 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <span style={{ color: '#9ca3af', fontSize: '1.2rem' }}>대표 사진 없음</span>
               )}
               <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                 추천 {index + 1}
               </div>
            </div>
            
            {/* 정보 영역 */}
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                    <span style={{ display: 'inline-block', color: '#2563eb', fontWeight: 'bold', marginBottom: '5px' }}>{pin.property_type}</span>
                    <h2 style={{ fontSize: '1.5rem', margin: '0', fontWeight: '700' }}>{pin.building_name || pin.address}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontWeight: 'bold', color: '#dc2626', fontSize: '1.25rem' }}>
                    {pin.is_sale && `매매 ${Number(pin.sale_price).toLocaleString()}`}
                    {pin.is_jeonse && `전세 ${Number(pin.jeonse_deposit).toLocaleString()}`}
                    {pin.is_rent && `월세 ${Number(pin.rent_deposit).toLocaleString()} / ${Number(pin.rent_amount).toLocaleString()}`}
                    </span>
                </div>
              </div>
              
              <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '10px' }}>📝 상세 설명</h3>
                  <p style={{ lineHeight: '1.7', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>
                    {pin.notes || '상세 설명이 없습니다.'}
                  </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {pin.keywords && pin.keywords.split(',').map((k, i) => (
                    <span key={i} style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: '500' }}>
                        {k.trim().startsWith('#') ? k.trim() : `#${k.trim()}`}
                    </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer style={{ marginTop: '80px', padding: '40px 0', textAlign: 'center', color: '#9ca3af', borderTop: '1px solid #eee' }}>
        <p style={{ margin: 0 }}>본 제안서는 고객님을 위해 특별히 작성된 자료입니다.</p>
        <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: '#4b5563' }}>문의: 담당 공인중개사</p>
      </footer>
    </div>
  );
}