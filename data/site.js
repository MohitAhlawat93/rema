// Public content model. Replace demo assets and copy with owner-approved content here.
import images from './gallery.json' with { type: 'json' };
import knowledge from './assistant/knowledge.json' with { type: 'json' };
export const site = {
  name: 'witness_lema_', brand: 'witness_lema_', language: 'en', timezone: 'UTC',
  demo: true, email: '', announcement: '', announcementExpiresAt: '',
  description: 'The world of witness_lema_ — a personal portfolio in pictures, stories and expression. ',
  hero: { eyebrow: 'The world of witness_lema_', title: 'A presence.\nAn impression.\nEntirely individual.', intro: 'A glimpse into a world of character, curiosity and considered detail.' },
  about: { title: 'A little mystery.\nA personal introduction.', heading: 'Individual by nature. Expressive by design.', text: 'Welcome to my world — a space for personality, expression and the details that make an introduction memorable.', paragraphs: [] },
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
