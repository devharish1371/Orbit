# Full-app cleanup evidence

Runtime `5810ab7`, 3 November 2026. All identities, messages, photos, coordinates and places
shown are synthetic disposable preview data. No real partner contact or real GPS test.

`layouts.json`: 150 measured states, both themes, actual widths 320/360/412 px. Fourteen pages:
Home, Map, Moments, Chat, Us, Keepsakes, Capsules, Timeline, Settings, Profile editor, Person,
Notifications, Activity and Call. Eleven additional states: storage disclosure, capsule form,
Ink/Glow/Paper, Photo/Voice/Mood entry, choices, replies and chat search. No measured document
or visible-control overflow; intentional scrollable map/carousel content is excluded from
control overflow checks. The microphone was never started and drafts/searches were cleared.

Fifty 360px DOM snapshots receive static Lighthouse accessibility/best-practice audits.
Snapshots have scripts removed, a doctype restored and local compiled assets. Final common
CSS is used consistently for earlier captures after the reading-surface alignment change.
These audits do not measure authenticated performance or native Android behavior.

Cold login, lock, error, offline and native permission/background paths also receive source
and regression review; they are not claimed as new physical-phone verification. Existing
offline/endurance/partner/soak gates remain open. Preview data and port 4173 are retained for
the user's review. Full findings and proposals are in ../../FULL_APP_AUDIT.md.

Final 50 cases: 100 accessibility / 100 best practices. An actual timeline contrast regression
was fixed; a transient update/loading capture in Keepsakes was replaced and rechecked.
audit-summary.json includes reviewed, non-scoring map-avatar label advisories.

Android run 41640760934 passes for final runtime 5810ab7. Artifact 13232777835 is verified
for ZIP integrity, signing continuity and configured-private-data scanning. See the audit
document for its download link and SHA256. Physical release gates remain unchanged.
