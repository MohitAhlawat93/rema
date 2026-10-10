export function answerQuestion(question, faqs) {
  const words = String(question).toLowerCase().match(/[a-z]+/g) || [];
  const ranked = faqs.map(faq => ({ faq, score: faq.keywords.filter(key => words.some(word => word === key || (key.length >= 5 && word.startsWith(key)))).reduce((score,key)=>score+(['about','profile','witness','lema','explore','who'].includes(key)?0.25:1),0) })).sort((a,b) => b.score-a.score);
  if (!ranked[0]?.score) return { answer: 'I don’t have a confirmed answer to that. Please visit Contact to prepare a question for the owner. I can answer using the published website information.', href: '/contact/' };
  return ranked[0].faq;
}
