import type { Metadata } from "next";
import { PostForm } from "../post-form";

export const metadata: Metadata = {
  title: "Nuovo articolo · Amministrazione",
  robots: { index: false, follow: false },
};

// L'accesso è già verificato dal layout dell'area admin (e di nuovo da
// ogni azione che salva).
export default function NewBlogPostPage() {
  return <PostForm post={null} />;
}
