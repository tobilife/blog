# Iframe 챗봇 PostMessage 통신 가이드

이 문서는 부모 창(블로그)과 iframe(챗봇) 간의 통신 프로토콜을 설명합니다.

## 1. 메시지 프로토콜

### 부모 → Iframe 메시지

```javascript
// 챗봇이 열렸음을 알림
{
  type: "chat-opened",
  isMobile: boolean  // 모바일 여부
}

// 챗봇을 닫으라는 신호
{
  type: "chat-closing"
}
```

### Iframe → 부모 메시지

```javascript
// 챗봇을 닫아달라는 요청
{
  type: "close-chat"
}
```

## 2. Iframe에서 구현해야 할 코드

iframe으로 임베드되는 챗봇 애플리케이션에서 다음 코드를 추가해야 합니다:

```javascript
// PostMessage 리스너 등록
window.addEventListener('message', (event) => {
  // 보안: origin 확인 (블로그 도메인으로 변경 필요)
  if (event.origin !== 'https://tobilife.netlify.app') {
    return;
  }

  // 메시지 처리
  switch (event.data.type) {
    case 'chat-opened':
      // 모바일/데스크톱에 따른 UI 조정
      if (event.data.isMobile) {
        // 모바일 전체화면 모드 설정
        document.body.classList.add('mobile-embed');
      }
      break;
      
    case 'chat-closing':
      // 닫기 애니메이션이나 정리 작업
      // 필요시 상태 저장
      break;
  }
});

// 부모 창에 닫기 요청 보내기 (예: 내부 닫기 버튼 클릭 시)
function requestClose() {
  window.parent.postMessage(
    { type: 'close-chat' },
    'https://tobilife.netlify.app'  // 블로그 도메인
  );
}
```

## 3. 모바일 스타일 권장사항

iframe 내부의 챗봇에 다음 CSS를 추가하는 것을 권장합니다:

```css
/* 기본 임베드 스타일 */
body {
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}

/* 모바일 임베드 모드 */
body.mobile-embed {
  /* iOS 안전 영역 고려 */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 모바일에서 헤더가 있다면 상단 여백 추가 */
body.mobile-embed .chat-header {
  margin-top: 60px; /* 부모창 닫기 버튼 공간 */
}
```

## 4. 보안 고려사항

1. **Origin 검증**: 항상 `event.origin`을 확인하여 신뢰할 수 있는 도메인에서만 메시지를 수신
2. **메시지 구조 검증**: 받은 메시지의 구조와 타입을 검증
3. **Sandbox 속성**: iframe에 적절한 sandbox 속성 설정

## 5. 테스트 시나리오

1. **데스크톱**
   - 챗봇 열기/닫기
   - ESC 키로 닫기
   - 외부 클릭으로 닫기 (옵션)

2. **모바일**
   - 전체화면 전환
   - 닫기 버튼 표시/작동
   - 화면 회전 대응
   - iOS/Android 안전 영역 대응

## 6. 추가 기능 확장 예시

```javascript
// 테마 동기화
{
  type: "theme-change",
  theme: "dark" | "light"
}

// 사용자 정보 전달
{
  type: "user-info",
  userId: string,
  userName: string
}

// 분석 이벤트
{
  type: "analytics-event",
  event: string,
  data: object
}
```
