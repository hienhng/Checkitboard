import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  LineChart as LineChartIcon,
  Calendar,
  CheckCircle,
  CalendarCheck,
  Award,
  Target,
  BookOpen,
  Clock,
  Star,
  Trophy,
  Brain,
  Zap,
  Activity,
  PieChart as PieChartIcon,
  BarChart3
} from "lucide-react";

export default function LearnerAnalysis() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Get all completed submissions for the current student
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/learner/results"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Process the data for charts
  const chartData = (submissions as any[])
    .map((submission: any) => ({
      date: format(new Date(submission.submittedAt), 'MMM dd'),
      fullDate: format(new Date(submission.submittedAt), 'PPP'),
      score: submission.score,
      title: submission.list.title,
      id: submission.id,
      timestamp: new Date(submission.submittedAt).getTime(),
      month: format(new Date(submission.submittedAt), 'MMM yyyy'),
      weekday: format(new Date(submission.submittedAt), 'EEEE')
    }))
    .sort((a: any, b: any) => a.timestamp - b.timestamp);

  // Calculate comprehensive statistics
  const totalSubmissions = chartData.length;
  const avgScore = chartData.length > 0 
    ? Math.round(chartData.reduce((sum: number, item: any) => sum + item.score, 0) / chartData.length) 
    : 0;
  
  const bestScore = chartData.length > 0 ? Math.max(...chartData.map(item => item.score)) : 0;
  const recentScore = chartData.length > 0 ? chartData[chartData.length - 1].score : 0;
  
  // Calculate improvement trend
  const improvementTrend = chartData.length >= 2 
    ? chartData[chartData.length - 1].score - chartData[0].score
    : 0;

  // Performance categories
  const excellentCount = chartData.filter(item => item.score >= 90).length;
  const goodCount = chartData.filter(item => item.score >= 70 && item.score < 90).length;
  const averageCount = chartData.filter(item => item.score >= 50 && item.score < 70).length;
  const needsImprovementCount = chartData.filter(item => item.score < 50).length;

  // Monthly performance data
  const monthlyData = chartData.reduce((acc: any, item: any) => {
    const existing = acc.find((d: any) => d.month === item.month);
    if (existing) {
      existing.total += item.score;
      existing.count += 1;
      existing.average = Math.round(existing.total / existing.count);
    } else {
      acc.push({
        month: item.month,
        total: item.score,
        count: 1,
        average: item.score
      });
    }
    return acc;
  }, []);

  // Performance distribution data for pie chart
  const performanceData = [
    { name: 'Excellent (90-100%)', value: excellentCount, fill: '#10b981' },
    { name: 'Good (70-89%)', value: goodCount, fill: '#3b82f6' },
    { name: 'Average (50-69%)', value: averageCount, fill: '#f59e0b' },
    { name: 'Needs Improvement (<50%)', value: needsImprovementCount, fill: '#ef4444' }
  ].filter(item => item.value > 0);

  // Achievement calculations
  const achievements = [
    {
      id: 'first_test',
      title: 'Getting Started',
      description: 'Completed your first vocabulary test',
      icon: BookOpen,
      earned: totalSubmissions >= 1,
      color: 'text-blue-500'
    },
    {
      id: 'five_tests',
      title: 'Consistent Learner',
      description: 'Completed 5 vocabulary tests',
      icon: Target,
      earned: totalSubmissions >= 5,
      color: 'text-green-500'
    },
    {
      id: 'perfect_score',
      title: 'Perfectionist',
      description: 'Achieved a perfect score (100%)',
      icon: Trophy,
      earned: bestScore === 100,
      color: 'text-yellow-500'
    },
    {
      id: 'high_average',
      title: 'High Achiever',
      description: 'Maintained an average score above 85%',
      icon: Star,
      earned: avgScore >= 85,
      color: 'text-purple-500'
    },
    {
      id: 'improvement',
      title: 'Rising Star',
      description: 'Improved your performance by 20+ points',
      icon: TrendingUp,
      earned: improvementTrend >= 20,
      color: 'text-orange-500'
    },
    {
      id: 'dedicated',
      title: 'Dedicated Student',
      description: 'Completed 10+ vocabulary tests',
      icon: Brain,
      earned: totalSubmissions >= 10,
      color: 'text-indigo-500'
    }
  ];

  const earnedAchievements = achievements.filter(a => a.earned);

  // Function to determine badge color based on score
  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 70) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Learning Progress
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your vocabulary mastery journey and achievements
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your progress data...</p>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-3xl"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Score
                    </CardTitle>
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getPerformanceColor(avgScore)}`}>
                    {avgScore}%
                  </div>
                  <Progress value={avgScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Across {totalSubmissions} completed tests
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-3xl"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Best Score
                    </CardTitle>
                    <Trophy className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getPerformanceColor(bestScore)}`}>
                    {bestScore}%
                  </div>
                  <Progress value={bestScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your highest achievement
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-3xl"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Recent Performance
                    </CardTitle>
                    <Zap className="h-4 w-4 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getPerformanceColor(recentScore)}`}>
                    {recentScore || 0}%
                  </div>
                  <Progress value={recentScore || 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your latest test result
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-3xl"></div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Improvement
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {improvementTrend >= 0 ? '+' : ''}{improvementTrend}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Points since first test
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {improvementTrend >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />
                    )}
                    <span className={`text-xs font-medium ${improvementTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {improvementTrend >= 0 ? 'Improving' : 'Declining'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="mr-2 h-5 w-5 text-primary" />
                  Progress Over Time
                </CardTitle>
                <CardDescription>
                  Your vocabulary check-up scores over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 20,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, 'Score']}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ 
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: 'white'
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          name="Score"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 6, fill: '#3b82f6' }}
                          activeDot={{ r: 8, fill: '#1d4ed8' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <LineChartIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No Progress Data Yet
                    </h3>
                    <p className="text-gray-500">
                      Complete some vocabulary tests to see your progress chart
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Performance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                    Performance Distribution
                  </CardTitle>
                  <CardDescription>
                    Breakdown of your test performance levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={performanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {performanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChartIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-primary" />
                    Monthly Trends
                  </CardTitle>
                  <CardDescription>
                    Average scores by month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyData.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value) => [`${value}%`, 'Average Score']}
                            contentStyle={{ 
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: 'white'
                            }}
                          />
                          <Bar dataKey="average" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No monthly data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Detailed breakdown of your test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{excellentCount}</div>
                    <div className="text-sm text-green-700">Excellent (90-100%)</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{goodCount}</div>
                    <div className="text-sm text-blue-700">Good (70-89%)</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{averageCount}</div>
                    <div className="text-sm text-yellow-700">Average (50-69%)</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{needsImprovementCount}</div>
                    <div className="text-sm text-red-700">Needs Work (&lt;50%)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <Card key={achievement.id} className={`relative overflow-hidden ${achievement.earned ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : 'opacity-60'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <IconComponent className={`h-8 w-8 ${achievement.earned ? achievement.color : 'text-gray-400'}`} />
                        {achievement.earned && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Earned
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold mb-2">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </CardContent>
                    {achievement.earned && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-bl-3xl"></div>
                    )}
                  </Card>
                );
              })}
            </div>

            {earnedAchievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                    Your Achievements ({earnedAchievements.length}/{achievements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={(earnedAchievements.length / achievements.length) * 100} className="mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Keep up the great work! You've earned {earnedAchievements.length} out of {achievements.length} available achievements.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarCheck className="mr-2 h-5 w-5 text-primary" />
                  Test History
                </CardTitle>
                <CardDescription>
                  Complete record of all your vocabulary test submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <div className="space-y-4">
                    {chartData.slice().reverse().map((submission: any, index: number) => (
                      <div key={submission.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-shrink-0 mr-4">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">
                            #{chartData.length - index}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{submission.title}</h4>
                            <Badge className={getScoreBadgeColor(submission.score)}>
                              {submission.score}%
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {submission.fullDate}
                            </div>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              Test #{chartData.length - index}
                            </div>
                          </div>
                          <Progress value={submission.score} className="mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No Test History
                    </h3>
                    <p className="text-gray-500">
                      Your completed vocabulary tests will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}