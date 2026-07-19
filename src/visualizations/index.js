// Central registration point: importing this module registers every
// trace-based visualization. Pages and the evidence-gate suite import from
// here, never from the per-visualization index files.
import './rsa';
import './bayes';
import './dh';
import './quicksort';
import './mergesort';

export { getVisualization, listVisualizations } from './registry';
