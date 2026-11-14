import {mkdirSync,writeFileSync} from 'node:fs';
import {codeTemplate} from '../src/code.js';
mkdirSync('dist/r',{recursive:true});
for(const id of ['ltu_examen','invandring_etablering','kombinera_register']){
 const r=codeTemplate(id,[{databasvy:'rtb',variabler:['Kommun'],period:2020},{databasvy:'bas',variabler:['BAS','AstKommun'],period:2020}]);
 if(!r.r_code)throw new Error('No generated code');writeFileSync(`dist/r/${id}_v1.1.R`,r.r_code);
}
