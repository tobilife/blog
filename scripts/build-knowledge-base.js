// 빌드 타임에 마크다운 포스트를 인덱싱하는 스크립트
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

const POSTS_DIR = './src/content/posts';
const OUTPUT_FILE = './public/knowledge-base.json';

// 마크다운에서 텍스트 추출
async function extractTextFromMarkdown(content) {
  const processor = remark().use(strip);
  const result = await processor.process(content);
  return result.toString();
}

// 텍스트를 청크로 분할 (검색 효율성을 위해)
function createChunks(text, chunkSize = 500) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push({
      content: words.slice(i, i + chunkSize).join(' '),
      wordCount: Math.min(chunkSize, words.length - i)
    });
  }
  
  return chunks;
}

// 포스트 인덱싱
async function indexPosts() {
  const knowledgeBase = {
    posts: [],
    tags: new Set(),
    categories: new Set(),
    totalPosts: 0,
    indexedAt: new Date().toISOString()
  };

  // 포스트 디렉토리 읽기
  const files = fs.readdirSync(POSTS_DIR, { recursive: true });
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(POSTS_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // 프론트매터와 콘텐츠 분리
    const { data, content } = matter(fileContent);
    
    // draft 포스트는 제외
    if (data.draft) continue;
    
    // 마크다운에서 순수 텍스트 추출
    const plainText = await extractTextFromMarkdown(content);
    
    // 텍스트 청킹
    const chunks = createChunks(plainText);
    
    // 포스트 정보 저장
    const postInfo = {
      title: data.title || 'Untitled',
      description: data.description || '',
      published: data.published || null,
      tags: data.tags || [],
      category: data.category || 'Uncategorized',
      path: file,
      chunks: chunks,
      summary: plainText.substring(0, 200) + '...'
    };
    
    knowledgeBase.posts.push(postInfo);
    
    // 태그와 카테고리 수집
    data.tags?.forEach(tag => knowledgeBase.tags.add(tag));
    if (data.category) knowledgeBase.categories.add(data.category);
  }
  
  // Set을 Array로 변환
  knowledgeBase.tags = Array.from(knowledgeBase.tags);
  knowledgeBase.categories = Array.from(knowledgeBase.categories);
  knowledgeBase.totalPosts = knowledgeBase.posts.length;
  
  // JSON 파일로 저장
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeBase, null, 2));
  
  console.log(`✅ Knowledge base created with ${knowledgeBase.totalPosts} posts`);
  console.log(`📁 Output: ${OUTPUT_FILE}`);
  console.log(`🏷️  Tags: ${knowledgeBase.tags.join(', ')}`);
  console.log(`📂 Categories: ${knowledgeBase.categories.join(', ')}`);
}

// 실행
indexPosts().catch(console.error);
