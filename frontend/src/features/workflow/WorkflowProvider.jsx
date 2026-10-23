import { WorkflowContext } from './WorkflowContext';
import useWorkflowStore from './useWorkflowStore';

export default function WorkflowProvider({ children }) {
  const store = useWorkflowStore();
  return <WorkflowContext.Provider value={store}>{children}</WorkflowContext.Provider>;
}
