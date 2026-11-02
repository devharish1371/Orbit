# Location refresh and map refinement

All captures use a disposable couple with synthetic identities and coordinates. The two
original dark waiting/updated captures were recorded on 1 November; the final light/dark
layout captures and narrow waiting state were recorded on 3 November 2026.

`layouts.json` records actual viewport/scroll widths and control bounds at 320, 360, 412
and 480 px in both themes. No horizontal overflow was found. Refresh targets are at least
44 px tall and communication targets are 48 px tall. The final 320 px pending action and
its status text were also contained. These browser checks do not replace Android text
zoom, background GPS or second-phone acceptance.

The updated state was verified by publishing a new synthetic fixture fix. It is proof of
the UI/Realtime timestamp transition, not proof of GPS on a physical phone. The unchanged
old timestamp stayed visible during waiting. The final build also clears feedback from
old requests instead of retaining a stale success/timeout message on a later visit.

Both updated 360 px map DOM audits score 100 accessibility / 100 best practices. The
non-scoring visible-label advisory concerns map marker avatar initials; their accessible
names contain the full person's name and battery level. Static capture URLs were normalized
to the audit server origin after the first audit caught a cross-origin stylesheet blocked
by the captured page's CSP. The running app's CSP was not changed.
