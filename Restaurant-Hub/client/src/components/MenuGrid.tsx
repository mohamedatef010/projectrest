import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, ChefHat, Sparkles, MessageSquare } from "lucide-react";
import type { MenuItem, Category } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { MenuItemDetails } from "./forms/MenuItemDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useContactInfo } from "@/hooks/use-restaurant";

interface MenuGridProps {
  categories: Category[];
  items: MenuItem[];
  onItemClick?: (item: MenuItem) => void;
}

// دالة لتحويل عناصر القائمة
const normalizeMenuItem = (item: any): MenuItem => {
  return {
    ...item,
    isAvailable: item.isAvailable === undefined ? true : Boolean(item.isAvailable),
    isFeatured: Boolean(item.isFeatured),
    hasDiscount: Boolean(item.hasDiscount),
    price: Number(item.price) || 0,
    originalPrice: Number(item.originalPrice) || 0,
    discountPercentage: Number(item.discountPercentage) || 0,
    categoryId: Number(item.categoryId) || 0,
  };
};

export function MenuGrid({ categories, items, onItemClick }: MenuGridProps) {
  const { data: contactInfo } = useContactInfo();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // تحويل items إلى normalizedItems
  const normalizedItems = items.map(normalizeMenuItem);

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    if (onItemClick) {
      onItemClick(item);
    }
  };

  // تصفية العناصر المتاحة فقط
  const availableItems = normalizedItems.filter((item: MenuItem) => item.isAvailable);
  const featuredItems = availableItems.filter((item: MenuItem) => item.isFeatured);
  
  // تحقق من وجود فئات بها عناصر
  const categoriesWithItems = categories.filter(cat => 
    availableItems.some(item => item.categoryId === cat.id)
  );

  // ✅ **التعديل هنا**: دالة لحساب السعر بعد الخصم بشكل صحيح
  const getDisplayPrice = (item: MenuItem): {
    finalPrice: number;
    originalPrice: number;
    showDiscount: boolean;
  } => {
    const hasDiscount = item.hasDiscount && item.discountPercentage > 0;
    
    if (hasDiscount) {
      // السعر بعد الخصم مخزن في `item.price`
      // السعر الأصلي مخزن في `item.originalPrice`
      const originalPrice = item.originalPrice || item.price;
      const finalPrice = item.price; // السعر بعد الخصم مخزن بالفعل في price
      
      return {
        finalPrice: finalPrice,
        originalPrice: originalPrice,
        showDiscount: true
      };
    }
    
    // بدون خصم
    return {
      finalPrice: item.price,
      originalPrice: item.price,
      showDiscount: false
    };
  };

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

  // إذا لم تكن هناك عناصر، عرض رسالة
  if (availableItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-gradient-to-br from-secondary/20 to-primary/10 rounded-2xl border border-dashed border-border p-12">
          <Sparkles className="w-20 h-20 text-primary/30 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-foreground mb-4">Меню готовится</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            В данный момент нет доступных блюд в меню. 
            Администратор добавит новые блюда в ближайшее время.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Featured Items Section - إذا كان هناك عناصر مميزة */}
      {featuredItems.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold text-foreground">Рекомендуем попробовать</h3>
            </div>
            <Badge className="bg-primary/20 text-primary">Специальные предложения</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.slice(0, 3).map((item, index) => {
              const { finalPrice, originalPrice, showDiscount } = getDisplayPrice(item);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getSafeImageUrl(item.imageUrl)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80";
                      }}
                    />
                    {showDiscount && item.discountPercentage > 0 && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        -{item.discountPercentage}%
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="flex flex-col items-end">
                        {showDiscount ? (
                          <>
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(finalPrice)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              {formatCurrency(originalPrice)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(item.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2 hover:bg-primary hover:text-white transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Подробнее и заказать
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Menu by Categories */}
      <div className="mt-16 space-y-16">
        {categoriesWithItems
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
          .map(category => {
            const categoryItems = availableItems
              .filter(item => item.categoryId === category.id)
              .sort((a, b) => {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });

            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="scroll-mt-24" id={`category-${category.id}`}>
                <div className="mb-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary">
                      <ChefHat className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {category.name}
                        <span className="ml-3 text-base font-normal text-muted-foreground">
                          ({categoryItems.length} блюд)
                        </span>
                      </h3>
                      {category.description && (
                        <p className="text-muted-foreground mt-2">{category.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map((item, index) => {
                    const { finalPrice, originalPrice, showDiscount } = getDisplayPrice(item);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={getSafeImageUrl(item.imageUrl)}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80";
                            }}
                          />
                          {showDiscount && item.discountPercentage > 0 && (
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                              -{item.discountPercentage}%
                            </div>
                          )}
                          {item.isFeatured && (
                            <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/90 text-white">
                              <Sparkles className="w-3 h-3" />
                              Рекомендуем
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {item.name}
                            </h4>
                            <div className="flex flex-col items-end">
                              {showDiscount ? (
                                <>
                                  <span className="text-lg font-bold text-primary">
                                    {formatCurrency(finalPrice)}
                                  </span>
                                  <span className="text-sm text-muted-foreground line-through">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-primary">
                                  {formatCurrency(item.price)}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full gap-2 hover:bg-primary hover:text-white transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Подробнее и заказать
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Details Modal */}
      {selectedItem && contactInfo && (
        <MenuItemDetails
          item={selectedItem}
          contactInfo={{
            id: contactInfo.id || 1,
            phone: contactInfo.phone || '',
            address: contactInfo.address || '',
            email: contactInfo.email || '',
            openingHours: contactInfo.openingHours || '',
            whatsapp: contactInfo.whatsapp || '',
            mapEmbedUrl: contactInfo.mapEmbedUrl || '',
            socialLinks: contactInfo.socialLinks || { facebook: '', instagram: '' },
            createdAt: new Date(),
            updatedAt: new Date()
          }}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}