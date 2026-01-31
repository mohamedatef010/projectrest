// src/pages/admin/Settings.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminLayout } from "@/components/AdminLayout";
import { useContactInfo, useUpdateContactInfo } from "@/hooks/use-restaurant";
import { insertContactInfoSchema, type InsertContactInfo } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// تعريف النوع العالمي
declare global {
  interface Window {
    triggerContactInfoUpdate?: () => void;
  }
}

export default function Settings() {
  const { data: contactInfo, refetch: refetchContactInfo } = useContactInfo();
  const updateContact = useUpdateContactInfo();
  const { toast } = useToast();
  const [messagingApp, setMessagingApp] = useState<string>("whatsapp");

  const form = useForm<InsertContactInfo>({
    resolver: zodResolver(insertContactInfoSchema),
    defaultValues: {
      phone: "",
      address: "",
      email: "",
      openingHours: "",
      mondayHours: "",
      tuesdayHours: "",
      wednesdayHours: "",
      thursdayHours: "",
      fridayHours: "",
      saturdayHours: "",
      sundayHours: "",
      whatsapp: "",
      telegram: "",
      max: "",
      mapEmbedUrl: "",
      socialLinks: { 
        facebook: "", 
        instagram: "", 
        vk: "", 
        mailru: "", 
        ozon: "" 
      }
    }
  });

  useEffect(() => {
    if (contactInfo) {
      console.log('📥 Loaded contact info:', contactInfo);
      
      // التحقق من صحة socialLinks والتأكد من أن القيم ليست undefined
      let socialLinks = { 
        facebook: "", 
        instagram: "", 
        vk: "", 
        mailru: "", 
        ozon: "" 
      };
      
      if (contactInfo.socialLinks) {
        if (typeof contactInfo.socialLinks === 'string') {
          try {
            const parsed = JSON.parse(contactInfo.socialLinks);
            socialLinks = {
              facebook: parsed?.facebook || "",
              instagram: parsed?.instagram || "",
              vk: parsed?.vk || "",
              mailru: parsed?.mailru || "",
              ozon: parsed?.ozon || ""
            };
          } catch (error) {
            console.error('❌ Error parsing socialLinks:', error);
          }
        } else {
          // التأكد من أن القيم ليست undefined
          socialLinks = {
            facebook: contactInfo.socialLinks?.facebook || "",
            instagram: contactInfo.socialLinks?.instagram || "",
            vk: contactInfo.socialLinks?.vk || "",
            mailru: contactInfo.socialLinks?.mailru || "",
            ozon: contactInfo.socialLinks?.ozon || ""
          };
        }
      }

      // ✅ تحميل جميع الحقول بما في ذلك telegram و max وأيام الأسبوع
      form.reset({
        phone: contactInfo.phone || "",
        address: contactInfo.address || "",
        email: contactInfo.email || "",
        openingHours: contactInfo.openingHours || "",
        mondayHours: contactInfo.mondayHours || "",
        tuesdayHours: contactInfo.tuesdayHours || "",
        wednesdayHours: contactInfo.wednesdayHours || "",
        thursdayHours: contactInfo.thursdayHours || "",
        fridayHours: contactInfo.fridayHours || "",
        saturdayHours: contactInfo.saturdayHours || "",
        sundayHours: contactInfo.sundayHours || "",
        whatsapp: contactInfo.whatsapp || "",
        telegram: contactInfo.telegram || "", // ✅ تحميل التيليجرام
        max: contactInfo.max || "", // ✅ تحميل الماكس
        mapEmbedUrl: contactInfo.mapEmbedUrl || "",
        socialLinks: socialLinks
      });

      // تحديد تطبيق المراسلة الافتراضي بناءً على نوع المدخل
      if (contactInfo.whatsapp && contactInfo.whatsapp !== "") {
        const whatsappValue = contactInfo.whatsapp;
        if (whatsappValue.includes('@') || whatsappValue.includes('t.me')) {
          setMessagingApp("telegram");
        } else if (whatsappValue.match(/^\+?\d[\d\s\-\(\)]+$/)) {
          setMessagingApp("whatsapp");
        } else {
          setMessagingApp("whatsapp");
        }
      }
    }
  }, [contactInfo, form]);

 const onSubmit = async (data: InsertContactInfo) => {
  try {
    console.log('📤 Отправка данных формы:', data);

    // التأكد من أن socialLinks ليس undefined
    const safeSocialLinks = data.socialLinks || { 
      facebook: "", 
      instagram: "", 
      vk: "", 
      mailru: "", 
      ozon: "" 
    };
    
    console.log('🔍 Social links to save:', safeSocialLinks);
    
    // ✅ إعداد البيانات للتطابق مع API - إضافة telegram و max وأيام الأسبوع
    const apiData = {
      phone: data.phone || "",
      address: data.address || "",
      email: data.email || "",
      opening_hours: data.openingHours || "",
      monday_hours: data.mondayHours || "",
      tuesday_hours: data.tuesdayHours || "",
      wednesday_hours: data.wednesdayHours || "",
      thursday_hours: data.thursdayHours || "",
      friday_hours: data.fridayHours || "",
      saturday_hours: data.saturdayHours || "",
      sunday_hours: data.sundayHours || "",
      whatsapp: data.whatsapp || "",
      telegram: data.telegram || "", // ✅ إضافة هذا الحقل
      max: data.max || "", // ✅ إضافة هذا الحقل
      map_embed_url: data.mapEmbedUrl || "",
      // ✅ **IMPORTANT**: يجب تحويل social_links إلى JSON string
      social_links: JSON.stringify(safeSocialLinks)
    };

    console.log('📤 Отправка данных в API:', apiData);

    // استخدام POST بدلاً من PUT
    const response = await fetch('/api/contact-info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(apiData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка ответа сервера:', errorText);
      
      // محاولة استخدام PUT إذا فشل POST
      console.log('🔄 Trying PUT method...');
      const putResponse = await fetch('/api/contact-info', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(apiData)
      });
      
      if (!putResponse.ok) {
        const putErrorText = await putResponse.text();
        console.error('❌ PUT также failed:', putErrorText);
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
      }
      
      const putResult = await putResponse.json();
      console.log('✅ PUT Ответ API:', putResult);
      
      if (putResult.success) {
        handleSuccess(putResult);
      } else {
        throw new Error(putResult.error || 'Неизвестная ошибка');
      }
      
      return;
    }

    const result = await response.json();
    console.log('✅ POST Ответ API:', result);

    if (result.success) {
      handleSuccess(result);
    } else {
      throw new Error(result.error || 'Неизвестная ошибка');
    }
    
  } catch (error: any) {
    console.error('❌ Ошибка при обновлении контактной информации:', error);
    toast({ 
      title: "❌ Ошибка", 
      description: error.message || "Не удалось обновить настройки", 
      variant: "destructive" 
    });
  }
};

  const handleSuccess = (result: any) => {
    // إعادة تحميل البيانات المحلية
    refetchContactInfo();
    
    // عرض رسالة نجاح
    toast({ 
      title: "✅ Успешно", 
      description: "Настройки ресторана обновлены и будут отображены на сайте" 
    });

    // إرسال إشعار تحديث إلى الصفحة العامة
    const updateEvent = new CustomEvent('contactInfoUpdated', { 
      detail: result.data 
    });
    window.dispatchEvent(updateEvent);

    // تفعيل وظيفة التحديث العالمية إذا كانت موجودة
    if (window.triggerContactInfoUpdate) {
      window.triggerContactInfoUpdate();
    }

    // إعادة تحميل البيانات بعد ثانية للتأكد
    setTimeout(() => {
      refetchContactInfo();
    }, 1000);
  };

  const testApiConnection = async () => {
    try {
      console.log('🧪 Testing API connection...');
      
      const getResponse = await fetch('/api/contact-info');
      const getData = await getResponse.json();
      console.log('🧪 GET Response:', getData);
      
      const testData = {
        phone: '+7 (999) 999-99-99',
        address: 'Test Address',
        email: 'test@test.com',
        opening_hours: 'Test Hours',
        monday_hours: '10:00 до 23:00',
        tuesday_hours: '10:00 до 23:00',
        wednesday_hours: '10:00 до 22:00',
        thursday_hours: '10:00 до 23:00',
        friday_hours: '10:00 до 00:00',
        saturday_hours: '11:00 до 00:00',
        sunday_hours: '11:00 до 22:00',
        whatsapp: '+7 (999) 999-99-99',
        telegram: '@testuser',
        max: '+7 (999) 888-88-88',
        map_embed_url: '',
        social_links: { 
          facebook: '', 
          instagram: '', 
          vk: '', 
          mailru: '', 
          ozon: '' 
        }
      };
      
      const postResponse = await fetch('/api/contact-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(testData)
      });
      console.log('🧪 POST Status:', postResponse.status, postResponse.statusText);
      
      if (postResponse.ok) {
        const postData = await postResponse.json();
        console.log('🧪 POST Response:', postData);
        toast({
          title: "✅ API Connection Test",
          description: "API connection successful!",
        });
      }
      
    } catch (error) {
      console.error('🧪 API Test Error:', error);
      toast({
        title: "❌ API Test Failed",
        description: "Failed to connect to API",
        variant: "destructive"
      });
    }
  };

  const getSafeSocialLinks = () => {
    if (!contactInfo?.socialLinks) {
      return { 
        facebook: "", 
        instagram: "", 
        vk: "", 
        mailru: "", 
        ozon: "" 
      };
    }
    
    if (typeof contactInfo.socialLinks === 'string') {
      try {
        const parsed = JSON.parse(contactInfo.socialLinks);
        return {
          facebook: parsed?.facebook || "",
          instagram: parsed?.instagram || "",
          vk: parsed?.vk || "",
          mailru: parsed?.mailru || "",
          ozon: parsed?.ozon || ""
        };
      } catch {
        return { 
          facebook: "", 
          instagram: "", 
          vk: "", 
          mailru: "", 
          ozon: "" 
        };
      }
    }
    
    return {
      facebook: contactInfo.socialLinks?.facebook || "",
      instagram: contactInfo.socialLinks?.instagram || "",
      vk: contactInfo.socialLinks?.vk || "",
      mailru: contactInfo.socialLinks?.mailru || "",
      ozon: contactInfo.socialLinks?.ozon || ""
    };
  };

  const currentSocialLinks = getSafeSocialLinks();

  const updateSocialLinkField = (field: keyof typeof currentSocialLinks, value: string) => {
    const currentValues = form.getValues('socialLinks') || { 
      facebook: "", 
      instagram: "", 
      vk: "", 
      mailru: "", 
      ozon: "" 
    };
    form.setValue('socialLinks', {
      ...currentValues,
      [field]: value
    });
  };

  return (
    <AdminLayout>
      <div className="mb-8 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">⚙️ Настройки ресторана</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Управляйте всей контактной информацией и настройками сайта.
        </p>
      </div>

      <div className="max-w-2xl px-4 sm:px-0">
        <Card className="bg-card border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">📞 Контактная информация</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Эти данные отображаются на публичном сайте для клиентов.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Номер телефона</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+7 (4842) 12-34-56" 
                            {...field} 
                            value={field.value || ""}
                            className="text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base">Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="info@istanbul-kaluga.ru" 
                            {...field} 
                            value={field.value || ""}
                            className="text-sm sm:text-base"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-base sm:text-lg">💬 Приложения для связи</h3>
                  <p className="text-sm text-muted-foreground">
                    Добавьте контактные данные для разных приложений. Если оставить поле пустым, оно не будет отображаться на сайте.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">WhatsApp номер</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+7 (***) ***-**-**" 
                              {...field} 
                              value={field.value || ""} 
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="telegram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Telegram username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="@username или t.me/username" 
                              {...field} 
                              value={field.value || ""} 
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="max"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Макс (Max) номер</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+7 (***) ***-**-**" 
                              {...field} 
                              value={field.value || ""} 
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg mt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      💡 <strong>Важно:</strong> Каждое приложение будет отображаться на сайте только если поле заполнено.
                      Вы можете заполнить все три поля или только нужные вам.
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Адрес</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Г. Калуга пл. Мира 4/1" 
                          {...field} 
                          value={field.value || ""}
                          className="text-sm sm:text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mapEmbedUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base">Код карты (Google Maps iframe)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." />' 
                          className="min-h-[100px] text-sm sm:text-base" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ✅ إضافة قسم أيام الأسبوع الجديد */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-medium text-base sm:text-lg">🕒 Часы работы по дням недели</h3>
                  <p className="text-sm text-muted-foreground">
                    Укажите часы работы для каждого дня недели. Например: "10:00 до 23:00"
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mondayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Понедельник (Пн)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tuesdayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Вторник (Вт)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="wednesdayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Среда (Ср)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="thursdayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Четверг (Чт)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fridayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Пятница (Пт)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="saturdayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Суббота (Сб)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sundayHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Воскресенье (Вс)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="10:00 до 23:00" 
                              {...field} 
                              value={field.value || ""}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg mt-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      💡 <strong>Формат:</strong> Введите часы в формате "10:00 до 23:00" или "10:00-23:00".
                      Если ресторан закрыт в этот день, оставьте поле пустым.
                      Система автоматически определит текущий день и покажет соответствующие часы работы посетителям.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-medium text-base sm:text-lg">🔗 Ссылки на социальные сети</h3>
                  <p className="text-sm text-muted-foreground">
                    Добавьте ссылки на ваши профили в социальных сетях. Если оставить поле пустым, иконка не будет отображаться на сайте.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Facebook (устарело в России)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://facebook.com/istanbulrestaurant" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => updateSocialLinkField('facebook', e.target.value)}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="socialLinks.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Instagram</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://instagram.com/istanbul_restaurant" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => updateSocialLinkField('instagram', e.target.value)}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="socialLinks.vk"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">VK (ВКонтакте)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://vk.com/istanbul_restaurant или username" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => updateSocialLinkField('vk', e.target.value)}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="socialLinks.mailru"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Mail.ru (Мой Мир)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://my.mail.ru/ или username" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => updateSocialLinkField('mailru', e.target.value)}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="socialLinks.ozon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm sm:text-base">Ozon</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://ozon.ru/t/... или ссылка на профиль" 
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => updateSocialLinkField('ozon', e.target.value)}
                              className="text-sm sm:text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg mt-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      💡 <strong>Формат ссылок:</strong> Можно ввести полную ссылку (https://vk.com/username) 
                      или просто username. Система автоматически определит правильный формат.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-medium text-base sm:text-lg mb-4">ℹ️ Информация для администратора</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Все изменения сохраняются автоматически и сразу отображаются на публичном сайте.
                    Вы можете добавлять/удалять блюда, менять цены, добавлять скидки и обновлять
                    контактную информацию в реальном времени.
                  </p>
                  
                  <div className="bg-secondary/30 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Текущие данные:</p>
                    <div className="text-xs sm:text-sm space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Телефон:</span>
                        <span className="font-medium truncate">{contactInfo?.phone || "Не указано"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Адрес:</span>
                        <span className="font-medium truncate">{contactInfo?.address || "Не указано"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Email:</span>
                        <span className="font-medium truncate">{contactInfo?.email || "Не указано"}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">WhatsApp:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.whatsapp ? contactInfo.whatsapp : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Telegram:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.telegram ? contactInfo.telegram : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Макс (Max):</span>
                        <span className="font-medium truncate">
                          {contactInfo?.max ? contactInfo.max : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Понедельник:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.mondayHours ? contactInfo.mondayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Вторник:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.tuesdayHours ? contactInfo.tuesdayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Среда:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.wednesdayHours ? contactInfo.wednesdayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Четверг:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.thursdayHours ? contactInfo.thursdayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Пятница:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.fridayHours ? contactInfo.fridayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Суббота:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.saturdayHours ? contactInfo.saturdayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Воскресенье:</span>
                        <span className="font-medium truncate">
                          {contactInfo?.sundayHours ? contactInfo.sundayHours : "Не указано"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Instagram:</span>
                        <span className="font-medium truncate">
                          {currentSocialLinks.instagram ? "✓ Добавлен" : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">VK:</span>
                        <span className="font-medium truncate">
                          {currentSocialLinks.vk ? "✓ Добавлен" : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Mail.ru:</span>
                        <span className="font-medium truncate">
                          {currentSocialLinks.mailru ? "✓ Добавлен" : "Не указан"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
                        <span className="w-32 text-muted-foreground">Ozon:</span>
                        <span className="font-medium truncate">
                          {currentSocialLinks.ozon ? "✓ Добавлен" : "Не указан"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    type="submit" 
                    disabled={updateContact.isPending} 
                    className="w-full bg-primary text-primary-foreground font-bold text-sm sm:text-base"
                  >
                    {updateContact.isPending ? "Сохранение..." : "💾 Сохранить все изменения"}
                  </Button>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-sm sm:text-base"
                      onClick={() => {
                        refetchContactInfo();
                        toast({
                          title: "🔄 Обновление",
                          description: "Данные перезагружены",
                        });
                      }}
                    >
                      🔄 Обновить данные
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 text-sm sm:text-base"
                      onClick={testApiConnection}
                    >
                      🧪 Тест API
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">🔄 Проверка обновлений</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Убедитесь, что изменения отображаются на публичном сайте
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                После сохранения изменений, откройте публичный сайт и проверьте, 
                отображаются ли новые данные. Если нет, обновите страницу вручную.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 text-sm sm:text-base"
                  onClick={() => {
                    window.open('/', '_blank');
                  }}
                >
                  🔗 Открыть публичный сайт
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1 text-sm sm:text-base"
                  onClick={() => {
                    if (window.triggerContactInfoUpdate) {
                      window.triggerContactInfoUpdate();
                      toast({
                        title: "🔄 Обновление",
                        description: "Сигнал обновления отправлен",
                      });
                    } else {
                      toast({
                        title: "⚠️ Внимание",
                        description: "Публичный сайт не загружен",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  📡 Отправить сигнал обновления
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}