import { useState } from "react";
import { motion } from "framer-motion";
import { X, ShoppingCart, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem, ContactInfo } from "@shared/schema";

interface MenuItemDetailsProps {
  item: MenuItem;
  contactInfo: ContactInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MenuItemDetails({ item, contactInfo, isOpen, onClose }: MenuItemDetailsProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const calculatePrice = () => {
    if (item.hasDiscount && item.discountPercentage) {
      const discount = item.price * item.discountPercentage / 100;
      return item.price - discount;
    }
    return item.price;
  };

  const finalPrice = calculatePrice();

  const handleOrder = () => {
    setShowContactForm(true);
  };

  const handleContact = () => {
    if (contactInfo?.phone) {
      const message = `Здравствуйте! Я хочу заказать ${item.name} (${quantity} шт.)`;
      const whatsappUrl = `https://wa.me/${contactInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-none md:rounded-lg">
        <div className="relative">
          {/* تم إزالة زر الإغلاق المخصص هنا لأن DialogContent به زر إغلاق مدمج */}
          
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Image section - نفس التصميم للجميع */}
            <div className="relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-full lg:min-h-[500px]">
              <img
                src={item.imageUrl || "https://pixabay.com/get/g6dce458fbaad755b0439ec41a16d7f2b10baee9133cb61dbc0566ee19e77c042b2a91796bb00597c57a3292b6ddc636817f4baec313ab1114b86641c7ff42728_1280.jpg"}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              {item.hasDiscount && item.discountPercentage && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full font-bold text-sm">
                  -{item.discountPercentage}%
                </div>
              )}
            </div>

            {/* Details section - نفس التصميم للجميع */}
            <div className="p-6 md:p-8 lg:p-8">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{item.name}</h2>
                
                <div className="flex items-center gap-3 mb-4">
                  {item.hasDiscount && item.originalPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-2xl font-bold text-primary">
                        {formatCurrency(finalPrice)}
                      </span>
                      <span className="text-lg md:text-lg text-muted-foreground line-through">
                        {formatCurrency(item.originalPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl md:text-2xl font-bold text-primary">
                      {formatCurrency(item.price)}
                    </span>
                  )}
                </div>

                {item.description && (
                  <p className="text-muted-foreground mb-4 text-base">{item.description}</p>
                )}
              </div>

              {item.details && (
                <div className="mb-6">
                  <h3 className="text-xl md:text-xl font-semibold mb-3">Подробности</h3>
                  <p className="text-muted-foreground whitespace-pre-line text-base">{item.details}</p>
                </div>
              )}

              {!showContactForm ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Количество:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        -
                      </Button>
                      <span className="w-12 text-center text-base">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button 
                      size="lg" 
                      className="bg-primary text-primary-foreground hover:bg-amber-400 h-12 text-base"
                      onClick={handleOrder}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Заказать сейчас
                    </Button>
                    
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="h-12 text-base"
                      onClick={handleContact}
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Связаться
                    </Button>
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-xl md:text-xl font-semibold">Свяжитесь с нами для заказа</h3>
                  
                  {contactInfo && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <a 
                          href={`tel:${contactInfo.phone}`}
                          className="text-lg md:text-lg hover:text-primary transition-colors"
                        >
                          {contactInfo.phone}
                        </a>
                      </div>
                      
                      {contactInfo.whatsapp && (
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          <a 
                            href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg md:text-lg hover:text-primary transition-colors"
                          >
                            WhatsApp: {contactInfo.whatsapp}
                          </a>
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground">
                        <p>Сообщите нам, что хотите заказать:</p>
                        <p className="font-medium mt-1">{item.name} × {quantity} = {formatCurrency(finalPrice * quantity)}</p>
                      </div>
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base"
                    onClick={() => setShowContactForm(false)}
                  >
                    Назад
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}