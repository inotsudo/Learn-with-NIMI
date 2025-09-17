"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Baby, CalendarCheck, Clock, Gem, Lock, Moon, Plus, Settings, Shield, Star,
  Trophy, BarChart3, Bell, Globe, Download, Users, Award, Languages, Volume2,
  Eye, EyeOff, Calendar, Target, Gift, Heart, Zap, Sparkles, Palette,
  BookOpen, Puzzle, Music, Camera, GamepadIcon, Microscope, Car
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link"
import { UserProfileMenu } from "@/components/parent/parent-profile";

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import Header from "@/components/Header";
import BottomNavigation from "@/components/BottomNavigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChildren, Child, Activity } from "@/hooks/useChildren";
import { useSession } from "@supabase/auth-helpers-react";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabaseClient";
import { debounce } from "lodash";

// Import chart library
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MAX_CHILDREN_FREE = 2;

// Validation utilities
const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const validateDomain = (domain: string): boolean => {
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
};

const validateName = (name: string): { isValid: boolean; error?: string } => {
  const trimmed = name.trim();
  if (!trimmed) return { isValid: false, error: "Name cannot be empty" };
  
  const specialCharRegex = /[^a-zA-Z\s]/;
  if (specialCharRegex.test(trimmed)) {
    return { isValid: false, error: "Name cannot contain special characters or numbers" };
  }
  
  return { isValid: true };
};

// Theme options with icons
const themeOptions = [
  { value: "ocean", label: "Ocean", icon: "🐠", color: "bg-blue-100" },
  { value: "space", label: "Space", icon: "🚀", color: "bg-indigo-100" },
  { value: "safari", label: "Safari", icon: "🦁", color: "bg-yellow-100" },
  { value: "dinosaurs", label: "Dinosaurs", icon: "🦖", color: "bg-green-100" },
  { value: "fairytale", label: "Fairytale", icon: "🏰", color: "bg-pink-100" },
  { value: "superhero", label: "Superhero", icon: "🦸", color: "bg-red-100" },
];

// Avatar picker component with custom upload
const AvatarPicker = ({ 
  selectedAvatar, 
  onSelect,
  onUpload,
  isUploading
}: { 
  selectedAvatar: string; 
  onSelect: (avatar: string) => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}) => {
  const presetAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1519764622345-23439dd774f7?w=150&h=150&fit=crop&crop=face",
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-3 gap-2">
        {presetAvatars.map((avatar, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(avatar)}
            className={`p-1 border-2 rounded-full transition-all duration-300 hover:scale-110 ${
              selectedAvatar === avatar ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent"
            }`}
            aria-label={`Select avatar ${index + 1}`}
          >
            <img 
              src={avatar} 
              alt="" 
              className="w-12 h-12 rounded-full object-cover"
            />
          </button>
        ))}
      </div>
      
      <div className="border-t pt-4">
        <Label htmlFor="custom-avatar" className="block mb-2">Upload Custom Avatar</Label>
        <div className="flex items-center gap-2">
          <Input
            id="custom-avatar"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="flex-1"
          />
          {isUploading && (
            <div className="h-8 w-8 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};

// Age calculator component
const AgeCalculator = ({ 
  birthDate, 
  onDateChange 
}: { 
  birthDate: string; 
  onDateChange: (date: string) => void;
}) => {
  const calculateAge = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="birthdate">Child's Birth Date</Label>
      <Input
        id="birthdate"
        type="date"
        value={birthDate}
        onChange={(e) => onDateChange(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        className="transition-all focus:ring-2 focus:ring-blue-300"
      />
      {birthDate && (
        <p className="text-sm text-muted-foreground animate-fadeIn">
          Age: {calculateAge(birthDate)} years old
        </p>
      )}
    </div>
  );
};

// Theme selector component
const ThemeSelector = ({ 
  selectedTheme, 
  onSelect 
}: { 
  selectedTheme: string; 
  onSelect: (theme: string) => void;
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {themeOptions.map((theme) => (
        <button
          key={theme.value}
          type="button"
          onClick={() => onSelect(theme.value)}
          className={`p-3 rounded-xl transition-all duration-300 hover:scale-105 flex flex-col items-center ${
            selectedTheme === theme.value 
              ? "ring-2 ring-blue-500 bg-white shadow-md" 
              : "bg-gray-50 hover:bg-white"
          }`}
        >
          <span className="text-2xl mb-1">{theme.icon}</span>
          <span className="text-xs font-medium">{theme.label}</span>
        </button>
      ))}
    </div>
  );
};

export default function ParentPage() {
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const session = useSession();
  const { toast } = useToast();
  const parentId = session?.user?.id ?? null;

  const { children, updateChild, addChild, isReady } = useChildren(parentId);
  const [currentChildId, setCurrentChildId] = useState<string | null>(null);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [addChildError, setAddChildError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const currentChild = children.find((c) => c.id === currentChildId) || children[0];

  // --- Redirect if not logged in ---
  useEffect(() => {
    if (parentId === null && session !== undefined) {
      router.replace("/loginpage");
    }
  }, [parentId, session, router]);

  // --- Set default child ---
  useEffect(() => {
    if (!currentChildId && children.length > 0) {
      setCurrentChildId(children[0].id);
    }
  }, [children, currentChildId]);

  const handleAddChild = useCallback(async (name: string, birthDate?: string) => {
    if (children.length >= MAX_CHILDREN_FREE) {
      setAddChildError(t("upgradeRequired"));
      return null;
    }
    
    const validation = validateName(name);
    if (!validation.isValid) {
      setAddChildError(validation.error || t("addChildError"));
      return null;
    }
    
    // Calculate age from birthdate if provided
    let ageRange = "2-4 years";
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      if (age <= 3) ageRange = "2-3 years";
      else if (age <= 5) ageRange = "3-5 years";
      else if (age <= 8) ageRange = "5-8 years";
      else ageRange = "8+ years";
    }
    
    const result = await addChild(name); // only pass name
    if (result.success && result.child) {
      setCurrentChildId(result.child.id);
      setIsAddingChild(false);
      setAddChildError("");
      return result.child.id;
    } else {
      setAddChildError(result.error || t("addChildError"));
      return null;
    }
  }, [children.length, addChild, t]);

  const progressPercent = useMemo(() => {
    if (!currentChild) return 0;
    const completed = currentChild.activities?.filter(a => a.completed).length || 0;
    const total = currentChild.activities?.length || 1;
    return (completed / total) * 100;
  }, [currentChild]);

  const isPremium = useMemo(() => children.length >= MAX_CHILDREN_FREE ? false : true, [children.length]);

  if (!isReady || session === undefined) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="h-12 w-12 animate-spin border-4 border-blue-500 border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  if (!parentId) return null; // redirect in progress

  return (
<div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="ltr">
<Header />
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6 relative">
        <div className="absolute top-4 right-4 z-10">
          <UserProfileMenu />
        </div>

        <div className="text-center pt-2 md:pt-4">
          <div className="flex justify-center items-center gap-3">
            <div className="relative">
              <Baby className="text-pink-500 h-8 w-8" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              {currentChild ? `${currentChild.name}${t("parentZoneTitleSuffix")}` : t("child")}
            </h1>
          </div>
          <p className="text-blue-400 mt-1 text-sm">{t("subtitleAgeRange")}</p>
        </div>

        {/* Children Chips & Add Child */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setCurrentChildId(child.id)}
              className={`px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 ${
                currentChildId === child.id 
                  ? "bg-blue-500 text-white shadow-md" 
                  : "bg-white text-gray-700 shadow-sm hover:bg-blue-50"
              }`}
            >
              {child.name}
            </button>
          ))}
          <button
            onClick={() => setIsAddingChild(true)}
            className="px-4 py-2 rounded-full bg-white text-gray-700 shadow-sm hover:bg-blue-50 transition-all duration-300 hover:scale-105 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> {t("addChild")}
          </button>
        </div>

        {isAddingChild && (
          <AddChildForm 
            onCancel={() => setIsAddingChild(false)} 
            onSubmit={handleAddChild} 
            t={t} 
            error={addChildError} 
            currentChildCount={children.length} 
            maxChildrenFree={MAX_CHILDREN_FREE} 
          />
        )}
        
        {currentChild && !isAddingChild && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all">
                  {t("overview")}
                </TabsTrigger>
                <TabsTrigger value="progress" className="rounded-lg data-[state=active]:bg-green-500 data-[state=active]:text-white transition-all">
                  {t("progress")}
                </TabsTrigger>
                <TabsTrigger value="safety" className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all">
                  {t("safety")}
                </TabsTrigger>
                <TabsTrigger value="premium" className="rounded-lg data-[state=active]:bg-purple-500 data-[state=active]:text-white transition-all">
                  {t("premium")}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <ChildProfileCard
                    child={currentChild}
                    onUpdate={(updates) => updateChild(currentChild.id, updates)}
                    t={t}
                    parentId={parentId}
                  />

                  <WeeklyReportCard
                    child={currentChild}
                    progressPercent={progressPercent}
                    t={t}
                  />

                  <AchievementsCard
                    child={currentChild}
                    t={t}
                  />

                  <EngagementCard
                    child={currentChild}
                    t={t}
                    isPremium={isPremium}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="progress" className="space-y-6 animate-fadeIn">
                <ProgressCharts 
                  child={currentChild} 
                  t={t} 
                />
                
                {children.length > 1 && (
                  <ComparisonView 
                    children={children} 
                    currentChildId={currentChildId!} 
                    t={t} 
                  />
                )}
              </TabsContent>
              
              <TabsContent value="safety" className="space-y-6 animate-fadeIn">
                <ControlsCard
                  child={currentChild}
                  onUpdate={(updates) => updateChild(currentChild.id, updates)}
                  onScreenTimeChange={(val) => updateChild(currentChild.id, { screenTimeLimit: val })}
                  t={t}
                  whitelist={currentChild.whitelist || []}
                  blacklist={currentChild.blacklist || []}
                  setWhitelist={(newList) => updateChild(currentChild.id, { whitelist: newList })}
                  setBlacklist={(newList) => updateChild(currentChild.id, { blacklist: newList })}
                  isPremium={isPremium}
                />
                
                <BedtimeScheduler
                  child={currentChild}
                  onUpdate={(updates) => updateChild(currentChild.id, updates)}
                  t={t}
                />
              </TabsContent>
              
              <TabsContent value="premium" className="space-y-6 animate-fadeIn">
                <PremiumCard t={t} userId={parentId} toast={toast} isPremium={isPremium} />
                
                {!isPremium && (
                  <PremiumUpsellCard t={t} />
                )}                
                <FamilyLinkingCard t={t} isPremium={isPremium} />
              </TabsContent>
            </Tabs>
          </>
        )}

      </main>
      <BottomNavigation />
    </div>
  );
}

// Add CSS for animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .glass-effect {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
`;

// Add styles to the head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style")
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}
function AddChildForm({
  onCancel,
  onSubmit,
  t,
  error,
  currentChildCount,
  maxChildrenFree
}: {
  onCancel: () => void
  onSubmit: (name: string, birthDate?: string) => Promise<string | null>
  t: (key: string) => string
  error: string
  currentChildCount: number
  maxChildrenFree: number
}) {
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <Card className="bg-white border-2 border-blue-200">
      <CardHeader>
        <CardTitle>{t("addNewChild")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="childName">{t("childName")}</Label>
          <Input
            id="childName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("childNamePlaceholder")}
            aria-describedby="nameValidation"
          />
        </div>
        
        <AgeCalculator 
          birthDate={birthDate} 
          onDateChange={setBirthDate} 
        />
        
        {currentChildCount >= maxChildrenFree && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-yellow-700 text-sm">
          {`${t("freePlanLimitReached")}: ${maxChildrenFree}`}
</div>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              if (!name.trim()) return
              setIsSubmitting(true)
              await onSubmit(name.trim(), birthDate)
              setIsSubmitting(false)
            }}
            disabled={isSubmitting || !name.trim()}
          >
            {isSubmitting ? t("saving") : t("save")}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ChildProfileCard({
  child,
  onUpdate,
  t,
  parentId
}: {
  child: Child
  onUpdate: (updates: Partial<Child>) => void
  t: (key: string) => string
  parentId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(child.name ?? "")
  const [age, setAge] = useState(child.age ?? "")
  const [birthDate, setBirthDate] = useState(child.birthDate ?? "")
  const [avatar, setAvatar] = useState(child.avatar ?? "")
  const [theme, setTheme] = useState(child.theme ?? "ocean")
  const [avatarError, setAvatarError] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setName(child.name ?? "")
    setAge(child.age ?? "")
    setBirthDate(child.birthDate ?? "")
    setAvatar(child.avatar ?? "")
    setTheme(child.theme ?? "ocean")
    setAvatarError("")
  }, [child])

  const handleAvatarUpload = async (file: File) => {
    if (!parentId) return;
    
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${parentId}/${child.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      setAvatar(publicUrl);
      setAvatarError("");
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: t("uploadError"),
        description: t("uploadErrorDescription"),
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarChange = useCallback((newAvatar: string) => {
    setAvatar(newAvatar);
    if (newAvatar && !validateUrl(newAvatar)) {
      setAvatarError(t("invalidUrl"));
    } else {
      setAvatarError("");
    }
  }, [t]);

  const handleSave = useCallback(() => {
    if (avatar && !validateUrl(avatar)) {
      setAvatarError(t("invalidUrl"));
      return;
    }
    
    onUpdate({ name, age, birthDate, avatar, theme })
    setOpen(false)
  }, [name, age, birthDate, avatar, theme, onUpdate, t]);

  return (
    <Card className="bg-white border-2 border-blue-200">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={child.avatar || ""} alt={`${child.name}'s avatar`} />
            <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{child.name}</CardTitle>
            <p className="text-blue-500 flex items-center gap-1 text-sm">
              <CalendarCheck className="h-4 w-4" />
              <span>{child.age}</span>
              {child.birthDate && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({new Date(child.birthDate).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="ml-auto bg-transparent">
                <Settings className="h-4 w-4 mr-2" />
                {t("editProfile")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{t("editProfile")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("childName")}</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    aria-describedby="nameValidation"
                  />
                </div>
                
                <AgeCalculator 
                  birthDate={birthDate} 
                  onDateChange={setBirthDate} 
                />
                
                <div className="grid gap-2">
                  <Label htmlFor="avatar">{t("avatar")}</Label>
                  <Input
                    id="avatar"
                    value={avatar}
                    onChange={(e) => handleAvatarChange(e.target.value)}
                    placeholder="https://..."
                    aria-describedby="avatarValidation"
                    aria-invalid={!!avatarError}
                  />
                  {avatarError && (
                    <p id="avatarValidation" className="text-sm text-red-600">
                      {avatarError}
                    </p>
                  )}
                  <AvatarPicker 
                    selectedAvatar={avatar} 
                    onSelect={handleAvatarChange}
                    onUpload={handleAvatarUpload}
                    isUploading={isUploading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="theme">{t("favoriteTheme")}</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder={t("selectTheme")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ocean">{t("themeOcean")}</SelectItem>
                      <SelectItem value="space">{t("themeSpace")}</SelectItem>
                      <SelectItem value="safari">{t("themeSafari")}</SelectItem>
                      <SelectItem value="dinosaurs">{t("themeDinosaurs")}</SelectItem>
                      <SelectItem value="fairytale">{t("themeFairytale")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || !!avatarError}
                >
                  {t("save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{t("profileTip")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WeeklyReportCard({
  child,
  progressPercent,
  t,
}: {
  child: Child
  progressPercent: number
  t: (key: string) => string
}) {
  // Ensure activities is always an array
  const activities = child.activities || []

  const earnedBadge = progressPercent >= 80;

  return (
    <Card className="bg-yellow-50 border-2 border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700">
          <Star className="h-5 w-5" />
          {t("weeklyAdventures")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noActivitiesYet")}</p>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.name}</span>
                <span className="text-xs text-muted-foreground">{t("thisWeek")}</span>
              </div>
              <div className="flex gap-1">
              {item.weeklyRecord?.map((v: boolean, i: number) => (
                  <div
                    key={i}
                    className={`h-4 w-6 rounded flex items-center justify-center ${
                      v ? "bg-green-500" : "bg-yellow-200"
                    } border border-yellow-300`}
                    aria-label={`${t("day")} ${i + 1}: ${v ? t("done") : t("missed")}`}
                  >
                    <span className="sr-only">{v ? t("done") : t("missed")}</span>
                    <span aria-hidden="true">{v ? "✓" : "✗"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <Progress value={progressPercent} className="h-3 mt-4 bg-yellow-100" />
        <p className="text-sm text-yellow-700 text-center mt-1">
          {Math.round(progressPercent)}% {t("activitiesCompleted")}
        </p>
        
        {earnedBadge && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded-md text-center">
            <Star className="h-5 w-5 inline-block mr-2 text-yellow-600" />
            <span className="text-yellow-800 font-medium">{t("badgeEarned")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AchievementsCard({
  child,
  t
}: {
  child: Child
  t: (key: string) => string
}) {
  // Sample achievements data
  const achievements = [
    { id: 1, name: "First Activity", description: "Completed first activity", earned: true },
    { id: 2, name: "Week Streak", description: "7 days in a row", earned: child.activities && child.activities.length > 0 },
    { id: 3, name: "Explorer", description: "Tried 5 different activities", earned: false },
    { id: 4, name: "Time Master", description: "Completed all weekly activities", earned: false },
  ];

  return (
    <Card className="bg-green-50 border-2 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Trophy className="h-5 w-5" />
          {t("achievements")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {achievements.map((achievement) => (
          <div key={achievement.id} className={`flex items-center p-2 rounded-md ${achievement.earned ? 'bg-green-100' : 'bg-gray-100'}`}>
            <div className={`rounded-full p-2 mr-3 ${achievement.earned ? 'bg-green-300' : 'bg-gray-300'}`}>
              <Award className={`h-4 w-4 ${achievement.earned ? 'text-green-700' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className={`font-medium ${achievement.earned ? 'text-green-800' : 'text-gray-600'}`}>
                {achievement.name}
              </p>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
            </div>
          </div>
        ))}
        
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            {t("viewAllAchievements")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementCard({
  child,
  t,
  isPremium
}: {
  child: Child
  t: (key: string) => string
  isPremium: boolean
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(false);

  return (
    <Card className="bg-orange-50 border-2 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Bell className="h-5 w-5" />
          {t("engagement")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{t("activityReminders")}</span>
          </div>
          <Switch
            checked={notificationsEnabled}
            onCheckedChange={setNotificationsEnabled}
            className="data-[state=checked]:bg-orange-500"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{t("voiceAssistant")}</span>
          </div>
          <Switch
            checked={voiceAssistantEnabled}
            onCheckedChange={setVoiceAssistantEnabled}
            className="data-[state=checked]:bg-blue-500"
            disabled={!isPremium}
          />
        </div>
        {!isPremium && (
          <p className="text-xs text-muted-foreground">{t("premiumFeature")}</p>
        )}
        
        <div className="pt-2">
          <h4 className="font-medium mb-2">{t("parentingTips")}</h4>
          <div className="bg-white p-3 rounded-md border">
            <p className="text-sm">{t("sampleTip")}</p>
            <Button variant="link" className="p-0 h-auto text-xs">
              {t("readMore")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCharts({
  child,
  t
}: {
  child: Child
  t: (key: string) => string
}) {
  // Sample data for charts
  const screenTimeData = [
    { day: 'Mon', minutes: 40 },
    { day: 'Tue', minutes: 55 },
    { day: 'Wed', minutes: 35 },
    { day: 'Thu', minutes: 60 },
    { day: 'Fri', minutes: 45 },
  ];

  const activityData = [
    { name: 'Completed', value: child.activities ? child.activities.filter(a => a.completed).length : 0 },
    { name: 'Pending', value: child.activities ? child.activities.filter(a => !a.completed).length : 0 },
  ];

  const COLORS = ['#0088FE', '#FF8042'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("screenTimeTrends")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={screenTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis label={{ value: t("minutes"), angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="minutes" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("activityCompletion")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComparisonView({
  children,
  currentChildId,
  t
}: {
  children: Child[]
  currentChildId: string
  t: (key: string) => string
}) {
  const currentChild = children.find(c => c.id === currentChildId);
  const otherChildren = children.filter(c => c.id !== currentChildId);
  
  if (!currentChild || otherChildren.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("comparisonView")}
        </CardTitle>
        <CardDescription>
          {t("compareProgress")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">{t("childName")}</th>
                <th className="text-left p-2">{t("activitiesCompleted")}</th>
                <th className="text-left p-2">{t("screenTimeAvg")}</th>
                <th className="text-left p-2">{t("streak")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-blue-50">
                <td className="p-2 font-medium">{currentChild.name}</td>
                <td className="p-2">
                  {currentChild.activities ? currentChild.activities.filter(a => a.completed).length : 0}
                </td>
                <td className="p-2">45 {t("minutes")}</td>
                <td className="p-2">3 {t("days")}</td>
              </tr>
              {otherChildren.map(child => (
                <tr key={child.id} className="border-b">
                  <td className="p-2">{child.name}</td>
                  <td className="p-2">
                    {child.activities ? child.activities.filter(a => a.completed).length : 0}
                  </td>
                  <td className="p-2">38 {t("minutes")}</td>
                  <td className="p-2">2 {t("days")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ControlsCard({
  child,
  onUpdate,
  onScreenTimeChange,
  t,
  whitelist,
  blacklist,
  setWhitelist,
  setBlacklist,
  isPremium,
}: {
  child: Child
  onUpdate: (updates: Partial<Child>) => void
  onScreenTimeChange: (value: number) => void
  t: (key: string) => string
  whitelist: string[]
  blacklist: string[]
  setWhitelist: (w: string[]) => void
  setBlacklist: (b: string[]) => void
  isPremium: boolean
}) {
  const [newDomain, setNewDomain] = useState("")
  const [domainError, setDomainError] = useState("")
  const [listType, setListType] = useState<"whitelist" | "blacklist">("whitelist")

  const addDomain = useCallback(() => {
    const d = newDomain.trim().toLowerCase()
    if (!d) return;
    
    if (!validateDomain(d)) {
      setDomainError(t("invalidDomain"));
      return;
    }
    
    if (listType === "whitelist") {
      if (whitelist.includes(d)) {
        setNewDomain("")
        setDomainError("")
        return
      }
      setWhitelist([...whitelist, d])
    } else {
      if (blacklist.includes(d)) {
        setNewDomain("")
        setDomainError("")
        return
      }
      setBlacklist([...blacklist, d])
    }
    
    setNewDomain("")
    setDomainError("")
  }, [newDomain, whitelist, blacklist, setWhitelist, setBlacklist, listType, t]);

  const removeDomain = useCallback((d: string, type: "whitelist" | "blacklist") => {
    if (type === "whitelist") {
      setWhitelist(whitelist.filter((x) => x !== d))
    } else {
      setBlacklist(blacklist.filter((x) => x !== d))
    }
  }, [whitelist, blacklist, setWhitelist, setBlacklist]);

  const handleScreenTimeChange = useCallback(([val]: number[]) => {
    onScreenTimeChange(val);
  }, [onScreenTimeChange]);

  const handleBedtimeModeChange = useCallback((val: boolean) => {
    onUpdate({ bedtimeMode: val });
  }, [onUpdate]);

  const handleContentLockChange = useCallback((val: boolean) => {
    onUpdate({ contentLock: val });
  }, [onUpdate]);

  const isDisabled = !isPremium;
  const disabledClass = isDisabled ? "opacity-60 pointer-events-none" : "";

  return (
    <Card className="bg-pink-50 border-2 border-pink-200">
      <CardHeader>
        <CardTitle className="text-pink-700 flex items-center gap-2">
          {t("safetySettings")}
          {isDisabled && <Lock className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className={`space-y-2 ${disabledClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-pink-500" />
              <span className="font-medium">{t("screenTime")}</span>
            </div>
            <span className="font-bold text-pink-600">
              {child.screenTimeLimit} {t("min")}
            </span>
          </div>
          <Slider
            value={[child.screenTimeLimit ?? 0]} 
            max={120}
            step={5}
            onValueChange={handleScreenTimeChange}
            className="[&_[role=slider]]:bg-pink-500"
            aria-label={t("screenTimeLimit")}
          />
          <p className="text-xs text-muted-foreground">{t("screenTimeHint")}</p>
        </div>

        <div className={`flex items-center justify-between pt-2 ${disabledClass}`}>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-purple-500" />
            <span className="font-medium">{t("bedtimeMode")}</span>
          </div>
          <Switch
            checked={child.bedtimeMode}
            onCheckedChange={handleBedtimeModeChange}
            className="data-[state=checked]:bg-purple-500"
            aria-label={t("bedtimeMode")}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("bedtimeHint")}</p>

        <div className={`flex items-center justify-between pt-2 ${disabledClass}`}>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{t("kidSafeOnly")}</span>
          </div>
          <Switch
            checked={child.contentLock}
            onCheckedChange={handleContentLockChange}
            className="data-[state=checked]:bg-blue-500"
            aria-label={t("kidSafeOnly")}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("kidSafeHint")}</p>

        {child.contentLock && (
          <div className={`space-y-2 rounded-md border bg-white/60 p-3 ${disabledClass}`}>
            <div className="font-medium">{t("domainFiltering")}</div>
            
            <Tabs defaultValue="whitelist" onValueChange={(v) => setListType(v as "whitelist" | "blacklist")}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="whitelist">{t("whitelistTitle")}</TabsTrigger>
                <TabsTrigger value="blacklist">{t("blacklistTitle")}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="whitelist" className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder={t("domainPlaceholder")}
                    aria-describedby="domainValidation"
                    aria-invalid={!!domainError}
                  />
                  <Button variant="outline" onClick={addDomain}>
                    {t("addDomain")}
                  </Button>
                </div>
                {domainError && (
                  <p id="domainValidation" className="text-sm text-red-600">
                    {domainError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {whitelist.map((d) => (
                    <Badge key={d} variant="secondary" className="px-2 py-1">
                      {d}
                      <button 
                        onClick={() => removeDomain(d, "whitelist")} 
                        className="ml-1 text-red-600 hover:underline"
                        aria-label={`${t("remove")} ${d}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="blacklist" className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder={t("domainPlaceholder")}
                    aria-describedby="domainValidation"
                    aria-invalid={!!domainError}
                  />
                  <Button variant="outline" onClick={addDomain}>
                    {t("addDomain")}
                  </Button>
                </div>
                {domainError && (
                  <p id="domainValidation" className="text-sm text-red-600">
                    {domainError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {blacklist.map((d) => (
                    <Badge key={d} variant="secondary" className="px-2 py-1">
                      {d}
                      <button 
                        onClick={() => removeDomain(d, "blacklist")} 
                        className="ml-1 text-red-600 hover:underline"
                        aria-label={`${t("remove")} ${d}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
            
            <p className="text-xs text-muted-foreground">{t("whitelistNote")}</p>
          </div>
        )}
        
        {isDisabled && (
          <div className="text-sm text-muted-foreground">
            {t("upgradeForFullAccess")}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BedtimeScheduler({
  child,
  onUpdate,
  t
}: {
  child: Child
  onUpdate: (updates: Partial<Child>) => void
  t: (key: string) => string
}) {
  const [bedtimeStart, setBedtimeStart] = useState(child.bedtimeStart || "21:00");
  const [bedtimeEnd, setBedtimeEnd] = useState(child.bedtimeEnd || "07:00");

  const handleSave = () => {
    onUpdate({ 
      bedtimeMode: true, 
      bedtimeStart, 
      bedtimeEnd 
    });
  };

  return (
    <Card className="bg-purple-50 border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="text-purple-700 flex items-center gap-2">
          <Moon className="h-5 w-5" />
          {t("bedtimeScheduler")}
        </CardTitle>
        <CardDescription>
          {t("bedtimeSchedulerDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bedtimeStart">{t("startTime")}</Label>
            <Input
              id="bedtimeStart"
              type="time"
              value={bedtimeStart}
              onChange={(e) => setBedtimeStart(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bedtimeEnd">{t("endTime")}</Label>
            <Input
              id="bedtimeEnd"
              type="time"
              value={bedtimeEnd}
              onChange={(e) => setBedtimeEnd(e.target.value)}
            />
          </div>
        </div>
        
        <div className="bg-white p-3 rounded-md border">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("bedtimeActive")}</span>
            <Switch 
              checked={child.bedtimeMode} 
              onCheckedChange={(checked) => onUpdate({ bedtimeMode: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("bedtimeActiveDescription")} {bedtimeStart} - {bedtimeEnd}
          </p>
        </div>
        
        <Button onClick={handleSave}>
          {t("saveSchedule")}
        </Button>
      </CardContent>
    </Card>
  );
}

function PremiumCard({ t, userId, toast, isPremium }: { 
  t: (key: string) => string; 
  userId: string | null; 
  toast: any;
  isPremium: boolean;
}) {
  const [prefStorybook, setPrefStorybook] = useState(true);
  const [prefColoring, setPrefColoring] = useState(true);
  const [deliveryDay, setDeliveryDay] = useState("Friday");
  const [isLoading, setIsLoading] = useState(true);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (prefs: any) => {
      if (!userId) return;

      try {
        const { error } = await supabase
          .from("users")
          .update({ delivery_preferences: prefs })
          .eq("auth_user_id", userId);

        if (error) {
          console.error("Error saving preferences:", error);
          toast({
            title: "Error",
            description: "Failed to save preferences",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error saving preferences:", error);
      }
    }, 1000),
    [userId, toast]
  );

  // Fetch user preferences from Supabase
  useEffect(() => {
    if (!userId) return;

    const fetchUserPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("delivery_preferences")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user preferences:", error);
          toast({
            title: "Error",
            description: "Failed to load preferences",
            variant: "destructive",
          });
          return;
        }

        if (data?.delivery_preferences) {
          setPrefStorybook(data.delivery_preferences.storybook ?? true);
          setPrefColoring(data.delivery_preferences.coloring ?? true);
          setDeliveryDay(data.delivery_preferences.day || "Friday");
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
        toast({
          title: "Error",
          description: "Failed to load preferences",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPreferences();
  }, [userId, toast]);

  // Auto-save preferences when they change
  useEffect(() => {
    if (isLoading || !isPremium) return;
    
    const deliveryPrefs = {
      storybook: prefStorybook,
      coloring: prefColoring,
      day: deliveryDay,
    };
    
    debouncedSave(deliveryPrefs);
  }, [prefStorybook, prefColoring, deliveryDay, debouncedSave, isLoading, isPremium]);

  const bullets = [
    t("premiumBullet1"),
    t("premiumBullet2"),
    t("premiumBullet3"),
    t("premiumBullet4"),
    t("premiumBullet5"),
  ];

  if (isLoading) {
    return (
      <Card className="bg-purple-50 border-2 border-purple-200">
        <CardContent className="flex items-center justify-center h-40">
          <div className="h-8 w-8 animate-spin border-4 border-purple-300 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-purple-50 border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Gem className="h-5 w-5" />
          {isPremium ? t("premiumBenefits") : t("premiumUpsell")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-purple-700 list-disc pl-5">
          {bullets.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>

        <div className="rounded-md bg-white/70 border border-purple-200 p-3 text-sm text-purple-800">
          {t("premiumGuarantee")}
        </div>

        <div className="rounded-md border bg-white/60 p-3 space-y-3">
          <div className="font-semibold">{t("premiumDeliveriesTitle")}</div>
          <div className={`grid sm:grid-cols-2 gap-3 ${!isPremium ? "opacity-60" : ""}`}>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={prefStorybook} 
                onChange={(e) => setPrefStorybook(e.target.checked)} 
                disabled={!isPremium}
                aria-label={t("weeklyHardStorybook")}
              />
              <span>{t("weeklyHardStorybook")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={prefColoring} 
                onChange={(e) => setPrefColoring(e.target.checked)} 
                disabled={!isPremium}
                aria-label={t("weeklyColoringBook")}
              />
              <span>{t("weeklyColoringBook")}</span>
            </label>
            <div className="sm:col-span-2">
              <Label htmlFor="deliveryDay">{t("chooseDeliveryDay")}</Label>
              <Select 
                value={deliveryDay} 
                onValueChange={setDeliveryDay}
                disabled={!isPremium}
              >
                <SelectTrigger id="deliveryDay" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!isPremium && (
            <p className="text-xs text-muted-foreground">{t("subscribeToUnlockDeliveries")}</p>
          )}
          <div className="flex gap-2">
            <Link href="/subscription" className="block mt-1">
              <Button className="bg-purple-600 hover:bg-purple-700">
                {isPremium ? t("manageSubscription") : t("upgradeNow")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PremiumUpsellCard({ t }: { t: (key: string) => string }) {
  return (
    <Card className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300 relative overflow-hidden">
      <div className="absolute inset-0 backdrop-blur-sm bg-white/30" />
      <div className="relative z-10 p-6 text-center">
        <Gem className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-purple-800 mb-2">{t("unlockPremiumFeatures")}</h3>
        <p className="text-purple-600 mb-4">{t("premiumUpsellDescription")}</p>
        <Link href="/subscription">
          <Button className="bg-purple-600 hover:bg-purple-700">
            {t("upgradeNow")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

// function OfflineActivitiesCard({ t, isPremium }: { t: (key: string) => string; isPremium: boolean }) {
//   const activities = [
//     { id: 1, title: t("coloringBook"), description: t("coloringBookDesc"), downloadUrl: "#" },
//     { id: 2, title: t("storyBook"), description: t("storyBookDesc"), downloadUrl: "#" },
//     { id: 3, title: t("activityPack"), description: t("activityPackDesc"), downloadUrl: "#" },
//   ];

//   return (
//     <Card className="bg-blue-50 border-2 border-blue-200">
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2 text-blue-700">
//           <Download className="h-5 w-5" />
//           {t("offlineActivities")}
//         </CardTitle>
//         <CardDescription>
//           {t("offlineActivitiesDesc")}
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         {activities.map(activity => (
//           <div key={activity.id} className="p-3 border rounded-md bg-white">
//             <h4 className="font-medium">{activity.title}</h4>
//             <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
//             <Button 
//               size="sm" 
//               disabled={!isPremium}
//               onClick={() => window.open(activity.downloadUrl, '_blank')}
//             >
//               <Download className="h-4 w-4 mr-1" />
//               {t("download")}
//             </Button>
//           </div>
//         ))}
        
//         {!isPremium && (
//           <div className="text-center mt-4">
//             <Link href="/subscription">
//               <Button variant="outline">
//                 {t("upgradeToDownload")}
//               </Button>
//             </Link>
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

function FamilyLinkingCard({ t, isPremium }: { t: (key: string) => string; isPremium: boolean }) {
  const [familyMembers, setFamilyMembers] = useState([
    { id: 1, name: "Parent 1", email: "parent1@example.com", status: "connected" },
    { id: 2, name: "Parent 2", email: "parent2@example.com", status: "pending" },
  ]);

  return (
    <Card className="bg-green-50 border-2 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Users className="h-5 w-5" />
          {t("familyAccountLinking")}
        </CardTitle>
        <CardDescription>
          {t("familyAccountLinkingDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPremium ? (
          <>
            <div className="space-y-3">
              {familyMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-2 border rounded-md bg-white">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Badge variant={member.status === "connected" ? "default" : "secondary"}>
                    {member.status}
                  </Badge>
                </div>
              ))}
            </div>
            
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("inviteFamilyMember")}
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <Users className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <h4 className="font-medium text-green-800 mb-2">{t("premiumFeature")}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t("familyLinkingPremiumDesc")}
            </p>
            <Link href="/subscription">
              <Button>
                {t("upgradeNow")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}