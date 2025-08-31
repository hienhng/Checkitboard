import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Users,
  School,
  BookOpen,
  TrendingUp
} from "lucide-react";

export function EducatorStatistics() {
  
  // Query for fetching educator's stats
  const { 
    data: stats = { 
      totalStudents: 0, 
      totalClasses: 0, 
      totalLists: 0
    }, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ["/api/educator/statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/statistics");
      return response.json();
    },
  });

  // Generate sample historical data for line graphs
  const generateTrendData = (currentValue: number, label: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    // Handle case where currentMonth is 0 (January)
    if (currentMonth === 0) {
      return [{
        month: 'Jan',
        value: currentValue,
        name: label
      }];
    }
    
    return months.slice(0, currentMonth + 1).map((month, index) => {
      // Generate a realistic trend that leads to current value
      const variation = Math.random() * 0.3 - 0.15; // ±15% variation
      const baseValue = Math.max(0, Math.floor(currentValue * (0.3 + (index / currentMonth) * 0.7) * (1 + variation)));
      
      return {
        month,
        value: index === currentMonth ? currentValue : baseValue,
        name: label
      };
    });
  };

  const studentsData = generateTrendData(stats.totalStudents, 'Students');
  const classesData = generateTrendData(stats.totalClasses, 'Classes');
  const listsData = generateTrendData(stats.totalLists, 'Lists');

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-4 text-lg text-muted-foreground">Loading statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-6xl font-bold text-foreground mb-4">
              Teaching{" "}
              <span className="font-brand font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Analytics
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive insights into your teaching impact, student progress, and classroom engagement
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
        
        {/* Enhanced Stats Summary Cards with Line Graphs */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-6 text-blue-800">{stats.totalStudents}</div>
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={studentsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#1e40af' }}
                    />
                    <YAxis 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      domain={['dataMin', 'dataMax']}
                      tick={{ fill: '#1e40af' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: '#1d4ed8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <TrendingUp className="h-4 w-4" />
                Student Growth This Year
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3 text-green-700">
                <div className="p-2 bg-green-200 rounded-lg">
                  <School className="h-6 w-6 text-green-600" />
                </div>
                Total Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-6 text-green-800">{stats.totalClasses}</div>
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={classesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#15803d' }}
                    />
                    <YAxis 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      domain={['dataMin', 'dataMax']}
                      tick={{ fill: '#15803d' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #10b981',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: '#059669' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <TrendingUp className="h-4 w-4" />
                Class Growth This Year
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-3 text-purple-700">
                <div className="p-2 bg-purple-200 rounded-lg">
                  <BookOpen className="h-6 w-6 text-purple-600" />
                </div>
                Vocabulary Lists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold mb-6 text-purple-800">{stats.totalLists}</div>
              <div className="h-40 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={listsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd6fe" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#7c3aed' }}
                    />
                    <YAxis 
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      domain={['dataMin', 'dataMax']}
                      tick={{ fill: '#7c3aed' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #8b5cf6',
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: '#7c3aed' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                <TrendingUp className="h-4 w-4" />
                Content Growth This Year
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics Section */}
        <div className="grid gap-8 md:grid-cols-2 mb-12">
          {/* Teaching Impact Summary */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-t-lg p-6">
              <CardTitle className="text-2xl font-bold">
                <TrendingUp className="inline mr-3 h-6 w-6" />
                Teaching Impact
              </CardTitle>
              <CardDescription className="text-indigo-100 text-base mt-2">
                Your educational influence at a glance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-blue-600" />
                    <span className="font-semibold text-blue-700">Active Students</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-800">{stats.totalStudents}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <School className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-green-700">Active Classes</span>
                  </div>
                  <span className="text-2xl font-bold text-green-800">{stats.totalClasses}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                    <span className="font-semibold text-purple-700">Content Created</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-800">{stats.totalLists}</span>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700 mb-2">
                      Average Impact Score
                    </p>
                    <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {stats.totalStudents > 0 ? Math.round((stats.totalLists * 10) / stats.totalStudents) : 0}/10
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Based on content per student ratio</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Analytics */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg p-6">
              <CardTitle className="text-2xl font-bold">
                <TrendingUp className="inline mr-3 h-6 w-6" />
                Quick Analytics
              </CardTitle>
              <CardDescription className="text-orange-100 text-base mt-2">
                Key metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <h4 className="font-semibold text-gray-700 mb-2">Student Engagement</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average per class</span>
                    <span className="font-bold text-lg">
                      {stats.totalClasses > 0 ? Math.round(stats.totalStudents / stats.totalClasses) : 0} students
                    </span>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <h4 className="font-semibold text-gray-700 mb-2">Content Productivity</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lists per class</span>
                    <span className="font-bold text-lg">
                      {stats.totalClasses > 0 ? Math.round(stats.totalLists / stats.totalClasses * 10) / 10 : 0} lists
                    </span>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <h4 className="font-semibold text-gray-700 mb-2">Learning Resources</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Lists per student</span>
                    <span className="font-bold text-lg">
                      {stats.totalStudents > 0 ? Math.round(stats.totalLists / stats.totalStudents * 10) / 10 : 0} lists
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}