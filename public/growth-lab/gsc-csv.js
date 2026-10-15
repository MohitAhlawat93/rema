/**
 * Browser-only GSC CSV analysis. No network access, no storage, no assertion of
 * Google verification. Header-driven, bounded parser; never executes formulas.
 */
function fieldsCSV(text,maxRows=5000){
 const rows=[],row=[];let token='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){token+='"';i++;}
   else if(ch==='"')quoted=false;
   else token+=ch;
  }else if(ch==='"'&&token==='')quoted=true;
  else if(ch===','){row.push(token.trim());token='';}
  else if(ch==='\n'){row.push(token.trim());if(row.some(x=>x))rows.push([...row]);row.length=0;token='';if(rows.length>maxRows+1)throw Error('CSV exceeds 5,000 rows');}
  else if(ch!=='\r')token+=ch;
 }
 if(quoted)throw Error('CSV contains an unfinished quoted field');
 row.push(token.trim());if(row.some(x=>x))rows.push([...row]);
 if(rows.length>maxRows+1)throw Error('CSV exceeds 5,000 rows');
 return rows;
}
const number=v=>{const x=Number(String(v??'').replace(/[,%]/g,'').trim());return Number.isFinite(x)&&x>=0?x:NaN;};
export function analyzeGscCSV(input){
 const text=String(input||'').replace(/^\uFEFF/,'');
 if(text.length<15||text.length>700000)throw Error('Choose a valid Google Search Console CSV smaller than 700 KB');
 const rows=fieldsCSV(text);
 const header=rows.shift()?.map(x=>x.toLowerCase().replace(/\s+/g,' ').trim())||[];
 const field=names=>header.findIndex(x=>names.includes(x));
 const labelColumn=field(['query','page','pages','search query','top queries','top pages']);
 const clicksColumn=field(['clicks']),impColumn=field(['impressions']),posColumn=field(['position','average position']);
 if(labelColumn<0||clicksColumn<0||impColumn<0)throw Error('CSV needs a Query or Page column, Clicks and Impressions');
 const entries=[];
 for(const row of rows){
  const label=String(row[labelColumn]||'').slice(0,240);
  const clicks=number(row[clicksColumn]),impressions=number(row[impColumn]);
  const position=posColumn>=0?number(row[posColumn]):null;
  if(!label||!Number.isFinite(clicks)||!Number.isFinite(impressions)||clicks>impressions)continue;
  entries.push({label,clicks,impressions,position:Number.isFinite(position)?position:null,ctr:impressions?clicks/impressions:0});
 }
 if(!entries.length)throw Error('No valid data rows were found in that CSV');
 const totals=entries.reduce((a,x)=>({clicks:a.clicks+x.clicks,impressions:a.impressions+x.impressions}),{clicks:0,impressions:0});
 const opportunities=entries.filter(x=>x.impressions>=50&&x.ctr<0.03&&(x.position===null||x.position<=20))
  .sort((a,b)=>b.impressions-a.impressions).slice(0,5);
 return {rows:entries.length,totals,ctr:totals.impressions?totals.clicks/totals.impressions:0,opportunities,dimension:header[labelColumn]};
}
