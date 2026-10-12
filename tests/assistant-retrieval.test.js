import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestion, conceptsFor, rankKnowledge, publishedKnowledgeOrFallback, isAvailabilityFollowup } from '../lib/assistant-retrieval.js';

test('normalization preserves both Hindi and English words',()=>{
  assert.equal(normalizeQuestion('How MUCH would it cost??'),'how much would it cost');
  assert.equal(normalizeQuestion('कितना चार्ज है?'),'कितना चार्ज है');
  assert.ok(conceptsFor('कितना चार्ज है?').has('intent:rates'));
  assert.ok(conceptsFor('How much would it cost?').has('intent:rates'));
});

test('published Supabase answers are authoritative and old JSON cannot overwrite them',()=>{
  const current=[{question:'What are her rates?',answer:'Latest owner-approved answer',published:true}];
  const stale=[{question:'What are her rates?',answer:'Old JSON answer'}];
  assert.deepEqual(publishedKnowledgeOrFallback(current,stale),current);
  assert.deepEqual(publishedKnowledgeOrFallback([],stale),[]);
  assert.deepEqual(publishedKnowledgeOrFallback(null,stale),stale);
});

test('synonyms and Hindi/Hinglish find a related FAQ despite exact SQL misses',()=>{
  const facts=[
    {question:'What are her rates?',keywords:['rates','price','charges','cost'],answer:'Rates are confirmed on the Services page.'},
    {question:'How can I get in touch with her?',keywords:['contact','whatsapp','message'],answer:'Use Contact.'},
    {question:'Where is Lema based?',keywords:['city','location','based'],answer:'Location on About.'}
  ];
  for(const input of ['what does she charge','how much would a meeting cost','कितना चार्ज है','kitna price hai']){
    assert.ok(rankKnowledge(input,facts)[0]?.item.question==='What are her rates?',input);
  }
  assert.equal(rankKnowledge('how can I contact Lema',facts)[0]?.item.question,'How can I get in touch with her?');
});

test('follow-up questions use recent topic and availability remains unconfirmed',()=>{
 const h=[{role:'user',content:'What are the booking options?'},{role:'assistant',content:'Contact page'}];
 const facts=[{question:'Is she available today / right now?',answer:'Ask to confirm availability',keywords:['available','today','slot']},
              {question:'Where is Lema based?',answer:'About location',keywords:['where','city']}];
 assert.equal(isAvailabilityFollowup('and tomorrow?',h),true);
 assert.ok(rankKnowledge('and tomorrow?',facts,{history:h}).some(x=>x.item.question.includes('available')));
});
