import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Flame, 
  Target, 
  Clock, 
  BarChart3,
  Star,
  Calendar,
  TrendingUp
} from "lucide-react";

interface StudyStatsProps {
  stats: {
    totalWordsStudied?: number;
    averageAccuracy?: number;
    studyStreak?: number;
    totalTimeSpent?: number;
    weeklyGoal?: number;
    weeklyProgress?: number;
    level?: number;
    xp?: number;
    xpToNextLevel?: number;
  };
  currentSession: {
    wordsStudied: number;
    correctAnswers: number;
    timeSpent: number;
    streak: number;
  };
}

export function StudyStats({ stats, currentSession }: StudyStatsProps) {
  const achievements = [
    { id: 1, name: "First Steps", description: "Complete your first study session", earned: true },
    { id: 2, name: "Week Warrior", description: "Study for 7 days in a row", earned: (stats.studyStreak || 0) >= 7 },
    { id: 3, name: "Speed Learner", description: "Complete 50 words in one session", earned: false },
    { id: 4, name: "Perfect Score", description: "Get 100% accuracy in a session", earned: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Study Statistics</h2>
        <Badge variant="outline" className="px-3 py-1">
          Level {stats.level || 1}
        </Badge>
      </div>

      {/* Current Session Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Current Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{currentSession.wordsStudied}</div>
              <div className="text-sm text-gray-500">Words Studied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentSession.correctAnswers}</div>
              <div className="text-sm text-gray-500">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.floor(currentSession.timeSpent / 60)}m</div>
              <div className="text-sm text-gray-500">Time Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{currentSession.streak}</div>
              <div className="text-sm text-gray-500">Streak</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Overall Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Total Words</span>
                <span>{stats.totalWordsStudied || 0}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Average Accuracy</span>
                <span>{Math.round(stats.averageAccuracy || 0)}%</span>
              </div>
              <Progress value={stats.averageAccuracy || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Total Time</span>
                <span>{Math.floor((stats.totalTimeSpent || 0) / 3600)}h {Math.floor(((stats.totalTimeSpent || 0) % 3600) / 60)}m</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              <span>Study Streak</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.studyStreak || 0}</div>
              <div className="text-sm text-gray-500">Days in a row</div>
            </div>
            <div className="text-center text-sm text-gray-600">
              {(stats.studyStreak || 0) === 0 
                ? "Start studying to begin your streak!" 
                : `Keep it up! ${stats.studyStreak} day${(stats.studyStreak || 0) > 1 ? 's' : ''} strong 🔥`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Target className="h-5 w-5 text-green-500" />
              <span>Weekly Goal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{stats.weeklyProgress || 0}/{stats.weeklyGoal || 100} words</span>
              </div>
              <Progress value={((stats.weeklyProgress || 0) / (stats.weeklyGoal || 100)) * 100} className="h-2" />
            </div>
            <div className="text-center text-sm text-gray-600">
              {(stats.weeklyProgress || 0) >= (stats.weeklyGoal || 100)
                ? "🎉 Weekly goal achieved!"
                : `${(stats.weeklyGoal || 100) - (stats.weeklyProgress || 0)} words to go!`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* XP and Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-purple-500" />
            <span>Level Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Level {stats.level || 1}</span>
              <span className="text-sm text-gray-500">{stats.xp || 0} / {stats.xpToNextLevel || 1000} XP</span>
            </div>
            <Progress value={((stats.xp || 0) / (stats.xpToNextLevel || 1000)) * 100} className="h-3" />
            <div className="text-center text-sm text-gray-600">
              {(stats.xpToNextLevel || 1000) - (stats.xp || 0)} XP until Level {(stats.level || 1) + 1}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={`p-3 rounded-lg border ${
                  achievement.earned 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    achievement.earned ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}>
                    <Trophy className={`h-4 w-4 ${achievement.earned ? 'text-white' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${achievement.earned ? 'text-yellow-800' : 'text-gray-600'}`}>
                      {achievement.name}
                    </div>
                    <div className={`text-xs ${achievement.earned ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {achievement.description}
                    </div>
                  </div>
                  {achievement.earned && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      ✓
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}