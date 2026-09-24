import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/account",
          "/checkout",
          "/cart",
          "/login",
          "/register",
          "/forgot-password",
          // نسخ الفلاتر تسبب محتوى مكرراً
          "/*?*q=",
          "/*?*sort=",
          "/*?*minPrice=",
          "/*?*maxPrice=",
          "/*?*inStock=",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}