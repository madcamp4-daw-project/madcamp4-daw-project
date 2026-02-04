import React from 'react';
import { Outlet } from 'react-router-dom';

const AppLayout = () => {
    return (
        <div style={{ width: '100%', minHeight: '100vh', height: '100%', overflow: 'auto', background: '#1a1a1a' }}>
            <Outlet />
        </div>
    );
};

export default AppLayout;