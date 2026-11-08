## Clean & Eco architecture
- Sheets owns activity descriptions; a durable local outbox and review/card snapshots provide recoverable external writes and atomic recognition.
- Opaque hashed participant capabilities prove possession of a registration session, never ownership of an email address.
- Drive media remains private; all participant/admin/public media access checks ownership, approval and display consent before returning bytes.