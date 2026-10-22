import {entries as independence} from './section-1-4-1.js';
import {entries as products} from './section-1-4-2.js?v=proofs1';
import {entries as fubini} from './section-1-4-3.js?v=curves2';
import {entries as integral} from './section-1-3-1.js?v=main-guides1';
import {entries as inequalities} from './section-1-3-2.js';
import {entries as convergence} from './section-1-3-3.js?v=main-guides1';
import {entries as integrability} from './section-1-3-4.js?v=intuition1';
import {entries as densities} from './section-1-3-5.js';
import {entries as moments} from './section-1-3-6.js';
import {entries as first} from './chapter-1.js';
import {entries as generated} from './section-1-1-2.js?v=borel1';
import {entries as measures} from './section-1-1-3.js?v=navigation2';
import {entries as variables} from './section-1-2-1.js';
import {entries as closure} from './section-1-2-2.js?v=pointwise1';
import {entries as laws} from './section-1-2-3.js?v=main-guides1';
export const sections=[
 {n:'1.1.1',anchor:'reading',title:'The probability space',entries:first},
 {n:'1.1.2',anchor:'section-1-1-2',title:'Generated and Borel σ-algebras',entries:generated,intro:'We now specify an event space by the questions it must contain. Closure then determines the smallest compatible σ-algebra. This leads from finite partitions to Borel sets and product spaces.'},
 {n:'1.1.3',anchor:'section-1-1-3',title:'Lebesgue measure and Carathéodory’s theorem',entries:measures,intro:'Length on intervals is simple to specify; a measure on every Borel set is not. Extension and uniqueness arguments explain how a small collection of values can determine a whole measure.'},
 {n:'1.2.1',anchor:'section-1-2-1',title:'Indicators, simple functions and random variables',entries:variables,sectionStart:'1.2 · Random variables and their distribution',intro:'A random variable is a function whose questions about outputs pull back to allowed events. Begin with indicator functions, then use simple functions to approximate general measurable functions.'},
 {n:'1.2.2',anchor:'section-1-2-2',title:'Closure properties of random variables',entries:closure,intro:'Which operations preserve measurability? Composition, arithmetic and countable limits turn the definition into a practical toolkit. Pay attention to when extended-real values become allowed.'},
 {n:'1.2.3',anchor:'section-1-2-3',title:'Distribution, density and law',entries:laws,intro:'Push probability through a random variable to obtain its law. On the real line, a distribution function records the entire law; a density exists only for some laws.'},
 {n:'1.3.1',anchor:'section-1-3-1',title:'Lebesgue integral, linearity and monotonicity',entries:integral,sectionStart:'1.3 · Integration and mathematical expectation',intro:'Build expectation from weighted events, then use linearity and monotonicity to calculate and compare.'},
 {n:'1.3.2',anchor:'section-1-3-2',title:'Inequalities',entries:inequalities,intro:'Turn moments into probability bounds and compare nonlinear averages with Jensen, Hölder and Minkowski.'},
 {n:'1.3.3',anchor:'section-1-3-3',title:'Convergence, limits and expectation',entries:convergence,intro:'Compare convergence modes and examine exactly when limits can pass through expectation.'},
 {n:'1.3.4',anchor:'section-1-3-4',title:'L¹-convergence and uniform integrability',entries:integrability,intro:'Control the mass in large values to connect convergence in probability with convergence in mean.'},
 {n:'1.3.5',anchor:'section-1-3-5',title:'Expectation, density and Riemann integral',entries:densities,intro:'Move between weighted measures, laws, densities and ordinary integrals.'},
 {n:'1.3.6',anchor:'section-1-3-6',title:'Mean, variance and moments',entries:moments,intro:'Measure location and spread, and calculate moments of familiar distributions.'},
 {n:'1.4.1',anchor:'section-1-4-1',title:'Definition and conditions for independence',entries:independence,sectionStart:'1.4 · Independence and product measures',intro:'Compare joint probabilities with products, distinguish pairwise from mutual independence, and follow information into the tail.'},
 {n:'1.4.2',anchor:'section-1-4-2',title:'Product measures and Kolmogorov’s theorem',entries:products,intro:'Build joint laws from rectangle masses and extend consistent finite observations to an infinite sequence.'},
 {n:'1.4.3',anchor:'section-1-4-3',title:'Fubini’s theorem and its application',entries:fubini,intro:'Integrate by slices, turn tails into moments, and use convolution to add independent variables.'}
];
export const entries=sections.flatMap(s=>s.entries.map(e=>({...e,subsection:s.n})));
