// Public content model. Replace demo assets and copy with owner-approved content here.
const cdn='https://images.squarespace-cdn.com/content/v1/68806c9f433a21762c9e1a86/';
export const site = {
  name: 'witness_lema_', brand: 'witness_lema_', language: 'en', timezone: 'UTC',
  demo: true, email: '', announcement: '', announcementExpiresAt: '',
  description: 'The world of witness_lema_ — a personal portfolio in pictures, stories and expression. Design preview with reference photography.',
  hero: { eyebrow: 'The world of witness_lema_', title: 'A presence.\nAn impression.\nEntirely individual.', intro: 'A glimpse into a world of character, curiosity and considered detail.' },
  about: { title: 'A little mystery.\nA personal introduction.', text: 'This is the beginning of witness_lema_’s own story. A place for her personality, creative influences and the details that make an introduction memorable.' },
  profileFacts: [],
  work: [
    { number: '01', title: 'Places & perspectives', text: 'A space for favourite places, travel memories and the perspectives that stay with you.', tag: 'Sample editorial theme' },
    { number: '02', title: 'Ideas & inspiration', text: 'The books, conversations and creative influences behind a personal point of view.', tag: 'Sample editorial theme' },
    { number: '03', title: 'The finer details', text: 'Small rituals, good food, the arts and the things that make an ordinary day feel special.', tag: 'Sample editorial theme' }
  ],
  images: [
    { src: cdn+'b1c39acf-72b5-4b36-b1c1-19a0f16ec17a/_DSC9687-copy.jpg?format=1000w', alt: 'Reference model in a black dress beside a harbour-facing window', title: 'By the window', category: 'Reference portrait' },
    { src: cdn+'cda55cdb-f75d-4069-b52b-2ef8da42da7f/_DSC9512-copy.jpg?format=1000w', alt: 'Reference model in a black dress reclining on a circular sofa', title: 'A different perspective', category: 'Reference portrait' },
    { src: '/assets/study-3.svg', alt: 'Abstract rust-coloured arch and fine sweeping lines', title: 'Quiet rhythm', category: 'Art study' },
    { src: '/assets/study-4.svg', alt: 'Abstract muted olive ribbons and circular forms', title: 'After the light', category: 'Art study' }
  ],
  faqs: [
    { question: 'Who is witness_lema_?', answer: 'This is the personal portfolio preview for witness_lema_. Her verified biography and personal details will be added before launch. The current photography shows a reference model, not witness_lema_.', keywords: ['about','profile','witness','lema','explore','who'], href: '/about/' },
    { question: 'How can I get in touch?', answer: 'The Contact page lets you prepare and copy a general enquiry. A verified contact destination has not been connected yet, so the website cannot send it.', keywords: ['contact','touch','enquiry','email','message'], href: '/contact/' },
    { question: 'Whose photographs are shown?', answer: 'The photographs are reference images for the design, not photographs of witness_lema_. They will be replaced with her approved collection. The abstract works are design studies.', keywords: ['photo','gallery','image','picture'], href: '/gallery/' },
    { question: 'What can I discover?', answer: 'Explore the introduction, gallery and editorial interests page. These sample themes demonstrate the layout; the owner’s own interests are still to be supplied.', keywords: ['interests','hobbies','books','travel','culture','food','discover'], href: '/work/' }
  ]
};
