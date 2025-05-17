import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface StudentProgressChartProps {
  studentId: number;
  studentName: string;
  classId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface SubmissionData {
  id: number;
  listTitle: string;
  score: number;
  submittedAt: string;
  date: string; // Formatted date for display
}

export function StudentProgressChart({ 
  studentId, 
  studentName, 
  classId, 
  isOpen,
  onClose
}: StudentProgressChartProps) {
  const [submissionData, setSubmissionData] = useState<SubmissionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Function to fetch student progress data
  const fetchStudentProgressMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "GET", 
        `/api/educator/students/${studentId}/progress?classId=${classId}`
      );
      return response.json();
    },
    onSuccess: (data) => {
      // Process the data returned from the API
      let formattedData = [];
      
      if (Array.isArray(data)) {
        // Handle the case where the API returns an array directly
        formattedData = data;
      } else if (data && data.submissions && Array.isArray(data.submissions)) {
        // Handle the case where the API returns an object with a submissions array
        formattedData = data.submissions;
      } else {
        console.error("Unexpected data format from API:", data);
        setError("Received unexpected data format from server");
      }
      
      // Make sure dates are properly handled 
      formattedData = formattedData.map(item => ({
        ...item,
        date: item.date || (item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Unknown date')
      }));
      
      // Sort by date ascending
      formattedData.sort((a: SubmissionData, b: SubmissionData) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      });
      
      setSubmissionData(formattedData);
      setIsLoading(false);
    },
    onError: (error: Error) => {
      console.error("Error fetching student progress:", error);
      setError("Failed to load student progress data");
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load student progress data",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (isOpen && studentId && classId) {
      setIsLoading(true);
      setError(null);
      fetchStudentProgressMutation.mutate();
    }
  }, [isOpen, studentId, classId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background p-3 border rounded-md shadow-md">
          <p className="font-medium">{data.listTitle}</p>
          <p className="text-sm">Date: {formatDate(data.submittedAt)}</p>
          <p className="text-sm font-semibold">Score: {data.score}%</p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Progress for {studentName}</DialogTitle>
          <DialogDescription>
            Tracking vocabulary checkup scores over time
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading progress data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => fetchStudentProgressMutation.mutate()}
            >
              Try Again
            </Button>
          </div>
        ) : submissionData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No submission data available for this student.
            </p>
            <p className="text-sm mt-2">
              Progress will appear once the student completes vocabulary checkups.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={submissionData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
                      position: 'insideLeft' 
                    }}
                  />
                  <Tooltip content={renderTooltip} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Checkup Score"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Score Details</h3>
              <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
                {submissionData.map((item) => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.listTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.submittedAt)}
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${
                        item.score >= 80
                          ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300"
                          : item.score >= 60
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300"
                          : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300"
                      }`}
                    >
                      {item.score}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}