import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'post',
  title: '블로그 포스트',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '제목',
      type: 'string',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'slug',
      title: 'URL 슬러그',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'category',
      title: '카테고리',
      type: 'string',
      options: {
        list: [
          {title: '개발', value: 'dev'},
          {title: '일상', value: 'life'},
          {title: '리뷰', value: 'review'},
          {title: '기타', value: 'etc'}
        ]
      }
    }),
    defineField({
      name: 'tags',
      title: '태그',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags'
      }
    }),
    defineField({
      name: 'publishedAt',
      title: '게시일',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({
      name: 'coverImage',
      title: '커버 이미지',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          type: 'string',
          title: '대체 텍스트',
        }
      ]
    }),
    defineField({
      name: 'excerpt',
      title: '요약',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'content',
      title: '내용',
      type: 'array',
      of: [
        {
          title: 'Block',
          type: 'block',
          styles: [
            {title: '보통', value: 'normal'},
            {title: '제목 1', value: 'h1'},
            {title: '제목 2', value: 'h2'},
            {title: '제목 3', value: 'h3'},
            {title: '제목 4', value: 'h4'},
            {title: '인용', value: 'blockquote'},
          ],
          lists: [
            {title: '글머리 기호', value: 'bullet'},
            {title: '번호', value: 'number'}
          ],
          marks: {
            decorators: [
              {title: '굵게', value: 'strong'},
              {title: '기울임', value: 'em'},
              {title: '코드', value: 'code'}
            ],
            annotations: [
              {
                title: 'URL',
                name: 'link',
                type: 'object',
                fields: [
                  {
                    title: 'URL',
                    name: 'href',
                    type: 'url',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: {hotspot: true},
        },
        {
          type: 'code',
          options: {
            language: 'javascript',
            languageAlternatives: [
              {title: 'JavaScript', value: 'javascript'},
              {title: 'TypeScript', value: 'typescript'},
              {title: 'Python', value: 'python'},
              {title: 'CSS', value: 'css'},
              {title: 'HTML', value: 'html'},
              {title: 'Bash', value: 'bash'},
            ],
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      subtitle: 'publishedAt'
    },
    prepare(selection) {
      const {title, media, subtitle} = selection
      return {
        title,
        media,
        subtitle: subtitle && new Date(subtitle).toLocaleDateString('ko-KR')
      }
    }
  }
})
