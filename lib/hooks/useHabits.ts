import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  archiveHabit,
  createHabit,
  createRelapse,
  fetchHabits,
  fetchLogsSince,
  fetchRelapses,
  upsertLog,
} from '../api/habits';

export function useHabits() {
  return useQuery({ queryKey: ['habits'], queryFn: fetchHabits });
}

export function useRecentLogs(days = 30) {
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
  return useQuery({ queryKey: ['habit_logs', since], queryFn: () => fetchLogsSince(since) });
}

export function useRelapses() {
  return useQuery({ queryKey: ['relapses'], queryFn: () => fetchRelapses() });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createHabit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useArchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveHabit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useUpsertLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['habit_logs'] }),
  });
}

export function useCreateRelapse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRelapse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relapses'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
    },
  });
}
