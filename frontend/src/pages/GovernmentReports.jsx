import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, Download, Calendar, Filter, Search,
  BarChart3, Users, Shield, Building, AlertTriangle,
  Clock, ChevronRight, Loader2, FileCheck, FilePieChart,
  FileSpreadsheet, FileBarChart, Eye, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const GovernmentReports = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [format, setFormat] = useState("json");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Nav items for government portal
  const navItems = [
    { id: 'dashboard', path: '/government', label: 'Dashboard', icon: BarChart3 },
    { id: 'owners', path: '/government/owners', label: 'Owners', icon: Users },
    { id: 'reviews', path: '/government/reviews', label: 'Reviews', icon: FileText },
    { id: 'reports', path: '/government/reports', label: 'Reports', icon: FilePieChart },
    { id: 'analytics', path: '/government/analytics', label: 'Analytics', icon: FileBarChart },
    { id: 'alerts', path: '/government/alerts-dashboard', label: 'Alerts', icon: AlertTriangle },
    { id: 'policies', path: '/government/policies', label: 'Policies', icon: Shield },
  ];

  // Get report icon based on category
  const getReportIcon = (category) => {
    switch (category) {
      case "Government": return BarChart3;
      case "Law Enforcement": return Shield;
      case "Citizen": return Users;
      case "Dealer": return Building;
      default: return FileText;
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case "Government": return "bg-blue-100 text-blue-700";
      case "Law Enforcement": return "bg-red-100 text-red-700";
      case "Citizen": return "bg-green-100 text-green-700";
      case "Dealer": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
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
      toast.loading("Generating report...");
      
      const endpoint = report.endpoint + `?format=${downloadFormat}&period=${period}`;
      
      if (downloadFormat === "pdf" || downloadFormat === "csv") {
        // Download file
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
        toast.dismiss();
        toast.success(`${report.name} downloaded successfully`);
      } else {
        // JSON - just show in dialog
        const res = await api.get(endpoint);
        setReportData(res.data);
        setSelectedReport(report);
        setShowPreviewDialog(true);
        toast.dismiss();
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.dismiss();
      toast.error("Failed to download report");
    }
  };

  // Filter reports
  const filteredReports = catalog.filter(report => {
    const matchesCategory = selectedCategory === "all" || report.category === selectedCategory;
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = [...new Set(catalog.map(r => r.category))];

  // Group reports by category
  const reportsByCategory = filteredReports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {});

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
            <p className="text-gray-500">{catalog.length} reports available for your role</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]" data-testid="period-select">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchCatalog}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-reports"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]" data-testid="category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reports by Category */}
        {Object.entries(reportsByCategory).map(([category, reports]) => {
          const CategoryIcon = getReportIcon(category);
          
          return (
            <Card key={category} data-testid={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CategoryIcon className="w-5 h-5" />
                  {category} Reports
                  <Badge variant="outline" className="ml-2">{reports.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reports.map((report, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-lg border hover:border-primary hover:shadow-sm transition-all cursor-pointer group"
                      data-testid={`report-${report.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(report.category)}`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                              {report.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {report.formats.map(f => f.toUpperCase()).join(", ")}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handlePreviewReport(report)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        {report.formats.includes("pdf") && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleDownloadReport(report, "pdf")}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        )}
                        {report.formats.includes("csv") && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadReport(report, "csv")}
                          >
                            <FileSpreadsheet className="w-3 h-3 mr-1" />
                            CSV
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No reports found</p>
              <p className="text-sm text-gray-400">Try adjusting your search or filter</p>
            </CardContent>
          </Card>
        )}

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                {selectedReport?.name}
              </DialogTitle>
              <DialogDescription>
                Report preview for period: {period}
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
                    <div className="p-4 rounded-lg bg-gray-50">
                      <h4 className="font-medium text-gray-700 mb-3">Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(reportData.summary).map(([key, value], idx) => (
                          <div key={idx}>
                            <p className="text-xs text-gray-500">{key}</p>
                            <p className="text-sm font-medium text-gray-900">{value}</p>
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
                          <TableRow>
                            {reportData.columns?.map((col, idx) => (
                              <TableHead key={idx} className="text-xs">{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.data.slice(0, 20).map((row, idx) => (
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
                      {reportData.data.length > 20 && (
                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                          Showing 20 of {reportData.data.length} records. Download full report for complete data.
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
                  Download CSV
                </Button>
              )}
              {selectedReport?.formats?.includes("pdf") && (
                <Button onClick={() => handleDownloadReport(selectedReport, "pdf")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
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
