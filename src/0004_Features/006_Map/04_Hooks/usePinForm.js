/**
 * [Revision: 62.0]
 * - imageUrls 상태 추가: 사진 URL 목록 관리
 */
import { useState, useCallback } from 'react';

export default function usePinForm() {
  const [form, setForm] = useState({
    status: '거래전',
    propertyType: '아파트',
    buildingName: '',
    address: '',
    detailedAddress: '',
    transactionType: '매매',
    price: '',
    monthlyRent: '',
    deposit: '',
    keyMoney: '',
    maintenanceFee: '',
    area: '',
    roomCount: '',
    bathroomCount: '',
    floor: '',
    keywords: '',
    notes: '',
    imageUrls: [] // ★ 이미지 URL 배열 추가
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleTypeSelect = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({
      status: '거래전',
      propertyType: '아파트',
      buildingName: '',
      address: '',
      detailedAddress: '',
      transactionType: '매매',
      price: '',
      monthlyRent: '',
      deposit: '',
      keyMoney: '',
      maintenanceFee: '',
      area: '',
      roomCount: '',
      bathroomCount: '',
      floor: '',
      keywords: '',
      notes: '',
      imageUrls: [] // 초기화
    });
  }, []);

  const fillForm = useCallback((pin) => {
    if (!pin) return;
    setForm({
      status: pin.status || '거래전',
      propertyType: pin.property_type || '아파트',
      buildingName: pin.building_name || '',
      address: pin.address || '',
      detailedAddress: pin.detailed_address || '',
      transactionType: pin.is_sale ? '매매' : (pin.is_jeonse ? '전세' : '월세'),
      price: pin.sale_price || pin.jeonse_deposit || pin.rent_deposit || '',
      monthlyRent: pin.rent_amount || '',
      deposit: pin.rent_deposit || '',
      keyMoney: pin.key_money || '',
      maintenanceFee: pin.maintenance_fee || '',
      area: pin.area || '',
      roomCount: pin.room_count || '',
      bathroomCount: pin.bathroom_count || '',
      floor: pin.floor || '',
      keywords: pin.keywords || '',
      notes: pin.notes || '',
      imageUrls: pin.image_urls || [] // 기존 이미지 로드
    });
  }, []);

  return { form, setForm, handleChange, handleTypeSelect, resetForm, fillForm };
}