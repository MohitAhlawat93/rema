// One public content model for pages and the local FAQ assistant.
// Neutral profile facts are drawn from rebecca_project/data/rebecca-data.js; source snapshot 2026-10-07.
export const site = {
  name: 'Risqué Rebecca', brand: 'Élrebecca Signature', language: 'en', timezone: 'Asia/Singapore',
  demo: true, email: '', announcement: '', announcementExpiresAt: '',
  description: 'Rebecca — a boutique portfolio demonstration by Élrebecca Signature.',
  hero: { eyebrow: 'A personal portfolio', title: 'Curiosity. Character.\nA wider world.', intro: 'Singapore-based. English and Mandarin. A love of books, travel, culture and the unexpected.' },
  about: { title: 'The person behind\nthe presence.', text: 'Rebecca is Chinese-Portuguese Singaporean, with a BBA and an MA. Her public profile describes a life across three continents and travels to 52 countries, shaped by curiosity, warmth and candour.' },
  profileFacts: [
    { label: 'Base', value: 'Singapore · sometimes Hong Kong' },
    { label: 'Languages', value: 'English · Mandarin' },
    { label: 'Education', value: 'BBA · MA' },
    { label: 'Heritage', value: 'Chinese-Portuguese Singaporean' },
    { label: 'Travel', value: '52 countries · three continents' },
    { label: 'Background', value: 'Retired student athlete · classically trained pianist' }
  ],
  work: [
    { number: '01', title: 'Travel & culture', text: 'Favourite countries mentioned in Rebecca’s profile include Uzbekistan, Japan, Bolivia and the Czech Republic.', tag: 'Around the world' },
    { number: '02', title: 'Books & ideas', text: 'Books, history, anthropology and economics sit alongside a curiosity about people, places and new perspectives.', tag: 'Always curious' },
    { number: '03', title: 'Food & the arts', text: 'Cooking, fermentation, theatre, tasting menus and wine are among her interests. She is also a classically trained pianist.', tag: 'Life’s details' }
  ],
  images: [
    { src: 'https://images.squarespace-cdn.com/content/v1/68806c9f433a21762c9e1a86/b1c39acf-72b5-4b36-b1c1-19a0f16ec17a/_DSC9687-copy.jpg?format=1000w', alt: 'Rebecca in a black dress beside a harbour-facing window', title: 'Rebecca · by the window', category: 'Portrait' },
    { src: '/assets/study-2.svg', alt: 'Abstract ivory sculptural ribbons on a dark background', title: 'In motion', category: 'Movement' },
    { src: '/assets/study-3.svg', alt: 'Abstract rust-coloured arch and fine sweeping lines', title: 'Quiet rhythm', category: 'Form' },
    { src: '/assets/study-4.svg', alt: 'Abstract muted olive ribbons and circular forms', title: 'After the light', category: 'Movement' }
  ],
  faqs: [
    { question: 'What can I explore here?', answer: 'Rebecca is based in Singapore, speaks English and Mandarin, and has a BBA and an MA. Her interests include travel, books, culture, history, food and F1.', keywords: ['about','profile','rebecca','explore','who'], href: '/about/' },
    { question: 'How can I get in touch?', answer: 'The Contact page lets you prepare and copy an enquiry. A verified contact destination has not been connected yet, so the website cannot send it.', keywords: ['contact','touch','enquiry','email','message','book'], href: '/contact/' },
    { question: 'What is in the gallery?', answer: 'The opening portrait comes from Rebecca’s public image library. The other three images are abstract design studies, clearly labelled as artwork.', keywords: ['photo','gallery','image','picture'], href: '/gallery/' },
    { question: 'What are Rebecca’s interests?', answer: 'Rebecca’s profile lists books, travel, food, wine, culture, history and F1, with further interests in fitness, cooking, anthropology, economics, cars and theatre.', keywords: ['interests','hobbies','books','travel','culture','food','work'], href: '/work/' }
  ]
};
