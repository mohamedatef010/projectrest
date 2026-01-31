// pages/admin/MenuManagement.tsx
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { 
  useCategories, useMenuItems, 
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem 
} from "@/hooks/use-restaurant";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2, Check, X, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { MenuItemForm } from "@/components/forms/MenuItemForm";
import { formatCurrency } from "@/lib/utils";
import type { Category, MenuItem } from "@shared/schema";

export default function MenuManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("items");
  
  // Data
  const { data: categories = [], isLoading: isCatLoading, refetch: refetchCategories } = useCategories();
  const { data: menuItems = [], refetch: refetchMenuItems } = useMenuItems();
  
  // Mutations
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  
  const createItem = useCreateMenuItem();
  const updateItem = useCreateMenuItem();
  const deleteItem = useDeleteMenuItem();

  // State for dialogs
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isItemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'item', id: number } | null>(null);

  // دالة لتحويل عناصر القائمة
  const normalizeMenuItem = (item: any): MenuItem => {
    return {
      ...item,
      id: Number(item.id) || 0,
      name: item.name || '',
      description: item.description || '',
      details: item.details || '',
      price: Number(item.price) || 0,
      originalPrice: Number(item.originalPrice) || 0,
      categoryId: Number(item.categoryId) || 0,
      isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
      isFeatured: item.isFeatured !== undefined ? Boolean(item.isFeatured) : false,
      hasDiscount: item.hasDiscount !== undefined ? Boolean(item.hasDiscount) : false,
      discountPercentage: Number(item.discountPercentage) || 0,
      imageUrl: item.imageUrl || item.image_url || '',
      createdAt: item.createdAt || new Date(),
      updatedAt: item.updatedAt || new Date(),
    };
  };

  // تحويل menuItems إلى normalizedItems
  const normalizedItems = menuItems?.map(normalizeMenuItem) || [];

  // دالة للحصول على رابط صورة آمن
  const getSafeImageUrl = (url?: string): string => {
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
      return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80";
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    
    return url;
  };

  // Debug effect
  useEffect(() => {
    console.log('🔄 Categories in MenuManagement:', categories);
    console.log('📊 Number of categories:', categories.length);
    console.log('📦 Menu Items (original):', menuItems);
    console.log('📦 Menu Items (normalized):', normalizedItems);
    console.log('🖼️ Items with images:', normalizedItems.filter((item: { imageUrl: any; }) => item.imageUrl));
  }, [categories, menuItems, normalizedItems]);

  // Handlers
  const handleCategorySubmit = async (data: any) => {
    try {
      console.log('📤 Submitting category:', data);
      
      if (editingCategory) {
        const result = await updateCategory.mutateAsync({ id: editingCategory.id, ...data });
        toast({ 
          title: "✅ Success", 
          description: "Category updated successfully" 
        });
        console.log('✅ Category updated:', result);
      } else {
        const result = await createCategory.mutateAsync(data);
        toast({ 
          title: "✅ Success", 
          description: "Category created successfully" 
        });
        console.log('✅ Category created:', result);
      }
      
      // Close dialog and reset
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      
      // Manually refetch categories
      setTimeout(() => {
        refetchCategories();
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error saving category:', error);
      toast({ 
        title: "❌ Error", 
        description: error.message || "Failed to save category", 
        variant: "destructive" 
      });
    }
  };

  const handleItemSubmit = async (data: any) => {
    try {
      console.log('📤 Submitting item:', data);
      
      if (editingItem) {
        const result = await updateItem.mutateAsync({ id: editingItem.id, ...data });
        toast({ 
          title: "✅ Success", 
          description: "Item updated successfully" 
        });
        console.log('✅ Item updated:', result);
      } else {
        const result = await createItem.mutateAsync(data);
        toast({ 
          title: "✅ Success", 
          description: "Item created successfully" 
        });
        console.log('✅ Item created:', result);
      }
      
      setItemDialogOpen(false);
      setEditingItem(null);
      
      // تحديث قائمة العناصر
      setTimeout(() => {
        refetchMenuItems();
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error saving item:', error);
      toast({ 
        title: "❌ Error", 
        description: error.message || "Failed to save item", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === 'category') {
        await deleteCategory.mutateAsync(itemToDelete.id);
        toast({ 
          title: "✅ Success", 
          description: "Category deleted" 
        });
        refetchCategories();
      } else {
        await deleteItem.mutateAsync(itemToDelete.id);
        toast({ 
          title: "✅ Success", 
          description: "Item deleted" 
        });
        refetchMenuItems();
      }
    } catch (error: any) {
      toast({ 
        title: "❌ Error", 
        description: error.message || "Failed to delete", 
        variant: "destructive" 
      });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  // Refresh categories button
  const handleRefreshCategories = () => {
    console.log('🔄 Manually refreshing categories...');
    refetchCategories();
    refetchMenuItems();
    toast({
      title: "🔍 Refreshing",
      description: "Categories and items are being refreshed",
      duration: 1500,
    });
  };

  return (
    <AdminLayout>
      {/* Debug Header */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Status: {isCatLoading ? "Loading..." : `${categories.length} categories, ${normalizedItems.length} items`}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshCategories}
            className="text-blue-700 border-blue-300 hover:bg-blue-100 text-xs sm:text-sm"
          >
            Refresh All Data
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 px-4 sm:px-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Menu Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your categories and dishes.</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
           <Button 
             onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
             className="w-full sm:w-auto text-sm sm:text-base"
           >
             <Plus className="w-4 h-4 mr-2" /> Add Category
           </Button>
           <Button 
             variant="default" 
             className="bg-primary text-primary-foreground w-full sm:w-auto text-sm sm:text-base" 
             onClick={() => { setEditingItem(null); setItemDialogOpen(true); }}
             disabled={categories.length === 0}
           >
             <Plus className="w-4 h-4 mr-2" /> Add Item
           </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-full sm:max-w-md grid-cols-2 mb-8 mx-4 sm:mx-0">
          <TabsTrigger value="items" className="text-sm sm:text-base">Items</TabsTrigger>
          <TabsTrigger value="categories" className="text-sm sm:text-base">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6 px-4 sm:px-0">
          {categories.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-6 sm:p-8 text-center">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No Categories Available</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  You need to create at least one category before adding menu items.
                </p>
                <Button 
                  onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
                  className="text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            categories.map((cat) => {
              const catItems = normalizedItems.filter((i: MenuItem) => i.categoryId === cat.id);
              if (catItems.length === 0) {
                return (
                  <div key={cat.id} className="mb-8">
                    <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                      {cat.name}
                      <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        0 items
                      </span>
                    </h3>
                    <Card className="bg-gray-50 border-dashed">
                      <CardContent className="p-4 sm:p-6 text-center">
                        <p className="text-gray-500 text-sm sm:text-base">No items in this category yet.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 text-xs sm:text-sm"
                          onClick={() => { 
                            setEditingItem({ 
                              ...{} as MenuItem, 
                              categoryId: cat.id 
                            }); 
                            setItemDialogOpen(true); 
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add Item to {cat.name}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              return (
                <div key={cat.id}>
                  <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                    {cat.name}
                    <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {catItems.length} items
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catItems.map((item: MenuItem) => (
                      <Card key={item.id} className="bg-card border-border/50 hover:border-primary/50 transition-colors overflow-hidden">
                        <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-secondary/20 to-primary/10">
                          {item.imageUrl ? (
                            <img
                              src={getSafeImageUrl(item.imageUrl)}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.src = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3 sm:p-4">
                           <div className="flex justify-between items-start">
                             <div className="max-w-[70%]">
                               <h4 className="font-bold text-foreground text-sm sm:text-base truncate">{item.name}</h4>
                               <p className="text-sm font-medium text-primary mb-2">{formatCurrency(item.price)}</p>
                             </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingItem(item); setItemDialogOpen(true); }}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => { setItemToDelete({ type: 'item', id: item.id }); setDeleteConfirmOpen(true); }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                           {item.description && (
                             <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                               {item.description}
                             </p>
                           )}
                           <div className="flex flex-wrap gap-2">
                             <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${item.isAvailable ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {item.isAvailable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                {item.isAvailable ? 'Available' : 'Unavailable'}
                             </span>
                             {item.isFeatured && (
                               <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                                 <Check className="w-3 h-3" /> Featured
                               </span>
                             )}
                             {item.hasDiscount && item.discountPercentage > 0 && (
                               <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                                 -{item.discountPercentage}%
                               </span>
                             )}
                           </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 px-4 sm:px-0">
          {categories.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-6 sm:p-8 text-center">
                <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-2">No Categories Yet</h3>
                <p className="text-muted-foreground text-sm sm:text-base mb-4">
                  Create your first category to organize menu items.
                </p>
                <Button 
                  onClick={() => { setEditingCategory(null); setCategoryDialogOpen(true); }}
                  className="text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create First Category
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {categories.map((cat, i) => (
                    <div 
                      key={cat.id} 
                      className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                        i === 0 ? 'rounded-t-lg' : ''
                      } ${
                        i === categories.length - 1 ? 'rounded-b-lg' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{cat.name.charAt(0)}</span>
                        </div>
                        <div className="max-w-[70%] sm:max-w-none">
                          <span className="font-medium text-gray-900 text-sm sm:text-base">{cat.name}</span>
                          {cat.description && (
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">{cat.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setEditingCategory(cat); setCategoryDialogOpen(true); }}
                          className="text-gray-600 hover:text-primary h-8 w-8 p-0"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-600 hover:text-red-600 h-8 w-8 p-0"
                          onClick={() => { setItemToDelete({ type: 'category', id: cat.id }); setDeleteConfirmOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-[95%] sm:max-w-md mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">Create categories to organize your menu items.</DialogDescription>
          </DialogHeader>
          <CategoryForm 
            defaultValues={editingCategory || undefined}
            onSubmit={handleCategorySubmit}
            isSubmitting={createCategory.isPending || updateCategory.isPending}
            onCancel={() => setCategoryDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isItemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-[95%] sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{editingItem ? 'Edit Menu Item' : 'New Menu Item'}</DialogTitle>
          </DialogHeader>
          <MenuItemForm 
            categories={categories}
            defaultValues={editingItem || undefined}
            onSubmit={handleItemSubmit}
            isSubmitting={createItem.isPending || updateItem.isPending}
            onCancel={() => setItemDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-[95%] sm:max-w-md mx-4 sm:mx-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              This action cannot be undone. 
              {itemToDelete?.type === 'category' && " Deleting a category might hide associated items."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm sm:text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground text-sm sm:text-base">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}