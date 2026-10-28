// Added schematics, not reproductions of the handwritten page images.
// The HTML and package-free LaTeX exports show the same mathematical operation.
const svg=(key,title,description,body)=>`<svg viewBox="0 0 480 215" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${key}-title ${key}-desc" style="display:block;width:100%;height:auto;font:14px Georgia,serif"><title id="${key}-title">${title}</title><desc id="${key}-desc">${description}</desc>${body}</svg>`;
const figure=(key,title,description,body,caption)=>`<figure class="lecture-diagram">${svg(key,title,description,body)}<figcaption>${caption}</figcaption></figure>`;
const picture=(height,body)=>String.raw`\begingroup
\setlength{\unitlength}{1pt}
\begin{center}
\begin{picture}(400,${height})
${body}
\end{picture}
\end{center}
\endgroup`;
const diagrams={
 'product-rectangle':{
  html:figure('lecture-product-rectangle','A rectangle and a coordinate strip','The left panel restricts both coordinates to A1 and A2. The right panel restricts only the first coordinate, leaving the second coordinate unrestricted.',`
   <g fill="none" stroke="#53645b" stroke-width="1.5">
    <path d="M35 170H215M50 185V25M265 170H455M280 185V25"/>
    <rect x="85" y="65" width="80" height="65" fill="#dcead8" stroke="#386b32"/>
    <rect x="315" y="25" width="80" height="160" fill="#e1eaf3" stroke="#1b4f7a" stroke-dasharray="5 3"/>
   </g>
   <g fill="#233b2d" text-anchor="middle">
    <text x="125" y="57">A₁ × A₂</text><text x="125" y="153">A₁</text>
    <text x="28" y="104">A₂</text><text x="210" y="190">x₁</text><text x="33" y="25">x₂</text>
    <text x="355" y="101">A₁ × ℝ</text><text x="355" y="153">A₁</text>
    <text x="450" y="190">x₁</text><text x="263" y="25">x₂</text>
    <text x="355" y="18" font-size="12">all second-coordinate values</text>
   </g>`,
   'Added schematic for interval examples in ℝ²: a rectangle restricts both coordinates. The strip A₁ × ℝ records only first-coordinate membership; it continues beyond the displayed window.'),
  tex:picture(180,String.raw`
\put(15,30){\line(1,0){165}}\put(30,15){\line(0,1){140}}
\put(60,65){\framebox(70,60){$A_1\times A_2$}}
\put(60,40){\makebox(70,14){$A_1$}}\put(0,87){\makebox(27,14){$A_2$}}
\put(163,12){$x_1$}\put(14,155){$x_2$}
\put(215,30){\line(1,0){170}}\put(230,15){\line(0,1){140}}
\put(260,15){\line(0,1){140}}\put(330,15){\line(0,1){140}}
\put(260,90){\makebox(70,14){$A_1\times\mathbb R$}}
\put(260,40){\makebox(70,14){$A_1$}}\put(370,12){$x_1$}\put(214,155){$x_2$}
\put(249,160){\makebox(95,12){\scriptsize unrestricted second coordinate}}
`)+String.raw`\begin{center}\small Added schematic for interval examples in $\mathbb R^2$: the rectangle restricts both coordinates; the strip $A_1\times\mathbb R$ continues beyond the displayed window.\end{center}`
 },
 'common-refinement':{
  html:figure('lecture-common-refinement','Common refinement by membership in two sets','Rows record membership in B and columns record membership in A. The four disjoint cells are A intersection B, B minus A, A minus B, and the complement of A union B.',`
   <text x="240" y="18" text-anchor="middle" fill="#233b2d">Refine by both membership questions</text>
   <g fill="#233b2d" text-anchor="middle"><text x="195" y="44">in A</text><text x="335" y="44">outside A</text>
    <text x="65" y="98">in B</text><text x="65" y="164">outside B</text></g>
   <g stroke="#6c786f" stroke-width="1.3">
    <rect x="125" y="57" width="140" height="65" fill="#dcead8"/>
    <rect x="265" y="57" width="140" height="65" fill="#e2ebf2"/>
    <rect x="125" y="122" width="140" height="65" fill="#f4e5cf"/>
    <rect x="265" y="122" width="140" height="65" fill="#f3f1e9"/>
   </g>
   <g fill="#233b2d" text-anchor="middle"><text x="195" y="96">A ∩ B</text><text x="335" y="96">B ∖ A</text>
    <text x="195" y="161">A ∖ B</text><text x="335" y="161">(A ∪ B)ᶜ</text></g>`,
   'Added schematic: every outcome belongs to exactly one membership cell. Splitting both set descriptions into these same disjoint cells makes their weighted sums comparable.'),
  tex:picture(172,String.raw`
\put(90,150){\makebox(120,14){in $A$}}\put(210,150){\makebox(120,14){outside $A$}}
\put(3,109){\makebox(80,14){in $B$}}\put(3,49){\makebox(80,14){outside $B$}}
\put(90,90){\framebox(120,60){$A\cap B$}}\put(210,90){\framebox(120,60){$B\setminus A$}}
\put(90,30){\framebox(120,60){$A\setminus B$}}\put(210,30){\framebox(120,60){$(A\cup B)^c$}}
`)+String.raw`\begin{center}\small Added schematic: the four disjoint membership cells partition the whole space. Refining both descriptions into these cells permits comparison of their weighted sums.\end{center}`
 },
 'typewriter':{
  html:figure('lecture-typewriter','Typewriter supports at three resolutions','Rows k equals one, two, and four each partition the interval from zero to one into k half-open intervals. One interval per row is highlighted. Their lengths are respectively one, one half, and one quarter.',`
   <g fill="#233b2d" text-anchor="middle"><text x="73" y="36">row k</text><text x="420" y="36">active length</text></g>
   <g stroke="#53645b" stroke-width="1.3">
    <rect x="125" y="55" width="240" height="28" fill="#dcead8"/>
    <rect x="125" y="105" width="120" height="28" fill="#faf9f2"/><rect x="245" y="105" width="120" height="28" fill="#dcead8"/>
    <rect x="125" y="155" width="60" height="28" fill="#faf9f2"/><rect x="185" y="155" width="60" height="28" fill="#faf9f2"/>
    <rect x="245" y="155" width="60" height="28" fill="#dcead8"/><rect x="305" y="155" width="60" height="28" fill="#faf9f2"/>
   </g>
   <g fill="#233b2d" text-anchor="middle"><text x="73" y="75">1</text><text x="73" y="125">2</text><text x="73" y="175">4</text>
    <text x="420" y="75">1</text><text x="420" y="125">1/2</text><text x="420" y="175">1/4</text>
    <text x="125" y="204">0</text><text x="365" y="204">1</text></g>`,
   'Added schematic on uniform (0,1]: row k partitions the space into ((j−1)/k, j/k]. The active support has probability 1/k; within each complete row every outcome is visited once.'),
  tex:picture(158,String.raw`
\put(10,137){\makebox(55,14){row $k$}}\put(310,137){\makebox(90,14){active length}}
\put(23,110){$1$}\put(80,105){\framebox(210,24){active}}\put(340,110){$1$}
\put(23,70){$2$}\put(80,65){\framebox(105,24){}}\put(185,65){\framebox(105,24){active}}\put(340,70){$1/2$}
\put(23,30){$4$}\put(80,25){\framebox(52.5,24){}}\put(132.5,25){\framebox(52.5,24){}}
\put(185,25){\framebox(52.5,24){active}}\put(237.5,25){\framebox(52.5,24){}}\put(340,30){$1/4$}
\put(77,7){$0$}\put(287,7){$1$}
`)+String.raw`\begin{center}\small Added schematic on uniform $(0,1]$: row $k$ partitions the space into $((j-1)/k,j/k]$. Each active interval has probability $1/k$; a complete row visits each outcome once.\end{center}`
 },
 'product-slices':{
  html:figure('lecture-product-slices','A fixed vertical slice through disjoint rectangles','Three rectangles occupy disjoint vertical bands. A red line at one fixed x crosses each rectangle. On the right, the three resulting disjoint y intervals are shown on a common vertical axis.',`
   <g fill="#233b2d" text-anchor="middle"><text x="175" y="18">disjoint rectangles</text><text x="380" y="18">section at this x</text></g>
   <g fill="#e2ebf2" stroke="#1b4f7a" stroke-width="1.3">
    <rect x="70" y="42" width="140" height="32"/><rect x="120" y="96" width="140" height="27"/><rect x="85" y="145" width="105" height="23"/>
   </g>
   <g fill="#233b2d" text-anchor="middle"><text x="108" y="63">C₁ × D₁</text><text x="211" y="114">C₂ × D₂</text><text x="119" y="162">C₃ × D₃</text></g>
   <g fill="none" stroke="#53645b" stroke-width="1.3"><path d="M40 188H285M52 198V28M365 188V28"/>
    <path d="M155 42H365M155 74H365M155 96H365M155 123H365M155 145H365M155 168H365" stroke-dasharray="3 5" opacity=".35"/></g>
   <path d="M155 185V29" stroke="#a33f2b" stroke-width="2" stroke-dasharray="5 4"/>
   <path d="M155 42V74M155 96V123M155 145V168M365 42V74M365 96V123M365 145V168" stroke="#a33f2b" stroke-width="5"/>
   <g fill="#233b2d"><text x="148" y="207">x</text><text x="387" y="63">D₁</text><text x="387" y="115">D₂</text><text x="387" y="162">D₃</text><text x="31" y="28">y</text></g>`,
   'Added schematic for real-coordinate rectangles: fix x, retain rectangles whose first-coordinate set contains x, and read their disjoint y-intervals. The lengths of those section intervals add.'),
  tex:picture(175,String.raw`
\put(20,15){\line(1,0){230}}\put(30,5){\line(0,1){150}}\put(320,15){\line(0,1){140}}
\put(45,118){\framebox(120,27){}}\put(47,125){\makebox(60,12){$C_1\times D_1$}}
\put(85,75){\framebox(120,23){}}\put(138,81){\makebox(62,12){$C_2\times D_2$}}
\put(60,35){\framebox(90,20){}}\put(61,39){\makebox(47,12){$C_3\times D_3$}}
\put(115,15){\line(0,1){140}}\put(110,0){$x$}\put(16,156){$y$}
\linethickness{2pt}
\put(115,118){\line(0,1){27}}\put(115,75){\line(0,1){23}}\put(115,35){\line(0,1){20}}
\put(320,118){\line(0,1){27}}\put(320,75){\line(0,1){23}}\put(320,35){\line(0,1){20}}
\put(337,126){$D_1$}\put(337,81){$D_2$}\put(337,39){$D_3$}
\put(55,159){\makebox(150,12){\small disjoint rectangles}}\put(273,159){\makebox(115,12){\small section at this $x$}}
`)+String.raw`\begin{center}\small Added schematic for real-coordinate rectangles: at fixed $x$, the contributing $y$-intervals are disjoint and their lengths add.\end{center}`
 }
};
export function lectureDiagramHTML(key){return diagrams[key]?.html||'';}
export function lectureDiagramTex(key){return diagrams[key]?.tex||'';}
