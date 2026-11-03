# Connected flow checks — 3 November 2026

`place-edit-360.png` is the final rendered 360 × 800 day-theme editor on the disposable
fixture. Circle checks are 24 × 24 with 44 px labels; native input semantics and focused
keyboard controls remain. Earlier transient captures were replaced/excluded after comparing
rendered controls with DOM bounds. `layout.json` records settled 320/360/412 px geometry in
both themes; no horizontal sheet overflow. These measurements are not device text-zoom proof.

Cancel returned focus to Edit place without saving. In Chat, Escape closed the expiry dialog
while keeping its tray, then closed the tray and focused + without changing the route.
Message-menu Escape/focus regression assertions were added after the browser pass.
No actual place save/delete, partner contact, push or phone network interruption occurred.

Android Back is covered by mocked bridge tests and native CI; physical keyboard/predictive
Back/gesture acceptance remains in the user's deferred batch. Avatar/photo motion handoffs
and the rest of V2.2 remain planned. The fixture's original day theme was restored.

Final regression: Map reload remained usable across the next build replacement before
applying Update Orbit. After the focus fix update, message-action Escape returned to Message
options on the same Chat route. The screenshot predates only that invisible focus correction.
