import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Search, ArrowLeft, Edit, Trash2, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TestCase {
  id: string;
  name: string;
  description: string | null;
  preconditions: string | null;
  expected_result: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "ready" | "deprecated";
  created_at: string;
  step_count?: number;
}

const priorityColors = {
  low: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
  critical: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

const statusColors = {
  draft: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
  ready: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
  deprecated: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
};

export default function TestCases() {
  const { id: projectId, planId, suiteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [suiteName, setSuiteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchSuiteDetails();
    fetchTestCases();
  }, [suiteId]);

  const fetchSuiteDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("test_suites")
        .select("name")
        .eq("id", suiteId)
        .single();

      if (error) throw error;
      setSuiteName(data.name);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const fetchTestCases = async () => {
    try {
      const { data, error } = await supabase
        .from("test_cases")
        .select(`
          *,
          test_steps (count)
        `)
        .eq("test_suite_id", suiteId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const casesWithCount = data?.map(testCase => ({
        ...testCase,
        step_count: testCase.test_steps?.[0]?.count || 0
      }));

      setTestCases(casesWithCount || []);
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

  const handleDelete = async (caseId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", caseId);

      if (error) throw error;
      toast({ title: "Test case deleted successfully" });
      fetchTestCases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const filteredCases = testCases.filter(testCase => {
    const matchesSearch = testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || testCase.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || testCase.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

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
        <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{suiteName}</h1>
          <p className="text-muted-foreground">Test Cases</p>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suiteId}/cases/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          New Test Case
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="deprecated">Deprecated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery || priorityFilter !== "all" || statusFilter !== "all" 
                ? "No test cases found matching your filters" 
                : "No test cases yet. Create your first test case to get started!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((testCase) => (
            <Card key={testCase.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suiteId}/cases/${testCase.id}`)}>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{testCase.name}</CardTitle>
                      <Badge className={priorityColors[testCase.priority]}>
                        {testCase.priority}
                      </Badge>
                      <Badge className={statusColors[testCase.status]}>
                        {testCase.status}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {testCase.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/projects/${projectId}/test-plans/${planId}/suites/${suiteId}/cases/${testCase.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(testCase.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {testCase.step_count} step{testCase.step_count !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
