import BlogPostForm from "../../BlogPostForm";

type PageProps = {
  params: Promise<{ postId: string }>;
};

export default async function EditBlogPostPage({ params }: PageProps) {
  const { postId } = await params;
  return <BlogPostForm mode="edit" postId={postId} />;
}
