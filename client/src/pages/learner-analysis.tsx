import { PageHeader } from "@/components/workspace-ui";
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
    <div className="workspace-page">
      <div className="workspace-page">
        {/* Header */}
        <PageHeader eyebrow="Look how far you’ve come" title="Small steps. Real progress." description="Every practice session tells a story. See the words you’re mastering and where you can grow next." />

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center   animate-pulse bg-primary">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <p className="text-muted-foreground text-lg">Loading your progress data...</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="inline-flex w-full lg:w-[650px] p-1.5 bg-card dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 shadow-lg rounded-xl">
              <TabsTrigger value="overview" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
                <Activity className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
                <Award className="h-4 w-4" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Stats Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-muted/50" />
                <CardContent className="relative p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
                      <Target className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Average Score</p>
                      <p className={`text-3xl font-bold ${getPerformanceColor(avgScore)}`}>{avgScore}%</p>
                    </div>
                  </div>
                  <Progress value={avgScore} className="mt-4" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Across {totalSubmissions} completed tests
                  </p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-muted/50" />
                <CardContent className="relative p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
                      <Trophy className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Best Score</p>
                      <p className={`text-3xl font-bold ${getPerformanceColor(bestScore)}`}>{bestScore}%</p>
                    </div>
                  </div>
                  <Progress value={bestScore} className="mt-4" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your highest achievement
                  </p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-muted/50" />
                <CardContent className="relative p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
                      <Zap className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Recent Performance</p>
                      <p className={`text-3xl font-bold ${getPerformanceColor(recentScore)}`}>{recentScore || 0}%</p>
                    </div>
                  </div>
                  <Progress value={recentScore || 0} className="mt-4" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Your latest test result
                  </p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <div className="absolute inset-0 bg-muted/50" />
                <CardContent className="relative p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
                      <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Improvement</p>
                      <p className={`text-3xl font-bold ${improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {improvementTrend >= 0 ? '+' : ''}{improvementTrend}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-4">
                    {improvementTrend >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                    )}
                    <span className={`text-sm font-medium ${improvementTrend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {improvementTrend >= 0 ? 'Improving' : 'Declining'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">since first test</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Chart */}
            <Card className="relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm rounded-2xl">
              <CardHeader className="relative text-white rounded-t-2xl px-8 py-6 bg-primary">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <LineChartIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Progress Over Time</CardTitle>
                    <CardDescription className="text-white/80 mt-1">
                      Your vocabulary check-up scores over time
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
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
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: 'white',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
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
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-muted/50">
                      <LineChartIcon className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">
                      No Progress Data Yet
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
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
              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 bg-muted/50">
                      <PieChartIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Performance Distribution</CardTitle>
                      <CardDescription className="mt-0.5">
                        Breakdown of your test performance levels
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {performanceData.length > 0 ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={performanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            innerRadius={40}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {performanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '12px',
                              border: 'none',
                              backgroundColor: 'white',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary">
                        <PieChartIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground">No performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25 bg-muted/50">
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">Monthly Trends</CardTitle>
                      <CardDescription className="mt-0.5">
                        Average scores by month
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
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
                              borderRadius: '12px',
                              border: 'none',
                              backgroundColor: 'white',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Bar dataKey="average" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-primary">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground">No monthly data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card className="relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg rounded-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 bg-muted/50">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Performance Summary</CardTitle>
                    <CardDescription className="mt-0.5">
                      Detailed breakdown of your test results
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="group text-center p-5 rounded-xl border border-emerald-200 dark:border-emerald-700/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 bg-muted/50">
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{excellentCount}</div>
                    <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mt-1">Excellent (90-100%)</div>
                  </div>
                  <div className="group text-center p-5 rounded-xl border border-blue-200 dark:border-blue-700/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 bg-muted/50">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{goodCount}</div>
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">Good (70-89%)</div>
                  </div>
                  <div className="group text-center p-5 rounded-xl border border-amber-200 dark:border-amber-700/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 bg-muted/50">
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{averageCount}</div>
                    <div className="text-sm font-medium text-amber-700 dark:text-amber-300 mt-1">Average (50-69%)</div>
                  </div>
                  <div className="group text-center p-5 rounded-xl border border-rose-200 dark:border-rose-700/50 hover:shadow-lg hover:shadow-rose-500/10 transition-all duration-300 bg-muted/50">
                    <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{needsImprovementCount}</div>
                    <div className="text-sm font-medium text-rose-700 dark:text-rose-300 mt-1">Needs Work (&lt;50%)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {achievements.map((achievement) => {
                const IconComponent = achievement.icon;
                return (
                  <Card 
                    key={achievement.id} 
                    className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                      achievement.earned 
                        ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/30 dark:via-yellow-900/20 dark:to-orange-900/30 border-amber-200/80 dark:border-amber-700/50 shadow-lg hover:shadow-xl hover:shadow-amber-500/10' 
                        : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border-slate-200/80 dark:border-slate-700/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                          achievement.earned 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25' 
                            : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600'
                        }`}>
                          <IconComponent className={`h-7 w-7 ${achievement.earned ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                        </div>
                        {achievement.earned && (
                          <Badge className="text-white border-0 rounded-full px-3 py-1 shadow-md bg-primary">
                            <Star className="h-3 w-3 mr-1" />
                            Earned
                          </Badge>
                        )}
                      </div>
                      <h3 className={`font-bold text-lg mb-2 ${achievement.earned ? 'text-amber-900 dark:text-amber-100' : 'text-slate-600 dark:text-slate-400'}`}>
                        {achievement.title}
                      </h3>
                      <p className={`text-sm ${achievement.earned ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}`}>
                        {achievement.description}
                      </p>
                    </CardContent>
                    {achievement.earned && (
                      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] bg-muted/50"></div>
                    )}
                  </Card>
                );
              })}
            </div>

            {earnedAchievements.length > 0 && (
              <Card className="relative overflow-hidden border-amber-200/80 dark:border-amber-700/50 shadow-lg rounded-2xl bg-muted/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25 bg-muted/50">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
                        Your Achievements ({earnedAchievements.length}/{achievements.length})
                      </CardTitle>
                      <CardDescription className="text-amber-700 dark:text-amber-300 mt-0.5">
                        Keep up the great work!
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl p-4 backdrop-blur-sm">
                    <Progress value={(earnedAchievements.length / achievements.length) * 100} className="h-3 mb-3" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You've earned <span className="font-bold">{earnedAchievements.length}</span> out of <span className="font-bold">{achievements.length}</span> available achievements.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm rounded-2xl">
              <CardHeader className="relative text-white rounded-t-2xl px-8 py-6 bg-primary">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <CalendarCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Test History</CardTitle>
                    <CardDescription className="text-white/80 mt-1">
                      Complete record of all your vocabulary test submissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {chartData.length > 0 ? (
                  <div className="space-y-4">
                    {chartData.slice().reverse().map((submission: any, index: number) => (
                      <div 
                        key={submission.id} 
                        className="group flex items-center p-5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/50 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                      >
                        <div className="flex-shrink-0 mr-5">
                          <div className="h-14 w-14 rounded-xl text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/25 transition-transform duration-300 bg-primary">
                            #{chartData.length - index}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-foreground dark:text-foreground truncate">{submission.title}</h4>
                            <Badge className={`${getScoreBadgeColor(submission.score)} rounded-full px-3 py-1 font-medium ml-3`}>
                              {submission.score}%
                            </Badge>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground space-x-4">
                            <div className="flex items-center">
                              <div className="w-7 h-7 rounded-lg bg-muted/60 dark:bg-slate-700 flex items-center justify-center mr-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-400" />
                              </div>
                              <span className="font-medium">{submission.fullDate}</span>
                            </div>
                          </div>
                          <Progress value={submission.score} className="mt-3 h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-muted/50">
                      <Clock className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">
                      No Test History
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
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
    </div>
  );
}