import {readFileSync} from 'node:fs';
const {origin}=JSON.parse(readFileSync(new URL('../site-config.json',import.meta.url),'utf8'));
const failures=[];
async function get(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Alwalid-SEO-Check/1.0'}});
 return {response,text:await response.text()};
}
const robots=await get(origin+'/robots.txt');
if(robots.response.status!==200||!robots.text.includes('Allow: /')||!robots.text.includes(origin+'/sitemap.xml'))failures.push('robots.txt: inspect crawling rules and sitemap');
const sitemap=await get(origin+'/sitemap.xml');
if(sitemap.response.status!==200)failures.push('sitemap.xml: not HTTP 200');
const urls=[...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!urls.length)failures.push('No page URLs in sitemap');
for(const url of urls){
 if(new URL(url).origin!==origin){failures.push('Unexpected sitemap origin');continue;}
 try{
  const {response,text}=await get(url);
  if(response.status!==200)failures.push(`${url}: HTTP ${response.status}`);
  if(/noindex|none/i.test(response.headers.get('x-robots-tag')||''))failures.push(`${url}: X-Robots-Tag blocks indexing`);
  const meta=text.match(/<meta name="robots" content="([^"]+)"/i)?.[1]||'';
  if(/noindex|none/i.test(meta))failures.push(`${url}: meta robots blocks indexing`);
  const canonical=text.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if(!canonical||new URL(canonical,response.url).href!==new URL(url).href)failures.push(`${url}: canonical mismatch`);
  if((text.match(/<h1\b/gi)||[]).length!==1)failures.push(`${url}: expected one server-rendered H1`);
  if(!/<title>[^<]+<\/title>/i.test(text)||!/<a\b[^>]*href=/i.test(text))failures.push(`${url}: missing HTML title or crawlable links`);
  if(new URL(url).pathname==='/'){
   const title=text.match(/<title>([^<]+)<\/title>/i)?.[1]||'';
   const heading=(text.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').replace(/<[^>]+>/g,'');
   if(!title.includes('حداد مكة')||!heading.includes('حداد مكة'))failures.push('Home: primary local query missing from title or H1');
  }
  if(/جدة|Jeddah|jeddah/.test(text))failures.push(`${url}: Jeddah reference remains after Makkah-only migration`);
  if(text.includes('"creator":{"@id":"https://www.alwalied.com/#business"'))failures.push(`${url}: invalid ImageObject creator reference remains`);
 }catch{failures.push(`${url}: request failed`);}
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Live SEO checks passed: ${urls.length} pages, HTTP status, index directives, canonical, HTML headings and links. This does not certify Google indexing or ranking.`);
