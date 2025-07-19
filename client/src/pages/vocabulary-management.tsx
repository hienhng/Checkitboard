import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditVocabularyForm } from "@/components/edit-vocabulary-form";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  School,
  Trash2,
  Filter,
  Edit,
  Eye,
  HelpCircle
} from "lucide-react";

export default function VocabularyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Fetch educator's vocabulary lists
  const { data: vocabularyLists = [], isLoading: listsLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/vocabulary-lists"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/vocabulary-lists");
      return response.json();
    },
  });

  // Fetch educator's classes for filter dropdown
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
    onError: (error) => {
      console.error("Failed to fetch classes:", error);
    }
  });

  // Delete vocabulary lists mutation
  const deleteMutation = useMutation({
    mutationFn: async (listIds: number[]) => {
      const deletePromises = listIds.map(id => 
        apiRequest("DELETE", `/api/vocabulary-lists/${id}`)
      );
      return Promise.all(deletePromises);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedLists.length} vocabulary list(s) deleted successfully`,
      });
      setSelectedLists([]);
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete vocabulary lists",
        variant: "destructive",
      });
    },
  });

  // Mutation to publish/unpublish a vocabulary list
  const publishMutation = useMutation({
    mutationFn: async ({ id, published, classId }: { id: number; published: boolean; classId?: number }) => {
      // Preserve the existing class assignment when publishing/unpublishing
      const payload: any = { published };
      if (classId !== undefined) {
        payload.classId = classId;
      }
      
      const res = await apiRequest("PATCH", `/api/vocabulary-lists/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
      toast({
        title: "List updated",
        description: "The vocabulary list status has been updated successfully.",
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

  // Handle selecting/deselecting individual lists
  const handleSelectList = (listId: number) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  // Filter lists based on selected class
  const filteredLists = vocabularyLists.filter((list: any) => {
    if (selectedClass === "all") return true;
    if (selectedClass === "unassigned") return !list.class;
    return list.class?.name === selectedClass;
  });

  // Handle select all functionality
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLists(filteredLists.map((list: any) => list.id));
    } else {
      setSelectedLists([]);
    }
  };

  // Handle delete action
  const handleDelete = () => {
    if (selectedLists.length > 0) {
      deleteMutation.mutate(selectedLists);
    }
  };

  const handlePublishToggle = (id: number, currentPublished: boolean) => {
    // Find the list to get its current class assignment
    const list = vocabularyLists.find(l => l.id === id);
    const classId = list?.classId || list?.class?.id;
    
    publishMutation.mutate({ 
      id, 
      published: !currentPublished,
      classId: classId 
    });
  };

  // Handle edit action
  const handleEdit = (list: any) => {
    setEditingList(list);
    setShowEditDialog(true);
  };

  // Handle successful edit
  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setEditingList(null);
    queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
    toast({
      title: "Success",
      description: "Vocabulary list updated successfully",
    });
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Vocabulary Lists Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage and organize your vocabulary assignments
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Your Vocabulary Lists
          </CardTitle>
          <CardDescription>
            Manage and delete vocabulary checkups you've created
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.name}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedLists.length === filteredLists.length && filteredLists.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({filteredLists.length})
                  </label>
                </div>
              </div>

              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={selectedLists.length === 0}
                    className="flex items-center"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedLists.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Vocabulary Lists</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete {selectedLists.length} vocabulary list(s)? 
                      This action cannot be undone and will remove all associated student submissions and data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Vocabulary List</DialogTitle>
                </DialogHeader>
                {editingList && (
                  <EditVocabularyForm 
                    vocabularyList={editingList}
                    classes={classes}
                    onSuccess={handleEditSuccess}
                    onCancel={() => setShowEditDialog(false)}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Vocabulary Lists */}
            {listsLoading ? (
              <div className="py-4 text-center text-sm text-gray-500">Loading vocabulary lists...</div>
            ) : filteredLists && filteredLists.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredLists.map((list) => (
                  <div key={list.id} className="py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={() => handleSelectList(list.id)}
                      />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-neutral-dark">{list.title}</h4>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <CalendarDays className="mr-1 h-3.5 w-3.5" />
                          Created: {formatDate(list.createdAt)}
                        </div>
                        <div className="mt-1 flex items-center text-xs text-gray-500">
                          <ClipboardList className="mr-1 h-3.5 w-3.5" />
                          {list.words?.length || 0} vocabulary words
                        </div>
                        {list.class && (
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <School className="mr-1 h-3.5 w-3.5" />
                            Class: {list.class.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/educator/vocabulary/${list.id}`)}
                        className="flex items-center"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(list)}
                        className="flex items-center"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        variant={list.published ? "outline" : "default"} 
                        size="sm"
                        className={list.published ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200" : ""}
                        onClick={() => handlePublishToggle(list.id, list.published)}
                      >
                        {list.published ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-gray-500">
                {selectedClass === "all" 
                  ? "You haven't created any vocabulary lists yet."
                  : "No vocabulary lists found for the selected class filter."
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}