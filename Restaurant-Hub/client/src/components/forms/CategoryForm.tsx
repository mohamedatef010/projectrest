// components/forms/CategoryForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type InsertCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";

interface CategoryFormProps {
  defaultValues?: Partial<InsertCategory>;
  onSubmit: (data: InsertCategory) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function CategoryForm({ defaultValues, onSubmit, isSubmitting, onCancel }: CategoryFormProps) {
  const form = useForm<InsertCategory>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      orderIndex: 0,
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (data: InsertCategory) => {
    try {
      // التحقق من البيانات
      if (!data.name || data.name.trim() === "") {
        form.setError("name", {
          type: "manual",
          message: "Название категории обязательно",
        });
        return;
      }

      console.log("📤 Submitting category data:", data);
      await onSubmit(data);
      
      // إعادة تعيين النموذج
      form.reset();
    } catch (error) {
      console.error("❌ Category form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="category-name" className="text-sm font-medium">
                Название категории *
              </FormLabel>
              <FormControl>
                <Input 
                  id="category-name"
                  placeholder="Например, Основные блюда" 
                  {...field} 
                  className="h-10"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="category-description" className="text-sm font-medium">
                Описание
              </FormLabel>
              <FormControl>
                <Textarea 
                  id="category-description"
                  placeholder="Краткое описание категории..." 
                  className="resize-none h-20" 
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orderIndex"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="category-order" className="text-sm font-medium">
                Порядок сортировки
              </FormLabel>
              <FormControl>
                <Input 
                  id="category-order"
                  type="number" 
                  placeholder="0" 
                  {...field}
                  value={field.value || 0}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  className="h-10"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Чем меньше число, тем выше категория в списке
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-10"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
          >
            {isSubmitting ? "Сохранение..." : (defaultValues ? "Обновить" : "Создать")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}