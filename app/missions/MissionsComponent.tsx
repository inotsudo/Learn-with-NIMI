'use client';

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
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
import { Music } from "lucide-react";
import { Heart } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const t = (
  key: string,
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
    tomorrow: "Tomorrow",
    morningMission: "Morning Mission",
    artisticMission: "Artistic Mission",
    discoveryMission: "Discovery Mission",
    movementMission: "Movement Mission",
    zoomMission: "Zoom 2025 Mission",
    toctocMission: "Toctoc Fun",
    capsuleMission: "Daily Progress Capsule",
    videoLiked: "Video added to favorites! 💖",
    videoLikeError: "Failed to add video to favorites",
    selectChild: "Select Child",
    saveToFavorites: "Save to Favorites",
    noChildrenFound: "No children found. Please add children in your profile.",
    addChildFirst: "Please add children to your profile first",
    selectYourProfile: "Select Your Profile",
    whoIsCompleting: "Who is completing this mission?",
    selectChildFirst: "Please select a child first",
    enterYourName: "Enter your name",
    yourName: "Your Name",
    saveVideo: "Save Video",
    dailyProgressCapsule: "Daily Progress Capsule",
    playAudio: "Play Audio",
    pauseAudio: "Pause Audio",
    audioPlaying: "Audio Playing..."
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
    tomorrow: "Mañana",
    morningMission: "Misión de la Mañana",
    artisticMission: "Misión Artística",
    discoveryMission: "Misión de Descubrimiento",
    movementMission: "Misión de Movimiento",
    zoomMission: "Misión Zoom 2025",
    toctocMission: "Toctoc Divertido",
    capsuleMission: "Cápsula de Progreso Diario",
    videoLiked: "¡Video agregado a favoritos! 💖",
    videoLikeError: "Error al agregar video a favoritos",
    selectChild: "Seleccionar Niño",
    saveToFavorites: "Guardar en Favoritos",
    noChildrenFound: "No se encontraron niños. Por favor agregue niños en su perfil.",
    addChildFirst: "Por favor agregue niños a su perfil primero",
    selectYourProfile: "Selecciona Tu Perfil",
    whoIsCompleting: "¿Quién está completando esta misión?",
    selectChildFirst: "Por favor selecciona un niño primero",
    enterYourName: "Ingresa tu nombre",
    yourName: "Tu Nombre",
    saveVideo: "Guardar Video",
    dailyProgressCapsule: "Cápsula de Progreso Diario",
    playAudio: "Reproducir Audio",
    pauseAudio: "Pausar Audio",
    audioPlaying: "Audio Reproduciéndose..."
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
    tomorrow: "Demain",
    morningMission: "Mission du Matin",
    artisticMission: "Mission Artistique",
    discoveryMission: "Mission de Découverte",
    movementMission: "Mission de Mouvement",
    zoomMission: "Mission Zoom 2025",
    toctocMission: "Toctoc Amusant",
    capsuleMission: "Capsule de Progrès Quotidien",
    videoLiked: "Vidéo ajoutée aux favoris! 💖",
    videoLikeError: "Échec de l'ajout de la vidéo aux favoris",
    selectChild: "Sélectionner l'Enfant",
    saveToFavorites: "Enregistrer dans les Favoris",
    noChildrenFound: "Aucun enfant trouvé. Veuillez ajouter des enfants dans votre profil.",
    addChildFirst: "Veuillez d'abord ajouter des enfants à votre profil",
    selectYourProfile: "Sélectionnez Votre Profil",
    whoIsCompleting: "Qui termine cette mission?",
    selectChildFirst: "Veuillez d'abord sélectionner un enfant",
    enterYourName: "Entrez votre nom",
    yourName: "Votre Nom",
    saveVideo: "Sauvegarder la Vidéo",
    dailyProgressCapsule: "Capsule de Progrès Quotidien",
    playAudio: "Lire l'Audio",
    pauseAudio: "Pause Audio",
    audioPlaying: "Audio en cours..."
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
    tomorrow: "Ejo",
    morningMission: "Umurimo w'Igitondo",
    artisticMission: "Umurimo w'Ubuhanzi",
    discoveryMission: "Umurimo w'Ubushakashatsi",
    movementMission: "Umurimo w'Imikorere",
    zoomMission: "Umurimo wa Zoom 2025",
    toctocMission: "Toctoc Y'ibyishimo",
    capsuleMission: "Ingingo y'Iterambere rya buri munsi",
    videoLiked: "Video yongewe mu bibyo! 💖",
    videoLikeError: "Byanze bikomeje kongeramo video mu bibyo",
    selectChild: "Hitamo Umwana",
    saveToFavorites: "Bika mu Bibyo",
    noChildrenFound: "Ntabwo abana babonetse. Nyamuneka ongeza abana mu rubuga rwawe.",
    addChildFirst: "Nyamuneka ongeza abana mu rubuga rwawe mbere",
    selectYourProfile: "Hitamo Umwirondoro",
    whoIsCompleting: "Ni nde ukomeje iyi mishini?",
    selectChildFirst: "Nyamuneka hitamo umwana mbere",
    enterYourName: "Andika izina ryawe",
    yourName: "Izina ryawe",
    saveVideo: "Bika Video",
    dailyProgressCapsule: "Ingingo y'Iterambere rya buri munsi",
    playAudio: "Kina Audio",
    pauseAudio: "Pause Audio",
    audioPlaying: "Audio iri gukina..."
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
    tomorrow: "Kesho",
    morningMission: "Misheni ya Asubuhi",
    artisticMission: "Misheni ya Sanaa",
    discoveryMission: "Misheni ya Ugunduzi",
    movementMission: "Misheni ya Mwendo",
    zoomMission: "Misheni ya Zoom 2025",
    toctocMission: "Toctoc Furaha",
    capsuleMission: "Kapsuli ya Maendeleo ya Kila Siku",
    videoLiked: "Video imeongezwa kwenye vipendwa! 💖",
    videoLikeError: "Imeshindwa kuongeza video kwenye vipendwa",
    selectChild: "Chagua Mtoto",
    saveToFavorites: "Hifadhi kwenye Vipendwa",
    noChildrenFound: "Hakuna watoto walopatikana. Tafadhali ongeza watoto kwenye wasifu wako.",
    addChildFirst: "Tafadhali ongeza watoto kwenye wasifu wako kwanza",
    selectYourProfile: "Chagua Wasifu Wako",
    whoIsCompleting: "Nani anakamilisha misheni hii?",
    selectChildFirst: "Tafadhali chagua mtoto kwanza",
    enterYourName: "Weka jina lako",
    yourName: "Jina Lako",
    saveVideo: "Hifadhi Video",
    dailyProgressCapsule: "Kapsuli ya Maendeleo ya Kila Siku",
    playAudio: "Cheza Audio",
    pauseAudio: "Pause Audio",
    audioPlaying: "Audio inacheza..."
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
  preview_url?: string;
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
  preview_url?: string;
  category?: string;
  audio_url?: string;
}

interface CompletionData {
  mission_id: string;
  completed_at: string;
  child_name?: string;
  child_id?: string;
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
  preview_url?: string; 
  is_default?: boolean;
}

interface StoryPage {
  id: string;
  day: number;
  page_number: number;
  image_url: string;
  text: string;
  audio_url?: string;
}

interface ColoringPage {
  id: string;
  day: number;
  page_number: number;
  image_url: string;
  audio_url?: string;
}

export interface Page {
  image_url: string;
  page_number: number;
  text?: string;
  caption?: string;
  image_alt?: string;
  ocrText?: string;
  audio_url?: string;
}

interface FlipBookViewerProps {
  pages: Page[];
  onClose: () => void;
  type: "story" | "coloring";
  t: (key: string) => string;
}

interface Slide {
  id: string;
  mission_id: string;
  slide_order: number;
  image_url: string;
  title?: string;
  description?: string;
  audio_url?: string;
}

interface Child {
  id: string;
  name: string;
  parent_id: string;
  created_at: string;
  avatar_url?: string;
}

// Child Avatar Selection Modal for Mission Completion
const ChildAvatarModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  children,
  t
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (childId: string) => void;
  children: Child[];
  t: (key: string) => string;
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const handleSubmit = () => {
    if (selectedChildId) {
      onConfirm(selectedChildId);
      setSelectedChildId('');
    }
  };

  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('selectYourProfile')}</DialogTitle>
          <DialogDescription>
            {t('whoIsCompleting')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedChildId === child.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedChildId(child.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={child.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getAvatarFallback(child.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{child.name}</span>
              </div>
            ))}
            {children.length === 0 && (
              <p className="text-sm text-red-500 text-center py-4">{t('noChildrenFound')}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!selectedChildId}>{t('submit')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Child Selection Modal for Video Likes (Parents)
const ChildSelectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  children,
  t
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (childId: string) => void;
  children: Child[];
  t: (key: string) => string;
}) => {
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const handleSubmit = () => {
    if (selectedChildId) {
      onConfirm(selectedChildId);
      setSelectedChildId('');
    }
  };

  const getAvatarFallback = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('selectChild')}</DialogTitle>
          <DialogDescription>
            Select which child you want to save this video for
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedChildId === child.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedChildId(child.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={child.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getAvatarFallback(child.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{child.name}</span>
              </div>
            ))}
            {children.length === 0 && (
              <p className="text-sm text-red-500 text-center py-4">{t('noChildrenFound')}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!selectedChildId}>{t('saveToFavorites')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Name Input Modal for Video Likes (Regular Users)
const NameInputModal = ({ 
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
          <DialogTitle>{t('enterYourName')}</DialogTitle>
          <DialogDescription>
            Please enter your name to save this video to favorites
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="user-name">{t('yourName')}</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('enterYourName')}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>{t('saveVideo')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Updated SlidesModal with Audio Support
const SlidesModal = ({
  slides,
  onClose,
  mission,
  onMissionComplete,
  t
}: {
  slides: Slide[];
  onClose: () => void;
  mission: Mission;
  onMissionComplete: (mission: Mission, childId?: string) => void;
  t: (key: string) => string;
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [processedSlides, setProcessedSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [userChildren, setUserChildren] = useState<Child[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { user } = useUser();

  // Fetch user's children
  const fetchUserChildren = async () => {
    if (!user) return;

    try {
      const { data: children, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching children:', error);
        return;
      }

      setUserChildren(children || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserChildren();
    }
  }, [user]);

  useEffect(() => {
    const processSlideImages = async () => {
      const processed = await Promise.all(
        slides.map(async (slide) => {
          let imageUrl = slide.image_url;
          let audioUrl = slide.audio_url;

          // Process image URL
          if (imageUrl.startsWith("supabase://")) {
            const path = imageUrl.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data: { publicUrl } } = await supabase.storage
              .from("mission_slides")
              .getPublicUrl(filePath.join("/"));
            imageUrl = publicUrl;
          }

          // Process audio URL
          if (audioUrl && audioUrl.startsWith("supabase://")) {
            const path = audioUrl.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data: { publicUrl } } = await supabase.storage
              .from("mission_slides")
              .getPublicUrl(filePath.join("/"));
            audioUrl = publicUrl;
          }

          return { ...slide, image_url: imageUrl, audio_url: audioUrl };
        })
      );
      setProcessedSlides(processed);
      setIsLoading(false);
    };
    processSlideImages();
  }, [slides]);

  // Play audio for current slide
  const playAudioForSlide = (slide: Slide) => {
    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Play new audio if available
    if (slide.audio_url) {
      const audio = new Audio(slide.audio_url);
      audio.preload = "auto";
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };
      audio.play().catch(error => {
        console.warn("Audio play failed:", error);
        setIsPlayingAudio(false);
      });
      setCurrentAudio(audio);
      setIsPlayingAudio(true);
    } else {
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < processedSlides.length - 1) {
      const nextSlideIndex = currentSlide + 1;
      setCurrentSlide(nextSlideIndex);
      setImageError(false);
      
      // Play audio for the new slide
      if (processedSlides[nextSlideIndex]) {
        playAudioForSlide(processedSlides[nextSlideIndex]);
      }
    } else {
      // Show avatar selection when completing mission from slides
      if (user && user.role === 'parent' && userChildren.length > 0) {
        setShowAvatarModal(true);
      } else {
        // For non-parents or parents without children, complete without child_id
        onMissionComplete(mission);
        onClose();
      }
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      const prevSlideIndex = currentSlide - 1;
      setCurrentSlide(prevSlideIndex);
      setImageError(false);
      
      // Play audio for the previous slide
      if (processedSlides[prevSlideIndex]) {
        playAudioForSlide(processedSlides[prevSlideIndex]);
      }
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

  const handleChildSelect = (childId: string) => {
    onMissionComplete(mission, childId);
    setShowAvatarModal(false);
    onClose();
  };

  // Auto-play audio when slide changes
  useEffect(() => {
    if (processedSlides.length > 0 && processedSlides[currentSlide]?.audio_url) {
      playAudioForSlide(processedSlides[currentSlide]);
    }
  }, [currentSlide, processedSlides]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-4xl animate-pulse text-white">✨</div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col h-screen">
        <div className="flex justify-between items-center p-4 bg-black/50 z-50">
          <h2 className="text-white text-lg font-semibold">
            {mission.title} - Slide {currentSlide + 1} of {processedSlides.length}
          </h2>
          <div className="flex items-center gap-2">
            {/* Audio Controls */}
            {processedSlides[currentSlide]?.audio_url && (
              <button
                onClick={isPlayingAudio ? stopAudio : () => playAudioForSlide(processedSlides[currentSlide])}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                {isPlayingAudio ? '⏸️' : '▶️'} 
                {isPlayingAudio ? t('pauseAudio') : t('playAudio')}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white text-2xl bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors touch-target"
            >
              ✕
            </button>
          </div>
        </div>

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

        <div className="bg-black/70 p-4 backdrop-blur-sm">
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

          <div className="flex justify-between items-center">
            {isPlayingAudio && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                {t('audioPlaying')}
              </div>
            )}
            
            <button
              onClick={downloadSlide}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors touch-target ml-auto"
              title="Download Slide"
            >
              <Download className="h-4 w-4" />
              <span>Download Slide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Child Avatar Selection Modal */}
      <ChildAvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onConfirm={handleChildSelect}
        children={userChildren}
        t={t}
      />
    </>
  );
};

// Video Player Modal with Like functionality
const VideoPlayerModal = ({ 
  videoUrl, 
  onClose, 
  mission,
  onMissionComplete,
  t,
  onLikeVideo
}: { 
  videoUrl: string; 
  onClose: () => void;
  mission: Mission;
  onMissionComplete: (mission: Mission) => void;
  t: (key: string) => string;
  onLikeVideo: (mission: Mission) => void;
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
      if (videoRef.current.currentTime > currentTime + 1) {
        videoRef.current.currentTime = currentTime;
      } else {
        setCurrentTime(videoRef.current.currentTime);
        
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

  const handleLikeVideo = () => {
    onLikeVideo(mission);
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

        <button
          onClick={handleLikeVideo}
          className="absolute top-1 left-12 md:top-2 md:left-12 z-10 text-white text-2xl md:text-3xl bg-black/50 rounded-full p-1 md:p-2 hover:bg-pink-600 transition-colors"
          aria-label="Like video"
          title="Add to favorites"
        >
          <Heart className="h-5 w-5 md:h-6 md:w-6" />
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

// Updated MorningVideoCard with same style as MissionCard
const MorningVideoCard = ({ video, t, onLikeVideo }: { video: AudioTrack | null; t: (key: string) => string; onLikeVideo: (video: AudioTrack) => void }) => {
  const [openVideo, setOpenVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const controls = useAnimation();

  const defaultPreviewUrl = 'https://your-bucket.s3.amazonaws.com/mission-previews/default-preview.mp4';
  const previewUrl = video?.preview_url || defaultPreviewUrl;

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      controls.start({ opacity: 1, y: 0, transition: { duration: 0.3 } });
    }
  }, [isVisible, controls]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video) {
      setIsLiked(true);
      onLikeVideo(video);
      setTimeout(() => setIsLiked(false), 1000);
    }
  };

  if (!video) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
        className="w-full max-w-md mx-auto mb-8"
      >
        <Card className="relative overflow-hidden border-2 border-gray-200 w-full">
          <CardHeader>
            <div className="flex items-center justify-center h-48 bg-gray-100 text-gray-400">
              No Morning Video
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={controls}
        whileHover={{ y: -5 }}
        className="w-full max-w-md mx-auto mb-8"
      >
        <Card className="relative overflow-hidden border-2 border-purple-200 hover:border-purple-300 transition-all w-full h-full">
          <button
            onClick={handleLikeClick}
            className="absolute top-3 right-3 z-20 bg-white/90 hover:bg-pink-50 rounded-full p-2 transition-all duration-300 shadow-md hover:shadow-lg"
            aria-label="Like video"
            title="Add to favorites"
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                className={`h-5 w-5 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-gray-600'}`} 
              />
            </motion.div>
          </button>

          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2">
              <div 
                className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-purple-200 bg-black relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {previewUrl && isVisible ? (
                  <video
                    key={previewUrl}
                    src={previewUrl}
                    autoPlay
                    loop
                    muted={isMuted && !isHovered}
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                    onMouseEnter={() => setIsMuted(false)}
                    onMouseLeave={() => setIsMuted(true)}
                    onError={(e) => {
                      console.warn(`Preview failed for ${video.title}`);
                      e.currentTarget.style.display = "none";
                    }}
                    aria-label={`Preview for ${video.title}`}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                    No Preview Available
                  </div>
                )}
              </div>
              <CardTitle className="text-lg font-bold text-center">{video.title}</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Button
                onClick={() => setOpenVideo(true)}
                className="w-full gap-2 py-4 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Video className="h-5 w-5" />
                <span>{t("watchMagic")}</span>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-purple-600 text-lg font-semibold p-4 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5" />
              <span>{t('morningMission')}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {openVideo && (
          <VideoPlayerModal
            videoUrl={video.audio_url}
            onClose={() => setOpenVideo(false)}
            mission={{} as Mission}
            onMissionComplete={() => {}}
            onLikeVideo={() => onLikeVideo(video)}
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Enhanced FlipBookViewer without Narration
const FlipBookViewer: React.FC<FlipBookViewerProps> = ({ pages, onClose, type, t }) => {
  const [processedPages, setProcessedPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const isMobile = useIsMobile();

  // Process page images and audio
  useEffect(() => {
    const processPages = async () => {
      const newPages = await Promise.all(
        pages.map(async (page) => {
          let imageUrl = page.image_url;
          let audioUrl = page.audio_url;

          // Process image URL
          if (imageUrl.startsWith("supabase://")) {
            const path = imageUrl.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data } = await supabase.storage.from(bucket).getPublicUrl(filePath.join("/"));
            imageUrl = data.publicUrl;
          }

          // Process audio URL
          if (audioUrl && audioUrl.startsWith("supabase://")) {
            const path = audioUrl.replace("supabase://", "");
            const [bucket, ...filePath] = path.split("/");
            const { data } = await supabase.storage.from(bucket).getPublicUrl(filePath.join("/"));
            audioUrl = data.publicUrl;
          }

          return { ...page, image_url: imageUrl, audio_url: audioUrl };
        })
      );

      setProcessedPages(newPages);
      setIsLoading(false);

      // Play audio for first page if available
      if (newPages[0]?.audio_url) {
        playAudioForPage(newPages[0]);
      }
    };

    processPages();

    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [pages]);

  const playAudioForPage = (page: Page) => {
    // Stop current audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    // Play new audio if available
    if (page.audio_url) {
      const audio = new Audio(page.audio_url);
      audio.preload = "auto";
      audio.onended = () => {
        setIsPlayingAudio(false);
        setCurrentAudio(null);
      };
      audio.play().catch(error => {
        console.warn("Audio play failed:", error);
        setIsPlayingAudio(false);
      });
      setCurrentAudio(audio);
      setIsPlayingAudio(true);
    } else {
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlayingAudio(false);
    }
  };

  const handlePageChange = (newIndex: number) => {
    setCurrentPage(newIndex);

    // Play audio for the new page
    if (processedPages[newIndex]) {
      playAudioForPage(processedPages[newIndex]);
    }
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
      <div className="flex justify-between items-center p-4 bg-black/50">
        <h2 className="text-white text-lg font-semibold">
          {type === "story" ? t("storyTime") : t("coloringBook")} - {t("flipbook")}
        </h2>
        <div className="flex gap-2">
          {/* Audio Controls */}
          {processedPages[currentPage]?.audio_url && (
            <button
              onClick={isPlayingAudio ? stopAudio : () => playAudioForPage(processedPages[currentPage])}
              className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              {isPlayingAudio ? '⏸️' : '▶️'} 
              {isPlayingAudio ? t('pauseAudio') : t('playAudio')}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white text-2xl bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <HTMLFlipBook
          width={isMobile ? 320 : 400}
          height={isMobile ? 480 : 550}
          showCover
          usePortrait
          mobileScrollSupport
          flippingTime={isMobile ? 1500 : 800}
          size="fixed"
          className="shadow-2xl rounded-lg"
          style={{}}
          onFlip={(e: any) => handlePageChange(e.data)}
          startPage={0}
          minWidth={300}
          maxWidth={600}
          minHeight={400}
          maxHeight={800}
          drawShadow
          autoSize
          clickEventForward
          useMouseEvents
          swipeDistance={30}
          showPageCorners
          disableFlipByClick={false}
          startZIndex={0}
          maxShadowOpacity={0.5}
        >
          {processedPages.map((page, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between p-6 rounded-[6px] border border-[rgba(0,0,0,0.08)] overflow-hidden bg-white"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "url('/paper-texture.png')",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  opacity: 0.05,
                }}
              />

              <div className="relative z-20 flex flex-col justify-between h-full">
                {/* Audio Indicator */}
                {page.audio_url && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 text-xs">
                    🔊
                  </div>
                )}

                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={page.image_url}
                    alt={page.image_alt || `Page ${idx + 1}`}
                    className="rounded-md shadow-md object-contain max-h-full max-w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Audio status indicator */}
      {isPlayingAudio && (
        <div className="absolute bottom-4 left-4 bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          {t('audioPlaying')}
        </div>
      )}
    </div>
  );
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

// Updated BookCard with hover unmute functionality
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
  coverData?: { cover_url?: string; title?: string; spine_color?: string; preview_url?: string };
  type: "story" | "coloring";
  t: (key: string) => string;
  isAvailable: boolean;
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      controls.start({ opacity: 1, y: 0, transition: { duration: 0.3 } });
    }
  }, [isVisible, controls]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const defaultPreviewUrl = type === "story" 
    ? 'https://your-bucket.s3.amazonaws.com/book-previews/story-preview.mp4'
    : 'https://your-bucket.s3.amazonaws.com/book-previews/coloring-preview.mp4';

  const previewUrl = coverData?.preview_url || defaultPreviewUrl;

  const defaultSpineColor = type === "story"
    ? "linear-gradient(to bottom, #6b46c1, #553c9a)"
    : "linear-gradient(to bottom, #3182ce, #2c5282)";

  const defaultBorderColor = type === "story" ? "border-purple-300" : "border-yellow-300";
  const defaultButtonGradient = type === "story" ? "from-purple-500 to-pink-500" : "from-blue-500 to-green-500";
  const defaultIcon = type === "story" ? "📖" : "✏️";

  return (
    <motion.div
      ref={cardRef}
      className="relative w-full max-w-[280px] mx-auto h-[320px] perspective-1000 mb-8"
      initial={{ opacity: 0, y: 20, rotateY: type === "story" ? -5 : 5 }}
      animate={controls}
      whileHover={isAvailable ? { y: -10, rotateY: type === "story" ? 5 : -5 } : {}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
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
        <div 
          className="absolute inset-0 overflow-hidden rounded-lg"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {previewUrl && isVisible ? (
            <video
              key={previewUrl}
              src={previewUrl}
              autoPlay
              loop
              muted={isMuted && !isHovered}
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              onMouseEnter={() => setIsMuted(false)}
              onMouseLeave={() => setIsMuted(true)}
              onError={(e) => {
                console.warn(`Preview failed for ${type} book: ${previewUrl}`);
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                type === "story"
                  ? "from-yellow-100 to-pink-100"
                  : "from-blue-100 to-green-100"
              }`}
            />
          )}
          <div className="absolute inset-0 bg-black/40 z-1" />
        </div>
        
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

// Updated MissionCard with hover unmute functionality
const MissionCard = ({
  mission,
  completed,
  videoWatched,
  onVideoOpen,
  onManualComplete,
  t,
  index,
  missionSlides,
  setOpenSlides,
  onLikeVideo
}: {
  mission: Mission & { preview_url?: string };
  completed: boolean;
  videoWatched: boolean;
  onVideoOpen: (mission: Mission) => void;
  onManualComplete: (mission: Mission) => void;
  t: (key: string) => string;
  index: number;
  missionSlides: Record<string, Slide[]>;
  setOpenSlides: (slides: { slides: Slide[], mission: Mission }) => void;
  onLikeVideo: (mission: Mission) => void;
}) => {
  const defaultPreviewUrl = 'https://your-bucket.s3.amazonaws.com/mission-previews/mission-preview-artistic.mp4';

  const previewUrl = useMemo(() => mission.preview_url ?? defaultPreviewUrl, [mission.preview_url]);
  const hasSlides = useMemo(() => !!missionSlides[mission.id]?.length, [missionSlides, mission.id]);
  const hasVideo = !!mission.video_url;

  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const controls = useAnimation();

  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.3 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible) {
      controls.start({ opacity: 1, y: 0, transition: { duration: 0.3, delay: Math.min(index * 0.1, 0.5) } });
    }
  }, [isVisible, controls, index]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(true);
    onLikeVideo(mission);
    setTimeout(() => setIsLiked(false), 1000);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={controls}
      whileHover={{ y: -5 }}
      className="w-full"
    >
      <Card
        className={`relative overflow-hidden border-2 transition-all w-full h-full ${
          completed
            ? "border-green-300 bg-green-50"
            : "border-purple-200 hover:border-purple-300"
        }`}
      >
        {completed && (
          <div className="absolute top-3 right-3 bg-green-500 text-white p-1 rounded-full z-10">
            <CheckCircle className="h-5 w-5" />
          </div>
        )}

        {hasVideo && (
          <button
            onClick={handleLikeClick}
            className="absolute top-3 right-12 z-20 bg-white/90 hover:bg-pink-50 rounded-full p-2 transition-all duration-300 shadow-md hover:shadow-lg"
            aria-label="Like video"
            title="Add to favorites"
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Heart 
                className={`h-5 w-5 ${isLiked ? 'text-pink-500 fill-pink-500' : 'text-gray-600'}`} 
              />
            </motion.div>
          </button>
        )}

        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2">
            <div 
              className="w-full aspect-video rounded-xl overflow-hidden shadow-md border border-purple-200 bg-black"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {previewUrl && isVisible ? (
                <video
                  key={previewUrl}
                  src={previewUrl}
                  autoPlay
                  loop
                  muted={isMuted && !isHovered}
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                  onMouseEnter={() => setIsMuted(false)}
                  onMouseLeave={() => setIsMuted(true)}
                  onError={(e) => {
                    console.warn(`Preview failed for ${mission.title}`);
                    e.currentTarget.style.display = "none";
                  }}
                  aria-label={`Preview for ${mission.title}`}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-500">
                  No Preview Available
                </div>
              )}
            </div>
            <CardTitle className="text-lg font-bold">{mission.title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            {hasVideo && (
              <Button
                onClick={() => onVideoOpen(mission)}
                className="w-full gap-2 py-4 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                <Video className="h-5 w-5" />
                <span>{t("watchMagic")}</span>
              </Button>
            )}

            {hasSlides && (
              <Button
                onClick={() =>
                  setOpenSlides({ slides: missionSlides[mission.id] || [], mission })
                }
                className="w-full gap-2 py-4 text-lg bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white"
              >
                <ImageIcon className="h-5 w-5" />
                <span>{t("viewSlides")}</span>
              </Button>
            )}
          </div>

          {!completed ? (
            <Button
              onClick={() => onManualComplete(mission)}
              variant="outline"
              className={`w-full gap-2 py-4 text-lg ${
                mission.mission_type === "video" && !videoWatched
                  ? "border-gray-300 text-gray-400 cursor-not-allowed"
                  : "border-yellow-400 text-yellow-600 hover:bg-yellow-50"
              }`}
              disabled={mission.mission_type === "video" && !videoWatched}
            >
              <Sparkles className="h-5 w-5" />
              <span>
                {mission.mission_type === "video" && !videoWatched
                  ? t("watchVideoFirst")
                  : t("completeMission")}
              </span>
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-600 text-lg font-semibold p-4 bg-green-100 rounded-lg">
              <Trophy className="h-5 w-5" />
              <span>{t("completed")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main Component
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
  const [showNameInputModal, setShowNameInputModal] = useState(false);
  const [showChildSelectionModal, setShowChildSelectionModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [missionToComplete, setMissionToComplete] = useState<Mission | null>(null);
  const [videoToLike, setVideoToLike] = useState<Mission | AudioTrack | null>(null);
  const [childNotFound, setChildNotFound] = useState(false);
  const [videoProgress, setVideoProgress] = useState<Record<string, number>>({});
  const [videoCompletion, setVideoCompletion] = useState<Record<string, boolean>>({});
  const [openSlides, setOpenSlides] = useState<{slides: any[], mission: Mission} | null>(null);
  const [missionSlides, setMissionSlides] = useState<Record<string, any[]>>({});
  const [userChildren, setUserChildren] = useState<Child[]>([]);
  const { user } = useUser();
  
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
    
    available.add(1);
    
    missionProgram.forEach(day => {
      if (day.day === 1) return;
      
      const unlockDate = new Date(currentYear, currentMonth, currentDay - (day.day - 1));
      unlockDate.setHours(0, 0, 0, 0);
      
      if (now >= unlockDate) {
        available.add(day.day);
      }
    });
    
    return available;
  }, [missionProgram]);

  const isDayAvailable = (day: number) => {
    return availableDays.has(day);
  };

  // Categorize missions with proper ordering for afternoon missions
  const categorizeMissions = (missions: Mission[]) => {
    const categorized = {
      morning: [] as Mission[],
      artistic: [] as Mission[],
      discovery: [] as Mission[],
      movement: [] as Mission[],
      storyColoring: [] as Mission[],
      afternoon: [] as Mission[],
      other: [] as Mission[]
    };

    missions.forEach(mission => {
      if (mission.category) {
        switch (mission.category.toLowerCase()) {
          case 'morning':
            categorized.morning.push(mission);
            break;
          case 'artistic':
            categorized.artistic.push(mission);
            break;
          case 'discovery':
            categorized.discovery.push(mission);
            break;
          case 'movement':
            categorized.movement.push(mission);
            break;
          case 'afternoon':
            categorized.afternoon.push(mission);
            break;
          default:
            categorized.other.push(mission);
        }
      } else {
        const title = mission.title.toLowerCase();
        if (title.includes('morning') || title.includes('song')) {
          categorized.morning.push(mission);
        } else if (title.includes('artistic') || title.includes('art')) {
          categorized.artistic.push(mission);
        } else if (title.includes('discovery') || title.includes('explore')) {
          categorized.discovery.push(mission);
        } else if (title.includes('movement') || title.includes('move')) {
          categorized.movement.push(mission);
        } else if (title.includes('zoom') || title.includes('2025')) {
          categorized.afternoon.push(mission);
        } else if (title.includes('toctoc') || title.includes('fun')) {
          categorized.afternoon.push(mission);
        } else if (title.includes('capsule') || title.includes('progress')) {
          categorized.afternoon.push(mission);
        } else {
          categorized.other.push(mission);
        }
      }
    });

    // Sort afternoon missions in specific order: Zoom 2025, Toctoc Fun, Daily Progress Capsule
    categorized.afternoon.sort((a, b) => {
      const order = ['zoom 2025', 'toctoc fun', 'daily progress capsule'];
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      
      const aIndex = order.findIndex(pattern => aTitle.includes(pattern));
      const bIndex = order.findIndex(pattern => bTitle.includes(pattern));
      
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      
      return aIndex - bIndex;
    });

    return categorized;
  };

  // Get user's children if parent
  const fetchUserChildren = async () => {
    if (!user) return;

    try {
      const { data: children, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching children:', error);
        return;
      }

      setUserChildren(children || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  // ✅ Save liked video to playlists table
  const saveLikedVideo = async (
    videoData: Mission | AudioTrack,
    childNameOrId: string
  ) => {
    try {
      if (!user) {
        toast.error("Please log in to save videos");
        return;
      }

      if (!videoData.id) {
        toast.error("Invalid video data");
        return;
      }

      let childId: string;

      // Check if childNameOrId is a UUID (child ID) or a name
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(childNameOrId);

      if (isUuid) {
        // It's a child ID from parent selection
        childId = childNameOrId;
      } else {
        // It's a name from regular user input
        const trimmedName = childNameOrId.trim();
        if (!trimmedName) {
          toast.error("Please enter a valid name");
          return;
        }

        // Check if child already exists under this parent
        const { data: childData, error: childError } = await supabase
          .from("children")
          .select("id")
          .eq("name", trimmedName)
          .eq("parent_id", user.id)
          .maybeSingle();

        if (childError) {
          console.error("Error fetching child:", childError);
          toast.error("Failed to find child");
          return;
        }

        // Create child if not found
        if (!childData) {
          const { data: newChild, error: insertError } = await supabase
            .from("children")
            .insert([
              {
                name: trimmedName,
                parent_id: user.id,
                created_at: new Date().toISOString(),
              },
            ])
            .select("id")
            .single();

          if (insertError || !newChild) {
            console.error("Error creating child:", insertError);
            toast.error("Failed to create new child");
            return;
          }

          childId = newChild.id;
        } else {
          childId = childData.id;
        }
      }

      // Check if same video is already liked by this child
      const { data: existing, error: existingError } = await supabase
        .from("playlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", videoData.id)
        .eq("child_id", childId)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking existing playlist:", existingError);
        toast.error("Failed to check existing likes");
        return;
      }

      if (existing) {
        toast.info("You already liked this video!");
        return;
      }

      // Save video in playlists
      const { error: insertPlaylistError } = await supabase.from("playlists").insert([
        {
          user_id: user.id,
          video_id: videoData.id,
          video_title: videoData.title,
          video_url: "video_url" in videoData ? videoData.video_url : videoData.audio_url,
          child_id: childId,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertPlaylistError) {
        console.error("Error saving liked video:", insertPlaylistError);
        toast.error("Could not save liked video");
        return;
      }

      toast.success(t('videoLiked'));
    } catch (err) {
      console.error("Unexpected error saving liked video:", err);
      toast.error("Something went wrong");
    }
  };

  const handleLikeVideo = (video: Mission | AudioTrack) => {
    if (!user) {
      toast.error('Please log in to save videos');
      return;
    }

    setVideoToLike(video);

    if (user.role === 'parent') {
      if (userChildren.length > 0) {
        setShowChildSelectionModal(true);
      } else {
        toast.error(t('addChildFirst'));
      }
    } else {
      setShowNameInputModal(true);
    }
  };

  // Handle child selection for parents (video likes)
  const handleChildSelect = (childId: string) => {
    if (videoToLike) {
      saveLikedVideo(videoToLike, childId);
      setVideoToLike(null);
      setShowChildSelectionModal(false);
    }
  };

  // Handle name input for regular users (video likes)
  const handleNameSubmit = (name: string) => {
    if (videoToLike) {
      saveLikedVideo(videoToLike, name);
      setVideoToLike(null);
      setShowNameInputModal(false);
    }
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

        // Fetch completions
        const storedCompletions = localStorage.getItem('missionCompletions');
        if (storedCompletions) {
          setCompletions(JSON.parse(storedCompletions));
        }

        const { data: dbCompletions, error: completionsError } = await supabase
          .from("completed_missions")
          .select("mission_id, completed_at, child_name, child_id");

        if (!completionsError && dbCompletions) {
          setCompletions(prev => {
            const merged = [...prev];
            dbCompletions.forEach(dbCompletion => {
              if (!prev.find(c => c.mission_id === dbCompletion.mission_id && c.child_id === dbCompletion.child_id)) {
                merged.push(dbCompletion);
              }
            });
            return merged;
          });
        }

        // Fetch audio track
        const currentDate = new Date().getDate();
        const mappedDay = ((currentDate - 1) % 5) + 1;

        try {
          const { data: audioData, error: audioError } = await supabase
            .from("audio_tracks")
            .select("id, title, audio_url, preview_url, day")
            .eq("day", mappedDay)
            .single();

          if (audioError) {
            console.error("Error loading audio track:", audioError.message);
          } else if (audioData) {
            setAudioTrack(audioData);
          }
        } catch (err) {
          console.error("Unexpected error fetching morning video:", err);
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

  // Fetch user children when user changes
  useEffect(() => {
    if (user) {
      fetchUserChildren();
    }
  }, [user]);

  // Save completions to local storage
  useEffect(() => {
    localStorage.setItem('missionCompletions', JSON.stringify(completions));
  }, [completions]);

  // Fetch story pages and coloring pages when day changes
  useEffect(() => {
    const fetchDayContent = async () => {
      setIsLoading(true);
      try {
        const { data: storyData, error: storyError } = await supabase
          .from("storybook_pages")
          .select("*")
          .eq("day", selectedDay)
          .order("page_number", { ascending: true });

        if (storyError) throw storyError;
        setStoryPages(storyData || []);

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
    () => new Set(completions.map((c) => `${c.mission_id}-${c.child_id || 'anonymous'}`)),
    [completions]
  );

  const currentDayData = useMemo(
    () => missionProgram.find((d) => d.day === selectedDay),
    [missionProgram, selectedDay]
  );

  const categorizedMissions = useMemo(() => {
    if (!currentDayData) return {
      morning: [],
      artistic: [],
      discovery: [],
      movement: [],
      afternoon: [],
      other: []
    };
    
    return categorizeMissions(currentDayData.missions);
  }, [currentDayData]);

  // FIXED: Mission completion function (slides safe)
  const handleMissionComplete = async (mission: Mission, childId?: string) => {
    // For slides, we require child selection, for other missions it's optional
    const isSlideMission = missionSlides[mission.id]?.length > 0;
    
    if (isSlideMission && (!childId || childId.trim() === '')) {
      console.error('No child selected for slide completion!');
      toast.error(t('selectChildFirst'));
      return;
    }

    const completionKey = `${mission.id}-${childId || 'anonymous'}`;
    
    if (completedIds.has(completionKey)) {
      toast.info(t('missionAlreadyCompleted'));
      return;
    }

    try {
      const completionData: any = {
        mission_id: mission.id,
        completed_at: new Date().toISOString()
      };

      // Only include child_id if provided
      if (childId) {
        completionData.child_id = childId;
      }

      const { data, error } = await supabase
        .from('completed_missions')
        .insert([completionData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.info(t('missionAlreadyCompleted'));
          return;
        }
        throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
      }

      const newCompletion = {
        mission_id: mission.id,
        completed_at: new Date().toISOString(),
        ...(childId && { child_id: childId })
      };

      setCompletions((prev) => [...prev, newCompletion]);

      toast.success(t('missionCompleted'));

      const confetti = await import("canvas-confetti");
      confetti.default({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Check if all missions for the day are completed
      const dayMissions = currentDayData?.missions || [];
      const dayCompletions = completions.filter(c => 
        dayMissions.some(m => m.id === c.mission_id)
      );

      if (dayMissions.every(m => 
        completions.some(c => c.mission_id === m.id) || m.id === mission.id
      )) {
        setShowDayCompleteModal(true);
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      
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
    if (mission.mission_type === 'video' && !videoCompletion[mission.id]) {
      toast.error(t('pleaseWatchVideo'));
      return;
    }

    const completionKey = `${mission.id}-anonymous`;
    if (completedIds.has(completionKey)) {
      toast.info(t('missionAlreadyCompleted'));
      return;
    }

    setMissionToComplete(mission);
    
    // Show avatar selection for parents with children, otherwise complete without child_id
    if (user && user.role === 'parent' && userChildren.length > 0) {
      setShowAvatarModal(true);
    } else {
      handleMissionComplete(mission);
    }
  };

  const handleAvatarSelect = (childId: string) => {
    if (missionToComplete) {
      handleMissionComplete(missionToComplete, childId);
      setMissionToComplete(null);
      setShowAvatarModal(false);
    }
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

      {/* Morning Mission Song Card */}
      <div className="w-full px-2 mb-8">
        <MorningVideoCard video={audioTrack} t={t} onLikeVideo={handleLikeVideo} />
      </div>
    
      {/* Morning Mission Section */}
      {categorizedMissions.morning.length > 0 && (
        <section className="max-w-6xl mx-auto px-2 md:px-4 w-full mb-8">
        <h3 className="text-xl font-bold mb-4 text-center">Daily Missions</h3>
          <h3 className="text-xl font-bold mb-4 text-center">{t('morningMission')}</h3>
          <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
            {categorizedMissions.morning.map((mission, index) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                completed={completedIds.has(`${mission.id}-anonymous`)}
                videoWatched={videoCompletion[mission.id]}
                onVideoOpen={handleVideoOpen}
                onManualComplete={handleManualCompletion}
                onLikeVideo={handleLikeVideo}
                t={t}
                index={index}
                missionSlides={missionSlides}
                setOpenSlides={setOpenSlides}
              />
            ))}
          </div>
        </section>
      )}
      
      {/* Artistic, Discovery, and Movement Missions Section */}
      {(categorizedMissions.artistic.length > 0 || 
        categorizedMissions.discovery.length > 0 || 
        categorizedMissions.movement.length > 0) && (
        <section className="max-w-6xl mx-auto px-2 md:px-4 w-full mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            {categorizedMissions.artistic.length > 0 && (
              <div className="flex flex-col">
                <h4 className="text-lg font-semibold mb-2 text-center">{t('artisticMission')}</h4>
                {categorizedMissions.artistic.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    completed={completedIds.has(`${mission.id}-anonymous`)}
                    videoWatched={videoCompletion[mission.id]}
                    onVideoOpen={handleVideoOpen}
                    onManualComplete={handleManualCompletion}
                    onLikeVideo={handleLikeVideo}
                    t={t}
                    index={index}
                    missionSlides={missionSlides}
                    setOpenSlides={setOpenSlides}
                  />
                ))}
              </div>
            )}
            
            {categorizedMissions.discovery.length > 0 && (
              <div className="flex flex-col">
                <h4 className="text-lg font-semibold mb-2 text-center">{t('discoveryMission')}</h4>
                {categorizedMissions.discovery.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    completed={completedIds.has(`${mission.id}-anonymous`)}
                    videoWatched={videoCompletion[mission.id]}
                    onVideoOpen={handleVideoOpen}
                    onManualComplete={handleManualCompletion}
                    onLikeVideo={handleLikeVideo}
                    t={t}
                    index={index}
                    missionSlides={missionSlides}
                    setOpenSlides={setOpenSlides}
                  />
                ))}
              </div>
            )}
            
            {categorizedMissions.movement.length > 0 && (
              <div className="flex flex-col">
                <h4 className="text-lg font-semibold mb-2 text-center">{t('movementMission')}</h4>
                {categorizedMissions.movement.map((mission, index) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    completed={completedIds.has(`${mission.id}-anonymous`)}
                    videoWatched={videoCompletion[mission.id]}
                    onVideoOpen={handleVideoOpen}
                    onManualComplete={handleManualCompletion}
                    onLikeVideo={handleLikeVideo}
                    t={t}
                    index={index}
                    missionSlides={missionSlides}
                    setOpenSlides={setOpenSlides}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Storybook and Coloring Book Cards */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-6 md:gap-8 mt-6 md:mt-8 px-2 mb-8">
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
      
      {/* Afternoon Missions Section */}
      {categorizedMissions.afternoon.length > 0 && (
        <section className="max-w-6xl mx-auto px-2 md:px-4 w-full mb-8">
          <h3 className="text-xl font-bold mb-4 text-center">Afternoon Missions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
            {categorizedMissions.afternoon.map((mission, index) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                completed={completedIds.has(`${mission.id}-anonymous`)}
                videoWatched={videoCompletion[mission.id]}
                onVideoOpen={handleVideoOpen}
                onManualComplete={handleManualCompletion}
                onLikeVideo={handleLikeVideo}
                t={t}
                index={index}
                missionSlides={missionSlides}
                setOpenSlides={setOpenSlides}
              />
            ))}
          </div>
        </section>
      )}

      {/* Name Input Modal for Video Likes */}
      <NameInputModal
        isOpen={showNameInputModal}
        onClose={() => setShowNameInputModal(false)}
        onConfirm={handleNameSubmit}
        t={t}
      />

      {/* Child Avatar Selection Modal for Mission Completion */}
      <ChildAvatarModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onConfirm={handleAvatarSelect}
        children={userChildren}
        t={t}
      />

      {/* Child Selection Modal for Parents (Video Likes) */}
      <ChildSelectionModal
        isOpen={showChildSelectionModal}
        onClose={() => setShowChildSelectionModal(false)}
        onConfirm={handleChildSelect}
        children={userChildren}
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
              text: page.text,
              audio_url: page.audio_url
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
              page_number: page.page_number,
              audio_url: page.audio_url
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
            onLikeVideo={handleLikeVideo}
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
    </>
  );
};

export default MissionsComponent;