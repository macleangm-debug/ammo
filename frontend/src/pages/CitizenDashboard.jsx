import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Shield, Award, History, Bell, Settings,
  CreditCard, GraduationCap, Target, CheckCircle, Clock,
  AlertTriangle, TrendingUp, Calendar, Users, XCircle, ShoppingBag,
  ChevronLeft, ChevronRight, MoreHorizontal, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

// Circular Progress Component
const CircularProgress = ({ value, max, size = 80, strokeWidth = 6, color = "hsl(var(--primary))" }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{value}</span>
      </div>
    </div>
  );
};

// Mini Calendar Component
const MiniCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate() === i && 
                    today.getMonth() === currentDate.getMonth() && 
                    today.getFullYear() === currentDate.getFullYear();
    days.push(
      <div 
        key={i} 
        className={`w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors
          ${isToday ? 'bg-primary text-white font-medium' : 'hover:bg-muted text-foreground'}`}
      >
        {i}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-7 h-7"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          {days}
        </div>
      </CardContent>
    </Card>
  );
};

const CitizenDashboard = ({ user, api }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [responsibility, setResponsibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, txnRes, respRes, enrollRes] = await Promise.all([
        api.get("/citizen/profile").catch(() => ({ data: null })),
        api.get("/citizen/transactions").catch(() => ({ data: [] })),
        api.get("/citizen/responsibility").catch(() => ({ data: null })),
        api.get("/members/enrollments").catch(() => ({ data: [] }))
      ]);
      
      setProfile(profileRes.data);
      setTransactions(txnRes.data || []);
      setResponsibility(respRes.data);
      setEnrollments(enrollRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
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

  // Calculate stats
  const ariScore = responsibility?.ari_score || 40;
  const trainingHours = responsibility?.training?.hours || 16;
  const trainingTarget = responsibility?.training?.target_hours || 20;
  const complianceStreak = responsibility?.compliance_streak || 0;
  const badgesEarned = responsibility?.badges_earned?.length || 0;
  
  const approvedTxns = transactions.filter(t => t.status === 'approved').length;
  const pendingTxns = transactions.filter(t => t.status === 'pending').length;

  const getStatusColor = (status) => {
    const colors = {
      approved: 'bg-emerald-500',
      pending: 'bg-amber-500',
      rejected: 'bg-red-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-emerald-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Dashboard"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Dashboard"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div className="space-y-6" data-testid="citizen-dashboard">
        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-bold">
                Hello {user?.name?.split(' ')[0] || 'Member'}! 👋
              </h2>
              <p className="text-muted-foreground max-w-md">
                Track your responsibility score, complete training courses, and maintain compliance. 
                Your current ARI score puts you in the top 25% of members.
              </p>
              <Button className="mt-2" onClick={() => navigate('/training')}>
                Continue Training
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="hidden lg:block">
              <svg viewBox="0 0 200 150" className="w-48 h-36">
                <rect x="60" y="60" width="80" height="60" rx="8" fill="hsl(var(--primary) / 0.1)" />
                <rect x="70" y="70" width="60" height="8" rx="2" fill="hsl(var(--primary) / 0.3)" />
                <rect x="70" y="85" width="40" height="6" rx="2" fill="hsl(var(--primary) / 0.2)" />
                <rect x="70" y="95" width="50" height="6" rx="2" fill="hsl(var(--primary) / 0.2)" />
                <circle cx="150" cy="50" r="25" fill="hsl(var(--primary) / 0.15)" />
                <circle cx="50" cy="100" r="20" fill="hsl(var(--primary) / 0.1)" />
                <path d="M90 40 L110 40 L100 25 Z" fill="hsl(var(--primary) / 0.2)" />
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - You need to improve */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Your Progress</h3>
            <Button variant="link" className="text-primary" onClick={() => navigate('/dashboard/license')}>
              See all
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ARI Score Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ARI Score</p>
                    <p className="text-3xl font-bold">{ariScore}</p>
                    <p className="text-xs text-muted-foreground">/100 points</p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5 this month
                    </Badge>
                  </div>
                  <CircularProgress 
                    value={ariScore} 
                    max={100} 
                    color="hsl(234, 89%, 64%)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Training Hours Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Training Hours</p>
                    <p className="text-3xl font-bold">{trainingHours}</p>
                    <p className="text-xs text-muted-foreground">of {trainingTarget} target</p>
                    <Badge className="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-100">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +2.5 hrs
                    </Badge>
                  </div>
                  <CircularProgress 
                    value={trainingHours} 
                    max={trainingTarget} 
                    color="hsl(199, 89%, 48%)"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Compliance Streak Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Compliance Streak</p>
                    <p className="text-3xl font-bold">{complianceStreak}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                    <p className="text-xs text-emerald-600 mt-2 font-medium">Keep it up!</p>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Target className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges Earned Card */}
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Badges Earned</p>
                    <p className="text-3xl font-bold">{badgesEarned}</p>
                    <p className="text-xs text-muted-foreground">achievements</p>
                    <Badge className="mt-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <Award className="w-3 h-3 mr-1" />
                      2 pending
                    </Badge>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                    <Award className="w-8 h-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction Progress - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
                <Button variant="link" className="text-primary" onClick={() => navigate('/dashboard/history')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Transaction ID</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 5).map((txn, idx) => (
                      <tr key={txn.transaction_id || idx} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-2">
                          <p className="font-mono text-sm">{txn.transaction_id}</p>
                          <p className="text-xs text-muted-foreground">Qty: {txn.quantity}</p>
                        </td>
                        <td className="py-3 px-2">
                          <span className="capitalize text-sm">{txn.item_type}</span>
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(txn.status)}`} />
                            <span className="text-sm capitalize">{txn.status?.replace('_', ' ')}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Calendar - Takes 1 column */}
          <div className="space-y-4">
            <MiniCalendar />
            
            {/* Transaction Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm">Approved</span>
                  </div>
                  <span className="font-semibold">{approvedTxns}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm">Pending</span>
                  </div>
                  <span className="font-semibold">{pendingTxns}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm">In Progress</span>
                  </div>
                  <span className="font-semibold">{enrollments.filter(e => e.status === 'in_progress').length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Progress Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Active Courses</h3>
            <Button variant="link" className="text-primary" onClick={() => navigate('/training')}>
              See all courses
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.filter(e => e.status !== 'completed').slice(0, 3).map((enrollment, idx) => (
              <Card key={enrollment.enrollment_id || idx} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{enrollment.course_name || 'Training Course'}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Progress: {enrollment.progress || 0}%</p>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${enrollment.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {enrollments.filter(e => e.status !== 'completed').length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No active courses</p>
                  <Button variant="link" className="text-primary mt-2" onClick={() => navigate('/training')}>
                    Browse available courses
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CitizenDashboard;
