import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, Search, Filter, Grid, List, Star, ShoppingCart,
  Package, Truck, ChevronRight, Plus, Edit, Trash2, Eye,
  Tag, DollarSign, Box, Shield, CheckCircle, AlertCircle,
  Heart, Share2, ArrowLeft, X, Minus
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
import { Textarea } from "../components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from "sonner";

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
  
  // Dialogs
  const [productDialog, setProductDialog] = useState(false);
  const [cartDialog, setCartDialog] = useState(false);
  const [orderDialog, setOrderDialog] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="marketplace">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">AMMO Marketplace</h1>
                <p className="text-sm text-muted-foreground">Verified dealer products</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!isDealer && (
                <Button 
                  variant="outline" 
                  className="relative"
                  onClick={() => setCartDialog(true)}
                  data-testid="cart-btn"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid ${isDealer ? 'grid-cols-4' : 'grid-cols-2'} w-full max-w-md mb-6`}>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            {isDealer && <TabsTrigger value="my-products">My Products</TabsTrigger>}
            <TabsTrigger value="orders">{isDealer ? "Sales" : "My Orders"}</TabsTrigger>
            {isDealer && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          </TabsList>

          {/* BROWSE TAB */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search & Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
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
                          {cat.name} ({cat.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      className="w-24"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No products found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Card 
                    key={product.product_id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="aspect-square bg-muted/30 relative overflow-hidden">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                      {product.featured && (
                        <Badge className="absolute top-2 left-2 bg-primary">Featured</Badge>
                      )}
                      {product.sale_price && (
                        <Badge className="absolute top-2 right-2 bg-danger">Sale</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          {product.sale_price ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-danger">${product.sale_price.toFixed(2)}</span>
                              <span className="text-sm text-muted-foreground line-through">${product.price.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {product.category?.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        by {product.dealer_name}
                      </p>
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
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
          </TabsContent>

          {/* MY PRODUCTS TAB (Dealers) */}
          {isDealer && (
            <TabsContent value="my-products" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Product Listings</h2>
                <Button onClick={() => { resetProductForm(); setEditingProduct(null); setProductDialog(true); }} data-testid="add-product-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {myProducts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No products listed yet</p>
                  <p className="text-sm">Create your first product listing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myProducts.map((product) => (
                    <Card key={product.product_id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-muted/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="w-8 h-8 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{product.name}</h3>
                              <Badge variant={product.status === "active" ? "default" : "secondary"}>
                                {product.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="font-bold">${product.price.toFixed(2)}</span>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="space-y-6">
            <h2 className="text-lg font-semibold">{isDealer ? "Sales Orders" : "My Orders"}</h2>

            {myOrders.length === 0 ? (
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
                            <Badge variant={
                              order.status === "delivered" ? "success" :
                              order.status === "shipped" ? "default" :
                              order.status === "cancelled" ? "destructive" : "secondary"
                            }>
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
                      
                      <div className="space-y-2 mb-4">
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
                        <div className="flex gap-2">
                          {order.status === "pending" && (
                            <Button size="sm" onClick={() => handleUpdateOrderStatus(order.order_id, "confirmed")}>
                              Confirm
                            </Button>
                          )}
                          {order.status === "confirmed" && (
                            <Button size="sm" onClick={() => handleUpdateOrderStatus(order.order_id, "processing")}>
                              Process
                            </Button>
                          )}
                          {order.status === "processing" && (
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
            )}
          </TabsContent>

          {/* ANALYTICS TAB (Dealers) */}
          {isDealer && (
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-2xl font-bold">{myProducts.length}</p>
                      </div>
                      <Package className="w-8 h-8 text-primary opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold">{myOrders.length}</p>
                      </div>
                      <ShoppingBag className="w-8 h-8 text-success opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="text-2xl font-bold">
                          ${myOrders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-warning opacity-50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Views</p>
                        <p className="text-2xl font-bold">{myProducts.reduce((sum, p) => sum + (p.views || 0), 0)}</p>
                      </div>
                      <Eye className="w-8 h-8 text-info opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
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
                        <span className="text-2xl font-bold text-danger">${selectedProduct.sale_price.toFixed(2)}</span>
                        <span className="text-lg text-muted-foreground line-through">${selectedProduct.price.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-bold">${selectedProduct.price.toFixed(2)}</span>
                    )}
                  </div>
                  <Badge>{selectedProduct.category?.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Seller: {selectedProduct.dealer_name}</span>
                  <span>Stock: {selectedProduct.quantity_available}</span>
                </div>
                {selectedProduct.requires_license && (
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <Shield className="w-5 h-5 text-warning" />
                    <span className="text-sm">Valid firearm license required for purchase</span>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart ({cartItemCount} items)
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">${(item.sale_price || item.price).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-8 h-8"
                      onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-8 h-8"
                      onClick={() => handleUpdateCartQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-danger"
                    onClick={() => handleRemoveFromCart(item.product_id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span className="font-medium">${(cartTotal * 0.08).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${(cartTotal * 1.08).toFixed(2)}</span>
                </div>
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
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                <label className="text-sm font-medium">Stock Quantity</label>
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
                <label className="text-sm font-medium">Sale Price ($) - Optional</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Leave empty if no sale"
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
                Requires valid firearm license to purchase
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
              {editingProduct ? "Update" : "Create"} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
