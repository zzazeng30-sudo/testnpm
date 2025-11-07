import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. 카카오맵 API 키 설정
// (주의!) 이 값은 실제 사장님의 값으로 교체하셔야 합니다.
const YOUR_KAKAO_MAP_JS_KEY = '50f489c120715f7e0c8dc17a81808aa6' // 사장님 카카오맵 JS Key (이 값은 사장님께서 주신 값 그대로입니다)

// 전역 변수로 키를 저장하여 App.jsx에서 사용합니다.
window.KAKAO_MAP_JS_KEY = YOUR_KAKAO_MAP_JS_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Script 컴포넌트 로드는 App.jsx 내부로 옮겨졌습니다. */}
    <App />
  </React.StrictMode>,
)