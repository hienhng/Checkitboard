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
import { User, Eye, EyeOff, Mail, Phone, Calendar, HelpCircle, Settings as SettingsIcon, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/workspace-ui";
import type { User as AppUser } from "@shared/schema";

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

type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type HelpForm = z.infer<typeof helpSchema>;

export function SettingsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  // Get user data
  const { data: user, isLoading } = useQuery<Pick<AppUser, "id" | "name" | "email" | "role" | "profilePicture">>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "throw" }),
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



  // Handle profile picture upload
  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Base64 encoding must fit within the API request limit.
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select an image of 2 MB or smaller",
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



  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <SettingsIcon className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-neutral-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="mx-auto max-w-4xl space-y-7">
        <PageHeader eyebrow="Make yourself at home" title="Your account, your way." description="A few personal touches, a little peace of mind. Keep your details and preferences up to date." />

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
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
                      JPG, PNG or GIF. Max size 2 MB.
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
                        <Input value={user?.email} disabled className="bg-muted/60" />
                        <p className="text-sm text-neutral-medium mt-1">
                          Email cannot be changed
                        </p>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Input value={user?.role} disabled className="bg-muted/60" />
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



          {/* Help Tab */}
          <TabsContent value="help">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardDescription className="text-3xl text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    How to Use <span className="font-semibold">checkit</span>
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
                <CardDescription className ="text-3xl text-black">About <span className="font-semibold">checkit</span></CardDescription>
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
                    Thank you for using <span className="font-semibold">checkit</span>! We're committed to making vocabulary learning
                    engaging and effective for educators and students alike.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}
