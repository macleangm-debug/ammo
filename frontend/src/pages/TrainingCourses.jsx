import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, Clock, Award, Play, CheckCircle, AlertCircle,
  BookOpen, Target, Shield, Users, Calendar, ChevronRight,
  LayoutDashboard, CreditCard, ShoppingBag, History, Bell, Settings,
  Search, Star, Loader2, Trophy, Download, FileText, Filter
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("available");

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
  ];

  const fetchCourses = useCallback(async () => {
    try {
      const response = await api.get("/member/courses");
      setCourses(response.data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }, [api]);

  const fetchEnrollments = useCallback(async () => {
    try {
      const response = await api.get("/members/enrollments");
      setEnrollments(response.data || []);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCourses(), fetchEnrollments()]);
      setLoading(false);
    };
    loadData();
  }, [fetchCourses, fetchEnrollments]);

  const handleEnroll = async (courseId) => {
    setProcessing(true);
    try {
      await api.post(`/member/courses/${courseId}/enroll`);
      toast.success("Successfully enrolled!");
      setEnrollDialog(false);
      await fetchEnrollments();
      await fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to enroll");
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async (enrollmentId) => {
    setProcessing(true);
    try {
      await api.post(`/members/enrollments/${enrollmentId}/complete`);
      toast.success("Course completed! Certificate available.");
      await fetchEnrollments();
    } catch (error) {
      toast.error("Failed to complete course");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadCertificate = async (enrollmentId) => {
    try {
      const response = await api.get(`/members/courses/certificate/${enrollmentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate_${enrollmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Certificate downloaded!");
    } catch (error) {
      toast.error("Failed to download certificate");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Filter courses
  const filteredCourses = courses.filter(course =>
    course.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableCourses = filteredCourses.filter(c => !c.enrollment_status);
  const inProgressEnrollments = enrollments.filter(e => ["enrolled", "in_progress"].includes(e.status));
  const completedEnrollments = enrollments.filter(e => e.status === "completed");

  const ariPointsEarned = completedEnrollments.reduce((sum, e) => sum + (e.course?.ari_boost || 10), 0);

  const getCourseIcon = (category) => {
    const icons = {
      'legal': Shield,
      'safety': Target,
      'storage': BookOpen,
      'handling': GraduationCap,
    };
    return icons[category] || GraduationCap;
  };

  const getCourseColor = (category) => {
    const colors = {
      'legal': 'bg-purple-100 text-purple-600',
      'safety': 'bg-blue-100 text-blue-600',
      'storage': 'bg-emerald-100 text-emerald-600',
      'handling': 'bg-amber-100 text-amber-600',
    };
    return colors[category] || 'bg-primary/10 text-primary';
  };

  if (loading) {
    return (
      <DashboardLayout user={user} navItems={navItems} title="Training" subtitle="Member Portal" onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <GraduationCap className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} navItems={navItems} title="Training" subtitle="Member Portal" onLogout={handleLogout}>
      {/* Mobile Layout */}
      <div className="lg:hidden space-y-5" data-testid="training-mobile">
        {/* Stats - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <BookOpen className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{availableCourses.length}</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Play className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{inProgressEnrollments.length}</p>
            <p className="text-[10px] text-muted-foreground">In Progress</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Trophy className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{completedEnrollments.length}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Award className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">+{ariPointsEarned}</p>
            <p className="text-[10px] text-muted-foreground">ARI Points</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          {['available', 'progress', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-card shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              {tab === 'available' ? 'Browse' : tab === 'progress' ? 'My Courses' : 'Completed'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Course List */}
        <div className="space-y-3">
          {activeTab === 'available' && availableCourses.map((course) => {
            const IconComponent = getCourseIcon(course.category);
            return (
              <div
                key={course.course_id}
                className="bg-card rounded-xl p-4 border border-border active:scale-[0.98] transition-transform"
                onClick={() => { setSelectedCourse(course); setEnrollDialog(true); }}
              >
                <div className="flex gap-3">
                  <div className={`w-12 h-12 rounded-xl ${getCourseColor(course.category)} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm line-clamp-1">{course.name}</h4>
                      {course.compulsory && (
                        <Badge className="bg-red-100 text-red-700 text-[10px] flex-shrink-0">Required</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{course.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {course.duration_hours}h
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Award className="w-3 h-3" />
                        +{course.ari_boost} ARI
                      </span>
                      {course.cost > 0 && (
                        <span className="font-semibold text-foreground">${course.cost}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground self-center" />
                </div>
              </div>
            );
          })}

          {activeTab === 'progress' && inProgressEnrollments.map((enrollment) => (
            <div
              key={enrollment.enrollment_id}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Play className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm line-clamp-1">{enrollment.course_name || enrollment.course?.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{enrollment.progress || 0}%</span>
                  </div>
                  <Button 
                    size="sm" 
                    className="mt-3 w-full h-9"
                    onClick={() => handleComplete(enrollment.enrollment_id)}
                    disabled={processing}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark Complete'}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'completed' && completedEnrollments.map((enrollment) => (
            <div
              key={enrollment.enrollment_id}
              className="bg-card rounded-xl p-4 border border-border"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm line-clamp-1">{enrollment.course_name || enrollment.course?.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completed {new Date(enrollment.completed_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      +{enrollment.course?.ari_boost || 10} ARI
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mt-3 w-full h-9"
                    onClick={() => handleDownloadCertificate(enrollment.enrollment_id)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty States */}
          {activeTab === 'available' && availableCourses.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No courses available</p>
            </div>
          )}
          {activeTab === 'progress' && inProgressEnrollments.length === 0 && (
            <div className="text-center py-12">
              <Play className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No courses in progress</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => setActiveTab('available')}>
                Browse courses
              </Button>
            </div>
          )}
          {activeTab === 'completed' && completedEnrollments.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No completed courses yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block space-y-6" data-testid="training-desktop">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold">{availableCourses.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-primary/50" />
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
                <Play className="w-8 h-8 text-blue-500/50" />
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
                <Trophy className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ARI Earned</p>
                  <p className="text-2xl font-bold">+{ariPointsEarned}</p>
                </div>
                <Award className="w-8 h-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Tabs and Content */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                {['available', 'progress', 'completed'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'available' ? 'Available' : tab === 'progress' ? 'In Progress' : 'Completed'}
                  </Button>
                ))}
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {activeTab === 'available' && availableCourses.map((course) => {
                const IconComponent = getCourseIcon(course.category);
                return (
                  <Card 
                    key={course.course_id} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-t-4 border-t-primary"
                    onClick={() => { setSelectedCourse(course); setEnrollDialog(true); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg ${getCourseColor(course.category)} flex items-center justify-center`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{course.name}</h4>
                          {course.compulsory && <Badge className="bg-red-100 text-red-700 text-xs mt-1">Required</Badge>}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" /> {course.duration_hours}h
                        </span>
                        <span className="text-emerald-600 font-medium">+{course.ari_boost} ARI</span>
                        <span className="font-semibold">{course.cost > 0 ? `$${course.cost}` : 'Free'}</span>
                      </div>
                      <Button className="w-full mt-3" size="sm">Enroll Now</Button>
                    </CardContent>
                  </Card>
                );
              })}

              {activeTab === 'progress' && inProgressEnrollments.map((enrollment) => (
                <Card key={enrollment.enrollment_id}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm mb-2">{enrollment.course_name || enrollment.course?.name}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${enrollment.progress || 0}%` }} />
                      </div>
                      <span className="text-xs font-medium">{enrollment.progress || 0}%</span>
                    </div>
                    <Button className="w-full" size="sm" onClick={() => handleComplete(enrollment.enrollment_id)} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Course'}
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {activeTab === 'completed' && completedEnrollments.map((enrollment) => (
                <Card key={enrollment.enrollment_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                      <h4 className="font-semibold text-sm">{enrollment.course_name || enrollment.course?.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Completed {new Date(enrollment.completed_at).toLocaleDateString()}
                    </p>
                    <Button variant="outline" className="w-full" size="sm" onClick={() => handleDownloadCertificate(enrollment.enrollment_id)}>
                      <Download className="w-4 h-4 mr-2" /> Certificate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.name}</DialogTitle>
            <DialogDescription>{selectedCourse?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{selectedCourse?.duration_hours} hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ARI Boost</span>
              <span className="font-medium text-emerald-600">+{selectedCourse?.ari_boost} points</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-medium">{selectedCourse?.cost > 0 ? `$${selectedCourse?.cost}` : 'Free'}</span>
            </div>
            {selectedCourse?.compulsory && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700">This course is required for compliance</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialog(false)}>Cancel</Button>
            <Button onClick={() => handleEnroll(selectedCourse?.course_id)} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enroll Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TrainingCourses;
