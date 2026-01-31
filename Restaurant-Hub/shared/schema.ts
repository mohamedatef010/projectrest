import { z } from "zod";

// User Schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  googleId: z.string().optional(),
  isAdmin: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
});

export const insertUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Category Schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Название категории обязательно"),
  imageUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  orderIndex: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
});

export const insertCategorySchema = categorySchema.omit({ 
  id: true, 
  createdAt: true 
});

export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

// Menu Item Schema - التعديل هنا
export const menuItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Название блюда обязательно"),
  description: z.string().optional(),
  details: z.string().optional(),
  // تغيير من number إلى string ثم تحويلها إلى number
  price: z.preprocess(
    (val) => {
      // إذا كانت القيمة undefined/null، تعيين 0
      if (val === undefined || val === null) return 0;
      // إذا كانت string، تحويلها إلى number
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      // إذا كانت بالفعل number، إرجاعها كما هي
      return val;
    },
    z.number()
      .min(0, "Цена не может быть отрицательной")
      .refine(val => val >= 0, {
        message: "Цена не может быть отрицательной"
      })
  ),
  // نفس الشيء لـ originalPrice
  originalPrice: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      return val;
    },
    z.number()
      .min(0, "Цена не может быть отрицательной")
      .optional()
  ).optional(),
  categoryId: z.number(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  hasDiscount: z.boolean().default(false),
  discountPercentage: z.number().min(0).max(100).default(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  createdAt: z.date().default(() => new Date()),
});

export const insertMenuItemSchema = menuItemSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type MenuItem = z.infer<typeof menuItemSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// ✅ تحديث contactInfoSchema لإضافة أيام الأسبوع
export const contactInfoSchema = z.object({
  id: z.number(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  openingHours: z.string().optional(),
  // ✅ إضافة حقول أيام الأسبوع
  mondayHours: z.string().optional(),
  tuesdayHours: z.string().optional(),
  wednesdayHours: z.string().optional(),
  thursdayHours: z.string().optional(),
  fridayHours: z.string().optional(),
  saturdayHours: z.string().optional(),
  sundayHours: z.string().optional(),
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
  max: z.string().optional(),
  mapEmbedUrl: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    vk: z.string().optional(),
    mailru: z.string().optional(),
    ozon: z.string().optional(),
  }).optional().default({
    facebook: "",
    instagram: "",
    vk: "",
    mailru: "",
    ozon: ""
  }),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const insertContactInfoSchema = contactInfoSchema.omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
}).extend({
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  openingHours: z.string().optional().default(""),
  // ✅ إضافة حقول أيام الأسبوع مع قيم افتراضية
  mondayHours: z.string().optional().default(""),
  tuesdayHours: z.string().optional().default(""),
  wednesdayHours: z.string().optional().default(""),
  thursdayHours: z.string().optional().default(""),
  fridayHours: z.string().optional().default(""),
  saturdayHours: z.string().optional().default(""),
  sundayHours: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  telegram: z.string().optional().default(""),
  max: z.string().optional().default(""),
  mapEmbedUrl: z.string().optional().default(""),
  socialLinks: z.object({
    facebook: z.string().optional().default(""),
    instagram: z.string().optional().default(""),
    vk: z.string().optional().default(""),
    mailru: z.string().optional().default(""),
    ozon: z.string().optional().default(""),
  }).optional().default({
    facebook: "",
    instagram: "",
    vk: "",
    mailru: "",
    ozon: ""
  }),
});

export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type InsertContactInfo = z.infer<typeof insertContactInfoSchema>;

// Order Schema
export const orderItemSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  price: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      return val;
    },
    z.number().min(0, "Цена не может быть отрицательной")
  ),
  quantity: z.number().min(1),
});

export const orderSchema = z.object({
  id: z.number(),
  customerName: z.string().min(1, "Имя клиента обязательно"),
  phone: z.string().min(1, "Телефон обязателен"),
  items: z.array(orderItemSchema),
  totalPrice: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
      }
      return val;
    },
    z.number().min(0, "Итоговая цена не может быть отрицательной")
  ),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

export const insertOrderSchema = orderSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Image Schemas
export const menuImageSchema = z.object({
  id: z.number(),
  menuItemId: z.number(),
  imageUrl: z.string(),
  isMain: z.boolean().default(false),
  order: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
});

export const insertMenuImageSchema = menuImageSchema.omit({ 
  id: true, 
  createdAt: true 
});

export const siteImageSchema = z.object({
  id: z.number(),
  imageType: z.string(),
  imageUrl: z.string(),
  altText: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
});

export const insertSiteImageSchema = siteImageSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type MenuImage = z.infer<typeof menuImageSchema>;
export type SiteImage = z.infer<typeof siteImageSchema>;
export type InsertMenuImage = z.infer<typeof insertMenuImageSchema>;
export type InsertSiteImage = z.infer<typeof insertSiteImageSchema>;