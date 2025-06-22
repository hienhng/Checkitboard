import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UserCheck, UserX, Clock, Users } from "lucide-react";

interface RequestApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestApprovalDialog({ open, onOpenChange }: RequestApprovalDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending join requests
  const { data: pendingRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/join-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/join-requests");
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'approved' | 'rejected' }) => {
      const res = await apiRequest("PATCH", `/api/join-requests/${requestId}`, {
        status: action
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.action === 'approved' ? "Request approved" : "Request rejected",
        description: variables.action === 'approved' 
          ? "Student has been added to the class" 
          : "Join request has been rejected",
      });
      
      // Refresh the requests and classes data
      queryClient.invalidateQueries({ queryKey: ["/api/educator/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error processing request",
        description: error.message || "Failed to process the request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId: number) => {
    handleRequestMutation.mutate({ requestId, action: 'approved' });
  };

  const handleReject = (requestId: number) => {
    handleRequestMutation.mutate({ requestId, action: 'rejected' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Join Requests</DialogTitle>
          <DialogDescription>
            Review and approve or reject student requests to join your classes
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading requests...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
              <p className="text-sm text-gray-500">
                All student join requests have been processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: any) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{request.studentName}</h4>
                        <p className="text-sm text-gray-500">{request.studentEmail}</p>
                        <div className="mt-1">
                          <span className="text-sm text-gray-600">wants to join </span>
                          <span className="text-sm font-medium text-blue-600">{request.class?.name || 'Unknown Class'}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Requested: {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                          disabled={handleRequestMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={handleRequestMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface RequestApprovalButtonProps {
  requestCount?: number;
}

export function RequestApprovalButton({ requestCount = 0 }: RequestApprovalButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={requestCount > 0 ? "default" : "outline"}
        onClick={() => setOpen(true)}
        className="relative"
      >
        <UserCheck className="h-4 w-4 mr-2" />
        Join Requests
        {requestCount > 0 && (
          <Badge variant="secondary" className="ml-2 bg-red-500 text-white">
            {requestCount}
          </Badge>
        )}
      </Button>
      
      <RequestApprovalDialog open={open} onOpenChange={setOpen} />
    </>
  );
}