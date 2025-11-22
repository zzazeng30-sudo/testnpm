// src/utils/formatters.js

// 날짜 포맷 (예: 2024년 5월 20일)
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  } catch (e) {
    return dateString;
  }
};

// 숫자 콤마 포맷 (예: 10,000)
export const formatNumber = (val) => {
  return Number(val || 0).toLocaleString();
};

// 매물 가격 포맷 (리스트/상세용)
export const formatPriceSimple = (pin) => {
  if (!pin) return '';
  const prices = [];
  
  if (pin.is_sale && pin.sale_price) {
    prices.push(`매매 ${formatNumber(pin.sale_price)}`);
  }
  if (pin.is_jeonse) {
    let str = `전세 ${formatNumber(pin.jeonse_deposit)}`;
    if (pin.jeonse_premium > 0) str += ` (권 ${formatNumber(pin.jeonse_premium)})`;
    prices.push(str);
  }
  if (pin.is_rent) {
    prices.push(`월세 ${formatNumber(pin.rent_deposit)} / ${formatNumber(pin.rent_amount)}`);
  }
  
  return prices.length === 0 ? "가격 정보 없음" : prices.join(' | '); 
};