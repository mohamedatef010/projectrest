// components/forms/MenuItemForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema, type InsertMenuItem, type Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface MenuItemFormProps {
  categories: Category[];
  defaultValues?: Partial<InsertMenuItem>;
  onSubmit: (data: InsertMenuItem) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function MenuItemForm({ categories, defaultValues, onSubmit, isSubmitting, onCancel }: MenuItemFormProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      details: "",
      price: 0,
      originalPrice: 0,
      isAvailable: true,
      categoryId: undefined,
      hasDiscount: false,
      discountPercentage: 0,
      isFeatured: false,
      imageUrl: "",
      ...defaultValues,
    },
  });

  const hasDiscount = form.watch("hasDiscount");
  const discountPercentage = form.watch("discountPercentage") || 0;

  // إعداد القيم الأولية عند تحميل القيم الافتراضية
  useEffect(() => {
    if (defaultValues) {
      // لا تقم بتحويل الكوبيك إلى روبل، استخدم الأسعار كما هي (الآن الأسعار بالروبل مباشرة)
      const processedValues = {
        ...defaultValues,
        price: Number(defaultValues.price) || 0,
        originalPrice: Number(defaultValues.originalPrice) || 0,
        discountPercentage: Number(defaultValues.discountPercentage) || 0,
        hasDiscount: Boolean(defaultValues.hasDiscount),
        isAvailable: Boolean(defaultValues.isAvailable),
        isFeatured: Boolean(defaultValues.isFeatured),
        categoryId: Number(defaultValues.categoryId) || (categories[0]?.id || undefined),
      };
      
      form.reset(processedValues);
      if (processedValues.categoryId) {
        setSelectedCategory(processedValues.categoryId.toString());
      }
      
      if (processedValues.imageUrl) {
        setImagePreview(processedValues.imageUrl);
      } else {
        setImagePreview(null);
      }
    } else if (categories.length > 0) {
      const firstCategoryId = categories[0].id;
      form.setValue("categoryId", firstCategoryId);
      setSelectedCategory(firstCategoryId.toString());
      setImagePreview(null);
    }
  }, [defaultValues, form, categories]);

  // دالة لرفع الصورة إلى Cloudinary
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "❌ خطأ",
        description: "نوع الملف غير مدعوم. يُرجى اختيار صورة (JPEG, JPG, PNG, WebP, GIF)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "❌ خطأ",
        description: "حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('image_type', 'menu_item');

      const response = await fetch('/api/images/upload/site', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const imageUrl = result.data.image_url;
        form.setValue('imageUrl', imageUrl);
        setImagePreview(imageUrl);
        
        toast({
          title: "✅ تم رفع الصورة",
          description: "تم رفع الصورة بنجاح",
        });
      } else {
        throw new Error(result.error || 'فشل رفع الصورة');
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل رفع الصورة. حاول مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', '');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  if (!categories || categories.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Внимание!
          </h3>
          <p className="text-yellow-700">
            Сначала создайте категорию в разделе "Categories".
          </p>
          <p className="text-yellow-700 text-sm mt-2">
            Без категории вы не сможете добавить блюдо в меню.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={onCancel}
          >
            Вернуться назад
          </Button>
        </div>
      </div>
    );
  }

  const handleFormSubmit = async (data: InsertMenuItem) => {
    try {
      // التحقق من الحقول المطلوبة
      if (!data.name || !data.price || !data.categoryId) {
        toast({
          title: "❌ Ошибка",
          description: "Заполните обязательные поля: название, цена и категория",
          variant: "destructive",
        });
        return;
      }

      // لا تقم بتحويل الروبل إلى كوبيك - استخدم الأسعار كما هي (بالروبل)
      const processedData = {
        ...data,
        price: Math.abs(Number(data.price)) || 0,
        originalPrice: Math.abs(Number(data.originalPrice)) || 0,
        discountPercentage: Math.min(100, Math.max(0, Number(data.discountPercentage) || 0)),
      };

      await onSubmit(processedData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const parseNumber = (value: string): number => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handlePriceChange = (value: string) => {
    const numValue = parseNumber(value);
    form.setValue("price", numValue, { shouldValidate: true });
    
    if (hasDiscount && discountPercentage > 0) {
      const currentOriginalPrice = form.getValues("originalPrice");
      if (!currentOriginalPrice || currentOriginalPrice === 0) {
        form.setValue("originalPrice", numValue, { shouldValidate: true });
      }
    }
  };

  const handleDiscountPercentageChange = (value: string) => {
    const numValue = parseNumber(value);
    const validatedValue = Math.min(100, Math.max(0, numValue));
    form.setValue("discountPercentage", validatedValue, { shouldValidate: true });
    
    if (hasDiscount && validatedValue > 0) {
      const originalPrice = form.getValues("originalPrice");
      if (originalPrice && originalPrice > 0) {
        const discountAmount = originalPrice * (validatedValue / 100);
        const discountedPrice = originalPrice - discountAmount;
        form.setValue("price", parseFloat(discountedPrice.toFixed(2)), { shouldValidate: true });
      }
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    form.setValue("hasDiscount", checked, { shouldValidate: true });
    if (checked) {
      const currentPrice = form.getValues("price") || 0;
      const originalPrice = form.getValues("originalPrice");
      
      if (!originalPrice || originalPrice === 0) {
        form.setValue("originalPrice", currentPrice, { shouldValidate: true });
      }
      
      if (discountPercentage > 0) {
        const original = form.getValues("originalPrice") || currentPrice;
        const discountAmount = original * (discountPercentage / 100);
        const discountedPrice = original - discountAmount;
        form.setValue("price", parseFloat(discountedPrice.toFixed(2)), { shouldValidate: true });
      }
    }
  };

  const handleOriginalPriceChange = (value: string) => {
    const numValue = parseNumber(value);
    form.setValue("originalPrice", numValue, { shouldValidate: true });
    
    if (hasDiscount && discountPercentage > 0 && numValue > 0) {
      const discountAmount = numValue * (discountPercentage / 100);
      const discountedPrice = numValue - discountAmount;
      form.setValue("price", parseFloat(discountedPrice.toFixed(2)), { shouldValidate: true });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="item-name" className="text-sm font-medium">
                  Название блюда *
                </FormLabel>
                <FormControl>
                  <Input 
                    id="item-name"
                    placeholder="Например, Адана кебаб" 
                    {...field} 
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price Field */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="item-price" className="text-sm font-medium">
                  Цена (₽) *
                </FormLabel>
                <FormControl>
                  <Input 
                    id="item-price"
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="1500.00" 
                    value={field.value || 0}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="h-10"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Введите цену в рублях (например: 1500.00)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Field */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => {
              const value = field.value?.toString() || "";
              
              return (
                <FormItem>
                  <FormLabel htmlFor="item-category" className="text-sm font-medium">
                    Категория *
                  </FormLabel>
                  <Select 
                    onValueChange={(val) => {
                      const numValue = parseInt(val);
                      field.onChange(numValue);
                      setSelectedCategory(val);
                    }}
                    value={value}
                  >
                    <FormControl>
                      <SelectTrigger id="item-category" className="h-10">
                        <SelectValue placeholder="Выберите категорию">
                          {value ? categories.find(c => c.id.toString() === value)?.name : "Выберите категорию"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Image Upload Field */}
          <FormItem>
            <FormLabel className="text-sm font-medium">
                 Изображение блюда            </FormLabel>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Предпросмотр изображения" 
                      className="w-full h-48 object-cover"
                      onError={() => {
                        setImagePreview(null);
                        form.setValue('imageUrl', '');
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {uploadingImage ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Загрузка изображения...                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Нажмите для загрузки изображения или перетащите и отпустите

                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WebP, GIF до 5 МБ


                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="text-xs text-muted-foreground">
                <p className="mb-1">Или введите ссылку на изображение вручную</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://example.com/image.jpg"
                    value={form.getValues("imageUrl") || ""}
                    onChange={(e) => {
                      form.setValue("imageUrl", e.target.value);
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                      } else {
                        setImagePreview(null);
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        </div>

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="item-description" className="text-sm font-medium">
                Краткое описание
              </FormLabel>
              <FormControl>
                <Textarea 
                  id="item-description"
                  placeholder="Краткое описание блюда..." 
                  className="resize-none h-20" 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Details Field */}
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="item-details" className="text-sm font-medium">
                Подробные детали (для страницы деталей)
              </FormLabel>
              <FormControl>
                <Textarea 
                  id="item-details"
                  placeholder="Ингредиенты, способ приготовления, вес и т.д." 
                  className="resize-none min-h-[100px]" 
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Discount Section */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="hasDiscount"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Добавить скидку
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Показать цену со скидкой
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id="has-discount"
                    checked={field.value || false}
                    onCheckedChange={handleSwitchChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasDiscount && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <FormField
                control={form.control}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="discount-percentage" className="text-sm font-medium">
                      Процент скидки (%)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        id="discount-percentage"
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="20" 
                        value={field.value || 0}
                        onChange={(e) => handleDiscountPercentageChange(e.target.value)}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="original-price" className="text-sm font-medium">
                      Исходная цена (₽) (до скидки)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        id="original-price"
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="2000.00" 
                        value={field.value || 0}
                        onChange={(e) => handleOriginalPriceChange(e.target.value)}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Checkboxes Section */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="isAvailable"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    id="is-available"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="is-available" className="text-sm font-medium">
                    Доступно для заказа
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Это блюдо будет отображаться в меню.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    id="is-featured"
                    checked={field.value || false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel htmlFor="is-featured" className="text-sm font-medium">
                    Рекомендуемое блюдо
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Отображать в разделе "Рекомендуем".
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {hasDiscount && discountPercentage > 0 && (
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Расчет скидки:</p>
                <p className="text-sm text-muted-foreground">
                  {(form.getValues("originalPrice") || 0).toFixed(2)} ₽ - {discountPercentage}% ={' '}
                  <span className="font-bold text-primary">
                    {(form.getValues("price") || 0).toFixed(2)} ₽
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Экономия:</p>
                <p className="text-sm font-bold text-green-600">
                  {((form.getValues("originalPrice") || 0) - (form.getValues("price") || 0)).toFixed(2)} ₽
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting || uploadingImage}
            className="h-10"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || uploadingImage} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
          >
            {isSubmitting ? "Сохранение..." : (uploadingImage ? "Загрузка изображения..." : "Сохранить блюдо")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}