// Editorial practice problems. Source statements in dist/content/ remain unchanged.
// Solution arrays are rendered only inside the practice page answer disclosures.
export const repairProblems = [
  {
    "id": "repair-pairs",
    "title": "What a pair partition can distinguish",
    "source": "Adapted study exercise based on the 2017 midterm pair-partition questions (restated; editorial repair exercise).",
    "prompt": [
      "Let $\\Omega=\\mathbb N_0=\\{0,1,2,\\ldots\\}$, $J_k=\\{2k,2k+1\\}$ for $k\\ge0$, and $\\mathcal G=\\sigma(J_k:k\\ge0)$. Describe every set in $\\mathcal G$, prove $\\mathcal G\\ne2^\\Omega$, and characterize the real-valued $\\mathcal G$-measurable functions. Give one real function that is not $\\mathcal G$-measurable."
    ],
    "flawed": [
      "The function $h(n)=\\lfloor n/2\\rfloor$ takes infinitely many values. Since the generators are only two-point sets, $h$ cannot be $\\mathcal G$-measurable; this proves $\\mathcal G\\ne2^\\Omega$."
    ],
    "hints": [
      "Build the class of sets that either contain both members of each pair or contain neither. Check its sigma-algebra properties.",
      "Test a function by taking inverse images of Borel sets. Infinite range alone says nothing about measurability."
    ],
    "solution": [
      "Let $\\mathcal C=\\{\\bigcup_{k\\in I}J_k:I\\subseteq\\mathbb N_0\\}$. It contains $\\varnothing$ and $\\Omega$. Complements replace $I$ by $\\mathbb N_0\\setminus I$, and countable unions replace the index sets by their union, so $\\mathcal C$ is a sigma-algebra containing every $J_k$. Thus $\\mathcal G\\subseteq\\mathcal C$. Conversely every $I\\subseteq\\mathbb N_0$ is countable, so every union defining $\\mathcal C$ is a countable union of generators and lies in $\\mathcal G$. Therefore $\\mathcal G=\\mathcal C$.",
      "The singleton $\\{0\\}$ splits $J_0$, so $\\{0\\}\\notin\\mathcal G$ and $\\mathcal G\\ne2^\\Omega$. If a function is constant on each pair, every Borel inverse image is a union of pairs and is measurable. If a real function takes different values at the members of some pair, a Borel half-line separating those two values has an inverse image that splits that pair, so the function is not measurable.",
      "The proposed $h$ is constant on each pair and is measurable. A valid nonmeasurable example is $f(n)=n$: $$f^{-1}(( -\\infty,1/2])=\\{0\\}\\notin\\mathcal G.$$ The inputs to these functions are numbers $n$, not the sets $J_k$."
    ],
    "checks": [
      "Prove both inclusions in the description of the sigma-algebra.",
      "Use countable closure, not closure under arbitrary uncountable unions.",
      "Test a Borel inverse image.",
      "A function constant on each pair is measurable."
    ],
    "entries": [
      "1.1.14",
      "1.2.2",
      "1.2.12"
    ],
    "lectures": [
      "l1-s5",
      "l3-s2",
      "l3-s3"
    ]
  },
  {
    "id": "repair-marginal",
    "title": "Integrate out coordinates, without independence",
    "source": "Adapted study exercise based on the 2017 midterm marginal-density question (restated; editorial repair exercise).",
    "prompt": [
      "Let $X=(X_1,\\ldots,X_d)$, $d\\ge2$, have a joint Borel probability density $f:\\mathbb R^d\\to[0,\\infty]$ with respect to Lebesgue measure. For each coordinate $i$, prove that $X_i$ has a density obtained by integrating $f$ over the other $d-1$ coordinates. State the measurability and normalization checks. No independence is assumed."
    ],
    "flawed": [
      "Write $f(x_1,\\ldots,x_d)=\\prod_i f_i(x_i)$. Integrating this product shows that each $f_i$ is a marginal density, so every joint density yields independent coordinates."
    ],
    "hints": [
      "The required direction starts with the given joint density; no factorization is available.",
      "For a Borel set $B\\subseteq\\mathbb R$, write $\\mathbb P(X_i\\in B)$ as a nonnegative integral and use Tonelli."
    ],
    "solution": [
      "Fix $i$ and write $z(t,u)$ for the vector with coordinate $i$ equal to $t$ and all other coordinates given by $u\\in\\mathbb R^{d-1}$. Set $$g_i(t)=\\int_{\\mathbb R^{d-1}} f(z(t,u))\\,du.$$ The integrand is Borel measurable and nonnegative. Tonelli gives a measurable nonnegative $g_i$ and $$\\int_{\\mathbb R}g_i(t)\\,dt=\\int_{\\mathbb R^d}f(z)\\,dz=1.$$ In particular $g_i$ is finite almost everywhere; if an everywhere finite version is wanted, change it to zero on its measurable null set of infinite values.",
      "For every Borel $B$, apply Tonelli again: $$\\mathbb P(X_i\\in B)=\\int_{\\mathbb R^d}\\mathbf1_B(z_i)f(z)\\,dz=\\int_B\\left[\\int_{\\mathbb R^{d-1}}f(z(t,u))\\,du\\right]dt=\\int_Bg_i(t)\\,dt.$$ This is exactly the marginal density assertion.",
      "Factorization is unnecessary and generally false. For example, $f(x,y)=2\\mathbf1_{\\{0<x<y<1\\}}$ has marginals $g_1(x)=2(1-x)\\mathbf1_{(0,1)}(x)$ and $g_2(y)=2y\\mathbf1_{(0,1)}(y)$, whose product is positive on the positive-area triangle $0<y<x<1$, where the joint density is zero."
    ],
    "checks": [
      "Start from the given joint density.",
      "Use nonnegativity to justify Tonelli.",
      "Show the candidate is measurable and integrates to one.",
      "Verify its integral gives the probability of every Borel event.",
      "Do not introduce independence."
    ],
    "entries": [
      "1.2.40",
      "1.4.28"
    ],
    "lectures": [
      "l7-s11",
      "l8-s5"
    ]
  },
  {
    "id": "repair-indicator-limit",
    "title": "An integral limit of indicators",
    "source": "Adapted study exercise based on the 2012 practice midterm indicator-limit question (restated; editorial repair exercise).",
    "prompt": [
      "On any measure space $(\\Omega,\\mathcal F,\\mu)$, suppose $A_n\\in\\mathcal F$ and a real measurable function $f$ satisfy $$\\int_\\Omega|\\mathbf1_{A_n}-f|\\,d\\mu\\longrightarrow0.$$ Prove there is $A\\in\\mathcal F$ such that $f=\\mathbf1_A$ almost everywhere. Do not assume the sets $A_n$ converge."
    ],
    "flawed": [
      "Convergence of the integrals means $\\mathbf1_{A_n}(\\omega)\\to f(\\omega)$ for every $\\omega$. The sets therefore converge to some $A$, and their limit is $\\mathbf1_A$."
    ],
    "hints": [
      "Construct a measurable distance from $f(\\omega)$ to the two-point set $\\{0,1\\}$.",
      "Bound that distance by every error $|\\mathbf1_{A_n}-f|$, and use the zero nonnegative integral criterion."
    ],
    "solution": [
      "Define $$d(\\omega)=\\min\\{|f(\\omega)|,|1-f(\\omega)|\\}.$$ This is nonnegative and measurable. Since each $\\mathbf1_{A_n}(\\omega)$ is either zero or one, $$0\\le d(\\omega)\\le|\\mathbf1_{A_n}(\\omega)-f(\\omega)|.$$ Integrating and letting $n\\to\\infty$ gives $\\int d\\,d\\mu=0$.",
      "A nonnegative measurable function with zero integral vanishes almost everywhere, so $d=0$ almost everywhere. Thus $f\\in\\{0,1\\}$ almost everywhere. Let $A=\\{f=1\\}\\in\\mathcal F$; outside the null set where $d>0$, $f=\\mathbf1_A$.",
      "The argument uses neither pointwise convergence of the full sequence nor a limiting-set assumption. The integral inequality alone forces the limit values to lie in the closed two-point set."
    ],
    "checks": [
      "Use a measurable nonnegative distance.",
      "Prove the bound for every n.",
      "Name the zero-integral theorem and its sign hypothesis.",
      "Construct a measurable A explicitly."
    ],
    "entries": [
      "1.3.8",
      "1.3.26"
    ],
    "lectures": [
      "l5-s1",
      "l5-s8"
    ]
  },
  {
    "id": "repair-union-bound",
    "title": "Disjointization gives an inequality",
    "source": "Adapted study exercise from the Homework 1 union-bound correction (Dembo 1.1.4(b)).",
    "prompt": [
      "For events $A_1,A_2,\\ldots$ in a probability space, prove $$\\mathbb P\\left(\\bigcup_{n\\ge1}A_n\\right)\\le\\sum_{n\\ge1}\\mathbb P(A_n).$$ Repair the proposed proof and give an example where the inequality is strict."
    ],
    "flawed": [
      "The union has probability $\\sum_n\\mathbb P(A_n)$ by countable additivity. Overlap only changes which disjoint pieces represent the same sum, so equality still holds."
    ],
    "hints": [
      "Replace each event by the part not already covered by earlier events.",
      "Countable additivity applies to those new pieces, whose probabilities are at most the original ones."
    ],
    "solution": [
      "Put $B_1=A_1$ and $$B_n=A_n\\setminus\\bigcup_{j<n}A_j\\quad(n\\ge2).$$ Each $B_n$ is measurable, the $B_n$ are pairwise disjoint, $B_n\\subseteq A_n$, and $\\bigcup_nB_n=\\bigcup_nA_n$. Hence $$\\mathbb P\\left(\\bigcup_nA_n\\right)=\\sum_n\\mathbb P(B_n)\\le\\sum_n\\mathbb P(A_n).$$ The equality belongs to the disjoint pieces; monotonicity supplies the inequality.",
      "For strictness take $A_1=A_2=\\Omega$ and $A_n=\\varnothing$ for $n\\ge3$. The union has probability $1$, whereas the displayed sum of original probabilities is $2$."
    ],
    "checks": [
      "Define measurable disjoint pieces.",
      "Show the union is preserved.",
      "Do not replace an inequality by equality for overlapping events."
    ],
    "entries": [
      "1.1.4"
    ],
    "lectures": [
      "l1-s2"
    ]
  },
  {
    "id": "repair-sum-dct",
    "title": "Exchange a signed series and expectation legally",
    "source": "Adapted study exercise from the Homework 4 signed-summation correction (Dembo 1.3.65(a)).",
    "prompt": [
      "Let $X$ be integrable, let $A_n\\in\\mathcal F$, $n\\ge0$, be disjoint, and set $A=\\bigcup_{n\\ge0}A_n$. Prove that $$\\sum_{n\\ge0}\\mathbb E[X\\mathbf1_{A_n}]$$ converges absolutely and equals $\\mathbb E[X\\mathbf1_A]$. Make every limiting step precise."
    ],
    "flawed": [
      "Every term $X\\mathbf1_{A_n}$ is bounded in absolute value by $|X|$. Therefore the entire infinite series of their absolute expectations is at most $\\mathbb E|X|$, and expectation can be moved through the sum directly."
    ],
    "hints": [
      "Define the finite partial-sum variables before invoking dominated convergence.",
      "Use disjointness to bound the absolute-value partial sums by one copy of |X|, then take a limit."
    ],
    "solution": [
      "Define $$S_N=\\sum_{n=0}^{N}X\\mathbf1_{A_n}=X\\mathbf1_{\\cup_{n=0}^{N}A_n}.$$ Disjointness gives $S_N\\to X\\mathbf1_A$ pointwise and $|S_N|\\le|X|$, with $\\mathbb E|X|<\\infty$. DCT and finite linearity yield $$\\mathbb E[X\\mathbf1_A]=\\lim_{N\\to\\infty}\\mathbb E S_N=\\lim_{N\\to\\infty}\\sum_{n=0}^{N}\\mathbb E[X\\mathbf1_{A_n}].$$",
      "For every finite $N$, $$\\sum_{n=0}^{N}|\\mathbb E[X\\mathbf1_{A_n}]|\\le\\sum_{n=0}^{N}\\mathbb E[|X|\\mathbf1_{A_n}]=\\mathbb E[|X|\\mathbf1_{\\cup_{n=0}^{N}A_n}]\\le\\mathbb E[|X|\\mathbf1_A]<\\infty.$$ The nonnegative numerical partial sums increase and are bounded, so the series of absolute expectations converges. This also justifies the signed series identified above.",
      "A termwise bound alone would not bound an infinite sum by one term. The missing ingredient is that disjoint supports make every finite sum of absolute integrands at most $|X|$."
    ],
    "checks": [
      "Apply DCT to finite partial-sum variables.",
      "State pointwise convergence and an integrable dominating variable.",
      "Prove absolute convergence with bounded numerical partial sums.",
      "Keep the upper summation limit finite inside the N-limit."
    ],
    "entries": [
      "1.3.34",
      "1.3.65"
    ],
    "lectures": [
      "l6-s3"
    ]
  },
  {
    "id": "repair-normalized-density",
    "title": "Common mass, the zero case, and signed differences",
    "source": "Adapted study exercise from the Homework 4 normalization and sign corrections (Dembo 1.3.65(b)–(c)).",
    "prompt": [
      "First show that if $Z\\ge0$ and $0<\\mathbb E Z<\\infty$, then $$Q(B)=\\frac{\\mathbb E[Z\\mathbf1_B]}{\\mathbb E Z},\\qquad B\\in\\mathcal F,$$ defines a probability measure.",
      "Now suppose $X,Y\\ge0$, $\\mathbb E X=\\mathbb E Y<\\infty$, and $\\mathbb E[X\\mathbf1_B]=\\mathbb E[Y\\mathbf1_B]$ for every $B$ in a pi-system $\\mathcal P$ with $\\sigma(\\mathcal P)=\\mathcal F$. Use normalized measures to prove $X=Y$ almost surely."
    ],
    "flawed": [
      "Divide by $\\mathbb E X$ and $\\mathbb E Y$ to get two probability measures. They agree everywhere by uniqueness. Then $(X-Y)\\mathbf1_{\\{Y>X\\}}$ is nonnegative with zero expectation, so it vanishes; the other side is the same."
    ],
    "hints": [
      "Before dividing, separate the case where the common expectation is zero.",
      "After uniqueness, use a nonnegative difference on each of the events {X>Y} and {Y>X}."
    ],
    "solution": [
      "Nonnegativity of $Z$ makes $Q$ nonnegative. Its zero-set value is $Q(\\varnothing)=0$, and $Q(\\Omega)=1$. For disjoint $B_n$, the signed-summation result applied to integrable $Z$ gives $$Q\\left(\\bigcup_nB_n\\right)=\\frac{\\sum_n\\mathbb E[Z\\mathbf1_{B_n}]}{\\mathbb E Z}=\\sum_nQ(B_n).$$ Thus $Q$ is a probability measure; the positive finite denominator is essential.",
      "Put $c=\\mathbb E X=\\mathbb E Y$. If $c=0$, nonnegativity immediately gives $X=Y=0$ almost surely. If $c>0$, define $$Q_X(B)=\\mathbb E[X\\mathbf1_B]/c,\\qquad Q_Y(B)=\\mathbb E[Y\\mathbf1_B]/c.$$ These are probability measures agreeing on the generating pi-system. The pi-lambda uniqueness theorem gives equality on every $B\\in\\mathcal F$. Multiplying by the same denominator $c$ shows $\\mathbb E[(X-Y)\\mathbf1_B]=0$ for every such $B$.",
      "For $B=\\{X>Y\\}$, the integrable variable $(X-Y)\\mathbf1_B$ is nonnegative with zero expectation, so $\\mathbb P(X>Y)=0$. For $C=\\{Y>X\\}$ use $(Y-X)\\mathbf1_C$, which is nonnegative and has zero expectation by the same equality with its sign reversed. Thus $\\mathbb P(Y>X)=0$, and $X=Y$ almost surely."
    ],
    "checks": [
      "Require Z nonnegative and its expectation positive and finite.",
      "Handle common mass zero before normalization.",
      "Use equal total mass and a generating pi-system for uniqueness.",
      "Multiply by the common denominator.",
      "Reverse the difference on the second sign event."
    ],
    "entries": [
      "1.1.39",
      "1.3.8",
      "1.3.58",
      "1.3.65"
    ],
    "lectures": [
      "l2-s5",
      "l5-s1",
      "l6-s6"
    ]
  },
  {
    "id": "repair-infinite-products",
    "title": "Finite independence needs a limiting step",
    "source": "Adapted study exercise from the Homework 4 infinite-product correction (Dembo 1.4.18(b)–(c)).",
    "prompt": [
      "Fix $s>1$, let $\\zeta(s)=\\sum_{k=1}^{\\infty}k^{-s}$, and let $X$ take values in the positive integers with $\\mathbb P(X=k)=k^{-s}/\\zeta(s)$. For each prime $p$ let $D_p=\\{p\\mid X\\}$. Prove $$\\mathbb P(X=1)=\\prod_{p\\ \\mathrm{prime}}(1-p^{-s})=\\frac1{\\zeta(s)},$$ defining the infinite product through finite products. Also show that the probability $X$ is squarefree is $1/\\zeta(2s)$."
    ],
    "flawed": [
      "The prime divisibility events are independent, so independence directly turns the countably infinite intersection of their complements into the product. No limiting argument is necessary."
    ],
    "hints": [
      "Compute the probability that a fixed positive integer divides X. Check mutual independence for finite prime families.",
      "Enumerate the primes and identify a decreasing sequence of finite-intersection events."
    ],
    "solution": [
      "For any positive integer $d$, $$\\mathbb P(d\\mid X)=\\sum_{k\\ge1}\\frac{(dk)^{-s}}{\\zeta(s)}=d^{-s}.$$ For distinct primes $p_1,\\ldots,p_m$, divisibility by all is divisibility by their product, so $$\\mathbb P\\left(\\bigcap_{j=1}^{m}D_{p_j}\\right)=\\prod_{j=1}^{m}p_j^{-s}.$$ The same computation applies to every finite subfamily, proving mutual independence. Their complements are mutually independent as well, by finite inclusion-exclusion.",
      "Enumerate all primes as $p_1,p_2,\\ldots$ and set $E_m=\\bigcap_{j=1}^{m}D_{p_j}^c$. Then $E_m\\downarrow\\{X=1\\}$, because every integer greater than one has a prime divisor. Finite independence and continuity from above of probability give $$\\mathbb P(X=1)=\\lim_{m\\to\\infty}\\mathbb P(E_m)=\\lim_{m\\to\\infty}\\prod_{j=1}^{m}(1-p_j^{-s}).$$ This limit defines the infinite product. The given mass function makes its value $1/\\zeta(s)$.",
      "For squarefreeness replace $D_p$ by $H_p=\\{p^2\\mid X\\}$. Distinct finite families have intersection probability $\\prod_jp_j^{-2s}$, so the same decreasing-event argument gives $$\\mathbb P(X\\text{ is squarefree})=\\prod_p(1-p^{-2s})=\\frac1{\\zeta(2s)}.$$ The last equality is the just-proved identity with exponent $2s>1$."
    ],
    "checks": [
      "Check every finite subfamily for mutual independence.",
      "Define the infinite product as a limit of finite products.",
      "Name continuity from above and identify the limiting event.",
      "Use prime-square divisibility for squarefreeness."
    ],
    "entries": [
      "1.1.4",
      "1.4.2",
      "1.4.18"
    ],
    "lectures": [
      "l2-s6",
      "l7-s3"
    ]
  },
  {
    "id": "repair-zero-expectation",
    "title": "A zero signed mean can hide cancellation",
    "source": "Adapted study exercise from the Homework 4 zero-expectation correction (Lp part 2).",
    "prompt": [
      "Decide whether every integrable random variable $Z$ with $\\mathbb E Z=0$ must be zero almost surely. Give a counterexample if necessary, state and prove the correct nonnegative version, and explain how it proves definiteness of $(\\mathbb E|X|^p)^{1/p}$ for $p>0$."
    ],
    "flawed": [
      "If an integrable variable is positive anywhere or negative anywhere, its expectation cannot be zero. Therefore $\\mathbb E Z=0$ forces $Z=0$ almost surely."
    ],
    "hints": [
      "Try a variable taking two opposite values with equal probability.",
      "For a nonnegative variable, bound it below by a positive constant times an indicator of a threshold event."
    ],
    "solution": [
      "The claim is false for signed variables. On two equally likely outcomes let $Z$ take values $1$ and $-1$. Then $\\mathbb E Z=0$ while $\\mathbb P(Z\\ne0)=1$; the signed contributions cancel.",
      "If $Z\\ge0$ and $\\mathbb E Z=0$, then for each integer $m\\ge1$, $$0=\\mathbb E Z\\ge\\frac1m\\mathbb P(Z\\ge1/m).$$ All these probabilities are zero. Since $\\{Z>0\\}=\\bigcup_{m\\ge1}\\{Z\\ge1/m\\}$, countable subadditivity gives $Z=0$ almost surely. The converse follows by invariance of the integral under almost-sure equality.",
      "For a finite $p>0$, the quantity $|X|^p$ is nonnegative. Thus $$\\|X\\|_p=0\\quad\\Longleftrightarrow\\quad\\mathbb E|X|^p=0\\quad\\Longleftrightarrow\\quad X=0\\ \\text{almost surely}.$$ This is definiteness on equivalence classes. It does not establish the triangle inequality when $p<1$."
    ],
    "checks": [
      "Distinguish signed and nonnegative variables.",
      "Use countably many positive thresholds.",
      "Apply the criterion to |X|^p, not to X itself.",
      "Interpret zero as the zero almost-sure equivalence class."
    ],
    "entries": [
      "1.3.2",
      "1.3.8"
    ],
    "lectures": [
      "l5-s1",
      "l5-s7"
    ]
  },
  {
    "id": "repair-below-one",
    "title": "Why the ordinary triangle inequality stops at one",
    "source": "Adapted study exercise on the exponent qualification in Homework 4 Lp parts 2 and 6.",
    "prompt": [
      "Fix $0<p<1$. On a probability space with two equally likely outcomes, let $U=(1,0)$ and $V=(0,1)$. Test the triangle inequality for $\\|X\\|_p=(\\mathbb E|X|^p)^{1/p}$. Then prove the valid inequality $$\\mathbb E|X+Y|^p\\le\\mathbb E|X|^p+\\mathbb E|Y|^p$$ and explain what it says about closure under addition."
    ],
    "flawed": [
      "Minkowski holds for every positive exponent, since the proof only takes a positive root. Hence the moment quantity is a norm for all $p>0$."
    ],
    "hints": [
      "Compute both individual quantities and the quantity of the sum before using any theorem.",
      "For 0<p<1, prove (a+b)^p≤a^p+b^p for nonnegative a,b, then apply the ordinary absolute-value inequality."
    ],
    "solution": [
      "Here $U+V=(1,1)$, so $\\|U+V\\|_p=1$, while $$\\|U\\|_p+\\|V\\|_p=2(1/2)^{1/p}=2^{1-1/p}<1.$$ Thus the triangle inequality fails, and this quantity is not a norm.",
      "For $a>0$, set $t=b/a\\ge0$. The function $r(t)=1+t^p-(1+t)^p$ has $r(0)=0$ and $r'(t)=p[t^{p-1}-(1+t)^{p-1}]\\ge0$ for $t>0$, since $p-1<0$. Hence $(a+b)^p\\le a^p+b^p$; if $a=0$, the claim is immediate. Therefore $$|X+Y|^p\\le(|X|+|Y|)^p\\le|X|^p+|Y|^p.$$ Integrating proves the stated inequality.",
      "If $X,Y\\in L^p$, the right side is finite, so $X+Y\\in L^p$ despite the failure of the norm triangle inequality. On $L^p$ almost-sure classes, $d_p(X,Y)=\\mathbb E|X-Y|^p$ is a metric: definiteness uses the nonnegative zero-integral criterion, symmetry is immediate, and the power inequality proves its triangle inequality."
    ],
    "checks": [
      "Use the two-outcome probabilities in every moment.",
      "Do not invoke Minkowski outside p≥1.",
      "Prove the power inequality and state its consequence."
    ],
    "entries": [
      "1.3.8",
      "1.3.18"
    ],
    "lectures": [
      "l5-s6"
    ]
  }
];

export const lpProblems = [
  {
    "id": "lp-1",
    "group": "hw4-lp",
    "title": "Equality almost surely is an equivalence relation",
    "source": "Homework 4, unnumbered Lp exercise, part 1 (restated with notation clarified).",
    "prompt": [
      "Fix a probability space $(\\Omega,\\mathcal F,\\mathbb P)$. Call real-valued random variables $X,Y$ equivalent if $$\\mathbb P(\\{\\omega:X(\\omega)=Y(\\omega)\\})=1.$$ Show that this defines an equivalence relation."
    ],
    "hints": [
      "Check reflexivity, symmetry, and transitivity separately.",
      "For transitivity, intersect the two probability-one equality events."
    ],
    "solution": [
      "Reflexivity holds because $\\{X=X\\}=\\Omega$ has probability one. Symmetry holds because $\\{X=Y\\}=\\{Y=X\\}$.",
      "For transitivity suppose $X=Y$ almost surely and $Y=Z$ almost surely. The complement of $\\{X=Y\\}\\cap\\{Y=Z\\}$ is the union of two null events and is null. On that intersection $X=Z$, so $\\mathbb P(X=Z)=1$. Thus the relation is transitive and is an equivalence relation."
    ],
    "checks": [
      "Use measurable equality events for real variables.",
      "Verify all three axioms.",
      "A finite union of null events is null."
    ],
    "entries": [
      "1.2.8"
    ],
    "lectures": [
      "l4-s2",
      "l5-s7"
    ]
  },
  {
    "id": "lp-2",
    "group": "hw4-lp",
    "title": "The finite-p norm on equivalence classes",
    "source": "Homework 4, unnumbered Lp exercise, part 2 (restated with notation clarified).",
    "prompt": [
      "For $p>0$, let $L^p(\\Omega,\\mathcal F,\\mathbb P)$ consist of equivalence classes, under equality almost surely, of real random variables $X$ with $\\mathbb E|X|^p<\\infty$. Show that for $p\\ge1$, $$\\|X\\|_p=(\\mathbb E|X|^p)^{1/p}$$ is a norm on this space. Check that the definition and vector operations are well-defined on classes, and verify vector-space closure and all norm axioms."
    ],
    "hints": [
      "Almost-sure equality is preserved by addition, scalar multiplication, and the map x↦|x|^p.",
      "For definiteness use the nonnegative variable |X|^p. For the triangle inequality use Minkowski; check finiteness before dividing in its proof."
    ],
    "solution": [
      "If $X=X'$ almost surely, then $|X|^p=|X'|^p$ almost surely, so they have the same moment. If also $Y=Y'$ almost surely, intersect the equality events to get $X+Y=X'+Y'$ and $cX=cX'$ almost surely. Thus both the quantity and vector operations are independent of representatives.",
      "Scalar closure and homogeneity follow from $$\\mathbb E|cX|^p=|c|^p\\mathbb E|X|^p,\\qquad\\|cX\\|_p=|c|\\|X\\|_p.$$ Nonnegativity is immediate. Because $|X|^p\\ge0$, zero expectation is equivalent to $X=0$ almost surely. Hence $\\|X\\|_p=0$ precisely for the zero equivalence class.",
      "For $p\\ge1$, convexity gives $|X+Y|^p\\le2^{p-1}(|X|^p+|Y|^p)$, so $X+Y$ has finite $p$th moment and belongs to $L^p$. When $p=1$, integration of $|X+Y|\\le|X|+|Y|$ proves the triangle inequality.",
      "For $p>1$, put $q=p/(p-1)$ and $A=\\mathbb E|X+Y|^p<\\infty$. Hölder gives $$A\\le\\mathbb E[|X||X+Y|^{p-1}]+\\mathbb E[|Y||X+Y|^{p-1}]\\le(\\|X\\|_p+\\|Y\\|_p)A^{1/q}.$$ If $A=0$ the triangle inequality is immediate; otherwise divide by $A^{1/q}$ and use $1-1/q=1/p$. Therefore $\\|X+Y\\|_p\\le\\|X\\|_p+\\|Y\\|_p$, completing the norm axioms."
    ],
    "checks": [
      "Define the zero vector as an almost-sure class.",
      "Use nonnegativity for the zero-expectation implication.",
      "Check closure under addition and scalar multiplication.",
      "Keep p≥1 for the norm assertion.",
      "Treat zero before division in the Hölder argument."
    ],
    "entries": [
      "1.3.2",
      "1.3.8",
      "1.3.17",
      "1.3.18"
    ],
    "lectures": [
      "l5-s5",
      "l5-s6",
      "l5-s7"
    ]
  },
  {
    "id": "lp-3",
    "group": "hw4-lp",
    "title": "The essential-supremum norm",
    "source": "Homework 4, unnumbered Lp exercise, part 3 (restated with notation clarified).",
    "prompt": [
      "Let $L^\\infty(\\Omega,\\mathcal F,\\mathbb P)$ consist of equivalence classes of real random variables $X$ for which some finite constant $M$ satisfies $\\mathbb P(|X|\\le M)=1$. Show that $$\\|X\\|_\\infty=\\inf\\{M\\ge0:\\mathbb P(|X|\\le M)=1\\}$$ is a norm on $L^\\infty$. Check well-definedness and vector-space closure."
    ],
    "hints": [
      "A change on a null event does not alter which constants are almost-sure bounds.",
      "To prove definiteness intersect the events |X|≤1/n. For the triangle inequality first use bounds within ε of the two infima."
    ],
    "solution": [
      "If $X=Y$ almost surely, then for any $M\\ge0$ the events $\\{|X|\\le M\\}$ and $\\{|Y|\\le M\\}$ differ by a subset of a measurable null event. They therefore have the same probability, so the infimum is well-defined on classes. Vector operations on classes are well-defined as in part 1.",
      "The infimum is nonnegative and finite by the definition of $L^\\infty$. If $X=0$ almost surely, its value is zero. Conversely, if $\\|X\\|_\\infty=0$, then for each $n\\ge1$ there is an admissible bound below $1/n$, so $\\mathbb P(|X|\\le1/n)=1$. The intersection of these probability-one events is $\\{X=0\\}$, proving definiteness.",
      "The scalar $c=0$ is immediate. For $c\\ne0$, dividing each almost-sure bound by $|c|$ gives $$\\|cX\\|_\\infty=|c|\\|X\\|_\\infty.$$ This also proves scalar closure.",
      "For every $\\varepsilon>0$, choose bounds $a<\\|X\\|_\\infty+\\varepsilon$ and $b<\\|Y\\|_\\infty+\\varepsilon$ with $|X|\\le a$ and $|Y|\\le b$ almost surely. On their common probability-one event, $|X+Y|\\le a+b$. Thus $X+Y\\in L^\\infty$ and $$\\|X+Y\\|_\\infty\\le\\|X\\|_\\infty+\\|Y\\|_\\infty+2\\varepsilon.$$ Letting $\\varepsilon\\downarrow0$ proves the triangle inequality."
    ],
    "checks": [
      "Use events, not probabilities as elements of an intersection.",
      "Check both directions of definiteness.",
      "Handle scalar zero separately.",
      "Approximate the infimum by admissible bounds."
    ],
    "entries": [
      "1.1.4",
      "1.2.8",
      "1.3.2"
    ],
    "lectures": [
      "l5-s6",
      "l5-s7"
    ]
  },
  {
    "id": "lp-4",
    "group": "hw4-lp",
    "title": "The limit of moment quantities as p grows",
    "source": "Homework 4, unnumbered Lp exercise, part 4 (restated with notation clarified).",
    "prompt": [
      "For $X\\in L^\\infty(\\Omega,\\mathcal F,\\mathbb P)$, show that $X\\in L^p(\\Omega,\\mathcal F,\\mathbb P)$ for every finite $p>0$, and prove $$\\lim_{p\\to\\infty}\\|X\\|_p=\\|X\\|_\\infty.$$"
    ],
    "hints": [
      "Let M be the essential supremum. First justify that |X|≤M almost surely, even though M is defined as an infimum.",
      "For 0<ε<M, the event |X|>M−ε must have positive probability. Use it to obtain a lower moment bound."
    ],
    "solution": [
      "Put $M=\\|X\\|_\\infty<\\infty$. For each $n$ choose an admissible almost-sure bound $a_n<M+1/n$. Outside the union of their null exceptional events, $|X|\\le a_n<M+1/n$ for every $n$, hence $|X|\\le M$. Therefore $\\mathbb E|X|^p\\le M^p$ and $\\|X\\|_p\\le M$ for every $p>0$. This proves membership in every finite $L^p$.",
      "If $M=0$, the variable is zero almost surely and all the quantities are zero, so the limit is immediate. Suppose $M>0$ and fix $0<\\varepsilon<M$. Let $A_\\varepsilon=\\{|X|>M-\\varepsilon\\}$. Its probability $a_\\varepsilon$ is positive; otherwise $M-\\varepsilon$ would be an admissible bound smaller than the infimum $M$.",
      "The contribution of this event gives $$\\|X\\|_p\\ge(M-\\varepsilon)a_\\varepsilon^{1/p}.$$ For the fixed number $a_\\varepsilon>0$, $a_\\varepsilon^{1/p}\\to1$ as $p\\to\\infty$. Hence $$M-\\varepsilon\\le\\liminf_{p\\to\\infty}\\|X\\|_p\\le\\limsup_{p\\to\\infty}\\|X\\|_p\\le M.$$ Let $\\varepsilon\\downarrow0$ to obtain the claimed limit."
    ],
    "checks": [
      "Retain X∈L∞ and probability total mass one.",
      "Handle essential supremum zero.",
      "Use a fixed positive-probability near-maximum event.",
      "Distinguish an almost-sure bound from a pointwise maximum."
    ],
    "entries": [
      "1.3.2",
      "1.3.16"
    ],
    "lectures": [
      "l5-s4",
      "l5-s6"
    ]
  },
  {
    "id": "lp-5",
    "group": "hw4-lp",
    "title": "As p tends to zero, moments detect nonzero mass",
    "source": "Homework 4, unnumbered Lp exercise, part 5 (restated with notation clarified).",
    "prompt": [
      "For a random variable $X$, set $S(X)=\\mathbb P(X\\ne0)$. Suppose $X\\in L^q(\\Omega,\\mathcal F,\\mathbb P)$ for some $q>0$. Prove $$\\lim_{p\\downarrow0}\\|X\\|_p^p=S(X).$$ The limit is through positive exponents."
    ],
    "hints": [
      "Find the pointwise limit of |X|^p separately at X=0 and at X≠0.",
      "For 0<p≤q, split according to |X|≤1 or |X|>1 and find one integrable dominating variable."
    ],
    "solution": [
      "For $0<p\\le q$, $$|X|^p\\le1+|X|^q.$$ On $|X|\\le1$ the left side is at most $1$; on $|X|>1$ it is at most $|X|^q$. The right side is integrable because the measure is a probability and $\\mathbb E|X|^q<\\infty$. Thus all the relevant $p$th moments are finite.",
      "As $p\\downarrow0$, $|X(\\omega)|^p\\to1$ where $X(\\omega)\\ne0$ and equals $0$ where $X(\\omega)=0$. Therefore it converges pointwise to $\\mathbf1_{\\{X\\ne0\\}}$. DCT along any sequence of positive $p$ values tending to zero yields $$\\lim_{p\\downarrow0}\\|X\\|_p^p=\\lim_{p\\downarrow0}\\mathbb E|X|^p=\\mathbb E\\mathbf1_{\\{X\\ne0\\}}=S(X).$$ Since the argument holds along every such sequence, it establishes the parameter limit."
    ],
    "checks": [
      "Keep one finite positive moment as a hypothesis.",
      "Treat X=0 separately in the pointwise limit.",
      "State an integrable dominator independent of p.",
      "The limit concerns the pth power of the quantity, not the quantity itself."
    ],
    "entries": [
      "1.3.2",
      "1.3.34"
    ],
    "lectures": [
      "l5-s4",
      "l6-s3"
    ]
  },
  {
    "id": "lp-6",
    "group": "hw4-lp",
    "title": "Simple functions are dense in every Lp",
    "source": "Homework 4, unnumbered Lp exercise, part 6 (restated with notation clarified).",
    "prompt": [
      "Prove that simple functions are dense in $L^p(\\Omega,\\mathcal F,\\mathbb P)$ for every $0<p\\le\\infty$. For finite $p>0$ and $X\\in L^p$, construct measurable simple functions $X_n$ with $$\\mathbb E|X_n-X|^p\\longrightarrow0.$$ For $p=\\infty$ and $X\\in L^\\infty$, construct simple $X_n$ with $\\|X_n-X\\|_\\infty\\to0$. When $0<p<1$, interpret density by the displayed moment-error criterion; do not call the space normed.",
      "The explanatory line of the original handout uses an unmatched exponent $q$. Here the approximation error uses the same fixed exponent $p$ as the assumed finite moment."
    ],
    "hints": [
      "Truncate the variable to a bounded region and quantize values on a dyadic grid. Verify that only finitely many grid values remain.",
      "For finite p use DCT on the powered tail. For p=∞ use the almost-sure bound to eliminate the tail once n is large."
    ],
    "solution": [
      "Choose a finite real-valued representative of $X$ and define $$X_n=2^{-n}\\lfloor2^nX\\rfloor\\mathbf1_{\\{|X|\\le n\\}}.$$ The defining functions are measurable. On $|X|\\le n$, the integer $\\lfloor2^nX\\rfloor$ ranges over a finite set; outside that event the value is zero. Hence $X_n$ is measurable and simple.",
      "For finite $p>0$, on $\\{|X|\\le n\\}$ the error is less than $2^{-n}$, and on its complement $X_n=0$. Consequently $$\\mathbb E|X_n-X|^p\\le2^{-np}+\\mathbb E[|X|^p\\mathbf1_{\\{|X|>n\\}}].$$ The tail integrand tends to zero pointwise and is dominated by integrable $|X|^p$, so DCT makes the second term tend to zero. The first term tends to zero as well. This proves the required density for every finite $p>0$, without using a norm triangle inequality below one.",
      "For $p=\\infty$, let $M=\\|X\\|_\\infty$. As established in part 4, $|X|\\le M$ almost surely. Once $n>M$, truncation removes only a null event and $|X_n-X|<2^{-n}$ almost surely. Therefore $\\|X_n-X\\|_\\infty\\le2^{-n}\\to0$. This is a separate uniform estimate, not an application of the finite-p DCT argument."
    ],
    "checks": [
      "Check measurability and finitely many values.",
      "Keep X∈Lp in the finite-p case.",
      "Use the same fixed exponent p in the tail estimate.",
      "Treat p=∞ separately.",
      "Avoid calling the p<1 quantity a norm."
    ],
    "entries": [
      "1.2.6",
      "1.3.2",
      "1.3.34"
    ],
    "lectures": [
      "l3-s4",
      "l3-s5",
      "l6-s3"
    ]
  }
];
