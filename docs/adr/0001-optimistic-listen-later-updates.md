# Listen Later writes update the list in memory, without re-reading storage

Every write to the Listen Later List — add, remove, toggle listened — performs one storage operation and then updates the in-memory list locally, instead of re-reading the whole list afterwards. Reads are always ordered oldest first, which is what makes appending a new item correct.

## Considered options

The alternative was **authoritative order**: every write returns the full sorted list, so the display can never disagree with what is stored. It was rejected because the divergence it protects against does not exist — the displayed order is the stored order, appending a new item puts it exactly where a reload would, and the table re-sorts on its own as soon as a sort is chosen. It cost two storage round trips per interaction to guarantee something already true.

Before this decision the three writes behaved in three different ways: add appended in memory, while remove and toggle each re-read and re-sorted the entire list. The symmetry was worth having; it was cheaper to make all three optimistic than all three authoritative.

## Consequences

- A write that fails must leave the in-memory list untouched, so storage operations reject instead of swallowing errors, and every caller catches and reports.
- Appending assumes the oldest-first order. If that default order ever changes, appending becomes wrong and the callers have to re-read instead. The append sites say so in a comment.
- Nothing notices a second tab writing to the same list. That was already true — the old re-reads would have caught such a change by accident, on the next interaction, not by design. If the list ever needs to be correct across tabs, this decision is the one to revisit.
