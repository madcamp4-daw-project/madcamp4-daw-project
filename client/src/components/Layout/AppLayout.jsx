import React from "react";
import { Outlet, NavLink } from 'react-router-dom';

function AppLayout() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex',
        gap: '20px',
        padding: '15px 30px',
        background: 'rgba(10, 10, 15, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        zIndex: 100
      }}>
        <NavLink 
          to="/synth" 
          style={({ isActive }) => ({
            color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'color 0.2s'
          })}
        >
          🎹 Synth
        </NavLink>
        <NavLink 
          to="/mix" 
          style={({ isActive }) => ({
            color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
            textDecoration: 'none',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            transition: 'color 0.2s'
          })}
        >
          🎧 Mix
        </NavLink>
      </nav>
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
//App에 이미 ErrorBoundary, BrowserRouter가 있으므로 제거한다다