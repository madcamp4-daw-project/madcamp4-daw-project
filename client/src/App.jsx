import React from "react";
//react 사용할때는 항상 이걸 import 해주자
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';  // ← 이 줄 추가
import AppLayout from './components/Layout/AppLayout';
import SynthPage from './pages/SynthPage';
import MixPage from './pages/MixPage';
//route를 설정 (파일 위치로 안내내)
// 일단 /으로 접속할 경우 /synth로 리다이렉트됨
// /synth → SynthPage, /mix → MixPage가 AppLayout의 <Outlet /> 자리에 렌더되게끔 일단 설정정


function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/synth" replace />} />
            <Route path="synth" element={<SynthPage />} />
            <Route path="mix" element={<MixPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
  export default App;
//이렇게 App이란 이름으로 밖으로 export도 꼭 해줘야 다른쪽에서 router로 파일위치(주소)잡을 수 있음