import React from "react";
import { Outlet, NavLink } from 'react-router-dom';
import styles from './AppLayout.module.css';

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
//일단 기본적인 nav 만들기

//<Outlet />의 경우에는 나중에 Route의 element에 해당하는 SynthPage,MixPage가 렌더링 됨됨

export default AppLayout;