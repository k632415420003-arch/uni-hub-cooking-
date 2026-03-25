export interface Comment {
  id: string;
  author: string;
  text: string;
  image?: string; // base64 or URL
  replies?: Comment[];
}

export interface ContentItem {
  id: string;
  type: 'workshop' | 'recipe';
  title: string;
  images: string[]; // base64 or URL
  content: string;
  comments: Comment[];
  createdAt: number;
}
