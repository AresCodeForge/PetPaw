import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { processMarkdown } from "@/lib/markdown";
import BlogPostClient from "./BlogPostClient";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title_en, title_el, meta_description_en, meta_description_el, excerpt_en, excerpt_el, featured_image")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!post) {
    return {
      title: "Post Not Found — PetPaw",
    };
  }

  const title = `${post.title_en} — PetPaw`;
  const description = post.meta_description_en || post.excerpt_en || "Read this article on PetPaw Blog";

  return {
    title,
    description,
    openGraph: {
      title: post.title_en,
      description,
      images: post.featured_image ? [post.featured_image] : [],
      type: "article",
    },
    twitter: {
      card: post.featured_image ? "summary_large_image" : "summary",
      title: post.title_en,
      description,
      images: post.featured_image ? [post.featured_image] : [],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select(`
      id,
      slug,
      title_en,
      title_el,
      content_en,
      content_el,
      excerpt_en,
      excerpt_el,
      featured_image,
      published_at,
      writer_name,
      category:blog_categories(id, slug, name_en, name_el)
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !post) {
    notFound();
  }

  // Process Markdown content on the server for both languages
  const [processedEn, processedEl] = await Promise.all([
    processMarkdown(post.content_en || ""),
    processMarkdown(post.content_el || ""),
  ]);

  // Handle category - Supabase returns as array, we need single object
  const category = Array.isArray(post.category) 
    ? (post.category[0] || null) 
    : post.category;

  // Prepare the post data with processed content
  const postWithProcessedContent = {
    ...post,
    category,
    content_html_en: processedEn.html,
    content_html_el: processedEl.html,
    reading_time_en: processedEn.readingTime,
    reading_time_el: processedEl.readingTime,
    headings_en: processedEn.headings,
    headings_el: processedEl.headings,
  };

  return <BlogPostClient post={postWithProcessedContent} />;
}
