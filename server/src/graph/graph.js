import { END, START, StateGraph } from '@langchain/langgraph';
import { ResumeGraphState } from './state.js';
import { loadContextNode } from './nodes/loadContext.js';
import { routerNode } from './router.js';
import { clarifyNode } from './nodes/clarify.js';
import { qaNode } from './nodes/qa.js';
import { executorNode } from './nodes/executor.js';
import { versionActionNode } from './nodes/versionAction.js';
import { commitVersionNode } from './nodes/commitVersion.js';
import { respondNode } from './nodes/respond.js';

const VERSION_INTENTS = new Set(['undo', 'redo', 'compare']);

/**
 * Conditional edge resolver after the router node.
 */
export function selectPostRouterBranch(state) {
  if (state.needsClarification) {
    return 'clarify';
  }

  const intents = state.intents || [];
  const plan = state.plan || [];

  if (plan.length > 0) {
    return 'executor';
  }

  if (intents.some((intent) => VERSION_INTENTS.has(intent))) {
    return 'versionAction';
  }

  return 'qa';
}

/**
 * Compile the LangGraph StateGraph:
 * loadContext -> router -> (clarify | qa | executor | versionAction) -> commitVersion -> respond
 */
export function createResumeGraph() {
  const workflow = new StateGraph(ResumeGraphState)
    .addNode('loadContext', loadContextNode)
    .addNode('router', routerNode)
    .addNode('clarify', clarifyNode)
    .addNode('qa', qaNode)
    .addNode('executor', executorNode)
    .addNode('versionAction', versionActionNode)
    .addNode('commitVersion', commitVersionNode)
    .addNode('respond', respondNode)
    .addEdge(START, 'loadContext')
    .addEdge('loadContext', 'router')
    .addConditionalEdges('router', selectPostRouterBranch, {
      clarify: 'clarify',
      executor: 'executor',
      versionAction: 'versionAction',
      qa: 'qa',
    })
    .addEdge('clarify', 'respond')
    .addEdge('qa', 'respond')
    .addEdge('versionAction', 'respond')
    .addEdge('executor', 'commitVersion')
    .addEdge('commitVersion', 'respond')
    .addEdge('respond', END);

  return workflow.compile();
}

const compiledGraph = createResumeGraph();

/**
 * Run the compiled resume orchestration graph for a single user turn.
 */
export async function runResumeGraph(input) {
  return compiledGraph.invoke(input);
}
