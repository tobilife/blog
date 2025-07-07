---
title: 30분 만에 만드는 우리 회사 전용 AI 검색 시스템 - 무료로 구축하는 RAG 지식베이스
published: 2025-04-13
description: Ollama와 오픈소스 도구를 활용해 완전 무료로 사내 문서 검색 AI 시스템을 구축하는 초보자 가이드
category: AI
tags:
  - RAG
  - LangChain
  - Ollama
  - ChromaDB
  - Python
  - AI
  - 지식베이스
image: /images/uploads/img.png
draft: false
---
## 🎯 이 글을 읽으면 무엇을 얻을 수 있나요?

여러분의 회사에는 수많은 문서들이 있죠? 매뉴얼, 보고서, 회의록, 규정집...<br>필요한 정보를 찾으려면 일일이 문서를 열어봐야 합니다. 

**이제 ChatGPT처럼 질문하면 AI가 회사 문서에서 답을 찾아주는 시스템을 만들어보세요!**

:::tip\[이런 분들께 추천합니다]

* 사내 문서가 많아 검색이 어려운 분
* AI 기술을 회사에 도입하고 싶은 분
* 코딩 경험이 거의 없는 초보자
* 무료로 AI 시스템을 구축하고 싶은 분
  :::

## 📚 RAG가 뭐예요? (5분이면 이해 가능!)

RAG(Retrieval-Augmented Generation)를 쉽게 설명하면

```
1. 사용자가 질문: "우리 회사 연차 규정이 어떻게 되나요?"
2. AI가 관련 문서 검색: 인사규정.pdf에서 연차 부분 찾기
3. 찾은 내용으로 답변 생성: "귀사의 연차 규정에 따르면..."
```

### 일반 검색 vs RAG 시스템

| 구분    | 일반 키워드 검색 | RAG 시스템                   |
| ----- | --------- | ------------------------- |
| 질문 방식 | "연차 규정"   | "신입사원은 연차를 언제부터 쓸 수 있나요?" |
| 결과    | 문서 목록 제공  | 직접적인 답변 + 출처              |
| 장점    | 단순하고 빠름   | 자연스러운 대화, 정확한 답변          |

## 🛠️ 필요한 도구들 (모두 무료!)

우리가 사용할 도구들을 소개합니다:

### 1. **Ollama** - 무료 AI 모델 실행기

* ChatGPT 같은 AI 모델을 내 컴퓨터에서 실행
* 완전 무료, 인터넷 연결 불필요

### 2. **LangChain** - AI 앱 개발 도구

* AI와 문서를 연결해주는 다리 역할
* Python 라이브러리

### 3. **ChromaDB** - 문서 저장소

* 문서를 AI가 이해할 수 있는 형태로 저장
* 빠른 검색 지원

### 4. **Streamlit** - 웹 인터페이스

* 코딩 없이 웹 UI 제작
* 실시간 미리보기

## 🚀 Step 1: 개발 환경 설정하기

### Windows 환경

:::note\[Windows 사용자 주의사항]
Windows에서는 PowerShell을 관리자 권한으로 실행해주세요.
:::

#### 1-1. Python 설치

1. [Python 공식 사이트](https://www.python.org/downloads/)에서 Python 3.9 이상 다운로드
2. 설치 시 **"Add Python to PATH"** 체크 필수!
3. 설치 확인:

```powershell
python --version
```

#### 1-2. Ollama 설치

1. [Ollama 다운로드 페이지](https://ollama.com/download/windows)에서 설치 파일 다운로드
2. 설치 후 PowerShell에서 실행:

```powershell
ollama run llama2
```

첫 실행 시 모델 다운로드(약 4GB)가 진행됩니다.

### macOS 환경

#### 1-1. Homebrew로 Python 설치

```bash
# Homebrew 설치 (이미 있다면 생략)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python 설치
brew install python@3.11
```

#### 1-2. Ollama 설치

```bash
# Ollama 설치
brew install ollama

# Ollama 서비스 시작
brew services start ollama

# 한국어 지원 모델 다운로드
ollama pull llama2
```

### 공통: 프로젝트 폴더 생성

```bash
# 프로젝트 폴더 생성
mkdir company-rag-system
cd company-rag-system

# 가상환경 생성
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 필요한 패키지 설치
pip install langchain chromadb streamlit ollama pypdf python-docx openpyxl
```

## 🏗️ Step 2: RAG 시스템 구축하기

### 2-1. 프로젝트 구조 만들기

```
company-rag-system/
├── app.py              # 메인 애플리케이션
├── document_loader.py  # 문서 로더
├── rag_engine.py      # RAG 엔진
├── documents/         # 회사 문서 폴더
└── chroma_db/        # 벡터 DB 저장소
```

### 2-2. 문서 로더 만들기 (document_loader.py)

```python
import os
from typing import List
from langchain.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredExcelLoader,
    TextLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

class DocumentLoader:
    """다양한 형식의 문서를 로드하는 클래스"""
    
    def __init__(self, docs_path: str = "./documents"):
        self.docs_path = docs_path
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
            length_function=len,
        )
    
    def load_documents(self) -> List[Document]:
        """문서 폴더의 모든 문서를 로드"""
        all_documents = []
        
        for root, dirs, files in os.walk(self.docs_path):
            for file in files:
                file_path = os.path.join(root, file)
                print(f"로딩 중: {file}")
                
                try:
                    # PDF 파일
                    if file.endswith('.pdf'):
                        loader = PyPDFLoader(file_path)
                    # Word 파일
                    elif file.endswith('.docx'):
                        loader = Docx2txtLoader(file_path)
                    # Excel 파일
                    elif file.endswith(('.xlsx', '.xls')):
                        loader = UnstructuredExcelLoader(file_path)
                    # 텍스트 파일
                    elif file.endswith('.txt'):
                        loader = TextLoader(file_path, encoding='utf-8')
                    else:
                        continue
                    
                    documents = loader.load()
                    # 문서를 작은 청크로 분할
                    splits = self.text_splitter.split_documents(documents)
                    
                    # 메타데이터에 파일명 추가
                    for split in splits:
                        split.metadata['source'] = file
                    
                    all_documents.extend(splits)
                    
                except Exception as e:
                    print(f"오류 발생 ({file}): {str(e)}")
        
        print(f"총 {len(all_documents)}개의 문서 청크 로드 완료!")
        return all_documents
```

### 2-3. RAG 엔진 만들기 (rag_engine.py)

```python
from typing import List, Tuple
from langchain.embeddings import OllamaEmbeddings
from langchain.vectorstores import Chroma
from langchain.llms import Ollama
from langchain.chains import RetrievalQA
from langchain.schema import Document
import chromadb

class RAGEngine:
    """RAG 검색 엔진 클래스"""
    
    def __init__(self, model_name: str = "llama2", persist_directory: str = "./chroma_db"):
        self.model_name = model_name
        self.persist_directory = persist_directory
        
        # Ollama 임베딩 모델 초기화
        self.embeddings = OllamaEmbeddings(
            model=model_name,
            base_url="http://localhost:11434"
        )
        
        # Ollama LLM 초기화
        self.llm = Ollama(
            model=model_name,
            base_url="http://localhost:11434",
            temperature=0.3,  # 더 정확한 답변을 위해 낮은 온도 설정
        )
        
        self.vectorstore = None
        self.qa_chain = None
    
    def create_vectorstore(self, documents: List[Document]):
        """문서로부터 벡터 저장소 생성"""
        print("벡터 데이터베이스 생성 중...")
        
        # ChromaDB 클라이언트 설정
        client = chromadb.PersistentClient(path=self.persist_directory)
        
        # 벡터 저장소 생성
        self.vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=self.persist_directory,
            client=client,
            collection_name="company_docs"
        )
        
        print("벡터 데이터베이스 생성 완료!")
    
    def load_vectorstore(self):
        """기존 벡터 저장소 로드"""
        print("기존 벡터 데이터베이스 로드 중...")
        
        client = chromadb.PersistentClient(path=self.persist_directory)
        
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings,
            client=client,
            collection_name="company_docs"
        )
        
        print("벡터 데이터베이스 로드 완료!")
    
    def setup_qa_chain(self):
        """QA 체인 설정"""
        if not self.vectorstore:
            raise ValueError("벡터 저장소가 초기화되지 않았습니다!")
        
        # 프롬프트 템플릿 설정
        from langchain.prompts import PromptTemplate
        
        prompt_template = """주어진 문서를 참고하여 질문에 답변해주세요. 
        답변은 한국어로 작성하고, 문서에 없는 내용은 추측하지 마세요.
        
        문서 내용:
        {context}
        
        질문: {question}
        
        답변:"""
        
        PROMPT = PromptTemplate(
            template=prompt_template, 
            input_variables=["context", "question"]
        )
        
        # RetrievalQA 체인 생성
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vectorstore.as_retriever(
                search_kwargs={"k": 4}  # 상위 4개 문서 검색
            ),
            return_source_documents=True,
            chain_type_kwargs={"prompt": PROMPT}
        )
    
    def query(self, question: str) -> Tuple[str, List[str]]:
        """질문에 대한 답변과 출처 반환"""
        if not self.qa_chain:
            raise ValueError("QA 체인이 설정되지 않았습니다!")
        
        # 질문 처리
        result = self.qa_chain({"query": question})
        
        # 답변
        answer = result['result']
        
        # 출처 문서들
        sources = []
        for doc in result['source_documents']:
            source = doc.metadata.get('source', 'Unknown')
            if source not in sources:
                sources.append(source)
        
        return answer, sources
```

### 2-4. 웹 인터페이스 만들기 (app.py)

```python
import streamlit as st
import os
from datetime import datetime
from document_loader import DocumentLoader
from rag_engine import RAGEngine

# 페이지 설정
st.set_page_config(
    page_title="회사 문서 AI 검색 시스템",
    page_icon="🔍",
    layout="wide"
)

# 세션 상태 초기화
if 'rag_engine' not in st.session_state:
    st.session_state.rag_engine = None
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []

def initialize_rag_engine():
    """RAG 엔진 초기화"""
    with st.spinner("AI 엔진을 초기화하는 중..."):
        try:
            rag_engine = RAGEngine()
            
            # 기존 DB가 있는지 확인
            if os.path.exists("./chroma_db"):
                rag_engine.load_vectorstore()
            else:
                st.warning("문서 데이터베이스가 없습니다. 문서를 업로드해주세요.")
                return None
            
            rag_engine.setup_qa_chain()
            return rag_engine
            
        except Exception as e:
            st.error(f"초기화 중 오류 발생: {str(e)}")
            return None

def main():
    st.title("회사 문서 AI 검색 시스템")
    st.markdown("---")
    
    # 사이드바: 문서 관리
    with st.sidebar:
        st.header("문서 관리")
        
        # 문서 업로드
        uploaded_files = st.file_uploader(
            "문서 업로드",
            type=['pdf', 'docx', 'txt', 'xlsx', 'xls'],
            accept_multiple_files=True
        )
        
        if uploaded_files:
            if st.button("업로드한 문서 처리하기"):
                # documents 폴더 생성
                os.makedirs("documents", exist_ok=True)
                
                # 파일 저장
                for uploaded_file in uploaded_files:
                    file_path = os.path.join("documents", uploaded_file.name)
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                
                # 문서 로드 및 벡터화
                with st.spinner("문서를 처리하는 중..."):
                    loader = DocumentLoader()
                    documents = loader.load_documents()
                    
                    if documents:
                        rag_engine = RAGEngine()
                        rag_engine.create_vectorstore(documents)
                        rag_engine.setup_qa_chain()
                        st.session_state.rag_engine = rag_engine
                        st.success("문서 처리 완료!")
                        st.rerun()
        
        st.markdown("---")
        
        # 현재 등록된 문서 표시
        if os.path.exists("documents"):
            st.subheader("등록된 문서")
            files = os.listdir("documents")
            for file in files:
                st.text(f"• {file}")
        
        # 채팅 기록 초기화
        if st.button("대화 기록 삭제"):
            st.session_state.chat_history = []
            st.rerun()
    
    # 메인 영역: 채팅 인터페이스
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.header("AI와 대화하기")
        
        # RAG 엔진 초기화
        if st.session_state.rag_engine is None:
            st.session_state.rag_engine = initialize_rag_engine()
        
        # 채팅 인터페이스
        if st.session_state.rag_engine:
            # 질문 입력
            user_question = st.text_input(
                "질문을 입력하세요:",
                placeholder="예: 우리 회사의 연차 사용 규정이 어떻게 되나요?"
            )
            
            if st.button("검색") and user_question:
                with st.spinner("답변을 생성하는 중..."):
                    try:
                        # 답변 생성
                        answer, sources = st.session_state.rag_engine.query(user_question)
                        
                        # 채팅 기록에 추가
                        st.session_state.chat_history.append({
                            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            'question': user_question,
                            'answer': answer,
                            'sources': sources
                        })
                        
                    except Exception as e:
                        st.error(f"오류 발생: {str(e)}")
            
            # 채팅 기록 표시
            st.markdown("---")
            st.subheader("대화 기록")
            
            for chat in reversed(st.session_state.chat_history):
                with st.container():
                    st.markdown(f"**{chat['timestamp']}**")
                    st.markdown(f"**질문:** {chat['question']}")
                    st.markdown(f"**답변:** {chat['answer']}")
                    if chat['sources']:
                        st.markdown(f"**출처:** {', '.join(chat['sources'])}")
                    st.markdown("---")
        else:
            st.info("왼쪽 사이드바에서 문서를 업로드해주세요.")
    
    with col2:
        st.header("시스템 상태")
        
        # 시스템 상태 표시
        if st.session_state.rag_engine:
            st.success("AI 엔진 활성화")
            
            # 벡터 저장소 정보
            if st.session_state.rag_engine.vectorstore:
                collection = st.session_state.rag_engine.vectorstore._collection
                st.metric("저장된 문서 청크", collection.count())
        else:
            st.warning("AI 엔진 비활성화")
        
        # 사용 가이드
        st.markdown("---")
        st.subheader("사용 방법")
        st.markdown("""
        1. **문서 업로드**: 왼쪽 사이드바에서 회사 문서를 업로드
        2. **질문하기**: 자연스러운 한국어로 질문 입력
        3. **답변 확인**: AI가 문서에서 찾은 정보로 답변 생성
        
        **지원 파일 형식:**
        - PDF (.pdf)
        - Word (.docx)
        - Excel (.xlsx, .xls)
        - Text (.txt)
        """)

if __name__ == "__main__":
    main()
```

## 🎮 Step 3: 시스템 실행하기

### 3-1. Ollama 실행 확인

```bash
# Ollama가 실행 중인지 확인
ollama list

# 만약 llama2가 없다면 다운로드
ollama pull llama2
```

### 3-2. Streamlit 앱 실행

```bash
# 프로젝트 폴더에서 실행
streamlit run app.py
```

브라우저가 자동으로 열리고 `http://localhost:8501`에서 앱이 실행됩니다!

## 🎯 실제 사용 예제

### 예제 1: 회사 규정 검색

1. 인사규정.pdf, 취업규칙.docx 등을 업로드
2. 질문: "신입사원의 수습 기간은 얼마나 되나요?"
3. AI 답변: "귀사의 취업규칙에 따르면 신입사원의 수습 기간은 3개월입니다. (출처: 취업규칙.docx)"

### 예제 2: 기술 문서 검색

1. 개발가이드.pdf, API문서.txt 업로드
2. 질문: "REST API 인증은 어떻게 하나요?"
3. AI 답변: "API 인증은 Bearer 토큰을 사용합니다... (출처: API문서.txt)"

## 🔧 트러블슈팅

### 문제 1: Ollama 연결 오류

```
ConnectionError: Failed to connect to Ollama
```

**해결방법:**

```bash
# Ollama 서비스 재시작
# Windows
ollama serve

# macOS
brew services restart ollama
```

### 문제 2: 메모리 부족

**해결방법:**

* 더 작은 모델 사용: `ollama pull tinyllama`
* 청크 크기 줄이기: `chunk_size=500`

### 문제 3: 한글 깨짐

**해결방법:**

```python
# TextLoader에 인코딩 명시
loader = TextLoader(file_path, encoding='utf-8-sig')
```

## 🚀 성능 최적화 팁

### 1. 모델 선택 가이드

| 모델         | 크기    | 성능    | 한국어 | 추천 상황     |
| ---------- | ----- | ----- | --- | --------- |
| llama2:7b  | 4GB   | 좋음    | 보통  | 일반적인 사용   |
| mistral:7b | 4GB   | 매우 좋음 | 보통  | 영문 문서 위주  |
| gemma:2b   | 1.5GB | 보통    | 약함  | 저사양 PC    |
| qwen:7b    | 4GB   | 좋음    | 우수  | 한국어 문서 위주 |

### 2. 검색 정확도 향상

```python
# 검색 결과 개수 늘리기
retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

# 유사도 임계값 설정
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7}
)
```

### 3. 처리 속도 개선

* 문서 사전 처리: 큰 문서는 미리 분할
* 캐싱 활용: 자주 묻는 질문 저장
* 배치 처리: 여러 문서 동시 처리

## 🎨 추가 기능 구현 아이디어

### 1. 다국어 지원

```python
# 질문 언어 감지 및 번역
from langdetect import detect
if detect(question) != 'ko':
    # 번역 API 활용
    pass
```

### 2. 문서 요약 기능

```python
# 업로드한 문서의 요약 생성
from langchain.chains.summarize import load_summarize_chain
summary_chain = load_summarize_chain(llm, chain_type="map_reduce")
```

### 3. 질문 추천

```python
# 문서 기반 자동 질문 생성
suggested_questions = [
    "이 문서의 주요 내용은 무엇인가요?",
    "핵심 정책은 무엇인가요?",
    # ...
]
```

## 📈 벤치마크 및 성능 비교

### 시스템 요구사항

| 구성 요소 | 최소 사양 | 권장 사양   |
| ----- | ----- | ------- |
| CPU   | 4코어   | 8코어 이상  |
| RAM   | 8GB   | 16GB 이상 |
| 저장공간  | 10GB  | 20GB 이상 |
| GPU   | 불필요   | 선택사항    |

### 처리 속도 비교

| 문서 수    | 인덱싱 시간 | 검색 시간 |
| ------- | ------ | ----- |
| 100개    | 약 5분   | < 2초  |
| 1,000개  | 약 30분  | < 3초  |
| 10,000개 | 약 3시간  | < 5초  |

:::important\[핵심 포인트]

* 완전 무료로 구축 가능
* 인터넷 연결 없이 작동
* 회사 데이터가 외부로 유출되지 않음
* 지속적으로 문서 추가 가능
  :::

### 다음 확장 단계 추천

1. **더 좋은 모델 시도**: `ollama pull solar` (한국어 특화)
2. **UI 개선**: Gradio나 Flask로 더 예쁜 인터페이스 구축
3. **기능 확장**: 문서 분류, 자동 태깅 등

## 📚 참고 자료

* [LangChain 공식 문서](https://python.langchain.com/)
* [Ollama 모델 목록](https://ollama.com/library)
* [ChromaDB 가이드](https://docs.trychroma.com/)
* [Streamlit 튜토리얼](https://docs.streamlit.io/)

- - -
