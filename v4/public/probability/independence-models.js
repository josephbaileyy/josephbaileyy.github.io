// Exact finite models / analytic formulas. Sampling is reserved for drawing curves.
export function jointTable(p,q,d=0){
 const low=Math.max(0,p+q-1),high=Math.min(p,q),product=p*q;
 const t=product+d*(d<0?product-low:high-product);
 return {cells:[[1-p-q+t,q-t],[p-t,t]],joint:t,product,low,high};
}
export function binaryLaw(parity=false){return Array.from({length:8},(_,i)=>{const bits=[i>>2,(i>>1)&1,i&1];return {bits,p:parity?(bits.reduce((a,b)=>a+b,0)%2===0?.25:0):.125}})}
export function blockTable(overlap=false){const a=Array.from({length:3},()=>[0,0,0]);for(let k=0;k<16;k++){const b=[k&1,(k>>1)&1,(k>>2)&1,(k>>3)&1];a[b[0]+b[1]][b[overlap?1:2]+b[3]]+=1/16}return a}
export function mod3Rows(){return Array.from({length:9},(_,i)=>{const x=Math.floor(i/3),y=i%3;return [x,(x+y)%3,(x+2*y)%3]})}
export function uniformSum(z,a=1,b=1){return Math.max(0,Math.min(b,z)-Math.max(0,z-a))/(a*b)}
export function triangleArea(z){return z<=0?0:z<=1?z*z/2:z<2?1-(2-z)**2/2:1}
export function tent(x){return Math.max(0,1-Math.abs(x))}
export function tentPrimitive(x){return x<=-1?0:x<=0?(x+1)**2/2:x<1?1-(1-x)**2/2:1}
export function smoothTent(x,n){const h=1/n;return (tentPrimitive(x+h)-tentPrimitive(x-h))/(2*h)}
export function gammaDensity(x,n,rate){if(x<0)return 0;if(x===0)return n===1?rate:0;let f=rate*Math.exp(-rate*x);for(let j=1;j<n;j++)f*=rate*x/j;return f}
export function gammaTail(x,n,rate){let term=1,total=1;for(let j=1;j<n;j++){term*=rate*x/j;total+=term}return Math.exp(-rate*x)*total}
export function poissonBounds(lambda,gamma){const a=(1+gamma)/2,I=Math.min(a*Math.log(a)-a+1,gamma-a+a*Math.log(a/gamma));return {I,independent:Math.exp(-lambda*(Math.sqrt(gamma)-1)**2),arbitrary:Math.min(1,2*Math.exp(-lambda*I))}}
export function primeProducts(s,count){const primes=[];for(let k=2;primes.length<count;k++)if(!primes.some(p=>k%p===0))primes.push(k);let product=1;const products=primes.map(p=>(product*=1-p**(-s)));const N=1000;let sum=0;for(let k=1;k<=N;k++)sum+=k**(-s);return {primes,products,lower:1/(sum+N**(1-s)/(s-1)),upper:1/(sum+(N+1)**(1-s)/(s-1))}}
