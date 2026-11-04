// Shared data for the Fundamentals systems and their labs. Lists and
// examples are written for this site; the structure and counts (eight
// questions, forty primitives, five layers of depth, three tests for
// depth) follow SDDD_MODELS.

export const REQUIREMENT_QUESTIONS = [
    ['Who uses it, and how many of them?', 'Request rate, fan-out, and whether one region is enough.'],
    ['What is in scope, and what is out?', 'Which boxes you are allowed to leave off.'],
    ['Is it read-heavy or write-heavy?', 'Caches and replicas, or logs and partitions.'],
    ['Which latency matters, at which percentile?', 'What must stay synchronous, and where the p99 work goes.'],
    ['How fresh must reads be?', 'Strong consistency and quorums, or caches with a time to live.'],
    ['What happens when a part fails?', 'Replication factor, retries, idempotency, and what users see.'],
    ['How much data, kept for how long?', 'Storage engine, retention policy, and when to shard.'],
    ['What is fixed already?', 'Budget, existing stack, compliance and GPU supply. Build or buy follows from these.'],
];

export const CONSUMERS = {
    chat: {
        name: 'Chat users',
        goal: 'Time to first token, then a steady stream for each person.',
        numbers: 'First token in about a second; 20 to 50 tokens/s per stream; concurrency from Little’s law at peak.',
        drops: 'Job queues and result files.',
        chain: [
            ['Chat app', 'People waiting on a screen, one conversation each.'],
            ['API gateway', 'Streams tokens back over server-sent events.'],
            ['KV-aware router', 'Sends a conversation back to the GPU that already holds its prefix.'],
            ['Continuous batcher', 'Admits new requests between decode steps.'],
            ['GPU workers', 'Paged KV cache; the system prompt is shared across users.'],
            ['Back to the user', 'Token by token, first token within about a second.'],
        ],
    },
    eval: {
        name: 'Evaluation jobs',
        goal: 'Tokens per GPU-hour. Nobody watches any single request.',
        numbers: 'Total tokens per day; deadline in hours; batch as large as KV memory allows.',
        drops: 'Streaming and per-request latency targets.',
        chain: [
            ['Eval pipeline', 'Thousands of prompts submitted at once.'],
            ['Batch submit API', 'Accepts a file and returns a job id.'],
            ['Job queue', 'Holds work until capacity is cheap.'],
            ['Large continuous batches', 'Fills each GPU to its KV cache limit. No streaming.'],
            ['GPU workers', 'Spot or preemptible capacity, with checkpoints.'],
            ['Object storage', 'A results file, hours later.'],
        ],
    },
    agent: {
        name: 'Other agents',
        goal: 'Tail latency per call, and output that always parses, because calls chain.',
        numbers: 'p99 per call times calls per task; share of outputs that fail to parse; length of the shared tool prefix.',
        drops: 'Long streams to a human reader.',
        chain: [
            ['Agent runtime', 'Many short calls in a loop.'],
            ['API gateway', 'JSON schema, idempotency keys and strict timeouts.'],
            ['Per-caller rate limiter', 'One runaway agent cannot starve the others.'],
            ['Continuous batcher', 'Short requests that share long prefixes.'],
            ['GPU workers', 'Prefix cache holds the tool definitions.'],
            ['Validator', 'Rejects malformed JSON before the agent sees it.'],
        ],
    },
};

export const POKES = [
    { at: 'request', mark: 'p99?', read: '“p99?” on the request path.', means: 'Tail latency. Work on the read path: caching, precomputation and timeouts.' },
    { at: 'app', mark: 'it dies?', read: '“It dies?” on the app server.', means: 'Availability. Add redundancy and health checks, and decide what users see during failover.' },
    { at: 'db', mark: '10× writes?', read: '“10× writes?” on the database.', means: 'Write scale. Pick a shard key and partition the write path.' },
    { at: 'client', mark: 'who reads it?', read: '“Who reads it?” on the client.', means: 'The consumer question. Answer it, then redraw the design.' },
];

// [id, name, what it is, vendors, reach for it when]
export const PRIMITIVE_FAMILIES = [
    ['Store', [
        ['rel', 'Relational database', 'Rows, joins and transactions.', 'Postgres, MySQL, Aurora, Spanner', 'The data has relationships and you need multi-row transactions.'],
        ['kv', 'Key-value store', 'One key, one value, fast.', 'DynamoDB, Redis, FoundationDB', 'Every read and write names its key.'],
        ['wide', 'Wide-column store', 'Huge tables keyed by partition and sort key.', 'Cassandra, Bigtable, HBase, ScyllaDB', 'Write volume is very high and queries follow the key.'],
        ['doc', 'Document store', 'Nested records with a flexible schema.', 'MongoDB, Firestore, Couchbase', 'Records are read and written whole.'],
        ['obj', 'Object store', 'Cheap, durable blobs by name.', 'S3, Google Cloud Storage, Azure Blob', 'Files are large and immutable.'],
    ]],
    ['Find', [
        ['btree', 'B-tree index', 'Point and range lookups with in-place updates.', 'Postgres, MySQL InnoDB', 'Reads dominate and you need ordered ranges.'],
        ['lsm', 'LSM tree', 'Write-optimized storage that compacts in the background.', 'RocksDB, Cassandra, LevelDB', 'Writes dominate and some read amplification is acceptable.'],
        ['inv', 'Inverted index', 'From each term to the documents that contain it.', 'Elasticsearch, OpenSearch, Lucene', 'Users search text.'],
        ['vec', 'Vector index', 'Approximate nearest neighbors over embeddings.', 'pgvector, FAISS, Pinecone, Milvus', 'Similarity matters more than exact match.'],
        ['geo', 'Geospatial index', 'Points and shapes by location.', 'PostGIS, S2, H3', 'Queries say near, within or inside.'],
    ]],
    ['Remember', [
        ['cache', 'Cache', 'Keep hot reads in memory.', 'Redis, Memcached', 'The same reads repeat and slightly stale data is acceptable.'],
        ['cdn', 'CDN', 'Serve cacheable bytes near users.', 'CloudFront, Fastly, Cloudflare', 'Many users fetch the same bytes.'],
        ['kvc', 'KV cache', 'Attention keys and values reused across decode steps.', 'vLLM PagedAttention, TensorRT-LLM', 'You serve autoregressive models.'],
        ['bloom', 'Bloom filter', 'Cheap “definitely not here” checks.', 'Built into RocksDB and Cassandra', 'Most lookups miss and misses are expensive.'],
        ['mview', 'Materialized view', 'A stored answer to a known query.', 'Postgres, ClickHouse, Flink', 'The query is known ahead and runs often.'],
    ]],
    ['Move', [
        ['mq', 'Message queue', 'Hand each job to one worker.', 'SQS, RabbitMQ', 'Work must be done once, not replayed.'],
        ['log', 'Append-only log', 'Ordered, replayable event history.', 'Kafka, Kinesis, Pulsar', 'Several consumers need the same events, now or later.'],
        ['pubsub', 'Pub/sub', 'One message to many subscribers.', 'SNS, Google Pub/Sub, NATS', 'Many systems react to one event.'],
        ['cdc', 'Change data capture', 'Turn database writes into a stream.', 'Debezium, DynamoDB Streams', 'Other systems must follow a database.'],
        ['dlq', 'Dead-letter queue', 'Park messages that keep failing.', 'SQS dead-letter queues, Kafka DLQ topics', 'A poison message must not block the rest.'],
    ]],
    ['Compute', [
        ['svc', 'Stateless service', 'Request handlers that scale out.', 'Kubernetes, ECS, Cloud Run', 'Requests are independent.'],
        ['batch', 'Batch processing', 'Large jobs over stored data.', 'Spark, Beam, Ray', 'Results can wait minutes or hours.'],
        ['stream', 'Stream processing', 'Continuous computation on events.', 'Flink, Kafka Streams', 'Results must follow events within seconds.'],
        ['wf', 'Workflow engine', 'Durable multi-step work with retries.', 'Temporal, Airflow, Step Functions', 'A process spans steps, services or days.'],
        ['gpu', 'GPU batcher', 'Packs inference requests to keep GPUs busy.', 'vLLM, TensorRT-LLM, Triton', 'GPUs are the scarce resource.'],
    ]],
    ['Agree', [
        ['raft', 'Consensus', 'A replicated log that nodes agree on.', 'etcd (Raft), ZooKeeper', 'A small amount of state must be correct everywhere.'],
        ['lease', 'Lease or leader election', 'One owner at a time, with expiry.', 'etcd, ZooKeeper, Consul', 'Exactly one node should act.'],
        ['lock', 'Distributed lock', 'Mutual exclusion across machines.', 'etcd, ZooKeeper', 'Two workers must never touch the same thing at once.'],
        ['idem', 'Idempotency key', 'Retries that cannot apply twice.', 'Keys stored in your own database', 'Clients retry and duplicates cost money.'],
        ['outbox', 'Outbox or saga', 'Keep a database write and a message in step.', 'Debezium outbox, Temporal', 'One action spans a database and a message.'],
    ]],
    ['Route', [
        ['lb', 'Load balancer', 'Spread requests across healthy backends.', 'Envoy, NGINX, AWS ALB', 'There is more than one backend.'],
        ['gw', 'API gateway', 'Auth, quotas and routing at the edge.', 'Kong, Apigee, AWS API Gateway', 'Outside callers reach many services.'],
        ['rl', 'Rate limiter', 'Cap requests per caller over time.', 'Token bucket in Redis, Envoy', 'One caller can hurt the rest.'],
        ['ch', 'Consistent hashing', 'Map keys to nodes with little reshuffling.', 'Dynamo-style rings, Envoy ring hash', 'Nodes come and go and keys should stay put.'],
        ['cb', 'Circuit breaker', 'Stop calling a failing dependency.', 'Envoy, Resilience4j', 'A slow dependency can drag everything down.'],
    ]],
    ['Scale & observe', [
        ['shard', 'Sharding', 'Split data by key across machines.', 'Citus, Vitess, native partitioning', 'One machine cannot hold or serve it all.'],
        ['repl', 'Replication', 'Copies for durability and read scale.', 'Postgres streaming replication, Kafka ISR', 'Losing a machine must not lose data.'],
        ['tsdb', 'Time-series store', 'Compressed metrics by time.', 'Prometheus, InfluxDB, TimescaleDB', 'You query by time window.'],
        ['sketch', 'Probabilistic counter', 'Approximate counts in very little memory.', 'HyperLogLog, Count-Min sketch', 'An exact count is too expensive and a close one will do.'],
        ['trace', 'Distributed tracing', 'Follow one request across services.', 'OpenTelemetry, Jaeger', 'Latency hides between services.'],
    ]],
];

export const ACCESS_PATTERNS = [
    ['Hot reads by key', ['kv', 'cache', 'ch', 'repl', 'bloom', 'cdn']],
    ['Append, then replay', ['log', 'cdc', 'stream', 'obj', 'outbox']],
    ['Range scans by time', ['btree', 'wide', 'lsm', 'tsdb', 'shard']],
    ['Search text', ['inv', 'doc', 'cdc', 'mview']],
    ['Nearest neighbors', ['vec', 'obj', 'batch', 'cache']],
    ['One write, many readers', ['pubsub', 'mq', 'cdn', 'cache', 'mview']],
    ['Large blobs', ['obj', 'cdn', 'batch']],
    ['Multi-step, exactly once', ['wf', 'idem', 'outbox', 'dlq', 'mq']],
    ['Serve an LLM', ['gpu', 'kvc', 'rl', 'lb', 'mq', 'gw']],
];

// [id, title, side A, side B, the deciding number]; each side is [name, gives, costs, choose it for].
export const TRADEOFFS = [
    ['btree-lsm', 'B-tree or LSM tree',
        ['B-tree', 'A lookup reads about log base fanout of the row count pages: 3 or 4 even at billions of rows. Rows update in place.', 'Random writes. Changing one row rewrites a whole page plus the write-ahead log, so small writes are amplified.', 'Read-heavy tables, range queries, transactions. Postgres, MySQL InnoDB.'],
        ['LSM tree', 'Writes land in an in-memory table and an append-only log, then flush as sorted files. Ingest stays sequential.', 'Reads may check several levels; Bloom filters skip most misses. Compaction rewrites data in the background and spends disk bandwidth.', 'Write-heavy ingest, time series, huge key spaces. RocksDB, Cassandra.'],
        'With a fanout of 500, a B-tree reaches 125 million rows in 3 levels and 62.5 billion in 4.'],
    ['queue-log', 'Queue or log',
        ['Queue', 'Each message goes to one worker and is deleted on acknowledgement. Per-message retries, delays and dead-letter queues.', 'No replay. A second consumer needs its own copy. Ordering is usually best effort.', 'Work that must happen once: emails, thumbnails, payouts. SQS, RabbitMQ.'],
        ['Append-only log', 'Messages stay for the retention period. Each consumer group keeps its own offset, so a new reader can replay history. Order holds within a partition.', 'A classic consumer group runs at most one consumer per partition. A slow message holds up its whole partition.', 'Several systems need the same events, or you need replay. Kafka, Kinesis, Pulsar.'],
        'In a classic Kafka consumer group each partition has one reader, so 12 partitions cap the group at 12 busy consumers.'],
    ['cache-write', 'Cache-aside or write-through',
        ['Cache-aside', 'The app reads the cache, and on a miss reads the database and fills the cache. Only requested data gets cached.', 'Reads can be stale until a time-to-live expires or the key is invalidated. A cold cache sends every read to the database.', 'Read-heavy data that tolerates seconds of staleness. Profiles, catalogs.'],
        ['Write-through', 'Every write updates the cache and the database together, so reads see fresh data.', 'Each write pays two writes. The cache fills with data that may never be read.', 'Read-after-write matters and the write rate is modest. Sessions, settings.'],
        'At a 95% hit rate the database sees 1 read in 20. Drop to 90% and its read load doubles.'],
    ['sync-async', 'Synchronous or asynchronous replication',
        ['Synchronous', 'A commit returns only after a replica has it. Failover loses no acknowledged write.', 'Every commit waits one more round trip. If the replica is down, writes stall unless a policy relaxes the rule.', 'Money, inventory, anything where a lost write is a bug.'],
        ['Asynchronous', 'A commit returns after the local write. Write latency stays flat, even across regions.', 'Replicas lag. A failover can lose the writes that had not shipped yet.', 'Read replicas, analytics, cross-region copies where a few seconds of loss is acceptable.'],
        'In one datacenter, sync adds about 0.5 ms per commit. California to the Netherlands adds about 150 ms: fewer than 7 strictly serial commits per second.'],
    ['hash-range', 'Hash or range sharding',
        ['Hash', 'Keys spread evenly. Sequential keys such as timestamps do not pile onto one shard.', 'A range query must ask every shard. Related rows land apart unless they share a shard key.', 'Lookups by ID, write-heavy tables with ever-increasing keys.'],
        ['Range', 'A range scan hits one shard or a few. Splitting a hot range is simple.', 'New keys at the end of the range all hit the last shard. Popular ranges become hot shards.', 'Scans by time or prefix, ordered pagination.'],
        'A range query on a hash-sharded table fans out to all N shards, so it waits for the slowest of N responses.'],
    ['static-continuous', 'Static or continuous batching',
        ['Static batching', 'Simple. The batch forms once and runs until its longest request finishes.', 'Short requests wait for long ones. Finished slots sit idle, and new requests wait for the next batch.', 'Offline jobs with uniform lengths.'],
        ['Continuous batching', 'Requests join and leave between decode steps, so the batch stays full. Orca called this iteration-level scheduling.', 'A more complex scheduler, plus memory management per step, such as paged KV blocks.', 'Online serving with mixed lengths. vLLM, TensorRT-LLM.'],
        'Orca reported 36.9 times the throughput of FasterTransformer on GPT-3 175B at the same latency.'],
];

export const ANTI_PATTERNS = [
    { title: 'Vendor first.', text: 'Naming Kafka or Redis before the access pattern. State the pattern, then the primitive, then the product.' },
    { title: 'Boxes without reasons.', text: 'A component added because similar systems have one. Tie every box to a requirement.' },
    { title: 'No costs stated.', text: 'Every choice looks free, so nothing can be compared. Name what each choice gives up and when to switch.' },
    { title: 'No numbers.', text: 'No traffic, data size or latency estimate, so no choice can be checked. Write down three numbers before the second box.' },
];

// Five layers of depth, the same for every component.
export const DEPTH_LAYERS = ['Role', 'Interface and data model', 'Mechanism', 'Limits and failure', 'Operations'];

export const DEPTH_TEXT = {
    'kafka-log': [
        'A durable, ordered event log between the ingest service and everything that consumes its events.',
        'Topics split into partitions, producers pick a key, and each consumer group tracks its own offsets.',
        'Each partition is an append-only file copied to follower brokers. Replay means moving a consumer’s offset back.',
        'Order holds only within a partition. A skewed key makes a hot partition, and `acks=all` writes fail below `min.insync.replicas`.',
        'Partitions can grow but never shrink, and growing them remaps keys. Consumer lag is the number to watch.',
    ],
    'paged-kv-cache': [
        'Holds every active sequence’s attention keys and values on the GPU, so a new token never recomputes the prompt.',
        'A block table per sequence maps logical blocks to physical GPU blocks of 16 tokens, vLLM’s default.',
        'Blocks are allocated on demand, like virtual memory pages. Sequences with a shared prefix share blocks until copy-on-write splits them.',
        'Earlier systems used only 20 to 38 percent of KV memory for real tokens, and vLLM wastes under 4 percent. When memory runs out, the scheduler preempts sequences.',
        'Watch KV cache utilization and preemptions per GPU. The paper reports 2 to 4 times the throughput of FasterTransformer and Orca at the same latency.',
    ],
    'sharded-postgres': [
        'The relational store for data that is too large or too busy for a single primary.',
        'A shard key, a routing map from key to shard, and the same schema on every shard.',
        'Rows split across primaries by hash or range of the shard key. Each shard keeps its own replicas and fails over alone.',
        'A skewed key makes a hot shard. Cross-shard joins and transactions are slow or need two-phase commit.',
        'Plan online resharding early, migrate schemas shard by shard, and rehearse failover per shard.',
    ],
};

// Components of a chat-serving design, placed on the three depth tests:
// L = load-bearing, N = novel; team = the team that owns it.
export const DEPTH_CANDIDATES = [
    ['router', 'KV-aware router', 'LN', 'inference', 'Decides which GPU holds a conversation. Getting it wrong multiplies prefill work, and few systems outside LLM serving need one.'],
    ['batcher', 'GPU batcher', 'LN', 'inference', 'Sets throughput and latency for the whole service. Continuous batching is specific to autoregressive models.'],
    ['kvmem', 'KV cache memory', 'LN', 'inference', 'Memory per sequence caps concurrency. Paging it is the newest idea in the design.'],
    ['weights', 'Model weight loading', 'N', 'inference', 'Cold starts for very large weights are rare in other systems. They matter only during scale-up.'],
    ['rl', 'Per-org rate limiter', 'L', 'api', 'Protects every other customer from one heavy caller. The algorithm itself is standard.'],
    ['sse', 'Token streaming', 'L', 'api', 'Chat feels slow without it. Server-sent events are well understood.'],
    ['gw', 'Gateway and auth', '', 'api', 'Necessary, standard and rarely where the hard decisions are.'],
    ['conv', 'Conversation store', 'L', 'storage', 'Every request reads history from it. A sharded key-value design is familiar.'],
    ['usage', 'Usage log for billing', 'L', 'storage', 'Money depends on it being complete. An append-only log handles it.'],
    ['cdn', 'CDN for the web app', '', '', 'Commodity. One line in the design is enough.'],
];

export const DEPTH_TEAMS = [
    { id: 'inference', name: 'Inference' },
    { id: 'api', name: 'API platform' },
    { id: 'storage', name: 'Storage' },
];

// A design summary: [heading, worked example for chat serving, blank template line].
export const SUMMARY_LINES = [
    ['Requirement', 'Interactive chat, so time to first token is the target.', '[The requirement that drove the design, and its number.]'],
    ['Two tradeoffs', 'Paged KV cache over static reservation: more concurrent users, at the cost of preemption under memory pressure. Continuous batching over static batches: lower latency, more scheduler work.', '[Choice A over B: what it bought, what it cost. Twice.]'],
    ['Biggest risk and its metric', 'One popular prefix overloading a single GPU pool. Watch per-pool KV cache use and queue time.', '[The failure most likely to hurt, and the metric that shows it first.]'],
    ['Next to build', 'Prefix-aware autoscaling, then a cheaper batch tier for evaluation traffic.', '[The next two things, in order.]'],
];

// The chat-serving design, failed one box at a time.
export const FAILURES = {
    gw: { name: 'Gateway instance', nodes: ['gw'], title: 'One gateway instance dies', users: 'Requests on that instance fail until the load balancer’s health check removes it. Streams open on it are cut.', metric: '5xx rate and open connections per instance; failed health checks.', limit: 'Run N + 1 instances behind the load balancer. Clients retry with an idempotency key so a retry cannot bill twice.', blast: '1 / N of new requests for a few seconds, plus the streams that instance held.' },
    rl: { name: 'Rate-limiter store', nodes: ['rl'], title: 'The rate limiter’s store goes down', users: 'Failing closed, every request gets a 429. Failing open, nobody is limited and one heavy caller can fill the GPUs.', metric: 'Limiter call errors and latency; GPU queue depth if it failed open.', limit: 'Fail open to a local token bucket in each gateway instance. Limits loosen for a while and never disappear.', blast: 'Everyone, through either rejections or a noisy neighbour.' },
    router: { name: 'Router', nodes: ['router'], title: 'The KV-aware router crashes', users: 'With a least-loaded fallback, answers still arrive, but start later. Requests land on GPUs that do not hold their prefix, so the prompt is processed again.', metric: 'Prefix cache hit rate falls; time to first token rises at p50 and p99.', limit: 'Keep the router stateless and rebuild its map from GPU reports. Fall back to least-loaded routing while it restarts.', blast: 'Latency for everyone, with no errors.' },
    gpu: { name: 'GPU replica', nodes: ['g2'], title: 'One GPU replica dies', users: 'Every stream on that replica stops mid-answer.', metric: 'Stream error rate; replica health checks and GPU error counters.', limit: 'Retry on another replica, from the start or with the text so far added to the prompt. Keep spare capacity for one replica.', blast: 'Every stream on that replica: a few hundred at typical batch sizes.' },
    kvfull: { name: 'KV cache full', nodes: ['g1', 'g2', 'g3'], title: 'The KV cache fills up', users: 'New requests wait in the queue. Some running streams pause while the scheduler drops their blocks to recompute later or swaps them to CPU memory.', metric: 'KV cache utilization near 100%, preemption count, queue time.', limit: 'Admission control at the router, a lower output-token cap under load, and autoscaling on KV utilization instead of GPU busy time.', blast: 'Latency for everyone at peak.' },
    pg: { name: 'Postgres shard', nodes: ['pg'], title: 'One Postgres shard primary fails', users: 'Users whose conversations live on that shard cannot load their history. Everyone else is unaffected.', metric: 'Error rate per shard; replication lag on that shard’s replicas.', limit: 'Promote a replica with automated failover. Meanwhile, let affected users start a new conversation without history.', blast: '1 / N of users, for the length of the failover.' },
    broker: { name: 'Kafka broker', nodes: ['kafka'], title: 'One Kafka broker fails', users: 'Nothing, if the topic is set up for it.', metric: 'Under-replicated partitions; producer errors and retries.', limit: 'Replication factor 3 with `min.insync.replicas = 2` and `acks=all` keeps writes flowing with one broker down. Buffer usage events locally and never block an answer on the billing write.', blast: 'None with that setup. With replication factor 1, lost usage records and gaps in billing.' },
};
