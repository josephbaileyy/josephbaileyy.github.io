const r = String.raw;
export const entries = [
{n:'1.3.13',type:'Theorem',title:'Pay for an event with a nonnegative function',page:'35',deps:['1.3.1','1.3.9'],visual:'ineq-markov',
statement:r`<strong>Markov’s inequality.</strong> Suppose $\psi:\mathbb R\to[0,\infty]$ is Borel measurable and put $\psi_*(A)=\inf\{\psi(y):y\in A\}$ for $A\in\mathcal B$. For any real random variable $X$,
$$\psi_*(A)\mathbf P(X\in A)\leq\mathbf E[\psi(X)\mathbf1_{\{X\in A\}}]\leq\mathbf E\psi(X).$$`,
plain:'If every outcome in an event costs at least a fixed amount, its probability times that price cannot exceed the total expected cost. The middle term keeps only the cost paid inside the event.',
caption:'This exact four-atom law has masses 0.4, 0.3, 0.2, 0.1 at 0, 1, 2, 4. Choose A=[a,∞) and ψ(x)=x⁺. The bars compare the three quantities in the theorem; the atom diagram includes boundary atoms. A finite example illustrates the pointwise proof, not all Borel functions or events.',
proof:r`Pointwise, $\psi_*(A)\mathbf1_A(x)\leq\psi(x)\mathbf1_A(x)\leq\psi(x)$. Substitute $x=X(\omega)$ and apply monotonicity and the expectation of a constant times an indicator. All three terms are nonnegative, so infinite expectations are permitted.`,
after:r`Use the nonnegative-integral convention $0\cdot\infty=0$, including when $A=\varnothing$ and $\inf\varnothing=\infty$. Dividing to obtain a probability bound requires $0<\psi_*(A)<\infty$; the undivided theorem remains meaningful in the other cases.`,
},
{n:'1.3.14',type:'Example',title:'Tail bounds from means, squares, and exponentials',page:'35–36',deps:['1.3.2','1.3.13'],visual:'ineq-tails',
statement:r`Three choices in Markov’s inequality give:
<ol type="a"><li>For $a>0$, $\mathbf P(X\geq a)\leq\mathbf EX^+/a$; if $X\geq0$, the numerator is $\mathbf EX$.</li><li>For $a>0$ and $q>0$, $a^q\mathbf P(|X|\geq a)\leq\mathbf E|X|^q$. Taking $X=Y-\mathbf EY$ with $Y\in L^2$ gives <em>Chebyshev’s inequality</em>, $$\mathbf P(|Y-\mathbf EY|\geq a)\leq\frac{\operatorname{Var}(Y)}{a^2}.$$</li><li>For $\theta>0$ and $a\in\mathbb R$, $$\mathbf P(X\geq a)\leq e^{-\theta a}\mathbf Ee^{\theta X}.$$</li></ol>`,
plain:'A mean limits how much mass can be far to the right. A second centered moment controls distance in either direction. An exponential moment makes large values much more expensive, sometimes giving a sharper right-tail bound.',
caption:'The same finite law as 1.3.13 is used throughout. Mean and exponential bounds concern X≥a; Chebyshev concerns |X−EX|≥a, a different event. Raw bounds are shown even when above 1; cap them at 1 for a probability estimate. All sums are exact up to floating-point arithmetic; no tail is truncated.',
proof:r`Use $\psi(x)=x^+$ on $[a,\infty)$, $\psi(x)=|x|^q$ on $(-\infty,-a]\cup[a,\infty)$, and $\psi(x)=e^{\theta x}$ on $[a,\infty)$, respectively. Their infima are $a$, $a^q$, and $e^{\theta a}$.`,
after:r`The source later defines moments and variance at Definition 1.3.67. Here $\operatorname{Var}(Y):=\mathbf E(Y-\mathbf EY)^2$ and $Y\in L^2$ imply the needed finite mean. An infinite moment leaves a valid but uninformative bound. The exponential bound decays with $a$ for each fixed $\theta>0$ having a finite exponential moment.`,
},
{n:'1.3.15',type:'Proposition',title:'A convex curve lies above its supporting line',page:'36',deps:['1.3.9'],visual:'ineq-jensen',
statement:r`<strong>Jensen’s inequality.</strong> Let $g:G\to\mathbb R$ be convex on an open interval $G\subseteq\mathbb R$, meaning
$$g(\lambda x+(1-\lambda)y)\leq\lambda g(x)+(1-\lambda)g(y),\quad x,y\in G,\quad0\leq\lambda\leq1.$$
If $X$ is integrable, $\mathbf P(X\in G)=1$, and $g(X)$ is integrable, then
$$g(\mathbf EX)\leq\mathbf E g(X).$$`,
plain:'Averaging first places you on the convex curve below the average height. A supporting line at the mean explains why: its linear part averages to zero.',
caption:'For g(x)=x², X takes −1 and 2 with adjustable probabilities. The chord gives Eg(X), the curve gives g(EX), and the tangent supports the whole curve. This exact two-point example is the defining convexity inequality; the supporting-line proof also covers non-discrete laws and convex functions with corners.',
proof:r`Put $c=\mathbf EX$. Because $G$ is an open interval and $X\in G$ almost surely, integrability gives $c\in G$: any finite endpoint is a strict bound on the mean, since a positive integrable distance from that endpoint has positive expectation. Secant slopes of a convex function obey
$$\sup_{h>0,\ c-h\in G}\frac{g(c)-g(c-h)}h\ \leq\ \inf_{h>0,\ c+h\in G}\frac{g(c+h)-g(c)}h.$$
Both sides are finite at an interior point. Choose any slope $b$ between them. Then $g(x)\geq g(c)+b(x-c)$ throughout $G$. Convexity also implies continuity on $G$, hence measurability. Taking expectations gives $\mathbf Eg(X)\geq g(c)+b(\mathbf EX-c)=g(c)$.`,
after:r`For concave $g$, apply this result to $-g$ and reverse the inequality. Values of $g(X)$ outside the almost sure event $\{X\in G\}$ can be defined arbitrarily. The displayed hypotheses retain the source’s integrability assumptions.`,
},
{n:'1.3.16',type:'Lemma',title:'Higher moments magnify rare large values',page:'37',deps:['1.3.1','1.3.2','1.3.4','1.3.15'],visual:'ineq-norms',
statement:r`For a measurable $Y$, the extended-valued quantity $\|Y\|_q=(\mathbf E|Y|^q)^{1/q}$ is non-decreasing in $q>0$. For $0<r\leq q$, $\|Y\|_r\leq\|Y\|_q$. Consequently, for the spaces of Definition 1.3.2 and $1\leq r\leq q$,
$$L^q(\Omega,\mathcal F,\mathbf P)\subseteq L^r(\Omega,\mathcal F,\mathbf P).$$`,
plain:'Larger powers put greater weight on unusually large values. On a probability space, taking the corresponding root still leaves a quantity that cannot decrease as the power rises.',
caption:'Y is 5 with probability p and zero otherwise, so ||Y||q=5p^(1/q). The curve samples q from 0.25 to 6 and marks r≤q. Values are evaluated from the exact finite-law formula; the drawn curve is sampled. For exponents below 1 this quantity need not be a norm. The finite example cannot demonstrate a strict inclusion of spaces.',
proof:r`For $q>r>0$, set $Z_n=\min(|Y|,n)^r$. The variables $Z_n$ and $Z_n^{q/r}$ are bounded, so Jensen with the convex function $g(x)=|x|^{q/r}$ on $\mathbb R$ yields
$$(\mathbf E Z_n)^{q/r}\leq\mathbf E\min(|Y|,n)^q\leq\mathbf E|Y|^q.$$
By the definition of the nonnegative integral, $\mathbf E Z_n\uparrow\mathbf E|Y|^r$: every bounded nonnegative simple $h\leq|Y|^r$ satisfies $h\leq Z_n$ once $n^r\geq\|h\|_\infty$. Taking the supremum over these $h$ proves the assertion directly; restricting to bounded simple functions gives the same supremum, because any infinite simple heights can first be truncated. Now take the $q$th root.`,
after:r`The source invokes the monotone convergence theorem already stated in 1.3.4, whose source proof is deferred to subsection 1.3.3. The proof here also obtains this particular truncation limit directly from Definition 1.3.1. Probability mass 1 matters: for a finite measure of mass $M>0$, the comparison instead has the factor $M^{1/r-1/q}$.`,
},
{n:'1.3.17',type:'Proposition',title:'Bound a product without independence',page:'37',deps:['1.3.2','1.3.9'],visual:'ineq-holder',
statement:r`<strong>Hölder’s inequality.</strong> For random variables $X,Y$ on the same probability space and $p,q>1$ with $1/p+1/q=1$,
$$\mathbf E|XY|\leq\|X\|_p\|Y\|_q.$$
For $p=q=2$ this is the <em>Cauchy–Schwarz inequality</em>,
$$\mathbf E|XY|\leq(\mathbf EX^2)^{1/2}(\mathbf EY^2)^{1/2}.$$`,
plain:'The sizes of X and Y separately control their product even when their large values occur together. Normalizing their moments reduces the argument to a pointwise inequality between numbers.',
caption:'Four equally likely outcomes carry X=(0.5,1,2,3). The control moves Y from the equality profile X^(p−1) to its reversed order. The normalized table shows Young’s inequality at every outcome; their average proves the displayed product bound for this finite law. No independence assumption is made or simulated.',
proof:r`If either norm is zero, its variable is zero almost surely and the product is zero almost surely. If both norms are positive and one is infinite, the inequality is immediate. Otherwise put $U=|X|/\|X\|_p$ and $V=|Y|/\|Y\|_q$. Young’s inequality $uv\leq u^p/p+v^q/q$ for $u,v\geq0$ follows by minimizing the right side minus $uv$ in $u$; its derivative vanishes at $u^{p-1}=v$ and the minimum is zero. Thus
$$\frac{\mathbf E|XY|}{\|X\|_p\|Y\|_q}\leq\frac{\mathbf EU^p}p+\frac{\mathbf EV^q}q=\frac1p+\frac1q=1.$$`,
after:r`Use $0\cdot\infty=0$ in the zero-norm case. When $XY$ is integrable, $|\mathbf E(XY)|\leq\mathbf E|XY|$ as well. Hölder holds for arbitrary measures with the same proof.`,
},
{n:'1.3.18',type:'Proposition',title:'Adding variables obeys a triangle inequality',page:'37–38',deps:['1.3.15','1.3.17'],visual:'ineq-minkowski',
statement:r`<strong>Minkowski’s inequality.</strong> If $X,Y\in L^p(\Omega,\mathcal F,\mathbf P)$ with $p\geq1$, then
$$\|X+Y\|_p\leq\|X\|_p+\|Y\|_p.$$`,
plain:'The size of a sum cannot exceed the sum of the sizes. Matching signs and proportional values can give equality; cancellation can make the sum much smaller.',
caption:'On two equally likely outcomes, X=(1,0.4) and Y=1.2(cos θ,sin θ). Arrows show the value vectors and their sum; the bars use probability-weighted Lᵖ norms. Euclidean arrow lengths agree with these norms only up to the factor 1/√2 when p=2. Computation is exact for the finite model up to numerical rounding.',
proof:r`For $p=1$, integrate $|X+Y|\leq|X|+|Y|$. For $p>1$, first use convexity to obtain $|x+y|^p\leq2^{p-1}(|x|^p+|y|^p)$, so $A=\mathbf E|X+Y|^p<\infty$. With $q=p/(p-1)$, Hölder gives
$$A\leq\mathbf E(|X||X+Y|^{p-1})+\mathbf E(|Y||X+Y|^{p-1})\leq(\|X\|_p+\|Y\|_p)A^{1/q}.$$
If $A=0$ there is nothing to prove. Otherwise divide by $A^{1/q}$ and use $1-1/q=1/p$.`,
after:r`Hölder and Minkowski also hold for general measures. The unnormalized Jensen formula $g(\int X\,d\mu)\leq\int g(X)\,d\mu$ is a probability-measure statement; a finite nonzero measure must first be normalized.`,
},
{n:'1.3.19',type:'Exercise',title:'An asymmetric interval captures at least half the mass',page:'38',deps:['1.3.14'],visual:'ineq-half-mass',
statement:r`Let $X$ be a nonnegative random variable with $\operatorname{Var}(X)\leq1/2$. Show that
$$\mathbf P(-1+\mathbf EX\leq X\leq2\mathbf EX)\geq\tfrac12.$$`,
plain:'The interval changes character when the mean passes 1. Below that point nonnegativity makes its lower endpoint harmless; above it the interval contains the whole radius-one neighborhood of the mean.',
caption:'The exact two-atom family X=c+√2 B, with P(B=1)=p, always has variance 2p(1−p)≤1/2. Move c and p to see the interval [EX−1,2EX] and its included atoms. The computed probabilities verify this family only; the hidden solution supplies the general case split.',
hints:[r`Write $m=\mathbf EX$ and separate $m\leq1$ from $m>1$. Treat $m=0$ first.`,r`For $0<m\leq1$, the lower endpoint $m-1$ is nonpositive. For $m>1$, compare $[m-1,2m]$ with $[m-1,m+1]$. Apply Markov in the first case and Chebyshev in the second.`],
solution:r`Let $m=\mathbf EX$, which is finite under the stated finite-variance assumption. If $m=0$, nonnegativity gives $X=0$ almost surely. If $0<m\leq1$, then $X\geq m-1$ almost surely and Markov gives $\mathbf P(X>2m)\leq\mathbf P(X\geq2m)\leq1/2$, so the claimed interval has probability at least $1/2$. If $m>1$, then $m+1\leq2m$, and Chebyshev gives $\mathbf P(|X-m|>1)\leq\operatorname{Var}(X)\leq1/2$. The complement of the requested closed interval is contained in $\{|X-m|>1\}$, completing the proof.`,
},
{n:'1.3.20',type:'Exercise',title:'A supporting plane gives vector Jensen',page:'38',deps:['1.2.19','1.3.9','1.3.15'],visual:'ineq-vector-jensen',
statement:r`Suppose $g:\mathbb R^n\to\mathbb R$ is convex and $X_1,\ldots,X_n$ are integrable random variables on the same probability space, with $g(X_1,\ldots,X_n)$ integrable. Show that
$$\mathbf E g(X_1,\ldots,X_n)\geq g(\mathbf EX_1,\ldots,\mathbf EX_n).$$`,
plain:'A supporting line becomes a supporting plane in several dimensions. Each centered coordinate has mean zero, so the plane’s entire linear part disappears on averaging.',
caption:'For g(x₁,x₂)=x₁²+x₂², three domain points have masses p,(1−p)/2,(1−p)/2. Concentric contours show levels of g; the gold point is their weighted mean. The bars compare the exact finite expectations. This two-dimensional quadratic example illustrates, but does not prove, the claim for all convex functions and dimensions.',
hints:[r`The source suggests the convex-analysis fact: a finite convex function on $\mathbb R^n$ is continuous, and at each $c$ it has a supporting affine function $g(x)\geq g(c)+\langle b,x-c\rangle$.`,r`Choose $c=(\mathbf EX_1,\ldots,\mathbf EX_n)$. Take expectations of the supporting inequality coordinate by coordinate; no independence is needed.`],
solution:r`A finite convex function on all of $\mathbb R^n$ is continuous and has a subgradient at each point, by the supporting-hyperplane theorem for its epigraph. Use this convex-analysis result (as invited by the source hint) at $c=\mathbf EX$, obtaining $b\in\mathbb R^n$ with $g(x)\geq g(c)+\sum_i b_i(x_i-c_i)$. Continuity ensures measurability of $g(X)$, and all terms are integrable by hypothesis. Linearity and monotonicity give $\mathbf Eg(X)\geq g(c)+\sum_i b_i(\mathbf EX_i-c_i)=g(c)$. This proof uses an explicitly identified convex-analysis fact, not numerical evidence from the diagram.`,
},
{n:'1.3.21',type:'Exercise',title:'Second moments also force mass to exist',page:'38',deps:['1.1.4','1.3.9','1.3.16','1.3.17'],visual:'ineq-second-moment',
statement:r`Let $Y\geq0$ with $v=\mathbf E(Y^2)<\infty$.
<ol type="a"><li>For $0\leq a<\mathbf EY$, prove $$\mathbf P(Y>a)\geq\frac{(\mathbf EY-a)^2}{\mathbf E(Y^2)}.$$</li><li>Show $$(\mathbf E|Y^2-v|)^2\leq4v\bigl(v-(\mathbf EY)^2\bigr).$$</li><li>Derive the second Bonferroni inequality $$\mathbf P\!\left(\bigcup_{i=1}^n A_i\right)\geq\sum_{i=1}^n\mathbf P(A_i)-\sum_{1\leq j<i\leq n}\mathbf P(A_i\cap A_j).$$ How does it compare with part (a) applied to $Y=\sum_{i=1}^n\mathbf1_{A_i}$?</li></ol>`,
plain:'A positive mean cannot be carried by an arbitrarily tiny event when the second moment is controlled. Counting how many events occur connects this principle to a lower bound for their union.',
caption:'The model counts three independent Bernoulli(p) events, so Y has four exact binomial masses. Set a as a fraction of EY; the strict event Y>a is respected at integer thresholds. Bars compare the union probability, the second-moment bound at a=0, and Bonferroni. Independence specifies this illustrative family only; none of the exercise claims requires it.',
hints:[r`(a) Split $\mathbf EY$ over $\{Y\leq a\}$ and $\{Y>a\}$, bound the first term by $a$, and apply Cauchy–Schwarz to $Y\mathbf1_{\{Y>a\}}$.`,r`(b) Factor $|Y^2-v|=|Y-\sqrt v|(Y+\sqrt v)$ and apply Cauchy–Schwarz. (c) If $N$ events occur, compare $\mathbf1_{\{N>0\}}$ with $N-\binom N2$ pointwise.`,r`For the comparison in (c), write $s=\sum_i\mathbf P(A_i)$ and $t=\sum_{j<i}\mathbf P(A_i\cap A_j)$. Then $\mathbf EY^2=s+2t$. Compare $s-t$ with $s^2/(s+2t)$ when $s>0$.`],
solution:r`<p><strong>(a).</strong> Put $m=\mathbf EY$. Cauchy–Schwarz implies $m<\infty$. For $0\leq a<m$, necessarily $v>0$, and
$$m\leq a+\mathbf E[Y\mathbf1_{\{Y>a\}}]\leq a+\sqrt{v\mathbf P(Y>a)}.$$
Rearrange and square.</p><p><strong>(b).</strong> If $v=0$, then $Y=0$ almost surely and both sides vanish. Otherwise, Cauchy–Schwarz and the factorization in the hint give
$$(\mathbf E|Y^2-v|)^2\leq\mathbf E(Y-\sqrt v)^2\,\mathbf E(Y+\sqrt v)^2=(2v-2\sqrt v\,m)(2v+2\sqrt v\,m)=4v(v-m^2).$$</p><p><strong>(c).</strong> For every integer $k\geq0$, $\mathbf1_{\{k>0\}}\geq k-k(k-1)/2$: equality holds for $k=0,1,2$, and the right side is nonpositive for $k\geq3$. Set $k=Y=\sum_i\mathbf1_{A_i}$ and take expectations to obtain Bonferroni. For $s=\mathbf EY>0$, part (a) at $a=0$ gives the other lower bound $s^2/(s+2t)$, where $t=\sum_{j<i}\mathbf P(A_i\cap A_j)$. Their difference is
$$(s-t)-\frac{s^2}{s+2t}=\frac{t(s-2t)}{s+2t}.$$
Thus Bonferroni is stronger when $s>2t$ and $t>0$, while the second-moment bound is stronger when $s<2t$ and $t>0$. They agree when $t=0$ or $s=2t$. For three independent events of probability $p$, these regimes are $p<1/2$ and $p>1/2$, respectively. If $s=0$, the union is null and no division is needed.</p>`,
},
];
