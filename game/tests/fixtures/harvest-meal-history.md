# Harvest meal migration fixtures

`harvest-meal-v5.json` and `harvest-meal-v6.json` were captured before schema7 edits, from the schema6 runtime at commit `fe86624`.

These are synthetic regression records, not a user's private save. The v6 runtime's `validateProgress` accepted the v6 record, and its `migrateProgress` accepted the v5 record before either file was written. The v5 record uses the historical food key set and excludes the v6 leaf node/item. Do not regenerate these fixtures from a future `initialProgress()` or food catalog.

They include revision47, nonzero crop/food counts, existing apple-jam/juice costs, a gift postcard, photo metadata/wall placement, and settings. The independent test additionally supplies a synthetic photo-store string to verify byte preservation; it does not claim to decode or render that string as a photo.

The v1–v4 cases in the test derive older field shapes from the frozen v5 record. They verify migration routes, and are explicitly distinct from captures of actual v1–v4 applications or real user saves.
