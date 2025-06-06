# Biome 린터/포맷터 프로젝트 지침

## 1. 기본 설정
- 프로젝트는 Biome를 사용하므로 코드 작성 전 biome.json 설정을 확인하세요
- 포맷팅 규칙 (들여쓰기, 줄바꿈, 따옴표 등)
- 린트 규칙 (복잡도, 코드 스타일 등)

## 2. 포맷팅 규칙 (Biome 기준)
1. **들여쓰기**: 탭 사용 (스페이스 X)
2. **따옴표**: 큰따옴표 사용 (작은따옴표 X)
3. **세미콜론**: 항상 사용
4. **줄 끝 공백**: 제거
5. **파일 끝 줄바꿈**: 필수
6. **import 정렬**: 알파벳 순서

### 잘못된 예:
```javascript
import { b } from 'b'
import { a } from 'a'

const text = 'hello'
```

### 올바른 예:
```javascript
import { a } from "a";
import { b } from "b";

const text = "hello";
```

## 3. 필수 린트 규칙
1. **Optional Chaining 사용**
   ```javascript
   // ❌ 잘못된 예
   if (this.knowledgeBase && this.knowledgeBase.categories && this.knowledgeBase.categories.length > 0)
   
   // ✅ 올바른 예
   if (this.knowledgeBase?.categories?.length > 0)
   ```

2. **복잡도 관리**
   - 중첩된 조건문 대신 early return 사용
   - 긴 조건문은 별도 변수로 분리

3. **any 타입 금지**
   - TypeScript 사용 시 명확한 타입 정의

4. **forEach 대신 for...of 사용**
   ```javascript
   // ❌ 잘못된 예
   array.forEach(item => {})

   // ✅ 올바른 예
   for (const item of array) {}
   ```

## 4. 파일별 특수 규칙

### Svelte 파일 규칙 (.svelte)
- `<script>` 태그 내부는 JavaScript/TypeScript 규칙 적용
- 들여쓰기: 탭 사용
- import 문 정렬: 알파벳 순서로 자동 정렬
- **주의**: Svelte 파일 상단의 포맷팅 차이로 인한 오류 발생 가능
  - `File content differs from formatting output`
  - `Import statements differs from the output`
- Svelte 전용 구문은 예외 처리

### JavaScript 파일 규칙 (.js)
- ES6+ 문법 사용
- 모듈 시스템: ES Modules (import/export)
- 클래스보다 함수형 프로그래밍 선호

## 5. 실제 적용 예시

### 수정 전 (경고 발생):
```javascript
// 포맷팅 경고
import { BlogRAGService } from './BlogRAGService';
import { ContextDetector } from './ContextDetector';

// Optional chain 경고
if (this.knowledgeBase && this.knowledgeBase.categories && this.knowledgeBase.categories.length > 0) {
    contextPrompt += "\n블로그 카테고리 정보:\n";
}
```

### 수정 후 (경고 없음):
```javascript
// 올바른 import 순서와 포맷
import { BlogRAGService } from "./BlogRAGService";
import { ContextDetector } from "./ContextDetector";

// Optional chaining 사용
if (this.knowledgeBase?.categories?.length > 0) {
	contextPrompt += "\n블로그 카테고리 정보:\n";
}
```

## 6. 코드 작성 워크플로우

### 코드 작성 시 체크리스트
1. [ ] biome.json 설정 확인
2. [ ] 들여쓰기는 탭 사용
3. [ ] 문자열은 큰따옴표 사용
4. [ ] Optional chaining 적용 가능한지 확인
5. [ ] import 문 알파벳 순서 정렬
6. [ ] 세미콜론 누락 확인
7. [ ] 파일 끝 줄바꿈 확인

## 7. 자주 발생하는 경고와 해결법

### 1. format 경고
- 원인: 들여쓰기, 따옴표, 세미콜론 규칙 위반
- 해결: 탭 사용, 큰따옴표 사용, 세미콜론 추가

### 2. useOptionalChain 경고
- 원인: && 체이닝 사용
- 해결: ?. (optional chaining) 사용

### 3. organizeImports 경고
- 원인: import 문이 알파벳 순서로 정렬되지 않음
- 해결: Biome가 자동으로 정렬하도록 허용

### 4. Svelte 파일 특별 주의사항
- Svelte 파일은 파일 시작 부분의 포맷팅이 특별함
- `<script>` 태그 내부만 JavaScript 규칙 적용
- Svelte 템플릿 영역은 HTML/CSS 규칙 적용

## 8. 빠른 수정 명령어
```bash
# 포맷 자동 수정
pnpm biome format --write .

# 린트 자동 수정
pnpm biome check --apply .

# 특정 파일만 수정
pnpm biome format --write ./src/components/ui/*.svelte
pnpm biome check --apply ./src/components/ui/*.svelte
```

## 9. CI/CD 통합
- GitHub Actions에서 자동으로 Biome 검사 실행
- PR 생성 시 자동 검사
- 포맷팅 오류 시 빌드 실패

## 10. 개발자를 위한 팁
1. VSCode에 Biome 확장 설치 권장
2. 저장 시 자동 포맷팅 설정
3. 커밋 전 `pnpm biome check` 실행 습관화
4. Svelte 파일 작업 시 특히 주의 (import 순서, 포맷팅)
