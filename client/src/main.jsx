import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
//./App이란 건 상대 경로로 App.jsx를 가리킴

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
//여기에서는 createRoot를 이용해서 #Root에 앱을 마운트함(DOM이니까 기본 index.html에 id=root의 <div>App</div>을 렌더링 한다고 생각)

