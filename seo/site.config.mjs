// Witness Lema SEO settings (developer fallbacks).
// Prefer editing titles, descriptions and images through the private /admin
// Google SEO dashboard — no code or redeploy required for published changes.
const pages = {
  '/': {
    title: 'Witness Lema | Independent Kenyan Companion in Gurgaon',
    description: 'Independent Kenyan companion in Gurgaon. Private incalls, outcalls, overnight stays and personal experiences. Discreet, warm and direct.',
    index: true, image: '/images/gallery/portrait-01.jpg'
  },
  '/about/': {
    title: 'About Witness Lema | Black Kenyan Companion Gurgaon',
    description: 'Meet Witness Lema — a warm Black Kenyan companion based in Gurgaon. Genuine connection, private meetings and complete discretion.',
    index: true, image: '/images/gallery/portrait-17.jpg'
  },
  '/gallery/': {
    title: 'Witness Lema Gallery | Kenyan Companion Photos Gurgaon',
    description: 'Official portraits and lifestyle photographs of Witness Lema, independent Kenyan companion in Gurgaon.',
    index: true, image: '/images/gallery/portrait-02.jpg'
  },
  '/services/': {
    title: 'Witness Lema Services | Incall Outcall Overnight Gurgaon',
    description: 'Private incall, outcall, overnight, dinner date, video call and custom experiences with Witness Lema in Gurgaon. Clear starting rates.',
    index: true, image: '/images/gallery/portrait-06.jpg'
  },
  '/contact/': {
    title: 'Contact Witness Lema | Independent Companion Gurgaon',
    description: 'Contact Witness Lema directly on WhatsApp for private meetings in Gurgaon. Independent Kenyan companion — discreet and responsive.',
    index: true, image: '/images/gallery/portrait-03.jpg'
  },
  '/privacy/': {
    title: 'Privacy Notice | Witness Lema',
    description: 'How the Witness Lema website handles enquiries and third-party services.',
    index: false, image: '/images/gallery/portrait-01.jpg'
  },
  '/404/': {
    title: 'Page Not Found | Witness Lema',
    description: 'This page is not available. Use the main navigation to continue.',
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
