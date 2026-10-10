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

  // Add only owner-approved service descriptions here. Empty sections stay hidden.
  services: [],
  servicesIntro: 'For current information, please get in touch.',

  social: {
    whatsapp: 'https://wa.me/918119034436',
    telegram: '',
    instagram: 'https://www.instagram.com/reel/DdlFE68JfyZ/?cplk=ejN5ampjczV2OWJr'
  },

  images,
  faqs: knowledge
};
