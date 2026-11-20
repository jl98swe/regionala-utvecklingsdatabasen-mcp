import {mkdirSync,writeFileSync} from 'node:fs';
import {codeTemplate} from '../src/code.js';
mkdirSync('dist/r',{recursive:true});
for(const id of ['ltu_examen','invandring_etablering','kombinera_register']){
 const r=codeTemplate(id,[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS','AstKommun'],period:2020}],{bekrafta_metod:true});
 if(!r.r_code)throw new Error('No generated code');writeFileSync(`dist/r/${id}_v1.3.R`,r.r_code);
}

const h=codeTemplate('harmonisera_argangar',[{databasvy:'avggymn',variabler:['totalpoang'],period:2004},{databasvy:'avggymn',variabler:['totalpoang'],period:2005}]);
if(!h.r_code)throw new Error('No harmonization code');
writeFileSync('dist/r/harmonisera_argangar_v1.3.R',h.r_code);
