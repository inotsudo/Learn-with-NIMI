export interface BookPage {
  id: string;
  imageUrl: string;
  narrationAudio?: string;
  text?: string;
}

export interface StoryBookData {
  title: string;
  subtitle?: string;
  pages: BookPage[];
}
