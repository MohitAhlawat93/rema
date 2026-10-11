// Witness Lema SEO settings, adapted from Rebecca's config-first design.
// Edit titles/descriptions here, then commit once to trigger a single Vercel build.
const pages = {
  '/': {
    title: 'Witness Lema | Personal Portfolio in Gurgaon',
    description: 'Meet Witness Lema in Gurgaon. Explore her personal introduction, curated portraits, services and ways to make contact.',
    index: true, image: '/images/gallery/portrait-01.jpg'
  },
  '/about/': {
    title: 'About Witness Lema | Profile and Introduction',
    description: 'Get to know Witness Lema through her personal profile, background, interests and curated introduction.',
    index: true, image: '/images/gallery/portrait-17.jpg'
  },
  '/gallery/': {
    title: 'Witness Lema Gallery | Portraits and Photography',
    description: 'Browse the curated Witness Lema photo gallery, including portraits and lifestyle photography.',
    index: true, image: '/images/gallery/portrait-02.jpg'
  },
  '/services/': {
    title: 'Services and Experiences | Witness Lema, Gurgaon',
    description: 'Explore the currently published services and experience options from Witness Lema in Gurgaon.',
    index: true, image: '/images/gallery/portrait-06.jpg'
  },
  '/contact/': {
    title: 'Contact Witness Lema | Get in Touch',
    description: 'Find the official contact options for Witness Lema and prepare a private enquiry through the website.',
    index: true, image: '/images/gallery/portrait-03.jpg'
  },
  '/privacy/': {
    title: 'Privacy Notice | Witness Lema',
    description: 'Read how the Witness Lema website handles enquiries, assistant questions and third-party hosting.',
    index: false, image: '/images/gallery/portrait-01.jpg'
  },
  '/404/': {
    title: 'Page Not Found | Witness Lema',
    description: 'This page is not available. Explore the Witness Lema website using the main navigation.',
    index: false, image: '/images/gallery/portrait-01.jpg'
  }
};

const environment = process.env.VERCEL_ENV;
// Always prevent preview and development Vercel deployments from being indexed.
// Local production simulation: SEO_INDEXING_ENABLED=true npm run build
const indexingEnabled = (environment ? environment === 'production' : process.env.SEO_INDEXING_ENABLED === 'true') &&
  process.env.SEO_INDEXING_ENABLED !== 'false';

export default {
  // When moving to a permanent custom domain, configure SEO_SITE_ORIGIN in Vercel.
  origin: process.env.SEO_SITE_ORIGIN || 'https://rema-ruby.vercel.app',
  indexingEnabled,
  brand: 'Witness Lema',
  language: 'en-IN',
  locale: 'en_IN',
  // Google recommends appropriate adult-content classification on explicit pages.
  adultRating: true,
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  pages
};
