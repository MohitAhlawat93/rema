// Witness Lema SEO settings, adapted from Rebecca's config-first design.
// Edit titles/descriptions here, then commit once to trigger a single Vercel build.
const pages = {
  '/': {
    title: 'Witness Lema | Kenyan Companion in Gurgaon',
    description: 'Explore Witness Lema’s official Gurgaon website, including her introduction, portrait gallery, available services and contact options.',
    index: true, image: '/images/gallery/portrait-01.jpg'
  },
  '/about/': {
    title: 'About Witness Lema | Kenyan Companion in Gurgaon',
    description: 'Read Witness Lema’s introduction, learn about her Kenyan background and explore her profile and curated photographs.',
    index: true, image: '/images/gallery/portrait-17.jpg'
  },
  '/gallery/': {
    title: 'Witness Lema Photo Gallery | Portraits and Lifestyle',
    description: 'Browse the Witness Lema gallery, with selected portraits and lifestyle photographs presented in an easy-to-explore collection.',
    index: true, image: '/images/gallery/portrait-02.jpg'
  },
  '/services/': {
    title: 'Witness Lema Services | Gurgaon Companion Experiences',
    description: 'Read the currently published Witness Lema service options, descriptions and starting prices, and find out how to confirm the details.',
    index: true, image: '/images/gallery/portrait-06.jpg'
  },
  '/contact/': {
    title: 'Contact Witness Lema | Official Contact Options',
    description: 'Find Witness Lema’s published contact links and prepare an enquiry to copy and send using your preferred contact channel.',
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
