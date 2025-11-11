import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function TestAnalytics() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchAnalytics();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("name");

    if (!error && data) {
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const { data: testCases } = await supabase
      .from("test_cases")
      .select(`
        *,
        test_suites (
          test_plans (project_id)
        )
      `);

    const { data: executions } = await supabase
      .from("test_executions")
      .select(`
        *,
        test_cases (
          test_suites (
            test_plans (project_id)
          )
        )
      `);

    if (testCases && executions) {
      const projectCases = testCases.filter(
        (tc: any) => tc.test_suites?.test_plans?.project_id === selectedProject
      );

      const projectExecutions = executions.filter(
        (ex: any) => ex.test_cases?.test_suites?.test_plans?.project_id === selectedProject
      );

      // Priority distribution
      const priorityData = [
        { name: "Critical", value: projectCases.filter((c: any) => c.priority === "critical").length, color: "#ef4444" },
        { name: "High", value: projectCases.filter((c: any) => c.priority === "high").length, color: "#f97316" },
        { name: "Medium", value: projectCases.filter((c: any) => c.priority === "medium").length, color: "#eab308" },
        { name: "Low", value: projectCases.filter((c: any) => c.priority === "low").length, color: "#22c55e" },
      ];

      // Status distribution
      const statusData = [
        { name: "Ready", value: projectCases.filter((c: any) => c.status === "ready").length, color: "#22c55e" },
        { name: "Draft", value: projectCases.filter((c: any) => c.status === "draft").length, color: "#94a3b8" },
        { name: "Deprecated", value: projectCases.filter((c: any) => c.status === "deprecated").length, color: "#64748b" },
      ];

      // Execution status
      const executionStatusData = [
        { name: "Passed", value: projectExecutions.filter((e: any) => e.status === "passed").length, color: "#22c55e" },
        { name: "Failed", value: projectExecutions.filter((e: any) => e.status === "failed").length, color: "#ef4444" },
        { name: "Blocked", value: projectExecutions.filter((e: any) => e.status === "blocked").length, color: "#eab308" },
        { name: "Skipped", value: projectExecutions.filter((e: any) => e.status === "skipped").length, color: "#94a3b8" },
      ];

      // Pass rate trend (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const trendData = last7Days.map(date => {
        const dayExecutions = projectExecutions.filter((e: any) => 
          e.execution_date?.startsWith(date)
        );
        const passed = dayExecutions.filter((e: any) => e.status === "passed").length;
        const failed = dayExecutions.filter((e: any) => e.status === "failed").length;
        const total = passed + failed;
        
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
          executions: total
        };
      });

      // Coverage metrics
      const totalCases = projectCases.length;
      const executedCases = new Set(projectExecutions.map((e: any) => e.test_case_id)).size;
      const coverage = totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0;

      setAnalytics({
        priorityData,
        statusData,
        executionStatusData,
        trendData,
        coverage,
        totalCases,
        executedCases,
        totalExecutions: projectExecutions.length
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Test Analytics</h1>
          <p className="text-muted-foreground">Comprehensive test metrics and insights</p>
        </div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select project" />
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

      {analytics && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Test Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalCases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Test Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.coverage}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.executedCases} of {analytics.totalCases} executed
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalExecutions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Current Pass Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.trendData[analytics.trendData.length - 1]?.passRate || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Cases by Priority</CardTitle>
                <CardDescription>Distribution of test case priorities</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {analytics.priorityData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Cases by Status</CardTitle>
                <CardDescription>Current status distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {analytics.statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Execution Results</CardTitle>
                <CardDescription>Test execution outcomes</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.executionStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {analytics.executionStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pass Rate Trend</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="passRate" stroke="#22c55e" name="Pass Rate %" strokeWidth={2} />
                    <Line type="monotone" dataKey="executions" stroke="#3b82f6" name="Executions" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}