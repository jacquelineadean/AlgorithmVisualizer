import { ConsumerQuestion, DepthBudget, DepthStrata, DesignSummary, PokeTest, Primitives, RequirementsChecklist, TradeoffPairs } from './method';
import { BatchingCurve, CapacityEstimator, FailureDrill, KafkaPartitions, KvLayout, LatencyLadder, Quorum, Resharding } from './numbers';
import {
    BatchingRace,
    BillCut,
    DecodeBatch,
    FlashTraffic,
    GatewaySim,
    Glossary,
    KvSizer,
    LatencyFeel,
    LaunchOverhead,
    Phases,
    PdSplit,
    PrefixTree,
    PromptOrder,
    RequestTrace,
    Roofline,
    StackMorph,
    TemplateDeploy,
} from './inference';

// Every interactive figure a system can place in a section, by the key a
// `lab` block names. content.test.js checks every key a system uses is here.
export const LABS = {
    // The design method
    'requirements-checklist': RequirementsChecklist,
    'consumer-question': ConsumerQuestion,
    'poke-test': PokeTest,
    primitives: Primitives,
    tradeoffs: TradeoffPairs,
    'depth-strata': DepthStrata,
    'depth-budget': DepthBudget,
    'design-summary': DesignSummary,

    // Numbers computed from the models in ../models
    'capacity-estimator': CapacityEstimator,
    'latency-ladder': LatencyLadder,
    quorum: Quorum,
    'batching-curve': BatchingCurve,
    'kafka-partitions': KafkaPartitions,
    'kv-layout': KvLayout,
    resharding: Resharding,
    'failure-drill': FailureDrill,

    // The inference stack
    'request-trace': RequestTrace,
    'stack-morph': StackMorph,
    phases: Phases,
    'kv-sizer': KvSizer,
    'latency-feel': LatencyFeel,
    roofline: Roofline,
    glossary: Glossary,
    'prompt-order': PromptOrder,
    'gateway-sim': GatewaySim,
    'pd-split': PdSplit,
    'batching-race': BatchingRace,
    'launch-overhead': LaunchOverhead,
    'flash-traffic': FlashTraffic,
    'decode-batch': DecodeBatch,
    'prefix-tree': PrefixTree,
    'template-deploy': TemplateDeploy,
    'bill-cut': BillCut,
};
