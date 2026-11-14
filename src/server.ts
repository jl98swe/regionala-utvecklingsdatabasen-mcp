import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {search,structure,check,stamp} from './catalog.js';
import {serverInstructions} from './guidance.js';
import {codeTemplate} from './code.js';
const period=z.number().int().refine(p=>(p>=1000&&p<=9999)||(p>=100001&&p<=999912&&p%100>=1&&p%100<=12),'Ange YYYY eller YYYYMM med giltig månad.');
const text=z.string().min(1).max(200);
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const outputSchema=z.object({}).catchall(z.unknown());
const reply=(fn:()=>Record<string,unknown>)=>{try{const result=fn();return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result};}catch(e){const result={...stamp,error:{code:'INVALID_SELECTION',message:e instanceof Error?e.message:'Ogiltigt anrop'}};return {isError:true,content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result};}};
export function createServer(){
 const s=new McpServer({name:'regionala-utvecklingsdatabasen',version:'0.2.0'},{instructions:serverInstructions});
 s.registerTool('sok_variabler',{description:'Sök variabler och vyer. Tål åäö, skiftläge, mellanslag/understreck och dokumenterade ämnessynonymer. Ger exakta originalnamn, årsfält och källrad. Sidindelad.',inputSchema:{sokterm:z.string().max(200).default(''),databasvy:text.optional(),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(100).default(30)},outputSchema,annotations},a=>reply(()=>search(a.sokterm,a.databasvy,a.offset,a.limit)));
 s.registerTool('kontrollera_tillganglighet',{description:'Kontrollera flera variabler och år/månader. Varje variabels eget År styr. År mot månadsregister kräver 12 månader; delår markeras partial. Tomt År ger unknown, aldrig tillgänglig alla år.',inputSchema:{urval:z.array(z.object({databasvy:text,variabler:z.array(text).min(1).max(50),perioder:z.array(period).max(120).default([])})).min(1).max(20).refine(xs=>xs.reduce((n,s)=>n+s.variabler.length,0)<=100 && xs.reduce((n,s)=>n+s.variabler.length*Math.max(1,s.perioder.length),0)<=2000,"Max 100 variabler och 2000 variabel/period-kontroller per anrop.")},outputSchema,annotations},a=>reply(()=>({...stamp,results:a.urval.flatMap(s=>s.variabler.map(v=>check(s.databasvy,v,s.perioder)))})));
 s.registerTool('hamta_registerstruktur',{description:'Lista alla logiska vyer eller en vys variabler, år och möjliga löpnummer. Nycklarnas unikhet/kardinalitet är inte känd. Metadata saknar definitioner och kodlistor. Använd next_offset tills alla poster hämtats.',inputSchema:{databasvy:text.optional(),offset:z.number().int().min(0).default(0),limit:z.number().int().min(1).max(100).default(50)},outputSchema,annotations},a=>reply(()=>structure(a.databasvy,a.offset,a.limit)));
 s.registerTool('hamta_kodmall',{description:'Hämta först projektstod: projektregler, källprioritering och dokumenterade mikrodataR-signaturer. Lista eller hämta därefter generella R-mallar med mikrodataR. kombinera_register förkontrollerar varje variabel/period och blockerar känd otillgänglighet. Metodmallar: ltu_examen och invandring_etablering. Static validation is not a MONA execution test.',inputSchema:{mall:z.enum(['lista','projektstod','kombinera_register','ltu_examen','invandring_etablering']).default('lista'),urval:z.array(z.object({databasvy:text,variabler:z.array(text).min(1).max(50),period:period.nullable()})).max(10).default([])},outputSchema,annotations},a=>reply(()=>codeTemplate(a.mall,a.urval)));
 return s;
}
