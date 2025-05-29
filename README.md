# My Blog with Langflow Chat Assistant
블로그에 AI 채팅봇을 통합 적용 했습니다.
```
/src/components/chat/
  └── LangflowChatSimple.svelte (최종 버전)
/netlify/functions/
  └── langflow-proxy.js (API 프록시)
```
## 기능
- Astro 프레임워크 기반 블로그
- Langflow + Groq AI 기반 채팅 어시스턴트
- 블로그 콘텐츠 Q&A 지원
- 실시간 대화 기능
- 댓글 기능 추가
- 무료 AI 모델 사용 (Groq)

## 기술 스택
- **프론트엔드**: Astro, Svelte, Tailwind CSS
- **AI 플랫폼**: Langflow (Astra DataStax)
- **AI 모델**: Groq (qwen-qwq-32b think 버전)
- **호스팅**: Netlify

## Langflow 설정
Langflow Cloud를 사용하여 AI 채팅 기능을 제공합니다.
Langflow Dashboard: https://astra.datastax.com/langflow

## 구현 방식
1. **로컬 개발**: Netlify CLI를 통해 로컬 테스트 (포트: 프록시 적용되어서 랜덤. 콘솔로그 확인)
2. **프로덕션**: Netlify Functions를 통해 서버리스 프록시 구현
3. **UI**: 커스텀 챗봇 인터페이스로 사용자 경험 최적화

## <think> 태그 제거 기능 추가 (✅ 완료)
- Langflow AI가 생성한 응답에서 <think>...</think> 태그를 자동 제거
- 정규표현식을 사용하여 안전하게 처리
- 사용자에게는 깨끗한 응답만 표시
- white-space: pre-wrap 스타일 추가로 줄바꿈 유지

## 마크다운 및 수식 렌더링 기능 추가 (✅ 완료)
- marked 라이브러리를 사용하여 마크다운 렌더링
- KaTeX를 사용하여 수학 수식 렌더링
  - 인라인 수식: $...$
  - 블록 수식: $$...$$
- 지원되는 기능:
  - 헤더 (H1~H6)
  - 리스트 (순서 있는/없는)
  - 코드 블록과 인라인 코드
  - 하이퍼링크
  - 굵은 글씨, 이탤릭체
  - 테이블
  - 인용문 (blockquote)
  - 구분선 (hr)
  - 수학 수식 (LaTeX 문법)

### 구현 방식
- Vite/Svelte 환경에 맞게 동적 import 사용
- onMount에서 marked와 katex 모듈을 비동기로 로드
- 모듈이 로드된 후에만 마크다운 렌더링 적용

### 주의사항
- marked가 package.json에 있더라도 `pnpm install`로 재설치 필요할 수 있음
- KaTeX CSS는 CDN으로 로드 (성능 최적화)

## 모바일 환경 개선 (✅ 완료)
- 챗봇 창이 화면 밖으로 벗어나는 문제 해결
- viewport meta 태그에 `viewport-fit=cover` 추가
- 모바일 CSS 개선:
  - `position: fixed`로 변경하여 화면에 고정
  - width/height를 100%로 설정 (100vw/100vh 대신)
  - safe area inset 추가 (iPhone notch 등 고려)
  - 헤더와 입력 영역에 safe area 패딩 적용

## UI 개선 (✅ 완료)
- 메시지 max-width를 80%에서 100%로 변경
- assistant 메시지가 채팅창 전체 너비를 활용하도록 개선
- 더 많은 컨텐츠를 한 줄에 표시할 수 있어 가독성 향상
- PC 환경에서 채팅창 크기 조정
  - width: calc(100vw - 40px)로 화면 너비에 맞춰 자동 계산
  - max-width: 800px로 최대 너비 제한
  - height: 600px에서 750px로 증가하여 더 많은 대화 내용 표시
- 자동 스크롤 기능 추가
  - 새로운 메시지가 추가될 때마다 자동으로 가장 아래로 스크롤
  - afterUpdate 라이프사이클 훅을 사용하여 메시지 업데이트 감지
  - chatMessagesEl 참조를 통해 스크롤 위치 제어
  - 사용자가 항상 최신 응답을 볼 수 있도록 개선

  ## ✅ tobilife의 추가기능 내용입니다.
---
---

# Fuwari

A static blog template built with [Astro](https://astro.build).

[**🖥️ Live Demo (Vercel)**](https://fuwari.vercel.app)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**📦 Old Hexo Version**](https://github.com/saicaca/hexo-theme-vivia)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**🌏 中文**](https://github.com/saicaca/fuwari/blob/main/README.zh-CN.md)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**🌏 日本語**](https://github.com/saicaca/fuwari/blob/main/README.ja-JP.md)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**🌏 한국어**](https://github.com/saicaca/fuwari/blob/main/README.ko.md)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**🌏 Español**](https://github.com/saicaca/fuwari/blob/main/README.es.md)&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;
[**🌏 ไทย**](https://github.com/saicaca/fuwari/blob/main/README.th.md)

> README version: `2025-04-24`

![Preview Image](https://raw.githubusercontent.com/saicaca/resource/main/fuwari/home.png)

## ✨ Features

- [x] Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com)
- [x] Smooth animations and page transitions
- [x] Light / dark mode
- [x] Customizable theme colors & banner
- [x] Responsive design
- [ ] Comments -> 개인적으로 Giscus을 이용하여 적용했습니다.
- [x] Search
- [x] TOC

## require

- Node.js <= 22
- pnpm <= 9

## 🚀 How to Use 1

Initialize the project locally using [create-fuwari](https://github.com/L4Ph/create-fuwari).

```sh
# npm
npm create fuwari@latest

# yarn
yarn create fuwari

# pnpm
pnpm create fuwari@latest

# bun
bun create fuwari@latest

# deno
deno run -A npm:create-fuwari@latest
```

1. Edit the config file `src/config.ts` to customize your blog.
2. Run `pnpm new-post <filename>` to create a new post and edit it in `src/content/posts/`.
3. Deploy your blog to Vercel, Netlify, GitHub Pages, etc. following [the guides](https://docs.astro.build/en/guides/deploy/). You need to edit the site configuration in `astro.config.mjs` before deployment.

## 🚀 How to Use

1. [Generate a new repository](https://github.com/saicaca/fuwari/generate) from this template or fork this repository.
2. To edit your blog locally, clone your repository, run `pnpm install` AND `pnpm add sharp` to install dependencies.
   - Install [pnpm](https://pnpm.io) `npm install -g pnpm` if you haven't.
3. Edit the config file `src/config.ts` to customize your blog.
4. Run `pnpm new-post <filename>` to create a new post and edit it in `src/content/posts/`.
5. Deploy your blog to Vercel, Netlify, GitHub Pages, etc. following [the guides](https://docs.astro.build/en/guides/deploy/). You need to edit the site configuration in `astro.config.mjs` before deployment.

## ⚙️ Frontmatter of Posts

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Astro blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
lang: jp      # Set only if the post's language differs from the site's language in `config.ts`
---
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                             | Action                                           |
|:------------------------------------|:-------------------------------------------------|
| `pnpm install` AND `pnpm add sharp` | Installs dependencies                            |
| `pnpm dev`                          | Starts local dev server at `localhost:4321`      |
| `pnpm build`                        | Build your production site to `./dist/`          |
| `pnpm preview`                      | Preview your build locally, before deploying     |
| `pnpm new-post <filename>`          | Create a new post                                |
| `pnpm astro ...`                    | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro --help`                 | Get help using the Astro CLI                     |
