# My Blog with Langflow Chat Assistant

블로그에 AI 채팅 어시스턴트가 통합되었습니다.

## 기능
- Astro 프레임워크 기반 블로그
- Langflow + Groq AI 기반 채팅 어시스턴트
- 블로그 콘텐츠 Q&A 지원
- 실시간 대화 기능
- 무료 AI 모델 사용 (Groq)

## 기술 스택
- **프론트엔드**: Astro, Svelte, Tailwind CSS
- **AI 플랫폼**: Langflow (Astra DataStax)
- **AI 모델**: Groq (meta-llama/llama-4-maverick-17b-128e-instruct)
- **호스팅**: Netlify

## 설정 방법

1. 의존성 설치
   ```bash
   pnpm install
   ```

2. 개발 서버 실행
   ```bash
   pnpm dev
   ```

3. 빌드
   ```bash
   pnpm build
   ```

## Langflow 설정

이 블로그는 Langflow Cloud를 사용하여 AI 채팅 기능을 제공합니다.
- Flow ID: `790574cb-2624-492b-a3a5-e0e118c1416f`
- 모델: Groq (무료)

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
