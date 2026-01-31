## Packages
framer-motion | For smooth page transitions and micro-interactions
react-icons | Additional icon sets if Lucide isn't enough (though Lucide is usually sufficient, I'll stick to Lucide as requested in prompt mostly)
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  body: ["var(--font-body)"],
  script: ["var(--font-script)"],
}
