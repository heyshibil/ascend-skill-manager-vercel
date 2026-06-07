import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { leaderboardService } from "../services/leaderboardService";

export const useLeaderboard = (mode) => {
  const query = useInfiniteQuery({
    queryKey: queryKeys.leaderboard(mode), // e.g. ["leaderboard", "solved"]
    queryFn: ({ pageParam }) =>
      leaderboardService.getGlobalLeaderboard({ mode, page: pageParam }),

    initialPageParam: 1,
    // Tell TQ what the next page number is — returns undefined to signal "no more pages"
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,

    staleTime: 120_000, // 2 min — matches server Redis stale:120
    gcTime: 600_000,    // 10 min — matches server Redis ttl:600
  });

  // Flatten all fetched pages into a single list for the UI to render
  const entries = query.data?.pages.flatMap((p) => p.leaderboard ?? []) ?? [];
  const currentUser = query.data?.pages[0]?.currentUser ?? null;
  const hallOfFame = query.data?.pages[0]?.hallOfFame ?? [];
  const risingStars = query.data?.pages[0]?.risingStars ?? [];
  const hasMore = query.data?.pages.at(-1)?.hasMore ?? false;

  return {
    ...query,
    entries,
    currentUser,
    hallOfFame,
    risingStars,
    hasMore,
    loading: query.isLoading,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    loadingMore: query.isFetchingNextPage,
    error: query.error?.response?.data?.message || query.error?.message || null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refresh: () => query.refetch(),
  };
};
