// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
   rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', 
        '/api/', 
        '/merchant/', // Bots don't need to see merchant dashboards
        '/checkout/', // Block bots from payment screens
        '/escrow/',   // Block bots from escrow vaults
      ],
    },
    sitemap: [
      'https://slashdeals.com.ng/sitemap/0.xml',
      'https://slashdeals.com.ng/sitemap/1.xml',
      'https://slashdeals.com.ng/sitemap/2.xml',
      'https://slashdeals.com.ng/sitemap/3.xml',
      'https://slashdeals.com.ng/sitemap/4.xml',
      'https://slashdeals.com.ng/sitemap/5.xml',
    ],
    host: 'https://slashdeals.com.ng',
  };
}