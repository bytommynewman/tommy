import type { League } from "./teams";

/** MOCK season calendar. Dates are approximate and labelled "expected" in the UI. */
export const SEASON: Record<League, { label: string; regularSeasonEnd: string; tradeDeadline: string; title: string; titleDate: string }> = {
  NFL: { label: "2026", regularSeasonEnd: "2027-01-10", tradeDeadline: "2026-11-03", title: "Super Bowl LXI", titleDate: "2027-02-14" },
  NBA: { label: "2026-27", regularSeasonEnd: "2027-04-11", tradeDeadline: "2027-02-04", title: "NBA Finals", titleDate: "2027-06-20" },
  NHL: { label: "2026-27", regularSeasonEnd: "2027-04-15", tradeDeadline: "2027-03-05", title: "Stanley Cup", titleDate: "2027-06-15" },
  MLB: { label: "2027", regularSeasonEnd: "2027-09-26", tradeDeadline: "2027-07-30", title: "World Series", titleDate: "2027-10-30" },
};

export const OFFICIAL_SOURCE: Record<League, string> = {
  NFL: "NFL.com official results and transactions",
  NBA: "NBA.com official results and transactions",
  NHL: "NHL.com official standings and transactions",
  MLB: "MLB.com official results and transactions",
};
