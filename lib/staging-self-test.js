// Owner-initiated integration test. Never enabled on a client or Vercel production site.
// All temporary writes are confined to the isolated staging project and cleaned up.
import {callAdminBackend} from './admin-backend.js';
import {reviewInbox} from './review-inbox.js';
import {uploadR2Photo,getR2Photo} from './r2-media.js';

const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZJAAAAABJRU5ErkJggg==';

export function allowedStagingSelfTest(request){
  return process.env.SITE_STAGING_TEST_ENABLED==='true' &&
    request?.headers?.host==='lema-website-staging.pages.dev' &&
    String(process.env.SUPABASE_URL||'').includes('yebbfjemvvtenpzrrhno.supabase.co');
}
export async function runStagingSelfTest(request){
  const checks=[],record=async(name,run)=>{
    try{const detail=await run();checks.push({name,passed:true,detail:String(detail||'Passed').slice(0,180)});return true;}
    catch(e){checks.push({name,passed:false,detail:String(e?.message||'Failed').slice(0,180)});return false;}
  };
  await record('Private database and published content',async()=>{
    const s=await callAdminBackend('read');
    if(!s?.draft||!s?.published||!Number.isInteger(s.version))throw Error('Admin state incomplete');
    const p=s.published;
    if(!Array.isArray(p.images)||p.images.length<2)throw Error('Missing published photos');
    return p.images.length+' photos; version '+s.version;
  });
  await record('Approved chatbot knowledge',async()=>{
    const data=await callAdminBackend('knowledge-read');
    if(!Array.isArray(data.items)||data.items.length<1)throw Error('Approved knowledge missing');
    return data.items.length+' answers';
  });
  await record('R2 photo upload, delivery and cleanup',async()=>{
    const bucket=request.cloudflareMediaBucket;
    if(!bucket?.put||!bucket?.get||!bucket?.delete)throw Error('R2 media binding unavailable');
    let created=null;
    try{
      created=await uploadR2Photo(bucket,'data:image/png;base64,'+PNG);
      const picture=await getR2Photo(bucket,new Request('https://lema-website-staging.pages.dev'+created.url));
      if(picture.status!==200||picture.headers.get('content-type')!=='image/png')
        throw Error('Uploaded image is not readable');
      await picture.arrayBuffer();
      return 'Temporary photo uploaded and loaded';
    }finally{
      if(created?.path)await bucket.delete(created.path.slice(3));
    }
  });
  await record('Review submission and cleanup',async()=>{
    let id=null;
    try{
      const created=await reviewInbox('submit',{
        author:'Staging QA',text:'Automated staging review to verify owner controls and safe cleanup.',language:'en',
        consent:true,source:'owner'
      });
      id=created.id;
      if(!created.ok||!Number.isSafeInteger(id))throw Error('Review was not created');
      const list=await reviewInbox('list');
      if(!Array.isArray(list.items)||!list.items.some(x=>x.id===id))throw Error('Review not listed');
      return 'Test review created and verified';
    }finally{
      if(id!=null){
        const removed=await reviewInbox('delete',{id});
        if(removed?.ok!==true)throw Error('Test review cleanup failed');
      }
    }
  });
  await record('Draft save, publish and restore',async()=>{
    const original=await callAdminBackend('read');
    if(!original?.published?.hero||!original?.draft)throw Error('Missing publishable website content');
    const oldPublished=structuredClone(original.published),oldDraft=structuredClone(original.draft);
    let modified=false,restoreError=null;
    try{
      const test=structuredClone(oldPublished);
      test.hero.intro=String(test.hero.intro||'').slice(0,330)+' [Staging verification]';
      const saved=await callAdminBackend('save',{draft:test,expectedVersion:original.version});
      modified=true;
      const published=await callAdminBackend('publish',{body:{expectedVersion:saved.version}});
      const state=await callAdminBackend('read');
      if(!state.published?.hero?.intro?.includes('[Staging verification]'))
        throw Error('Temporary published change was not saved');
      return 'Draft changed, published and verified';
    }finally{
      if(modified){
        try{
          const now=await callAdminBackend('read');
          const save=await callAdminBackend('save',{draft:oldPublished,expectedVersion:now.version});
          await callAdminBackend('publish',{body:{expectedVersion:save.version}});
          const next=await callAdminBackend('read');
          await callAdminBackend('save',{draft:oldDraft,expectedVersion:next.version});
          const final=await callAdminBackend('read');
          if(JSON.stringify(final.published)!==JSON.stringify(oldPublished)||
             JSON.stringify(final.draft)!==JSON.stringify(oldDraft))
            throw Error('Previous website version could not be restored');
        }catch(e){restoreError=e;}
      }
      if(restoreError)throw restoreError;
    }
  });
  const passed=checks.filter(x=>x.passed).length;
  return {ok:passed===checks.length,passed,total:checks.length,checks,
    note:'Only the staging database was tested. This does not transfer ownership or guarantee AI availability.'};
}
