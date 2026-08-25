import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

crons.hourly(
  "cleanup-expired-draft-file-uploads",
  { minuteUTC: 17 },
  internal.fileLifecycle.cleanupExpiredDraftUploads,
  {}
);

crons.interval(
  "cleanup-stale-coupon-reservations",
  { minutes: 5 },
  internal.promotions.cleanupStaleReservations,
  {}
);

export default crons;

