// Public content model. Replace demo assets and copy with owner-approved content here.
import images from './gallery.json' with { type: 'json' };
import knowledge from './assistant/knowledge.json' with { type: 'json' };
export const site = {
  name: 'witness_lema_', brand: 'witness_lema_', language: 'en', timezone: 'UTC',
  demo: true, email: '', announcement: '', announcementExpiresAt: '',
  description: 'The world of witness_lema_ — a personal portfolio in pictures, stories and expression. ',
  hero: { eyebrow: 'The world of witness_lema_', title: 'A presence.\nAn impression.\nEntirely individual.', intro: 'A glimpse into a world of character, curiosity and considered detail.' },
  about: { title: 'A little mystery.\nA personal introduction.', heading: 'Individual by nature. Expressive by design.', text: 'Welcome to my world — I’m the perfect company for classy men, ready to provide you with an unforgettable and pleasant meeting. Whether you crave the intimacy of a girlfriend experience or the wild excitement of a pornstar encounter, I have something special in store for you. I'll be happy to be with you and satisfy you with enjoyment until you're exhausted. My meetings never lack that passion and naughtiness, you will love to know me. Rest assured, you will always leave our encounters fully satisfied, having experienced everything you sought for.', paragraphs: [] },
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
