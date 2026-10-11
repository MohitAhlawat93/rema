#!/usr/bin/env node
/**
 * Read-only handover preflight. This audits SOURCE CODE, not live provider ownership.
 * Never dump environment variable values or client records into audit reports.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const checks=[
  {
    id:'brand-in-code',
    title:'Replace Lema-specific brand literals with published client settings',
    paths:['scripts/build.mjs','scripts/render-seo.mjs','seo/site.config.mjs','data/site.js','public/admin.html'],
    pattern:/Witness Lema|witness_lema_|Lema Concierge|Lema Afterhours/i,
    next:'Refactor identity, page template, metadata and structured data to consume one validated brand profile.'
  },
  {
    id:'temporary-domain',
    title:'Remove temporary-domain fallbacks from client-facing output',
    paths:['middleware.js','seo/site.config.mjs','public/admin.js'],
    pattern:/rema-ruby\.vercel\.app/,
    next:'Make the canonical origin and SEO preview use the client-verified production domain.'
  },
  {
    id:'shared-supabase-host',
    title:'Remove development Supabase hostname from response security policy',
    paths:['vercel.json'],
    pattern:/rhwefssbnhmsypnjdfcl\.supabase\.co/,
    next:'Generate a project-specific CSP after the client database and storage migration.'
  },
  {
    id:'client-specific-storage',
    title:'Make storage bucket and admin function identifiers configurable',
    paths:['supabase/functions/witness-lema-admin/index.ts','lib/admin-backend.js','seo/live.mjs'],
    pattern:/witness-lema-gallery|witness-lema-admin/,
    next:'Provision client-isolated storage and functions, then configure server-side endpoint/bucket identifiers.'
  },
  {
    id:'contact-defaults',
    title:'Remove client-specific contact defaults from reusable templates',
    paths:['data/site.js'],
    pattern:/wa\.me\/\d+|instagram\.com\//,
    next:'Read all contact destinations from an approved owner profile; verify each destination before launch.'
  }
];
const manual=[
  {id:'client-agreement',title:'Agree ownership, licence, support and source-code delivery in writing',next:'Client and developer sign the chosen sale/managed-service terms.'},
  {id:'owner-approved-content',title:'Verify biography, services, rates, image rights, reviews and policies',next:'Owner signs off the actual published content, not just a build preview.'},
  {id:'source-repository',title:'Choose client source-code delivery or managed-code licence',next:'Decide whether to supply a sanitized client-only repository, escrow, or no source access under the signed agreement.'},
  {id:'domain-email',title:'Verify client-owned domain, email and recovery controls',next:'The owner must control purchase/billing and the account recovery methods.'},
  {id:'hosting-billing',title:'Verify hosting and billing in intended legal owner account',next:'Prove owner/team access, deployment controls and payment responsibility.'},
  {id:'database-isolation',title:'Create and verify a client-isolated Supabase project',next:'Migrate only client rows/files/functions, verify restore, and rotate service credentials.'},
  {id:'provider-keys',title:'Verify client-owned or contracted managed AI and third-party API billing',next:'Rotate credentials and keep secret keys server-side, never in code or browser settings.'},
  {id:'google-search',title:'Verify the new Google property and sitemap submission',next:'Client authorizes Search Console; verify DNS, canonical, sitemap and indexing permissions.'},
  {id:'backup-rollback',title:'Test backup restore and DNS/deployment rollback',next:'Complete a dry run before touching production.'},
  {id:'security-release',title:'Validate admin access, RLS, privacy and production smoke tests',next:'Rotate secrets, revoke old sessions and run browser checks after cutover.'}
];
export async function auditHandover(){
  const results=[];
  for(const check of checks){
    const matches=[];
    for(const relative of check.paths){
      try{
        const source=await readFile(path.join(root,relative),'utf8');
        if(check.pattern.test(source))matches.push(relative);
      }catch(error){
        if(error.code==='ENOENT'){matches.push(relative+' (missing file)');continue;}
        throw error;
      }
    }
    results.push({id:check.id,title:check.title,status:matches.length?'code_change_required':'no_known_literal_found',files:matches,next:check.next});
  }
  for(const item of manual)results.push({...item,status:'verification_required',files:[]});
  return {schemaVersion:1,scope:'source-code preflight only; external accounts and live ownership NOT verified',
    summary:{codeChanges:results.filter(x=>x.status==='code_change_required').length,
      ownerOrProviderChecks:manual.length},checks:results};
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  const report=await auditHandover();
  if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
  else{
    console.log('CLIENT HANDOVER PRE-FLIGHT — no external accounts were checked');
    for(const c of report.checks)console.log('['+c.status+'] '+c.title+(c.files.length?' — '+c.files.join(', '):''));
    console.log('\n'+report.summary.codeChanges+' code refactors identified; '+report.summary.ownerOrProviderChecks+' owner/provider checks still require evidence.');
  }
  if(process.argv.includes('--strict')&&report.summary.codeChanges)process.exitCode=1;
}
