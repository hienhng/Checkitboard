import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  Clock,
  Filter,
  MailOpen,
  Trash2,
  BookOpen,
  Users,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Type definition for a notification
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  category: string;
  relatedId?: number;
  createdAt: string;
}

interface NotificationCenterProps {
  onOpenChange?: (open: boolean) => void;
}

export function NotificationCenter({ onOpenChange }: NotificationCenterProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Notify parent when open state changes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // Query to get unread notification count
  const countQuery = useQuery({
    queryKey: ["/api/notifications/count"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/count");
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return 0 count
          return { count: 0 };
        }
        throw new Error("Failed to fetch notification count");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Query to get notifications with optional category filter
  const notificationsQuery = useQuery({
    queryKey: ["/api/notifications", activeTab],
    queryFn: async () => {
      const url = activeTab === "all" 
        ? "/api/notifications" 
        : `/api/notifications?category=${activeTab}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return empty array
          return [];
        }
        throw new Error("Failed to fetch notifications");
      }
      return response.json() as Promise<Notification[]>;
    },
    enabled: isOpen, // Only fetch when popover is open
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('401') || error?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Mutation to mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async (category?: string) => {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to render the icon based on notification category
  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case "class":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "submission":
        return <BookOpen className="h-4 w-4 text-green-500" />;
      case "system":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {(countQuery.data?.count || 0) > 0 && (
            <Badge
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs"
              variant="destructive"
            >
              {countQuery.data?.count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate(activeTab !== "all" ? activeTab : undefined)}
              disabled={markAllAsReadMutation.isPending}
              title="Mark all as read"
            >
              <MailOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between px-4 pt-2">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="class">Class</TabsTrigger>
              <TabsTrigger value="submission">Submission</TabsTrigger>
            </TabsList>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>

          <TabsContent value="all" className="m-0">
            <NotificationList
              notifications={notificationsQuery.data || []}
              isLoading={notificationsQuery.isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onDelete={(id) => deleteNotificationMutation.mutate(id)}
              renderCategoryIcon={renderCategoryIcon}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="class" className="m-0">
            <NotificationList
              notifications={notificationsQuery.data || []}
              isLoading={notificationsQuery.isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onDelete={(id) => deleteNotificationMutation.mutate(id)}
              renderCategoryIcon={renderCategoryIcon}
              formatDate={formatDate}
            />
          </TabsContent>

          <TabsContent value="submission" className="m-0">
            <NotificationList
              notifications={notificationsQuery.data || []}
              isLoading={notificationsQuery.isLoading}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onDelete={(id) => deleteNotificationMutation.mutate(id)}
              renderCategoryIcon={renderCategoryIcon}
              formatDate={formatDate}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  renderCategoryIcon: (category: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
}

function NotificationList({
  notifications,
  isLoading,
  onMarkAsRead,
  onDelete,
  renderCategoryIcon,
  formatDate,
}: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 h-64">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64 text-center">
        <Bell className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="p-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`mb-2 p-3 text-sm ${
              notification.read ? "bg-muted/30" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {renderCategoryIcon(notification.category)}
                </div>
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(notification.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onMarkAsRead(notification.id)}
                    title="Mark as read"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => onDelete(notification.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}