const r=String.raw;
export const styles=[
  {id:'explore',label:'Explore the operation',source:'Red Blob Games',url:'https://www.redblobgames.com/making-of/diagram-design/'},
  {id:'connect',label:'Follow the connections',source:'Distill',url:'https://distill.pub/2020/communicating-with-interactive-articles/'},
  {id:'predict',label:'Predict, then explain',source:'Mathigon / Nicky Case',url:'https://mathigon.org/about'}
];
export const lessons={
  fatou:{number:'1.3.33',kind:'Proof',name:'Fatou’s lemma',title:'Turn oscillation into an increasing sequence.',
    goal:r`Understand why the proof introduces $h_n=\inf_{k\ge n}f_k$, and how MON and monotonicity give the integral inequality.`,
    context:r`Begin with measurable $f_n\ge0$. The picture uses length measure on $(0,1]$ and $f_k(s)=s+1-1/k$, with an extra 1 on the left half for odd k and on the right half for even k. The final step restores the source’s integrable lower bound.`,
    stages:[
      {label:'Build the envelope',claim:'Replace an oscillating sequence by its tail infima.',
       equation:r`h_n(s)=\inf_{k\ge n}f_k(s)\le f_k(s)\quad(k\ge n)`,
       reason:r`Fix one outcome s and take the infimum over every index in the infinite tail. Countable infima of measurable functions are measurable; nonnegative inputs give $h_n\ge0$. The inequality holds for every later function, so integration can compare them.`,
       next:'This creates measurable lower bounds. Next we need those bounds to approach the desired limit.'},
      {label:'Shrink the tail',claim:'Removing candidates cannot lower an infimum.',
       equation:r`\{k\ge n+1\}\subseteq\{k\ge n\}\quad\Longrightarrow\quad h_n\le h_{n+1}\uparrow\liminf_k f_k`,
       reason:r`The smaller tail offers fewer values to minimize over. Its infimum can rise or stay fixed. The limit of these increasing tail infima is the definition of $\liminf f_k$, even when the original functions fail to converge.`,
       next:'The auxiliary sequence now has the monotonicity that the original sequence lacked.'},
      {label:'Integrate and pass to limits',claim:'MON handles the envelope; monotonicity supplies the inequality.',
       equation:r`\int\liminf f_k=\lim_n\int h_n\le\liminf_n\int f_n`,
       reason:r`MON applies to the nonnegative increasing measurable $h_n$, giving the equality on the left. Since $h_n\le f_n$, monotonicity gives $\int h_n\le\int f_n$ for each n. Taking liminf gives the inequality. The two sides in the example tend to 3/2 and 2, respectively.`,
       next:'This proves the nonnegative case. A signed sequence needs a common integrable lower bound.'},
      {label:'Restore the lower bound',claim:'Remove the common floor, prove the nonnegative case, then add it back.',
       equation:r`q_n=(f_n-g)_+\ge0,\qquad \liminf_n\int f_n\ge\int\liminf_n f_n`,
       reason:r`When $f_n\ge g$ a.e. and $g\in L^1$, remove the union of the countably many exceptional null sets. There $f_n=g+q_n$. Apply nonnegative Fatou to $q_n$ and use linearity to add the finite number $\int g$ on both sides. This avoids undefined infinite subtraction. Apply the result to $-f_n$ for reverse Fatou under an integrable upper bound.`,
       next:'The integrable bound licenses the reduction and cancellation; it is not a visual boundedness assumption.'}
    ],
    questions:[
      {title:'Discard the first function in a tail. What can happen to its infimum?',options:['It can only rise or stay fixed','It can only fall','It must oscillate with the functions'],correct:0,stage:1,
       reason:'An infimum over a smaller set cannot be smaller. This order argument holds for every outcome, so hₙ ≤ hₙ₊₁ regardless of how fₙ oscillates.'},
      {title:'Which sequence lets the proof use monotone convergence?',options:['The original fₙ, because it is nonnegative','The tail infima hₙ, because they are nonnegative and increasing','Any sequence with bounded displayed heights'],correct:1,stage:2,
       reason:'Nonnegativity alone does not give monotonicity. The proof constructs hₙ specifically to gain it, and MON identifies the integral of its limit.'},
      {title:'Why does the signed version require an integrable common lower bound g?',options:['It makes each fₙ increasing','It forces equality in Fatou','It permits a nonnegative reduction and adding back a finite integral'],correct:2,stage:3,
       reason:'Apply nonnegative Fatou to (fₙ − g)₊. Integrability makes ∫g finite, so linearity can add it back without an ∞ − ∞ expression.'}
    ]},
  cdf:{number:'1.2.36',kind:'Definition',name:'Distribution function',title:'One threshold. An event, a law, and a number.',
    goal:r`Read $F_X(\alpha)=\mathbf P(X\le\alpha)$ as a probability of outcomes, and see why an atom at the threshold is included.`,
    context:r`The four outcomes a,b,c,d report X-values −1,1,1,3. Their masses are $0.4(1-p),p/5,4p/5,0.6(1-p)$, so the law has masses $0.4(1-p),p,0.6(1-p)$ at −1,1,3. Start at p=0.5.`,
    stages:[
      {label:'Choose outcomes',claim:'The threshold selects an event in the original sample space.',
       equation:r`A_\alpha=\{\omega:X(\omega)\le\alpha\}`,
       reason:r`Compare each reported X-value with α. At α=1, outcomes a,b,c all qualify. Outcomes b and c are distinct even though X reports the same value for both. The symbol ≤ includes equality.`,
       next:'To obtain a probability, add the masses of the selected outcomes.'},
      {label:'Group equal values',claim:'The law adds masses of outcomes with the same reported value.',
       equation:r`\mathcal P_X(( -\infty,\alpha])=\mathbf P(X^{-1}(( -\infty,\alpha]))`,
       reason:r`On the value axis, the two outcomes b and c contribute one atom at 1 with mass p. Taking its preimage recovers both outcomes. The law preserves the probability of each measurable question about X.`,
       next:'The cumulative function records that probability as a height at α.'},
      {label:'Read the CDF',claim:'A CDF height is cumulative mass, not the mass at a single point.',
       equation:r`F_X(\alpha)=\mathbf P(A_\alpha),\qquad F_X(1)-F_X(1-)=\mathbf P(X=1)=p`,
       reason:r`With p=0.5, the mass strictly below 1 is 0.2, the mass at 1 is 0.5, and F(1)=0.7. The filled dot is the value at the jump; the open dot is its excluded left limit. Moving α between atoms changes neither the event nor its probability.`,
       next:'The same definition applies to every real-valued random variable; this finite law makes its pieces visible.'}
    ],
    questions:[
      {title:'At α=1 with the original masses, which outcomes form {X≤1}?',options:['a, b, and c','Only a','Only b and c'],correct:0,stage:0,
       reason:'a has X=−1, while both b and c have X=1. All satisfy X≤1. Their masses add to 0.2 + 0.1 + 0.4 = 0.7.'},
      {title:'At α=1, change the mass p at 1 from 0.5 to 0.8. What is F(1)?',options:['0.8','0.88','0.7'],correct:1,stage:1,after:{p:.8},
       reason:'The mass below 1 becomes 0.4(1−0.8)=0.08. Include the atom of mass 0.8 at 1: F(1)=0.08+0.8=0.88.'},
      {title:'For the original law, what does F(1) − F(1−) measure?',options:['All mass at or below 1: 0.7','No mass, because one point has zero length','The mass at X=1: 0.5'],correct:2,stage:2,
       reason:'Probability need not be length. The atom at 1 has mass 0.5, so the jump is 0.7−0.2=0.5. Both outcomes reporting 1 contribute.'}
    ]},
  machine:{number:'1.3.7',kind:'Exercise solution',name:'The standard machine',title:'Carry one identity through four function classes.',
    goal:r`Prove $\mathbf P(h)=\lambda(fh)$ for every nonnegative Borel h, and for signed h with $\lambda(f|h|)<\infty$.`,
    context:r`The argument uses any nonnegative Borel density f satisfying the exercise hypothesis. Pictures use $f(x)=2x$ on [0,1], zero outside. The plain area under h is $\lambda(h)$; P weights the heights using f.`,
    stages:[
      {label:'Indicators',claim:'Start with the identity already supplied by the hypothesis.',
       equation:r`\mathbf P(\mathbf1_B)=\mathbf P(B)=\lambda(f\mathbf1_B)`,
       reason:r`The assumption holds for every Borel set B, so it proves the desired identity for every indicator. Moving the pictured interval changes B, but the general indicator step is supplied by the assumption, not by computing this one area.`,
       next:'Indicators are the building blocks for finite nonnegative sums.'},
      {label:'Simple functions',claim:'Scale indicator identities and add finitely many of them.',
       equation:r`\mathbf P\!\left(\sum_i c_i\mathbf1_{B_i}\right)=\sum_i c_i\lambda(f\mathbf1_{B_i})=\lambda\!\left(f\sum_i c_i\mathbf1_{B_i}\right)`,
       reason:r`For finite nonnegative coefficients, linearity under both P and λ transfers the indicator identity to every nonnegative simple function. The product fφ need not itself be simple: f stays inside the Lebesgue integral. Infinite coefficients can be reached by increasing finite coefficients and MON.`,
       next:'A general nonnegative function requires increasing simple approximations.'},
      {label:'Increasing limits',claim:'Apply MON on both sides of the established identity.',
       equation:r`\mathbf P(h)=\lim_n\mathbf P(\varphi_n)=\lim_n\lambda(f\varphi_n)=\lambda(fh)`,
       reason:r`Choose nonnegative simple φₙ↑h. Since f≥0, multiplication preserves the order: fφₙ↑fh, with 0·∞=0. MON under P gives the first limit; MON under λ gives the second. Both totals may be infinite. For arbitrary h one may use truncated dyadic lower approximations, with value 2ⁿ where h=∞.`,
       next:'The nonnegative result now applies to |h| and both parts of a signed function.'},
      {label:'Signed differences',claim:'Establish finiteness before subtracting the two identities.',
       equation:r`\mathbf P(|h|)=\lambda(f|h|)<\infty,\qquad \mathbf P(h)=\lambda(fh_+)-\lambda(fh_-)=\lambda(fh)`,
       reason:r`Step 3 applied to |h| proves integrability under P. It also makes the integrals of h₊ and h₋ finite under both routes. Apply step 3 to each part and subtract using linearity. Nonnegative f ensures (fh)₊=fh₊ and (fh)₋=fh₋. No undefined ∞−∞ is formed.`,
       next:'The identity has now reached exactly the nonnegative and integrable signed functions requested by the exercise.'}
    ],
    questions:[
      {title:'What establishes the indicator step for every Borel B?',options:['The exercise’s assumption about P(B)','The plain area under 1_B','The fact that one example gives 3/4'],correct:0,stage:0,
       reason:'P(B)=λ(f1_B) is assumed for every Borel B. Since P(1_B)=P(B), it is precisely the required indicator identity.'},
      {title:'What carries the identity from indicators to nonnegative simple functions?',options:['The new function must be continuous','Linearity on both sides','The product fφ must be simple'],correct:1,stage:1,
       reason:'Multiply each indicator identity by its nonnegative coefficient and add finitely many terms. fφ need not be simple; linearity of the Lebesgue integral still applies.'},
      {title:'Why does φₙ↑h allow MON for the multiplied functions too?',options:['Every density is bounded','Both sequences have equal numerical approximations','f≥0 preserves the pointwise increasing order'],correct:2,stage:2,
       reason:'For every point, multiplying by nonnegative f preserves order, so fφₙ↑fh. This licenses MON under λ, alongside MON under P.'},
      {title:'What must be established before the signed subtraction?',options:['P(|h|)=λ(f|h|)<∞ using the nonnegative case','The positive and negative integrals are equal','h is bounded everywhere'],correct:0,stage:3,
       reason:'Apply the established nonnegative identity to |h|. The assumed finite weighted absolute integral makes both parts finite, so subtracting their identities is legitimate.'}
    ]}
};
