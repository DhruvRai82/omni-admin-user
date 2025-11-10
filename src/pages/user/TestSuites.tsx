import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, FolderOpen, Loader2, Search, ArrowLeft, Trash2, Edit } from "lucide-react";

interface TestSuite {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  case_count?: number;
}

export default function TestSuites() {
  const { id: projectId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [planName, setPlanName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSuite, setEditingSuite] = useState<TestSuite | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlanDetails();
    fetchTestSuites();
  }, [planId]);

  const fetchPlanDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("test_plans")
        .select("name")
        .eq("id", planId)
        .single();

      if (error) throw error;
      setPlanName(data.name);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const fetchTestSuites = async () => {
    try {
      const { data, error } = await supabase
        .from("test_suites")
        .select(`
          *,
          test_cases (count)
        `)
        .eq("test_plan_id", planId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const suitesWithCount = data?.map(suite => ({
        ...suite,
        case_count: suite.test_cases?.[0]?.count || 0
      }));

      setTestSuites(suitesWithCount || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a test suite name",
      });
      return;
    }

    try {
      if (editingSuite) {
        const { error } = await supabase
          .from("test_suites")
          .update({ name, description })
          .eq("id", editingSuite.id);

        if (error) throw error;
        toast({ title: "Test suite updated successfully" });
      } else {
        const { error } = await supabase
          .from("test_suites")
          .insert({
            test_plan_id: planId,
            name,
            description,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({ title: "Test suite created successfully" });
      }

      setDialogOpen(false);
      setName("");
      setDescription("");
      setEditingSuite(null);
      fetchTestSuites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleDelete = async (suiteId: string) => {
    if (!confirm("Are you sure you want to delete this test suite? All test cases will be deleted.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("test_suites")
        .delete()
        .eq("id", suiteId);

      if (error) throw error;
      toast({ title: "Test suite deleted successfully" });
      fetchTestSuites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleEdit = (suite: TestSuite) => {
    setEditingSuite(suite);
    setName(suite.name);
    setDescription(suite.description || "");
    setDialogOpen(true);
  };

  const filteredSuites = testSuites.filter(suite =>
    suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    suite.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}/test-plans`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{planName}</h1>
          <p className="text-muted-foreground">Test Suites</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSuite(null);
              setName("");
              setDescription("");
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New Test Suite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSuite ? "Edit" : "Create"} Test Suite</DialogTitle>
              <DialogDescription>
                {editingSuite ? "Update the test suite details" : "Create a new test suite to organize your test cases"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Login Functionality"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this test suite covers"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingSuite ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search test suites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredSuites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? "No test suites found matching your search" : "No test suites yet. Create your first test suite to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuites.map((suite) => (
            <Card key={suite.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1" onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suite.id}`)}>
                    <CardTitle className="text-xl">{suite.name}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {suite.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(suite);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(suite.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suite.id}`)}>
                <div className="text-sm text-muted-foreground">
                  {suite.case_count} test case{suite.case_count !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
