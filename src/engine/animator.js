// Schedules the two-phase visualization (visited sweep, then shortest path)
// and keeps track of every pending timeout so a run can be cancelled cleanly,
// which is what makes re-running and clearing the board safe.
export function createAnimator({ visitDelayMs = 10, pathDelayMs = 50 } = {}) {
    let timeoutIds = [];

    function schedule(callback, delay) {
        timeoutIds.push(setTimeout(callback, delay));
    }

    function cancel() {
        for (const id of timeoutIds) clearTimeout(id);
        timeoutIds = [];
    }

    function play({ visitedNodesInOrder, pathNodesInOrder }, { onVisit, onPathStep, onFinish }) {
        cancel();
        visitedNodesInOrder.forEach((node, i) => {
            schedule(() => onVisit(node), visitDelayMs * i);
        });
        const pathStartMs = visitDelayMs * visitedNodesInOrder.length;
        pathNodesInOrder.forEach((node, i) => {
            schedule(() => onPathStep(node), pathStartMs + pathDelayMs * i);
        });
        schedule(() => {
            timeoutIds = [];
            if (onFinish) onFinish();
        }, pathStartMs + pathDelayMs * pathNodesInOrder.length);
    }

    return { play, cancel };
}
