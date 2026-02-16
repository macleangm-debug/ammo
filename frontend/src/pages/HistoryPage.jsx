import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, CreditCard, GraduationCap, ShoppingBag, 
  History, Bell, Settings, CheckCircle, Clock, XCircle,
  Search, Filter, Download, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const HistoryPage = ({ user, api }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get("/citizen/transactions");
      setTransactions(response.data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transaction history");
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

  const getStatusIcon = (status) => {
    const icons = {
      approved: <CheckCircle className="w-4 h-4 text-success" />,
      pending: <Clock className="w-4 h-4 text-warning" />,
      rejected: <XCircle className="w-4 h-4 text-danger" />,
      review_required: <Clock className="w-4 h-4 text-info" />,
    };
    return icons[status] || icons.pending;
  };

  const getStatusStyle = (status) => {
    const styles = {
      approved: 'bg-success/10 text-success',
      pending: 'bg-warning/10 text-warning',
      rejected: 'bg-danger/10 text-danger',
      review_required: 'bg-info/10 text-info',
    };
    return styles[status] || styles.pending;
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          txn.item_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || txn.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: transactions.length,
    approved: transactions.filter(t => t.status === 'approved').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    rejected: transactions.filter(t => t.status === 'rejected').length,
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Transaction History"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading transactions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Transaction History"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="history-page">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-danger/5 border-danger/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-danger">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-md text-sm"
                data-testid="status-filter"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No transactions found</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Transaction ID</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Quantity</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.transaction_id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-mono text-sm">{txn.transaction_id}</p>
                        </td>
                        <td className="p-3">
                          <p className="capitalize text-sm">{txn.item_type}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm">{txn.quantity}</p>
                        </td>
                        <td className="p-3">
                          <p className="text-sm text-muted-foreground">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-3">
                          <Badge className={`${getStatusStyle(txn.status)} capitalize`}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(txn.status)}
                              {txn.status?.replace('_', ' ')}
                            </span>
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
