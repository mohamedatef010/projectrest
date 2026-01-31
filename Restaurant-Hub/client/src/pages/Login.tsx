// client/pages/Login.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, isLoading, login, checkAuth } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [logoError, setLogoError] = useState(false); // حالة لتتبع خطأ تحميل الشعار

  useEffect(() => {
    if (user) {
      setLocation("/admin");
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من أن الحقول ليست فارغة
    if (!formData.email.trim() || !formData.password.trim()) {
      toast({
        title: "⚠️ Внимание",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoggingIn(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        toast({
          title: "✅ Успешно",
          description: "Вход выполнен успешно",
        });
        setLocation("/admin");
      } else {
        toast({
          title: "❌ Ошибка",
          description: result.message || "Неверный email или пароль",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Ошибка",
        description: "Ошибка подключения к серверу",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return <Redirect to="/admin" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            {logoError ? (
              // إذا فشل تحميل الشعار، عرض الأيقونة الأصلية
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              // عرض الشعار إذا تم تحميله بنجاح
              <img 
                src="/images/logo.png" 
                alt="Istanbul Restaurant Logo" 
                className="w-28 h-28 object-contain"
                onError={() => setLogoError(true)} // إذا فشل التحميل، تحديث الحالة
                onLoad={() => setLogoError(false)} // إذا تم التحميل بنجاح
              />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">Вход в панель управления</CardTitle>
          <p className="text-muted-foreground mt-2">
            Войдите, чтобы управлять рестораном Istanbul
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Введите email администратора"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>


            <Button 
              type="submit"
              disabled={isLoggingIn}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6"
            >
              {isLoggingIn ? "Вход..." : "Войти"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Для входа требуется доступ администратора
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}