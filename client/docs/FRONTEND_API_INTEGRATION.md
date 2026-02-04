# Backend API 연동 가이드 v2.0

> **Note**: `/api/sound` 단일 엔드포인트를 사용하는 실제 Server 구현에 맞춘 가이드입니다.

---

## 🔧 환경 설정 (.env.local)

모든 API 요청은 이제 `/api/sound`를 기본으로 합니다.

```env
# 통합 Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/sound

# 정적 파일 접근용
NEXT_PUBLIC_STATIC_HOST=http://localhost:8000
```

---

## 📡 요청 흐름 (Workflow)

### 1. Stem Separation (분리) 구현 예시

분리 작업은 **Upload** -> **Split** 두 단계로 나뉩니다.

```typescript
// 1. 파일 업로드
const formData = new FormData();
formData.append("file", fileObject);
const uploadRes = await fetch(`${BASE_URL}/upload`, {
  method: "POST",
  body: formData,
});
const { trackId } = await uploadRes.json();

// 2. 분리 요청
const splitRes = await fetch(`${BASE_URL}/split`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ trackId }), // 업로드로 받은 ID 사용
});
const { jobId } = await splitRes.json();

// 3. 폴링 (상태 확인)
const timer = setInterval(async () => {
  const statusRes = await fetch(`${BASE_URL}/status/${jobId}`);
  const status = await statusRes.json();
  if (status.status === "completed") {
    // 완료 처리
  }
}, 2000);
```

### 2. Transition Mix (믹싱) 구현 예시

두 개의 트랙이 모두 업로드되어 있어야 합니다.

```typescript
// trackA, trackB는 이미 업로드되어 trackId를 가지고 있다고 가정
const blendRes = await fetch(`${BASE_URL}/blend`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceId: trackA_Id,
    targetId: trackB_Id,
    mixType: "blend", // or 'drop'
  }),
});
const { jobId } = await blendRes.json();
```

---

## ⚠️ 주의 사항

1. **에러 처리**: Server는 `success: false`와 `error` 메시지를 JSON으로 반환합니다. HTTP Status Code 확인뿐만 아니라 body 내부 `success` 필드도 확인해야 합니다.
2. **트랙 ID**: 사용자가 올린 실제 파일명 대신, 서버가 생성한 Timestamp 기반 파일명(`trackId`)을 사용해야 충돌이 없습니다. 반드시 `/upload` 응답의 `trackId`를 저장해 두세요.
