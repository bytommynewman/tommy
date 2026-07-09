import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPortfolio, fetchPortfolioStatus, startConnect } from '../api/portfolio';

export function usePortfolioStatus() {
  return useQuery({ queryKey: ['st_status'], queryFn: fetchPortfolioStatus, retry: 1 });
}

export function usePortfolio(connected: boolean) {
  return useQuery({
    queryKey: ['st_portfolio'],
    queryFn: fetchPortfolio,
    enabled: connected,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useConnectPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startConnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['st_status'] }),
  });
}
