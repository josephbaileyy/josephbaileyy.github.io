import {cdfExperiment} from './intuition-models.js';
import {fatouSequence, fatouTailInf} from './proof-models.js';
import {machineModel} from './visuals-standard-machine.js';

export function cdfPrototype(alpha=1,p=.5) {
  const law=cdfExperiment(alpha,p);
  const outcomes=[
    {name:'a',value:-1,mass:law.masses[0]},
    {name:'b',value:1,mass:p/5},
    {name:'c',value:1,mass:4*p/5},
    {name:'d',value:3,mass:law.masses[2]}
  ].map(o=>({...o,included:o.value<=alpha}));
  return {...law,alpha,p,outcomes,event:outcomes.filter(o=>o.included).map(o=>o.name)};
}

export function fatouPrototype(n=2,s=.3,offset=1) {
  const k=n+offset;
  return {n,s,k,current:fatouSequence(k,s),envelope:fatouTailInf(n,s),next:fatouTailInf(n+1,s),limit:s+1,
    envelopeIntegral:1.5-.5*(1/n+1/(n+1)),termIntegral:2-1/k,limitIntegral:1.5,liminfIntegrals:2,
    value:x=>fatouSequence(k,x),lower:x=>fatouTailInf(n,x),nextLower:x=>fatouTailInf(n+1,x),
    witness:n+Number((n%2===1)===(s<=.5))};
}

export function machinePrototype(stage=0,level=2,cut=.5,height=2) {
  if(stage>=2)return machineModel(stage,level);
  const value=x=>x<0||x>1?0:stage===0?Number(x>cut):x===0?0:x<=.5?1:height;
  const total=stage===0?1-cut:.5+.5*height;
  const weighted=stage===0?1-cut*cut:.25+.75*height;
  return {value,total,weighted,positive:total,negative:0,weightedPositive:weighted,weightedNegative:0};
}
