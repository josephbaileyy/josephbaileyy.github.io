const r = String.raw;
export const entries = [
{n:'1.1.1',type:'Definition',title:'Which sets are events?',page:'7',deps:[],visual:'algebra',
statement:r`We say that $\mathcal F\subseteq 2^\Omega$ is a <em>σ-algebra</em> (or a <em>σ-field</em>) if
<ol type="a"><li>$\Omega\in\mathcal F$.</li><li>If $A\in\mathcal F$, then $A^c\in\mathcal F$, where $A^c=\Omega\setminus A$.</li><li>If $A_i\in\mathcal F$ for $i=1,2,3,\ldots$, then $\bigcup_i A_i\in\mathcal F$.</li></ol>`,
plain:'An event is a question about the outcome that your information can answer. The allowed questions must include “anything happened,” their own negations, and every countable “or.”',
caption:'Select whole blocks of outcomes. The four available events form a σ-algebra. Neither member of a block can be selected alone. On a finite space, a countable union reduces to a finite union of distinct sets; that reduction does not apply to general spaces.',
after:r`<strong>Remark · p. 7.</strong> De Morgan’s law gives $(\bigcup_i A_i^c)^c=\bigcap_i A_i$. Thus, given complements, (c) is equivalent to closure under countable intersections. In particular, $\varnothing=\Omega^c\in\mathcal F$.`,
},
{n:'1.1.2',type:'Definition',title:'Assigning mass to events',page:'8',deps:['1.1.1'],visual:'measure',
statement:r`A pair $(\Omega,\mathcal F)$, with $\mathcal F$ a σ-algebra of subsets of $\Omega$, is a <em>measurable space</em>. A <em>measure</em> on this space is a countably additive non-negative set function $\mu:\mathcal F\to[0,\infty]$ satisfying
<ol type="a"><li>$\mu(A)\geq\mu(\varnothing)=0$ for every $A\in\mathcal F$.</li><li>$\displaystyle\mu\!\left(\bigcup_n A_n\right)=\sum_n\mu(A_n)$ for every countable collection of pairwise disjoint $A_n\in\mathcal F$.</li></ol>
If also $\mu(\Omega)=1$, then $\mu$ is a <em>probability measure</em>, often denoted $\mathbf P$; then $\mathbf P(A)\leq1$ for all $A\in\mathcal F$.`,
plain:'A measure adds the masses of disjoint pieces, including a countable sequence of pieces. A probability measure has exactly one unit of total mass.',
caption:'These four singleton masses define a measure on all subsets. Change the total mass and select an event. Only total mass 1 gives a probability measure. This finite calculation illustrates additivity; the definition also requires countably infinite additivity.',
after:r`<strong>Remark · p. 8.</strong> Requiring (b) only for finite disjoint collections gives a <em>finitely additive non-negative set function</em>. The notes also mention signed measures and call them finite when their range is in $\mathbb R$. This is introductory terminology, not a full signed-measure definition: handling infinite signed values requires further restrictions.`,
},
{n:'1.1.3',type:'Definition',title:'The three parts of a probability space',page:'8',deps:['1.1.1','1.1.2'],visual:'space',
statement:r`A <em>measure space</em> is a triplet $(\Omega,\mathcal F,\mu)$, with $\mu$ a measure on the measurable space $(\Omega,\mathcal F)$. A measure space $(\Omega,\mathcal F,\mathbf P)$ with $\mathbf P$ a probability measure is called a <em>probability space</em>.`,
plain:'Specify the possible outcomes, which sets you can ask about, and how much probability each allowed set receives. These are three different choices.',
caption:'The same four outcomes support a coarse event space or the full event space. The illustrated masses agree on every coarse event. This is a concrete example, not a claim that every measure extends to every larger σ-algebra.',
},
{n:'1.1.4',type:'Exercise',title:'Order, bounds, and limits',page:'8',deps:['1.1.1','1.1.2','1.1.3'],visual:'continuity',
statement:r`Let $(\Omega,\mathcal F,\mathbf P)$ be a probability space and $A,B,A_i\in\mathcal F$. Prove:
<ol type="a"><li><em>Monotonicity.</em> If $A\subseteq B$, then $\mathbf P(A)\leq\mathbf P(B)$.</li><li><em>Sub-additivity.</em> If $A\subseteq\bigcup_i A_i$, then $\mathbf P(A)\leq\sum_i\mathbf P(A_i)$.</li><li><em>Continuity from below.</em> If $A_i\uparrow A$, meaning $A_1\subseteq A_2\subseteq\cdots$ and $\bigcup_i A_i=A$, then $\mathbf P(A_i)\uparrow\mathbf P(A)$.</li><li><em>Continuity from above.</em> If $A_i\downarrow A$, meaning $A_1\supseteq A_2\supseteq\cdots$ and $\bigcap_i A_i=A$, then $\mathbf P(A_i)\downarrow\mathbf P(A)$.</li></ol>Here the indexed unions, intersections, and sums are countable.`,
plain:'Containment orders probabilities. Overlapping covers may overcount. Nested sequences let you exchange a monotone set limit with probability.',
caption:'The upper rows compare nested events and an overlapping cover on four outcomes of equal mass. For the lower plot, take Ω={1,2,…}, ℱ=2^Ω and P(E)=Σₖ∈E 2⁻ᵏ. The geometric series has total 1; nonnegative sums over disjoint sets add, so this satisfies Definition 1.1.2. Here Aₙ={1,…,n} and Cₙ={n+1,…}. A finite slider shows only finitely many stages; the formulas and proof address the infinite limits.',
hints:[r`For (a), split $B$ into $A$ and $B\setminus A$. For (b), remove all earlier sets from each new set.`,r`For (c), write the increasing union as disjoint increments. For (d), take complements and use (c).`],
solution:r`<p>(a) $B=A\,\dot\cup\,(B\setminus A)$, so $\mathbf P(B)=\mathbf P(A)+\mathbf P(B\setminus A)\geq\mathbf P(A)$.</p><p>(b) Put $D_1=A_1$ and $D_n=A_n\setminus\bigcup_{j<n}A_j$. These are measurable, pairwise disjoint, and have the same union as the $A_i$. By (a) and countable additivity, $\mathbf P(A)\leq\sum_n\mathbf P(D_n)\leq\sum_n\mathbf P(A_n)$.</p><p>(c) Put $D_1=A_1$, $D_n=A_n\setminus A_{n-1}$. Then $\mathbf P(A_n)=\sum_{j\leq n}\mathbf P(D_j)\uparrow\sum_j\mathbf P(D_j)=\mathbf P(A)$.</p><p>(d) $A_n^c\uparrow A^c$. Since $\mathbf P(A_n)=1-\mathbf P(A_n^c)$, (c) gives the assertion.</p>`,
after:r`<strong>Remark · p. 8.</strong> (a)–(c) hold for any measure $\mu$. For continuity from above, it suffices that $\mu(A_i)<\infty$ for all sufficiently large $i$. Without finiteness: counting measure on $\mathbb N$ gives $\mu(\{n,n+1,\ldots\})=\infty$ although these sets decrease to $\varnothing$.`,
},
{n:'1.1.5',type:'Exercise',title:'When finite additivity becomes countable',page:'8',deps:['1.1.2','1.1.4'],visual:'tails',
statement:r`Prove that a finitely additive non-negative set function $\mu$ on a measurable space $(\Omega,\mathcal F)$ with the “continuity” property
$$B_n\in\mathcal F,\quad B_n\downarrow\varnothing,\quad\mu(B_n)<\infty\quad\Longrightarrow\quad\mu(B_n)\to0$$
must be countably additive if $\mu(\Omega)<\infty$. Give an example that it is not necessarily so when $\mu(\Omega)=\infty$.`,
plain:'Finite additivity handles the first n pieces. Continuity must make the leftover tail vanish. Finite total mass ensures those tails satisfy the finiteness hypothesis.',
caption:'Advance the cut through a schematic sequence of disjoint sets. The tail is a set, not merely the undrawn portion of the screen. No numerical tail mass is assumed: proving that it tends to zero is exactly the task.',
hints:[r`For disjoint $A_k$, let $A=\bigcup_{k\geq1}A_k$ and $R_n=A\setminus\bigcup_{k\leq n}A_k$.`,r`For the counterexample on $\mathbb N$, try assigning mass 0 to every finite set and ∞ to every infinite set.`],
solution:r`<p>For disjoint measurable $A_k$, set $A=\bigcup_{k\geq1}A_k$ and $R_n=A\setminus\bigcup_{k\leq n}A_k$. Then $R_n\downarrow\varnothing$ and $\mu(R_n)\leq\mu(\Omega)<\infty$. Thus $\mu(R_n)\to0$. Finite additivity gives $\mu(A)=\sum_{k=1}^n\mu(A_k)+\mu(R_n)$; taking limits proves countable additivity.</p><p>On $(\mathbb N,2^{\mathbb N})$, define $\mu(E)=0$ for finite $E$ and $\mu(E)=\infty$ for infinite $E$. This is finitely additive: a finite union is infinite exactly when at least one of its finitely many constituents is infinite. Any sequence in the continuity hypothesis has all its masses equal to 0. Yet $\mu(\mathbb N)=\infty\ne\sum_{k\geq1}\mu(\{k\})=0$.</p>`,
after:r`<strong>Bridge · p. 8.</strong> The trivial σ-algebra is $\mathcal F_0=\{\varnothing,\Omega\}$, with its probability measure forced by $\mathbf P(\varnothing)=0$ and $\mathbf P(\Omega)=1$. A larger event space can allow more choices, subject to the measure axioms.`,
},
{n:'1.1.6',type:'Example',title:'Countable worlds: coins and Poisson masses',page:'8–9',deps:['1.1.2','1.1.3'],visual:'poisson',
statement:r`When $\Omega$ is countable, we can take $\mathcal F=2^\Omega$. Assign $p_\omega>0$ for each $\omega\in\Omega$, with $\sum_{\omega\in\Omega}p_\omega=1$. Then
$$\mathbf P(A)=\sum_{\omega\in A}p_\omega,\qquad A\subseteq\Omega,$$
is a probability measure on $(\Omega,2^\Omega)$. For finite nonempty $\Omega$, the choice $p_\omega=1/|\Omega|$ is the <em>uniform measure</em>.
<p>For one coin toss, $\Omega_1=\{H,T\}$ and $\mathcal F_1=\{\varnothing,\Omega_1,\{H\},\{T\}\}$. For $n$ tosses,</p>
$$\Omega_n=\{(\omega_1,\ldots,\omega_n):\omega_i\in\{H,T\},\ i=1,\ldots,n\},\qquad\mathcal F_n=2^{\Omega_n}.$$
For $\Omega=\{0,1,2,\ldots\}$ and $\mathcal F=2^\Omega$, the <em>Poisson probability measure</em> of parameter $\lambda>0$ has $p_k=e^{-\lambda}\lambda^k/k!$ for $k=0,1,2,\ldots$.`,
plain:'On a countable space, give each outcome a mass, then add the masses in the event. A uniform finite model turns probability into a counting ratio.',
caption:'The coin strip uses uniform mass on four two-toss outcomes; it does not assume any previously defined notion of independence. The Poisson bars show k=0,…,30. The omitted tail is reported, never redistributed among visible bars. Normalization follows from the exponential series, not the plot.',
after:r`<strong>Source notation · pp. 8–9.</strong> The source writes $\mathcal F_1=\{\varnothing,\Omega,H,T\}$, using $H,T$ as shorthand for singleton events. We make those braces explicit. The source construction uses strictly positive weights; nonnegative weights summing to one also work.
<p><strong>Bridge · p. 9.</strong> A probability measure has at most countably many positive-mass singletons: for each integer $m\geq1$, at most $m$ singletons can have mass at least $1/m$. Thus assigning positive mass to every point cannot model a genuinely diffuse uncountable space. The source’s discussion of restricting $2^\Omega$ is motivation, not a theorem that uncountability alone forces non-atomicity or a proper σ-algebra.</p>`,
},
{n:'1.1.7',type:'Definition',title:'No indivisible positive mass',page:'9',deps:['1.1.3','1.1.4'],visual:'nonatomic',
statement:r`A probability space $(\Omega,\mathcal F,\mathbf P)$ is <em>non-atomic</em> (or $\mathbf P$ is non-atomic) if, for every $A\in\mathcal F$, $\mathbf P(A)>0$ implies the existence of $B\in\mathcal F$, $B\subset A$, such that $0<\mathbf P(B)<\mathbf P(A)$.`,
plain:'Every measurable piece with positive probability can be split into two measurable pieces that both have positive probability. No positive piece is indivisible.',
caption:'The bar represents the mass of an arbitrary positive event A; its movable split is a schematic of the required inequality. It does not construct a measure on an interval or prove that every split fraction is attainable. The definition only promises some split; the next exercise proves much more.',
after:r`A positive-mass singleton in a countable full event space cannot be split this way. Conversely, on a general event space, absence of positive-mass singletons by itself should not be used as a substitute for this definition.`,
},
{n:'1.1.8',type:'Exercise',title:'From some split to any prescribed mass',page:'9',deps:['1.1.4','1.1.7'],visual:'target',
statement:r`Suppose $\mathbf P$ is non-atomic and $A\in\mathcal F$ with $\mathbf P(A)>0$.
<ol type="a"><li>Show that for every $\epsilon>0$ there is $B\subseteq A$ with $0<\mathbf P(B)<\epsilon$.</li><li>Prove that if $0<a<\mathbf P(A)$, then there exists $B\subset A$ with $\mathbf P(B)=a$.</li></ol>`,
plain:'First find arbitrarily small positive pieces. Then accumulate pieces without exceeding a target, using continuity to reach that target exactly.',
caption:'The shrinking-piece diagram tracks the bound obtained by repeatedly keeping the smaller positive piece. Its labels are upper bounds, not an assumption of equal splits. The target map names the sets used in the proof; no finite number of drawn pieces establishes exact attainment.',
hints:[r`(a) Split a positive set and retain the smaller of the two positive pieces; its mass is at most half the previous mass.`,r`(b) At each stage take a piece whose mass is at least half the supremum of all currently admissible piece masses. Use continuity from below.`,r`<strong>Source hint, with indexing made explicit:</strong> Choose $0<\epsilon_n<1$, $\epsilon_n\downarrow0$. For $n\geq1$, let $H_n=\bigcup_{1\leq k<n}G_k$ (so $H_1=\varnothing$),
$$x_n=\sup\{\mathbf P(G):G\in\mathcal F,\ G\subseteq A\setminus H_n,\ \mathbf P(H_n\cup G)\leq a\},$$
and choose $G_n\subseteq A\setminus H_n$, $G_n\in\mathcal F$, with $\mathbf P(H_n\cup G_n)\leq a$ and $\mathbf P(G_n)\geq(1-\epsilon_n)x_n$. Consider $B=\bigcup_{n\geq1}G_n$. The printed hint gives $H_0=\varnothing$ but does not fix the starting index; this consistent indexing is an editorial clarification.`],
solution:r`<p>(a) If a positive set has mass $m$, non-atomicity splits it into two measurable pieces of positive mass. Keep one with mass at most $m/2$. Repeating finitely many times gives a positive subset of $A$ with mass at most $2^{-j}\mathbf P(A)<\epsilon$ for sufficiently large $j$.</p><p>(b) Start with $H_1=\varnothing$. With $x_n$ defined in the hint, choose an admissible $G_n$ with $\mathbf P(G_n)\geq x_n/2$ (choose $\varnothing$ if $x_n=0$), and put $H_{n+1}=H_n\cup G_n$. The $G_n$ are disjoint and $\mathbf P(H_n)\leq a$. Hence $B=\bigcup_nG_n\subseteq A$ has $b=\mathbf P(B)\leq a$ by continuity from below.</p><p>If $b<a$, then $\mathbf P(A\setminus B)=\mathbf P(A)-b>0$. By (a) choose measurable $C\subseteq A\setminus B$ with $0<c=\mathbf P(C)<a-b$. For every $n$, $C$ is admissible at stage $n$, since $\mathbf P(H_n)+c\leq b+c<a$. Thus $x_n\geq c$ and $\mathbf P(G_n)\geq c/2$ for every $n$, contradicting $\sum_n\mathbf P(G_n)=b\leq a$. Therefore $b=a$. Because $a<\mathbf P(A)$, $B$ is a proper subset of $A$.</p>`,
after:r`<strong>Source convention.</strong> The printed problem does not explicitly repeat $B\in\mathcal F$. It is implicit wherever $\mathbf P(B)$ appears, and required in both parts. The proof above uses a fixed one-half approximation to the supremum; the source hint uses improving factors $1-\epsilon_n$.`,
},
{n:'1.1.9',type:'Exercise',title:'Adding measures',page:'9',deps:['1.1.2'],visual:'mixture',
statement:r`Given any measures $\{\mu_n:n\geq1\}$ on $(\Omega,\mathcal F)$, verify that $\mu=\sum_{n=1}^{\infty}c_n\mu_n$ is also a measure on this space for any finite constants $c_n\geq0$.`,
plain:'Scale measures by nonnegative finite numbers and add them, even countably many. The result can have infinite total mass, and need not be a probability measure.',
caption:'Two measures on the same four outcomes are combined. Bar heights are masses, not automatically probabilities. The finite display illustrates the operation; the countable proof depends on reordering a nonnegative double series.',
hints:[r`Check $\mu(\varnothing)=0$. For disjoint $A_k$, expand each $\mu_n(\bigcup_k A_k)$.`,r`A double series of nonnegative terms has the same value in either order, even when that value is ∞. Prove this from suprema of finite sums.`],
solution:r`For $A\in\mathcal F$, define $\mu(A)=\sum_n c_n\mu_n(A)$, with $0\cdot\infty=0$. Then $\mu$ is nonnegative and $\mu(\varnothing)=0$. For disjoint $A_k$,
$$\mu\!\left(\bigcup_k A_k\right)=\sum_n\sum_k c_n\mu_n(A_k)=\sum_k\sum_n c_n\mu_n(A_k)=\sum_k\mu(A_k).$$
Both iterated sums equal the supremum of sums over finite rectangles of indices, so the interchange is valid without any later integration theorem.`,
after:r`<strong>Bridge · p. 9.</strong> In particular, finite nonnegative combinations make the collection of measures a convex cone. “Finite constants” restricts each $c_n$, not the number of terms or the total mass. The convention $0\cdot\infty=0$ makes zero coefficients unambiguous.`,
},
{n:'1.1.10',type:'Exercise',title:'Distance as the mass of disagreement',page:'9',deps:['1.1.1','1.1.4'],visual:'distance',
statement:r`A function $d:\mathcal X\times\mathcal X\to[0,\infty)$ is called a <em>semi-metric</em> on $\mathcal X$ if $d(x,x)=0$, $d(x,y)=d(y,x)$, and $d(x,z)\leq d(x,y)+d(y,z)$ for all $x,y,z\in\mathcal X$. With
$$A\mathbin\Delta B=(A\cap B^c)\cup(A^c\cap B),$$
show that for every probability space $(\Omega,\mathcal F,\mathbf P)$, $d(A,B)=\mathbf P(A\mathbin\Delta B)$ is a semi-metric on $\mathcal F$.`,
plain:'Two events are close if they disagree only on outcomes with small total probability. Different events can have distance zero.',
caption:'Toggle membership in A, B, and C. The fourth outcome has zero mass, so changing only that outcome can leave the distance zero. Every A–C disagreement occurs in an A–B or B–C disagreement; the example illustrates that set inclusion rather than proving it by enumeration for general spaces.',
hints:[r`Which outcomes belong to $A\Delta A$? Does exchanging A and B change their symmetric difference?`,r`Show $A\Delta C\subseteq(A\Delta B)\cup(B\Delta C)$, then apply 1.1.4.`],
solution:r`All symmetric differences are measurable by closure under complements and finite unions/intersections. Their probabilities lie in $[0,1]$. Since $A\Delta A=\varnothing$ and $A\Delta B=B\Delta A$, the diagonal and symmetry properties follow. If membership in $A$ and $C$ differs, membership in $B$ must differ from one of them. Thus $A\Delta C\subseteq(A\Delta B)\cup(B\Delta C)$; monotonicity and sub-additivity give the triangle inequality. Distinct sets differing only by a null set can have distance zero, which is permitted by the definition.`,
},
{n:'1.1.11',type:'Exercise',title:'Overlaps of zero probability',page:'9',deps:['1.1.2','1.1.4'],visual:'almost',
statement:r`Consider events $\{A_n\}_{n\geq1}$ in a probability space $(\Omega,\mathcal F,\mathbf P)$ that are <em>almost disjoint</em>, in the sense that $\mathbf P(A_n\cap A_m)=0$ for every $n\ne m$. Show that
$$\mathbf P\!\left(\bigcup_{n=1}^{\infty}A_n\right)=\sum_{n=1}^{\infty}\mathbf P(A_n).$$`,
plain:'The sets can literally overlap. If all pairwise overlaps have probability zero, removing the overlaps costs no probability.',
caption:'The three events share an outcome z. Initially z has mass zero, so the events are almost disjoint. Give z positive mass to violate the hypothesis and watch the sum overcount the union. The general statement is countable, not just a claim about these three events.',
hints:[r`Replace $A_n$ by $D_n=A_n\setminus\bigcup_{j<n}A_j$. These sets are disjoint and have the same union.`,r`Use sub-additivity on the removed part $A_n\cap\bigcup_{j<n}A_j$ to show its probability is zero.`],
solution:r`Let $D_n=A_n\setminus\bigcup_{j<n}A_j$. Then $D_n\in\mathcal F$, they are pairwise disjoint, and $\bigcup_nD_n=\bigcup_nA_n$. Moreover,
$$\mathbf P(A_n\setminus D_n)\leq\sum_{j<n}\mathbf P(A_n\cap A_j)=0.$$
Finite additivity yields $\mathbf P(D_n)=\mathbf P(A_n)$. Applying countable additivity to $D_n$ proves the identity. The finite display cannot replace this countable argument.`,
},
{n:'1.1.12',type:'Exercise',title:'An even Poisson outcome',page:'10',deps:['1.1.6'],visual:'even',
statement:r`Suppose a random outcome $N$ follows the Poisson probability measure of parameter $\lambda>0$. Find a simple expression for the probability that $N$ is an even integer.`,
plain:'Collect the masses at 0, 2, 4, … . Look for an algebraic way to keep the even terms of an exponential series.',
caption:'Even bars are highlighted, including zero. The display sums only k≤30 and reports the missing total tail as an error bound for the displayed even sum. The closed-form answer remains hidden in the solution; the plot alone cannot identify or prove it.',
hints:[r`Write the event as $\{0,2,4,\ldots\}$ and sum its singleton probabilities.`,r`Compare the series for $e^\lambda$ and $e^{-\lambda}$. Adding them cancels the odd powers.`],
solution:r`By the countable construction in 1.1.6,
$$\mathbf P(N\text{ even})=e^{-\lambda}\sum_{j=0}^{\infty}\frac{\lambda^{2j}}{(2j)!}=e^{-\lambda}\frac{e^{\lambda}+e^{-\lambda}}{2}=\frac{1+e^{-2\lambda}}2.$$
The exponential series converge absolutely, so adding them term by term is valid. The value tends to 1 as $\lambda\downarrow0$ and to $1/2$ as $\lambda\to\infty$.`,
}
];
