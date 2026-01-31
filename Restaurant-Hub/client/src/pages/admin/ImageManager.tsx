// src/pages/admin/ImageManager.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Upload,
  Star,
  Image as ImageIcon,
  Globe,
  Package,
  X,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MenuItem {
  id: number;
  name: string;
  categoryId?: number;
}

interface MenuImage {
  id: number;
  menu_item_id: number;
  image_url: string;
  public_id?: string;
  is_main: boolean;
  order: number;
  created_at: string;
}

interface SiteImage {
  id: number;
  image_type: string;
  image_url: string;
  public_id?: string;
  alt_text?: string;
  description?: string;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export default function ImageManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<number | null>(null);
  const [imageType, setImageType] = useState<string>("site");
  const [altText, setAltText] = useState("");
  const [description, setDescription] = useState("");
  const [siteImageType, setSiteImageType] = useState("general");

  // جلب عناصر المنيو
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
    queryFn: async () => {
      const res = await fetch("/api/menu-items");
      if (!res.ok) throw new Error("Не удалось загрузить блюда");
      const result: ApiResponse = await res.json();
      return result.data || [];
    },
  });

  // جلب الصور المحفوظة للموقع
  const { data: siteImagesResponse, refetch: refetchSiteImages } = useQuery<ApiResponse>({
    queryKey: ["/api/site-images"],
    queryFn: async () => {
      const res = await fetch("/api/site-images");
      if (!res.ok) return { success: false, data: [], message: "Failed to fetch" };
      return res.json();
    },
  });

  const siteImages: SiteImage[] = siteImagesResponse?.success ? (siteImagesResponse.data || []) : [];

  // جلب صور المنيو
  const { data: menuImagesResponse, refetch: refetchMenuImages } = useQuery<ApiResponse>({
    queryKey: ["/api/menu-items", selectedMenuItem, "images"],
    queryFn: async () => {
      if (!selectedMenuItem) return { success: false, data: [], message: "No menu item selected" };
      const res = await fetch(`/api/menu-items/${selectedMenuItem}/images`);
      if (!res.ok) return { success: false, data: [], message: "Failed to fetch" };
      return res.json();
    },
    enabled: !!selectedMenuItem,
  });

  const menuImages: MenuImage[] = menuImagesResponse?.success ? (menuImagesResponse.data || []) : [];

  // رفع صورة للموقع
  const uploadSiteImage = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/images/upload/site", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: "Изображение загружено в систему",
        });
        refetchSiteImages();
        setSelectedFile(null);
        setAltText("");
        setDescription("");
      } else {
        toast({
          title: "❌ Ошибка",
          description: data.error || data.message || "Ошибка загрузки",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // رفع صورة للمنيو
  const uploadMenuImage = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/images/upload/menu", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: "Изображение блюда загружено",
        });
        refetchMenuImages();
        setSelectedFile(null);
      } else {
        toast({
          title: "❌ Ошибка",
          description: data.error || data.message || "Ошибка загрузки",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // حذف صورة موقع
  const deleteSiteImage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/site-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: "Изображение удалено",
        });
        refetchSiteImages();
      } else {
        toast({
          title: "❌ Ошибка",
          description: data.error || data.message || "Ошибка удаления",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось удалить изображение",
        variant: "destructive",
      });
    },
  });

  // حذف صورة منيو
  const deleteMenuImage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: "Изображение блюда удалено",
        });
        refetchMenuImages();
      } else {
        toast({
          title: "❌ Ошибка",
          description: data.error || data.message || "Ошибка удаления",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось удалить изображение",
        variant: "destructive",
      });
    },
  });

  // تعيين صورة رئيسية
  const setMainImage = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/menu-images/${id}/set-main`, {
        method: "PUT",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      if (data.success) {
        toast({
          title: "✅ Успешно",
          description: "Изображение установлено как главное",
        });
        refetchMenuImages();
      } else {
        toast({
          title: "❌ Ошибка",
          description: data.error || data.message || "Ошибка установки",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "❌ Ошибка",
        description: "Не удалось установить изображение",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "⚠️ Неподдерживаемый тип файла",
          description: "Пожалуйста, выберите файл изображения (JPG, PNG, WebP)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "⚠️ Файл слишком большой",
          description: "Максимальный размер 5 МБ",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "⚠️ Выберите изображение",
        description: "Сначала выберите изображение для загрузки",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    if (imageType === "site") {
      formData.append("image_type", siteImageType);
      formData.append("alt_text", altText);
      formData.append("description", description);
      uploadSiteImage.mutate(formData);
    } else if (imageType === "menu" && selectedMenuItem) {
      formData.append("menu_item_id", selectedMenuItem.toString());
      uploadMenuImage.mutate(formData);
    }
  };

  const getImageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hero: "Главное изображение",
      restaurant: "Ресторан/Интерьер",
      logo: "Логотип",
      about: "Изображение раздела 'О нас'",
      category: "Изображение категории",
      general: "Общее изображение",
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="mb-8 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">🎨 Управление изображениями</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Загрузка и организация всех изображений сайта и меню</p>
      </div>

      <Tabs defaultValue="site" onValueChange={setImageType} className="w-full">
        <TabsList className="grid w-full max-w-full md:max-w-md grid-cols-2 mb-8 mx-4 sm:mx-0">
          <TabsTrigger value="site" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Изображения сайта</span>
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Изображения меню</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site" className="space-y-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">📤 Загрузка новых изображений для сайта</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Вы можете загружать изображения для использования в различных разделах сайта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-upload" className="text-sm sm:text-base">Выберите изображение</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="mt-2 text-sm"
                    />
                  </div>
                  {selectedFile && (
                    <div className="p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm sm:text-base">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} МБ
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Предпросмотр"
                          className="w-full h-32 sm:h-40 object-cover rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-type" className="text-sm sm:text-base">Тип изображения</Label>
                    <Select value={siteImageType} onValueChange={setSiteImageType}>
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hero">Главное изображение</SelectItem>
                        <SelectItem value="restaurant">Ресторан/Интерьер</SelectItem>
                        <SelectItem value="logo">Логотип</SelectItem>
                        <SelectItem value="about">Раздел 'О нас'</SelectItem>
                        <SelectItem value="category">Категория</SelectItem>
                        <SelectItem value="general">Общее</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="alt-text" className="text-sm sm:text-base">Альтернативный текст (Alt Text)</Label>
                    <Input
                      id="alt-text"
                      placeholder="Краткое описание изображения"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm sm:text-base">Описание (необязательно)</Label>
                    <Input
                      id="description"
                      placeholder="Подробное описание изображения"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadSiteImage.isPending}
                    className="w-full text-sm sm:text-base"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadSiteImage.isPending ? "Загрузка..." : "Загрузить изображение"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">🖼️ Сохраненные изображения</CardTitle>
              <CardDescription className="text-sm sm:text-base">Все изображения сайта, сохраненные в системе</CardDescription>
            </CardHeader>
            <CardContent>
              {siteImages.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm sm:text-base">Изображений пока нет</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {siteImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <div className="relative h-40 sm:h-48">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || "Изображение сайта"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteSiteImage.mutate(image.id)}
                            disabled={deleteSiteImage.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                          <Badge variant="secondary" className="w-fit text-xs">
                            {getImageTypeLabel(image.image_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(image.created_at).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        {image.alt_text && (
                          <p className="text-sm font-medium mb-1 truncate">{image.alt_text}</p>
                        )}
                        {image.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {image.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-6 px-4 sm:px-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">🍽️ Управление изображениями меню</CardTitle>
              <CardDescription className="text-sm sm:text-base">Выберите блюдо для управления его изображениями</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm sm:text-base">Выберите блюдо из меню</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                    value={selectedMenuItem || ""}
                    onChange={(e) => setSelectedMenuItem(Number(e.target.value))}
                  >
                    <option value="">-- Выберите блюдо --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMenuItem && (
                  <>
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-4">📤 Загрузить новое изображение</h3>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="flex-1 text-sm"
                        />
                        <Button
                          onClick={handleUpload}
                          disabled={!selectedFile || uploadMenuImage.isPending}
                          className="w-full sm:w-auto text-sm sm:text-base"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Загрузить изображение
                        </Button>
                      </div>
                      {selectedFile && (
                        <div className="mt-4 p-4 bg-secondary/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm sm:text-base">{selectedFile.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFile(null)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Предпросмотр"
                            className="w-full h-32 sm:h-40 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-medium mb-4">🖼️ Изображения блюда</h3>
                      {menuImages.length === 0 ? (
                        <div className="text-center py-8 border border-dashed rounded-lg">
                          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground text-sm sm:text-base">Нет изображений для этого блюда</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Загрузите первое изображение для отображения здесь
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {menuImages.map((image) => (
                            <Card key={image.id} className="overflow-hidden">
                              <div className="relative h-40 sm:h-48">
                                <img
                                  src={image.image_url}
                                  alt={`Изображение ${selectedMenuItem}`}
                                  className="w-full h-full object-cover"
                                />
                                {image.is_main && (
                                  <div className="absolute top-2 left-2">
                                    <Badge className="bg-green-500 text-xs">
                                      <Star className="w-3 h-3 mr-1" />
                                      Главное
                                    </Badge>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                  {!image.is_main && (
                                    <Button
                                      variant="secondary"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setMainImage.mutate(image.id)}
                                    >
                                      <Star className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => deleteMenuImage.mutate(image.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <CardContent className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    Порядок: {image.order}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(image.created_at).toLocaleDateString("ru-RU")}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}