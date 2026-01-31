import { useCategories, useMenuItems, useContactInfo } from "@/hooks/use-restaurant";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, ListFilter, Users } from "lucide-react";

export default function AdminDashboard() {
  const { data: categories } = useCategories();
  const { data: items } = useMenuItems();
  const { data: contact } = useContactInfo();

  const stats = [
    {
      title: "Всего категорий",
      value: categories?.length || 0,
      icon: ListFilter,
      description: "Активные разделы меню"
    },
    {
      title: "Всего блюд",
      value: items?.length || 0,
      icon: Utensils,
      description: "Блюда в меню"
    },
    {
      title: "Блюд в наличии",
      value: items?.filter((i: any) => i.isAvailable).length || 0,
      icon: Utensils,
      description: "Можно подать гостям"
    }
  ];

  return (
    <AdminLayout>
      <div className="mb-8 px-4 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Панель управления</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Добро пожаловать в панель управления рестораном.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 px-4 sm:px-0">
        {stats.map((stat, i: number) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card border-border/50 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 px-4 sm:px-0">
        <Card className="bg-card border-border/50">
           <CardHeader>
             <CardTitle className="text-lg sm:text-xl">Быстрые действия</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Перейдите во вкладку «Меню», чтобы добавить сезонные блюда или обновить цены. 
                Не забудьте отмечать блюда как «нет в наличии», если закончились ингредиенты.
              </p>
           </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
           <CardHeader>
             <CardTitle className="text-lg sm:text-xl">Текущие контакты</CardTitle>
           </CardHeader>
           <CardContent className="space-y-2">
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-sm text-muted-foreground">Телефон</span>
                <span className="text-sm font-medium truncate ml-2">{contact?.phone || "Не указано"}</span>
              </div>
              <div className="flex justify-between border-b border-border/30 pb-2">
                <span className="text-sm text-muted-foreground">Адрес</span>
                <span className="text-sm font-medium truncate max-w-[150px] sm:max-w-[200px]">{contact?.address || "Не указано"}</span>
              </div>
           </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}