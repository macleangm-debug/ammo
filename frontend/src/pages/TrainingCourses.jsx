import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, Clock, Award, Play, CheckCircle, AlertCircle,
  BookOpen, Target, Shield, Users, Calendar, ChevronRight,
  LayoutDashboard, CreditCard, ShoppingBag, History, Bell, Settings,
  ArrowLeft, Filter, Search, Star, Loader2, Trophy, Download, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const TrainingCourses = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [compulsoryFilter, setCompulsoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("available");

  const fetchCourses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (compulsoryFilter === "compulsory") params.append("compulsory", "true");
      if (compulsoryFilter === "optional") params.append("compulsory", "false");
      
      const response = await api.get(`/member/courses?${params.toString()}`);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    }
  }, [api, categoryFilter, compulsoryFilter]);

  const fetchEnrollments = async () => {
    try {
      const response = await api.get("/member/enrollments");
      setEnrollments(response.data.enrollments || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCourses(), fetchEnrollments()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEnroll = async (courseId) => {
    setProcessing(true);
    try {
      const response = await api.post(`/member/courses/${courseId}/enroll`);
      toast.success(`Enrolled in ${response.data.course_name}!`);
      setEnrollDialog(false);
      setSelectedCourse(null);
      fetchCourses();
      fetchEnrollments();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to enroll");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartCourse = async (enrollmentId) => {
    try {
      await api.post(`/member/enrollments/${enrollmentId}/start`);
      toast.success("Course started!");
      fetchEnrollments();
    } catch (error) {
      toast.error("Failed to start course");
    }
  };

  const handleUpdateProgress = async (enrollmentId, progress) => {
    try {
      await api.post(`/member/enrollments/${enrollmentId}/progress`, { progress });
      fetchEnrollments();
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  const handleCompleteCourse = async (enrollmentId) => {
    setProcessing(true);
    try {
      const response = await api.post(`/member/enrollments/${enrollmentId}/complete`);
      toast.success(`${response.data.course_name} completed! +${response.data.ari_boost} ARI points!`);
      fetchEnrollments();
      fetchCourses();
    } catch (error) {
      toast.error("Failed to complete course");
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      safety: Shield,
      legal: BookOpen,
      tactical: Target,
      refresher: Clock,
      specialized: Award
    };
    return icons[category] || GraduationCap;
  };

  const getCategoryColor = (category) => {
    const colors = {
      safety: "bg-success/10 text-success",
      legal: "bg-info/10 text-info",
      tactical: "bg-warning/10 text-warning",
      refresher: "bg-purple-500/10 text-purple-500",
      specialized: "bg-primary/10 text-primary"
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  const getStatusBadge = (status) => {
    const styles = {
      enrolled: { variant: "default", label: "Enrolled" },
      in_progress: { variant: "default", label: "In Progress", className: "bg-info" },
      completed: { variant: "default", label: "Completed", className: "bg-success" },
      expired: { variant: "destructive", label: "Expired" },
      failed: { variant: "destructive", label: "Failed" }
    };
    return styles[status] || { variant: "secondary", label: status };
  };

  // Filter courses by search
  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate available and enrolled courses
  const availableCourses = filteredCourses.filter(c => !c.enrollment_status);
  const inProgressEnrollments = enrollments.filter(e => ["enrolled", "in_progress"].includes(e.status));
  const completedEnrollments = enrollments.filter(e => e.status === "completed");

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
    { id: 'notifications', path: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', path: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Training Center"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <GraduationCap className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading training courses...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Training Center"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      <div data-testid="training-courses">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Courses</p>
                  <p className="text-2xl font-bold">{availableCourses.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{inProgressEnrollments.length}</p>
                </div>
                <Play className="w-8 h-8 text-info opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{completedEnrollments.length}</p>
                </div>
                <Trophy className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ARI Points Earned</p>
                  <p className="text-2xl font-bold">
                    +{completedEnrollments.reduce((sum, e) => sum + (e.course?.ari_boost || 0), 0)}
                  </p>
                </div>
                <Award className="w-8 h-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="my-courses">My Courses</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {/* AVAILABLE COURSES TAB */}
          <TabsContent value="available" className="space-y-6">
            {/* Search & Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="tactical">Tactical</SelectItem>
                      <SelectItem value="refresher">Refresher</SelectItem>
                      <SelectItem value="specialized">Specialized</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={compulsoryFilter} onValueChange={setCompulsoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="compulsory">Compulsory</SelectItem>
                      <SelectItem value="optional">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Courses Grid */}
            {availableCourses.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No courses available</p>
                <p className="text-sm">Check back later for new training opportunities</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCourses.map((course) => {
                  const CategoryIcon = getCategoryIcon(course.category);
                  return (
                    <Card 
                      key={course.course_id} 
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                      onClick={() => { setSelectedCourse(course); setEnrollDialog(true); }}
                    >
                      <div className={`h-2 ${course.is_compulsory ? 'bg-danger' : 'bg-primary'}`} />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`p-2 rounded-lg ${getCategoryColor(course.category)}`}>
                            <CategoryIcon className="w-5 h-5" />
                          </div>
                          <div className="flex gap-2">
                            {course.is_compulsory && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">+{course.ari_boost} ARI</Badge>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold mb-2 line-clamp-2">{course.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration_hours}h
                          </span>
                          <span className="font-medium text-foreground">
                            {course.cost > 0 ? `$${course.cost.toFixed(2)}` : 'Free'}
                          </span>
                        </div>
                        
                        {course.deadline_days && (
                          <div className="flex items-center gap-2 p-2 bg-warning/10 rounded text-xs text-warning mb-3">
                            <AlertCircle className="w-4 h-4" />
                            Complete within {course.deadline_days} days
                          </div>
                        )}
                        
                        <Button className="w-full" size="sm" data-testid={`enroll-${course.course_id}`}>
                          Enroll Now
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* MY COURSES TAB */}
          <TabsContent value="my-courses" className="space-y-6">
            {inProgressEnrollments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No courses in progress</p>
                <p className="text-sm">Enroll in a course to get started</p>
                <Button className="mt-4" onClick={() => setActiveTab("available")}>
                  Browse Courses
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {inProgressEnrollments.map((enrollment) => {
                  const course = enrollment.course;
                  const CategoryIcon = getCategoryIcon(course?.category);
                  const statusBadge = getStatusBadge(enrollment.status);
                  
                  return (
                    <Card key={enrollment.enrollment_id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${getCategoryColor(course?.category)} flex-shrink-0`}>
                            <CategoryIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{course?.name}</h3>
                              <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{course?.description}</p>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{enrollment.progress_percent}%</span>
                              </div>
                              <Progress value={enrollment.progress_percent} className="h-2" />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {course?.duration_hours}h duration
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                +{course?.ari_boost} ARI
                              </span>
                              {enrollment.deadline && (
                                <span className="flex items-center gap-1 text-warning">
                                  <Calendar className="w-4 h-4" />
                                  Due: {new Date(enrollment.deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              {enrollment.status === "enrolled" && (
                                <Button 
                                  onClick={() => handleStartCourse(enrollment.enrollment_id)}
                                  data-testid={`start-${enrollment.enrollment_id}`}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Start Course
                                </Button>
                              )}
                              {enrollment.status === "in_progress" && (
                                <>
                                  <Button 
                                    variant="outline"
                                    onClick={() => handleUpdateProgress(enrollment.enrollment_id, enrollment.progress_percent + 25)}
                                  >
                                    Continue Learning
                                  </Button>
                                  {enrollment.progress_percent >= 80 && (
                                    <Button 
                                      onClick={() => handleCompleteCourse(enrollment.enrollment_id)}
                                      disabled={processing}
                                      data-testid={`complete-${enrollment.enrollment_id}`}
                                    >
                                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                      Complete Course
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* COMPLETED TAB */}
          <TabsContent value="completed" className="space-y-6">
            {completedEnrollments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No completed courses yet</p>
                <p className="text-sm">Complete courses to earn ARI points</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedEnrollments.map((enrollment) => {
                  const course = enrollment.course;
                  const CategoryIcon = getCategoryIcon(course?.category);
                  
                  return (
                    <Card key={enrollment.enrollment_id} className="bg-success/5 border-success/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-success/10 text-success flex-shrink-0">
                            <CategoryIcon className="w-6 h-6" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{course?.name}</h3>
                              <CheckCircle className="w-5 h-5 text-success" />
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                              <span>Completed: {new Date(enrollment.completed_at).toLocaleDateString()}</span>
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                +{course?.ari_boost} ARI
                              </Badge>
                            </div>
                            
                            {enrollment.certificate_id && (
                              <div className="mt-3 p-2 bg-background/50 rounded flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-warning" />
                                  <span className="text-xs font-mono">{enrollment.certificate_id}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/member/certificates/${enrollment.enrollment_id}`, '_blank');
                                  }}
                                  data-testid={`download-cert-${enrollment.enrollment_id}`}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent className="sm:max-w-lg">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  {selectedCourse.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedCourse.is_compulsory ? "Required Training" : "Optional Training"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">{selectedCourse.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-semibold">{selectedCourse.duration_hours} hours</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="font-semibold">
                      {selectedCourse.cost > 0 ? `$${selectedCourse.cost.toFixed(2)}` : 'Free'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">ARI Boost</p>
                    <p className="font-semibold text-success">+{selectedCourse.ari_boost} points</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold capitalize">{selectedCourse.category}</p>
                  </div>
                </div>
                
                {selectedCourse.deadline_days && (
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    <div>
                      <p className="text-sm font-medium">Deadline Requirement</p>
                      <p className="text-xs text-muted-foreground">
                        Must complete within {selectedCourse.deadline_days} days of enrollment
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedCourse.ari_penalty_for_skip > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-danger" />
                    <div>
                      <p className="text-sm font-medium">Penalty for Non-Completion</p>
                      <p className="text-xs text-muted-foreground">
                        -{selectedCourse.ari_penalty_for_skip} ARI points if not completed by deadline
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setEnrollDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleEnroll(selectedCourse.course_id)}
                  disabled={processing}
                  data-testid="confirm-enroll-btn"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enroll Now {selectedCourse.cost > 0 && `- $${selectedCourse.cost.toFixed(2)}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TrainingCourses;
