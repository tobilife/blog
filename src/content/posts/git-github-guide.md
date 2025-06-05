---
title: Git/GitHub 명령어 가이드
published: 2024-02-18
description: Git과 GitHub를 사용하여 프로젝트를 효율적으로 관리하고 협업하는 데 필요한 핵심 명령어들을 초보자의 눈높이에 맞춰 설명합니다.
category: Git&GitHub
tags:
  - Git
  - GitHub
  - 명령어
  - 가이드
  - 초보
image: /images/uploads/github-6980894_640.webp
draft: false
---
# 🚀 Git/GitHub 명령어 완벽 가이드 (초보자를 위한 상세 설명)

이 문서는 Git과 GitHub를 사용하여 프로젝트를 효율적으로 관리하고 협업하는 데 필요한 핵심 명령어들을<br>
초보자의 눈높이에 맞춰 설명합니다. 각 명령어의 개념과 사용법, 그리고 실제 시나리오에서의 활용법을<br>
예시와 함께 제공합니다.

:::tip\[처음 시작하시나요?]
이 가이드는 Git을 처음 접하는 분들을 위해 작성되었습니다.<br>
천천히 따라하면서 하나씩 익혀보세요!
:::

- - -

## 📦 1. 시작하기: Git 및 환경 설정

### 1.1. Git 설치 확인

Git이 컴퓨터에 제대로 설치되었는지 확인하는 명령어입니다.

```bash
$ git --version
```

**💡 설명:**<br>
이 명령어를 실행했을 때 Git 버전 정보(예: `git version 2.xx.x`)가 표시된다면<br>
Git이 정상적으로 설치된 것입니다. 만약 오류가 발생한다면 Git을 설치해야 합니다.

:::note\[Windows 사용자를 위한 팁]
Windows에서는 Git Bash를 사용하시는 것을 추천합니다.<br>
[Git 공식 사이트](https://git-scm.com)에서 다운로드할 수 있습니다.
:::

<br>

### 1.2. 사용자 정보 설정

Git 커밋에 사용자 이름과 이메일 주소를 기록하도록 설정합니다.<br>
이 정보는 사용자가 만든 커밋을 식별하는 데 사용됩니다.

#### 🏷️ 사용자 이름 설정

```bash
$ git config --global user.name "홍길동"
```

#### 📧 사용자 이메일 설정

```bash
$ git config --global user.email "honggildong@example.com"
```

**💡 설명:**<br>
`--global` 옵션은 이 설정을 사용자의 컴퓨터에 있는 모든 Git 저장소에 적용합니다.<br>
특정 저장소에만 다른 설정을 하고 싶다면 해당 저장소에서 `--global` 없이 명령어를 실행하면 됩니다.

:::important\[주의사항]
GitHub에 가입한 이메일과 동일한 이메일을 사용하는 것이 좋습니다.<br>
이렇게 하면 GitHub가 여러분의 커밋을 자동으로 프로필과 연결해줍니다.
:::

<br>

### 1.3. 기본 브랜치 이름 설정

새로운 Git 저장소를 초기화할 때 기본 브랜치 이름을 `master` 대신 `main`으로 설정하도록 합니다.<br>
최근에는 `main`을 기본 브랜치 이름으로 사용하는 추세입니다.

```bash
$ git config --global init.defaultBranch main
```

**💡 설명:**<br>
이 설정을 해두면 앞으로 `git init`으로 새로운 저장소를 만들 때 자동으로 `main` 브랜치가 생성됩니다.

<br>

### 1.4. 기본 텍스트 에디터 설정 (선택 사항)

Git은 커밋 메시지를 작성하거나 병합 충돌을 해결할 때 텍스트 에디터를 엽니다.<br>
기본으로 열릴 에디터를 지정할 수 있습니다.

#### 🔧 VS Code를 기본 에디터로 설정하는 예시

```bash
$ git config --global core.editor "code --wait"
```

**💡 다른 에디터 설정 예시:**

```bash
# Sublime Text
$ git config --global core.editor "subl -w"

# Nano
$ git config --global core.editor "nano"

# Vim
$ git config --global core.editor "vim"
```

<br>

### 1.5. 설정 확인하기

지금까지 설정한 내용을 확인해보세요!

```bash
$ git config --list
```

- - -

## 🏠 2. 로컬 저장소 생성 및 관리의 기본

### 2.1. 새로운 로컬 저장소 초기화

아직 Git으로 관리되지 않는 폴더를 Git 저장소로 만들 때 사용합니다.

```bash
$ git init
```

**💡 설명:**<br>
이 명령어를 실행하면 현재 디렉토리 안에 `.git`이라는 숨김 폴더가 생성됩니다.<br>
이 폴더가 Git 저장소의 모든 정보를 담고 있습니다.

:::tip\[실습해보기]

1. 바탕화면에 `my-first-git` 폴더를 만드세요
2. 터미널에서 해당 폴더로 이동하세요: `cd ~/Desktop/my-first-git`
3. `git init` 명령어를 실행해보세요
4. `ls -la` 명령어로 `.git` 폴더가 생성되었는지 확인해보세요
   :::

<br>

### 2.2. 원격 저장소 복제 (Clone)

GitHub(또는 다른 원격 Git 저장소)에 있는 기존 프로젝트를<br>
내 컴퓨터로 통째로 복사해 올 때 사용합니다.

```bash
$ git clone [GitHub 저장소 URL]
```

**📋 예시:**

```bash
$ git clone https://github.com/your-username/your-repository.git
```

**💡 설명:**<br>
이 명령어를 실행하면 해당 GitHub 저장소의<br>
모든 파일과 Git 이력이 현재 디렉토리 아래의 새로운 폴더로 복사됩니다.<br>
복사된 폴더는 자동으로 원격 저장소(`origin`이라는 이름으로)와 연결됩니다.

:::note\[HTTPS vs SSH]

* **HTTPS 방식**: `https://github.com/...` - 매번 인증이 필요하지만 설정이 간단합니다
* **SSH 방식**: `git@github.com:...` - 초기 설정이 필요하지만 이후 인증이 필요 없습니다
  :::

<br>

### 2.3. 파일 상태 확인

현재 작업 디렉토리에 있는 파일들의 Git 관리 상태를 보여줍니다.<br>
어떤 파일이 변경되었고, 스테이징되었는지 등을 알 수 있습니다.

```bash
$ git status
```

**💡 설명:**<br>
Git 작업을 할 때 가장 자주 사용하는 명령어 중 하나입니다.<br>
커밋하기 전에 항상 이 명령어로 변경사항을 확인하는 습관을 들이세요.

**🎨 상태별 색상 의미:**

* 🔴 **빨간색**: 아직 스테이징되지 않은 변경사항
* 🟢 **초록색**: 스테이징된 변경사항 (커밋 준비 완료)

<br>

### 2.4. 변경사항 스테이징 (Staging)

수정하거나 새로 생성한 파일들을 Git이 다음 커밋에 포함할 수 있도록<br>
'준비 영역(Staging Area)'에 올립니다. 스테이징되지 않은 파일은 커밋되지 않습니다.

#### 📄 특정 파일만 스테이징

```bash
$ git add [파일명]
```

**📋 예시:**

```bash
$ git add index.html
$ git add style.css
```

#### 📁 모든 변경된 파일 스테이징

```bash
$ git add .
```

**💡 설명:**<br>
`git add .`은 현재 디렉토리 및 하위 디렉토리의<br>
모든 변경사항(새 파일, 수정된 파일)을 스테이징합니다.

:::warning\[주의사항]
`git add .`를 사용하기 전에 `git status`로 어떤 파일들이 추가될지 확인하세요.<br>
실수로 불필요한 파일(예: 비밀번호 파일)이 포함될 수 있습니다.
:::

<br>

### 2.5. 변경사항 커밋 (Commit)

스테이징된 변경사항들을 확정하고, 변경 내용에 대한 의미 있는 설명을 기록합니다.<br>
커밋은 프로젝트 이력의 한 '스냅샷'입니다.

```bash
$ git commit -m "커밋 메시지"
```

**📋 좋은 커밋 메시지 예시:**

```bash
$ git commit -m "feat: 로그인 기능 추가 및 UI 개선"
$ git commit -m "fix: 회원가입 시 이메일 중복 검사 오류 수정"
$ git commit -m "docs: README 파일에 설치 가이드 추가"
```

:::tip\[커밋 메시지 작성 규칙]

* **feat**: 새로운 기능 추가
* **fix**: 버그 수정
* **docs**: 문서 수정
* **style**: 코드 포맷팅, 세미콜론 누락 등
* **refactor**: 코드 리팩토링
* **test**: 테스트 코드 추가
* **chore**: 빌드 업무 수정, 패키지 매니저 수정 등
  :::

- - -

## 🌐 3. 원격 저장소 (GitHub)와의 연동

### 3.1. 원격 저장소 연결

`git init`으로 생성한 로컬 저장소를 GitHub에 있는 특정 저장소와 연결합니다.<br>
`origin`은 관례적으로 사용되는 원격 저장소의 별칭입니다.

```bash
$ git remote add origin [GitHub 저장소 URL]
```

**📋 예시:**

```bash
$ git remote add origin https://github.com/your-username/new-project.git
```

**💡 설명:**<br>
이 명령어는 로컬 저장소와 원격 저장소 사이에 '링크'를 만듭니다.<br>
이렇게 연결되어야 `git push`나 `git pull` 같은 명령어를 사용할 수 있습니다.

<br>

### 3.2. 원격 저장소 목록 확인

현재 로컬 저장소에 어떤 원격 저장소들이 연결되어 있는지,<br>
그리고 각각의 URL은 무엇인지 확인합니다.

```bash
$ git remote -v
```

**💡 출력 예시:**

```
origin  https://github.com/your-username/repo.git (fetch)
origin  https://github.com/your-username/repo.git (push)
```

<br>

### 3.3. 로컬 변경사항 푸시 (Push)

로컬에서 커밋한 내용을 GitHub 저장소로 업로드하여<br>
다른 사람들과 공유하고 원격 저장소의 이력을 업데이트합니다.

```bash
$ git push origin [브랜치 이름]
```

**📋 예시 (첫 푸시 시, `-u` 옵션으로 추적 설정):**

```bash
$ git push -u origin main
```

**💡 설명:**<br>
`-u` 또는 `--set-upstream` 옵션은 해당 로컬 브랜치가 `origin/main`을 추적하도록 설정하여,<br>
다음부터는 단순히 `git push`만으로도 해당 브랜치로 푸시할 수 있게 합니다.

:::important\[처음 푸시할 때 인증 오류가 발생하나요?]
GitHub는 2021년부터 비밀번호 인증을 중단했습니다.<br>
Personal Access Token을 생성하여 사용해야 합니다.<br>
[GitHub 토큰 생성 가이드](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)를 참고하세요.
:::

<br>

### 3.4. 원격 변경사항 가져오기 (Fetch)

GitHub의 최신 변경사항을 로컬로 가져오지만,<br>
아직 사용자의 작업 브랜치에 병합하지는 않습니다.<br>
어떤 변경사항이 있는지 먼저 보고 싶을 때 유용합니다.

```bash
$ git fetch origin
```

**💡 설명:**<br>
이 명령어는 원격 저장소의 최신 이력(커밋, 브랜치 정보 등)을 로컬에 업데이트합니다.<br>
하지만 현재 작업 중인 브랜치의 파일 내용은 변경되지 않습니다.

<br>

### 3.5. 원격 변경사항 병합 (Pull)

`git fetch`와 `git merge`를 동시에 수행하는 명령어입니다.<br>
GitHub의 최신 코드를 내 로컬 브랜치에 반영합니다.

```bash
$ git pull origin [브랜치 이름]
```

**📋 예시 (추적 브랜치가 설정된 경우):**

```bash
$ git pull
```

**💡 설명:**<br>
다른 사람이 GitHub에 푸시한 변경사항을<br>
내 컴퓨터로 가져와서 내 작업과 합칠 때 사용합니다.

:::caution\[협업 시 주의사항]
작업을 시작하기 전에 항상 `git pull`을 실행하여<br>
최신 상태에서 작업을 시작하는 것이 좋습니다.<br>
이렇게 하면 나중에 충돌이 발생할 가능성이 줄어듭니다.
:::

- - -

## 🌳 4. 브랜치 (Branch) 관리

### 4.1. 브랜치 생성

기존 코드 베이스를 바탕으로 독립적인 작업 공간을 만듭니다.<br>
새로운 기능 개발이나 버그 수정 시 메인 코드에 영향을 주지 않고 작업할 수 있습니다.

```bash
$ git branch [새로운 브랜치 이름]
```

**📋 예시:**

```bash
$ git branch feature/login
$ git branch bugfix/header-error
```

**💡 브랜치 네이밍 컨벤션:**

* `feature/기능명`: 새로운 기능 개발
* `bugfix/버그명`: 버그 수정
* `hotfix/긴급수정`: 긴급한 수정사항
* `release/버전명`: 릴리즈 준비

<br>

### 4.2. 브랜치 전환

여러 브랜치 사이를 오가며 다른 작업을 할 수 있게 해줍니다.

#### ↔️ 기존 브랜치로 이동

```bash
$ git checkout [이동할 브랜치 이름]
```

**📋 예시:**

```bash
$ git checkout main
$ git checkout feature/login
```

#### ➕ 새 브랜치 생성과 동시에 전환

```bash
$ git checkout -b [새로운 브랜치 이름]
```

**📋 예시:**

```bash
$ git checkout -b hotfix/bug-fix-123
```

:::tip\[Git 2.23+ 버전 사용자를 위한 팁]
최신 Git 버전에서는 `git switch` 명령어를 사용할 수도 있습니다:

* 브랜치 전환: `git switch main`
* 새 브랜치 생성 및 전환: `git switch -c feature/new-feature`
  :::

<br>

### 4.3. 브랜치 목록 확인

현재 로컬 저장소에 존재하는 브랜치들을 확인합니다.<br>
어떤 브랜치에서 작업 중인지도 알 수 있습니다.

#### 📋 로컬 브랜치 목록 확인

```bash
$ git branch
```

#### 🌐 모든 브랜치 (로컬 + 원격) 확인

```bash
$ git branch -a
```

**💡 출력 예시:**

```
* main
  feature/login
  feature/signup
  remotes/origin/main
  remotes/origin/feature/login
```

**설명:** 현재 활성화된 브랜치 앞에는 `*` 표시가 붙습니다.

<br>

### 4.4. 브랜치 병합 (Merge)

다른 브랜치에서 작업한 내용을 현재 브랜치로 통합합니다.<br>
예를 들어, `feature/login` 브랜치에서 만든 로그인 기능을 `main` 브랜치에 합칠 때 사용합니다.

```bash
$ git merge [병합할 브랜치 이름]
```

**📋 예시 (main 브랜치에서 feature/login 브랜치 병합):**

```bash
# 1. 먼저 main 브랜치로 이동합니다
$ git checkout main

# 2. feature/login 브랜치를 main에 병합합니다
$ git merge feature/login
```

:::warning\[병합 충돌이 발생할 수 있습니다!]
두 브랜치에서 같은 파일의 같은 부분을 수정했다면<br>
Git이 자동으로 병합할 수 없어 충돌이 발생합니다.<br>
이 경우 수동으로 충돌을 해결해야 합니다.
:::

<br>

### 4.5. 브랜치 삭제

더 이상 필요 없는 브랜치를 로컬 및 원격 저장소에서 제거합니다.

#### 🗑️ 로컬 브랜치 삭제 (병합된 경우)

```bash
$ git branch -d [삭제할 브랜치 이름]
```

**📋 예시:**

```bash
$ git branch -d feature/login
```

#### ⚠️ 로컬 브랜치 강제 삭제

```bash
$ git branch -D [삭제할 브랜치 이름]
```

:::caution\[주의!]
`-D` 옵션은 병합되지 않은 변경사항이 있어도 강제로 브랜치를 삭제합니다.<br>
**데이터 손실의 위험**이 있으므로 신중하게 사용하세요!
:::

#### 🌐 원격 브랜치 삭제

```bash
$ git push origin --delete [원격 브랜치 이름]
```

**📋 예시:**

```bash
$ git push origin --delete feature/login
```

- - -

## 📜 5. 커밋 히스토리 확인 및 조작

### 5.1. 커밋 로그 확인

지금까지 커밋된 모든 변경 이력을 시간 순서대로 보여줍니다.<br>
누가 언제 어떤 내용을 커밋했는지 확인할 수 있습니다.

#### 📄 기본 커밋 목록 확인

```bash
$ git log
```

#### 🎨 간결하고 그래프 형태로 보기 (강력 추천!)

```bash
$ git log --oneline --graph --all
```

**💡 유용한 옵션들:**

* `--oneline`: 각 커밋을 한 줄로 간결하게 표시
* `--graph`: 브랜치 및 병합 이력을 아스키 그래프로 표시
* `--all`: 모든 브랜치의 이력 표시
* `-n 10`: 최근 10개의 커밋만 표시
* `--author="이름"`: 특정 작성자의 커밋만 표시

<br>

### 5.2. 커밋 되돌리기 (Revert)

특정 커밋에서 발생한 변경사항을 취소하는 새로운 커밋을 생성합니다.<br>
기존 커밋을 삭제하지 않고 변경 이력을 남기므로,<br>
**이미 공유된 커밋을 되돌릴 때 안전하게 사용할 수 있습니다.**

```bash
$ git revert <커밋 해시>
```

**📋 예시:**

```bash
# 1. git log로 되돌리고 싶은 커밋의 해시를 확인
$ git log --oneline

# 2. 특정 커밋을 되돌리기
$ git revert ab12cd34
```

<br>

### 5.3. 커밋 수정 (Amend)

가장 최근의 커밋 메시지를 수정하거나,<br>
스테이징 영역에 추가 변경사항을 포함하여 하나의 새로운 커밋으로 만듭니다.

```bash
$ git commit --amend
```

**📋 사용 예시:**

```bash
# 커밋 메시지만 수정하고 싶을 때
$ git commit --amend -m "새로운 커밋 메시지"

# 파일을 빠뜨렸을 때
$ git add forgotten-file.txt
$ git commit --amend --no-edit
```

:::warning\[주의사항]
이미 GitHub에 푸시한 커밋은 수정하지 마세요!<br>
히스토리가 변경되어 다른 사람들과 충돌이 발생할 수 있습니다.
:::

- - -

## 🛠️ 6. 고급 사용 및 문제 해결

### 6.1. 병합 충돌 해결

두 브랜치의 같은 파일을 동시에 수정하여<br>
Git이 자동으로 병합할 수 없을 때 '충돌'이 발생합니다.

#### 🔍 충돌 해결 과정

**1️⃣ 충돌 발생 확인**

```bash
$ git status
# Unmerged paths가 표시됩니다
```

**2️⃣ 충돌 파일 수정**

충돌이 난 파일을 열면 다음과 같은 표시를 볼 수 있습니다:

```
<<<<<<< HEAD
// 현재 브랜치의 내용
=======
// 병합하려는 브랜치의 내용
>>>>>>> feature/login
```

**3️⃣ 해결된 파일 스테이징**

```bash
$ git add [충돌 해결된 파일명]
```

**4️⃣ 병합 커밋 완료**

```bash
$ git commit
```

:::tip\[충돌 해결 팁]

* VS Code 같은 에디터는 충돌을 시각적으로 보여주고 쉽게 해결할 수 있게 도와줍니다
* 충돌 해결 시 동료와 소통하여 어떤 코드를 유지할지 결정하세요
* 복잡한 충돌은 `git mergetool`을 사용하면 도움이 됩니다
  :::

<br>

### 6.2. 작업 임시 저장 (Stash)

아직 커밋할 준비가 되지 않은 변경사항들을 임시로 저장하여,<br>
현재 작업 디렉토리를 깨끗하게 만든 후<br>
다른 브랜치로 전환하거나 긴급한 작업을 처리할 때 사용합니다.

#### 💾 현재 작업 내용을 임시로 저장

```bash
$ git stash
# 또는 메시지와 함께 저장
$ git stash save "로그인 기능 작업 중"
```

#### 📋 저장된 스태시 목록 확인

```bash
$ git stash list
```

#### ♻️ 가장 최근 저장 내용 적용 및 삭제

```bash
$ git stash pop
```

#### 🔄 특정 저장 내용 적용 (삭제 안 함)

```bash
$ git stash apply stash@{0}
```

**💡 유용한 stash 명령어들:**

* `git stash drop`: 특정 stash 삭제
* `git stash clear`: 모든 stash 삭제
* `git stash show -p`: stash 내용 자세히 보기

<br>

### 6.3. .gitignore 파일 사용

Git이 버전 관리에 포함하지 않을 파일이나 디렉토리를 지정합니다.<br>
빌드 결과물, 로그 파일, 개인 설정 파일 등<br>
저장소에 불필요한 파일들이 커밋되는 것을 방지합니다.

#### 📝 .gitignore 파일 생성 및 설정

**1️⃣ 프로젝트 루트에 `.gitignore` 파일 생성**

```bash
$ touch .gitignore
```

**2️⃣ 무시할 파일/폴더 패턴 작성**

```gitignore
# 🗂️ 빌드 아티팩트
/build
/dist
*.o
*.a

# 📦 의존성 디렉토리
node_modules/
vendor/

# 📄 로그 파일
*.log
npm-debug.log*
logs/

# 💻 운영체제 관련 파일
.DS_Store
Thumbs.db
.idea/
.vscode/

# 🔐 개인 설정 파일 (예: API 키)
config.local.js
.env
.env.local
secrets.json

# 📱 임시 파일
*.tmp
*.temp
*.swp
*~
```

:::tip\[.gitignore 팁]

* [gitignore.io](https://www.toptal.com/developers/gitignore)에서 프로젝트에 맞는 .gitignore 템플릿을 생성할 수 있습니다
* 이미 추적 중인 파일을 .gitignore에 추가하려면:<br>
    `git rm --cached [파일명]` 실행 후 커밋하세요
  :::

<br>

### 6.4. 실수 복구하기

#### ↩️ 스테이징 취소

```bash
$ git reset HEAD [파일명]
# 또는 모든 스테이징 취소
$ git reset HEAD
```

#### 🔄 작업 디렉토리의 변경사항 되돌리기

```bash
$ git checkout -- [파일명]
```

:::warning\[주의!]
`git checkout --` 명령어는 변경사항을 완전히 삭제합니다.<br>
복구할 수 없으므로 신중하게 사용하세요!
:::

- - -

## 🎯 7. 실전 시나리오별 가이드

### 시나리오 1: 새 프로젝트 시작하기

```bash
# 1. 프로젝트 폴더 생성 및 이동
$ mkdir my-awesome-project
$ cd my-awesome-project

# 2. Git 저장소 초기화
$ git init

# 3. README 파일 생성
$ echo "# My Awesome Project" > README.md

# 4. 첫 커밋
$ git add README.md
$ git commit -m "docs: 프로젝트 초기 설정"

# 5. GitHub에 저장소 생성 후 연결
$ git remote add origin https://github.com/username/my-awesome-project.git

# 6. GitHub에 푸시
$ git push -u origin main
```

<br>

### 시나리오 2: 팀 프로젝트 참여하기

```bash
# 1. 프로젝트 클론
$ git clone https://github.com/team/project.git
$ cd project

# 2. 새 기능 브랜치 생성
$ git checkout -b feature/my-feature

# 3. 작업 후 커밋
$ git add .
$ git commit -m "feat: 새로운 기능 추가"

# 4. 최신 main 브랜치 내용 가져오기
$ git checkout main
$ git pull origin main

# 5. 내 브랜치에 최신 변경사항 반영
$ git checkout feature/my-feature
$ git merge main

# 6. GitHub에 푸시
$ git push origin feature/my-feature
```

- - -

## 📚 참고 자료 및 추가 학습

### 🔗 유용한 링크들

* [Git 공식 문서](https://git-scm.com/doc)
* [GitHub 공식 가이드](https://docs.github.com)
* [Git 브랜칭 배우기 (인터랙티브 튜토리얼)](https://learngitbranching.js.org/?locale=ko)
* [Pro Git 한국어판 (무료 온라인 책)](https://git-scm.com/book/ko/v2)

### 📱 추천 GUI 도구들

* **GitHub Desktop**: 초보자에게 가장 친숙한 인터페이스
* **SourceTree**: 더 많은 기능을 제공하는 무료 도구
* **GitKraken**: 시각적으로 아름답고 강력한 기능 제공

### 💡 마무리 팁

1. **자주 커밋하세요**: 작은 단위로 자주 커밋하는 것이 좋습니다
2. **의미 있는 커밋 메시지**: 나중에 찾기 쉽도록 명확하게 작성하세요
3. **브랜치 활용**: main 브랜치를 직접 수정하지 말고 브랜치를 만들어 작업하세요
4. **백업은 필수**: 중요한 작업은 항상 원격 저장소에 푸시하세요
5. **연습이 최고**: 실제 프로젝트에서 많이 사용해보는 것이 가장 좋은 학습법입니다

<br>

:::note\[이 가이드가 도움이 되셨나요?]
Git과 GitHub는 처음엔 어려워 보이지만, 꾸준히 사용하다 보면 금세 익숙해집니다.<br>
이 가이드를 참고하여 버전 관리의 편리함을 경험해보세요! 🚀
:::
