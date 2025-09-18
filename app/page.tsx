"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabaseClient";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Confetti from "react-confetti";
import { useLanguage } from "@/contexts/LanguageContext";
import { speak, loadVoices } from "@/lib/speak";
import { Play, Star, Gift, Flame, Heart, Download, Share, RotateCw } from "lucide-react";
import { motion } from "framer-motion";

/* 🌍 Translation dictionary (5 languages) */
const translations: Record<
  string,
  Record<
    | "goodMorning" | "hello" | "goodEvening" | "friend"
    | "letsLearn" | "funTogether" | "greatJob" | "daysInRow" | "keepGoing" | "youreAwesome"
    | "todaysActivity" | "loading" | "startLearning"
    | "yourStars" | "youHave" | "stars" | "learnToEarn"
    | "surprise" | "unlockedReward" | "seeReward" | "dayStreak"
    | "todaysVideo" | "watchAndLearn" | "playVideo" | "watchAgain" | "download" | "share",
    string
  >
> = {
  en: {
    goodMorning: "Good morning",
    hello: "Hello",
    goodEvening: "Good evening",
    friend: "friend",
    letsLearn: "Let's learn!",
    funTogether: "Let's have fun together!",
    greatJob: "You're doing great!",
    daysInRow: "days in a row!",
    keepGoing: "Keep going!",
    youreAwesome: "You're awesome!",
    todaysActivity: "Today's Learning!",
    loading: "Loading...",
    startLearning: "Start to Learn!",
    yourStars: "Your Stars",
    youHave: "You have",
    stars: "stars",
    learnToEarn: "Learn to earn stars!",
    surprise: "Surprise!",
    unlockedReward: "You unlocked a reward!",
    seeReward: "See Reward",
    dayStreak: "day streak",
    todaysVideo: "Today's Video",
    watchAndLearn: "Watch and learn!",
    playVideo: "Play Video",
    watchAgain: "Watch Again",
    download: "Download",
    share: "Share",
  },
  es: {
    goodMorning: "Buenos días",
    hello: "Hola",
    goodEvening: "Buenas noches",
    friend: "amigo",
    letsLearn: "¡Aprendamos!",
    funTogether: "¡Divirtámonos juntos!",
    greatJob: "¡Lo estás haciendo genial!",
    daysInRow: "días seguidos",
    keepGoing: "¡Continúa!",
    youreAwesome: "¡Eres increíble!",
    todaysActivity: "¡Aprendizaje de hoy!",
    loading: "Cargando...",
    startLearning: "¡Empieza a aprender!",
    yourStars: "Tus estrellas",
    youHave: "Tienes",
    stars: "estrellas",
    learnToEarn: "¡Aprende para ganar estrellas!",
    surprise: "¡Sorpresa!",
    unlockedReward: "¡Has desbloqueado una recompensa!",
    seeReward: "Ver recompensa",
    dayStreak: "racha de días",
    todaysVideo: "Video de Hoy",
    watchAndLearn: "¡Mira y aprende!",
    playVideo: "Reproducir Video",
    watchAgain: "Ver de Nuevo",
    download: "Descargar",
    share: "Compartir",
  },
  fr: {
    goodMorning: "Bonjour",
    hello: "Salut",
    goodEvening: "Bonsoir",
    friend: "ami",
    letsLearn: "Apprenons !",
    funTogether: "Amusons-nous ensemble !",
    greatJob: "Tu fais du bon travail !",
    daysInRow: "jours d'affilée",
    keepGoing: "Continue !",
    youreAwesome: "Tu es génial !",
    todaysActivity: "L'apprentissage du jour",
    loading: "Chargement...",
    startLearning: "Commencer à apprendre !",
    yourStars: "Tes étoiles",
    youHave: "Tu as",
    stars: "étoiles",
    learnToEarn: "Apprends pour gagner des étoiles !",
    surprise: "Surprise !",
    unlockedReward: "Tu as débloqué une récompense !",
    seeReward: "Voir la récompense",
    dayStreak: "série de jours",
    todaysVideo: "Vidéo du Jour",
    watchAndLearn: "Regarde et apprends !",
    playVideo: "Lire la Vidéo",
    watchAgain: "Regarder à Nouveau",
    download: "Télécharger",
    share: "Partager",
  },
  rw: {
    goodMorning: "Mwaramutse",
    hello: "Muraho",
    goodEvening: "Mwiriwe",
    friend: "inshuti",
    letsLearn: "Reka twige!",
    funTogether: "Reka twishimane!",
    greatJob: "Ukoze neza!",
    daysInRow: "iminsi ikurikirana",
    keepGoing: "Komeza!",
    youreAwesome: "Uri intyoza!",
    todaysActivity: "Isomo ry'uyu munsi",
    loading: "Birimo gupakira...",
    startLearning: "Tangira kwiga!",
    yourStars: "Inyenyeri zawe",
    youHave: "Ufite",
    stars: "inyenyeri",
    learnToEarn: "Iga kugira ngo ubone inyenyeri!",
    surprise: "Impano!",
    unlockedReward: "Wafunguye igihembo!",
    seeReward: "Reba igihembo",
    dayStreak: "iminsi ikurikirana",
    todaysVideo: "Video yo uyu munsi",
    watchAndLearn: "Reba undize!",
    playVideo: "Videwo Gusakaza",
    watchAgain: "Subiramo",
    download: "Kurotsa",
    share: "Sangiza",
  },
  sw: {
    goodMorning: "Habari za asubuhi",
    hello: "Hujambo",
    goodEvening: "Habari za jioni",
    friend: "rafiki",
    letsLearn: "Tujifunze!",
    funTogether: "Tufurahie pamoja!",
    greatJob: "Umefanya vizuri!",
    daysInRow: "siku mfululizo",
    keepGoing: "Endelea!",
    youreAwesome: "Wewe ni hodari!",
    todaysActivity: "Mafunzo ya leo!",
    loading: "Inapakia...",
    startLearning: "Anza kujifunza!",
    yourStars: "Nyota zako",
    youHave: "Una",
    stars: "nyota",
    learnToEarn: "Jifunze kupata nyota!",
    surprise: "Mshangao!",
    unlockedReward: "Umefungua zawadi!",
    seeReward: "Ona zawadi",
    dayStreak: "mfululizo wa siku",
    todaysVideo: "Video ya Leo",
    watchAndLearn: "Tazama na ujifunze!",
    playVideo: "Cheza Video",
    watchAgain: "Tazama Tenna",
    download: "Pakua",
    share: "Shiriki",
  },
};

// Buddy phrases in different languages
const buddyPhrases: Record<string, string[]> = {
  en: ["Let's learn together!", "You're doing great!", "Learning is fun!", "Keep it up!"],
  es: ["¡Aprendamos juntos!", "¡Lo estás haciendo genial!", "¡Aprender es divertido!", "¡Sigue así!"],
  fr: ["Apprenons ensemble!", "Vous vous débrouillez bien!", "Apprendre est amusant!", "Continuez comme ça!"],
  rw: ["Reka twige hamwe!", "Ukora neza!", "Kwiga biryoshye!", "Komeza!"],
  sw: ["Tujifunze pamoja!", "Unafanya vizuri!", "Kujifunza ni raha!", "Endelea!"]
};

// Sparkle component for the magical effect
const Sparkle = () => {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-white"
      initial={{ 
        opacity: 0, 
        scale: 0,
        x: Math.random() * 40 - 20,
        y: Math.random() * 40 - 20
      }}
      animate={{ 
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        x: Math.random() * 60 - 30,
        y: Math.random() * 60 - 30
      }}
      transition={{ 
        duration: 1.5 + Math.random() * 2,
        repeat: Infinity,
        delay: Math.random() * 2
      }}
    />
  );
};

export default function HomePage() {
  const { language } = useLanguage();
  const t = (key: keyof typeof translations["en"]) =>
    translations[language]?.[key] ?? translations.en[key] ?? String(key);

  const router = useRouter();

  const [childName, setChildName] = useState<string | null>(null);
  const [starsEarned, setStarsEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [todaysMission, setTodaysMission] = useState<any>(null);
  const [todaysVideo, setTodaysVideo] = useState<any>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showSurprise, setShowSurprise] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [buddyAction, setBuddyAction] = useState<"idle" | "wave" | "dance">("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [showRewardConfetti, setShowRewardConfetti] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<"idle" | "shake" | "open">("idle");

  /* 🔄 Load data on mount */
  useEffect(() => {
    setMounted(true);
    loadVoices();
    void fetchUserData();
    void fetchTodaysMission();
    void fetchTodaysVideo();
  }, []);

  /* 🗣️ Greet child when data is ready / language changes */
  useEffect(() => {
    if (childName) speak(getGreeting(childName), language);
  }, [language, childName]);

  /* 📦 Fetch user info */
  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("name, completed_missions, streak")
      .eq("id", user.id)
      .single();

    if (data) {
      setChildName(data.name);
      setStarsEarned(data.completed_missions || 0);
      setStreak(data.streak || 0);
      speak(getGreeting(data.name), language);
    }
  };

  /* 🎯 Fetch today's mission */
  const fetchTodaysMission = async () => {
    const { data } = await supabase
      .from("missions")
      .select("*")
      .eq("is_today", true)
      .limit(1)
      .single();
    setTodaysMission(data);
  };

  /* 📹 Fetch today's video from database */
  const fetchTodaysVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_today", true)
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error fetching today's video:", error);
        return;
      }
      
      setTodaysVideo(data);
      
      // If the video has a path in storage, get the public URL
      if (data.video_path) {
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(data.video_path);
        
        setVideoUrl(urlData.publicUrl);
      } else if (data.video_url) {
        // If it's already a full URL, use it directly
        setVideoUrl(data.video_url);
      }
      
      // Get thumbnail from the same bucket
      if (data.thumbnail_path) {
        const { data: thumbData } = supabase.storage
          .from('videos')
          .getPublicUrl(data.thumbnail_path);
        
        setThumbnailUrl(thumbData.publicUrl);
      } else if (data.thumbnail_url) {
        setThumbnailUrl(data.thumbnail_url);
      }
    } catch (error) {
      console.error("Error in fetchTodaysVideo:", error);
    }
  };

  /* 👋 Greeting helper */
  const getGreeting = (name: string | null) => {
    const hour = new Date().getHours();
    if (hour < 12) return `${t("goodMorning")}, ${name || t("friend")}!`;
    if (hour < 18) return `${t("hello")}, ${name || t("friend")}!`;
    return `${t("goodEvening")}, ${name || t("friend")}!`;
  };

  /* ▶️ Start mission -> learning-focused */
  const handleMissionStart = async () => {
    setShowCelebration(true);
    setBuddyAction("dance");
    speak(t("letsLearn"), language);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const newStars = starsEarned + 1;
      await supabase.from("users").update({ completed_missions: newStars }).eq("id", user.id);
      setStarsEarned(newStars);
      if (newStars >= 3) {
        setShowSurprise(true);
        // Animate the gift box
        setGiftAnimation("shake");
        setTimeout(() => {
          setGiftAnimation("open");
          setShowRewardConfetti(true);
          setTimeout(() => setShowRewardConfetti(false), 3000);
        }, 1000);
      }
    }

    setTimeout(() => {
      setShowCelebration(false);
      setBuddyAction("idle");
    }, 3000);

    router.push("/missions");
  };

  /* 🎥 Handle video play */
  const handleVideoPlay = () => {
    setIsPlaying(true);
    speak(t("watchAndLearn"), language);
  };

  /* 🎥 Handle video completion */
  const handleVideoComplete = () => {
    setIsVideoCompleted(true);
    setIsPlaying(false);
    
    // Award a star for completing the video
    if (!todaysVideo?.completed) {
      const awardStarForVideo = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newStars = starsEarned + 1;
          await supabase.from("users").update({ completed_missions: newStars }).eq("id", user.id);
          setStarsEarned(newStars);
          
          // Mark video as completed in the database
          await supabase.from("videos")
            .update({ completed: true })
            .eq("id", todaysVideo.id);
            
          if (newStars >= 3) {
            setShowSurprise(true);
            // Animate the gift box
            setGiftAnimation("shake");
            setTimeout(() => {
              setGiftAnimation("open");
              setShowRewardConfetti(true);
              setTimeout(() => setShowRewardConfetti(false), 3000);
            }, 1000);
          }
        }
      };
      awardStarForVideo();
    }
  };

  /* 🎥 Handle video progress */
  const handleVideoProgress = (e: any) => {
    const progress = (e.target.currentTime / e.target.duration) * 100;
    setVideoProgress(progress);
  };

  /* 📥 Handle video download */
  const handleDownload = async () => {
    if (!videoUrl) return;
    
    setIsDownloading(true);
    
    try {
      // Fetch the video file
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `nimi-video-${todaysVideo.title || 'today'}.mp4`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: Open in new tab if download fails
      window.open(videoUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  /* 📤 Handle video sharing */
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: todaysVideo.title,
          text: todaysVideo.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Sharing was cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };
  const shareWhatsApp = (text: string) => {
    const encodedText = encodeURIComponent(text);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
    if (isMobile) {
      // Opens the WhatsApp app on mobile
      window.open(`whatsapp://send?text=${encodedText}`, "_blank");
    } else {
      // Fallback to WhatsApp Web on desktop
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, "_blank");
    }
  };
  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; // prevent scrolling to bottom
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      alert("Video link copied!");
    } catch (err) {
      alert("Failed to copy link");
    }
    document.body.removeChild(textArea);
  };
  

  /* 🐥 Buddy tap interaction */
  const handleBuddyClick = () => {
    const phrases = buddyPhrases[language] || buddyPhrases.en;
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    speak(randomPhrase, language);

    setBuddyAction("wave");
    setTimeout(() => setBuddyAction("idle"), 1600);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col pb-24 relative overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient-xy"></div>
      
      <Header simple />

      {showCelebration && (
        <Confetti
          recycle={false}
          numberOfPieces={250}
          colors={["#FF9E9E", "#FFD6A5", "#CBFFA9", "#A0C4FF", "#BDB2FF"]}
        />
      )}
      
      {showRewardConfetti && (
        <Confetti
          recycle={false}
          numberOfPieces={200}
          colors={["#FFD700", "#FFA500", "#FF6347", "#FF69B4", "#9370DB"]}
        />
      )}

      <main className="flex-grow max-w-md mx-auto px-4 py-8 w-full relative z-10">
        {/* Floating Sparkles around the Nimi Buddy */}
        <div className="absolute top-0 left-0 right-0 h-80 flex justify-center items-center pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <Sparkle key={i} />
          ))}
        </div>

        {/* 🐥 Interactive Nimi Buddy */}
        <div className="text-center mb-8">
          <motion.div
            className="relative w-44 h-44 mx-auto mb-6 cursor-pointer select-none"
            onClick={handleBuddyClick}
            role="button"
            aria-label="Nimi buddy"
            animate={
              buddyAction === "wave"
                ? { rotate: [0, 12, -12, 0] }
                : buddyAction === "dance"
                ? { scale: [1, 1.18, 1, 1.18, 1] }
                : { scale: [1, 1.04, 1] }
            }
            transition={{
              duration: buddyAction === "idle" ? 3 : 0.6,
              repeat: buddyAction === "idle" ? Infinity : 2,
            }}
          >
            {/* Glow/ripple effect when buddy waves/dances */}
            {buddyAction !== "idle" && (
              <motion.div 
                className="absolute inset-0 rounded-full bg-purple-200 opacity-50"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8 }}
              />
            )}
            
            <motion.img
              src="/nimi-logo.jpg"
              alt="NIMI Buddy"
              className="w-full h-full rounded-full object-cover shadow-lg border-4 border-white relative z-10"
              draggable={false}
            />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-md border-2 border-pink-200 z-20">
              <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                {getGreeting(childName)}
              </p>
            </div>
          </motion.div>

          <h1 className="text-3xl font-bold text-purple-600 mb-2">
            👋 {childName || t("friend")}!
          </h1>
          {streak > 0 && (
            <p className="text-lg text-pink-500 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 text-orange-500" /> {streak} {t("dayStreak")}!
            </p>
          )}
        </div>
{/* 🎥 Today's Video Card - YouTube style */}
{todaysVideo && videoUrl && (
  <Card className="bg-gray-900 border-0 shadow-xl mb-8 relative overflow-hidden">
    <CardContent className="p-0">
      <div className="relative">
        {/* Video thumbnail or player */}
        {!isPlaying ? (
          <div className="relative w-full">
            <img
              src={thumbnailUrl || "/video-placeholder.jpg"}
              alt={todaysVideo.title}
              className="w-full h-56 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <Button
                onClick={handleVideoPlay}
                className="rounded-full p-4 bg-white text-black shadow-lg hover:scale-105 transition"
                aria-label="Play Video"
              >
                <Play className="w-6 h-6" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            <video
              className="w-full h-56 object-cover"
              controls
              autoPlay
              onEnded={handleVideoComplete}
              onTimeUpdate={handleVideoProgress}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

       {/* Bottom-right icons */}
<div className="absolute bottom-3 right-3 flex space-x-3">
  {/* Download */}
  <Button
    size="sm"
    variant="ghost"
    onClick={handleDownload}
    disabled={isDownloading}
    className="bg-white/90 hover:bg-white shadow-md p-2 rounded-full"
  >
    <Download className="w-5 h-5 text-black" />
  </Button>

  {/* Share */}
  <div className="relative">
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setShowShareOptions(!showShareOptions)}
      className="bg-white/90 hover:bg-white shadow-md p-2 rounded-full"
    >
      <Share className="w-5 h-5 text-black" />
    </Button>

    {/* Social media share popup */}
    {showShareOptions && videoUrl && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute bottom-12 right-0 bg-white shadow-lg rounded-lg p-2 flex flex-col space-y-2 z-50"
      >
        {/* WhatsApp */}
        <button
          onClick={() =>
            window.open(
              `https://api.whatsapp.com/send?text=${encodeURIComponent(
                todaysVideo.title + " " + videoUrl
              )}`,
              "_blank"
            )
          }
          className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
        >
          <img src="/icons/whatsapp.svg" className="w-5 h-5" alt="WhatsApp" />
        </button>

        {/* Facebook */}
        <button
          onClick={() =>
            window.open(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}`,
              "_blank"
            )
          }
          className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
        >
          <img src="/icons/facebook.svg" className="w-5 h-5" alt="Facebook" />
        </button>

        {/* Twitter */}
        <button
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(videoUrl)}&text=${encodeURIComponent(
                todaysVideo.title
              )}`,
              "_blank"
            )
          }
          className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
        >
          <img src="/icons/twitter.svg" className="w-5 h-5" alt="Twitter" />
        </button>

    {/* Copy Link */}
    <button
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(videoUrl)
            .then(() => alert("Video link copied!"))
            .catch(() => fallbackCopyText(videoUrl));
        } else {
          fallbackCopyText(videoUrl);
        }
      }}
      className="flex items-center justify-center p-2 rounded hover:bg-gray-100"
    >
      <img src="/icons/link.svg" className="w-5 h-5" alt="Copy Link" />
    </button>

      </motion.div>
    )}
  </div>
</div>

      </div>
    </CardContent>
  </Card>
)}
        {/* 🎯 Today's Learning - Enhanced for toddlers */}
        <Card className="bg-gradient-to-r from-pink-100 to-purple-100 border-4 border-pink-300 shadow-xl mb-8">
          <CardContent className="p-6 text-center">
            <motion.div 
              className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              whileHover={{ rotate: 10, scale: 1.1 }}
            >
              <Star className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t("todaysActivity")}
            </h2>
            <h3 className="text-xl font-bold text-purple-600 mb-6">
              {todaysMission?.title || t("loading")}
            </h3>
            
            {/* Pulsing Call-to-Action Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                repeatType: "reverse"
              }}
            >
              <Button
                onClick={handleMissionStart}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-10 py-6 rounded-full text-2xl font-bold shadow-lg hover:shadow-xl"
                size="lg"
                aria-label={t("startLearning")}
              >
                <Play className="w-8 h-8 mr-3" />
                {t("startLearning")}
              </Button>
            </motion.div>
          </CardContent>
        </Card>

        {/* ⭐ Stars Progress - Enhanced for toddlers */}
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-4 border-yellow-200 shadow-md mb-8">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-center mb-4 flex items-center justify-center">
              <Star className="w-6 h-6 mr-2 text-yellow-500 fill-yellow-500" /> 
              {t("yourStars")}
            </h3>
            <div className="flex justify-center space-x-4 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                  key={star}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-3xl ${
                    star <= starsEarned 
                      ? "bg-yellow-400 text-white shadow-md" 
                      : "bg-gray-200 text-gray-400"
                  }`}
                  animate={star <= starsEarned ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.6 }}
                  whileHover={{ scale: 1.2 }}
                >
                  {star <= starsEarned ? "⭐" : "☆"}
                </motion.div>
              ))}
            </div>
            <p className="text-lg text-center text-gray-600">
              {starsEarned > 0
                ? `${t("youHave")} ${starsEarned} ${t("stars")}! ${starsEarned >= 3 ? "🎉" : ""}`
                : t("learnToEarn")}
            </p>
          </CardContent>
        </Card>

        {/* 🎁 Surprise Reward - Enhanced for toddlers */}
        {showSurprise && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Card className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-300 shadow-xl mb-8">
              <CardContent className="p-6 text-center">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                  animate={giftAnimation === "shake" ? 
                    { rotate: [0, -10, 10, -10, 10, 0] } : 
                    giftAnimation === "open" ? 
                    { scale: [1, 1.2, 1], rotate: [0, 15, 0] } : 
                    { rotate: [0, -5, 5, 0] }
                  }
                  transition={{ 
                    duration: giftAnimation === "shake" ? 0.5 : 1,
                    repeat: giftAnimation === "idle" ? Infinity : 0,
                    repeatDelay: 2
                  }}
                >
                  <Gift className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-orange-600 mb-2">
                  {t("surprise")} 🎁
                </h3>
                <p className="text-gray-700 mb-4">{t("unlockedReward")}</p>
                <Link href="/rewards">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600">
                      {t("seeReward")}
                    </Button>
                  </motion.div>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      {mounted && <BottomNavigation />}
      
      {/* Add CSS for animated gradient */}
      <style jsx>{`
        @keyframes gradientXY {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        .animate-gradient-xy {
          background-size: 200% 200%;
          animation: gradientXY 15s ease infinite;
        }
      `}</style>
    </div>
  );
}