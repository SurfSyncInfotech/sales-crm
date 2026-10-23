import { useCallback, useMemo, useState } from 'react';
import { ACTIVITY, DOMAINS, LEADS, QUOTES, STAGES, TASKS, TEAM } from './mockData';

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));

export function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const abs = Math.abs(mins);
  const text = abs < 60 ? `${abs}m` : abs < 1440 ? `${Math.round(abs / 60)}h` : `${Math.round(abs / 1440)}d`;
  return mins >= 0 ? `${text} ago` : `in ${text}`;
}

/** Single place the workflow pages read and write. Swap the useState seeds for API calls later. */
export default function useWorkflowStore() {
  const [leads, setLeads] = useState(LEADS);
  const [tasks, setTasks] = useState(TASKS);
  const [quotes, setQuotes] = useState(QUOTES);

  const leadById = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads]);
  const userById = useMemo(() => Object.fromEntries(TEAM.map((u) => [u.id, u])), []);
  const domainById = useMemo(() => Object.fromEntries(DOMAINS.map((d) => [d.id, d])), []);

  const moveLead = useCallback((id, stage) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, []);

  const setQuoteStatus = useCallback((id, status) => {
    setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)));
  }, []);

  return {
    stages: STAGES,
    domains: DOMAINS,
    team: TEAM,
    activity: ACTIVITY,
    leads,
    tasks,
    quotes,
    leadById,
    userById,
    domainById,
    moveLead,
    toggleTask,
    setQuoteStatus,
  };
}
