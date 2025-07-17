import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BlogPost } from '@/types/blog';

interface MetaTagsProps {
  post: BlogPost;
  baseUrl?: string;
}

export const MetaTags: React.FC<MetaTagsProps> = ({ post, baseUrl = 'https://iwishbag.com' }) => {
  const fullUrl = `${baseUrl}/blog/${post.slug}`;
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || '';
  const image = post.featured_image_url || `${baseUrl}/images/default-blog-image.jpg`;

  // OpenGraph data
  const ogTitle = post.og_title || title;
  const ogDescription = post.og_description || description;
  const ogImage = post.og_image || image;

  // Twitter data
  const twitterTitle = post.twitter_title || ogTitle;
  const twitterDescription = post.twitter_description || ogDescription;
  const twitterImage = post.twitter_image || ogImage;

  // Keywords from category and tags
  const keywords = [
    post.category?.name,
    ...(post.tags?.map((tag) => tag.name) || []),
    post.focus_keyword,
    'iwishBag',
    'international shopping',
    'e-commerce',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="iwishBag" />
      <link rel="canonical" href={post.canonical_url || fullUrl} />

      {/* Open Graph Tags */}
      <meta property="og:type" content="article" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="iwishBag Blog" />

      {/* Article-specific Open Graph */}
      <meta property="article:author" content="iwishBag" />
      <meta property="article:published_time" content={post.published_at} />
      <meta property="article:modified_time" content={post.updated_at} />
      <meta property="article:section" content={post.category?.name} />
      {post.tags?.map((tag) => (
        <meta key={tag.id} property="article:tag" content={tag.name} />
      ))}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@iwishBag" />
      <meta name="twitter:creator" content="@iwishBag" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={twitterImage} />

      {/* Additional SEO Tags */}
      <meta name="robots" content="index,follow" />
      <meta name="googlebot" content="index,follow,snippet,archive" />
      <meta name="theme-color" content="#3B82F6" />

      {/* Structured Data - JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: title,
          description: description,
          image: image,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          author: {
            '@type': 'Organization',
            name: 'iwishBag',
            url: baseUrl,
          },
          publisher: {
            '@type': 'Organization',
            name: 'iwishBag',
            url: baseUrl,
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/images/logo.png`,
            },
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': fullUrl,
          },
          articleSection: post.category?.name,
          keywords: keywords,
          wordCount: post.content.split(/\s+/).length,
          timeRequired: `PT${post.reading_time_minutes}M`,
          url: fullUrl,
          isAccessibleForFree: true,
          audience: {
            '@type': 'Audience',
            name: 'International shoppers and e-commerce enthusiasts',
          },
          about: {
            '@type': 'Thing',
            name: 'International Shopping',
            description: 'Tips and guides for international e-commerce shopping',
          },
          mentions:
            post.tags?.map((tag) => ({
              '@type': 'Thing',
              name: tag.name,
            })) || [],
        })}
      </script>

      {/* Breadcrumb Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: baseUrl,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Blog',
              item: `${baseUrl}/blog`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: post.category?.name || 'Category',
              item: `${baseUrl}/blog/category/${post.category?.slug}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: post.title,
              item: fullUrl,
            },
          ],
        })}
      </script>

      {/* Organization Schema */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'iwishBag',
          url: baseUrl,
          logo: `${baseUrl}/images/logo.png`,
          description:
            'Your ultimate destination for international shopping from Amazon, Flipkart, eBay, and more',
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            url: `${baseUrl}/contact`,
          },
          sameAs: [
            'https://facebook.com/iwishBag',
            'https://twitter.com/iwishBag',
            'https://instagram.com/iwishBag',
            'https://linkedin.com/company/iwishBag',
          ],
        })}
      </script>
    </Helmet>
  );
};
