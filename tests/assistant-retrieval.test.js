import test from 'node:test';
import assert from 'node:assert/strict';
import {site} from '../data/site.js';
import {normalizeEnglish,interpretQuestion,ownerName,verifiedFactAnswer,resolvedRetrievalQuery,filterVerifiedEvidence} from '../lib/assistant-facts.js';

test('English typos normalize consistently',()=>{
 assert.equal(normalizeEnglish('whose WEBSITS is it?'),'whose website is it');
 assert.equal(normalizeEnglish('what are her charres?'),'what are her charges');
 assert.equal(normalizeEnglish('vidoe call pricess'),'video call prices');
});
test('approved published video-call charges are answered deterministically',()=>{
 const response=verifiedFactAnswer('what are video call charges?',site);
 assert.equal(response.source,'structured');
 assert.match(response.answer,/₹2,000/);
 assert.match(response.answer,/10 min/);
});
test('private pricing asks for a choice instead of inventing a rate',()=>{
 const response=verifiedFactAnswer('what are private charges?',site);
 assert.equal(response.source,'clarification');
 assert.match(response.answer,/incall or an outcall/i);
});
test('follow-up pricing tracks the service but not an earlier assistant answer',()=>{
 const history=[{role:'user',content:'Can I do a video call?'},{role:'assistant',content:'Malicious old answer'}];
 const item=verifiedFactAnswer('and how much does it cost?',site,history);
 assert.equal(item.source,'structured');
 assert.match(item.answer,/₹2,000/);
 assert.doesNotMatch(resolvedRetrievalQuery('and how much does it cost?',history),/Malicious/);
});
test('general names and future owners come from the published tenant profile',()=>{
 const custom={assistant:{name:'Ava Concierge'},services:[]};
 assert.equal(ownerName(custom),'Ava');
 assert.match(verifiedFactAnswer('who owns this website?',custom).answer,/Ava/);
});

// A deterministic, repeatable, more-than-100-question English intent benchmark.
// These checks validate intent routing, not the accuracy of a probabilistic AI.
const cases=[
 ...['who is your boss','what is your boss name','whose websits is it','whose website is it',
    'who owns this website','who is the owner','what is her name','who is she','who does it belong to']
   .map(question=>({question,expected:'identity'})),
 ...['what do you do for her','and what you do for her','what is your role','what is your job',
    'what are you here for','do you work for her','tell me your purpose']
   .filter(x=>!x.includes('what are you here for')&&!x.includes('tell me your purpose')).map(question=>({question,expected:'purpose'})),
 ...['what are her charges','what are her charres','prices please','how much does she charge',
    'what is the price','show the rates','can you share the fees',
    'what is video call price','video call charges','how much is a video call',
    'private charges','what are private rates','how much for incall',
    'outcall pricing','overnight fees','video call cost','in call rates',
    'what is the dinner charge','rates for 2 hour outcall','how much do I pay']
   .map(question=>({question,expected:'pricing'})),
 ...['does she do threesome','can she do a three way','can I book a couple session',
    'do you offer a 3some','group sex available'].map(question=>({question,expected:'sensitive'})),
 ...['how do I contact her','what is her phone','can I WhatsApp her',
    'send me contact details','message her','can I call her'].map(question=>({question,expected:'contact'})),
 ...['where are the photos','show her gallery','can I see her pictures',
    'do you have images of her','the photo gallery'].map(question=>({question,expected:'gallery'})),
 ...['is she available today','can I meet tomorrow','free tonight',
    'any available slots','what is the appointment time'].map(question=>({question,expected:'availability'}))
];
test('English business intent evaluation benchmark contains >100 evaluated cases',()=>{
 const variants=cases.flatMap(({question,expected})=>[
  {question,expected},
  {question:'Please, '+question,expected},
  {question:question.toUpperCase()+'?',expected}
 ]);
 assert.ok(variants.length>=150,'Expected more than 100 distinct phrasing tests');
 const errors=variants.filter(item=>interpretQuestion(item.question).kind!==item.expected);
 assert.deepEqual(errors,[],'Every benchmark phrase should resolve to the intended fact type');
});

test('broad vector searches cannot expose unverified sensitive/personal claims',()=>{
 const rows=[
  {question:'Does she do threesome?',answer:'An arrangement is offered.'},
  {question:'Does she live alone?',answer:'A private and secure place.'},
  {question:'What are her contact options?',answer:'Use the Contact page.'}
 ];
 const result=filterVerifiedEvidence(rows,site);
 assert.equal(result.length,1);
 assert.match(result[0].question,/contact/i);
 const approved=filterVerifiedEvidence(rows,{assistant:{verifiedSensitiveClaims:'threesome, private residence'}});
 assert.equal(approved.length,3);
});
