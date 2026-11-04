# Places awaiting location verification

Decision: [issue #9](https://github.com/abhibansal60/explore-mullana/issues/9), option 1, 2026-11-04.

Hide Ambala Trading Co and Jain Metal & Plastic Store until their locations
are verified. Their shared MMDU campus coordinates cannot support useful
shop directions. Do not infer replacement coordinates.

`places-excluded.json` preserves the complete former public records, including
their slug identifiers, original coordinates and attribution. `source_name`
is the exact export name previously used by `places.py` to identify each row.
The original import did not retain upstream Overture IDs; none are invented here.
This archive is outside `src` and `public` and is never rendered.

Both source names have been removed from the importer's `PICK` allowlist.
Restore a listing there and in public data only after checking its real location.
The other places sharing the campus points are unchanged.
