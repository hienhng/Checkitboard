import { useState, useEffect } from "react";
import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { User, Eye, EyeOff, Mail, Phone, Calendar, HelpCircle, Settings as SettingsIcon, Upload, GraduationCap, Bell, Download, Upload as UploadIcon, Copy, Trash2, Edit, Users } from "lucide-react";
import { useLocation } from "wouter";

// Form schemas
const personalInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  profilePicture: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const helpSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

const classSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  autoApproveRequests: z.boolean().default(false),
  allowStudentSelfEnroll: z.boolean().default(true),
  defaultDueDate: z.number().min(1).max(30).default(7), // days
  gradeVisibility: z.enum(["immediate", "afterDue", "manual"]).default("immediate"),
  allowRedos: z.boolean().default(true),
  maxRedoAttempts: z.number().min(1).max(10).default(3),
});

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type HelpForm = z.infer<typeof helpSchema>;
type ClassSettingsForm = z.infer<typeof classSettingsSchema>;

export function SettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showClassDeleteDialog, setShowClassDeleteDialog] = useState(false);
  const [classToDelete, setClassToDelete] = useState<any>(null);

  // Get user data
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Get educator's classes (only for educators)
  const { data: educatorClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
    enabled: user?.role === "educator",
  });

  // Get class settings (this would need to be implemented in backend)
  const { data: classSettings } = useQuery({
    queryKey: ["/api/educator/settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/settings");
      return response.json();
    },
    enabled: user?.role === "educator",
  });

  // Personal Info Form
  const personalInfoForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: user?.name || "",
      profilePicture: user?.profilePicture || "",
    },
  });

  // Update form defaults when user data loads
  React.useEffect(() => {
    if (user) {
      personalInfoForm.reset({
        name: user.name || "",
        profilePicture: user.profilePicture || "",
      });
      setProfilePicture(user.profilePicture || null);
    }
  }, [user, personalInfoForm]);

  // Password Form
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Help Form
  const helpForm = useForm<HelpForm>({
    resolver: zodResolver(helpSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  // Class Settings Form (only for educators)
  const classSettingsForm = useForm<ClassSettingsForm>({
    resolver: zodResolver(classSettingsSchema),
    defaultValues: {
      emailNotifications: classSettings?.emailNotifications ?? true,
      autoApproveRequests: classSettings?.autoApproveRequests ?? false,
      allowStudentSelfEnroll: classSettings?.allowStudentSelfEnroll ?? true,
      defaultDueDate: classSettings?.defaultDueDate ?? 7,
      gradeVisibility: classSettings?.gradeVisibility ?? "immediate",
      allowRedos: classSettings?.allowRedos ?? true,
      maxRedoAttempts: classSettings?.maxRedoAttempts ?? 3,
    },
  });

  // Update form defaults when settings load
  React.useEffect(() => {
    if (classSettings) {
      classSettingsForm.reset({
        emailNotifications: classSettings.emailNotifications ?? true,
        autoApproveRequests: classSettings.autoApproveRequests ?? false,
        allowStudentSelfEnroll: classSettings.allowStudentSelfEnroll ?? true,
        defaultDueDate: classSettings.defaultDueDate ?? 7,
        gradeVisibility: classSettings.gradeVisibility ?? "immediate",
        allowRedos: classSettings.allowRedos ?? true,
        maxRedoAttempts: classSettings.maxRedoAttempts ?? 3,
      });
    }
  }, [classSettings, classSettingsForm]);

  // Update personal info mutation
  const updatePersonalInfoMutation = useMutation({
    mutationFn: async (data: PersonalInfoForm) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your personal information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error changing password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send help message mutation
  const sendHelpMutation = useMutation({
    mutationFn: async (data: HelpForm) => {
      const res = await apiRequest("POST", "/api/help/contact", data);
      return res.json();
    },
    onSuccess: () => {
      helpForm.reset();
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully. We'll get back to you soon!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/auth");
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error logging out",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update class settings mutation
  const updateClassSettingsMutation = useMutation({
    mutationFn: async (data: ClassSettingsForm) => {
      const res = await apiRequest("PATCH", "/api/educator/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your class management settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const res = await apiRequest("DELETE", `/api/classes/${classId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class and all associated data have been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
      setShowClassDeleteDialog(false);
      setClassToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting class",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle profile picture upload
  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB = 10 * 1024 * 1024 bytes)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        // Clear the file input
        event.target.value = '';
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (JPG, PNG, or GIF)",
          variant: "destructive",
        });
        // Clear the file input
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfilePicture(result);
        personalInfoForm.setValue("profilePicture", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onPersonalInfoSubmit = (data: PersonalInfoForm) => {
    updatePersonalInfoMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  const onHelpSubmit = (data: HelpForm) => {
    sendHelpMutation.mutate(data);
  };

  const onClassSettingsSubmit = (data: ClassSettingsForm) => {
    updateClassSettingsMutation.mutate(data);
  };

  const handleDeleteClass = (classData: any) => {
    setClassToDelete(classData);
    setShowClassDeleteDialog(true);
  };

  const confirmDeleteClass = () => {
    if (classToDelete) {
      deleteClassMutation.mutate(classToDelete.id);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <SettingsIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-neutral-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-dark mb-2">Settings</h1>
          <p className="text-neutral-medium">Manage your account preferences and profile information</p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className={`grid w-full ${user?.role === "educator" ? "grid-cols-5" : "grid-cols-4"}`}>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            {user?.role === "educator" && (
              <TabsTrigger value="classes">Class Management</TabsTrigger>
            )}
            <TabsTrigger value="help">Help</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your profile information and manage your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicture || user?.profilePicture || undefined} />
                    <AvatarFallback className="text-lg">
                      {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Label htmlFor="profile-picture" className="cursor-pointer">
                      <Button variant="outline" className="relative overflow-hidden">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Picture
                        <Input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleProfilePictureUpload}
                        />
                      </Button>
                    </Label>
                    <p className="text-sm text-neutral-medium mt-1">
                      JPG, PNG or GIF. Max size 10MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Personal Info Form */}
                <Form {...personalInfoForm}>
                  <form onSubmit={personalInfoForm.handleSubmit(onPersonalInfoSubmit)} className="space-y-4">
                    <FormField
                      control={personalInfoForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input value={user?.email} disabled className="bg-gray-50" />
                        <p className="text-sm text-neutral-medium mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Input value={user?.role} disabled className="bg-gray-50" />
                        <p className="text-sm text-neutral-medium mt-1">
                          Role is assigned by administrator
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                      >
                        {logoutMutation.isPending ? "Logging out..." : "Log Out"}
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePersonalInfoMutation.isPending}
                      >
                        {updatePersonalInfoMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter your current password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your new password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={changePasswordMutation.isPending}
                        className="w-full"
                      >
                        {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class Management Tab - Only for Educators */}
          {user?.role === "educator" && (
            <TabsContent value="classes">
              <div className="space-y-6">
                {/* Class Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Class Management Settings
                    </CardTitle>
                    <CardDescription>
                      Configure default settings for your classes and teaching preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...classSettingsForm}>
                      <form onSubmit={classSettingsForm.handleSubmit(onClassSettingsSubmit)} className="space-y-6">
                        {/* Notification Settings */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-neutral-dark">Notification Preferences</h4>
                          
                          <FormField
                            control={classSettingsForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center gap-2">
                                    <Bell className="h-4 w-4" />
                                    Email Notifications
                                  </FormLabel>
                                  <div className="text-sm text-neutral-medium">
                                    Receive email notifications for new submissions and join requests
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        {/* Class Enrollment Settings */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-neutral-dark">Class Enrollment</h4>
                          
                          <FormField
                            control={classSettingsForm.control}
                            name="autoApproveRequests"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Auto-approve Join Requests</FormLabel>
                                  <div className="text-sm text-neutral-medium">
                                    Automatically approve student requests to join your classes
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={classSettingsForm.control}
                            name="allowStudentSelfEnroll"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Allow Self-Enrollment</FormLabel>
                                  <div className="text-sm text-neutral-medium">
                                    Allow students to join classes using class codes
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        {/* Assignment Settings */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-neutral-dark">Assignment Defaults</h4>
                          
                          <FormField
                            control={classSettingsForm.control}
                            name="defaultDueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Due Date (Days)</FormLabel>
                                <FormControl>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="number"
                                      min={1}
                                      max={30}
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 7)}
                                      className="w-24"
                                    />
                                    <span className="text-sm text-neutral-medium">days from assignment</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={classSettingsForm.control}
                            name="gradeVisibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Grade Visibility</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select when grades are visible" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="immediate">Immediate (after submission)</SelectItem>
                                    <SelectItem value="afterDue">After due date</SelectItem>
                                    <SelectItem value="manual">Manual release only</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        {/* Redo Settings */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold text-neutral-dark">Redo Policies</h4>
                          
                          <FormField
                            control={classSettingsForm.control}
                            name="allowRedos"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Allow Retakes</FormLabel>
                                  <div className="text-sm text-neutral-medium">
                                    Allow students to retake vocabulary assessments
                                  </div>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {classSettingsForm.watch("allowRedos") && (
                            <FormField
                              control={classSettingsForm.control}
                              name="maxRedoAttempts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Maximum Retake Attempts</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={10}
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
                                        className="w-24"
                                      />
                                      <span className="text-sm text-neutral-medium">attempts per assignment</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="pt-4">
                          <Button
                            type="submit"
                            disabled={updateClassSettingsMutation.isPending}
                            className="w-full"
                          >
                            {updateClassSettingsMutation.isPending ? "Saving Settings..." : "Save Settings"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Class Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Your Classes
                    </CardTitle>
                    <CardDescription>
                      Manage your existing classes and view class details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p>Loading classes...</p>
                      </div>
                    ) : educatorClasses.length === 0 ? (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 mx-auto text-neutral-medium mb-4" />
                        <p className="text-neutral-medium">No classes created yet</p>
                        <p className="text-sm text-neutral-medium mt-2">
                          Create your first class from the educator dashboard
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Class Name</TableHead>
                              <TableHead>Class Code</TableHead>
                              <TableHead>Students</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {educatorClasses.map((classItem: any) => (
                              <TableRow key={classItem.id}>
                                <TableCell className="font-medium">{classItem.name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                      {classItem.classCode}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        navigator.clipboard.writeText(classItem.classCode);
                                        toast({
                                          title: "Copied!",
                                          description: "Class code copied to clipboard",
                                        });
                                      }}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell>{classItem.studentCount || 0}</TableCell>
                                <TableCell>
                                  <Badge variant={classItem.active ? "default" : "secondary"}>
                                    {classItem.active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(classItem.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setLocation(`/educator/dashboard`)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteClass(classItem)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Data Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Data Management
                    </CardTitle>
                    <CardDescription>
                      Export class data and manage bulk operations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => {
                          toast({
                            title: "Export Started",
                            description: "Your class data export will be ready shortly.",
                          });
                        }}
                      >
                        <Download className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-medium">Export Class Data</div>
                          <div className="text-sm text-neutral-medium">
                            Download student progress and submissions
                          </div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-center gap-2"
                        onClick={() => {
                          toast({
                            title: "Feature Coming Soon",
                            description: "Bulk import functionality will be available in a future update.",
                          });
                        }}
                      >
                        <UploadIcon className="h-6 w-6" />
                        <div className="text-center">
                          <div className="font-medium">Import Student Data</div>
                          <div className="text-sm text-neutral-medium">
                            Bulk upload students from CSV
                          </div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Help Tab */}
          <TabsContent value="help">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardDescription className="text-3xl text-black flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    How to Use <span className = "font-modak mt-2">checkit</span>
                  </CardDescription>
                  <CardDescription>
                    Learn the basics of using our vocabulary learning platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">For Educators:</h4>
                      <ul className="space-y-1 text-sm text-neutral-medium pl-4">
                        <li>• Create classes and invite students using class codes</li>
                        <li>• Build vocabulary lists with passages and words</li>
                        <li>• Publish lists for students to practice</li>
                        <li>• Grade submissions and provide feedback</li>
                        <li>• Monitor student progress and performance</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">For Learners:</h4>
                      <ul className="space-y-1 text-sm text-neutral-medium pl-4">
                        <li>• Join classes using class codes from your educator</li>
                        <li>• Complete vocabulary check-ups and define words</li>
                        <li>• Review your results and learn from mistakes</li>
                        <li>• Use flashcards to practice vocabulary</li>
                        <li>• Track your progress across different lists</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>
                    Have a question or need help? Send us a message and we'll get back to you soon!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...helpForm}>
                    <form onSubmit={helpForm.handleSubmit(onHelpSubmit)} className="space-y-4">
                      <FormField
                        control={helpForm.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="What's your question about?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={helpForm.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Please describe your question or issue in detail..."
                                className="min-h-[120px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        disabled={sendHelpMutation.isPending}
                        className="w-full"
                      >
                        {sendHelpMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardDescription className ="text-3xl text-black">About <span className = "font-modak">checkit</span></CardDescription>
                <CardDescription>
                  Information about the platform and developer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">Platform Information</h4>
                      <div className="space-y-2 text-sm text-neutral-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Released: May 2025</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Version:</span>
                          <span>1.0.0</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">Developer Contact</h4>
                      <div className="space-y-2 text-sm text-neutral-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <a 
                            href="mailto:giahienhn@gmail.com" 
                            className="text-blue-600 hover:underline"
                          >
                            giahienhn@gmail.com
                          </a>
                          <a
                            href="https://www.facebook.com/hn.giahien/"
                            className = "text-blue-600 hover:underline"
                           >Facebook profile
                          </a> 
                          
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>Available via email</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">Features</h4>
                      <ul className="space-y-1 text-sm text-neutral-medium">
                        <li>• AI-powered vocabulary analysis</li>
                        <li>• Interactive learning experiences</li>
                        <li>• Real-time progress tracking</li>
                        <li>• Class management system</li>
                        <li>• Email notifications</li>
                        <li>• Responsive design</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">Technologies</h4>
                      <ul className="space-y-1 text-sm text-neutral-medium">
                        <li>• React & TypeScript</li>
                        <li>• Node.js & Express</li>
                        <li>• PostgreSQL Database</li>
                        <li>• OpenAI Integration</li>
                        <li>• Tailwind CSS</li>
                        <li>• Drizzle ORM</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-center py-4">
                  <p className="text-sm text-neutral-medium">
                    Thank you for using <span className = "font-modak">checkit</span>! We're committed to making vocabulary learning 
                    engaging and effective for educators and students alike.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Class Confirmation Dialog */}
        <Dialog open={showClassDeleteDialog} onOpenChange={setShowClassDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Class</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the class "{classToDelete?.name}"? This action cannot be undone and will permanently remove all associated data including:
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-neutral-medium">
                <li>All vocabulary lists created for this class</li>
                <li>Student submissions and progress data</li>
                <li>Class enrollment records</li>
                <li>Any associated notifications</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowClassDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteClass}
                disabled={deleteClassMutation.isPending}
              >
                {deleteClassMutation.isPending ? "Deleting..." : "Delete Class"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}