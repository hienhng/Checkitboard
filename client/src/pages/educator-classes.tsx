import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassManagement, CreateClassDialog } from "@/components/class-management";
import { PageHeader, StatCard } from "@/components/workspace-ui";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function EducatorClasses() {
  const { toast } = useToast();
  const { data: stats, isLoading } = useQuery<{ totalStudents: number; totalClasses: number; totalLists: number }>({ queryKey: ["/api/educator/statistics"], queryFn: async () => (await apiRequest("GET", "/api/educator/statistics")).json() });
  return <div className="workspace-page">
    <PageHeader eyebrow="Your classroom community" title="Good things grow together." description="Bring your learners together. Manage your classes, share a code, and see how everyone is getting on." actions={<CreateClassDialog onClassCreated={() => { queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] }); queryClient.invalidateQueries({ queryKey: ["/api/educator/statistics"] }); toast({ title: "Class created", description: "A new space for your learners is ready." }); }} trigger={<Button><Plus />Create a class</Button>} />} />
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Classes" value={stats?.totalClasses ?? "—"} icon={School} tone="green" loading={isLoading} /><StatCard label="Students" value={stats?.totalStudents ?? "—"} icon={Users} loading={isLoading} /><StatCard label="Vocabulary lists" value={stats?.totalLists ?? "—"} icon={BookOpen} loading={isLoading} /></div>
    <ClassManagement />
  </div>;
}
