import { useState } from 'react';

export default function usePinForm() {
  // --- 폼 상태 ---
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeEtc, setPropertyTypeEtc] = useState('');
  
  const [isSale, setIsSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  
  const [isJeonse, setIsJeonse] = useState(false);
  const [jeonseDeposit, setJeonseDeposit] = useState('');
  const [jeonsePremium, setJeonsePremium] = useState('');
  
  const [isRent, setIsRent] = useState(false);
  const [rentDeposit, setRentDeposit] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  
  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('거래전');
  
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [imageUrls, setImageUrls] = useState(['', '', '']);
  const [validationErrors, setValidationErrors] = useState([]);

  // 폼 초기화 함수
  const resetForm = () => {
    setAddress('');
    setDetailedAddress('');
    setBuildingName('');
    setPropertyType('');
    setPropertyTypeEtc('');
    setIsSale(false); setSalePrice('');
    setIsJeonse(false); setJeonseDeposit(''); setJeonsePremium('');
    setIsRent(false); setRentDeposit(''); setRentAmount('');
    setKeywords('');
    setNotes('');
    setStatus('거래전');
    setImageUrls(['', '', '']);
    setImageFiles([null, null, null]);
    setValidationErrors([]);
  };

  // 핀 데이터로 폼 채우기 함수
  const fillForm = (pin) => {
    setAddress(pin.address || '');
    setDetailedAddress(pin.detailed_address || '');
    setBuildingName(pin.building_name || '');
    setPropertyType(pin.property_type || '');
    setPropertyTypeEtc(pin.property_type_etc || '');
    
    setIsSale(pin.is_sale || false);
    setSalePrice(pin.sale_price !== null ? String(pin.sale_price) : '');
    
    setIsJeonse(pin.is_jeonse || false);
    setJeonseDeposit(pin.jeonse_deposit !== null ? String(pin.jeonse_deposit) : '');
    setJeonsePremium(pin.jeonse_premium !== null ? String(pin.jeonse_premium) : '');
    
    setIsRent(pin.is_rent || false);
    setRentDeposit(pin.rent_deposit !== null ? String(pin.rent_deposit) : '');
    setRentAmount(pin.rent_amount !== null ? String(pin.rent_amount) : '');
    
    setKeywords(pin.keywords || '');
    setNotes(pin.notes || '');
    setStatus(pin.status || '거래전');
    setImageUrls(pin.image_urls || ['', '', '']);
    setImageFiles([null, null, null]);
    setValidationErrors([]);
  };

  return {
    address, setAddress,
    detailedAddress, setDetailedAddress,
    buildingName, setBuildingName,
    propertyType, setPropertyType,
    propertyTypeEtc, setPropertyTypeEtc,
    isSale, setIsSale, salePrice, setSalePrice,
    isJeonse, setIsJeonse, jeonseDeposit, setJeonseDeposit, jeonsePremium, setJeonsePremium,
    isRent, setIsRent, rentDeposit, setRentDeposit, rentAmount, setRentAmount,
    keywords, setKeywords, notes, setNotes, status, setStatus,
    imageFiles, setImageFiles, imageUrls, setImageUrls,
    validationErrors, setValidationErrors,
    resetForm, fillForm
  };
}