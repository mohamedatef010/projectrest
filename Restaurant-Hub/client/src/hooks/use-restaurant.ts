// src/hooks/use-restaurant.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { 
  InsertCategory, 
  InsertMenuItem, 
  InsertContactInfo,
  InsertOrder,
  Category,
  MenuItem,
  ContactInfo,
  Order,
  MenuImage,
  SiteImage,
  InsertMenuImage,
  InsertSiteImage
} from "@shared/schema";

// ============================================
// Categories Hooks
// ============================================

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: [api.categories.list.path],
    queryFn: async () => {
      try {
        console.log('📡 Fetching categories from:', api.categories.list.path);
        const res = await fetch(api.categories.list.path);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error fetching categories:', errorText);
          throw new Error(`Не удалось загрузить категории: ${res.status} ${res.statusText}`);
        }
        
        const rawData = await res.json();
        console.log('📊 Raw categories response:', rawData);
        
        // ✅ معالجة الاستجابة الصحيحة من Backend
        if (rawData && rawData.success !== undefined) {
          // Backend يرسل: { success: true, data: [...] }
          return rawData.data || [];
        } else if (Array.isArray(rawData)) {
          // إذا كانت البيانات مصفوفة مباشرة
          return rawData;
        } else {
          console.warn('⚠️ Unexpected categories response format:', rawData);
          return [];
        }
      } catch (error) {
        console.error('❌ Error in useCategories:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 دقائق
    retry: 2,
    retryDelay: 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCategory) => {
      const validated = api.categories.create.input.parse(data);
      const res = await fetch(api.categories.create.path, {
        method: api.categories.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось создать категорию: ${error}`);
      }
      
      const responseData = await res.json();
      
      // ✅ معالجة الاستجابة من Backend
      if (responseData && responseData.success) {
        return responseData.data; // إرجاع البيانات فقط
      }
      return responseData;
    },
    onSuccess: (newCategory) => {
      console.log('✅ Category created successfully:', newCategory);
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      
      // ✅ تحديث البيانات المحلية مباشرة (للتحديث الفوري)
      queryClient.setQueryData<Category[]>([api.categories.list.path], (oldData = []) => {
        return [...oldData, newCategory];
      });
    },
    onError: (error) => {
      console.error('❌ Error creating category:', error);
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertCategory>) => {
      const validated = api.categories.update.input.parse(updates);
      const url = buildUrl(api.categories.update.path, { id });
      const res = await fetch(url, {
        method: api.categories.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось обновить категорию: ${error}`);
      }
      
      const responseData = await res.json();
      
      // ✅ معالجة الاستجابة
      if (responseData && responseData.success) {
        return responseData.data;
      }
      return responseData;
    },
    onSuccess: (updatedCategory, variables) => {
      console.log('✅ Category updated successfully:', updatedCategory);
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      
      // ✅ تحديث البيانات المحلية
      queryClient.setQueryData<Category[]>([api.categories.list.path], (oldData = []) => {
        return oldData.map(cat => 
          cat.id === variables.id ? { ...cat, ...updatedCategory } : cat
        );
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.categories.delete.path, { id });
      const res = await fetch(url, {
        method: api.categories.delete.method,
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось удалить категорию: ${error}`);
      }
      
      const responseData = await res.json();
      return responseData;
    },
    onSuccess: (_, id) => {
      console.log('✅ Category deleted successfully:', id);
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
      
      // ✅ إزالة البيانات المحلية
      queryClient.setQueryData<Category[]>([api.categories.list.path], (oldData = []) => {
        return oldData.filter(cat => cat.id !== id);
      });
      
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    },
  });
}

// ============================================
// Menu Items Hooks
// ============================================

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
    // ✅ إضافة أي حقول أخرى إذا لزم الأمر
  };
};

export function useMenuItems() {
  return useQuery({
    queryKey: [api.menuItems.list.path],
    queryFn: async () => {
      try {
        console.log('📡 Fetching menu items from:', api.menuItems.list.path);
        const res = await fetch(api.menuItems.list.path);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error fetching menu items:', errorText);
          throw new Error(`Не удалось загрузить блюда: ${res.status} ${res.statusText}`);
        }
        
        const rawData = await res.json();
        console.log('📊 Raw menu items response:', rawData);
        
        // ✅ معالجة الاستجابة من Backend
        if (rawData && rawData.success !== undefined) {
          // Backend يرسل: { success: true, data: [...] }
          const items = rawData.data || [];
          console.log(`✅ Retrieved ${items.length} menu items from backend`);
          return items.map(normalizeMenuItem);
        } else if (Array.isArray(rawData)) {
          // إذا كانت البيانات مصفوفة مباشرة
          console.log(`✅ Retrieved ${rawData.length} menu items (direct array)`);
          return rawData.map(normalizeMenuItem);
        } else {
          console.warn('⚠️ Unexpected menu items response format:', rawData);
          return [];
        }
      } catch (error) {
        console.error('❌ Error in useMenuItems:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 دقائق
    retry: 2,
    retryDelay: 1000,
  });
}

export function useMenuItem(id: number) {
  return useQuery({
    queryKey: [`/api/menu-items/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/menu-items/${id}`);
      if (!res.ok) throw new Error("Не удалось загрузить блюдо");
      return res.json() as Promise<MenuItem>;
    },
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      const validated = api.menuItems.create.input.parse(data);
      const res = await fetch(api.menuItems.create.path, {
        method: api.menuItems.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось создать блюдо: ${error}`);
      }
      return api.menuItems.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertMenuItem>) => {
      const validated = api.menuItems.update.input.parse(updates);
      const url = buildUrl(api.menuItems.update.path, { id });
      const res = await fetch(url, {
        method: api.menuItems.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось обновить блюдо: ${error}`);
      }
      return api.menuItems.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.menuItems.delete.path, { id });
      const res = await fetch(url, {
        method: api.menuItems.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось удалить блюдо: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    },
  });
}

// ============================================
// Contact Info Hooks
// ============================================

export function useContactInfo() {
  return useQuery<ContactInfo | null>({
    queryKey: [api.contactInfo.get.path],
    queryFn: async () => {
      try {
        console.log('📡 Fetching contact info from:', api.contactInfo.get.path);
        const res = await fetch(api.contactInfo.get.path);
        
        if (res.status === 404) {
          console.log('ℹ️ No contact info found (404)');
          return null;
        }
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error fetching contact info:', errorText);
          throw new Error(`Не удалось загрузить контактную информацию: ${res.status} ${res.statusText}`);
        }
        
        const rawData = await res.json();
        console.log('📊 Raw API response:', rawData);
        
        let contactData = rawData;
        
        if (rawData.success && rawData.data) {
          contactData = rawData.data;
        }
        
        // ✅ حفظ البيانات الأصلية للتصحيح
        const originalData = { ...contactData };
        
        // ✅ DEBUG LOG - التحقق من البيانات المستلمة
        console.log('📊 contactData from API:', contactData);
        console.log('📊 contactData keys:', Object.keys(contactData));
        
        // البحث عن حقول أيام الأسبوع بكل التنسيقات الممكنة
        console.log('🔍 Searching for weekday hours fields:');
        
        // إنشاء كائن لتخزين ساعات العمل
        const weekHours: {[key: string]: string} = {};
        
        // قائمة أيام الأسبوع مع تنسيقات محتملة
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const suffixes = ['Hours', 'hours', '_hours'];
        
        // البحث عن كل حقل يوم بأي تنسيق
        days.forEach(day => {
          let foundValue = '';
          
          // تحقق من جميع التنسيقات الممكنة
          for (const suffix of suffixes) {
            const camelCaseKey = `${day}${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`;
            const snakeCaseKey = `${day}_${suffix === 'Hours' ? 'hours' : suffix}`;
            const lowerCaseKey = `${day}${suffix}`.toLowerCase();
            
            if (contactData?.[camelCaseKey]) {
              foundValue = contactData[camelCaseKey];
              console.log(`✅ Found ${day}: ${camelCaseKey} = "${foundValue}"`);
              break;
            } else if (contactData?.[snakeCaseKey]) {
              foundValue = contactData[snakeCaseKey];
              console.log(`✅ Found ${day}: ${snakeCaseKey} = "${foundValue}"`);
              break;
            } else if (contactData?.[lowerCaseKey]) {
              foundValue = contactData[lowerCaseKey];
              console.log(`✅ Found ${day}: ${lowerCaseKey} = "${foundValue}"`);
              break;
            }
          }
          
          weekHours[day] = foundValue || '';
        });
        
        console.log('📊 Extracted week hours:', weekHours);
        
        // معالجة socialLinks
        let socialLinks = { 
          facebook: '', 
          instagram: '', 
          vk: '', 
          mailru: '', 
          ozon: '' 
        };
        
        if (contactData?.socialLinks) {
          if (typeof contactData.socialLinks === 'string') {
            try {
              socialLinks = JSON.parse(contactData.socialLinks);
            } catch (error) {
              console.warn('⚠️ Failed to parse socialLinks string:', error);
            }
          } else {
            socialLinks = {
              facebook: contactData.socialLinks.facebook || '',
              instagram: contactData.socialLinks.instagram || '',
              vk: contactData.socialLinks.vk || '',
              mailru: contactData.socialLinks.mailru || '',
              ozon: contactData.socialLinks.ozon || ''
            };
          }
        }
        
        // بناء كائن النتيجة النهائية مع جميع الحقول المطلوبة
        const result = {
          id: 1,
          phone: contactData?.phone || '',
          address: contactData?.address || '',
          email: contactData?.email || '',
          openingHours: contactData?.openingHours || contactData?.opening_hours || '',
          // قراءة الحقول من جميع التنسيقات الممكنة
          mondayHours: contactData?.mondayHours || contactData?.monday_hours || weekHours.monday || '',
          tuesdayHours: contactData?.tuesdayHours || contactData?.tuesday_hours || weekHours.tuesday || '',
          wednesdayHours: contactData?.wednesdayHours || contactData?.wednesday_hours || weekHours.wednesday || '',
          thursdayHours: contactData?.thursdayHours || contactData?.thursday_hours || weekHours.thursday || '',
          fridayHours: contactData?.fridayHours || contactData?.friday_hours || weekHours.friday || '',
          saturdayHours: contactData?.saturdayHours || contactData?.saturday_hours || weekHours.saturday || '',
          sundayHours: contactData?.sundayHours || contactData?.sunday_hours || weekHours.sunday || '',
          whatsapp: contactData?.whatsapp || '',
          telegram: contactData?.telegram || '',
          max: contactData?.max || '',
          mapEmbedUrl: contactData?.mapEmbedUrl || contactData?.map_embed_url || '',
          socialLinks: typeof contactData?.socialLinks === 'string' 
            ? JSON.parse(contactData.socialLinks) 
            : (contactData?.socialLinks || socialLinks),
          createdAt: new Date(),
          updatedAt: new Date(),
          // ✅ إضافة البيانات الأصلية للتصحيح
          __originalData: originalData
        } as ContactInfo & { __originalData?: any };
        
        console.log('✅ Final processed contact info with week days:', {
          monday: result.mondayHours,
          tuesday: result.tuesdayHours,
          wednesday: result.wednesdayHours,
          thursday: result.thursdayHours,
          friday: result.fridayHours,
          saturday: result.saturdayHours,
          sunday: result.sundayHours,
          hasOriginalData: !!result.__originalData
        });
        
        return result;
        
      } catch (error) {
        console.error('❌ Error in useContactInfo:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useUpdateContactInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertContactInfo) => {
      // ✅ إضافة الحقول الجديدة مع قيم افتراضية
      const validatedData = {
        ...data,
        telegram: data.telegram || '',
        max: data.max || '',
        // ✅ إضافة حقول أيام الأسبوع
        mondayHours: data.mondayHours || '',
        tuesdayHours: data.tuesdayHours || '',
        wednesdayHours: data.wednesdayHours || '',
        thursdayHours: data.thursdayHours || '',
        fridayHours: data.fridayHours || '',
        saturdayHours: data.saturdayHours || '',
        sundayHours: data.sundayHours || ''
      };
      
      const validated = api.contactInfo.update.input.parse(validatedData);
      const res = await fetch(api.contactInfo.update.path, {
        method: api.contactInfo.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось обновить контактную информацию: ${error}`);
      }
      
      const responseData = await res.json();
      console.log('✅ Update contact info response:', responseData);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.contactInfo.get.path] });
    },
  });
}

// ============================================
// Orders Hooks
// ============================================

export function useOrders() {
  return useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось загрузить заказы: ${error}`);
      }
      return api.orders.list.responses[200].parse(await res.json());
    },
    staleTime: 1000 * 30,
    retry: 2,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [`/api/orders/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить заказ");
      return res.json() as Promise<Order>;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertOrder) => {
      const validated = api.orders.create.input.parse(data);
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось создать заказ: ${error}`);
      }
      return api.orders.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertOrder>) => {
      const validated = api.orders.update.input.parse(updates);
      const url = buildUrl(api.orders.update.path, { id });
      const res = await fetch(url, {
        method: api.orders.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось обновить заказ: ${error}`);
      }
      return api.orders.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось удалить заказ: ${error}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
  });
}

// ============================================
// Featured Items Hook
// ============================================

export function useFeaturedItems() {
  return useQuery({
    queryKey: ["/api/menu-items/featured"],
    queryFn: async () => {
      const res = await fetch("/api/menu-items/featured");
      if (!res.ok) throw new Error("Не удалось загрузить рекомендуемые блюда");
      const data = await res.json();
      return data.data || data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// Dashboard Statistics Hook
// ============================================

export function useDashboardStats() {
  return useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      return res.json() as Promise<{
        totalCategories: number;
        totalItems: number;
        availableItems: number;
        featuredItems: number;
        itemsWithDiscount: number;
        pendingOrders: number;
        totalOrders: number;
        todayOrders: number;
        totalRevenue: number;
      }>;
    },
    staleTime: 1000 * 60,
  });
}

// ============================================
// Site Images Hook (NEW)
// ============================================

export function useSiteImages() {
  return useQuery<SiteImage[]>({
    queryKey: ["/api/site-images"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/site-images");
        if (!res.ok) return [];
        const data = await res.json();
        if (data && data.success && data.data) {
          return data.data;
        }
        return data || [];
      } catch (error) {
        console.error('Error fetching site images:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// Combined Restaurant Data Hook
// ============================================

export function useRestaurantData() {
  const categoriesQuery = useCategories();
  const itemsQuery = useMenuItems();
  const contactQuery = useContactInfo();
  const featuredQuery = useFeaturedItems();
  const siteImagesQuery = useSiteImages();

  const isLoading = categoriesQuery.isLoading || itemsQuery.isLoading || contactQuery.isLoading || siteImagesQuery.isLoading;
  const error = categoriesQuery.error || itemsQuery.error || contactQuery.error || siteImagesQuery.error;

  const categoriesWithItems = categoriesQuery.data?.map(category => ({
    ...category,
    items: itemsQuery.data?.filter((item: { categoryId: number; isAvailable: any; }) => 
      item.categoryId === category.id && item.isAvailable
    ) || []
  })) || [];

  return {
    categories: categoriesQuery.data,
    items: itemsQuery.data,
    contactInfo: contactQuery.data,
    featuredItems: featuredQuery.data,
    siteImages: siteImagesQuery.data,
    categoriesWithItems,
    isLoading,
    error,
    refetch: () => {
      categoriesQuery.refetch();
      itemsQuery.refetch();
      contactQuery.refetch();
      featuredQuery.refetch();
      siteImagesQuery.refetch();
    }
  };
}

// ============================================
// Custom Mutations
// ============================================

export function useToggleMenuItemAvailability() {
  const queryClient = useQueryClient();
  const updateItem = useUpdateMenuItem();
  
  return {
    ...updateItem,
    mutate: (id: number, isAvailable: boolean) => {
      return updateItem.mutateAsync({ id, isAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    }
  };
}

export function useToggleMenuItemFeatured() {
  const queryClient = useQueryClient();
  const updateItem = useUpdateMenuItem();
  
  return {
    ...updateItem,
    mutate: (id: number, isFeatured: boolean) => {
      return updateItem.mutateAsync({ id, isFeatured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items/featured"] });
    }
  };
}

export function useSetMenuItemDiscount() {
  const queryClient = useQueryClient();
  const updateItem = useUpdateMenuItem();
  
  return {
    ...updateItem,
    mutate: (id: number, discountPercentage: number, originalPrice: number) => {
      return updateItem.mutateAsync({ 
        id, 
        hasDiscount: discountPercentage > 0,
        discountPercentage,
        originalPrice 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    }
  };
}

// ============================================
// Health Check Hook
// ============================================

export function useHealthCheck() {
  return useQuery({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Сервис недоступен");
      return res.json() as Promise<{ status: string; timestamp: string; service: string }>;
    },
    refetchInterval: 30000,
    retry: 3,
  });
}

// ============================================
// Image Management Hooks
// ============================================

export function useMenuImages(menuItemId: number) {
  return useQuery<MenuImage[]>({
    queryKey: [`/api/menu-items/${menuItemId}/images`],
    queryFn: async () => {
      const res = await fetch(`/api/menu-items/${menuItemId}/images`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || data || [];
    },
    enabled: !!menuItemId,
  });
}

export function useUploadSiteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/images/upload/site", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось загрузить изображение: ${error}`);
      }
      return res.json() as Promise<SiteImage>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-images"] });
    },
  });
}

export function useUploadMenuImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/images/upload/menu", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Не удалось загрузить изображение: ${error}`);
      }
      return res.json() as Promise<MenuImage>;
    },
    onSuccess: (_, variables) => {
      const menuItemId = variables.get("menuItemId");
      if (menuItemId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/menu-items/${menuItemId}/images`] 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: [api.menuItems.list.path] 
      });
    },
  });
}

export function useDeleteSiteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/site-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось удалить изображение");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-images"] });
    },
  });
}

export function useDeleteMenuImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось удалить изображение");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-images"] });
    },
  });
}

export function useSetMainImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu-images/${id}/set-main`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось установить главное изображение");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-images"] });
    },
  });
}

// ============================================
// Social Links Helper (NEW)
// ============================================

export function useSocialLinks() {
  const { data: contactInfo } = useContactInfo();
  
  const socialLinks = contactInfo?.socialLinks || { 
    facebook: '', 
    instagram: '', 
    vk: '', 
    mailru: '', 
    ozon: '' 
  };
  
  const getParsedLinks = () => {
    if (typeof socialLinks === 'string') {
      try {
        return JSON.parse(socialLinks);
      } catch {
        return { 
          facebook: '', 
          instagram: '', 
          vk: '', 
          mailru: '', 
          ozon: '' 
        };
      }
    }
    return socialLinks;
  };
  
  const parsedLinks = getParsedLinks();
  
  return {
    facebook: parsedLinks?.facebook || '',
    instagram: parsedLinks?.instagram || '',
    vk: parsedLinks?.vk || '',
    mailru: parsedLinks?.mailru || '',
    ozon: parsedLinks?.ozon || '',
  };
}

// ============================================
// Refresh Data Hook (NEW)
// ============================================

export function useRefreshData() {
  const queryClient = useQueryClient();
  
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [api.contactInfo.get.path] });
    queryClient.invalidateQueries({ queryKey: [api.categories.list.path] });
    queryClient.invalidateQueries({ queryKey: [api.menuItems.list.path] });
    queryClient.invalidateQueries({ queryKey: ["/api/site-images"] });
    queryClient.invalidateQueries({ queryKey: ["/api/menu-items/featured"] });
  };
  
  return { refreshAll };
}