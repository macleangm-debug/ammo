import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Package, Search, Plus, Edit, Trash2, AlertTriangle, TrendingUp,
  BarChart3, DollarSign, ArrowUpDown, Download, Upload, Link, Unlink,
  Scan, Filter, RefreshCw, ChevronRight, Box, Tag, Shield, Archive,
  History as HistoryIcon, Bell, Settings, LayoutDashboard, Users,
  CheckCircle, XCircle, Loader2, X, SlidersHorizontal, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { formatNumber, formatCurrency, formatCurrencyDecimal } from "../utils/formatters";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const DealerInventory = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [activeTab, setActiveTab] = useState("inventory");
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialogs
  const [itemDialog, setItemDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [scanDialog, setScanDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "accessory",
    quantity: 0,
    min_stock_level: 5,
    unit_cost: 0,
    unit_price: 0,
    location: "",
    supplier_name: "",
    requires_license: false
  });
  
  // Adjust form
  const [adjustData, setAdjustData] = useState({
    type: "restock",
    quantity: 0,
    notes: ""
  });
  
  // Scan
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importData, setImportData] = useState([]);
  const [importPreview, setImportPreview] = useState(false);

  const navItems = [
    { id: 'dashboard', path: '/dealer', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verify', path: '/dealer/verify', label: 'Verify Buyer', icon: Users },
    { id: 'transactions', path: '/dealer/transactions', label: 'Transactions', icon: HistoryIcon },
    { id: 'inventory', path: '/dealer/inventory', label: 'Inventory', icon: Package },
    { id: 'settings', path: '/dealer/settings', label: 'Settings', icon: Settings },
  ];

  const categories = [
    { id: "firearm", name: "Firearm", icon: Shield },
    { id: "ammunition", name: "Ammunition", icon: Box },
    { id: "accessory", name: "Accessory", icon: Tag },
    { id: "safety_equipment", name: "Safety Equipment", icon: Shield },
    { id: "storage", name: "Storage", icon: Archive },
    { id: "training_material", name: "Training Material", icon: Package },
  ];

  const fetchInventory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (showLowStock) params.append("low_stock", "true");
      
      const response = await api.get(`/dealer/inventory?${params.toString()}`);
      setInventory(response.data.items || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    }
  }, [api, searchQuery, categoryFilter, statusFilter, showLowStock]);

  const fetchAlerts = async () => {
    try {
      const response = await api.get("/dealer/inventory/alerts");
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await api.get("/dealer/inventory/movements?limit=50");
      setMovements(response.data.movements || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  };

  const fetchValuation = async () => {
    try {
      const response = await api.get("/dealer/inventory/valuation");
      setValuation(response.data);
    } catch (error) {
      console.error("Error fetching valuation:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchInventory(),
        fetchAlerts(),
        fetchMovements(),
        fetchValuation()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      category: "accessory",
      quantity: 0,
      min_stock_level: 5,
      unit_cost: 0,
      unit_price: 0,
      location: "",
      supplier_name: "",
      requires_license: false
    });
    setEditingItem(null);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      description: item.description || "",
      sku: item.sku || "",
      category: item.category || "accessory",
      quantity: item.quantity || 0,
      min_stock_level: item.min_stock_level || 5,
      unit_cost: item.unit_cost || 0,
      unit_price: item.unit_price || 0,
      location: item.location || "",
      supplier_name: item.supplier_name || "",
      requires_license: item.requires_license || false
    });
    setItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    
    setProcessing(true);
    try {
      if (editingItem) {
        await api.put(`/dealer/inventory/${editingItem.item_id}`, formData);
        toast.success("Item updated");
      } else {
        await api.post("/dealer/inventory", formData);
        toast.success("Item created");
      }
      setItemDialog(false);
      resetForm();
      await Promise.all([fetchInventory(), fetchAlerts()]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save item");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    
    try {
      await api.delete(`/dealer/inventory/${item.item_id}`);
      toast.success("Item deleted");
      await fetchInventory();
    } catch (error) {
      toast.error("Failed to delete item");
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || adjustData.quantity === 0) return;
    
    setProcessing(true);
    try {
      await api.post(`/dealer/inventory/${selectedItem.item_id}/adjust`, adjustData);
      toast.success("Stock adjusted");
      setAdjustDialog(false);
      setAdjustData({ type: "restock", quantity: 0, notes: "" });
      await Promise.all([fetchInventory(), fetchMovements(), fetchAlerts()]);
    } catch (error) {
      toast.error("Failed to adjust stock");
    } finally {
      setProcessing(false);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    
    try {
      const response = await api.get(`/dealer/inventory/scan/${scanInput.trim()}`);
      if (response.data.found) {
        setSelectedItem(response.data.item);
        setScanDialog(false);
        setScanInput("");
        openEditDialog(response.data.item);
      } else {
        toast.error("Item not found with this SKU");
      }
    } catch (error) {
      toast.error("Scan failed");
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const response = await api.get("/dealer/inventory/export");
      if (format === 'csv') {
        const csv = convertToCSV(response.data.data);
        downloadFile(csv, "inventory_export.csv", "text/csv");
      } else {
        // Export as Excel-compatible CSV with BOM for Excel
        const csv = "\uFEFF" + convertToCSV(response.data.data);
        downloadFile(csv, "inventory_export.xlsx.csv", "text/csv;charset=utf-8");
      }
      toast.success(`Exported ${response.data.count} items`);
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => `"${item[h] || ""}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    try {
      let data = [];
      const text = await file.text();
      
      if (fileExtension === 'csv' || fileExtension === 'txt') {
        data = parseCSV(text);
      } else {
        toast.error("Please upload a CSV file");
        return;
      }
      
      if (data.length === 0) {
        toast.error("No data found in file");
        return;
      }
      
      setImportData(data);
      setImportPreview(true);
      setImportDialog(true);
    } catch (error) {
      console.error("File parsing error:", error);
      toast.error("Failed to parse file");
    }
    
    // Reset file input
    event.target.value = '';
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    // Map common header variations
    const headerMap = {
      'sku': 'sku',
      'barcode': 'sku',
      'product_code': 'sku',
      'item_code': 'sku',
      'name': 'name',
      'product_name': 'name',
      'item_name': 'name',
      'description': 'description',
      'desc': 'description',
      'category': 'category',
      'type': 'category',
      'quantity': 'quantity',
      'qty': 'quantity',
      'stock': 'quantity',
      'min_stock_level': 'min_stock_level',
      'min_stock': 'min_stock_level',
      'reorder_level': 'min_stock_level',
      'unit_cost': 'unit_cost',
      'cost': 'unit_cost',
      'cost_price': 'unit_cost',
      'unit_price': 'unit_price',
      'price': 'unit_price',
      'sale_price': 'unit_price',
      'selling_price': 'unit_price',
      'location': 'location',
      'shelf': 'location',
      'warehouse': 'location',
      'supplier_name': 'supplier_name',
      'supplier': 'supplier_name',
      'vendor': 'supplier_name',
      'requires_license': 'requires_license',
      'licensed': 'requires_license'
    };
    
    const mappedHeaders = headers.map(h => headerMap[h] || h);
    
    // Parse rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      if (values.length === 0 || values.every(v => !v)) continue;
      
      const row = {};
      mappedHeaders.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      // Ensure required fields
      if (row.name || row.sku) {
        data.push(row);
      }
    }
    
    return data;
  };

  const handleImport = async () => {
    if (importData.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await api.post("/dealer/inventory/import", { data: importData });
      toast.success(response.data.message);
      
      if (response.data.errors?.length > 0) {
        toast.error(`${response.data.errors.length} rows had errors`);
      }
      
      setImportDialog(false);
      setImportData([]);
      setImportPreview(false);
      await fetchInventory();
    } catch (error) {
      toast.error("Import failed");
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = "sku,name,description,category,quantity,min_stock_level,unit_cost,unit_price,location,supplier_name,requires_license\nSKU-001,Sample Item,Description here,accessory,10,5,25.00,49.99,Shelf A1,Supplier Inc,false";
    downloadFile(template, "inventory_template.csv", "text/csv");
    toast.success("Template downloaded");
  };

  const handleLinkMarketplace = async (item) => {
    setProcessing(true);
    try {
      await api.post(`/dealer/inventory/link-marketplace/${item.item_id}`, {
        name: item.name,
        description: item.description
      });
      toast.success("Linked to marketplace");
      await fetchInventory();
    } catch (error) {
      toast.error("Failed to link");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnlinkMarketplace = async (item) => {
    try {
      await api.post(`/dealer/inventory/unlink-marketplace/${item.item_id}`);
      toast.success("Unlinked from marketplace");
      await fetchInventory();
    } catch (error) {
      toast.error("Failed to unlink");
    }
  };

  const handleAcknowledgeAlert = async (alert) => {
    try {
      await api.put(`/dealer/inventory/alerts/${alert.alert_id}`, { status: "acknowledged" });
      toast.success("Alert acknowledged");
      await fetchAlerts();
    } catch (error) {
      toast.error("Failed to update alert");
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || Package;
  };

  const getCategoryColor = (category) => {
    const colors = {
      firearm: "bg-red-100 text-red-600",
      ammunition: "bg-blue-100 text-blue-600",
      accessory: "bg-purple-100 text-purple-600",
      safety_equipment: "bg-emerald-100 text-emerald-600",
      storage: "bg-amber-100 text-amber-600",
      training_material: "bg-cyan-100 text-cyan-600",
    };
    return colors[category] || "bg-gray-100 text-gray-600";
  };

  const getMovementColor = (type) => {
    const colors = {
      restock: "text-emerald-600 bg-emerald-100",
      sale: "text-blue-600 bg-blue-100",
      return: "text-cyan-600 bg-cyan-100",
      adjustment: "text-amber-600 bg-amber-100",
      damage: "text-red-600 bg-red-100",
      expired: "text-red-600 bg-red-100",
      transfer: "text-purple-600 bg-purple-100",
    };
    return colors[type] || "text-gray-600 bg-gray-100";
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Inventory"
        subtitle="Dealer Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <Package className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Inventory"
      subtitle="Dealer Portal"
      onLogout={handleLogout}
    >
      {/* Mobile Layout */}
      <div className="lg:hidden space-y-5" data-testid="inventory-mobile">
        {/* Stats - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Package className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.total_items || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total Items</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">${Math.round(stats.total_retail_value || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Retail Value</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats.low_stock_count || 0}</p>
            <p className="text-[10px] text-muted-foreground">Low Stock</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">${Math.round(stats.potential_profit || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Profit</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <Button size="sm" onClick={() => { resetForm(); setItemDialog(true); }} className="flex-col h-16 gap-1">
            <Plus className="w-4 h-4" />
            <span className="text-[10px]">Add</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setScanDialog(true)} className="flex-col h-16 gap-1">
            <Scan className="w-4 h-4" />
            <span className="text-[10px]">Scan</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-col h-16 gap-1">
            <Upload className="w-4 h-4" />
            <span className="text-[10px]">Import</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('csv')} className="flex-col h-16 gap-1">
            <Download className="w-4 h-4" />
            <span className="text-[10px]">Export</span>
          </Button>
        </div>
        
        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv,.txt"
          className="hidden"
        />

        {/* Tabs */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          {['inventory', 'alerts', 'history', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-card shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              {tab === 'alerts' && alerts.length > 0 && (
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1" />
              )}
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        {activeTab === 'inventory' && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={() => setShowFilters(false)}>Apply</Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            {inventory.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No inventory items</p>
                <Button variant="link" className="mt-2" onClick={() => { resetForm(); setItemDialog(true); }}>
                  Add your first item
                </Button>
              </div>
            ) : (
              inventory.map((item) => {
                const IconComponent = getCategoryIcon(item.category);
                const isLowStock = item.quantity <= item.min_stock_level;
                return (
                  <div
                    key={item.item_id}
                    className="bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex gap-3">
                      <div className={`w-12 h-12 rounded-xl ${getCategoryColor(item.category)} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm line-clamp-1">{item.name}</h4>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          </div>
                          <div className="flex gap-1">
                            {item.linked_to_marketplace && (
                              <Badge className="bg-blue-100 text-blue-700 text-[10px]">Listed</Badge>
                            )}
                            {isLowStock && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">Low</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className={`font-semibold ${isLowStock ? 'text-amber-600' : ''}`}>
                            Qty: {item.quantity}
                          </span>
                          <span className="text-muted-foreground">
                            Cost: ${item.unit_cost}
                          </span>
                          <span className="text-emerald-600 font-medium">
                            ${item.unit_price}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => {
                            setSelectedItem(item);
                            setAdjustData({ type: "restock", quantity: 0, notes: "" });
                            setAdjustDialog(true);
                          }}>
                            <ArrowUpDown className="w-3 h-3 mr-1" />
                            Adjust
                          </Button>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => openEditDialog(item)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          {!item.linked_to_marketplace ? (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleLinkMarketplace(item)}>
                              <Link className="w-3 h-3" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => handleUnlinkMarketplace(item)}>
                              <Unlink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/50 mb-3" />
                <p className="text-muted-foreground">No reorder alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.alert_id} className="bg-card rounded-xl p-4 border border-amber-200 bg-amber-50/50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{alert.item_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current: {alert.current_quantity} / Min: {alert.min_stock_level}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Suggested reorder: {alert.suggested_reorder_qty} units
                      </p>
                      {alert.status === 'active' && (
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => handleAcknowledgeAlert(alert)}>
                          Acknowledge
                        </Button>
                      )}
                    </div>
                    <Badge className={alert.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {movements.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No movement history</p>
              </div>
            ) : (
              movements.map((movement) => (
                <div key={movement.movement_id} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{movement.item_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{movement.movement_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && valuation && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Inventory Valuation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Units</span>
                  <span className="font-semibold">{valuation.summary.total_units}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Cost Value</span>
                  <span className="font-semibold">${valuation.summary.total_cost_value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Retail Value</span>
                  <span className="font-semibold text-emerald-600">${valuation.summary.total_retail_value}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Potential Profit</span>
                  <span className="font-bold text-emerald-600">${valuation.summary.potential_profit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <span className="font-semibold">{valuation.summary.profit_margin}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">By Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(valuation.by_category).map(([cat, data]) => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm capitalize">{cat.replace('_', ' ')}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${data.retail_value}</p>
                      <p className="text-xs text-muted-foreground">{data.units} units</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block space-y-6" data-testid="inventory-desktop">
        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold">{stats.total_items || 0}</p>
                </div>
                <Package className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cost Value</p>
                  <p className="text-2xl font-bold">${Math.round(stats.total_cost_value || 0)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Retail Value</p>
                  <p className="text-2xl font-bold">${Math.round(stats.total_retail_value || 0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Potential Profit</p>
                  <p className="text-2xl font-bold text-emerald-600">${Math.round(stats.potential_profit || 0)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card className={stats.low_stock_count > 0 ? "border-amber-300 bg-amber-50/50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold">{stats.low_stock_count || 0}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${stats.low_stock_count > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter || "all"} onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showLowStock ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowLowStock(!showLowStock)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Low Stock ({stats.low_stock_count || 0})
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setScanDialog(true)}>
                  <Scan className="w-4 h-4 mr-2" />
                  Scan
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" onClick={() => { resetForm(); setItemDialog(true); }} data-testid="add-item-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Inventory Table */}
            {inventory.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No inventory items</p>
                <p className="text-sm">Add your first item to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Item</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">SKU</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Category</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Qty</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Cost</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Price</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => {
                      const isLowStock = item.quantity <= item.min_stock_level;
                      return (
                        <tr key={item.item_id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-2">
                            <p className="font-medium">{item.name}</p>
                            {item.location && <p className="text-xs text-muted-foreground">{item.location}</p>}
                          </td>
                          <td className="py-3 px-2 font-mono text-sm">{item.sku}</td>
                          <td className="py-3 px-2">
                            <Badge variant="outline" className={getCategoryColor(item.category)}>
                              {item.category?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className={`py-3 px-2 text-right font-semibold ${isLowStock ? 'text-amber-600' : ''}`}>
                            {item.quantity}
                            {isLowStock && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                          </td>
                          <td className="py-3 px-2 text-right">${item.unit_cost?.toFixed(2)}</td>
                          <td className="py-3 px-2 text-right font-semibold text-emerald-600">${item.unit_price?.toFixed(2)}</td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {item.linked_to_marketplace ? (
                                <Badge className="bg-blue-100 text-blue-700">Listed</Badge>
                              ) : (
                                <Badge variant="outline">Not Listed</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => {
                                setSelectedItem(item);
                                setAdjustData({ type: "restock", quantity: 0, notes: "" });
                                setAdjustDialog(true);
                              }}>
                                <ArrowUpDown className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(item)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              {!item.linked_to_marketplace ? (
                                <Button size="sm" variant="ghost" onClick={() => handleLinkMarketplace(item)}>
                                  <Link className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => handleUnlinkMarketplace(item)}>
                                  <Unlink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteItem(item)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts and Recent Activity */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Reorder Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div key={alert.alert_id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{alert.item_name}</p>
                        <Badge className="text-xs">{alert.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Stock: {alert.current_quantity} / Reorder: {alert.suggested_reorder_qty}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {movements.slice(0, 10).map((movement) => (
                  <div key={movement.movement_id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                      <span className="text-sm truncate max-w-[150px]">{movement.item_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Item name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>SKU / Barcode</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({...formData, min_stock_level: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="Shelf/Warehouse"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  placeholder="Supplier name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Item description..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={2}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_license"
                  checked={formData.requires_license}
                  onChange={(e) => setFormData({...formData, requires_license: e.target.checked})}
                />
                <Label htmlFor="requires_license">Requires License</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setItemDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>{selectedItem?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-bold">{selectedItem?.quantity || 0}</p>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustData.type} onValueChange={(v) => setAdjustData({...adjustData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock (+)</SelectItem>
                  <SelectItem value="sale">Sale (-)</SelectItem>
                  <SelectItem value="return">Return (+)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                  <SelectItem value="damage">Damage (-)</SelectItem>
                  <SelectItem value="expired">Expired (-)</SelectItem>
                  <SelectItem value="transfer">Transfer (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={adjustData.quantity}
                onChange={(e) => setAdjustData({...adjustData, quantity: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Reason for adjustment..."
                value={adjustData.notes}
                onChange={(e) => setAdjustData({...adjustData, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock} disabled={processing || adjustData.quantity === 0}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Dialog */}
      <Dialog open={scanDialog} onOpenChange={setScanDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Scan Barcode / SKU
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              ref={scanInputRef}
              placeholder="Scan or type SKU..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Scan barcode or type SKU and press Enter
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setScanDialog(false); setScanInput(""); }}>Cancel</Button>
            <Button onClick={handleScan}>Look Up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Import Inventory
            </DialogTitle>
            <DialogDescription>
              Import inventory items from a CSV file. Items with matching SKUs will be updated.
            </DialogDescription>
          </DialogHeader>
          
          {!importPreview ? (
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a CSV file with your inventory data
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  Select File
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Supported columns:</p>
                <p>sku, name, description, category, quantity, min_stock_level, unit_cost, unit_price, location, supplier_name, requires_license</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  {importData.length} items to import
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => { setImportPreview(false); setImportData([]); }}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
              
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium">SKU</th>
                      <th className="text-left py-2 px-3 font-medium">Name</th>
                      <th className="text-right py-2 px-3 font-medium">Qty</th>
                      <th className="text-right py-2 px-3 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 20).map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 px-3 font-mono text-xs">{item.sku || '-'}</td>
                        <td className="py-2 px-3">{item.name || '-'}</td>
                        <td className="py-2 px-3 text-right">{item.quantity || 0}</td>
                        <td className="py-2 px-3 text-right">${item.unit_price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importData.length > 20 && (
                  <p className="text-xs text-center py-2 text-muted-foreground">
                    +{importData.length - 20} more items
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportData([]); setImportPreview(false); }}>
              Cancel
            </Button>
            {importPreview && (
              <Button onClick={handleImport} disabled={processing || importData.length === 0}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Import {importData.length} Items
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DealerInventory;
