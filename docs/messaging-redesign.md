# Messaging Schema Redesign Proposal

Problem:
- Current `Broadcast`/`Message` approach creates one `Message` row per recipient for broadcasts, which will bloat the `message` table quickly for large audiences.

Goals:
- Keep a single `Broadcast` record per announcement.
- Store per-recipient delivery metadata in a lightweight delivery table that can be archived/trimmed independently.
- Use batching for external email sends and record provider IDs in the delivery table.

Proposed schema additions:
- `Broadcast` (existing) remains as the canonical announcement.
- Add `BroadcastDelivery` table:
  - id
  - broadcastId -> Broadcast.id
  - recipientId (User.id)
  - channel (email/sms/push)
  - providerId (resend id)
  - status (PENDING/SENT/FAILED)
  - createdAt, updatedAt

Migration steps:
1. Create `BroadcastDelivery` model in Prisma schema.
2. Migrate code paths: when sending a broadcast, create the `Broadcast` then create `BroadcastDelivery` rows in `createMany` and batch send emails. Update deliveries with provider ids.
3. Stop creating full `Message` rows for broadcasts (reserve `Message` for direct one-to-one messages and threading).
4. Add archive/cleanup job to purge old `BroadcastDelivery` rows (keep aggregated metrics elsewhere).

Performance notes:
- Use `createMany` with chunking for delivery rows.
- Use `resend.batch.send` to reduce outbound requests.
- Consider a dedicated delivery queue (Redis + workers) for very large audiences.

Security & Privacy:
- Ensure broadcast content is sanitized.
- Respect unsubscribe preferences and audience resolution.

This design reduces table bloat and isolates per-recipient delivery metadata for easier cleanup and retention policies.
