import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchDailyRead, fetchScratchMessages, sendToScratch } from '../api/scratch';

export function useScratchMessages() {
  return useQuery({ queryKey: ['scratch_messages'], queryFn: fetchScratchMessages });
}

export function useSendToScratch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendToScratch,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['scratch_messages'] });
      if ('actions' in result && result.actions.length > 0) {
        // Scratch changed data — refresh everything habit-shaped.
        // Query keys verified against lib/hooks/useHabits.ts:
        // - habits: ['habits']
        // - habit_logs: ['habit_logs'] (prefix of ['habit_logs', since])
        // - relapses: ['relapses'] (not relapse_incidents)
        queryClient.invalidateQueries({ queryKey: ['habits'] });
        queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
        queryClient.invalidateQueries({ queryKey: ['relapses'] });
      }
    },
  });
}

export function useDailyRead() {
  return useQuery({
    queryKey: ['scratch_daily_read', format(new Date(), 'yyyy-MM-dd')],
    queryFn: fetchDailyRead,
    staleTime: 1000 * 60 * 60, // the SecureStore day-cache is the real gate
    retry: false,
  });
}
