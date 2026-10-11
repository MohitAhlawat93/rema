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

  assistant: {
    name: 'Lema Concierge',
    greeting: 'Welcome. I can help with services, availability and the best way to get in touch.',
    suggestionOne: 'How can I get in touch?',
    suggestionOneLabel: 'Get in touch',
    suggestionTwo: 'Which services are available?',
    suggestionTwoLabel: 'Services'
  },

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

  // About-page slideshow. Use any three paths from public/images/gallery/.
  aboutImages: [
    '/images/gallery/portrait-20.jpg',
    '/images/gallery/portrait-17.jpg',
    '/images/gallery/portrait-15.jpg'
  ],

  profileFacts: [],

  services: [
    {
      number: '01',
      title: 'Incall – 1 Hour',
      text: 'Private meeting at my place. Perfect for a relaxed and intimate experience with full attention and care.',
      tag: 'From ₹15,000',
      image: '/images/gallery/portrait-06.jpg'
    },
    {
      number: '02',
      title: 'Incall – 2 Hours',
      text: 'Extended private time for deeper connection, conversation and a more unhurried experience.',
      tag: 'From ₹28,000',
      image: '/images/gallery/portrait-14.jpg'
    },
    {
      number: '03',
      title: 'Outcall – 1 Hour',
      text: 'I come to your location (hotel or residence) within Gurgaon. Discreet and punctual.',
      tag: 'From ₹30,000',
      image: '/images/gallery/portrait-16.jpg'
    },
    {
      number: '04',
      title: 'Outcall – 2 Hours',
      text: 'Longer outcall session at your preferred place. Ideal when you want more time without rushing.',
      tag: 'From ₹55,000',
      image: '/images/gallery/portrait-20.jpg'
    },
    {
      number: '05',
      title: 'Overnight / Full Night',
      text: 'Spend the night together. Soft companionship, intimacy and the comfort of not watching the clock.',
      tag: 'From ₹80,000',
      image: '/images/gallery/portrait-03.jpg'
    },
    {
      number: '06',
      title: 'Dinner Date',
      text: 'Elegant company for dinner and conversation. A relaxed social evening before or instead of a private meeting.',
      tag: 'By arrangement',
      image: '/images/gallery/portrait-06.jpg'
    },
    {
      number: '07',
      title: 'Video Call Session',
      text: 'Private live video session. Perfect for a personal introduction or a short, focused experience from anywhere.',
      tag: '₹2,000 / 10 min',
      image: '/images/gallery/portrait-14.jpg'
    },
    {
      number: '08',
      title: 'Custom Experience',
      text: 'Tell me what you’re looking for — girlfriend style, passionate, longer time or something specific. We’ll shape it together.',
      tag: 'Tailored',
      image: '/images/gallery/portrait-16.jpg'
    }
  ],

  servicesIntro: 'Every meeting is private, clean and centred on your comfort and satisfaction. Choose a starting point below or message me to create something more personal.',

  social: {
    whatsapp: 'https://wa.me/918119034436',
    telegram: '',
    instagram: 'https://www.instagram.com/reel/DdlFE68JfyZ/?cplk=ejN5ampjczV2OWJr'
  },

  images,
  faqs: knowledge
};
