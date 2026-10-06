import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bumpIfThenPlan,
  createCopingTool,
  createCraving,
  createIfThenPlan,
  fetchActiveAttempt,
  fetchCheckins,
  fetchCopingTools,
  fetchCravings,
  fetchIfThenPlans,
  fetchMilestones,
  fetchSupportContacts,
  markToolUsed,
  resolveCraving,
  startQuit,
  updateAttempt,
  updateIfThenPlan,
  updateMilestone,
  updateSupportContact,
  upsertCheckin,
} from '../api/quit';
import type { CopingTool, IfThenPlan, QuitAttempt } from '../../types/database.types';

const KEYS = {
  attempt: ['quit_attempt'] as const,
  checkins: (id: string) => ['withdrawal_checkins', id] as const,
  cravings: (id: string) => ['cravings', id] as const,
  tools: ['coping_tools'] as const,
  plans: ['if_then_plans'] as const,
  milestones: (id: string) => ['quit_milestones', id] as const,
  contacts: ['support_contacts'] as const,
};

export function useActiveAttempt() {
  return useQuery({ queryKey: KEYS.attempt, queryFn: fetchActiveAttempt });
}

export function useStartQuit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: startQuit,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.attempt });
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: KEYS.tools });
      qc.invalidateQueries({ queryKey: KEYS.plans });
      qc.invalidateQueries({ queryKey: KEYS.contacts });
    },
  });
}

export function useUpdateAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<QuitAttempt> }) => updateAttempt(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.attempt }),
  });
}

export function useCheckins(attemptId: string | undefined) {
  return useQuery({
    queryKey: KEYS.checkins(attemptId ?? ''),
    queryFn: () => fetchCheckins(attemptId as string),
    enabled: !!attemptId,
  });
}

export function useUpsertCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertCheckin,
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.checkins(row.attempt_id) });
      // A check-in that admits use should also show up as a slip in the
      // habits layer; the check-in screen handles that explicitly.
      qc.invalidateQueries({ queryKey: ['habit_logs'] });
    },
  });
}

export function useCravings(attemptId: string | undefined) {
  return useQuery({
    queryKey: KEYS.cravings(attemptId ?? ''),
    queryFn: () => fetchCravings(attemptId as string),
    enabled: !!attemptId,
  });
}

export function useCreateCraving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCraving,
    onSuccess: (row) => qc.invalidateQueries({ queryKey: KEYS.cravings(row.attempt_id) }),
  });
}

export function useResolveCraving() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof resolveCraving>[1] }) => resolveCraving(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: KEYS.cravings(row.attempt_id) });
      qc.invalidateQueries({ queryKey: ['relapses'] });
    },
  });
}

export function useCopingTools() {
  return useQuery({ queryKey: KEYS.tools, queryFn: fetchCopingTools });
}

export function useMarkToolUsed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tool, helpful }: { tool: CopingTool; helpful: boolean | null }) => markToolUsed(tool, helpful),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tools }),
  });
}

export function useCreateCopingTool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCopingTool,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.tools }),
  });
}

export function useIfThenPlans() {
  return useQuery({ queryKey: KEYS.plans, queryFn: fetchIfThenPlans });
}

export function useCreateIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createIfThenPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }),
  });
}

export function useBumpIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plan, held }: { plan: IfThenPlan; held: boolean }) => bumpIfThenPlan(plan, held),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }),
  });
}

export function useUpdateIfThenPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IfThenPlan> }) => updateIfThenPlan(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.plans }),
  });
}

export function useMilestones(attemptId: string | undefined) {
  return useQuery({
    queryKey: KEYS.milestones(attemptId ?? ''),
    queryFn: () => fetchMilestones(attemptId as string),
    enabled: !!attemptId,
  });
}

export function useUpdateMilestone(attemptId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateMilestone>[1] }) => updateMilestone(id, patch),
    onSuccess: () => {
      if (attemptId) qc.invalidateQueries({ queryKey: KEYS.milestones(attemptId) });
    },
  });
}

export function useSupportContacts() {
  return useQuery({ queryKey: KEYS.contacts, queryFn: fetchSupportContacts });
}

export function useUpdateSupportContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateSupportContact>[1] }) => updateSupportContact(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.contacts }),
  });
}
