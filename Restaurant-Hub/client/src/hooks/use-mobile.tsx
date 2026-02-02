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

export function useMobileHeader() {
  const [isVisible, setIsVisible] = React.useState(true)
  const isMobile = useIsMobile()
  const lastScrollYRef = React.useRef(0)

  React.useEffect(() => {
    if (!isMobile) {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current

      // ✅ عند التمرير لأسفل نخفي الهيدر
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false)
      }
      // ✅ عند التمرير لأعلى نظهر الهيدر ونتركه ثابتًا
      else if (currentScrollY < lastScrollY - 5) {
        setIsVisible(true)
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [isMobile])

  return { isVisible, setIsVisible }
}