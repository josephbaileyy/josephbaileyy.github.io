import { computeLayout, decode, diagnose } from './model.js';

let model;
let reviewPairs;
self.onmessage = ({ data }) => {
  if (data.graph) {
    model = decode(data.graph);
    reviewPairs = data.graph.review_pairs;
    return;
  }
  const { request, options } = data;
  try {
    const started = performance.now();
    const layout = computeLayout(model, options);
    const layoutMs = performance.now() - started;
    const diagnostics = diagnose(model, layout, reviewPairs);
    self.postMessage({ request, layout: { points: layout.points }, diagnostics, layoutMs });
  } catch (error) {
    self.postMessage({ request, error: error.message });
  }
};
