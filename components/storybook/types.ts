export interface BookPage {
  id: string;
  imageUrl: string;
  narrationAudio?: string;
}

export interface StoryBookData {
  title: string;
  subtitle?: string;
  pages: BookPage[];
}
