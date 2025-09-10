"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import Footer from "@/components/Footer";
import {
  Edit,
  Star,
  Trophy,
  Book,
  Calendar,
  Award,
  ChevronRight,
  Gift,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

function SafeUserInfo({ name, age }: { name?: unknown; age?: unknown }) {
  const safeName =
    typeof name === "string" || typeof name === "number"
      ? name
      : "Name Unknown";
  const safeAge =
    typeof age === "string" || typeof age === "number"
      ? age
      : "Age Unknown";

  return (
    <h1 className="text-3xl font-bold text-gray-800 mb-2">
      {safeName}, {safeAge}
    </h1>
  );
}

export default function UserProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [mood, setMood] = useState("🙂");
  const [parentNotes, setParentNotes] = useState("");
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [earnedStickers, setEarnedStickers] = useState<string[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>({});
  const { t } = useLanguage();

  // Map moods to motivational messages
  const moodMessageMap: Record<string, string> = {
    "😄":
      t("feelingHappyMessage") ||
      "You're shining bright today! Keep it up! 🌟",
    "🙂":
      t("feelingGoodMessage") ||
      "Glad you're feeling good! Keep smiling! 😊",
    "😐":
      t("feelingNeutralMessage") ||
      "It's okay to have an 'okay' day. Take it slow!",
    "😢":
      t("feelingSadMessage") ||
      "It's okay to feel sad sometimes. You're not alone! ❤️",
    "🥳":
      t("feelingExcitedMessage") ||
      "Awesome mood! Celebrate your achievements! 🎉",
    "😴":
      t("feelingTiredMessage") ||
      "Make sure to rest and recharge. Take care! 🌙",
  };

  // Map moods to specific sound files
  const moodSounds: Record<string, string> = {
    "😄": "/sounds/happy.mp3",
    "🙂": "/sounds/good.mp3",
    "😐": "/sounds/neutral.mp3",
    "😢": "/sounds/sad.mp3",
    "🥳": "/sounds/excited.mp3",
    "😴": "/sounds/tired.mp3",
  };

  const stickerSoundRef = useRef<HTMLAudioElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function loadUserData() {
      const profileRes = await fetch("/api/user/profile");
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserData(profile);
        setAboutText(profile.about_text || "");
        setMood(profile.mood || "🙂");
        setParentNotes(profile.parent_notes || "");
      }

      const badgesRes = await fetch("/api/user/badges");
      if (badgesRes.ok) setBadges(await badgesRes.json());

      const activitiesRes = await fetch("/api/user/activities");
      if (activitiesRes.ok) setActivities(await activitiesRes.json());
    }
    loadUserData();
  }, []);

  useEffect(() => {
    if (showStickerModal && stickerSoundRef.current) {
      try {
        stickerSoundRef.current.currentTime = 0;
        stickerSoundRef.current.play();
      } catch (e) {
        console.warn("Failed to play sticker sound:", e);
      }
    }
  }, [showStickerModal]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && showStickerModal) {
        setShowStickerModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showStickerModal]);

  const playClickSound = () => {
    if (clickSoundRef.current) {
      try {
        console.log("Playing click sound:", clickSoundRef.current.src);
        clickSoundRef.current.currentTime = 0;
        clickSoundRef.current.play();
      } catch (e) {
        console.warn("Error playing click sound:", e);
      }
    }
  };

  // Play mood-specific sound on mood change click
  const playMoodSound = (emoji: string) => {
    const soundSrc = moodSounds[emoji];
    if (!soundSrc) return;
    const audio = new Audio(soundSrc);
    audio.play().catch((e) => {
      console.warn(`Failed to play mood sound for ${emoji}:`, e);
    });
  };

  const handleSave = async () => {
    const res = await fetch("/api/user/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        about_text: aboutText,
        parent_notes: parentNotes,
        mood,
      }),
    });
    if (res.ok) {
      setIsEditing(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      playClickSound();
    }
  };

  const triggerMissionComplete = async () => {
    playClickSound();
    const sticker = "/stickers/mission-accomplished.jpeg";
    const res = await fetch("/api/user/stickers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: sticker }),
    });
    if (res.ok) {
      setEarnedStickers((prev) => [...prev, sticker]);
      setShowStickerModal(true);
      confetti({ particleCount: 300, spread: 120, origin: { y: 0.6 } });
    }
  };

  const downloadSticker = (src: string) => {
    playClickSound();
    const link = document.createElement("a");
    link.href = src;
    link.download = "nimi-sticker.jpeg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <audio
        ref={stickerSoundRef}
        src="/sounds/sticker-earned.mp3"
        preload="auto"
      />
      <audio ref={clickSoundRef} src="/sounds/click.mp3" preload="auto" />
      <Header />

      {/* Floating decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 text-blue-300 animate-bounce text-2xl">
          🌟
        </div>
        <div
          className="absolute bottom-40 left-10 text-purple-300 animate-bounce text-2xl"
          style={{ animationDelay: "1s" }}
        >
          ✨
        </div>
        <div
          className="absolute top-1/3 left-20 text-yellow-300 animate-bounce text-2xl"
          style={{ animationDelay: "2s" }}
        >
          🏆
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="text-8xl mb-4">{userData.avatar}</div>
            <button
              onClick={() => {
                playClickSound();
                setIsEditing(true);
              }}
              className="absolute bottom-2 right-0 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-all"
              aria-label={t("editProfile")}
            >
              <Edit className="w-5 h-5 text-purple-600" />
            </button>
          </div>
          <SafeUserInfo name={userData.name} age={userData.age} />
          <div className="flex justify-center items-center gap-2">
            <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              {t("level")} {userData.level}
            </Badge>
            <div className="text-yellow-500 flex items-center">
              <Star className="w-5 h-5 fill-yellow-400" />
              <span className="ml-1 font-bold">{userData.points}</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <Card className="mb-8 bg-gradient-to-r from-blue-100 to-purple-100 border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <Trophy className="w-6 h-6 mr-2 text-purple-600" />
              {t("achievements")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {userData.completedMissions}
                </div>
                <p className="text-sm text-gray-600">{t("completedMissions")}</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {userData.streak}
                </div>
                <p className="text-sm text-gray-600">{t("dailyStreak")}</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {userData.badges}
                </div>
                <p className="text-sm text-gray-600">{t("badges")}</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {userData.friends}
                </div>
                <p className="text-sm text-gray-600">{t("friends")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mood Tracker */}
        <Card className="mb-8 bg-white border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              🧠 {t("howAreYouFeelingToday")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-4 text-3xl">
              {["😄", "🙂", "😐", "😢", "🥳", "😴"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    playClickSound();
                    playMoodSound(emoji);
                    setMood(emoji);
                  }}
                  className={`transition-all ${
                    mood === emoji ? "scale-125" : "opacity-60"
                  }`}
                  aria-label={`${t("currentMood")}: ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {t("currentMood")}: <span className="font-bold">{mood}</span>
            </p>
            <p
              className={`text-center mt-2 text-sm font-semibold ${
                ["😢", "😐", "😴"].includes(mood)
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {moodMessageMap[mood]}
            </p>
          </CardContent>
        </Card>

        {/* About Me */}
        <Card className="mb-8 bg-white border-none shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-xl">
                <Book className="w-6 h-6 mr-2 text-blue-500" />
                {t("aboutMe")}
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    playClickSound();
                    setIsEditing(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" /> {t("editProfile")}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div>
                <Textarea
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  placeholder={t("aboutMe")}
                  className="w-full p-4 border border-gray-300 rounded-lg mb-4 min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      playClickSound();
                      setIsEditing(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                  >
                    {t("saveChanges")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">
              {aboutText || `About ${userData.name}...`}
            </p>
            
            )}
          </CardContent>
        </Card>

        {/* Parent Notes */}
        <Card className="mb-8 bg-white border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              📝 {t("parentNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={t("writeSomethingAboutYourChild")}
              value={parentNotes}
              onChange={(e) => setParentNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Badges */}
        <Card className="mb-8 bg-white border-none shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-xl">
                <Award className="w-6 h-6 mr-2 text-yellow-500" />
                {t("myBadges")}
              </CardTitle>
              <Button variant="ghost">
                {t("viewAll")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-sm"
                >
                  <div className="text-4xl mb-2">{badge.emoji}</div>
                  <h3 className="font-bold text-gray-800">{badge.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mission Complete Button */}
        <div className="flex justify-end mb-4 relative inline-block">
          <Button
            onClick={triggerMissionComplete}
            className="relative bg-gradient-to-r from-green-400 to-blue-500 text-white"
            aria-label={t("completeMissionOfDay")}
          >
            <Gift className="w-4 h-4 mr-2" />
            {t("completeMissionOfDay")}
            {earnedStickers.length > 0 && (
              <span className="absolute -top-2 -right-3 bg-yellow-400 text-xs font-bold rounded-full px-2">
                {earnedStickers.length}
              </span>
            )}
          </Button>
        </div>

        {/* Sticker Modal */}
        <div
          className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50
            transition-opacity duration-300 ${
              showStickerModal ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`bg-white rounded-xl shadow-xl p-6 text-center max-w-sm w-full
              transform transition-transform duration-300 ${
                showStickerModal ? "scale-100" : "scale-95"
              }`}
            tabIndex={showStickerModal ? 0 : -1}
          >
            <h2 className="text-2xl font-bold text-purple-600 mb-2">
              🎉 {t("stickerEarned")}
            </h2>
            <p className="text-gray-700 mb-4">{t("congratsMessage")}</p>
            <img
              src={earnedStickers[earnedStickers.length - 1]}
              alt="Sticker"
              className="w-40 h-40 mx-auto mb-4 animate-bounce"
            />
            <div className="flex justify-center gap-3">
              <Button
                onClick={() =>
                  downloadSticker(earnedStickers[earnedStickers.length - 1])
                }
                className="bg-yellow-400 hover:bg-yellow-500 text-white"
              >
                🧲 {t("downloadSticker")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  playClickSound();
                  setShowStickerModal(false);
                }}
              >
                {t("close")}
              </Button>
          </div> 
        </div>    
      </div>   
        {/* Recent Activity */}
        <Card className="bg-white border-none shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-xl">
                <Calendar className="w-6 h-6 mr-2 text-green-500" />
                {t("recentActivity")}
              </CardTitle>
              <Button variant="ghost">
                {t("viewAll")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="text-2xl mr-3">{activity.emoji}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{activity.type}</h3>
                    <p className="text-sm text-gray-600">{activity.mission}</p>
                  </div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Progress */}
        <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-xl">
              <Book className="w-6 h-6 mr-2 text-green-600" />
              {t("learningJourney")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-sm text-gray-700">
                  <span>
                    {t("currentLevel")}: {t("explorer")}
                  </span>
                  <span>
                    {t("nextLevel")}: {t("adventurer")}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full"
                    style={{ width: "65%" }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-600">
                  <span>Level 3</span>
                  <span>Level 4</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">65%</div>
                  <p className="text-sm text-gray-600">{t("progressToNextLevel")}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">7/10</div>
                  <p className="text-sm text-gray-600">{t("missionsToLevelUp")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
}
