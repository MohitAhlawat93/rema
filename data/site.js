// Public content model. Replace demo assets and copy with owner-approved content here.
import images from './gallery.json' with { type: 'json' };
import knowledge from './assistant/knowledge.json' with { type: 'json' };

export const site = {
  name: 'witness_lema_',
  brand: 'witness_lema_',
  language: 'en',
  timezone: 'UTC',
  demo: false,
  email: '',
  announcement: '',
  announcementExpiresAt: '',

  description: 'Elegant Kenyan companion in Gurgaon. Warm girlfriend experiences and passionate encounters for discerning gentlemen.',

  hero: {
    eyebrow: 'witness_lema_',
    title: 'Presence.\nPassion.\nPurely personal.',
    intro: 'A refined companion for those who value chemistry, elegance and unforgettable moments in Gurgaon.'
  },

  about: {
    title: 'A little mystery.\nA personal introduction.',
    heading: 'Kenyan elegance in Gurgaon.',
    text: 'I’m Lema — warm, confident and completely present. Originally from Kenya and now based in Gurgaon, I offer genuine companionship for gentlemen who appreciate quality and real connection. Whether you desire soft intimacy and affection or something more passionate and uninhibited, I bring both with equal care. Every meeting is private, clean and focused on your complete satisfaction.',
    paragraphs: []
  },

  profileFacts: [],

  // Only owner-approved, lawful professional and social offerings belong here.
  services: [
    {
      number: '01',
      title: 'Dinner & Social Companion',
      text: 'A polished companion for dinner, conversation or a relaxed social evening. Each engagement is arranged with discretion and attention to the setting.',
      tag: 'Enquire for availability',
      image: '/images/gallery/portrait-06.jpg'
    },
    {
      number: '02',
      title: 'Event Companion',
      text: 'Confident, personable company for selected private events, celebrations and public occasions, with details agreed clearly in advance.',
      tag: 'By arrangement',
      image: '/images/gallery/portrait-14.jpg'
    },
    {
      number: '03',
      title: 'Weekend Travel Companion',
      text: 'Thoughtful social companionship for a planned weekend itinerary, subject to schedule, destination and travel arrangements.',
      tag: 'Travel considered',
      image: '/images/gallery/portrait-16.jpg'
    },
    {
      number: '04',
      title: 'Private Video Introduction',
      text: 'A short, scheduled video conversation for introductions and general enquiries before making plans.',
      tag: 'Advance booking',
      image: '/images/gallery/portrait-20.jpg'
    },
    {
      number: '05',
      title: 'Bespoke Social Experience',
      text: 'A tailored social experience designed around a lawful occasion, location and preferred atmosphere. Share the idea privately for consideration.',
      tag: 'Tailored enquiry',
      image: '/images/gallery/portrait-03.jpg'
    }
  ],
  servicesIntro: 'Every engagement is approached with warmth, discretion and careful attention to detail. Choose a starting point below, or get in touch to discuss a tailored lawful social experience.',

  social: {
    whatsapp: 'https://wa.me/918119034436',
    telegram: '',
    instagram: 'https://www.instagram.com/reel/DdlFE68JfyZ/?cplk=ejN5ampjczV2OWJr'
  },

  images,
  faqs: knowledge
};
