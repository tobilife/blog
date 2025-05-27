import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export const client = createClient({
  projectId: '85dni07i',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// 포스트 타입 정의
export interface Post {
  _id: string;
  _createdAt: string;
  title: string;
  slug: {
    current: string;
  };
  category?: string;
  tags?: string[];
  publishedAt: string;
  coverImage?: {
    asset: {
      _ref: string;
    };
    alt?: string;
  };
  excerpt?: string;
  content?: any[];
}

// 모든 포스트 가져오기
export async function getAllPosts(): Promise<Post[]> {
  const query = `*[_type == "post"] | order(publishedAt desc) {
    _id,
    _createdAt,
    title,
    slug,
    category,
    tags,
    publishedAt,
    coverImage,
    excerpt
  }`;
  
  return await client.fetch(query);
}

// 슬러그로 포스트 가져오기
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = `*[_type == "post" && slug.current == $slug][0] {
    _id,
    _createdAt,
    title,
    slug,
    category,
    tags,
    publishedAt,
    coverImage,
    excerpt,
    content
  }`;
  
  return await client.fetch(query, { slug });
}

// 카테고리별 포스트 가져오기
export async function getPostsByCategory(category: string): Promise<Post[]> {
  const query = `*[_type == "post" && category == $category] | order(publishedAt desc) {
    _id,
    _createdAt,
    title,
    slug,
    category,
    tags,
    publishedAt,
    coverImage,
    excerpt
  }`;
  
  return await client.fetch(query, { category });
}

// 태그별 포스트 가져오기
export async function getPostsByTag(tag: string): Promise<Post[]> {
  const query = `*[_type == "post" && $tag in tags] | order(publishedAt desc) {
    _id,
    _createdAt,
    title,
    slug,
    category,
    tags,
    publishedAt,
    coverImage,
    excerpt
  }`;
  
  return await client.fetch(query, { tag });
}
