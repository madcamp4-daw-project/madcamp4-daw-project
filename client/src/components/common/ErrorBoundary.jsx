//React Error Boundary <-- 클래스 컴포넌트로 구현현

//getDerivedStateFromError(error) → 에러가 났을 때 state 갱신.
//componentDidCatch(error, errorInfo) → 에러 로깅 등 부가 처리.


/*
React 앱이 어떻게 돌아가는지(일부분만 설명명)

React는 기본적으로 컴포넌트 트리라는 것으로 그림을 그린다 생각해라
일단 지금까지 내가 짠 구조로 설명을 한다면
App → ErrorBoundary → BrowserRouter → Routes → AppLayout → SynthPage / MixPage
간단하게 이렇게 돌아가게 된다

react는 위에서 아래로 내려가면서(App이 최상단) render()를 호출하면서 JSX를 그리게 된다
그래서 어느 한 컴포넌트에서 render()도중에(html을 만드는 과정중에) 에러가 난다면(보통 여기서 에러라고 한다면 undefined라고 함, 잘못된 접근) 그때부턴 더 이상 그리지 않고 React가 에러 발생 상황으로 넘어감.
즉, 완전히 react가 뻗어버리는 것과 같음

그래서...

Error Boundary가 없으면
에러가 난 컴포넌트 위쪽 어딘가에서 애러를 catch를 하질 않으니까 React가 최상단은 App에서 전부 화면 내리고(뻗은 다음)
완전히 흰 화면의 콘솔에러만 보여주고 죽어버림

Error Boundary가 있으면
보통 Error Boundary라는 것은 최상단인 App 바로 밑에 위치하게 된다. 그래서 이 아래만 포기(render()하는 것을 포기)하고 
내가 정해준 UI(fallback UI라고 함)로 안내한다

“왜” 필요하냐
없을 때:
한 페이지(예: SynthPage) 안에서만 버그가 나도, 전체 앱이 내려가서 사용자는 아무것도 못 하고, 개발자만 콘솔에서 에러를 보게 된다.
있을 때:
그 페이지만 “에러 구역”으로 감싸두면, 그 구역만 “문제가 발생했습니다” 같은 화면으로 바꾸고, 나머지(네비, 다른 페이지로 이동 등)는 그대로 쓸 수 있게 할 수 있다.
*/
import React from "react";

class ErrorBoundary extends React.Component{ //클래스 컴포넌트에 선언할때는 extend로 상속받아야 한다(extend로 상속받는것, 일종의 cpp에서 class A : public B 이렇게 B를 상속받는 것과 같음)
    constructor(props){//react에서 생성자는 그냥 constructor(){} 이걸로 설정해주면 됨 --> 자료형이 없잖음
        super(props) // 클래스 컴포넌트는 반드시 super(props) 호출 //부모의 멤버 상속
        this.state = {
            hasError: false, //아래에서 이야기했듯이 getDerivedStateFromError(error)에서 이 객체값이 { hasError: true }면 에러고 false면 정상이다
            error:null, //무슨 에러인지 에러값 받아야지, error라는 변수로 받자자
        };
    }

    static getDerivedStateFromError(error) {
        //자식에서 에러가 발생시 이게 호출되서 { hasError: true } 호출
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // 에러 로깅
        console.error('ErrorBoundary caught:', error, errorInfo);
      }

    render() {
        if (this.state.hasError) {
            // 폴백 UI
            return (
            <div>
                <h2>문제가 발생했습니다.</h2>
                <button onClick={() => this.setState({ hasError: false, error: null })}>
                다시 시도
                </button>
            </div>
            );
        }
        // 정상일 때는 자식을 그대로 렌더
    return this.props.children;
    }
}
export default ErrorBoundary;







/*
ErrorBoundary에 대해서...
//일종의 전역 에러처리 try catch문이라고 생각하면 된다.

React는 에러를 잡는 API를 클래스 컴포넌트에만 줬다.
그래서 Error Boundary는 반드시 클래스 컴포넌트로 만든다.

평소:
“나(Error Boundary)는 자식만 그려준다.”
→ return this.props.children
→ 화면에는 자식들(App, 라우터, 레이아웃, 페이지들)만 보인다. Error Boundary 자체는 “보이지 않는 포장지” 같은 존재.


자식 중 하나에서 에러가 나면:
React가 가장 가까운 Error Boundary를 찾아서,
getDerivedStateFromError(error) 를 호출해 준다.
→ 여기서 “에러 났다”는 걸 state에 넣는다. (예: hasError: true)
그 다음 그 Error Boundary의 render()가 다시 호출된다.
→ 이때 state를 보고 “에러 났으면 폴백 UI를, 아니면 자식을” 그린다.

폴백 UI:
“문제가 발생했습니다”, “다시 시도” 버튼 같은 에러 전용 화면이다.
사용자는 앱이 완전히 죽은 게 아니라, “이 구역만 문제”라고 인지

//즉, 정리하면

클래스 컴포넌트 하나가
자식 트리를 감싸고 있고 (this.props.children),
에러가 나면 getDerivedStateFromError로 state를 바꾸고,
render()에서 state에 따라 “자식” vs “폴백 UI” 중 하나만 그린다.
이게 Error Boundary의 역할 + 구조
*/

//근데 왜 클래스 컴포넌트만 에러 처리가 가능한것?(정확하게는 에러 잡는 api는 클래스 컴포넌트만 가짐)
/*
함수형 컴포넌트는 "한번 호출된면 JSX만 반환"하는 하나의 함수다
--> 그래서 자식 중에서 render() 에러 발생시 이벤트를 잡는 hook기능이 React기능에는 전혀 없음

그래서 자식의 render() 에러 발생 사실을 알 수 있는 것(hook을 할 수 있는 것)은 클래스 컴포넌트 밖에 없음
클래스 컴포넌트는 클래스의 생성자에서 state를 가진다는 것(상태를 가진다)
---> 생명주기 생각하면 됨, 생명주기에 대한 state를 생성자가 가지고 있는 것이 React의 특징

생성자 내부의 메서드 중에서 getDerivedStateFromError(error)
이 getDerivedStateFromError(error)이 자식이 에러가 났다는 것에 대해서 React에게 알려줄 때 호출하는 것
여기서 return한 객체({ hasError: true }<--이런 객체를 반환함)가 생성자의 state에 반영이 된다

메서드 중에 componentDidCatch(error, errorInfo)
componentDidCatch(error, errorInfo)는 에러가 난 직후에 한번 호출해서 로그 남기고 뒷처리하는 역할을 담당함.

메서드 중에 render()
--> 이건 항상 호출됨, 여기서 this.state.hasError가 true값이면 폴백 UI, false면 자신의 자식인 this.props.children을 호출하게됨

즉 최종적으로는 클래스 컴포넌트라는 클래스에서 에러발생여부(state)와 에러 발생시 보여줄 화면(폴백 UI)를 보여준다고 생각하면 됨됨
*/




