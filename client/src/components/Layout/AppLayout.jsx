import React from "react";
import { Outlet, NavLink } from 'react-router-dom';

function AppLayout() {
  return (
    <div>
      <nav>
        <NavLink to="/synth">신스</NavLink>
        <NavLink to="/mix">믹스</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
//App에 이미 ErrorBoundary, BrowserRouter가 있으므로 제거한다다