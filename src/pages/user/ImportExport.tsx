import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet } from "lucide-react";

export default function ImportExport() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(false);

  useState(() => {
    fetchProjects();
  });

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("name");

    if (data) setProjects(data);
  };

  const exportToCSV = async () => {
    if (!selectedProject) {
      toast({ title: "Error", description: "Please select a project", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: testCases } = await supabase
        .from("test_cases")
        .select(`
          *,
          test_suites (
            name,
            test_plans (name, project_id)
          ),
          test_steps (*)
        `);

      const projectCases = testCases?.filter(
        (tc: any) => tc.test_suites?.test_plans?.project_id === selectedProject
      ) || [];

      const csv = [
        ["Test Plan", "Test Suite", "Test Case", "Priority", "Status", "Description", "Preconditions", "Expected Result", "Steps"].join(","),
        ...projectCases.map((tc: any) => [
          tc.test_suites?.test_plans?.name || "",
          tc.test_suites?.name || "",
          tc.name,
          tc.priority,
          tc.status,
          `"${tc.description || ""}"`,
          `"${tc.preconditions || ""}"`,
          `"${tc.expected_result}"`,
          `"${tc.test_steps?.map((s: any) => `Step ${s.step_number}: ${s.action}`).join("; ") || ""}"`,
        ].join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-cases-${Date.now()}.csv`;
      a.click();

      toast({ title: "Success", description: "Test cases exported successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProject) {
      toast({ title: "Error", description: "Please select a project and file", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const rows = text.split("\n").slice(1); // Skip header
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // This is a simplified import - in production you'd need more robust parsing
      for (const row of rows) {
        if (!row.trim()) continue;
        
        const columns = row.split(",");
        const [testPlanName, testSuiteName, name, priority, status, description, preconditions, expectedResult] = columns;

        // Find or create test plan
        let { data: testPlan } = await supabase
          .from("test_plans")
          .select("id")
          .eq("name", testPlanName.trim())
          .eq("project_id", selectedProject)
          .single();

        if (!testPlan) {
          const { data: newPlan } = await supabase
            .from("test_plans")
            .insert({ name: testPlanName.trim(), project_id: selectedProject, created_by: user.id })
            .select()
            .single();
          testPlan = newPlan;
        }

        // Find or create test suite
        let { data: testSuite } = await supabase
          .from("test_suites")
          .select("id")
          .eq("name", testSuiteName.trim())
          .eq("test_plan_id", testPlan?.id)
          .single();

        if (!testSuite) {
          const { data: newSuite } = await supabase
            .from("test_suites")
            .insert({ 
              name: testSuiteName.trim(), 
              test_plan_id: testPlan?.id, 
              created_by: user.id 
            })
            .select()
            .single();
          testSuite = newSuite;
        }

        // Create test case
        await supabase.from("test_cases").insert({
          name: name.trim(),
          test_suite_id: testSuite?.id,
          priority: priority.trim() as any,
          status: status.trim() as any,
          description: description.replace(/"/g, "").trim(),
          preconditions: preconditions.replace(/"/g, "").trim(),
          expected_result: expectedResult.replace(/"/g, "").trim(),
          created_by: user.id,
        });
      }

      toast({ title: "Success", description: "Test cases imported successfully" });
      event.target.value = ""; // Reset file input
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import/Export Test Cases</h1>
        <p className="text-muted-foreground">Bulk manage test cases with CSV files</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Select Project</label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <FileSpreadsheet className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Export Test Cases</CardTitle>
              <CardDescription>
                Download all test cases from the selected project as a CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={exportToCSV} 
                disabled={!selectedProject || loading}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Upload className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Import Test Cases</CardTitle>
              <CardDescription>
                Upload a CSV file to bulk import test cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={!selectedProject || loading}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button 
                  disabled={!selectedProject || loading}
                  className="w-full"
                  asChild
                >
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import from CSV
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Your CSV file should include the following columns:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Test Plan (will be created if doesn't exist)</li>
              <li>Test Suite (will be created if doesn't exist)</li>
              <li>Test Case (name)</li>
              <li>Priority (low, medium, high, critical)</li>
              <li>Status (draft, ready, deprecated)</li>
              <li>Description</li>
              <li>Preconditions</li>
              <li>Expected Result</li>
              <li>Steps (optional)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Export a sample file first to see the correct format.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}