import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Download, Calendar, Search,
  BarChart3, Users, Shield, Building, AlertTriangle,
  Loader2, Eye, RefreshCw, FileSpreadsheet, ChevronDown,
  Clock, Filter, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const GovernmentReports = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Nav items for government portal
  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: BarChart3 },
    { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'reports', path: '/government/reports', label: 'Reports', icon: FileText },
    { id: 'analytics', path: '/government/analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
  ];

  // Report descriptions
  const reportDescriptions = {
    "Compliance Summary": "Overview of citizen compliance rates, violations, and enforcement status",
    "Revenue Collection": "Fee payments, late fees, and outstanding balances analysis",
    "License Activity": "New registrations, renewals, revocations, and application status",
    "Dealer Oversight": "Dealer transaction volumes, flagged activities, and certifications",
    "Regional Performance": "Compliance metrics broken down by geographic region",
    "Enforcement Actions": "Warnings, suspensions, and reinstatements tracking",
    "Audit Trail": "System activity log for compliance and security auditing",
    "Flagged Transactions": "Suspicious activities requiring investigation",
    "Stolen Firearms": "Reported stolen weapons and recovery status",
    "High-Risk Individuals": "Citizens with multiple violations or elevated risk scores",
    "Suspended Licenses": "Currently suspended individuals and outstanding fees",
    "Transaction Lookup": "Complete transaction history for specific individuals",
    "License Certificate": "Official license document for printing or digital use",
    "Firearm Registration": "Complete list of registered firearms for an individual",
    "Training Transcript": "Completed courses, certifications, and training hours",
    "Payment History": "All fee payments and transaction receipts",
    "Compliance Status": "Personal compliance checklist and status summary",
    "Sales Summary": "Transaction volumes, revenue, and sales performance",
    "Inventory Report": "Current stock levels and inventory valuation",
    "Verification Log": "Customer verification records and pass/fail rates",
    "Compliance Audit": "Dealer compliance checklist and audit results"
  };

  // Category icons and colors
  const categoryConfig = {
    "Government": { icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
    "Law Enforcement": { icon: Shield, color: "text-red-600", bg: "bg-red-50", badge: "bg-red-100 text-red-700" },
    "Citizen": { icon: Users, color: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
    "Dealer": { icon: Building, color: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const res = await api.get("/reports/catalog");
      setCatalog(res.data.catalog || []);
    } catch (error) {
      console.error("Error fetching catalog:", error);
      toast.error("Failed to load report catalog");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handlePreviewReport = async (report) => {
    setSelectedReport(report);
    setReportLoading(true);
    setShowPreviewDialog(true);
    
    try {
      const endpoint = report.endpoint + `?format=json&period=${period}`;
      const res = await api.get(endpoint);
      setReportData(res.data);
    } catch (error) {
      console.error("Error loading report:", error);
      toast.error("Failed to load report preview");
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReport = async (report, downloadFormat) => {
    try {
      const toastId = toast.loading("Generating report...");
      
      const endpoint = report.endpoint + `?format=${downloadFormat}&period=${period}`;
      
      if (downloadFormat === "pdf" || downloadFormat === "csv") {
        const response = await api.get(endpoint, { responseType: 'blob' });
        const blob = new Blob([response.data], { 
          type: downloadFormat === "pdf" ? "application/pdf" : "text/csv" 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name.toLowerCase().replace(/\s+/g, '_')}_${period}.${downloadFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.dismiss(toastId);
        toast.success(`${report.name} downloaded`);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.dismiss();
      toast.error("Failed to download report");
    }
  };

  // Filter reports
  const getFilteredReports = (category) => {
    return catalog.filter(report => {
      const matchesCategory = category === "all" || report.category === category;
      const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  // Get unique categories
  const categories = [...new Set(catalog.map(r => r.category))];

  // Count reports per category
  const getCategoryCount = (category) => {
    if (category === "all") return catalog.length;
    return catalog.filter(r => r.category === category).length;
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="National Oversight"
        subtitle="Government Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const ReportTable = ({ reports }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/80">
            <TableHead className="w-[280px] font-semibold">Report Name</TableHead>
            <TableHead className="font-semibold">Description</TableHead>
            <TableHead className="w-[120px] font-semibold text-center">Formats</TableHead>
            <TableHead className="w-[180px] font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                No reports found matching your search
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report, idx) => {
              const config = categoryConfig[report.category] || categoryConfig["Government"];
              const Icon = config.icon;
              
              return (
                <TableRow key={idx} className="hover:bg-gray-50/50 transition-colors" data-testid={`report-row-${idx}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{report.name}</p>
                        <Badge variant="outline" className={`text-[10px] mt-1 ${config.badge}`}>
                          {report.category}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {reportDescriptions[report.name] || "Generate and download this report"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {report.formats.map(f => (
                        <Badge key={f} variant="secondary" className="text-[10px] px-1.5">
                          {f.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePreviewReport(report)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Export
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {report.formats.includes("pdf") && (
                            <DropdownMenuItem onClick={() => handleDownloadReport(report, "pdf")}>
                              <FileText className="w-4 h-4 mr-2 text-red-500" />
                              Download PDF
                            </DropdownMenuItem>
                          )}
                          {report.formats.includes("csv") && (
                            <DropdownMenuItem onClick={() => handleDownloadReport(report, "csv")}>
                              <FileSpreadsheet className="w-4 h-4 mr-2 text-green-500" />
                              Download CSV
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="National Oversight"
      subtitle="Government Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="government-reports">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
            <p className="text-gray-500 text-sm">{catalog.length} reports available</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]" data-testid="period-select">
                <Clock className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchCatalog} title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Tabs */}
        <Card>
          <CardContent className="p-0">
            {/* Search Bar */}
            <div className="p-4 border-b bg-gray-50/50">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                  data-testid="search-reports"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b px-4">
                <TabsList className="h-12 bg-transparent p-0 gap-0">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 h-12"
                  >
                    All Reports
                    <Badge variant="secondary" className="ml-2 text-xs">{getCategoryCount("all")}</Badge>
                  </TabsTrigger>
                  {categories.map(cat => {
                    const config = categoryConfig[cat] || categoryConfig["Government"];
                    const Icon = config.icon;
                    return (
                      <TabsTrigger 
                        key={cat} 
                        value={cat}
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 h-12"
                      >
                        <Icon className={`w-4 h-4 mr-2 ${config.color}`} />
                        {cat}
                        <Badge variant="secondary" className="ml-2 text-xs">{getCategoryCount(cat)}</Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                <TabsContent value="all" className="mt-0">
                  <ReportTable reports={getFilteredReports("all")} />
                </TabsContent>
                {categories.map(cat => (
                  <TabsContent key={cat} value={cat} className="mt-0">
                    <ReportTable reports={getFilteredReports(cat)} />
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {selectedReport?.name}
              </DialogTitle>
              <DialogDescription>
                Report preview • Period: {period}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              {reportLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : reportData ? (
                <div className="space-y-4">
                  {/* Summary */}
                  {reportData.summary && (
                    <div className="p-4 rounded-lg bg-gray-50 border">
                      <h4 className="font-medium text-gray-700 mb-3 text-sm">Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(reportData.summary).map(([key, value], idx) => (
                          <div key={idx} className="bg-white p-3 rounded border">
                            <p className="text-xs text-gray-500 truncate">{key}</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Data Table */}
                  {reportData.data && reportData.data.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            {reportData.columns?.map((col, idx) => (
                              <TableHead key={idx} className="text-xs font-semibold">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.data.slice(0, 15).map((row, idx) => (
                            <TableRow key={idx}>
                              {reportData.columns?.map((col, colIdx) => {
                                const key = col.toLowerCase().replace(/\s+/g, '_');
                                return (
                                  <TableCell key={colIdx} className="text-xs">
                                    {row[key] || row[col] || '-'}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {reportData.data.length > 15 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t">
                          Showing 15 of {reportData.data.length} records
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  No data available
                </div>
              )}
            </div>
            
            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
              {selectedReport?.formats?.includes("csv") && (
                <Button variant="outline" onClick={() => handleDownloadReport(selectedReport, "csv")}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              )}
              {selectedReport?.formats?.includes("pdf") && (
                <Button onClick={() => handleDownloadReport(selectedReport, "pdf")}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default GovernmentReports;
