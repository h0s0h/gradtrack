export interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

export interface Post {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  code_snippet: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  codeData?: {
    content: string;
    language: string;
    [key: string]: any;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  code_snippet: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  codeData?: {
    content: string;
    language: string;
    [key: string]: any;
  };
}

export interface PostView {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
  user?: User;
}

export interface PostWithDetails extends Post {
  user: User;
  comments: Comment[];
  views: PostView[];
  viewers: User[];
} 