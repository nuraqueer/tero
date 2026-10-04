# Countries

Tero is global. A country is **data, not architecture**: each country has
its own pack, and the app adapts to it.

## Country pack

| Field | Example use |
|---|---|
| Risk level | Decides default safety settings. High risk turns on the duress alert, card recovery and 24-hour wait, offers the Tor route and uses stricter Sequence gates. Can be set for part of a country (for example a US state). |
| Warnings | Shown before sensitive features, such as laws on medication or on queer people |
| Laws | Plain summary, reviewed by verified lawyers |
| Resources | Hospitals, pharmacies, HRT providers, surgeons, clinics, NGOs, emergency contacts |
| Estimates | Costs and what to expect, for HRT and surgeries |
| Professionals | Which verification flows exist there (medical register, bar list and so on) |
| Languages | Which of the app's languages to suggest |

Country packs are published as **signed offline bundles**, so they keep
working when the site is blocked or the internet is down.

## Rules

- Packs are written and checked by verified members and professionals from that country, then approved by the relevant card holder.
- High-risk packs never show member names or activity, even to members, unless the member chooses.
- Travel and HRT help is limited to what is legal to carry for personal use, with the country's warnings shown first.
