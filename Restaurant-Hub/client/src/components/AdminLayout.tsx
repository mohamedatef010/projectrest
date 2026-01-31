// AdminLayout.tsx
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  LogOut, 
  Settings,
  Store,
  Image as ImageIcon,
  Menu,
  X
} from "lucide-react"; // ✅ إضافة Menu و X للأيقونات
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react"; // ✅ إضافة useEffect

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { logout, user } = useAuth();
  const [location] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // ✅ حالة فتح/إغلاق قائمة الموبايل
  const [isMobile, setIsMobile] = useState(false); // ✅ حالة التعرف على شاشة الموبايل

  // ✅ كشف حجم الشاشة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // ✅ إغلاق قائمة الموبايل عند تغيير المسار
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Обзор" },
    { href: "/admin/menu", icon: UtensilsCrossed, label: "Меню" },
    { href: "/admin/images", icon: ImageIcon, label: "Изображения" },
    { href: "/admin/settings", icon: Settings, label: "Информация о ресторане" },
  ];

  const getFirstName = () => {
    if (!user) return "Admin";
    return user.first_name || "Admin";
  };

  const getInitial = () => {
    const firstName = getFirstName();
    return firstName.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      await logout();
      window.location.href = "/admin/login";
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/admin/login";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar for Desktop */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        {/* Desktop sidebar content remains the same */}
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
             {logoError ? (
               <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-colors">
                 <Store className="w-6 h-6 text-primary" />
               </div>
             ) : (
               <img 
                 src="/images/logo.png" 
                 alt="Istanbul Restaurant Logo" 
                 className="w-14 h-14 object-contain group-hover:opacity-90 transition-opacity"
                 onError={() => setLogoError(true)}
                 onLoad={() => setLogoError(false)}
               />
             )}
             <div>
               <h2 className="font-display font-bold text-xl tracking-wide">Istanbul</h2>
               <p className="text-xs text-muted-foreground uppercase tracking-widest">Панель администратора</p>
             </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? "bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {getInitial()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{getFirstName()}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || "admin@istanbul.ru"}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full gap-2 border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Выход..." : "Выйти"}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
          
          <div className="flex items-center gap-2">
            {logoError ? (
              <div className="bg-primary/20 p-1 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
            ) : (
              <img 
                src="/images/logo.png" 
                alt="Istanbul Logo" 
                className="w-10 h-10 object-contain"
                onError={() => setLogoError(true)}
                onLoad={() => setLogoError(false)}
              />
            )}
            <Link href="/admin" className="font-display font-bold text-xl cursor-pointer">Istanbul Admin</Link>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* User Avatar for mobile */}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {getInitial()}
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Выйти"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Menu */}
      <aside className={`
        md:hidden fixed top-16 left-0 right-0 z-40 
        bg-card border-b border-border
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? "bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        {/* User info in mobile menu */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {getInitial()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-base font-medium truncate">{getFirstName()}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email || "admin@istanbul.ru"}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}