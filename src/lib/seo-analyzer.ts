import { SEOAnalysis, SEOCheck, SERPPreview } from '@/types/blog';

export interface SEOAnalyzeOptions {
  title: string;
  content: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  slug: string;
  featured_image_url?: string;
  og_title?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
}

export class SEOAnalyzer {
  private readonly TITLE_MIN_LENGTH = 30;
  private readonly TITLE_MAX_LENGTH = 60;
  private readonly DESCRIPTION_MIN_LENGTH = 120;
  private readonly DESCRIPTION_MAX_LENGTH = 160;
  private readonly CONTENT_MIN_LENGTH = 300;
  private readonly KEYWORD_DENSITY_MIN = 0.5;
  private readonly KEYWORD_DENSITY_MAX = 2.5;
  private readonly HEADING_STRUCTURE_REQUIRED = true;

  public analyze(options: SEOAnalyzeOptions): SEOAnalysis {
    const checks: SEOCheck[] = [];

    // Title Analysis
    checks.push(this.analyzeTitleLength(options.title));
    checks.push(this.analyzeMetaTitleLength(options.meta_title));
    checks.push(this.analyzeTitleKeyword(options.title, options.focus_keyword));

    // Description Analysis
    checks.push(this.analyzeMetaDescriptionLength(options.meta_description));
    checks.push(this.analyzeDescriptionKeyword(options.meta_description, options.focus_keyword));

    // Content Analysis
    checks.push(this.analyzeContentLength(options.content));
    checks.push(this.analyzeKeywordDensity(options.content, options.focus_keyword));
    checks.push(this.analyzeHeadingStructure(options.content));

    // URL Analysis
    checks.push(this.analyzeSlugStructure(options.slug, options.focus_keyword));

    // Image Analysis
    checks.push(this.analyzeImageOptimization(options.featured_image_url));

    // Social Media Analysis
    checks.push(this.analyzeOpenGraphTags(options));
    checks.push(this.analyzeTwitterTags(options));

    // Readability Analysis
    checks.push(this.analyzeReadability(options.content));

    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const maxScore = checks.reduce((sum, check) => sum + check.maxScore, 0);

    return {
      score: totalScore,
      maxScore,
      checks,
      recommendations: this.generateRecommendations(checks),
    };
  }

  public generateSERPPreview(options: SEOAnalyzeOptions): SERPPreview {
    const title = options.meta_title || options.title;
    const description = options.meta_description || options.excerpt || '';
    const url = `https://iwishbag.com/blog/${options.slug}`;

    return {
      title: this.truncateText(title, 60),
      url,
      description: this.truncateText(description, 160),
      breadcrumb: 'iwishBag › Blog',
    };
  }

  private analyzeTitleLength(title: string): SEOCheck {
    const length = title.length;

    if (length >= this.TITLE_MIN_LENGTH && length <= this.TITLE_MAX_LENGTH) {
      return {
        id: 'title-length',
        title: 'Title Length',
        description: 'Title length is optimal for SEO',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'title-length',
      title: 'Title Length',
      description: `Title should be ${this.TITLE_MIN_LENGTH}-${this.TITLE_MAX_LENGTH} characters (current: ${length})`,
      status: 'failed',
      score: 0,
      maxScore: 10,
      recommendation: `Adjust title length to ${this.TITLE_MIN_LENGTH}-${this.TITLE_MAX_LENGTH} characters`,
    };
  }

  private analyzeMetaTitleLength(metaTitle?: string): SEOCheck {
    if (!metaTitle) {
      return {
        id: 'meta-title',
        title: 'Meta Title',
        description: 'Meta title is missing',
        status: 'failed',
        score: 0,
        maxScore: 10,
        recommendation: 'Add a meta title for better SEO',
      };
    }

    const length = metaTitle.length;

    if (length <= this.TITLE_MAX_LENGTH) {
      return {
        id: 'meta-title',
        title: 'Meta Title',
        description: 'Meta title length is good',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'meta-title',
      title: 'Meta Title',
      description: `Meta title too long (${length} characters)`,
      status: 'warning',
      score: 5,
      maxScore: 10,
      recommendation: `Shorten meta title to under ${this.TITLE_MAX_LENGTH} characters`,
    };
  }

  private analyzeTitleKeyword(title: string, keyword?: string): SEOCheck {
    if (!keyword) {
      return {
        id: 'title-keyword',
        title: 'Focus Keyword in Title',
        description: 'No focus keyword specified',
        status: 'warning',
        score: 0,
        maxScore: 10,
        recommendation: 'Set a focus keyword for better SEO analysis',
      };
    }

    const hasKeyword = title.toLowerCase().includes(keyword.toLowerCase());

    if (hasKeyword) {
      return {
        id: 'title-keyword',
        title: 'Focus Keyword in Title',
        description: 'Focus keyword found in title',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'title-keyword',
      title: 'Focus Keyword in Title',
      description: 'Focus keyword not found in title',
      status: 'failed',
      score: 0,
      maxScore: 10,
      recommendation: `Include the focus keyword "${keyword}" in your title`,
    };
  }

  private analyzeMetaDescriptionLength(metaDescription?: string): SEOCheck {
    if (!metaDescription) {
      return {
        id: 'meta-description',
        title: 'Meta Description',
        description: 'Meta description is missing',
        status: 'failed',
        score: 0,
        maxScore: 10,
        recommendation: 'Add a meta description for better SEO',
      };
    }

    const length = metaDescription.length;

    if (length >= this.DESCRIPTION_MIN_LENGTH && length <= this.DESCRIPTION_MAX_LENGTH) {
      return {
        id: 'meta-description',
        title: 'Meta Description',
        description: 'Meta description length is optimal',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'meta-description',
      title: 'Meta Description',
      description: `Meta description should be ${this.DESCRIPTION_MIN_LENGTH}-${this.DESCRIPTION_MAX_LENGTH} characters (current: ${length})`,
      status: 'warning',
      score: 5,
      maxScore: 10,
      recommendation: `Adjust meta description to ${this.DESCRIPTION_MIN_LENGTH}-${this.DESCRIPTION_MAX_LENGTH} characters`,
    };
  }

  private analyzeDescriptionKeyword(description?: string, keyword?: string): SEOCheck {
    if (!keyword || !description) {
      return {
        id: 'description-keyword',
        title: 'Focus Keyword in Description',
        description: 'Cannot analyze without focus keyword and description',
        status: 'warning',
        score: 0,
        maxScore: 10,
        recommendation: 'Set focus keyword and meta description',
      };
    }

    const hasKeyword = description.toLowerCase().includes(keyword.toLowerCase());

    if (hasKeyword) {
      return {
        id: 'description-keyword',
        title: 'Focus Keyword in Description',
        description: 'Focus keyword found in meta description',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'description-keyword',
      title: 'Focus Keyword in Description',
      description: 'Focus keyword not found in meta description',
      status: 'failed',
      score: 0,
      maxScore: 10,
      recommendation: `Include the focus keyword "${keyword}" in your meta description`,
    };
  }

  private analyzeContentLength(content: string): SEOCheck {
    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length;

    if (wordCount >= this.CONTENT_MIN_LENGTH) {
      return {
        id: 'content-length',
        title: 'Content Length',
        description: `Content has ${wordCount} words (good for SEO)`,
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'content-length',
      title: 'Content Length',
      description: `Content has ${wordCount} words (minimum ${this.CONTENT_MIN_LENGTH} recommended)`,
      status: 'warning',
      score: 5,
      maxScore: 10,
      recommendation: `Add more content to reach at least ${this.CONTENT_MIN_LENGTH} words`,
    };
  }

  private analyzeKeywordDensity(content: string, keyword?: string): SEOCheck {
    if (!keyword) {
      return {
        id: 'keyword-density',
        title: 'Keyword Density',
        description: 'No focus keyword specified',
        status: 'warning',
        score: 0,
        maxScore: 10,
        recommendation: 'Set a focus keyword to analyze density',
      };
    }

    const words = content.toLowerCase().split(/\s+/);
    const keywordCount = words.filter((word) => word.includes(keyword.toLowerCase())).length;
    const density = (keywordCount / words.length) * 100;

    if (density >= this.KEYWORD_DENSITY_MIN && density <= this.KEYWORD_DENSITY_MAX) {
      return {
        id: 'keyword-density',
        title: 'Keyword Density',
        description: `Keyword density is ${density.toFixed(1)}% (optimal)`,
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    const status = density < this.KEYWORD_DENSITY_MIN ? 'failed' : 'warning';
    const recommendation =
      density < this.KEYWORD_DENSITY_MIN
        ? `Increase keyword usage (current: ${density.toFixed(1)}%, target: ${this.KEYWORD_DENSITY_MIN}-${this.KEYWORD_DENSITY_MAX}%)`
        : `Reduce keyword usage to avoid over-optimization (current: ${density.toFixed(1)}%, target: ${this.KEYWORD_DENSITY_MIN}-${this.KEYWORD_DENSITY_MAX}%)`;

    return {
      id: 'keyword-density',
      title: 'Keyword Density',
      description: `Keyword density is ${density.toFixed(1)}%`,
      status,
      score: status === 'warning' ? 5 : 0,
      maxScore: 10,
      recommendation,
    };
  }

  private analyzeHeadingStructure(content: string): SEOCheck {
    const headings = content.match(/^#+\s+.+$/gm) || [];

    if (headings.length === 0) {
      return {
        id: 'heading-structure',
        title: 'Heading Structure',
        description: 'No headings found in content',
        status: 'failed',
        score: 0,
        maxScore: 10,
        recommendation: 'Add headings (H2, H3) to improve content structure',
      };
    }

    const hasH2 = headings.some((h) => h.startsWith('##'));

    if (hasH2) {
      return {
        id: 'heading-structure',
        title: 'Heading Structure',
        description: `Found ${headings.length} headings with proper structure`,
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'heading-structure',
      title: 'Heading Structure',
      description: `Found ${headings.length} headings but missing H2 tags`,
      status: 'warning',
      score: 5,
      maxScore: 10,
      recommendation: 'Add H2 headings to improve content structure',
    };
  }

  private analyzeSlugStructure(slug: string, keyword?: string): SEOCheck {
    const isGoodSlug = slug.length <= 60 && !/[^a-z0-9-]/.test(slug);

    if (!isGoodSlug) {
      return {
        id: 'slug-structure',
        title: 'URL Structure',
        description: 'URL slug contains invalid characters or is too long',
        status: 'failed',
        score: 0,
        maxScore: 10,
        recommendation: 'Use only lowercase letters, numbers, and hyphens in URL',
      };
    }

    if (keyword && slug.includes(keyword.toLowerCase().replace(/\s+/g, '-'))) {
      return {
        id: 'slug-structure',
        title: 'URL Structure',
        description: 'URL contains focus keyword and follows best practices',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'slug-structure',
      title: 'URL Structure',
      description: 'URL structure is good but could include focus keyword',
      status: 'warning',
      score: 7,
      maxScore: 10,
      recommendation: 'Consider including focus keyword in URL slug',
    };
  }

  private analyzeImageOptimization(imageUrl?: string): SEOCheck {
    if (!imageUrl) {
      return {
        id: 'image-optimization',
        title: 'Featured Image',
        description: 'No featured image specified',
        status: 'warning',
        score: 0,
        maxScore: 10,
        recommendation: 'Add a featured image to improve social sharing',
      };
    }

    return {
      id: 'image-optimization',
      title: 'Featured Image',
      description: 'Featured image is present',
      status: 'passed',
      score: 10,
      maxScore: 10,
    };
  }

  private analyzeOpenGraphTags(options: SEOAnalyzeOptions): SEOCheck {
    const hasOgTitle = !!options.og_title;
    const hasOgDescription = !!options.og_description;
    const hasOgImage = !!options.og_image;

    const completeness = [hasOgTitle, hasOgDescription, hasOgImage].filter(Boolean).length;

    if (completeness === 3) {
      return {
        id: 'opengraph-tags',
        title: 'OpenGraph Tags',
        description: 'All OpenGraph tags are present',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    const missing = [];
    if (!hasOgTitle) missing.push('title');
    if (!hasOgDescription) missing.push('description');
    if (!hasOgImage) missing.push('image');

    return {
      id: 'opengraph-tags',
      title: 'OpenGraph Tags',
      description: `Missing OpenGraph: ${missing.join(', ')}`,
      status: 'warning',
      score: completeness * 3,
      maxScore: 10,
      recommendation: `Add OpenGraph ${missing.join(', ')} for better social sharing`,
    };
  }

  private analyzeTwitterTags(options: SEOAnalyzeOptions): SEOCheck {
    const hasTwitterTitle = !!options.twitter_title;
    const hasTwitterDescription = !!options.twitter_description;
    const hasTwitterImage = !!options.twitter_image;

    const completeness = [hasTwitterTitle, hasTwitterDescription, hasTwitterImage].filter(
      Boolean,
    ).length;

    if (completeness === 3) {
      return {
        id: 'twitter-tags',
        title: 'Twitter Cards',
        description: 'All Twitter Card tags are present',
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    const missing = [];
    if (!hasTwitterTitle) missing.push('title');
    if (!hasTwitterDescription) missing.push('description');
    if (!hasTwitterImage) missing.push('image');

    return {
      id: 'twitter-tags',
      title: 'Twitter Cards',
      description: `Missing Twitter Card: ${missing.join(', ')}`,
      status: 'warning',
      score: completeness * 3,
      maxScore: 10,
      recommendation: `Add Twitter Card ${missing.join(', ')} for better social sharing`,
    };
  }

  private analyzeReadability(content: string): SEOCheck {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;

    if (avgWordsPerSentence <= 20) {
      return {
        id: 'readability',
        title: 'Readability',
        description: `Average sentence length: ${avgWordsPerSentence.toFixed(1)} words (good)`,
        status: 'passed',
        score: 10,
        maxScore: 10,
      };
    }

    return {
      id: 'readability',
      title: 'Readability',
      description: `Average sentence length: ${avgWordsPerSentence.toFixed(1)} words (too long)`,
      status: 'warning',
      score: 5,
      maxScore: 10,
      recommendation: 'Use shorter sentences to improve readability',
    };
  }

  private generateRecommendations(checks: SEOCheck[]): string[] {
    return checks
      .filter((check) => check.recommendation)
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
      .slice(0, 5)
      .map((check) => check.recommendation!);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}

export const seoAnalyzer = new SEOAnalyzer();
