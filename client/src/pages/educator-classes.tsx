import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  School, 
  Users, 
  BookOpen, 
  Plus,
  Settings,
  Eye,
  UserPlus
} from "lucide-react";

import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { ClassManagement, CreateClassDialog } from "@/components/class-management";
import { useToast } from "@/hooks/use-toast";

function EducatorClasses() {
  const { toast } = useToast();


  // Fetch educator's classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch statistics for preview
  const { data: stats } = useQuery({
    queryKey: ["/api/educator/statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/statistics");
      return response.json();
    },
  });

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/educator/statistics"] });
    toast({
      title: "Class created",
      description: "Your new class has been created successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-green-400/5 to-transparent"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h1 className="text-6xl font-bold text-foreground">
                Manage Your{" "}
                <span className="font-brand font-semibold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  Classes
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Create, organize, and monitor your classroom communities with powerful management tools
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
        
        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <School className="mx-auto h-10 w-10 text-green-600 mb-3" />
              <div className="text-2xl font-bold text-green-700">
                {stats?.totalClasses || 0}
              </div>
              <p className="text-sm text-green-600 font-medium">Total Classes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <Users className="mx-auto h-10 w-10 text-blue-600 mb-3" />
              <div className="text-2xl font-bold text-blue-700">
                {stats?.totalStudents || 0}
              </div>
              <p className="text-sm text-blue-600 font-medium">Total Students</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-purple-600 mb-3" />
              <div className="text-2xl font-bold text-purple-700">
                {stats?.totalLists || 0}
              </div>
              <p className="text-sm text-purple-600 font-medium">Vocabulary Lists</p>
            </CardContent>
          </Card>
        </div>

        {/* Class Management Section */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl font-bold">
                    <School className="inline mr-3 h-6 w-6" />
                    Class Management
                  </CardTitle>
                  <CardDescription className="text-green-100 text-base mt-2">
                    Create and manage your educational communities with advanced administration tools
                  </CardDescription>
                </div>
                <CreateClassDialog 
                  onClassCreated={handleCreateSuccess}
                  trigger={
                    <Button 
                      className="bg-white text-green-600 hover:bg-green-50"
                      size="lg"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Create New Class
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ClassManagement />
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}

export default EducatorClasses;