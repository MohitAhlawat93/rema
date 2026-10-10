// One public content model for pages and the local FAQ assistant.
// Demo prose is illustrative, not a verified biography or service offering.
export const site = {
  name: 'Anora', brand: 'Élanora Signature', language: 'en', timezone: 'Asia/Kolkata',
  demo: true, email: '', announcement: '', announcementExpiresAt: '',
  description: 'Anora — a boutique portfolio demonstration by Élanora Signature.',
  hero: { eyebrow: 'A personal portfolio', title: 'A little artistry.\nA lasting impression.', intro: 'Step into a world of movement, expression and considered detail.' },
  about: { title: 'The person behind\nthe presence.', text: 'A space for the stories, influences and small details that make a person memorable. Anora’s own biography will shape this page before launch.' },
  work: [
    { number: '01', title: 'Performance', text: 'A dedicated space to introduce dance styles, stage work and performance formats.', tag: 'Sample category' },
    { number: '02', title: 'Creative projects', text: 'Room for editorial work, artistic collaborations and selected projects.', tag: 'Sample category' },
    { number: '03', title: 'Appearances', text: 'A clear introduction to professional appearances and event collaborations.', tag: 'Sample category' }
  ],
  images: [
    { src: '/assets/study-1.svg', alt: 'Abstract bronze arch and sculptural drapery', title: 'The opening', category: 'Form' },
    { src: '/assets/study-2.svg', alt: 'Abstract ivory sculptural ribbons on a dark background', title: 'In motion', category: 'Movement' },
    { src: '/assets/study-3.svg', alt: 'Abstract rust-coloured arch and fine sweeping lines', title: 'Quiet rhythm', category: 'Form' },
    { src: '/assets/study-4.svg', alt: 'Abstract muted olive ribbons and circular forms', title: 'After the light', category: 'Movement' }
  ],
  faqs: [
    { question: 'What can I explore here?', answer: 'Explore About, Gallery and Work for the portfolio layout. This is a design demonstration; personal details and photographs await confirmation.', keywords: ['about','profile','anora','explore','who'], href: '/about/' },
    { question: 'How can I get in touch?', answer: 'The Contact page lets you prepare and copy an enquiry. A verified contact destination has not been connected yet, so the website cannot send it.', keywords: ['contact','touch','enquiry','email','message','book'], href: '/contact/' },
    { question: 'Are these Anora’s photographs?', answer: 'No. The gallery currently contains abstract design studies used as placeholders. They will be replaced with approved photographs.', keywords: ['photo','gallery','image','picture'], href: '/gallery/' },
    { question: 'What work is available?', answer: 'Performance, creative projects and appearances are sample portfolio categories. Specific offerings and availability have not been confirmed.', keywords: ['work','perform','available','price','rate','service'], href: '/work/' }
  ]
};
