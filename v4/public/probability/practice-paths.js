// Generalized navigation and method cues. Worked solutions remain in canonical entries.
const r=String.raw;
export const toolPaths=[
 {
  id:'measurability',title:'Show a set or function is measurable',
  cue:'The object is defined by thresholds, limits, coordinates, or a generated collection of events.',
  steps:[
   r`Write the event as an inverse image or as countable unions, intersections, and complements of known measurable events.`,
   r`For a function into a generated target $\sigma$-algebra, test the target generators. For a real function, half-line thresholds suffice.`,
   r`For a sequence or a vector, use countable-extremum closure or coordinate measurability. To identify a generated $\sigma$-algebra, prove both inclusions.`
  ],
  check:r`Specify source and target $\sigma$-algebras. Countable operations are allowed; arbitrary unions of measurable sets need not be measurable. Countable extrema may be extended real.`,
  entries:['1.1.14','1.1.21','1.2.9','1.2.14','1.2.22'],
  lectures:['l1-s2','l1-s5','l1-s6','l1-s7','l3-s2','l3-s5','l3-s8'],
  homework:['1.1.13','1.1.21','1.1.22','1.2.14','1.2.20','1.2.31']
 },
 {
  id:'generators',title:'Prove measures agree or extend independence',
  cue:'An identity is known on simple test sets and must hold on their generated event space.',
  steps:[
   r`Identify a generating $\pi$-system and check closure under intersections. Generation alone does not ensure uniqueness.`,
   r`For finite measures, compare their total masses and form the class of sets where they agree; check nested differences and increasing limits.`,
   r`For independence, hold events from the other collections fixed and compare $A\mapsto\mathbb P(A\cap H)$ with $A\mapsto\mathbb P(A)\mathbb P(H)$. Extend one coordinate at a time.`
  ],
  check:r`Finite-measure uniqueness requires equal finite total mass. For $\sigma$-finite measures, use a common finite-mass exhaustion from the generating class. Mutual independence checks every finite subfamily.`,
  entries:['1.1.36','1.1.38','1.1.39','1.4.4'],
  lectures:['l2-s3','l2-s4','l2-s5','l7-s5'],
  homework:['1.1.33','1.3.65']
 },
 {
  id:'laws-and-densities',title:'Move between a variable, its law, and a density',
  cue:'An expectation or probability is easier to compute in the space of reported values.',
  steps:[
   r`Write the law as the pushforward $P_X(B)=\mathbb P(X\in B)$ and identify which space carries each integral.`,
   r`Use $\mathbb E[h(X)]=\int h\,dP_X$. Replace $dP_X$ by $f_X\,d\lambda$ only when that law has a density.`,
   r`If an integral identity is known only for indicators, follow the standard machine: simple sums, nonnegative increasing limits, then a justified signed split.`
  ],
  check:r`The map and integrand must be measurable. Use nonnegativity or the stated integrability condition. A law can have atoms or singular mass and need not have a density.`,
  entries:['1.2.34','1.2.40','1.3.6','1.3.61','1.3.62'],
  lectures:['l4-s1','l4-s2','l4-s3','l6-s6','l6-s7','l6-s8','l6-s9','l7-s1'],
  homework:['1.2.50','1.3.7']
 },
 {
  id:'convergence',title:'Choose a convergence mode and control the error',
  cue:'The goal concerns a path, a bad-event probability, a moment of the error, or a randomly selected index.',
  steps:[
   r`Write the requested definition with its quantifiers: pathwise eventual control, $\mathbb P(|X_n-X|>\epsilon)\to0$, or $\mathbb E|X_n-X|^p\to0$.`,
   r`Turn a moment bound into a probability bound with Markov. To control every later time, use the tail union $\bigcup_{k\ge n}\{|X_k-X|>\epsilon\}$ instead of a single-time error.`,
   r`For a converse or counterexample, compare a moving support with a fixed outcome, or vary spike height and support size. If the index depends on the outcome, verify its measurability and keep that dependence in the argument.`
  ],
  check:r`Distinguish a deterministic index from an outcome-dependent index. Probability and moment convergence use a common probability space; a.s. convergence controls the whole eventual path outside one null event.`,
  entries:['1.2.25','1.3.13','1.3.22','1.3.25','1.3.26','1.3.29','1.3.30','1.3.36','1.3.37'],
  lectures:['l4-s4','l5-s1','l5-s4','l5-s8','l5-s9','l5-s10','l6-s1'],
  homework:['1.2.30','1.3.36','1.3.37']
 },
 {
  id:'limits-and-integrals',title:'Exchange an expectation with a limit or sum',
  cue:'The desired conclusion moves an integral through an approximation, a sequence, or an infinite series.',
  steps:[
   r`Look first for increasing nonnegative terms: monotone convergence gives equality, while Fatou gives a lower bound without monotonicity.`,
   r`For signed errors, look for one integrable envelope. If only convergence in probability is available, check uniform integrability before asking for $L^1$ convergence.`,
   r`For a series, work with finite partial sums first. Name the theorem that passes to the limit and separately check absolute convergence when it is claimed.`
  ],
  check:r`Each theorem needs its own hypotheses: nonnegativity and monotonicity for MCT; an integrable bound for DCT; convergence in probability plus uniform integrability for Vitali on a probability space. Bounded means alone do not imply uniform integrability.`,
  entries:['1.3.32','1.3.33','1.3.34','1.3.40','1.3.47','1.3.49'],
  lectures:['l4-s8','l6-s2','l6-s3','l6-s4'],
  homework:['1.3.7','1.3.65']
 },
 {
  id:'moments-and-norms',title:'Bound a product, a moment, or an Lp quantity',
  cue:'The expression contains a product, a sum inside a power, or a comparison between moment sizes.',
  steps:[
   r`For a product, match Hölder exponents; the square-integrable case is Cauchy–Schwarz. Independence is not needed for these inequalities.`,
   r`For a sum in $L^p$, use Minkowski when $p\ge1$. On a probability space, higher absolute moments control lower ones.`,
   r`For lower probability bounds from moments, insert an indicator of the target event before using Cauchy–Schwarz. For a vanishing norm, check equality almost surely rather than pointwise equality.`
  ],
  check:r`Check exponent ranges, finite moments, and zero cases before dividing. For $0<p<1$, the usual $L^p$ quantity is not a norm. Moment nesting without a mass factor uses total measure one.`,
  entries:['1.3.2','1.3.8','1.3.16','1.3.17','1.3.18','1.3.21'],
  lectures:['l5-s3','l5-s4','l5-s5','l5-s6','l5-s7'],
  homework:['1.3.21']
 },
 {
  id:'products-and-slices',title:'Find a marginal, an iterated integral, or a sum law',
  cue:'The problem gives a joint law, a product space, independent inputs, or a density of a sum.',
  steps:[
   r`Identify the joint law and the relevant product measure. Factor a joint law into marginal laws only after proving independence.`,
   r`For a marginal, integrate the joint density over the other coordinate and justify the order with nonnegative product integration. For a signed function, establish the required integrability.`,
   r`For an independent sum, push the product law through addition. If a summand has a density, use the corresponding convolution formula.`
  ],
  check:r`Keep joint measurability and $\sigma$-finiteness explicit. Nonnegative integrals may be infinite; signed inner integrals may require an almost-everywhere interpretation. Pairwise independence does not give a product law for the whole family.`,
  entries:['1.4.19','1.4.21','1.4.28','1.4.29','1.4.33','1.4.34'],
  lectures:['l7-s8','l7-s9','l7-s10','l7-s11','l8-s5','l8-s6','l8-s9','l8-s10','l8-s12'],
  homework:['1.4.15','1.4.18']
 },
 {
  id:'sequences-and-tails',title:'Handle cylinders, infinite sequences, and tail events',
  cue:'The event concerns infinitely many coordinates, or the law is specified by finite-dimensional distributions.',
  steps:[
   r`For constructing a real sequence law, define cylinder events and verify consistency when the last coordinate is forgotten; then use Kolmogorov extension.`,
   r`For a tail claim, express the event using every remaining suffix, so that it belongs to $\bigcap_n\sigma(X_{n+1},X_{n+2},\ldots)$.`,
   r`Under mutual independence, extend independence from each finite prefix to the event space generated by the whole sequence. For infinite intersections or products, first use finite ones and then probability continuity.`
  ],
  check:r`Kolmogorov extension here concerns real Borel coordinates. The zero-one law needs mutual independence and gives only a zero-or-one dichotomy; it does not decide which value holds. Finite-coordinate factorization comes before an infinite-product limit.`,
  entries:['1.4.6','1.4.8','1.4.9','1.4.10','1.4.22'],
  lectures:['l7-s6','l7-s13','l8-s1','l8-s2','l8-s3','l8-s4'],
  homework:['1.2.14','1.4.18']
 },
 {
  id:'averages-and-recurrence',title:'Control averages and events occurring infinitely often',
  cue:'The goal concerns a sample mean, eventual error control, or recurrence along a sequence.',
  steps:[
   r`Choose the requested conclusion first: convergence in probability, in $L^2$, or almost surely. For finite second moments, compute the variance of the centered average and check its dependence assumptions.`,
   r`For identically distributed independent integrable variables without a second moment, consider the truncation weak law. For a strong law, verify the stated independence and one-sided integrability hypotheses.`,
   r`For infinitely many events, write the limsup as tail unions and inspect $\sum_n\mathbb P(A_n)$. Summability invokes Borel–Cantelli I; divergence invokes Borel–Cantelli II only with its independence hypothesis.`
  ],
  check:r`For a simple variance bound, uncorrelated variables with a common mean and uniformly bounded variances suffice; check the general normalized-variance condition in the theorem. The integrable weak law uses i.i.d. variables. The stated strong law uses identically distributed, pairwise independent variables and permits a one-sided extended mean. Borel–Cantelli I needs no independence, while the stated second lemma needs mutual independence.`,
  entries:['2.1.3','2.1.14','2.2.1','2.2.4','2.2.7','2.3.3'],
  lectures:[],homework:['1.1.4','1.3.21']
 },
 {
  id:'weak-limits',title:'Identify a limiting distribution',
  cue:'The proposed limit concerns laws rather than convergence of the original sample paths.',
  steps:[
   r`On the real line, test CDF convergence at continuity points of the proposed limiting CDF. A jump of the limit is not a required test point.`,
   r`Alternatively, use bounded continuous test functions or Portmanteau. For a set probability to converge, check that the limiting law gives its boundary mass zero.`,
   r`If characteristic functions are simpler, compute their pointwise limit for every real argument and check continuity at zero before applying Lévy’s continuity theorem.`
  ],
  check:r`The limiting CDF must describe a probability law. Weak convergence does not require a common probability space and does not alone justify convergence of unbounded moments. A pointwise transform limit without continuity at zero may lose tightness.`,
  entries:['3.2.1','3.2.17','3.2.18','3.2.20','3.2.21','3.3.18'],
  lectures:[],homework:[]
 }
];

export const homeworkSets=[
 {
  number:1,title:'HW1 · Events and generators',exercises:[
   {entry:'1.1.4',method:'Disjointization and monotone event limits',cue:'Separate set differences, replace overlaps by disjoint pieces, and distinguish increasing from decreasing limits.',pitfall:'Continuity from above for a general measure needs one finite-mass member.'},
   {entry:'1.1.13',method:'Check sigma-algebra closure through set identities',cue:'Track how intersection with a fixed measurable event interacts with complements and countable unions.',pitfall:'Keep the common underlying space and the condition that the fixed event belongs to the smaller sigma-algebra.'},
   {entry:'1.1.21',method:'Prove both generator inclusions',cue:'Use rational boxes for open sets, then coordinate cylinders for Borel rectangles.',pitfall:'The product sigma-algebra is generated by rectangles; it is not just the collection of rectangles.'},
   {entry:'1.1.22',method:'Make countable dependence a sigma-algebra property',cue:'Collect events that depend on some countable subfamily and test closure under complements and countable unions.'},
   {entry:'1.1.33',method:'Build a finite-space uniqueness counterexample',cue:'Compare two atom-mass assignments on a generating family, then test whether that family meets the uniqueness theorem’s closure assumptions.',pitfall:'Generating the full event space alone is insufficient for measure uniqueness.'}
  ]
 },
 {
  number:2,title:'HW2 · Measurability and support',exercises:[
   {entry:'1.2.14',method:'Threshold generators and finite-coordinate cylinders',cue:'Use coordinatewise threshold intersections, then compare the sigma-algebras they generate.',pitfall:'An increasing union of sigma-algebras need not itself be a sigma-algebra.'},
   {entry:'1.2.20',method:'Closed sublevel sets and the generator test',cue:'Use the metric definition of semicontinuity to study threshold preimages before checking Borel measurability.'},
   {entry:'1.2.30',method:'Decreasing unions of later bad events',cue:'Replace a pathwise eventual bound by a deterministic cutoff outside a small exceptional event.',pitfall:'Keep the cutoff independent of the outcome after removing the exceptional event.'},
   {entry:'1.2.31',method:'Simple approximation and closure under pointwise limits',cue:'Check the two minimal-class inclusions separately.',pitfall:'Use the course convention allowing extended-real measurable limits.'},
   {entry:'1.2.50',method:'Neighborhood masses and CDF jumps',cue:'Compare small neighborhoods with CDF increments, and examine what isolation means for neighboring support points.',pitfall:'A support point need not be an atom; isolation is the extra condition.'}
  ]
 },
 {
  number:3,title:'HW3 · Integration and random indices',exercises:[
   {entry:'1.3.7',method:'The standard machine for a weighted integral',cue:'Carry an indicator identity through finite linear combinations, increasing simple approximations, and a signed split.',pitfall:'Establish absolute integrability before subtracting signed parts.'},
   {entry:'1.3.21',method:'Cauchy–Schwarz and pointwise indicator bounds',cue:'Split at the threshold, factor a difference of squares, and count event memberships when comparing union bounds.',pitfall:'The Bonferroni and second-moment lower bounds have no universal ordering; handle zero denominators separately.'},
   {entry:'1.3.36',method:'Tail unions and a measurable late-violation selector',cue:'Distinguish a fixed late index from a random index chosen to detect a later error.',pitfall:'The hypothesis quantifies over every measurable random integer above the cutoff; independence is not assumed.'},
   {entry:'1.3.37',method:'Measurable selection, pathwise subsequences, and two error terms',cue:'Separate measurability of the selected value from its convergence. Compare almost-sure convergence with the moving-support counterexample.',pitfall:'A random index can depend on the same outcome as the sequence; probability convergence alone is insufficient.'}
  ]
 },
 {
  number:4,title:'HW4 · Disjoint sums and independence',exercises:[
   {entry:'1.3.65',method:'Finite partial sums, domination, and measure uniqueness',cue:'Treat the disjoint-sum identity first, then connect weighted measures and equality of their integrals.',pitfall:'Use a positive finite normalizer, and equal finite total masses when extending agreement from a pi-system.'},
   {entry:'1.4.15',method:'Finite bijections and a higher-order constraint',cue:'Count each low-dimensional marginal and look for a deterministic relation involving the entire family.',pitfall:'Pairwise or triple-wise independence does not automatically extend to the full family.'},
   {entry:'1.4.18',method:'Finite independence identities followed by continuity',cue:'Start with finitely many distinct primes, then pass to the infinite intersection. For the gcd, separate scaling from normalization.',pitfall:'Justify an infinite product as a limit of finite products; use one common normalizer in the joint law.'}
  ]
 }
];
