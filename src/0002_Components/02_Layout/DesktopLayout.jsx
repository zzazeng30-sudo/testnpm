import React, { useState, useMemo } from 'react';
import { mainMenus, menuData } from './menuConfig'; // 확장자 제거 확인

export default function DesktopLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[1]); 
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[1]][0].id);

  const currentPage = useMemo(() => 
    menuData[activeMainMenu].find(menu => menu.id === activeSubMenu)
  , [activeMainMenu, activeSubMenu]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', borderBottom: '1px solid #ddd', background: '#fff' }}>
        {mainMenus.map(m => (
          <button 
            key={m} 
            style={{ padding: '15px', background: 'none', border: 'none', fontWeight: activeMainMenu === m ? 'bold' : 'normal' }}
            onClick={() => { setActiveMainMenu(m); setActiveSubMenu(menuData[m][0].id); }}
          >
            {m}
          </button>
        ))}
      </header>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {currentPage?.component && React.cloneElement(currentPage.component, { session })}
      </main>
    </div>
  );
}