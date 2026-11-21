import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Devtools } from '../components/devtools';
import appCss from '../styles.css?url';

const title = '⌂ houseguide';
const description = 'Teach your coding agent the house rules.';
const canonicalUrl = 'https://houseguide.dev/';
const socialImagePath = '/social-card.png';
const socialImage = import.meta.env.DEV ? socialImagePath : new URL(socialImagePath, canonicalUrl).href;
const socialImageAlt = 'Houseguide. Teach your coding agent the house rules.';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: socialImage },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: socialImageAlt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:url', content: canonicalUrl },
      { name: 'twitter:image', content: socialImage },
      { name: 'twitter:image:alt', content: socialImageAlt }
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: canonicalUrl },
      { rel: 'icon', href: '/favicon.ico', type: 'image/x-icon', sizes: '48x48' }
    ]
  }),
  shellComponent: RootDocument
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html className="scheme-dark" lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-paper font-sans text-ink">
        {children}
        <Devtools />
        <Scripts />
      </body>
    </html>
  );
}
