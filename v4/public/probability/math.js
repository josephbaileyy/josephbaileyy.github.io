export const sum = a => a.reduce((s,x)=>s+x,0);
export const mass = (mask,weights) => sum(weights.filter((_,i)=>mask&(1<<i)));
export function poisson(lambda,max=30){let p=Math.exp(-lambda);const values=[p];for(let k=1;k<=max;k++){p*=lambda/k;values.push(p)}let term=p*lambda/(max+1),tail=term;for(let k=max+2;k<500;k++){term*=lambda/k;tail+=term;if(term<tail*1e-16)break;}return {values,tail};}
export const distance=(a,b,w)=>mass(a^b,w);
export const almostMass=t=>({union:1,sum:1+2*t,overlap:t,weights:[(1-t)/3,(1-t)/3,(1-t)/3,t]});
