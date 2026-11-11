## Clean & Eco architecture
- Sheets owns activity descriptions; a durable local outbox and review/card snapshots provide recoverable external writes and atomic recognition.
- Opaque hashed participant capabilities prove possession of a registration session, never ownership of an email address.
- Drive media remains private; all participant/admin/public media access checks ownership, approval and display consent before returning bytes.
- Shared syncSubmission runs after submission and review; Sheets URLs are private Drive links, while local staging retains recoverable originals.
- Appreciation cards snapshot template settings and approved totals; reviews supersede/revoke previous records without changing their stored fields.