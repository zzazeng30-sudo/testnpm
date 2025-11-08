import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ★ '광고 차단기' 감지 코드를 모두 '제거'합니다.
// React 앱을 즉시 렌더링하고,
// MapPage.jsx의 useEffect가 카카오맵 로드를 직접 처리하도록 되돌립니다.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)