// Central registration point: importing this module registers every
// trace-based visualization. Pages and the evidence-gate suite import from
// here, never from the per-visualization index files.
import './rsa';
import './bayes';
import './dh';
import './quicksort';
import './mergesort';
import './pathfinding';
import './vigenere';
import './sieve';
import './clt';
import './montecarlo';
import './markov';
import './regression';
import './kmeans';
import './perceptron';
import './backprop';
import './attention';
import './transformer';
import './llminference';
import './trainingloop';
import './raft';
import './consistenthashing';
import './mapreduce';
import './cap';
import './euclid';
import './huffman';
import './pagerank';
import './sha256';

export { getVisualization, listVisualizations } from './registry';
