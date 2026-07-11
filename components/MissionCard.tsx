// /components/MissionCard.tsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Play, Clock, Star } from "lucide-react";

interface MissionCardProps {
  mission: any;
  completed: boolean;
  onComplete: (id: string) => void;
}

export default function MissionCard({ mission, completed, onComplete }: MissionCardProps) {
  const Icon = mission.icon;

  return (
    <Card
      className={`transition duration-300 bg-white border border-ds-border shadow-ds-card overflow-hidden hover:shadow-lg ${
        completed ? "ring-1 ring-green-200" : "hover:scale-105"
      }`}
      style={{ borderRadius: 'var(--leaf-r)' }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl bg-green-500 animate-bounce">
              {completed ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Icon className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-800 mb-2">{mission.title}</CardTitle>
              <div className="flex items-center space-x-4">
                <Badge className="bg-[var(--ds-brand-subtle)] text-[var(--ds-brand-primary)] px-3 py-1">
                  ⏰ {mission.time}
                </Badge>
                <Badge variant="outline" className="border-ds-border text-gray-500 px-3 py-1">
                  🎯 {mission.type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-lg font-semibold text-gray-700">
            <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full mb-2">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              {mission.duration}
            </div>
            <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
              <Star className="w-5 h-5 mr-2 text-yellow-600" />
              {mission.points} points
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="mb-4">
          <p className="text-gray-800 mb-2">🎯 <strong>Objectives:</strong> {mission.objectives.join(", ")}</p>
          <p className="text-gray-800 mb-2">📝 <strong>Activity:</strong> {mission.activity}</p>
          <p className="text-gray-800 mb-2">🏆 <strong>Piko Victory:</strong> {mission.pikoVictory}</p>
          <p className="text-gray-800 mb-2">🧰 <strong>Materials:</strong> {mission.materials.join(", ")}</p>
          {mission.funFact && (
            <p className="text-gray-500 italic mt-2">💡 Fun Fact: {mission.funFact}</p>
          )}
        </div>

        <div className="max-w-md mx-auto">
          {mission.videoUrl && (
            <video src={mission.videoUrl} controls className="w-full max-h-64 rounded-lg shadow-md mb-4" />
          )}
          {mission.audioUrl && (
            <audio src={mission.audioUrl} controls className="w-full mb-4" />
          )}
        </div>

        {!completed && (
          <Button
            onClick={() => onComplete(mission.id)}
            className="text-white px-6 py-3 shadow-sm text-lg font-bold transition hover:scale-105"
            style={{ backgroundColor: 'var(--nimi-green)', borderRadius: 'var(--leaf-r-sm)' }}
          >
            <Play className="w-5 h-5 mr-2" />
            Start Mission
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
