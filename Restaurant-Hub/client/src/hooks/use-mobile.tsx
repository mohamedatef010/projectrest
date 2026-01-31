// hooks/use-mobile.tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// ✅ إضافة Hook جديد للتحكم في ظهور/اختفاء الهيدر على الموبايل
export function useMobileHeader() {
  const [isVisible, setIsVisible] = React.useState(true)
  const [lastScrollY, setLastScrollY] = React.useState(0)
  const [isTouched, setIsTouched] = React.useState(false)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    if (!isMobile) {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // إذا كان المستخدم يتحرك للأسفل (للأسفل في الصفحة)، نخفي الهيدر
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false)
      } 
      // إذا كان المستخدم يتحرك للأعلى، نظهر الهيدر
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
      setIsTouched(false) // إعادة تعيين حالة اللمس بعد التمرير
    }

    // إظهار الهيدر عند اللمس
    const handleTouchStart = () => {
      setIsTouched(true)
      setIsVisible(true)
      
      // إخفاء الهيدر بعد 2 ثانية من عدم النشاط
      setTimeout(() => {
        if (!isTouched) {
          setIsVisible(false)
        }
      }, 2000)
    }

    // إخفاء الهيدر بعد انتهاء اللمس
    const handleTouchEnd = () => {
      setIsTouched(false)
      setTimeout(() => {
        if (!isTouched && window.scrollY > 100) {
          setIsVisible(false)
        }
      }, 1000)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, lastScrollY, isTouched])

  return { isVisible, setIsVisible }
}