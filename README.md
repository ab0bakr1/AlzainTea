# 🔹 Clean Architure project
  ```sh
src/
├─app/                
│ 
├─ app/ globals.css                        # Global styles take design system and convert to utilites                                   
|
├─assets /                                 # Static assets
│  ├─ images/
│  │  └─ images.tsx                        # import and export all images in this file
│  ├─ Lottie/                              # all images lottie files 
│  │  └─ loading.json
│  │  └─ No-Data.json
│  └─ icons/
│     └─ icons.tsx                         # import and export all icons in this file

├─animations/
│ ├─ Reveal.ts
│ ├─ Floating.ts

├─ components/                             # Reusable UI Components (Atomic Design)
│  ├─ atoms/                               # Smallest elements
│  │  ├─ Images.tsx
│  │  ├─ Input.tsx
│  │  ├─ Text.tsx
│  │  └─ Title.tsx
│  ├─ molecules/                           # Combination of atoms
│  ├─ organisms/                           # sections
│  ├─ templates/                           # Page-level structures
│                         
├─ lib/
│   ├─ cn.ts                               # incude tailwind-merge ,  clsx, type ClassValue
├─ styles/                            
│  └─ variables.css                        # file for design system form figma
├─ utils/                                
│  ├─ data.tx                            # data for loop with map 
│  ├─ routes.tsx                         # routes in navbar
├─ types/
│  ├─ api.d.ts        # global types in project 
│  ├─ global.d.ts
│
├─ core/
│  ├─ ui-state ├─ EmptyState.tsx
│              ├─ LoadingState.tsx
│              ├─ NotFoundState.tsx
│ 
│  ├─ seo      ├─ seo.config.ts
│              ├─ Seo.tsx
│              ├─ seo.types.ts
│              ├─ useSeo.ts
├─ i18n/
│  ├─ index.ts
