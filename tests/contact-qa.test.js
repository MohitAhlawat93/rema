import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {officialWhatsAppUrl,whatsappEnquiryUrl,formatEnquiry} from '../lib/contact.js';

test('official WhatsApp uses owner-managed HTTPS contact links only',()=>{
 assert.equal(officialWhatsAppUrl([{label:'WhatsApp',url:'https://wa.me/919876543210'}]),'https://wa.me/919876543210');
 assert.equal(officialWhatsAppUrl([{label:'WhatsApp',url:'https://api.whatsapp.com/send?phone=919876543210'}]),'https://wa.me/919876543210');
 assert.equal(officialWhatsAppUrl([{label:'Contact',url:'https://evil.example/wa.me/919876543210'}],{whatsapp:'https://wa.me/911234567890'}),'');
 assert.equal(officialWhatsAppUrl(undefined,{whatsapp:'https://wa.me/911234567890'}),'https://wa.me/911234567890');
 assert.equal(officialWhatsAppUrl([],{whatsapp:'https://wa.me/911234567890'}),'');
 assert.equal(officialWhatsAppUrl([{label:'WhatsApp',url:'http://wa.me/919876543210'}]),'');
 assert.equal(officialWhatsAppUrl([{label:'WhatsApp',url:'https://wa.me/1?text=bad'}]),'');
 assert.equal(officialWhatsAppUrl([{label:'WhatsApp',url:'https://wa.me/919876543210@evil.example'}]),'');
});
test('enquiry link is encoded and never sends automatically',()=>{
 const text=formatEnquiry({name:'A & B',email:'hello@example.com',type:'General question',date:'2026-10-16',message:'Are you available?\nThank you.'});
 const link=whatsappEnquiryUrl('https://wa.me/919876543210',text);
 const u=new URL(link);
 assert.equal(u.hostname,'wa.me');
 assert.equal(u.pathname,'/919876543210');
 assert.equal(u.searchParams.get('text'),text);
 assert.match(text,/From: A & B/);
 assert.match(text,/Email \(optional\): hello@example.com/);
 assert.equal(whatsappEnquiryUrl('https://evil.example/send','hello'),'');
 assert.equal(whatsappEnquiryUrl('https://wa.me/919876543210',''),'');
});
test('contact has both direct WhatsApp and visible copying fallback, and popup defers',async()=>{
 const [build,app,styles]=await Promise.all([
 readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8'),
 readFile(new URL('../public/app.js',import.meta.url),'utf8'),
 readFile(new URL('../public/styles.css',import.meta.url),'utf8')
 ]);
 for(const marker of ['data-whatsapp-send','data-copy-enquiry','data-whatsapp-direct','data-whatsapp-manual'])assert.ok(build.includes(marker),marker);
 assert.ok(build.includes('Email address (optional)'));
 assert.ok(app.includes("window.open(href,'_blank','noopener,noreferrer')"));
 assert.ok(app.includes('document.addEventListener(\'visibilitychange\',attemptAutoChat)'));
 assert.ok(app.includes('if(!open)attemptAutoChat()'));
 assert.ok(styles.includes('#assistant-panel:not(.expanded)'));
 assert.ok(styles.includes('width:min(286px,calc(100vw - 16px))'));
});
