// The System Design Visualizer's catalog: categories, and the systems in
// each. A system is a stack of layers the reader walks top to bottom, plus
// optional cross-cutting topics; see model.js for the shape and
// docs/CONTRACTS.md for the rules every system follows.

import chatServing from './systems/chatServing';
import inferenceStack from './systems/inferenceStack';
import kafkaLog from './systems/kafkaLog';
import mentalModels from './systems/mentalModels';
import pagedKvCache from './systems/pagedKvCache';
import shardedPostgres from './systems/shardedPostgres';
import { CATEGORIES } from './categories';

export { CATEGORIES, DEFAULT_CATEGORY } from './categories';

export const SYSTEMS = [mentalModels, chatServing, kafkaLog, pagedKvCache, shardedPostgres, inferenceStack];

export const getSystem = (id) => SYSTEMS.find((s) => s.id === id) ?? null;
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? null;
export const systemsByCategory = (categoryId) => SYSTEMS.filter((s) => s.category === categoryId);
