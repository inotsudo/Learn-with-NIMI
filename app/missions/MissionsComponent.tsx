'use client';

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import supabase from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import HTMLFlipBook from "react-pageflip";
import { Label } from "@/components/ui/label";
import { useNimiReader } from "@/contexts/NimiReaderContext"; 
import { toast } from "sonner";
import Tesseract from "tesseract.js";
import NimiReaderButton from "@/components/NimiReaderButton";
import { BookOpen } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { Download } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { Palette } from "lucide-react";
import { Play } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Trophy } from "lucide-react";
import { Video } from "lucide-react";
import { X } from "lucide-react";
import { Clock } from "lucide-react";

const t = (
  key: string, // allow any string now
  params?: Record<string, any>,
  language: keyof typeof translations = "en"
) => {
  const translationObj = translations[language] as Record<string, string> || translations.en as Record<string, string>;

  let translation = translationObj[key] || (translations.en as Record<string, string>)[key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      translation = translation.replace(`{${k}}`, v);
    });
  }

  return translation;
};

const translations = {
  en: {
    magicalLearning: "Magical Learning",
    watchMagic: "Watch Magic",
    completeMission: "Complete Mission",
    completed: "Completed!",
    dayComplete: "Day Complete!",
    masteredDay: "You mastered {date}'s magic!",
    awesome: "Awesome!",
    readNow: "Read Now",
    colorNow: "Color Now",
    preparingMagic: "✨ Preparing tomorrow's magic... ✨",
    previousPage: "Previous Page",
    nextPage: "Next Page",
    pageCount: "Page {current} of {total}",
    loadingMissions: "Loading missions...",
    enterChildName: "Enter your child's name",
    childName: "Child's Name",
    submit: "Submit",
    cancel: "Cancel",
    childNotFound: "Child not found. Please check the name and try again.",
    storyTime: "Story Time",
    coloringBook: "Coloring Book",
    pages: "pages",
    pauseMusic: "Pause music",
    playMusic: "Play music",
    genericSong: "Generic Song",
    playVideo: "Play Video",
    missionCompleted: "Mission completed!",
    missionAlreadyCompleted: "Mission already completed!",
    watchVideoFirst: "Watch video first",
    pleaseWatchVideo: "Please watch the video to completion before completing the mission",
    viewSlides: "View Slides",
    downloadContent: "Download Content",
    comingSoon: "Coming Soon",
    availableAtMidnight: "New content available at midnight!",
    flipbook: "Flipbook",
    today: "Today",
    tomorrow: "Tomorrow"
  },
  es: {
    magicalLearning: "Aprendizaje Mágico",
    watchMagic: "Ver Magia",
    completeMission: "Completar Misión",
    completed: "¡Completado!",
    dayComplete: "¡Día Completado!",
    masteredDay: "¡Dominaste la magia del {date}!",
    awesome: "¡Increíble!",
    readNow: "Leer Ahora",
    colorNow: "Colorear Ahora",
    preparingMagic: "✨ Preparando la magia de mañana... ✨",
    previousPage: "Página Anterior",
    nextPage: "Página Siguiente",
    pageCount: "Página {current} de {total}",
    loadingMissions: "Cargando misiones...",
    enterChildName: "Ingrese el nombre de su hijo",
    childName: "Nombre del Niño",
    submit: "Enviar",
    cancel: "Cancelar",
    childNotFound: "Niño no encontrado. Por favor verifique el nombre e intente nuevamente.",
    storyTime: "Hora del Cuento",
    coloringBook: "Libro para Colorear",
    pages: "páginas",
    pauseMusic: "Pausar música",
    playMusic: "Reproducir música",
    genericSong: "Canción Genérica",
    playVideo: "Reproducir Video",
    missionCompleted: "¡Misión completada!",
    missionAlreadyCompleted: "¡Misión ya completada!",
    watchVideoFirst: "Ver video primero",
    pleaseWatchVideo: "Por favor mira el video completo antes de completar la misión",
    viewSlides: "Ver Diapositivas",
    downloadContent: "Descargar Contenido",
    comingSoon: "Próximamente",
    availableAtMidnight: "¡Nuevo contenido disponible a medianoche!",
    flipbook: "Libro interactivo",
    today: "Hoy",
    tomorrow: "Mañana"
  },
  fr: {
    magicalLearning: "Apprentissage Magique",
    watchMagic: "Regarder la Magie",
    completeMission: "Terminer la Mission",
    completed: "Terminé!",
    dayComplete: "Jour Terminé!",
    masteredDay: "Vous avez maîtrisé la magie du {date}!",
    awesome: "Génial!",
    readNow: "Lire Maintenant",
    colorNow: "Colorier Maintenant",
    preparingMagic: "✨ Préparation de la magie de demain... ✨",
    previousPage: "Page Précédente",
    nextPage: "Page Suivante",
    pageCount: "Page {current} sur {total}",
    loadingMissions: "Chargement des missions...",
    enterChildName: "Entrez le nombre de votre enfant",
    childName: "Nom de l'Enfant",
    submit: "Soumettre",
    cancel: "Annuler",
    childNotFound: "Enfant non trouvé. Veuillez vérifier le nom et réessayer.",
    storyTime: "Heure du Conte",
    coloringBook: "Livre de Coloriage",
    pages: "pages",
    pauseMusic: "Pause musique",
    playMusic: "Lecture musique",
    genericSong: "Chanson Générique",
    playVideo: "Lire la Vidéo",
    missionCompleted: "Mission terminée!",
    missionAlreadyCompleted: "Mission déjà terminée!",
    watchVideoFirst: "Regarder la vidéo d'abord",
    pleaseWatchVideo: "Veuillez regarder la vidéo jusqu'au bout avant de terminer la mission",
    viewSlides: "Voir les Diapositivas",
    downloadContent: "Télécharger le Contenido",
    comingSoon: "Bientôt disponible",
    availableAtMidnight: "Nouveau contenu disponible à minuit!",
    flipbook: "Livre animé",
    today: "Aujourd'hui",
    tomorrow: "Demain"
  },
  rw: {
    magicalLearning: "Kwiga Ubumenyi",
    watchMagic: "Reba Ubumenyi",
    completeMission: "Komeza Umurimo",
    completed: "Byarakozwe!",
    dayComplete: "Umunsi Warakomeje!",
    masteredDay: "Warakoze ubumenyi bwa {date}!",
    awesome: "Nibbyiza!",
    readNow: "Soma None",
    colorNow: "Paka None",
    preparingMagic: "✨ Gutegura ubumenyi bwa ejo... ✨",
    previousPage: "Ipaji y'Ibanjirije",
    nextPage: "Ipaji Ikurikira",
    pageCount: "Ipaji {current} muri {total}",
    loadingMissions: "Kuringaniza imirimo...",
    enterChildName: "Andika izina ry'umwana wawe",
    childName: "Izina ry'Umwana",
    submit: "Ohereza",
    cancel: "Hagarika",
    childNotFound: "Umwana ntabwo yabonetse. Ngaho cegeranya izina unongere ugerageze.",
    storyTime: "Igiro cy'Inkuru",
    coloringBook: "Igito cyo Gupaka",
    pages: "ipaji",
    pauseMusic: "Pause umuziki",
    playMusic: "Kina umuziki",
    genericSong:"Indirimbo Rusange",
    playVideo: "Videra Video",
    missionCompleted: "Umurimo warangiye!",
    missionAlreadyCompleted: "Umurimo warangiye kera!",
    watchVideoFirst: "Reba video mbere",
    pleaseWatchVideo: "Nyamuneka reba video ukomeza mbere y'uko ukomeza umurimo",
    viewSlides: "Reba Amapikisiki",
    downloadContent: "Kuramo Ibirimo",
    comingSoon: "Biraza",
    availableAtMidnight: "Ibirimo bishya bizaba hashize ijoro!",
    flipbook: "Igito cy'igitendo",
    today: "Uyu munsi",
    tomorrow: "Ejo"
  },
  sw: {
    magicalLearning: "Kujifunza Kichawi",
    watchMagic: "Tazama Uchawi",
    completeMission: "Kamilisha Kazi",
    completed: "Imekamilika!",
    dayComplete: "Siku Imekamilika!",
    masteredDay: "Umeshinda uchawi wa {date}!",
    awesome: "Nzuri!",
    readNow: "Soma Sasa",
    colorNow: "Rangi Sasa",
    preparingMagic: "✨ Kuandaa uchawi wa kesho... ✨",
    previousPage: "Ukurasa Uliotangulia",
    nextPage: "Ukurasa Unaofuata",
    pageCount: "Ukurasa {current} kati ya {total}",
    loadingMissions: "Inapakia misheni...",
    enterChildName: "Weka jina la mtoto wako",
    childName: "Jina la Mtoto",
    submit: "Wasilisha",
    cancel: "Ghairi",
    childNotFound: "Mtoto hajapatikana. Tafadhali angalia jina na ujaribu tena.",
    storyTime: "Wakati wa Hadithi",
    coloringBook: "Kitabu cha Rangi",
    pages: "kurasa",
    pauseMusic: "Pausa muziki",
    playMusic: "Cheza muziki",
    genericSong: "Wimbo wa Jumla",
    playVideo: "Cheza Video",
    missionCompleted: "Misheni imekamilika!",
    missionAlreadyCompleted: "Misheni tayari imekamilika!",
    watchVideoFirst: "Tazama video kwanza",
    pleaseWatchVideo: "Tafadhali tazama video hadi mwisho kabla ya kukamilisha misheni",
    viewSlides: "Tazama Slaidi",
    downloadContent: "Pakua Yaliyomo",
    comingSoon: "Inakuja",
    availableAtMidnight: "Yaliyomo mapya yatakuwapo saa sita usiku!",
    flipbook: "Kitabu cha kurasa zinazogeuka",
    today: "Leo",
    tomorrow: "Kesho"
  }
};

// Types
interface BookCover {
  id: string;
  day: number;
  cover_type: 'story' | 'coloring';
  cover_url: string;
  spine_color: string;
  title: string;
}

interface Mission {
  id: string;
  day: number;
  title: string;
  description: string;
  duration_minutes: number;
  points: number;
  video_url: string;
  slides_url?: string;
  difficulty: number;
  mission_type: string;
}

interface CompletionData {
  mission_id: string;
  completed_at: string;
  child_name?: string;
}

interface DayData {
  day: number;
  title: string;
  theme: string;
  emoji: string;
  missions: Mission[];
}

interface AudioTrack {
  id: string;
  title: string;
  audio_url: string;
  is_default?: boolean;
}

interface StoryPage {
  id: string;
  day: number;
  page_number: number;
  image_url: string;
  text: string;
}

interface ColoringPage {
  id: string;
  day: number;
  page_number: number;
  image_url: string;
}
export interface Page {
  image_url: string;
  page_number: number;
  text?: string;
  caption?: string;
  image_alt?: string;
  ocrText?: string; // ✅ optional
}
interface FlipBookViewerProps {
  pages: Page[];
  onClose: () => void;
  type: "story" | "coloring";
  t: (key: string) => string; // translation function
}

// Update the SlidesModal component to properly display images
const SlidesModal = ({
  slides,
  onClose,
  mission,
  onMissionComplete,
  t
}: {
  slides: { image_url: string; title?: string; description?: string }[];
  onClose: () => void;
  mission: Mission;
  onMissionComplete: (mission: Mission) => void;
  t: (key: string) => string;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [processedSlides, setProcessedSlides] = useState<typeof slides>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Process Supabase URLs
  useEffect(() => {
    const processSlideImages = async () => {
      const processed = await Promise.all(
        slides.map(async (slide) => {
          if (slide.image_url.startsWith("supabase://")) {
            const path = slide.image_url.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data: { publicUrl } } = await supabase.storage
              .from("mission_slides")
              .getPublicUrl(filePath.join("/"));
            return { ...slide, image_url: publicUrl };
          }
          return slide;
        })
      );
      setProcessedSlides(processed);
      setIsLoading(false);
    };
    processSlideImages();
  }, [slides]);

  const nextSlide = () => {
    if (currentSlide < processedSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setImageError(false);
    } else {
      onMissionComplete(mission);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setImageError(false);
    }
  };

  const handleImageError = () => setImageError(true);

  const downloadSlide = async () => {
    try {
      const response = await fetch(processedSlides[currentSlide].image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slide-${currentSlide + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-4xl animate-pulse text-white">✨</div>
      </div>
    );
  }
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col h-screen">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-black/50 z-50">
          <h2 className="text-white text-lg font-semibold">
            {mission.title} - Slide {currentSlide + 1} of {processedSlides.length}
          </h2>
          <button
            onClick={onClose}
            className="text-white text-2xl bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors touch-target"
          >
            ✕
          </button>
        </div>
  
        {/* Main Image Area - Takes full height */}
        <div className="flex-1 relative overflow-hidden">
          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-center p-4">
              <div className="text-4xl mb-2">📷</div>
              <p>Failed to load image</p>
            </div>
          ) : (
            <img
              src={processedSlides[currentSlide]?.image_url}
              alt={`Slide ${currentSlide + 1}`}
              onLoad={() => setImageError(false)}
              onError={handleImageError}
              className="absolute inset-0 object-contain mx-auto"
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                margin: 'auto'
              }}
            />
          )}
        </div>
  
        {/* Bottom Controls */}
        <div className="bg-black/70 p-4 backdrop-blur-sm">
          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`p-3 rounded-full bg-white/20 text-white touch-target ${
                currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/30 cursor-pointer'
              } transition-colors`}
            >
              ◀
            </button>
            
            <div className="bg-white/20 text-white px-4 py-2 rounded-full text-sm">
              Slide {currentSlide + 1} of {processedSlides.length}
            </div>
            
            <button
              onClick={nextSlide}
              className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors touch-target"
            >
              {currentSlide === processedSlides.length - 1 ? '✓' : '▶'}
            </button>
          </div>
  
          {/* Download Button - Positioned at bottom right */}
          <div className="flex justify-end">
            <button
              onClick={downloadSlide}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors touch-target"
              title="Download Slide"
            >
              <Download className="h-4 w-4" />
              <span>Download Slide</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

// Video Player Modal with disabled fast-forward and completion tracking
const VideoPlayerModal = ({ 
  videoUrl, 
  onClose, 
  mission,
  onMissionComplete,
  t
}: { 
  videoUrl: string; 
  onClose: () => void;
  mission: Mission;
  onMissionComplete: (mission: Mission) => void;
  t: (key: string) => string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === ' ') {
        e.preventDefault();
      }
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      // Prevent seeking by resetting if user tries to jump ahead
      if (videoRef.current.currentTime > currentTime + 1) {
        videoRef.current.currentTime = currentTime;
      } else {
        setCurrentTime(videoRef.current.currentTime);
        
        // Check if video is at least 95% complete
        if (videoRef.current.duration > 0 && 
            videoRef.current.currentTime / videoRef.current.duration >= 0.95 &&
            !hasCompleted) {
          setHasCompleted(true);
          onMissionComplete(mission);
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const downloadVideo = async () => {
    try {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `mission-${mission.day}-${mission.title.replace(/\s+/g, '-')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative bg-black rounded-lg overflow-hidden w-full h-auto max-h-[80vh] aspect-video max-w-6xl"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
      >
        <button
          onClick={onClose}
          className="absolute top-1 right-1 md:top-2 md:right-2 z-10 text-white text-2xl md:text-3xl bg-black/50 rounded-full p-1 md:p-2"
          aria-label="Close video"
        >
          ✕
        </button>
        
        <button
          onClick={downloadVideo}
          className="absolute top-1 left-1 md:top-2 md:left-2 z-10 text-white text-2xl md:text-3xl bg-black/50 rounded-full p-1 md:p-2"
          aria-label="Download video"
          title="Download video"
        >
          <Download className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onSeeked={handleTimeUpdate}
          onEnded={() => {
            if (!hasCompleted) {
              setHasCompleted(true);
              onMissionComplete(mission);
            }
          }}
        />
      </motion.div>
    </motion.div>
  );
};

// Morning Video Card Component
const MorningVideoCard = ({ video, t }: { video: AudioTrack | null; t: (key: string) => string }) => {
  const [openVideo, setOpenVideo] = useState(false);

  if (!video) return null;

  return (
    <>
      <motion.div 
        className="bg-gradient-to-r from-purple-100 to-blue-100 p-4 rounded-xl mb-6 border-2 border-yellow-300 w-full max-w-[400px] mx-auto cursor-pointer"
        whileHover={{ scale: 1.02 }}
        onClick={() => setOpenVideo(true)}
      >
        <div className="flex items-center justify-center gap-4">
          <div className="p-3 bg-white rounded-full shadow-md flex-shrink-0">
            <Play className="h-8 w-8 text-purple-600" />
          </div>
          <span className="text-xl font-bold truncate">{t('genericSong')}</span>
        </div>
      </motion.div>

      <AnimatePresence>
        {openVideo && (
          <VideoPlayerModal 
            videoUrl={video.audio_url}
            onClose={() => setOpenVideo(false)}
            mission={{} as Mission}
            onMissionComplete={() => {}}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Child Name Input Modal
const ChildNameModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  t 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (name: string) => void;
  t: (key: string) => string;
}) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('enterChildName')}</DialogTitle>
          <DialogDescription>
            Please enter your child's name to track their progress
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="child-name">{t('childName')}</Label>
            <Input
              id="child-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('enterChildName')}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>{t('submit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const FlipBookViewer: React.FC<FlipBookViewerProps> = ({ pages, onClose, type, t }) => {
  const [processedPages, setProcessedPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const isMobile = useIsMobile();

  const { setCurrentContent, isReading, stopReading, startReading } = useNimiReader();

  // Helper to build consistent narration
  const getNarrationForPage = (page?: Page) => {
    if (!page) return "";
    let narration = "";
    if (page.ocrText) narration += page.ocrText + " ";
    if (page.text) narration += page.text + " ";
    if (page.caption) narration += page.caption;
    return narration.trim();
  };
  function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);
  
    useEffect(() => {
      const checkSize = () => setIsMobile(window.innerWidth < breakpoint);
      checkSize();
      window.addEventListener("resize", checkSize);
      return () => window.removeEventListener("resize", checkSize);
    }, [breakpoint]);
  
    return isMobile;
  }
  // Preprocess pages: image URL + OCR
  useEffect(() => {
    const processPages = async () => {
      const newPages = await Promise.all(
        pages.map(async (page) => {
          let imageUrl = page.image_url;

          // Supabase public URL
          if (imageUrl.startsWith("supabase://")) {
            const path = imageUrl.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data } = await supabase.storage
              .from(bucket)
              .getPublicUrl(filePath.join("/"));
            imageUrl = data.publicUrl;
          }

          // OCR
          let ocrText = "";
          try {
            const { data } = await Tesseract.recognize(imageUrl, "eng");
            ocrText = data.text.trim();
          } catch (err) {
            console.error("OCR failed for page", page.page_number, err);
          }

          return {
            ...page,
            image_url: imageUrl,
            ocrText,
          };
        })
      );

      setProcessedPages(newPages);
      setIsLoading(false);

      // Read first spread
      const leftPage = newPages[0];
      const rightPage = newPages[1];
      const narration = [getNarrationForPage(leftPage), getNarrationForPage(rightPage)]
        .filter(Boolean)
        .join(" ");
      setCurrentContent(narration);
    };

    processPages();
  }, [pages, setCurrentContent]);

  // Flip pages: read spread
  const handlePageChange = (newIndex: number) => {
    setCurrentPage(newIndex);

    const leftPage = processedPages[newIndex];
    const rightPage = processedPages[newIndex + 1];

    const narration = [getNarrationForPage(leftPage), getNarrationForPage(rightPage)]
      .filter(Boolean)
      .join(" ");

    if (narration) setCurrentContent(narration);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-4xl animate-pulse">📖</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50">
        <h2 className="text-white text-lg font-semibold">
          {type === "story" ? t("storyTime") : t("coloringBook")} - {t("flipbook")}
        </h2>

        <div className="flex gap-2">
          {/* Close */}
          <button
            onClick={onClose}
            className="text-white text-2xl bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            ✕
          </button>

          {/* Pause/Resume */}
          <button
            onClick={() => {
              if (isReading) stopReading();
              else startReading();
            }}
            className="bg-yellow-500 text-black px-4 py-2 rounded-lg"
          >
            {isReading ? "⏸ Pause" : "▶️ Resume"}
          </button>
        </div>
      </div>

      {/* Flipbook */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <HTMLFlipBook
          width={isMobile ? 320 : 400}
          height={isMobile ? 480 : 550}
          showCover
          usePortrait={isMobile}
          mobileScrollSupport
          flippingTime={isMobile ? 1500 : 800}   // ✅ slower on phone
          size="fixed"
          className="shadow-2xl rounded-lg"
          onFlip={(e: any) => handlePageChange(e.data)}
        >
          {processedPages.map((page, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between p-6 rounded-[6px]"
              style={{
                backgroundImage: "url('/paper-texture.png')",
                backgroundSize: "300px 300px",
                backgroundRepeat: "repeat",
                backgroundColor: "#fdfaf4",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <img
                src={page.image_url}
                alt={page.image_alt || `Page ${idx + 1}`}
                className="rounded-md shadow-md object-contain max-h-[70%] mx-auto"
              />
              {type === "story" && page.text && (
                <p className="mt-4 text-center text-base font-serif text-gray-800 leading-relaxed">
                  {page.text}
                </p>
              )}
            </div>
          ))}
        </HTMLFlipBook>

      </div>
    </div>
  );
};

// =====================
// BOOK CARD
// =====================
const BookCard = ({
  day,
  onOpen,
  pageCount,
  coverData,
  type,
  t,
  isAvailable,
}: {
  day: number;
  onOpen: () => void;
  pageCount: number;
  coverData?: { cover_url?: string; title?: string; spine_color?: string };
  type: "story" | "coloring";
  t: (key: string) => string;
  isAvailable: boolean;
}) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchCoverImage = async () => {
      if (coverData?.cover_url) {
        if (coverData.cover_url.startsWith("supabase://")) {
          const path = coverData.cover_url.replace("supabase://", "");
          const [bucket, ...filePath] = path.split("/");
          const { data } = await supabase.storage
            .from(bucket)
            .getPublicUrl(filePath.join("/"));
          setCoverUrl(data.publicUrl);
        } else {
          setCoverUrl(coverData.cover_url);
        }
      }
    };
    fetchCoverImage();

    // Periodic animation
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 15000);
    return () => clearInterval(interval);
  }, [coverData]);

  const defaultSpineColor =
    type === "story"
      ? "linear-gradient(to bottom, #6b46c1, #553c9a)"
      : "linear-gradient(to bottom, #3182ce, #2c5282)";

  const defaultBorderColor =
    type === "story" ? "border-purple-300" : "border-yellow-300";

  const defaultButtonGradient =
    type === "story" ? "from-purple-500 to-pink-500" : "from-blue-500 to-green-500";

  const defaultIcon = type === "story" ? "📖" : "✏️";

  return (
    <motion.div
      className="relative w-full max-w-[280px] mx-auto h-[320px] perspective-1000 mb-8"
      initial={{ rotateY: type === "story" ? -5 : 5 }}
      whileHover={
        isAvailable
          ? {
              y: -10,
              rotateY: type === "story" ? 5 : -5,
              transition: { duration: 0.3 },
            }
          : {}
      }
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Spine */}
      <motion.div
        className={`absolute ${
          type === "story" ? "left-0 rounded-l-lg" : "right-0 rounded-r-lg"
        } w-8 h-full shadow-lg z-10`}
        style={{
          background: coverData?.spine_color || defaultSpineColor,
          opacity: isAvailable ? 1 : 0.7,
        }}
        animate={
          isAnimating && isAvailable
            ? {
                rotateY: [0, type === "story" ? -5 : 5, 0],
                transition: { duration: 0.8 },
              }
            : {}
        }
      />

      {/* Cover */}
      <motion.div
        className={`absolute inset-0 rounded-lg shadow-xl border-4 ${defaultBorderColor} p-6 flex flex-col items-center text-center overflow-hidden ${
          !isAvailable ? "grayscale opacity-70" : ""
        }`}
        style={{ transformStyle: "preserve-3d" }}
        animate={
          isAnimating && isAvailable
            ? {
                rotateY: [0, type === "story" ? -10 : 10, 0],
                transition: { duration: 0.8 },
              }
            : {}
        }
      >
        {coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${
              type === "story"
                ? "from-yellow-100 to-pink-100"
                : "from-blue-100 to-green-100"
            } z-0`}
          />
        )}
        
        <div className="absolute inset-0 bg-black/10 z-1" />

        {/* Content */}
        <div className="relative z-10 w-full h-full flex flex-col">
          <motion.div
            className="text-5xl mb-4"
            animate={
              isAvailable
                ? {
                    rotate: [0, type === "story" ? 5 : -5, type === "story" ? -5 : 5, 0],
                    y: [0, -5, 0],
                  }
                : {}
            }
            transition={{ repeat: Infinity, duration: type === "story" ? 8 : 6 }}
          >
            {defaultIcon}
          </motion.div>

          <h3 className="text-xl font-bold text-white drop-shadow-md">
            {coverData?.title ||
              (type === "story" ? t("storyTime") : t("coloringBook"))}
          </h3>

          <p className="text-sm mb-4 text-white/90 drop-shadow-md">
            {pageCount} {t("pages")}
          </p>

          {!isAvailable ? (
            <motion.div
              className="mt-auto gap-2 py-3 px-4 bg-gradient-to-r from-gray-400 to-gray-600 text-white w-full rounded-lg font-bold text-center"
            >
              <Clock className="h-5 w-5 inline mr-2" />
              {t("comingSoon")}
            </motion.div>
          ) : (
            <motion.button
              onClick={onOpen}
              className={`mt-auto gap-2 py-3 px-4 bg-gradient-to-r ${defaultButtonGradient} text-white w-full rounded-lg font-bold`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {type === "story" ? (
                <BookOpen className="h-5 w-5 inline mr-2" />
              ) : (
                <Palette className="h-5 w-5 inline mr-2" />
              )}
              {type === "story" ? t("readNow") : t("colorNow")}
            </motion.button>
          )}
        </div>
      </motion.div>

    {/* Hover Curl */}
    <AnimatePresence>
      {isHovered && isAvailable && (
        <motion.div
          className={`absolute ${
            type === "story" ? "right-0" : "left-0"
          } top-0 w-4 h-full z-20`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
        </motion.div>
      )}
    </AnimatePresence>
    </motion.div>
  );
};

// =====================
// DATE SELECTOR BUTTON
// =====================
const DateButton = ({
  date,
  isSelected,
  isAvailable,
  onClick,
  emoji,
  t
}: {
  date: { dayOfWeek: string, day: number, month: string, isToday: boolean, isTomorrow: boolean };
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
  emoji: string;
  t: (key: string) => string;
}) => {
  return (
    <motion.button
      onClick={isAvailable ? onClick : undefined}
      whileHover={isAvailable ? { y: -5 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      className={`flex flex-col items-center p-3 md:p-4 rounded-xl min-w-[90px] md:min-w-[110px] transition-all flex-shrink-0 relative
        ${isSelected
          ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg"
          : isAvailable 
            ? "bg-white shadow-md hover:shadow-lg" 
            : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
    >
      <motion.span 
        className="text-2xl md:text-3xl mb-1"
        animate={isSelected && isAvailable ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {isAvailable ? emoji : "⏳"}
      </motion.span>
      
      <span className="text-xs font-medium uppercase tracking-wide">
        {date.isToday ? t('today') : date.isTomorrow ? t('tomorrow') : date.dayOfWeek}
      </span>
      
      <span className="text-xl md:text-2xl font-bold my-1">{date.day}</span>
      
      <span className="text-xs font-medium uppercase tracking-wide">{date.month}</span>
      
      {!isAvailable && (
        <Clock className="h-3 w-3 mt-1" />
      )}
    </motion.button>
  );
};

const MissionCard = ({ 
  mission, 
  completed, 
  videoWatched, 
  onVideoOpen, 
  onManualComplete, 
  t, 
  index,
  missionSlides,
  setOpenSlides
}: { 
  mission: Mission; 
  completed: boolean; 
  videoWatched: boolean; 
  onVideoOpen: (mission: Mission) => void; 
  onManualComplete: (mission: Mission) => void; 
  t: (key: string) => string; 
  index: number;
  missionSlides: Record<string, any[]>;
  setOpenSlides: (slides: {slides: any[], mission: Mission}) => void;
}) => {
  const iconSrc = `/mission-icon-${index + 1}.png`;
  const missionType = mission.mission_type || 'video';
  const hasSlides = missionSlides[mission.id]?.length > 0;
  const hasVideo = mission.video_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className="w-full"
    >
      <Card className={`relative overflow-hidden border-2 transition-all w-full h-full
        ${completed ? "border-green-300 bg-green-50" : "border-purple-200 hover:border-purple-300"}`}
      >
        {completed && (
          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full">
            <CheckCircle className="h-5 w-5" />
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <img src={iconSrc} alt="Mission icon" className="h-10 w-10 object-contain" />
            <CardTitle className="text-xl">{mission.title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3">
          {/* Content Buttons */}
          <div className="grid gap-2">
            {hasVideo && (
              <Button
                onClick={() => onVideoOpen(mission)}
                className="w-full gap-2 py-4 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Video className="h-5 w-5" />
                <span>{t('watchMagic')}</span>
              </Button>
            )}

            {hasSlides && (
              <Button
                onClick={() => setOpenSlides({ slides: missionSlides[mission.id] || [], mission })}
                className="w-full gap-2 py-4 text-lg bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white"
              >
                <ImageIcon className="h-5 w-5" />
                <span>{t('viewSlides')}</span>
              </Button>
            )}
          </div>

          {/* Complete Mission Button */}
          {!completed ? (
            <Button
              onClick={() => onManualComplete(mission)}
              variant="outline"
              className={`w-full gap-2 py-4 text-lg ${
                (missionType === 'video' && !videoWatched) 
                  ? "border-gray-300 text-gray-400 cursor-not-allowed"
                  : "border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              }`}
              disabled={missionType === 'video' && !videoWatched}
            >
              <Sparkles className="h-5 w-5" />
              <span>
                {missionType === 'video' && !videoWatched 
                  ? t('watchVideoFirst') 
                  : t('completeMission')}
              </span>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-600 text-lg font-semibold p-4 bg-green-100 rounded-lg">
              <Trophy className="h-5 w-5" />
              <span>{t('completed')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Component with translations
const MissionsComponent = () => {
  const [missionProgram, setMissionProgram] = useState<DayData[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [openVideo, setOpenVideo] = useState<{url: string, mission: Mission} | null>(null);
  const [showDayCompleteModal, setShowDayCompleteModal] = useState(false);
  const [showStorybook, setShowStorybook] = useState(false);
  const [showColoringBook, setShowColoringBook] = useState(false);
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>([]);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookCovers, setBookCovers] = useState<BookCover[]>([]);
  const { language } = useLanguage();
  const [showChildNameModal, setShowChildNameModal] = useState(false);
  const [missionToComplete, setMissionToComplete] = useState<Mission | null>(null);
  const [childNotFound, setChildNotFound] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoCompletion, setVideoCompletion] = useState<Record<string, boolean>>({});
  const [openSlides, setOpenSlides] = useState<{slides: any[], mission: Mission} | null>(null);
  const [missionSlides, setMissionSlides] = useState<Record<string, any[]>>({});
  const [nimiContent, setNimiContent] = useState<string>("");
  
  // Generate dates for the mission program
  const dates = useMemo(() => {
    const now = new Date();
    return missionProgram.map(day => {
      const date = new Date(now);
      date.setDate(date.getDate() + (day.day - 1));
      
      const isToday = day.day === 1;
      const isTomorrow = day.day === 2;
      
      return {
        dayOfWeek: date.toLocaleDateString(language, { weekday: 'short' }),
        day: date.getDate(),
        month: date.toLocaleDateString(language, { month: 'short' }),
        isToday,
        isTomorrow
      };
    });
  }, [missionProgram, language]);

  // Calculate available days based on time (unlock at midnight)
  const availableDays = useMemo(() => {
    const available = new Set<number>();
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Always make day 1 available
    available.add(1);
    
    // For each subsequent day, check if current date is past the unlock date
    missionProgram.forEach(day => {
      if (day.day === 1) return; // Already added
      
      // Calculate unlock date (midnight after day-1 days)
      const unlockDate = new Date(currentYear, currentMonth, currentDay - (day.day - 1));
      unlockDate.setHours(0, 0, 0, 0);
      
      if (now >= unlockDate) {
        available.add(day.day);
      }
    });
    
    return available;
  }, [missionProgram]);

  // Check if a day is available
  const isDayAvailable = (day: number) => {
    return availableDays.has(day);
  };

  // Fetch all data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        // Fetch missions
        const { data: missions, error: missionsError } = await supabase
          .from("missions")
          .select("*")
          .order("day", { ascending: true });

        if (missionsError) throw missionsError;
        if (missions) setMissionProgram(groupMissionsByDay(missions));

        // Fetch completions from local storage first
        const storedCompletions = localStorage.getItem('missionCompletions');
        if (storedCompletions) {
          setCompletions(JSON.parse(storedCompletions));
        }

        // Also fetch from database for persistence
        const { data: dbCompletions, error: completionsError } = await supabase
          .from("mission_completions")
          .select("mission_id, completed_at, child_name");

        if (!completionsError && dbCompletions) {
          // Merge with local completions, prioritizing local ones
          setCompletions(prev => {
            const merged = [...prev];
            dbCompletions.forEach(dbCompletion => {
              if (!prev.find(c => c.mission_id === dbCompletion.mission_id)) {
                merged.push(dbCompletion);
              }
            });
            return merged;
          });
        }

        // Fetch audio track (now used as morning video)
        const { data: audioData, error: audioError } = await supabase
          .from("audio_tracks")
          .select("*")
          .eq("is_default", true)
          .single();

        if (!audioError && audioData) {
          setAudioTrack(audioData);
        }

        // Fetch book covers
        const { data: covers, error: coversError } = await supabase
          .from("book_covers")
          .select("*");

        if (!coversError) {
          setBookCovers(covers || []);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Save completions to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('missionCompletions', JSON.stringify(completions));
  }, [completions]);

  // Fetch story pages and coloring pages when day changes
  useEffect(() => {
    const fetchDayContent = async () => {
      setIsLoading(true);
      try {
        // Fetch story pages from storybook bucket
        const { data: storyData, error: storyError } = await supabase
          .from("storybook_pages")
          .select("*")
          .eq("day", selectedDay)
          .order("page_number", { ascending: true });

        if (storyError) throw storyError;
        setStoryPages(storyData || []);

        // Fetch coloring pages from coloriage bucket
        const { data: coloringData, error: coloringError } = await supabase
          .from("coloring_book_pages")
          .select("*")
          .eq("day", selectedDay)
          .order("page_number", { ascending: true });

        if (coloringError) throw coloringError;
        setColoringPages(coloringData || []);

      } catch (error) {
        console.error("Error fetching day content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isDayAvailable(selectedDay)) {
      fetchDayContent();
    }
  }, [selectedDay]);

  useEffect(() => {
    if (!missionProgram.length) return;

    const fetchMissionSlides = async () => {
      const missionIds = missionProgram.flatMap(day => day.missions.map(m => m.id));

      const { data, error } = await supabase
        .from("mission_slides")
        .select("*")
        .in("mission_id", missionIds)
        .order("slide_order", { ascending: true });

      if (error) {
        console.error("Failed to fetch slides:", error);
        return;
      }

      const groupedSlides: Record<string, any[]> = {};
      data?.forEach(slide => {
        if (!groupedSlides[slide.mission_id]) groupedSlides[slide.mission_id] = [];
        groupedSlides[slide.mission_id].push(slide);
      });

      setMissionSlides(groupedSlides);
    };

    fetchMissionSlides();
  }, [missionProgram]);
  
  const groupMissionsByDay = (missions: Mission[]) => {
    const grouped: Record<number, DayData> = {};

    missions.forEach((m) => {
      if (!grouped[m.day]) {
        grouped[m.day] = {
          day: m.day,
          title: `Day ${m.day}`,
          theme: t('magicalLearning'),
          emoji: "✨",
          missions: [],
        };
      }
      grouped[m.day].missions.push(m);
    });

    return Object.values(grouped).sort((a, b) => a.day - b.day);
  };

  const completedIds = useMemo(
    () => new Set(completions.map((c) => c.mission_id)),
    [completions]
  );

  const currentDayData = useMemo(
    () => missionProgram.find((d) => d.day === selectedDay),
    [missionProgram, selectedDay]
  );

  const handleMissionComplete = async (mission: Mission, childName?: string) => {
    // Check if mission is already completed locally first
    if (completedIds.has(mission.id)) {
      toast.info(t('missionAlreadyCompleted'));
      return;
    }

    try {
      let childId: string | null = null;
      
      // If child name is provided, find or create the child
      if (childName && childName.trim() !== '') {
        const trimmedName = childName.trim();
        
        // First try to find the child by name (get first match if multiple exist)
        const { data: existingChildren, error: findError } = await supabase
          .from('children')
          .select('id')
          .ilike('name', trimmedName)
          .limit(1);

        if (findError) {
          console.error('Error finding child:', findError);
          throw new Error(`Failed to find child: ${findError.message}`);
        }

        if (existingChildren && existingChildren.length > 0) {
          // Child exists, use their ID
          childId = existingChildren[0].id;
          
          // Check if this child has already completed this mission
          const { data: existingCompletion, error: completionError } = await supabase
            .from('mission_completions')
            .select('id')
            .eq('mission_id', mission.id)
            .eq('child_id', childId)
            .maybeSingle();

          if (completionError) {
            console.error('Error checking existing completion:', completionError);
            throw new Error(`Failed to check existing completion: ${completionError.message}`);
          }

          if (existingCompletion) {
            toast.info(t('missionAlreadyCompleted'));
            return;
          }
        } else {
          // Child doesn't exist, create a new child record
          const { data: newChild, error: createError } = await supabase
            .from('children')
            .insert([{ name: trimmedName }])
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating child:', createError);
            throw new Error(`Failed to create child: ${createError.message}`);
          }

          childId = newChild.id;
        }
      } else {
        // For anonymous completions, check if mission is already completed by anyone
        const { data: existingCompletion, error: completionError } = await supabase
          .from('mission_completions')
          .select('id')
          .eq('mission_id', mission.id)
          .is('child_id', null)
          .maybeSingle();

        if (completionError) {
          console.error('Error checking existing completion:', completionError);
          throw new Error(`Failed to check existing completion: ${completionError.message}`);
        }

        if (existingCompletion) {
          toast.info(t('missionAlreadyCompleted'));
          return;
        }
      }

      // Insert completion into Supabase
      const completionData: any = {
        mission_id: mission.id,
        completed_at: new Date().toISOString()
      };

      // Only add child_id if we have one (for anonymous completions, don't set it)
      if (childId) {
        completionData.child_id = childId;
      }

      const { data, error } = await supabase
        .from('mission_completions')
        .insert([completionData])
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate error (unique constraint violation)
        if (error.code === '23505') {
          toast.info(t('missionAlreadyCompleted'));
          return;
        }
        throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
      }

      // Update local state
      const newCompletion = {
        mission_id: mission.id,
        completed_at: new Date().toISOString(),
        child_name: childName
      };

      setCompletions((prev) => [...prev, newCompletion]);

      // Show success message
      toast.success(t('missionCompleted'));

      // Trigger confetti
      const confetti = await import("canvas-confetti");
      confetti.default({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Check if all missions for the day are completed
      if (currentDayData?.missions.every(m => completedIds.has(m.id) || m.id === mission.id)) {
        setShowDayCompleteModal(true);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      
      // Extract error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast.error(`Failed to complete mission: ${errorMessage}`);
    }
  };

  const handleVideoOpen = (mission: Mission) => {
    setOpenVideo({ url: mission.video_url, mission });
  };

  const handleVideoComplete = (mission: Mission) => {
    setVideoCompletion(prev => ({ ...prev, [mission.id]: true }));
  };

  const handleManualCompletion = (mission: Mission) => {
    // Check if video was watched to completion (for video missions)
    if (mission.mission_type === 'video' && !videoCompletion[mission.id]) {
      toast.error(t('pleaseWatchVideo'));
      return;
    }

    // Check if already completed
    if (completedIds.has(mission.id)) {
      toast.info(t('missionAlreadyCompleted'));
      return;
    }

    // Show child name modal
    setMissionToComplete(mission);
    setShowChildNameModal(true);
  };

  const handleOpenStorybook = () => {
    setShowStorybook(true);
  };

  const handleCloseStorybook = () => {
    setShowStorybook(false);
  };

  const handleOpenColoringBook = () => {
    setShowColoringBook(true);
  };

  const handleCloseColoringBook = () => {
    setShowColoringBook(false);
  };

  const handleDaySelect = (day: number) => {
    if (isDayAvailable(day)) {
      setSelectedDay(day);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-4xl animate-pulse mb-4">✨</div>
        <Skeleton className="h-8 w-48 mb-8" />
        
        <div className="flex overflow-x-auto pb-4 gap-3 w-full max-w-2xl">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <Skeleton key={day} className="h-20 w-20 rounded-xl" />
          ))}
        </div>
        
        <div className="w-full max-w-md mb-6">
          <Skeleton className="h-20 w-full rounded-xl mb-4" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {[1, 2, 3, 4].map(item => (
            <Skeleton key={item} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Date Selection */}
      <section className="mb-6 w-full px-2">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 md:mb-6 select-none">
          <motion.span 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 5 }}
            className="inline-block mr-3"
          >
            {currentDayData?.emoji || "✨"}
          </motion.span>
          {currentDayData?.theme}
        </h2>

        <div className="flex overflow-x-auto pb-4 gap-2 md:gap-3 px-2 scrollbar-thin w-full max-w-6xl mx-auto">
          {missionProgram.map((day, index) => {
            const date = dates[index];
            
            return (
              <DateButton
                key={day.day}
                date={date}
                isSelected={selectedDay === day.day}
                isAvailable={isDayAvailable(day.day)}
                onClick={() => handleDaySelect(day.day)}
                emoji={day.emoji}
                t={t}
              />
            );
          })}
        </div>
      </section>
      
      {audioTrack && <MorningVideoCard video={audioTrack} t={t} />}
      
      {/* Missions Grid */}
      {isDayAvailable(selectedDay) && currentDayData?.missions.length ? (
        <section className="max-w-6xl mx-auto px-2 md:px-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
            {currentDayData.missions.map((mission, index) => {
              const completed = completedIds.has(mission.id);
              const videoWatched = videoCompletion[mission.id];

              return (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  completed={completed}
                  videoWatched={videoWatched}
                  onVideoOpen={handleVideoOpen}
                  onManualComplete={handleManualCompletion}
                  t={t}
                  index={index}
                  missionSlides={missionSlides}
                  setOpenSlides={setOpenSlides}
                />
              );
            })}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 md:py-20 text-gray-600 text-lg w-full">
          {!isDayAvailable(selectedDay) 
            ? t('availableAtMidnight') 
            : t('preparingMagic')}
        </div>
      )}

      {/* Storybook and Coloring Book Cards */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-8 mt-6 md:mt-8 px-2">
        {storyPages.length > 0 && (
          <BookCard 
            day={selectedDay} 
            onOpen={handleOpenStorybook}
            pageCount={storyPages.length}
            coverData={bookCovers.find(c => c.day === selectedDay && c.cover_type === 'story')}
            type="story"
            t={t}
            isAvailable={isDayAvailable(selectedDay)}
          />
        )}
        
        {coloringPages.length > 0 && (
          <BookCard 
            day={selectedDay}
            onOpen={handleOpenColoringBook}
            pageCount={coloringPages.length}
            coverData={bookCovers.find(c => c.day === selectedDay && c.cover_type === 'coloring')}
            type="coloring"
            t={t}
            isAvailable={isDayAvailable(selectedDay)}
          />
        )}
      </div>

      {/* Child Name Input Modal */}
      <ChildNameModal
        isOpen={showChildNameModal}
        onClose={() => setShowChildNameModal(false)}
        onConfirm={(childName) => {
          if (missionToComplete) {
            handleMissionComplete(missionToComplete, childName);
          }
          setShowChildNameModal(false);
          setMissionToComplete(null);
        }}
        t={t}
      />

      {/* Child Not Found Toast */}
      <AnimatePresence>
        {childNotFound && (
          <motion.div
            className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <div className="flex items-center">
              <X className="h-5 w-5 mr-2" />
              <span>{t('childNotFound')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Complete Modal */}
      <AnimatePresence>
        {showDayCompleteModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl p-6 md:p-8 shadow-xl text-center w-full max-w-md border-2 border-blue-300 relative overflow-hidden"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="absolute -top-8 -left-8 text-5xl opacity-20">🏆</div>
              <div className="absolute -bottom-8 -right-8 text-5xl opacity-20">🎉</div>
              
              <motion.div
                className="text-5xl mb-4 mx-auto w-20 h-20"
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
              >
                🏅
              </motion.div>

              <h2 className="text-xl md:text-2xl font-bold mb-4 text-blue-800">{t('dayComplete')}</h2>
              <p className="text-base md:text-lg mb-6">
                {t('masteredDay', { date: dates[selectedDay - 1] ? `${dates[selectedDay - 1].dayOfWeek}, ${dates[selectedDay - 1].month} ${dates[selectedDay - 1].day}` : `Day ${selectedDay}` })}
              </p>

              <Button
                onClick={() => setShowDayCompleteModal(false)}
                className="gap-2 text-lg py-3 w-full max-w-xs mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              >
                <Sparkles className="h-5 w-5" />
                {t('awesome')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storybook Viewer */}
      <AnimatePresence>
        {showStorybook && storyPages.length > 0 && (
          <FlipBookViewer 
            pages={storyPages.map(page => ({
              image_url: page.image_url,
              page_number: page.page_number,
              text: page.text
            }))}
            onClose={handleCloseStorybook}
            type="story"
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Coloring Book Viewer */}
      <AnimatePresence>
        {showColoringBook && coloringPages.length > 0 && (
          <FlipBookViewer  
            pages={coloringPages.map(page => ({
              image_url: page.image_url,
              page_number: page.page_number
            }))}
            onClose={handleCloseColoringBook}
            type="coloring"
            t={t}
          />
        )}
      </AnimatePresence>

    {/* Video Player */}
      <AnimatePresence>
        {openVideo && (
          <VideoPlayerModal 
            videoUrl={openVideo.url}
            onClose={() => setOpenVideo(null)}
            mission={openVideo.mission}
            onMissionComplete={handleVideoComplete}
            t={t}
          />
        )}
      </AnimatePresence>

   {/* Slides Modal */}
    <AnimatePresence>
      {openSlides && (
        <SlidesModal
          slides={openSlides.slides}
          mission={openSlides.mission}
          onClose={() => setOpenSlides(null)}
          onMissionComplete={handleMissionComplete}
          t={t}
        />
      )}
    </AnimatePresence>
    
    {/* Nimi Reader Button */}
    <NimiReaderButton hide={!!openSlides || showStorybook || showColoringBook} />
    </>
  );
};

export default MissionsComponent;

function setCurrentPage(newPageIndex: number) {
  throw new Error("Function not implemented.");
}
