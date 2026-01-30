import React from "react";
//react 사용할때는 항상 이걸 import 해주자

function App(){
    return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>A1 Audio Mixing</h1>
            <p>앱이 정상적으로 떳습니다다</p>
        </div>
    );
}

export default App;
//이렇게 App이란 이름으로 밖으로 export도 꼭 해줘야 다른쪽에서 router로 파일위치(주소)잡을 수 있음