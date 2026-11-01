import { PageHeader, StatCard, EmptyState } from "@/components/workspace-ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PassageEditor } from "@/components/passage-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  BookOpen,
  CheckCircle,
  Clock,
  CalendarDays,
  ClipboardList,
  ArrowRight,
  BarChart,
  User,
  Users,
  School,
  FileText,
} from "lucide-react";

import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { VocabularyList } from "@shared/schema";
import { formatDate, formatDueDate } from "@/lib/utils";
import { GradingPanel } from "@/components/grading-panel";

import { RequestApprovalButton } from "@/components/request-approval";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function EducatorDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showCreateList, setShowCreateList] = useState(() => new URLSearchParams(window.location.search).has("create"));
  const [showGrading, setShowGrading] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    number | null
  >(null);

  // Fetch educator's vocabulary lists
  const { data: vocabularyLists = [], isLoading: listsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/educator/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch pending submissions for grading
  const { data: pendingSubmissions = [], isLoading: submissionsLoading } =
    useQuery<any[]>({
      queryKey: ["/api/educator/submissions"],
      queryFn: getQueryFn({ on401: "throw" }),
    });

  // Fetch educator's classes for filter dropdown
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

  // Mutation to publish/unpublish a vocabulary list
  const publishMutation = useMutation({
    mutationFn: async ({
      id,
      published,
      classId,
    }: {
      id: number;
      published: boolean;
      classId?: number;
    }) => {
      // Preserve the existing class assignment when publishing/unpublishing
      const payload: any = { published };
      if (classId !== undefined) {
        payload.classId = classId;
      }

      const res = await apiRequest(
        "PATCH",
        `/api/vocabulary-lists/${id}`,
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/educator/vocabulary-lists"],
      });
      toast({
        title: "List updated",
        description:
          "The vocabulary list status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublishToggle = (id: number, currentStatus: boolean) => {
    // Find the list to get its current class assignment
    const list = vocabularyLists.find((l) => l.id === id);
    const classId = list?.classId || list?.class?.id;

    publishMutation.mutate({
      id,
      published: !currentStatus,
      classId: classId,
    });
  };

  const handleCreateSuccess = (list: { id: number }, continueToPublishing: boolean) => {
    setShowCreateList(false);
    queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
    queryClient.invalidateQueries({ queryKey: ["/api/educator/statistics"] });
    toast({
      title: "Checkup saved as a draft",
      description: continueToPublishing ? "Your grid-in questions are ready. Choose classes and publish when you’re ready." : "Grid-in questions are included automatically. You can publish from your assignments.",
    });
    if (continueToPublishing) navigate(`/educator/publish/${list.id}`);
  };

  const handleGradingComplete = () => {
    setShowGrading(false);
    setSelectedSubmissionId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/educator/submissions"] });
    toast({
      title: "Grading completed",
      description:
        "The submission has been graded successfully and parents have been notified.",
    });
  };

  // Fetch educator statistics for preview
  const { data: stats } = useQuery({
    queryKey: ["/api/educator/statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/statistics");
      return response.json();
    },
  });

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="Your teaching workspace" title={showCreateList ? "Create a checkup" : `Good to see you${user?.name ? ", " + user.name.split(" ")[0] : ""}.`} description={showCreateList ? "Build your checkup one step at a time. Grid-in questions are included and assessed by AI." : "A clear view of your classes, your content, and what comes next."} actions={!showCreateList && <Button onClick={() => setShowCreateList(true)}><PlusCircle />Create a checkup</Button>} />
      {showCreateList ? <Card><CardHeader className="border-b"><div className="section-heading"><div><CardTitle>Your checkup draft</CardTitle><CardDescription className="mt-1">Details, reading material, and vocabulary — one step at a time.</CardDescription></div><Button variant="outline" onClick={() => setShowCreateList(false)}>Back to overview</Button></div></CardHeader><CardContent className="p-0"><PassageEditor onSuccess={handleCreateSuccess} /></CardContent></Card>
      : showGrading && selectedSubmissionId ? <Card><CardHeader className="border-b"><div className="section-heading"><div><CardTitle>Review submission</CardTitle><CardDescription className="mt-1">A little feedback can make a big difference.</CardDescription></div><Button variant="outline" onClick={() => { setShowGrading(false); setSelectedSubmissionId(null); }}>Back to overview</Button></div></CardHeader><CardContent className="pt-6"><GradingPanel submissionId={selectedSubmissionId} onComplete={handleGradingComplete} /></CardContent></Card>
      : <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
          <StatCard label="Students" value={stats?.totalStudents ?? "—"} icon={Users} detail="Across your classrooms" loading={!stats} />
          <StatCard label="Classes" value={stats?.totalClasses ?? "—"} icon={School} tone="green" detail="Spaces for learning" loading={!stats} />
          <StatCard label="Vocabulary lists" value={stats?.totalLists ?? "—"} icon={BookOpen} detail="Created by you" loading={!stats} />
          <StatCard label="Awaiting review" value={pendingSubmissions.filter(s => !s.gradedAt).length} icon={ClipboardList} tone="amber" detail="Ready for your feedback" loading={submissionsLoading} />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <Card><CardHeader><div className="section-heading"><div><CardTitle>Recent vocabulary lists</CardTitle><CardDescription className="mt-1">Your latest ideas, ready to grow.</CardDescription></div><Button variant="ghost" size="sm" asChild><Link to="/educator/assignments">View all<ArrowRight /></Link></Button></div></CardHeader><CardContent>
              {listsLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div> : vocabularyLists.length ? <div className="divide-y">{vocabularyLists.slice(0, 5).map(list => <div key={list.id} className="flex items-start gap-3 py-4 first:pt-1 last:pb-0"><span className="icon-container mt-0.5"><BookOpen className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><Link to={`/educator/vocabulary/${list.id}`} className="block text-sm font-semibold leading-6 hover:text-primary">{list.title}</Link><p className="mt-1 text-xs leading-5 text-muted-foreground">{list.class?.name || "Not assigned to a class"} <span className="mx-1.5">·</span> {formatDueDate(list.dueDate)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={list.published ? "success" : "secondary"}>{list.published ? "Published" : "Draft"}</Badge><Badge variant="outline">{list.type === "test" ? "Test" : "Practice"}</Badge></div></div><Button variant="ghost" size="icon" asChild><Link to={`/educator/vocabulary/${list.id}`} aria-label={`Open ${list.title}`}><ArrowRight /></Link></Button></div>)}</div> : <EmptyState icon={BookOpen} title="Your next great lesson starts here" description="Add a reading passage and choose the words you want your students to discover." action={<Button size="sm" onClick={() => setShowCreateList(true)}><PlusCircle />Create your first list</Button>} />}
            </CardContent></Card>
            <Card><CardHeader><div className="section-heading"><div><CardTitle>Ready for your feedback</CardTitle><CardDescription className="mt-1">Help your students take the next step.</CardDescription></div><Badge variant="secondary">{pendingSubmissions.filter(s => !s.gradedAt).length} to review</Badge></div></CardHeader><CardContent>{submissionsLoading ? <Skeleton className="h-24 w-full" /> : pendingSubmissions.some(s => !s.gradedAt) ? <div className="divide-y">{pendingSubmissions.filter(s => !s.gradedAt).slice(0, 4).map(submission => <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-medium">{submission.student?.name || "Student submission"}</p><p className="mt-1 text-xs text-muted-foreground">{submission.list?.title}</p></div><Button variant="outline" size="sm" onClick={() => { setSelectedSubmissionId(submission.id); setShowGrading(true); }}>Review<ArrowRight /></Button></div>)}</div> : <EmptyState icon={CheckCircle} title="You’re all caught up" description="New submissions will appear here when your students finish a checkup." />}</CardContent></Card>
          </div>
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-[#182b54] p-6 text-white"><span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><PlusCircle className="h-5 w-5" /></span><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200">Make room for discovery</p><h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">A passage today.<br />A new perspective tomorrow.</h2><p className="mt-3 text-xs leading-6 text-blue-100/75">Bring your reading material to life with a vocabulary checkup.</p><Button onClick={() => setShowCreateList(true)} className="mt-6 w-full bg-white text-[#182b54] hover:bg-blue-50">Create a checkup<ArrowRight className="ml-auto" /></Button></div>
            <Card><CardHeader><CardTitle>Quick links</CardTitle></CardHeader><CardContent className="space-y-2">{[{ href: "/educator/classes", label: "Manage your classes", icon: School }, { href: "/educator/statistics", label: "Explore your statistics", icon: BarChart }, { href: "/educator/assignments", label: "Organize assignments", icon: ClipboardList }].map(({ href, label, icon: Icon }) => <Link key={href} to={href} className="flex items-center gap-3 rounded-lg px-2 py-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4 text-primary" />{label}<ArrowRight className="ml-auto h-3.5 w-3.5" /></Link>)}</CardContent></Card>
          </div>
        </div>
      </>}

    </div>
  );
}
export default EducatorDashboard;
