import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildEditPlan,
  deleteIdea,
  fetchEditPlans,
  fetchIdeas,
  fetchMediaStats,
  fetchSnapshots,
  generateIdeas,
  setIdeaStatus,
  syncInstagram,
  updateEditPlanShots,
} from '../api/content';
import type { ReelIdeaStatus } from '../../types/database.types';

export function useIdeas() {
  return useQuery({ queryKey: ['reel_ideas'], queryFn: fetchIdeas });
}

export function useGenerateIdeas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateIdeas,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel_ideas'] }),
  });
}

export function useSetIdeaStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReelIdeaStatus }) => setIdeaStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel_ideas'] }),
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteIdea,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reel_ideas'] }),
  });
}

export function useEditPlans() {
  return useQuery({ queryKey: ['edit_plans'], queryFn: fetchEditPlans });
}

export function useBuildEditPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buildEditPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['edit_plans'] }),
  });
}

export function useUpdateEditPlanShots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, shotList }: { id: string; shotList: Parameters<typeof updateEditPlanShots>[1] }) =>
      updateEditPlanShots(id, shotList),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['edit_plans'] }),
  });
}

export function useSnapshots() {
  return useQuery({ queryKey: ['ig_snapshots'], queryFn: fetchSnapshots });
}

export function useMediaStats() {
  return useQuery({ queryKey: ['ig_media_stats'], queryFn: fetchMediaStats });
}

export function useSyncInstagram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: syncInstagram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ig_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['ig_media_stats'] });
    },
  });
}
