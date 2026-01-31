import { z } from "zod";
import type { 
  Category, InsertCategory, 
  MenuItem, InsertMenuItem,
  ContactInfo, InsertContactInfo,
  Order, InsertOrder,
  MenuImage, SiteImage
} from "./schema";

export const api = {
  categories: {
    list: {
      method: "GET",
      path: "/api/categories",
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: "GET",
      path: "/api/categories/:id",
      responses: {
        200: z.any(),
        404: z.object({ error: z.string() }),
      },
    },
    create: {
      method: "POST",
      path: "/api/categories",
      input: z.any(),
      responses: {
        201: z.any(),
        401: z.object({ error: z.string() }),
      },
    },
    update: {
      method: "PUT",
      path: "/api/categories/:id",
      input: z.any(),
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    delete: {
      method: "DELETE",
      path: "/api/categories/:id",
      responses: {
        200: z.object({ message: z.string() }),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  },
  
  menuItems: {
    list: {
      method: "GET",
      path: "/api/menu-items",
      responses: {
        200: z.array(z.any()),
      },
    },
    featured: {
      method: "GET",
      path: "/api/menu-items/featured",
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: "GET",
      path: "/api/menu-items/:id",
      responses: {
        200: z.any(),
        404: z.object({ error: z.string() }),
      },
    },
    create: {
      method: "POST",
      path: "/api/menu-items",
      input: z.any(),
      responses: {
        201: z.any(),
        401: z.object({ error: z.string() }),
      },
    },
    update: {
      method: "PUT",
      path: "/api/menu-items/:id",
      input: z.any(),
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    delete: {
      method: "DELETE",
      path: "/api/menu-items/:id",
      responses: {
        200: z.object({ message: z.string() }),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  },
  
  contactInfo: {
    get: {
      method: "GET",
      path: "/api/contact-info",
      responses: {
        200: z.any(),
      },
    },
    update: {
      method: "PUT",
      path: "/api/contact-info",
      input: z.any(),
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
      },
    },
  },
  
  orders: {
    list: {
      method: "GET",
      path: "/api/orders",
      responses: {
        200: z.array(z.any()),
        401: z.object({ error: z.string() }),
      },
    },
    get: {
      method: "GET",
      path: "/api/orders/:id",
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    create: {
      method: "POST",
      path: "/api/orders",
      input: z.any(),
      responses: {
        201: z.any(),
      },
    },
    update: {
      method: "PUT",
      path: "/api/orders/:id",
      input: z.any(),
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    delete: {
      method: "DELETE",
      path: "/api/orders/:id",
      responses: {
        200: z.object({ message: z.string() }),
        401: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
  },
  
  images: {
    uploadSite: {
      method: "POST",
      path: "/api/images/upload/site",
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
      },
    },
    uploadMenu: {
      method: "POST",
      path: "/api/images/upload/menu",
      responses: {
        200: z.any(),
        401: z.object({ error: z.string() }),
      },
    },
    siteImages: {
      method: "GET",
      path: "/api/site-images",
      responses: {
        200: z.array(z.any()),
      },
    },
    menuImages: {
      method: "GET",
      path: "/api/menu-items/:id/images",
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  
  auth: {
    user: {
      method: "GET",
      path: "/api/auth/user",
      responses: {
        200: z.any(),
        401: z.object({ message: z.string() }),
      },
    },
    login: {
      method: "POST",
      path: "/api/login",
      responses: {
        200: z.object({ message: z.string(), user: z.any() }),
      },
    },
    logout: {
      method: "POST",
      path: "/api/logout",
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
};

export function buildUrl(path: string, params: Record<string, string | number>) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, String(value)),
    path
  );
}