/**
 * [Revision: 1.2]
 * - handleClearAllProperties 함수 추가 (매물 전체 삭제 기능)
 * - 2단계 확인 창(Confirm) 적용으로 안전성 강화
 */
import { useState } from 'react';
import { supabase } from '../../../0005_Lib/supabaseClient';

export const useCsvManager = (session) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });

  // ------------------------------------------------------------------
  // 1. 다운로드 로직 (기존 유지)
  // ------------------------------------------------------------------
  const handleDownloadCSV = async () => {
    try {
      setLoading(true);
      const { data: pins, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!pins || pins.length === 0) {
        alert("다운로드할 데이터가 없습니다.");
        return;
      }

      const columns = [
        { key: 'row_index', label: '구분' },
        { key: 'status', label: '상태' },
        { key: 'property_type', label: '매물유형' },
        { key: 'building_name', label: '건물명' },
        { key: 'address', label: '주소' },
        { key: 'detailed_address', label: '상세주소' },
        { key: 'sale_price', label: '매매가(만원)' },
        { key: 'sale_deposit', label: '매매보증금(만원)' },
        { key: 'sale_key_money', label: '매매권리금(만원)' },
        { key: 'jeonse_price', label: '전세가(만원)' },
        { key: 'jeonse_deposit_col', label: '전세보증금(만원)' },
        { key: 'jeonse_key_money', label: '전세권리금(만원)' },
        { key: 'rent_amount', label: '월세(만원)' },
        { key: 'rent_deposit', label: '월세보증금(만원)' },
        { key: 'rent_key_money', label: '월세권리금(만원)' },
        { key: 'keywords', label: '키워드' },
        { key: 'notes', label: '메모' },
        { key: 'lat', label: '위도' },
        { key: 'lng', label: '경도' }
      ];

      const csvRows = pins.map((row, index) => {
        return columns.map(col => {
          let value = '';
          if (col.key === 'row_index') value = index + 1;
          else if (col.key === 'sale_price') value = row.is_sale ? row.sale_price : '';
          else if (col.key === 'sale_deposit') value = ''; 
          else if (col.key === 'sale_key_money') value = row.is_sale ? row.key_money : '';
          else if (col.key === 'jeonse_price') value = row.is_jeonse ? row.jeonse_deposit : '';
          else if (col.key === 'jeonse_deposit_col') value = ''; 
          else if (col.key === 'jeonse_key_money') value = row.is_jeonse ? row.key_money : '';
          else if (col.key === 'rent_amount') value = row.is_rent ? row.rent_amount : '';
          else if (col.key === 'rent_deposit') value = row.is_rent ? row.rent_deposit : '';
          else if (col.key === 'rent_key_money') value = row.is_rent ? row.key_money : '';
          else if (col.key === 'lat') value = row.lat || '';
          else if (col.key === 'lng') value = row.lng || '';
          else value = row[col.key];

          const safeValue = value === null || value === undefined ? '' : String(value);
          return `"${safeValue.replace(/"/g, '""')}"`;
        }).join(',');
      });

      const headerLabels = columns.map(c => c.label).join(',');
      const headerKeys = columns.map(c => c.key).join(',');

      const csvContent = ['\uFEFF' + headerLabels, headerKeys, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mypage_data_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('다운로드 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // 2. CSV 파서 & 지오코딩 헬퍼 함수
  // ------------------------------------------------------------------
  const parseCSV = (text) => {
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; 
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentVal);
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    if (currentVal || currentRow.length > 0) {
      currentRow.push(currentVal);
      rows.push(currentRow);
    }
    return rows;
  };

  const getCoordsWithTimeout = (geocoder, address, timeout = 2000) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Timeout"));
      }, timeout);

      geocoder.addressSearch(address, (result, status) => {
        clearTimeout(timer); 
        if (status === window.kakao.maps.services.Status.OK) {
          resolve({ lat: result[0].y, lng: result[0].x });
        } else {
          reject(new Error("Address not found"));
        }
      });
    });
  };

  const getAddressFromCoords = (geocoder, lat, lng) => {
    return new Promise((resolve) => {
      if (!lat || !lng) {
        resolve('');
        return;
      }
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const addr = result[0].road_address 
            ? result[0].road_address.address_name 
            : result[0].address.address_name;
          resolve(addr);
        } else {
          resolve('');
        }
      });
    });
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ------------------------------------------------------------------
  // 3. 업로드 로직 (기존 유지)
  // ------------------------------------------------------------------
  const handleUploadCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      alert("지도 API가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.");
      e.target.value = '';
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: 0, percent: 0 });
    
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = parseCSV(text);

        if (rows.length < 3) {
          throw new Error("데이터 형식이 올바르지 않습니다. (1행:한글, 2행:영문키, 3행~:데이터)");
        }

        const headers = rows[1]; 
        const dataRows = rows.slice(2);
        const validRows = dataRows.filter(row => row.length > 1);
        const validCount = validRows.length;

        if (validCount === 0) {
          alert('저장할 데이터가 없습니다.');
          setLoading(false);
          return;
        }

        const geocoder = new window.kakao.maps.services.Geocoder();
        const BATCH_SIZE = 20; 
        let processedCount = 0;
        let chunkBuffer = [];

        for (let i = 0; i < validCount; i++) {
          const row = validRows[i];
          const rowData = {};
          
          headers.forEach((key, idx) => {
            rowData[key] = row[idx];
          });

          const salePrice = Number(rowData['sale_price']?.replace(/,/g, '') || 0);
          const jeonsePrice = Number(rowData['jeonse_price']?.replace(/,/g, '') || 0);
          const rentAmount = Number(rowData['rent_amount']?.replace(/,/g, '') || 0);
          const rentDeposit = Number(rowData['rent_deposit']?.replace(/,/g, '') || 0);

          let isSale = (salePrice > 0);
          let isJeonse = (jeonsePrice > 0);
          let isRent = (rentAmount > 0 || rentDeposit > 0);

          if (!isSale && !isJeonse && !isRent) {
            isRent = true;
          }

          const k1 = Number(rowData['sale_key_money']?.replace(/,/g, '') || 0);
          const k2 = Number(rowData['jeonse_key_money']?.replace(/,/g, '') || 0);
          const k3 = Number(rowData['rent_key_money']?.replace(/,/g, '') || 0);
          const keyMoney = Math.max(k1, k2, k3);

          let address = rowData['address']?.trim();
          const csvLat = rowData['lat'] ? Number(rowData['lat']) : 0;
          const csvLng = rowData['lng'] ? Number(rowData['lng']) : 0;
          let lat = 0; let lng = 0;

          if (csvLat && csvLng) {
             lat = csvLat;
             lng = csvLng;
             if (!address) {
                try {
                   address = await getAddressFromCoords(geocoder, lat, lng);
                } catch (err) {
                   console.warn("역지오코딩 실패", err);
                }
             }
          } 
          else if (address) {
            try {
              const coords = await getCoordsWithTimeout(geocoder, address);
              lat = Number(coords.lat);
              lng = Number(coords.lng);
            } catch (err) {
              console.warn(`주소 변환 실패: ${address}`);
            }
          }

          chunkBuffer.push({
            user_id: session.user.id,
            status: rowData['status'] || '거래전',
            property_type: rowData['property_type'] || '아파트',
            building_name: rowData['building_name'] || '',
            address: address || '',
            detailed_address: rowData['detailed_address'] || '',
            lat, lng,
            is_sale: isSale,     
            is_jeonse: isJeonse, 
            is_rent: isRent,     
            sale_price: salePrice, 
            jeonse_deposit: jeonsePrice,
            rent_deposit: rentDeposit, 
            rent_amount: rentAmount,
            key_money: keyMoney,
            keywords: rowData['keywords'] || '',
            notes: rowData['notes'] || ''
          });

          if (chunkBuffer.length >= BATCH_SIZE || i === validCount - 1) {
            if (chunkBuffer.length > 0) {
              const { error } = await supabase.from('pins').insert(chunkBuffer);
              if (error) throw error;
            }
            
            processedCount += chunkBuffer.length;
            chunkBuffer = []; 

            setProgress({
              current: processedCount,
              total: validCount,
              percent: Math.round((processedCount / validCount) * 100)
            });

            await delay(10); 
          }
        }

        alert(`${processedCount}건이 성공적으로 업로드되었습니다.`);
        window.location.reload(); 

      } catch (err) {
        console.error(err);
        alert('업로드 중단: ' + err.message);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // ------------------------------------------------------------------
  // 4. ★ [추가됨] 매물 전체 삭제 로직
  // ------------------------------------------------------------------
  const handleClearAllProperties = async () => {
    // 1단계 확인
    if (!window.confirm("정말로 모든 매물을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.")) {
      return;
    }
    
    // 2단계 재확인 (안전장치)
    if (!window.confirm("진짜로 삭제하시겠습니까? 다시 한번 확인해 주세요.")) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;

      alert("모든 매물이 성공적으로 삭제되었습니다.");
      window.location.reload(); // 리스트 갱신을 위해 새로고침
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    progress,
    handleDownloadCSV,
    handleUploadCSV,
    handleClearAllProperties // 컴포넌트에서 쓸 수 있도록 반환
  };
};