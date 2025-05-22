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
  ResponsiveContainer
} from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  LineChart as LineChartIcon,
  Calendar,
  CheckCircle,
  CalendarCheck
} from "lucide-react";

export default function LearnerAnalysis() {
  const { toast } = useToast();
  
  // Get all completed submissions for the current student
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/learner/results"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Process the data for the line chart
  const chartData = (submissions as any[])
    .map((submission: any) => ({
      date: format(new Date(submission.submittedAt), 'MMM dd'),
      fullDate: format(new Date(submission.submittedAt), 'PPP'),
      score: submission.score,
      title: submission.list.title,
      id: submission.id,
      timestamp: new Date(submission.submittedAt).getTime() // for sorting
    }))
    .sort((a: any, b: any) => a.timestamp - b.timestamp); // Sort by date

  // Calculate overall statistics
  const avgScore = chartData.length > 0 
    ? Math.round(chartData.reduce((sum: number, item: any) => sum + item.score, 0) / chartData.length) 
    : 0;
  
  const totalSubmissions = chartData.length;
  
  // Get the first and last submission dates if available
  const firstSubmission = chartData.length > 0 ? chartData[0].fullDate : "No submissions yet";
  const lastSubmission = chartData.length > 0 ? chartData[chartData.length - 1].fullDate : "No submissions yet";

  // Function to determine badge color based on score
  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 70) return "bg-blue-100 text-blue-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-5xl font-bold tracking-tight"><span className="text-black transition duration-300 ease-in-out hover:text-green-500">Progress</span> Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Track your vocabulary learning progress over time
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading your progress data...</div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgScore}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all your vocabulary check-ups
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSubmissions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vocabulary check-ups completed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Submission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-md font-bold">{lastSubmission}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From your first submission on {firstSubmission}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          <Card className="mb-6">
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
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        label={{ 
                          value: 'Submission Date', 
                          position: 'insideBottomRight', 
                          offset: -10 
                        }} 
                      />
                      <YAxis
                        domain={[0, 100]}
                        label={{ 
                          value: 'Score (%)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' } 
                        }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, 'Score']}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ borderRadius: '8px' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  You haven't completed any vocabulary check-ups yet.
                  Once you complete some, your progress will be shown here.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarCheck className="mr-2 h-5 w-5 text-primary" />
                Submission History
              </CardTitle>
              <CardDescription>
                Detailed record of all your vocabulary check-up submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {chartData.slice().reverse().map((submission: any) => (
                    <div key={submission.id} className="py-4 flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{submission.title}</h4>
                          <Badge className={getScoreBadgeColor(submission.score)}>
                            {submission.score}% Score
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          Submitted on {submission.fullDate}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  No submission history available.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}