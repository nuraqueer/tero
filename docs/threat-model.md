# Threat model

Who might attack Tero or its members, and how we defend.

| Who                                                      | Danger                                                          | Defences                                                                                                                                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The state** (police, courts, surveillance)             | Requests for data, network monitoring, blocking the site        | No servers or operators in hostile countries; Cloudflare holds only ciphertext; ECH hides the site name; Tor route; PWA and direct Android download                                                                                      |
| **Infiltrators** posing as members to trap people        | Entrapment, outing people                                       | Invite and vouch; Sequence gates; in-person confirmation codes on Tero cards; coarse location only; inviters accountable                                                                                                                 |
| **Blackmailers**                                         | Screenshots, threats to out someone                             | Pseudonyms; chats clear by default; screenshot alerts; fast reporting and banning                                                                                                                                                        |
| **Family, partners, checkpoints** with the phone in hand | Forced unlock                                                   | Passcode on every open; decoy passcode with silent duress alert; panic wipe; no notification previews                                                                                                                                    |
| **Scammers**                                             | Fake HRT couriers, fake fundraisers                             | Trust votes only after a confirmed handover; donations checkable on the blockchain; verified badges                                                                                                                                      |
| **Rogue admin or insider**                               | Abusing the dashboard                                           | Council quorum votes; append-only logs; no admin can read private messages                                                                                                                                                               |
| **Hackers**                                              | Server breach                                                   | Only ciphertext stored; ID documents deleted after verification; keys live on phones, so there are no passwords to steal                                                                                                                 |
| **Copied browser data**                                  | Someone copies a web user's browser storage and guesses offline | On the web the device secret sits beside the vault, so the web asks for a passphrase of at least 10 characters instead of 6 digits. Phones keep the secret in secure hardware. People in high-risk places are pointed to the phone apps. |
| **Key theft**                                            | Someone steals a member's keys                                  | Keys in secure hardware behind the passcode; duress alert; the council can ban a stolen key; recovery moves the person to new keys                                                                                                       |
| **Platform takedown** (app stores, domain, payments)     | Losing the app                                                  | PWA plus direct Android download; signed offline bundles; no payment companies involved                                                                                                                                                  |

## Data rules

1. Collect the minimum. If we don't have it, nobody can take it.
2. Sensitive data is encrypted on the device before it leaves.
3. Verification documents are deleted after the decision.
4. The invite tree and who-talks-to-whom are treated as sensitive.
5. Location is city level at most.

## Honest limits

No system makes a person untraceable. Spyware on a phone, or someone
forced to unlock it, defeats most protections. Tero tells members this
plainly, especially in high-risk countries.
