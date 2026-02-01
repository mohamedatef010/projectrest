import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { MapPin, Phone, Clock, Instagram, Facebook, MessageSquare, ChefHat, Sparkles, RefreshCw, Image as ImageIcon, Mail, ShoppingBag, MessageCircle } from "lucide-react";
import { Link as ScrollLink } from "react-scroll";
import { useCategories, useMenuItems, useContactInfo, useSiteImages } from "@/hooks/use-restaurant";
import { SectionHeader } from "@/components/SectionHeader";
import { MenuGrid } from "@/components/MenuGrid";
import { MenuItemDetails } from "@/components/forms/MenuItemDetails";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem, SiteImage, ContactInfo } from "@shared/schema";
import io from 'socket.io-client';
import { formatCurrency } from "@/lib/utils";
import { useIsMobile, useMobileHeader } from "@/hooks/use-mobile";

// تعريف واجهة لصور الموقع
interface SiteImageType {
  id: number;
  image_type: string;
  image_url: string;
  alt_text?: string;
  description?: string;
  created_at: string;
}

// تعريف النوع العالمي
declare global {
  interface Window {
    triggerContactInfoUpdate?: () => void;
  }
}

// تعريف واجهة للبيانات المبسطة - التحديث هنا
interface SimpleContactInfo {
  phone: string;
  address: string;
  email: string;
  openingHours: string;
  mondayHours: string;
  tuesdayHours: string;
  wednesdayHours: string;
  thursdayHours: string;
  fridayHours: string;
  saturdayHours: string;
  sundayHours: string;
  whatsapp: string;
  telegram: string;
  max: string;
  mapEmbedUrl: string;
  socialLinks: { 
    facebook: string; 
    instagram: string;
    vk: string;
    mailru: string;
    ozon: string;
  };
}

// دالة للتحقق من حالة الفتح/الإغلاق بناءً على وقت العمل - التحديث هنا
const useOpeningStatus = (contactInfo: SimpleContactInfo) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [nextOpening, setNextOpening] = useState<string>("");
  const [todaySchedule, setTodaySchedule] = useState<string>("");
  const [todayName, setTodayName] = useState<string>("");
  
  useEffect(() => {
    const checkOpeningStatus = () => {
      if (!contactInfo) {
        setIsOpen(false);
        setNextOpening("");
        setTodaySchedule("");
        setTodayName("");
        return;
      }
      
      const now = new Date();
      const currentDay = now.getDay(); // 0 = الأحد, 1 = الإثنين, ...
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      
      // الحصول على ساعات اليوم الحالي
      const getTodayHours = (): string => {
        const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
        
        setTodayName(dayNames[currentDay]);
        
        switch (currentDay) {
          case 0: return contactInfo.sundayHours || "";
          case 1: return contactInfo.mondayHours || "";
          case 2: return contactInfo.tuesdayHours || "";
          case 3: return contactInfo.wednesdayHours || "";
          case 4: return contactInfo.thursdayHours || "";
          case 5: return contactInfo.fridayHours || "";
          case 6: return contactInfo.saturdayHours || "";
          default: return "";
        }
      };
      
      const todayHours = getTodayHours();
      setTodaySchedule(todayHours);
      
      // إذا لم تكن هناك ساعات عمل لهذا اليوم
      if (!todayHours || todayHours.trim() === '') {
        setIsOpen(false);
        setNextOpening("Закрыто сегодня");
        return;
      }
      
      // تحليل ساعات العمل من النص
      const parseOpeningHours = (hoursText: string): { isOpen: boolean; nextOpening?: string } => {
        // تنسيق متوقع: "10:00 до 23:00" أو "10:00-23:00" أو "10:00 – 23:00"
        const hoursMatch = hoursText.match(/(\d{1,2})[:\.](\d{2})\s*(?:до|–|-|to)\s*(\d{1,2})[:\.](\d{2})/i);
        
        if (hoursMatch) {
          const openHour = parseInt(hoursMatch[1]);
          const openMinute = parseInt(hoursMatch[2]);
          const closeHour = parseInt(hoursMatch[3]);
          const closeMinute = parseInt(hoursMatch[4]);
          
          const openTimeInMinutes = openHour * 60 + openMinute;
          const closeTimeInMinutes = closeHour * 60 + closeMinute;
          
          // إذا كان الوقت الحالي بين ساعات الفتح والإغلاق
          const isCurrentlyOpen = currentTimeInMinutes >= openTimeInMinutes && 
                                 currentTimeInMinutes <= closeTimeInMinutes;
          
          if (isCurrentlyOpen) {
            return { isOpen: true };
          } else {
            // حساب الوقت المتبقي حتى الفتح التالي
            let nextOpenTime = "";
            if (currentTimeInMinutes < openTimeInMinutes) {
              // سيتم الفتح اليوم
              const timeDiff = openTimeInMinutes - currentTimeInMinutes;
              const hoursDiff = Math.floor(timeDiff / 60);
              const minutesDiff = timeDiff % 60;
              nextOpenTime = `откроется через ${hoursDiff}ч ${minutesDiff}м`;
            } else {
              // البحث عن يوم الفتح التالي
              const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              for (let i = 1; i <= 7; i++) {
                const nextDayIndex = (currentDay + i) % 7;
                let nextDayHours = '';
                
                switch (nextDayIndex) {
                  case 0: nextDayHours = contactInfo.sundayHours; break;
                  case 1: nextDayHours = contactInfo.mondayHours; break;
                  case 2: nextDayHours = contactInfo.tuesdayHours; break;
                  case 3: nextDayHours = contactInfo.wednesdayHours; break;
                  case 4: nextDayHours = contactInfo.thursdayHours; break;
                  case 5: nextDayHours = contactInfo.fridayHours; break;
                  case 6: nextDayHours = contactInfo.saturdayHours; break;
                }
                
                if (nextDayHours && nextDayHours.trim() !== '') {
                  const dayNames = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
                  nextOpenTime = `откроется в ${dayNames[nextDayIndex]}`;
                  break;
                }
              }
              
              if (!nextOpenTime) {
                nextOpenTime = "расписание уточняйте";
              }
            }
            return { isOpen: false, nextOpening: nextOpenTime };
          }
        }
        
        // إذا لم يتطابق النص مع التنسيق المتوقع
        return { isOpen: false, nextOpening: "часы работы уточняйте" };
      };
      
      const result = parseOpeningHours(todayHours);
      setIsOpen(result.isOpen);
      setNextOpening(result.nextOpening || "");
    };
    
    checkOpeningStatus();
    
    // تحديث الحالة كل دقيقة
    const interval = setInterval(checkOpeningStatus, 60000);
    
    return () => clearInterval(interval);
  }, [contactInfo]);
  
  return { isOpen, nextOpening, todaySchedule, todayName };
};

// دالة لتحويل عناصر القائمة - التعديل هنا
const normalizeMenuItem = (item: any): MenuItem => {
  console.log('🔧 Normalizing menu item:', item);
  
  return {
    ...item,
    id: Number(item.id) || 0,
    name: item.name || '',
    description: item.description || '',
    details: item.details || '',
    // ❌ **المشكلة هنا**: كانت تحول من كوبيك إلى روبل
    // ✅ **الحل**: استخدم السعر مباشرة كما هو (بالروبل)
    price: Number(item.price) || 0,
    originalPrice: Number(item.originalPrice) || Number(item.original_price) || 0,
    categoryId: Number(item.categoryId) || Number(item.category_id) || 0,
    isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : 
                (item.is_available !== undefined ? Boolean(item.is_available) : true),
    isFeatured: item.isFeatured !== undefined ? Boolean(item.isFeatured) : 
               (item.is_featured !== undefined ? Boolean(item.is_featured) : false),
    hasDiscount: item.hasDiscount !== undefined ? Boolean(item.hasDiscount) : 
                (item.has_discount !== undefined ? Boolean(item.has_discount) : false),
    discountPercentage: Number(item.discountPercentage) || Number(item.discount_percentage) || 0,
    imageUrl: item.imageUrl || item.image_url || '',
    createdAt: item.createdAt || item.created_at || new Date(),
    updatedAt: item.updatedAt || item.updated_at || new Date(),
  };
};

// دالة لتحويل الروابط الاجتماعية - إضافة جديدة
const formatSocialLink = (link: string, platform: string): string => {
  if (!link || !link.trim()) return '#';
  
  // إذا كانت الرابط يحتوي بالفعل على http
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }
  
  // إذا كان username فقط
  switch (platform) {
    case 'facebook':
      return `https://facebook.com/${link}`;
    case 'instagram':
      return `https://instagram.com/${link}`;
    case 'vk':
      // تحقق إذا كان يحتوي على vk.com بالفعل
      if (link.includes('vk.com/')) {
        return `https://${link}`;
      }
      return `https://vk.com/${link}`;
    case 'mailru':
      // تحقق إذا كان username أو رابط كامل
      if (link.includes('my.mail.ru') || link.includes('mail.ru')) {
        return link.startsWith('http') ? link : `https://${link}`;
      }
      return `https://my.mail.ru/${link}`;
    case 'ozon':
      // تحقق إذا كان رابط ozon
      if (link.includes('ozon.ru')) {
        return link.startsWith('http') ? link : `https://${link}`;
      }
      // إذا كان username فقط، بحث في Ozon
      return `https://ozon.ru/search/?text=${encodeURIComponent(link)}&from_global=true`;
    default:
      return `https://${platform}.com/${link}`;
  }
};

// دالة للتحقق مما إذا كانت هناك أي روابط اجتماعية - إضافة جديدة
const hasAnySocialLinks = (socialLinks: any): boolean => {
  if (!socialLinks) return false;
  
  return Boolean(
    socialLinks.facebook?.trim() ||
    socialLinks.instagram?.trim() ||
    socialLinks.vk?.trim() ||
    socialLinks.mailru?.trim() ||
    socialLinks.ozon?.trim()
  );
};

// دالة لإنشاء رابط WhatsApp
const getWhatsAppLink = (phoneNumber: string): string => {
  const cleanedNumber = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanedNumber}?text=Здравствуйте! Хочу забронировать столик в ресторане Istanbul.`;
};

// دالة لإنشاء رابط Telegram
const getTelegramLink = (telegramUsername: string): string => {
  if (!telegramUsername) return '#';
  if (telegramUsername.startsWith('@')) {
    return `https://t.me/${telegramUsername.substring(1)}`;
  }
  if (telegramUsername.startsWith('t.me/')) {
    return `https://${telegramUsername}`;
  }
  return `https://t.me/${telegramUsername}`;
};

// دالة لعرض جدول أيام الأسبوع
const getWeekSchedule = (contactInfo: SimpleContactInfo) => {
  const days = [
    { name: 'Понедельник (Пн)', hours: contactInfo.mondayHours, isToday: false },
    { name: 'Вторник (Вт)', hours: contactInfo.tuesdayHours, isToday: false },
    { name: 'Среда (Ср)', hours: contactInfo.wednesdayHours, isToday: false },
    { name: 'Четверг (Чт)', hours: contactInfo.thursdayHours, isToday: false },
    { name: 'Пятница (Пт)', hours: contactInfo.fridayHours, isToday: false },
    { name: 'Суббота (Сб)', hours: contactInfo.saturdayHours, isToday: false },
    { name: 'Воскресенье (Вс)', hours: contactInfo.sundayHours, isToday: false },
  ];
  
  // تحديد اليوم الحالي
  const today = new Date().getDay(); // 0 = الأحد, 1 = الإثنين, ...
  const dayIndex = today === 0 ? 6 : today - 1; // تعديل الفهرس ليتناسب مع المصفوفة
  if (dayIndex >= 0 && dayIndex < days.length) {
    days[dayIndex].isToday = true;
  }
  
  return days;
};

export default function PublicHome() {
  const { toast } = useToast();
  const { data: categories, isLoading: isCatLoading, refetch: refetchCategories } = useCategories();
  const { data: menuItems, isLoading: isItemsLoading, refetch: refetchMenuItems } = useMenuItems();
  const { data: contactInfo, isLoading: isContactLoading, refetch: refetchContactInfo } = useContactInfo();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toLocaleTimeString());
  const [siteImages, setSiteImages] = useState<SiteImageType[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ إضافة state منفصل للصورة الرئيسية
  const [heroImage, setHeroImage] = useState<SiteImageType | null>(null);
  
  // ✅ إضافة Hooks للموبايل
  const isMobile = useIsMobile();
  const { isVisible: isHeaderVisible, setIsVisible: setIsHeaderVisible } = useMobileHeader();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);
  
  // تحويل menuItems إلى normalizedItems
  const normalizedItems = menuItems?.map(normalizeMenuItem) || [];
  
  // دالة لتحويل البيانات إلى ContactInfo - التحديث هنا
  const convertToContactInfo = (data: any): ContactInfo => {
    if (!data) {
      return {
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: '',
        address: '',
        email: '',
        openingHours: '',
        mondayHours: '',
        tuesdayHours: '',
        wednesdayHours: '',
        thursdayHours: '',
        fridayHours: '',
        saturdayHours: '',
        sundayHours: '',
        whatsapp: '',
        telegram: '',
        max: '',
        mapEmbedUrl: '',
        socialLinks: { 
          facebook: '', 
          instagram: '', 
          vk: '', 
          mailru: '', 
          ozon: '' 
        }
      };
    }
    
    return {
      id: data.id || 1,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      phone: data.phone || '',
      address: data.address || '',
      email: data.email || '',
      openingHours: data.openingHours || '',
      mondayHours: data.mondayHours || '',
      tuesdayHours: data.tuesdayHours || '',
      wednesdayHours: data.wednesdayHours || '',
      thursdayHours: data.thursdayHours || '',
      fridayHours: data.fridayHours || '',
      saturdayHours: data.saturdayHours || '',
      sundayHours: data.sundayHours || '',
      whatsapp: data.whatsapp || '',
      telegram: data.telegram || '',
      max: data.max || '',
      mapEmbedUrl: data.mapEmbedUrl || '',
      socialLinks: typeof data.socialLinks === 'string' 
        ? JSON.parse(data.socialLinks) 
        : (data.socialLinks || { 
            facebook: '', 
            instagram: '', 
            vk: '', 
            mailru: '', 
            ozon: '' 
          })
    };
  };
  
 // في PublicHome.tsx، عدل دالة getDisplayContactInfo() لتكون كما يلي:
// في PublicHome.tsx، استبدل دالة getDisplayContactInfo() الحالية بهذه الدالة:
// في PublicHome.tsx، استبدل دالة getDisplayContactInfo() بهذه النسخة:
const getDisplayContactInfo = (): SimpleContactInfo => {
  if (!contactInfo) {
    return {
      phone: '+7 (4842) 12-34-56',
      address: 'Г. Калуга пл. Мира 4/1',
      email: 'info@istanbul-kaluga.ru',
      openingHours: '12.00 до 23.00',
      mondayHours: '',
      tuesdayHours: '',
      wednesdayHours: '',
      thursdayHours: '',
      fridayHours: '',
      saturdayHours: '',
      sundayHours: '',
      whatsapp: '',
      telegram: '',
      max: '',
      mapEmbedUrl: '',
      socialLinks: { 
        facebook: '', 
        instagram: '', 
        vk: '', 
        mailru: '', 
        ozon: '' 
      }
    };
  }
  
  console.log('🔍 Debug - Raw contactInfo from hook:', contactInfo);
  
  // ✅ محاولة قراءة أيام الأسبوع من جميع المصادر الممكنة
  const readDayHours = (dayKey: string): string => {
    const camelCaseKey = `${dayKey}Hours`; // مثل: mondayHours
    const snakeCaseKey = `${dayKey}_hours`; // مثل: monday_hours
    
    // محاولة 1: من camelCase مباشرة
    if (contactInfo[camelCaseKey as keyof ContactInfo]) {
      return contactInfo[camelCaseKey as keyof ContactInfo] as string;
    }
    
    // محاولة 2: من snake_case (إذا كانت البيانات قادمة من الـ API)
    const contactInfoAny = contactInfo as any;
    if (contactInfoAny[snakeCaseKey]) {
      return contactInfoAny[snakeCaseKey];
    }
    
    // محاولة 3: من __originalData إذا كان موجوداً
    if (contactInfoAny.__originalData) {
      const original = contactInfoAny.__originalData;
      if (original[snakeCaseKey]) return original[snakeCaseKey];
      if (original[camelCaseKey]) return original[camelCaseKey];
    }
    
    // محاولة 4: من البيانات الأصلية مباشرة
    if (contactInfoAny[dayKey]) {
      return contactInfoAny[dayKey];
    }
    
    return '';
  };
  
  // قراءة socialLinks بشكل صحيح
  const getSocialLinks = () => {
    if (!contactInfo.socialLinks) {
      return { facebook: '', instagram: '', vk: '', mailru: '', ozon: '' };
    }
    
    if (typeof contactInfo.socialLinks === 'string') {
      try {
        return JSON.parse(contactInfo.socialLinks);
      } catch {
        return { facebook: '', instagram: '', vk: '', mailru: '', ozon: '' };
      }
    }
    
    return contactInfo.socialLinks;
  };
  
  const socialLinks = getSocialLinks();
  
  // قراءة البيانات الرئيسية
  const result: SimpleContactInfo = {
    phone: contactInfo.phone || '',
    address: contactInfo.address || '',
    email: contactInfo.email || '',
    openingHours: contactInfo.openingHours || '',
    // قراءة أيام الأسبوع باستخدام الدالة المساعدة
    mondayHours: readDayHours('monday'),
    tuesdayHours: readDayHours('tuesday'),
    wednesdayHours: readDayHours('wednesday'),
    thursdayHours: readDayHours('thursday'),
    fridayHours: readDayHours('friday'),
    saturdayHours: readDayHours('saturday'),
    sundayHours: readDayHours('sunday'),
    whatsapp: contactInfo.whatsapp || '',
    telegram: contactInfo.telegram || '',
    max: contactInfo.max || '',
    mapEmbedUrl: contactInfo.mapEmbedUrl || '',
    socialLinks: {
      facebook: socialLinks.facebook || '',
      instagram: socialLinks.instagram || '',
      vk: socialLinks.vk || '',
      mailru: socialLinks.mailru || '',
      ozon: socialLinks.ozon || ''
    }
  };
  
  console.log('✅ Processed contact info:', {
    monday: result.mondayHours,
    tuesday: result.tuesdayHours,
    wednesday: result.wednesdayHours
  });
  
  return result;
};
  
  const displayContactInfo = getDisplayContactInfo();
  const fullContactInfo = convertToContactInfo(contactInfo);
  
  // ✅ استخدام دالة التحقق من حالة الفتح/الإغلاق المحدثة
  const { isOpen: isRestaurantOpen, nextOpening: nextOpeningTime, todaySchedule, todayName } = 
    useOpeningStatus(displayContactInfo);
  
  // تحميل جدول الأسبوع
  const weekSchedule = getWeekSchedule(displayContactInfo);
  
  // التحقق من وجود تطبيقات مراسلة
  const hasMessagingApps = Boolean(
    displayContactInfo.whatsapp?.trim() || 
    displayContactInfo.telegram?.trim() || 
    displayContactInfo.max?.trim()
  );
  
  // إضافة هذه الدالة المساعدة
  const getSafeImageUrl = (url?: string): string => {
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
      return "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80";
    }
    
    // التأكد من أن الرابط يبدأ بـ http أو https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    
    return url;
  };
  
  // دالة لجلب صور الموقع
  const fetchSiteImages = async () => {
    try {
      const response = await fetch('/api/site-images');
      const result = await response.json();
      if (result.success) {
        const images = result.data || [];
        setSiteImages(images);
        
        // ✅ تحديد الصورة الرئيسية (hero) أو الصورة الأولى
        const heroImg = images.find((img: SiteImageType) => 
          img.image_type === 'hero' || img.image_type === 'restaurant'
        );
        
        if (heroImg) {
          setHeroImage(heroImg);
        } else if (images.length > 0) {
          // إذا لم توجد صورة hero، استخدم أول صورة
          setHeroImage(images[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching site images:', error);
    }
  };

  // الحصول على صور الموقع عند تحميل الصفحة
  useEffect(() => {
    fetchSiteImages();
  }, []);

  // ✅ إعداد مؤشر صور "Наше место" فقط (تلقائي كل 10 ثواني)
  useEffect(() => {
    // ✅ فقط صور القسم (ليست hero)
    const sectionImages = siteImages.filter(img => 
      img.image_type === 'restaurant' || img.image_type === 'about' || 
      img.image_type === 'gallery' || img.image_type === 'interior'
    );
    
    if (sectionImages.length > 1) {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
      }
      
      imageIntervalRef.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => 
          prevIndex === sectionImages.length - 1 ? 0 : prevIndex + 1
        );
      }, 10000); // 10 ثواني
    }
    
    return () => {
      if (imageIntervalRef.current) {
        clearInterval(imageIntervalRef.current);
      }
    };
  }, [siteImages]);

  // ✅ تعديل دوال التبديل اليدوي لصور القسم فقط
  const handleNextImage = () => {
    const sectionImages = siteImages.filter(img => 
      img.image_type === 'restaurant' || img.image_type === 'about' || 
      img.image_type === 'gallery' || img.image_type === 'interior'
    );
    
    if (sectionImages.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === sectionImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    const sectionImages = siteImages.filter(img => 
      img.image_type === 'restaurant' || img.image_type === 'about' || 
      img.image_type === 'gallery' || img.image_type === 'interior'
    );
    
    if (sectionImages.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? sectionImages.length - 1 : prevIndex - 1
      );
    }
  };

  // تحميل البيانات الأولية
  useEffect(() => {
    const loadContactInfo = async () => {
      try {
        console.log('🚀 Loading contact info for public page...');
        
        // محاولة مباشرة للحصول على البيانات
        const response = await fetch('/api/contact-info');
        console.log('📡 Direct API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Direct API data:', data);
        }
        
        // تفعيل refetch
        refetchContactInfo();
      } catch (error) {
        console.error('❌ Error loading contact info:', error);
      }
    };
    
    loadContactInfo();
  }, []);

  // تحقق من البيانات وتصحيح أي مشاكل
  useEffect(() => {
    console.log('🔍 Debug Menu Items (original):', menuItems);
    console.log('🔍 Debug Menu Items (normalized):', normalizedItems);
    console.log('🔍 Available Items:', normalizedItems.filter((item: MenuItem) => item.isAvailable));
    console.log('🔍 Categories:', categories);
    
    // تحقق من أول عنصر
    if (normalizedItems.length > 0) {
      console.log('🔍 First item details:', normalizedItems[0]);
      console.log('🔍 First item isAvailable:', normalizedItems[0].isAvailable);
      console.log('🔍 First item categoryId:', normalizedItems[0].categoryId);
    }
    
    if (normalizedItems && normalizedItems.length > 0) {
      console.log('✅ Menu items loaded successfully:', normalizedItems.length);
      
      // تحقق من وجود مشاكل في البيانات
      const itemsWithIssues = normalizedItems.filter((item: MenuItem) => {
        return !item.name || !item.categoryId || item.price <= 0;
      });
      
      if (itemsWithIssues.length > 0) {
        console.warn('⚠️ Items with data issues:', itemsWithIssues);
      }
    }
  }, [normalizedItems, categories]);

  // تصفية العناصر المتاحة فقط
  const availableItems = normalizedItems?.filter((item: MenuItem) => {
    // تأكد أن العنصر متاح ولديه بيانات كافية
    return item.isAvailable && item.name && item.price > 0;
  }) || [];

  console.log('📊 Available items for display:', availableItems.length);

  // ✅ إضافة WebSocket للاستماع للتحديثات الفورية
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      ? import.meta.env.VITE_SOCKET_URL
      : (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // في PublicHome.tsx، تحديث useEffect الخاص بـ WebSocket:
    socket.on('data_update', (data) => {
      console.log('📡 Real-time update received:', data);
      
      if (data.type === 'contact_info_updated') {
        console.log('🔄 Refetching contact info...');
        refetchContactInfo().then(() => {
          console.log('✅ Contact info refetched');
          toast({
            title: "🔄 Обновление",
            description: "Контактная информация обновлена",
            duration: 2000,
          });
          setLastUpdate(new Date().toLocaleTimeString());
        }).catch(error => {
          console.error('❌ Error refetching contact info:', error);
        });
      }
      
      switch (data.type) {
        case 'category_created':
        case 'category_updated':
        case 'category_deleted':
          refetchCategories();
          toast({
            title: "🔄 Категории обновлены",
            description: "Список категорий был обновлен",
            duration: 2000,
          });
          break;
        case 'menu_item_created':
        case 'menu_item_updated':
        case 'menu_item_deleted':
          refetchMenuItems();
          toast({
            title: "🔄 Меню обновлено",
            description: "Список блюд был обновлен",
            duration: 2000,
          });
          break;
        case 'site_image_uploaded':
        case 'site_image_deleted':
          fetchSiteImages();
          break;
      }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from WebSocket server');
    });

    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [refetchMenuItems, refetchCategories, refetchContactInfo, toast]);

  // ✅ استماع لتحديثات contact info من صفحة الإعدادات
  useEffect(() => {
    const handleContactInfoUpdate = (event: CustomEvent) => {
      console.log('🔄 Contact info update event received:', event.detail);
      refetchContactInfo();
      
      toast({
        title: "🔄 Обновление данных",
        description: "Контактная информация обновлена",
        duration: 2000,
      });
      setLastUpdate(new Date().toLocaleTimeString());
    };

    // تعيين دالة عامة لاستدعائها من صفحة الإعدادات
    window.triggerContactInfoUpdate = refetchContactInfo;

    window.addEventListener('contactInfoUpdated', handleContactInfoUpdate as EventListener);

    return () => {
      window.removeEventListener('contactInfoUpdated', handleContactInfoUpdate as EventListener);
      delete window.triggerContactInfoUpdate;
    };
  }, [refetchContactInfo, toast]);

  // وظيفة التحديث اليدوي
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchCategories(),
        refetchMenuItems(),
        refetchContactInfo(),
        fetchSiteImages()
      ]);
      setLastUpdate(new Date().toLocaleTimeString());
      toast({
        title: "✅ تم التحديث",
        description: "تم تحديث всех данных",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "❌ خطأ",
        description: "فشل в تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        img.classList.add('loaded');
      });
    });

    console.log('🌐 Public page loaded - Real-time updates active');
    
    return () => {
      images.forEach(img => {
        img.removeEventListener('load', () => {});
      });
    };
  }, []);

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  if (isCatLoading || isItemsLoading || isContactLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Загрузка данных ресторана...</p>
        <p className="text-xs text-muted-foreground mt-2">Пожалуйста, подождите</p>
      </div>
    );
  }

  // ✅ جلب صور القسم فقط
  const sectionImages = siteImages.filter(img => 
    img.image_type === 'restaurant' || img.image_type === 'about' || 
    img.image_type === 'gallery' || img.image_type === 'interior'
  );

  const currentSectionImage = sectionImages[currentImageIndex] || null;
  const restaurantImages = siteImages.filter(img => 
    img.image_type === 'restaurant' || img.image_type === 'hero' || img.image_type === 'about'
  );

  const socialLinks = displayContactInfo.socialLinks;
  const hasSocialLinks = hasAnySocialLinks(socialLinks);

  return (
    <div className="bg-background min-h-screen overflow-x-hidden">
      {/* Navigation */}
      <nav className={`
        fixed w-full z-50 top-0 transition-all duration-300 py-4 px-6 md:px-12 
        backdrop-blur-sm bg-black/60 border-b border-white/10
        ${isMobile && !isHeaderVisible ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
      `}>        
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* الشعار على اليسار (للجميع) */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src="/images/logo.png" 
                alt="Istanbul Logo" 
                className="w-20 h-20 md:w-24 md:h-24 object-contain"
              />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* تخطيط مختلف للهاتف والديسكتوب */}
          {isMobile ? (
            /* تخطيط الهاتف */
            <>
              {/* زر الحجز في المنتصف */}
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white backdrop-blur-sm">
                <ScrollLink to="booking-widget" smooth={true} duration={800} offset={-80} className="cursor-pointer text-sm">Забронировать</ScrollLink>
              </Button>
              
              {/* زر القائمة على اليمين */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </Button>
            </>
          ) : (
            /* تخطيط الديسكتوب (يبقى كما هو) */
            <>
              <div className="flex gap-8">
                <ScrollLink to="about" smooth={true} duration={800} className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors">О нас</ScrollLink>
                <ScrollLink to="menu" smooth={true} duration={800} className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors">Меню</ScrollLink>
                <ScrollLink to="our-place" smooth={true} duration={800} className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors">Наше место</ScrollLink>
                <ScrollLink to="contact" smooth={true} duration={800} className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors">Контакты</ScrollLink>
              </div>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white backdrop-blur-sm">
                <ScrollLink to="booking-widget" smooth={true} duration={800} offset={-80} className="cursor-pointer">Забронировать столик</ScrollLink>
              </Button>
            </>
          )}

          {/* Mobile Navigation Dropdown */}
          {isMobile && isMobileMenuOpen && (
            <div className="absolute top-full left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10 mt-2 py-4 px-6 flex flex-col gap-3">
              <ScrollLink 
                to="about" 
                smooth={true} 
                duration={800} 
                className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors py-3 border-b border-white/10 flex items-center gap-2"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsHeaderVisible(false);
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                О нас
              </ScrollLink>
              <ScrollLink 
                to="menu" 
                smooth={true} 
                duration={800} 
                className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors py-3 border-b border-white/10 flex items-center gap-2"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsHeaderVisible(false);
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Меню
              </ScrollLink>
              <ScrollLink 
                to="our-place" 
                smooth={true} 
                duration={800} 
                className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors py-3 border-b border-white/10 flex items-center gap-2"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsHeaderVisible(false);
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Наше место
              </ScrollLink>
              <ScrollLink 
                to="contact" 
                smooth={true} 
                duration={800} 
                className="nav-link cursor-pointer text-white/90 hover:text-white font-medium transition-colors py-3 border-b border-white/10 flex items-center gap-2"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsHeaderVisible(false);
                }}
              >
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Контакты
              </ScrollLink>
              
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/70 via-black/50 to-black/30" />
        
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          {/* ✅ استخدام heroImage الثابتة */}
          {heroImage ? (
            <img
              src={heroImage.image_url}
              alt={heroImage.alt_text || "Ресторан Istanbul"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1554679665-f5537f187268?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center bg-no-repeat" />
          )}
        </motion.div>

        <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className={`mb-4 backdrop-blur-sm ${
              isRestaurantOpen 
                ? 'bg-green-500/20 text-green-500 border-green-500/30' 
                : 'bg-red-500/20 text-red-500 border-red-500/30'
            }`}>
              {isRestaurantOpen ? 'Открыто сейчас' : 'Закрыто'}
              {!isRestaurantOpen && nextOpeningTime && (
                <span className="ml-2 text-xs">({nextOpeningTime})</span>
              )}
            </Badge>
             
             <p className="font-script text-3xl md:text-5xl text-amber-300 mb-8 drop-shadow-lg">
               Вкус настоящей Турции
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Button size="lg" className="bg-gradient-to-r from-primary to-amber-600 text-white hover:from-amber-500 hover:to-primary text-lg px-8 py-6 shadow-lg">
                 <ScrollLink to="menu" smooth={true} duration={800}>Смотреть меню</ScrollLink>
               </Button>
               <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black text-lg px-8 py-6 backdrop-blur-sm">
                 <ScrollLink to="our-place" smooth={true} duration={800}>Наше место</ScrollLink>
               </Button>
             </div>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 animate-bounce"
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-2 backdrop-blur-sm">
            <div className="w-1 h-3 bg-white rounded-full"></div>
          </div>
        </motion.div>
      </header>

      {/* About Section */}
      <section id="about" className="py-24 px-6 md:px-12 bg-gradient-to-b from-background via-card to-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-7xl mx-auto">
          <SectionHeader title="Наша история" subtitle="Традиции и качество" centered={true} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ChefHat className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">Мастера своего дела</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed font-light">
                  Ресторан Istanbul — это не просто место, где можно вкусно поесть. 
                  Это уголок настоящей Турции в сердце города, где каждый ингредиент 
                  проходит строгий отбор, а каждое блюдо готовится с любовью и вниманием к деталям.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">Уникальные рецепты</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed font-light">
                  Наши рецепты передавались из поколения в поколение. Мы сохраняем 
                  аутентичность турецкой кухни, сочетая традиции с современными 
                  технологиями приготовления.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold text-foreground">Особенная атмосфера</h3>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed font-light">
                  Теплая, гостеприимная атмосфера, уютный интерьер и внимательное 
                  обслуживание — все это создает неповторимую атмосферу, которая 
                  заставляет гостей возвращаться к нам снова и снова.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute -inset-4 border-2 border-primary/20 rounded-2xl transform rotate-3"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                {restaurantImages.length > 0 ? (
                  <img 
                    src={restaurantImages[0]?.image_url || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80"} 
                    alt={restaurantImages[0]?.alt_text || "Турецкий стол"} 
                    className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-[500px] bg-gradient-to-br from-secondary to-primary/20 flex items-center justify-center">
                    <ImageIcon className="w-20 h-20 text-primary/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h4 className="text-2xl font-bold text-white mb-2">Попробуйте настоящую Турцию</h4>
                  <p className="text-white/80">Свежие продукты, традиционные специи, неповторимый вкус</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Наше место Section */}
      <section id="our-place" className="py-24 px-6 md:px-12 bg-background relative">
        <div className="max-w-7xl mx-auto">
          <SectionHeader title="Наше место" subtitle="Атмосфера и интерьер" centered={true} />
          
          <div className="space-y-8">
            {/* Gallery Section */}
            {sectionImages.length > 0 ? (
              <div className="relative">
                {/* Main Image */}
                <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={currentSectionImage.image_url}
                    alt={currentSectionImage.alt_text || "Интерьер ресторана"}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Navigation Buttons */}
                  {sectionImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                      >
                        ←
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                      >
                        →
                      </button>
                    </>
                  )}
                  
                  {/* Image Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {currentSectionImage.alt_text || "Наш ресторан"}
                    </h3>
                    {currentSectionImage.description && (
                      <p className="text-white/80">
                        {currentSectionImage.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Thumbnails */}
                {sectionImages.length > 1 && (
                  <div className="flex gap-4 mt-6 overflow-x-auto py-4">
                    {sectionImages.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden transition-all ${
                          index === currentImageIndex 
                            ? 'ring-4 ring-primary scale-105' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text || "Интерьер"}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-gradient-to-br from-secondary/20 to-primary/10 rounded-2xl border border-dashed border-border">
                <ImageIcon className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Фотографии скоро появятся</h3>
                <p className="text-muted-foreground">
                  Администратор добавит фотографии нашего ресторана в ближайшее время
                </p>
              </div>
            )}
            
            {/* Description */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-card p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary mb-4">
                  <ChefHat className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold mb-2">Уютная атмосфера</h4>
                <p className="text-muted-foreground text-sm">
                  Теплый интерьер в турецком стиле создает неповторимую атмосферу 
                  комфорта и гостеприимства.
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-card p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold mb-2">Идеальное место для встреч</h4>
                <p className="text-muted-foreground text-sm">
                  Подходит как для романтических ужинов, так и для больших компаний 
                  друзей и семьи.
                </p>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-card p-6 rounded-2xl border border-border/50 hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold mb-2">Турецкий колорит</h4>
                <p className="text-muted-foreground text-sm">
                  Каждый элемент интерьера отражает богатую культуру и традиции 
                  настоящей Турции.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" className="py-24 px-6 md:px-12 bg-background relative">
        <div className="max-w-7xl mx-auto">
          <SectionHeader title="Наше меню" subtitle="Лучшее из турецкой кухни" />
          
          {/* استخدام MenuGrid */}
          {!isCatLoading && !isItemsLoading ? (
            availableItems.length > 0 ? (
              <MenuGrid 
                categories={categories || []} 
                items={availableItems} 
                onItemClick={handleItemClick}
              />
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-br from-secondary/20 to-primary/10 rounded-2xl border border-dashed border-border p-12">
                  <Sparkles className="w-20 h-20 text-primary/30 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-foreground mb-4">Меню готовится</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    В данный момент нет доступных блюд в мену. 
                    Администратор добавит новые блюда в ближайшее время.
                  </p>
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>📊 Total items in database: {normalizedItems?.length || 0}</p>
                    <p>✅ Available items: {availableItems.length}</p>
                    {normalizedItems && normalizedItems.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded">
                        <p className="text-yellow-700 text-xs">
                          Some items may be hidden due to availability or incomplete data.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="text-center">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i: number) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-8">Загрузка меню...</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 md:px-12 bg-gradient-to-b from-secondary/30 to-background relative">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
         <div className="max-w-7xl mx-auto">
            <SectionHeader title="Посетите нас" subtitle="Бронирование и контакты" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-card p-8 rounded-2xl shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary">
                      <MapPin className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Адрес</h3>
                      <p className="text-muted-foreground mt-1">Приходите в гости</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium">
                    {displayContactInfo.address || 
                     (isContactLoading ? "Загрузка..." : "Адрес не указан")}
                  </p>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-card p-8 rounded-2xl shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary">
                      <Phone className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Контакты</h3>
                      <p className="text-muted-foreground mt-1">Всегда на связи</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {displayContactInfo.phone ? (
                      <a 
                        href={`tel:${displayContactInfo.phone}`}
                        className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        {displayContactInfo.phone}
                      </a>
                    ) : (
                      <p className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                        <Phone className="w-5 h-5" />
                        Телефон не указан
                      </p>
                    )}
                    
                    {displayContactInfo.email ? (
                      <a 
                        href={`mailto:${displayContactInfo.email}`}
                        className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                      >
                        <MessageSquare className="w-5 h-5" />
                        {displayContactInfo.email}
                      </a>
                    ) : (
                      <p className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                        <MessageSquare className="w-5 h-5" />
                        Email не указан
                      </p>
                    )}
                    
                    {/* ✅ عرض تطبيقات المراسلة المملوءة فقط */}
                    {hasMessagingApps ? (
                      <div className="space-y-2">
                        {displayContactInfo.whatsapp?.trim() && (
                          <a 
                            href={getWhatsAppLink(displayContactInfo.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                          >
                            <MessageSquare className="w-5 h-5" />
                            WhatsApp: {displayContactInfo.whatsapp}
                          </a>
                        )}
                        
                        {displayContactInfo.telegram?.trim() && (
                          <a 
                            href={getTelegramLink(displayContactInfo.telegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                          >
                            <MessageCircle className="w-5 h-5" />
                            Telegram: {displayContactInfo.telegram}
                          </a>
                        )}
                        
                        {displayContactInfo.max?.trim() && (
                          <a 
                            href={`tel: ${displayContactInfo.max}`}
                            className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors"
                          >
                            <Phone className="w-5 h-5" />
                            Макс (Max): {displayContactInfo.max}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="flex items-center gap-3 text-lg font-medium text-muted-foreground">
                        <MessageSquare className="w-5 h-5" />
                        Приложения для связи не указаны
                      </p>
                    )}
                  </div>
                  
                  {/* قسم الروابط الاجتماعية - بدون تغيير */}
                  {hasSocialLinks && (
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <p className="text-sm font-medium mb-4">Мы в соцсетях:</p>
                      <div className="flex gap-3">
                        {socialLinks.instagram?.trim() && (
                          <a 
                            href={formatSocialLink(socialLinks.instagram, 'instagram')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#E4405F] hover:bg-[#E4405F]/10 transition-all"
                            title="Instagram"
                          >
                            <Instagram className="w-6 h-6" />
                          </a>
                        )}

                        {socialLinks.mailru?.trim() && (
                          <a 
                            href={formatSocialLink(socialLinks.mailru, 'mailru')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#005FF9] hover:bg-[#005FF9]/10 transition-all"
                            title="Mail.ru (Мой Мир)"
                          >
                            <Mail className="w-6 h-6" />
                          </a>
                        )}
                        
                        {socialLinks.vk?.trim() && (
                          <a 
                            href={formatSocialLink(socialLinks.vk, 'vk')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-[#0077FF] transition-all"
                            title="ВКонтакте"
                          >
                            <img 
                              src="/images/vk.svg" 
                              alt="VK"
                              className="w-6 h-6"
                            />
                          </a>
                        )}
                        
                        {socialLinks.ozon?.trim() && (
                          <a 
                            href={formatSocialLink(socialLinks.ozon, 'ozon')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#005BFF] hover:bg-[#005BFF]/10 transition-all"
                            title="Ozon"
                          >
                            <ShoppingBag className="w-6 h-6" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-card p-8 rounded-2xl shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center text-primary">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Часы работы</h3>
                      <p className="text-muted-foreground mt-1">Ждем вас</p>
                    </div>
                  </div>
                  
                  {/* عرض اليوم الحالي */}
                  <div className="mb-6 p-4 bg-secondary/20 rounded-lg border border-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isRestaurantOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span className="font-bold text-lg">{todayName}</span>
                      </div>
                      <Badge className={`${isRestaurantOpen ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {isRestaurantOpen ? 'Открыто сейчас' : 'Закрыто'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-lg font-medium">
                        {todaySchedule ? todaySchedule : "Выходной"}
                      </p>
                      {!isRestaurantOpen && nextOpeningTime && (
                        <p className="text-sm text-muted-foreground">
                          {nextOpeningTime}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* عرض جدول الأسبوع */}
                  <div className="space-y-3">
                    <p className="font-medium text-sm mb-2">Расписание на неделю:</p>
                    {weekSchedule.map((day, index) => (
                      <div 
                        key={index} 
                        className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                          day.isToday ? 'bg-primary/10 border border-primary/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {day.isToday && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                          )}
                          <span className={`${day.isToday ? 'font-bold text-primary' : 'text-foreground'}`}>
                            {day.name}
                          </span>
                        </div>
                        <span className={`${day.isToday ? 'font-bold' : 'text-muted-foreground'}`}>
                          {day.hours ? day.hours : 'Выходной'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    * Бронирование столиков рекомендуется за день до визита
                  </p>
                </motion.div>
              </div>

              {/* Map and Call to Action */}
              <div className="space-y-8">
                {displayContactInfo.mapEmbedUrl ? (
                  <div 
                    className="h-[400px] rounded-2xl overflow-hidden shadow-xl border border-border/50"
                    dangerouslySetInnerHTML={{ __html: displayContactInfo.mapEmbedUrl }}
                  />
                ) : (
                  <div className="h-[400px] bg-gradient-to-br from-card to-secondary/30 rounded-2xl shadow-xl border border-border/50 flex flex-col items-center justify-center p-8">
                    <MapPin className="w-24 h-24 text-primary/30 mb-6" />
                    <h3 className="text-2xl font-bold text-center mb-2">Мы находимся в центре города</h3>
                    <p className="text-muted-foreground text-center">
                      {displayContactInfo.address || "Адрес не указан"}
                    </p>
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Легко найти, удобная парковка рядом
                    </p>
                  </div>
                )}
                
                <div id="booking-widget" className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
                  <h3 className="text-2xl font-bold mb-4">Забронировать столик</h3>
                  <p className="text-muted-foreground mb-6">
                    Хотите гарантированно получить лучший столик? 
                    Забронируйте заранее по телефону или через приложения для связи.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    {displayContactInfo.phone ? (
                      <Button size="lg" className="bg-gradient-to-r from-primary to-amber-600 text-white hover:from-amber-500 hover:to-primary flex-1">
                        <a href={`tel:${displayContactInfo.phone}`}>
                          <Phone className="w-5 h-5 mr-2" />
                          Позвонить
                        </a>
                      </Button>
                    ) : (
                      <Button size="lg" disabled className="flex-1">
                        <Phone className="w-5 h-5 mr-2" />
                        Телефон не указан
                      </Button>
                    )}
                    
                    {/* ✅ أزرار تطبيقات المراسلة المملوءة فقط */}
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      {displayContactInfo.whatsapp?.trim() && (
                        <Button size="lg" variant="outline" className="flex-1">
                          <a 
                            href={getWhatsAppLink(displayContactInfo.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageSquare className="w-5 h-5 mr-2" />
                            WhatsApp
                          </a>
                        </Button>
                      )}
                      
                      {displayContactInfo.telegram?.trim() && (
                        <Button size="lg" variant="outline" className="flex-1">
                          <a 
                            href={getTelegramLink(displayContactInfo.telegram)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Telegram
                          </a>
                        </Button>
                      )}
                      
                      {displayContactInfo.max?.trim() && (
                        <Button size="lg" variant="outline" className="flex-1">
                          <a 
                            href={`tel:${displayContactInfo.max}`}
                          >
                            <Phone className="w-5 h-5 mr-2" />
                            Макс
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-black to-gray-900 py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="/images/logo.png" 
                  alt="Istanbul Logo" 
                  className="w-22 h-20 md:w-20 md:h-20 object-contain mx-auto"
                />
                <span className="font-display font-bold text-2xl text-white"></span>
              </div>
              <p className="text-white/70 text-sm">
                Аутентичная турецкая кухня в самом сердце города.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">общее</h4>
              <ul className="space-y-2">
                <li><a href="#about" className="text-white/70 hover:text-white transition-colors">О нас</a></li>
                <li><a href="#menu" className="text-white/70 hover:text-white transition-colors">Наше меню</a></li>
                <li><a href="#our-place" className="text-white/70 hover:text-white transition-colors">Наше место</a></li>
                <li><a href="#contact" className="text-white/70 hover:text-white transition-colors">Контакты</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4">Контакты</h4>
              <ul className="space-y-2">
                <li className="text-white/70">{displayContactInfo.address || "Адрес не указан"}</li>
                <li className="text-white/70">{displayContactInfo.phone || "Телефон не указан"}</li>
                <li className="text-white/70">{displayContactInfo.email || "Email не указан"}</li>
              </ul>
            </div>
            
            {/* قسم الروابط الاجتماعية في الفوتر - التحديث هنا */}
            {hasSocialLinks && (
              <div>
                <h4 className="text-white font-bold mb-4">Мы в соцсетях</h4>
                <div className="flex gap-3">
                  {socialLinks.instagram?.trim() && (
                    <a 
                      href={formatSocialLink(socialLinks.instagram, 'instagram')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-[#E4405F] hover:bg-white/20 transition-all"
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}

                  {socialLinks.mailru?.trim() && (
                    <a 
                      href={formatSocialLink(socialLinks.mailru, 'mailru')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-[#005FF9] hover:bg-white/20 transition-all"
                      title="Mail.ru (Мой Мир)"
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                  
                  {socialLinks.vk?.trim() && (
                    <a 
                      href={formatSocialLink(socialLinks.vk, 'vk')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-[#0077FF] transition-all"
                      title="ВКонтакте"
                    >
                      <img 
                        src="/images/vk.svg" 
                        alt="VK"
                        className="w-5 h-5"
                      />
                    </a>
                  )}
                  
                  {socialLinks.ozon?.trim() && (
                    <a 
                      href={formatSocialLink(socialLinks.ozon, 'ozon')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-[#005BFF] hover:bg-white/20 transition-all"
                      title="Ozon"
                    >
                      <ShoppingBag className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="pt-8 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} Ресторан Стамбул. Все права защищены.
            </p>
            <p className="text-white/30 text-xs mt-2">
              Сделано с любовью к турецкой кухне
            </p>
          </div>
        </div>
      </footer>

      {/* Item Details Modal */}
      {selectedItem && (
        <MenuItemDetails
          item={selectedItem}
          contactInfo={fullContactInfo}
          isOpen={!!selectedItem}
          onClose={handleCloseDetails}
        />
      )}

      {/* ✅ Real-time Update Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        
      </motion.div>
    </div>
  );
}