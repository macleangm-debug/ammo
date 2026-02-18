import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Search, Filter, Grid, Star, ShoppingCart,
  Package, Truck, ChevronRight, Plus, Edit, Trash2, Eye,
  Tag, DollarSign, Box, Shield, CheckCircle, AlertCircle,
  Heart, X, Minus,
  LayoutDashboard, CreditCard, GraduationCap, History, Bell, Settings,
  Loader2, SlidersHorizontal
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
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
import { Textarea } from "../components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const Marketplace = ({ user, api }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [cartDialog, setCartDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "accessory",
    price: 0,
    sale_price: null,
    quantity_available: 0,
    requires_license: false
  });

  const isDealer = user?.role === "dealer";
  const isAdmin = user?.role === "admin";

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      if (priceRange.min) params.append("min_price", priceRange.min);
      if (priceRange.max) params.append("max_price", priceRange.max);
      params.append("page", currentPage);
      params.append("limit", 12);
      
      const response = await api.get(`/marketplace/products?${params.toString()}`);
      setProducts(response.data.products || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
      if (error.response?.status === 403) {
        toast.error("Active license required to access marketplace");
      }
    }
  }, [api, searchQuery, selectedCategory, priceRange, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/marketplace/categories");
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMyProducts = async () => {
    if (!isDealer) return;
    try {
      const response = await api.get("/marketplace/my-products");
      setMyProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching my products:", error);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const response = await api.get("/marketplace/my-orders");
      setMyOrders(response.data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchProducts(), fetchCategories()]);
      if (isDealer) await fetchMyProducts();
      await fetchMyOrders();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAddToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.product_id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.product_id 
          ? {...item, quantity: item.quantity + 1}
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleUpdateCartQuantity = (productId, quantity) => {
    if (quantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.product_id === productId 
        ? {...item, quantity}
        : item
    ));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    
    setProcessing(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));
      
      const response = await api.post("/marketplace/orders", { items });
      toast.success(`Order placed! Total: $${response.data.total.toFixed(2)}`);
      setCart([]);
      setCartDialog(false);
      fetchMyOrders();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateProduct = async () => {
    setProcessing(true);
    try {
      if (editingProduct) {
        await api.put(`/marketplace/products/${editingProduct.product_id}`, newProduct);
        toast.success("Product updated");
      } else {
        await api.post("/marketplace/products", newProduct);
        toast.success("Product created");
      }
      setProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      fetchMyProducts();
      fetchProducts();
    } catch (error) {
      toast.error("Failed to save product");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to remove this product?")) return;
    
    try {
      await api.delete(`/marketplace/products/${productId}`);
      toast.success("Product removed");
      fetchMyProducts();
      fetchProducts();
    } catch (error) {
      toast.error("Failed to remove product");
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/marketplace/orders/${orderId}/status`, { status });
      toast.success(`Order ${status}`);
      fetchMyOrders();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      sale_price: product.sale_price,
      quantity_available: product.quantity_available,
      requires_license: product.requires_license
    });
    setProductDialog(true);
  };

  const resetProductForm = () => {
    setNewProduct({
      name: "",
      description: "",
      category: "accessory",
      price: 0,
      sale_price: null,
      quantity_available: 0,
      requires_license: false
    });
  };

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.sale_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'license', path: '/dashboard/license', label: 'My License', icon: CreditCard },
    { id: 'training', path: '/training', label: 'Training', icon: GraduationCap },
    { id: 'marketplace', path: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'history', path: '/dashboard/history', label: 'History', icon: History },
  ];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'firearm': Shield,
      'ammunition': Box,
      'accessory': Tag,
      'safety_equipment': Shield,
      'storage': Package,
      'training_material': GraduationCap,
    };
    return icons[category] || Package;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'firearm': 'bg-red-100 text-red-600',
      'ammunition': 'bg-blue-100 text-blue-600',
      'accessory': 'bg-purple-100 text-purple-600',
      'safety_equipment': 'bg-emerald-100 text-emerald-600',
      'storage': 'bg-amber-100 text-amber-600',
      'training_material': 'bg-cyan-100 text-cyan-600',
    };
    return colors[category] || 'bg-gray-100 text-gray-600';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      processing: 'bg-purple-100 text-purple-700',
      shipped: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <DashboardLayout 
        user={user} 
        navItems={navItems} 
        title="Marketplace"
        subtitle="Member Portal"
        onLogout={handleLogout}
      >
        <div className="flex items-center justify-center h-64">
          <ShoppingBag className="w-12 h-12 text-primary animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      user={user} 
      navItems={navItems} 
      title="Marketplace"
      subtitle="Member Portal"
      onLogout={handleLogout}
    >
      {/* Mobile Layout */}
      <div className="lg:hidden space-y-5" data-testid="marketplace-mobile">
        {/* Stats - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Package className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <ShoppingCart className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{cartItemCount}</p>
            <p className="text-[10px] text-muted-foreground">In Cart</p>
          </div>
          <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
            <Truck className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{myOrders.length}</p>
            <p className="text-[10px] text-muted-foreground">Orders</p>
          </div>
          {isDealer && (
            <div className="flex-shrink-0 w-28 bg-card rounded-xl p-3 border border-border text-center">
              <DollarSign className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{myProducts.length}</p>
              <p className="text-[10px] text-muted-foreground">Listings</p>
            </div>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'browse' 
                ? 'bg-card shadow-sm text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            Browse
          </button>
          {isDealer && (
            <button
              onClick={() => setActiveTab('my-products')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'my-products' 
                  ? 'bg-card shadow-sm text-foreground' 
                  : 'text-muted-foreground'
              }`}
            >
              My Listings
            </button>
          )}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders' 
                ? 'bg-card shadow-sm text-foreground' 
                : 'text-muted-foreground'
            }`}
          >
            Orders
          </button>
        </div>

        {/* Browse Tab Content */}
        {activeTab === 'browse' && (
          <>
            {/* Search & Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card"
                />
              </div>
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="flex-shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Filter Products</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} ({cat.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Price Range</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => setShowFilters(false)}>
                      Apply Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Category Quick Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <button 
                onClick={() => setSelectedCategory("")}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedCategory ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                All
              </button>
              {categories.slice(0, 5).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const IconComponent = getCategoryIcon(product.category);
                  return (
                    <div
                      key={product.product_id}
                      className="bg-card rounded-xl border border-border overflow-hidden active:scale-[0.98] transition-transform"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* Product Image/Placeholder */}
                      <div className="aspect-square bg-muted/30 relative flex items-center justify-center">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl ${getCategoryColor(product.category)} flex items-center justify-center`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                        )}
                        {product.sale_price && (
                          <Badge className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-1.5">
                            Sale
                          </Badge>
                        )}
                      </div>
                      {/* Product Info */}
                      <div className="p-3">
                        <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{product.dealer_name}</p>
                        <div className="flex items-center justify-between mt-2">
                          {product.sale_price ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-bold text-red-500">${product.sale_price}</span>
                              <span className="text-[10px] text-muted-foreground line-through">${product.price}</span>
                            </div>
                          ) : (
                            <span className="text-sm font-bold">${product.price}</span>
                          )}
                          {!isDealer && (
                            <button
                              className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-transform"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              disabled={product.quantity_available < 1}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* My Products Tab (Dealers) */}
        {activeTab === 'my-products' && isDealer && (
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => { resetProductForm(); setEditingProduct(null); setProductDialog(true); }}
              data-testid="add-product-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
            
            {myProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No products listed</p>
              </div>
            ) : (
              myProducts.map((product) => (
                <div key={product.product_id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                        <Badge variant={product.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {product.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">${product.price}</span>
                        <span>Stock: {product.quantity_available}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {product.views || 0}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => openEditProduct(product)}>
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8" onClick={() => handleDeleteProduct(product.product_id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {myOrders.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No orders yet</p>
                <Button variant="link" className="text-primary mt-2" onClick={() => setActiveTab('browse')}>
                  Browse products
                </Button>
              </div>
            ) : (
              myOrders.map((order) => (
                <div key={order.order_id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{order.order_id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 border-t border-border pt-3">
                    {order.items?.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{item.name} x{item.quantity}</span>
                        <span className="font-medium">${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {order.items?.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{order.items.length - 2} more</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold">${order.total?.toFixed(2)}</span>
                  </div>
                  {isDealer && order.status !== "delivered" && order.status !== "cancelled" && (
                    <div className="flex gap-2 mt-3">
                      {order.status === "pending" && (
                        <Button size="sm" className="flex-1" onClick={() => handleUpdateOrderStatus(order.order_id, "confirmed")}>
                          Confirm
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button size="sm" className="flex-1" onClick={() => handleUpdateOrderStatus(order.order_id, "shipped")}>
                          Ship
                        </Button>
                      )}
                      {order.status === "shipped" && (
                        <Button size="sm" className="flex-1" onClick={() => handleUpdateOrderStatus(order.order_id, "delivered")}>
                          Delivered
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Floating Cart Button */}
        {!isDealer && cartItemCount > 0 && (
          <div className="fixed bottom-20 right-4 z-30">
            <Button 
              size="lg"
              className="rounded-full shadow-lg h-14 px-5"
              onClick={() => setCartDialog(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              ${cartTotal.toFixed(2)}
              <Badge className="ml-2 bg-white/20">{cartItemCount}</Badge>
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block space-y-6" data-testid="marketplace-desktop">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Products</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
                <Package className="w-8 h-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Cart</p>
                  <p className="text-2xl font-bold">{cartItemCount}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-2xl font-bold">{myOrders.length}</p>
                </div>
                <Truck className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>
          {isDealer ? (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">My Listings</p>
                    <p className="text-2xl font-bold">{myProducts.length}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCartDialog(true)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Cart Total</p>
                    <p className="text-2xl font-bold">${cartTotal.toFixed(2)}</p>
                  </div>
                  <Button size="sm">Checkout</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Desktop Tabs and Content */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <Button
                  variant={activeTab === 'browse' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('browse')}
                >
                  Browse
                </Button>
                {isDealer && (
                  <Button
                    variant={activeTab === 'my-products' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveTab('my-products')}
                  >
                    My Products
                  </Button>
                )}
                <Button
                  variant={activeTab === 'orders' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('orders')}
                >
                  {isDealer ? 'Sales' : 'My Orders'}
                </Button>
              </div>
              
              {activeTab === 'browse' && (
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {activeTab === 'my-products' && isDealer && (
                <Button onClick={() => { resetProductForm(); setEditingProduct(null); setProductDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>

            {/* Browse Tab */}
            {activeTab === 'browse' && (
              products.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {products.map((product) => {
                    const IconComponent = getCategoryIcon(product.category);
                    return (
                      <Card 
                        key={product.product_id} 
                        className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="aspect-square bg-muted/30 flex items-center justify-center relative">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-16 h-16 rounded-xl ${getCategoryColor(product.category)} flex items-center justify-center`}>
                              <IconComponent className="w-8 h-8" />
                            </div>
                          )}
                          {product.sale_price && (
                            <Badge className="absolute top-2 right-2 bg-red-500">Sale</Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">by {product.dealer_name}</p>
                          <div className="flex items-center justify-between mt-3">
                            {product.sale_price ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-red-500">${product.sale_price}</span>
                                <span className="text-xs text-muted-foreground line-through">${product.price}</span>
                              </div>
                            ) : (
                              <span className="font-bold">${product.price}</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {product.category?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {!isDealer && (
                            <Button 
                              className="w-full mt-3" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              disabled={product.quantity_available < 1}
                            >
                              {product.quantity_available < 1 ? "Out of Stock" : "Add to Cart"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )
            )}

            {/* My Products Tab */}
            {activeTab === 'my-products' && isDealer && (
              myProducts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No products listed yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProducts.map((product) => (
                    <div key={product.product_id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{product.name}</h3>
                          <Badge variant={product.status === "active" ? "default" : "secondary"}>
                            {product.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-bold">${product.price}</span>
                          <span className="text-muted-foreground">Stock: {product.quantity_available}</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {product.views || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditProduct(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.product_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              myOrders.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Truck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <Card key={order.order_id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm">{order.order_id}</span>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${order.total?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{order.items?.length} item(s)</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{item.name} x{item.quantity}</span>
                              <span>${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>
                          )}
                        </div>
                        
                        {isDealer && order.status !== "delivered" && order.status !== "cancelled" && (
                          <div className="flex gap-2 mt-4">
                            {order.status === "pending" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(order.order_id, "confirmed")}>
                                Confirm
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(order.order_id, "shipped")}>
                                Ship
                              </Button>
                            )}
                            {order.status === "shipped" && (
                              <Button size="sm" onClick={() => handleUpdateOrderStatus(order.order_id, "delivered")}>
                                Mark Delivered
                              </Button>
                            )}
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateOrderStatus(order.order_id, "cancelled")}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md mx-4">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground/30" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    {selectedProduct.sale_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-red-500">${selectedProduct.sale_price}</span>
                        <span className="text-lg text-muted-foreground line-through">${selectedProduct.price}</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold">${selectedProduct.price}</span>
                    )}
                  </div>
                  <Badge>{selectedProduct.category?.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Seller: {selectedProduct.dealer_name}</span>
                  <span>Stock: {selectedProduct.quantity_available}</span>
                </div>
                {selectedProduct.requires_license && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-amber-800">Valid license required</span>
                  </div>
                )}
              </div>
              {!isDealer && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                    Close
                  </Button>
                  <Button 
                    onClick={() => {
                      handleAddToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.quantity_available < 1}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={cartDialog} onOpenChange={setCartDialog}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cartItemCount})
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-14 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">${(item.sale_price || item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-7 h-7"
                      onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-7 h-7"
                      onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-500 w-7 h-7"
                    onClick={() => handleRemoveFromCart(item.product_id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {cart.length > 0 && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>${(cartTotal * 0.08).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(cartTotal * 1.08).toFixed(2)}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartDialog(false)}>
              Continue Shopping
            </Button>
            <Button 
              onClick={handlePlaceOrder}
              disabled={cart.length === 0 || processing}
              data-testid="place-order-btn"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input
                placeholder="e.g., Premium Gun Safe"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Product description..."
                value={newProduct.description}
                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select 
                  value={newProduct.category} 
                  onValueChange={(v) => setNewProduct({...newProduct, category: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="firearm">Firearm</SelectItem>
                    <SelectItem value="ammunition">Ammunition</SelectItem>
                    <SelectItem value="accessory">Accessory</SelectItem>
                    <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                    <SelectItem value="storage">Storage</SelectItem>
                    <SelectItem value="training_material">Training Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock</label>
                <Input
                  type="number"
                  value={newProduct.quantity_available}
                  onChange={(e) => setNewProduct({...newProduct, quantity_available: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sale Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={newProduct.sale_price || ""}
                  onChange={(e) => setNewProduct({...newProduct, sale_price: e.target.value ? parseFloat(e.target.value) : null})}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <input
                type="checkbox"
                id="requires_license"
                checked={newProduct.requires_license}
                onChange={(e) => setNewProduct({...newProduct, requires_license: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="requires_license" className="text-sm font-medium">
                Requires valid license
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProduct}
              disabled={processing || !newProduct.name || !newProduct.description || newProduct.price <= 0}
              data-testid="submit-product-btn"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingProduct ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Marketplace;
