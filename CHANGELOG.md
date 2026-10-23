# Changelog

## [0.1.2](https://github.com/clericlvl2/combat-planner-v2/compare/v0.1.1...v0.1.2) (2026-10-23)


### Features

* **api:** a shared link turns off 15 minutes after the DM signs out everywhere ([f65ec62](https://github.com/clericlvl2/combat-planner-v2/commit/f65ec6287b74f1f0c4b421780923cf6da5ac32e0))
* **deploy:** Google and GitHub sign-in on the server, and www redirects to the bare domain ([20f4821](https://github.com/clericlvl2/combat-planner-v2/commit/20f4821a138328f5c03a6709c90ca91009d359ce))
* **ui:** a player without a hero for 15 minutes is asked to reconnect ([686e076](https://github.com/clericlvl2/combat-planner-v2/commit/686e076dc77e1d923b2c6a3b21841dc79c48642d))
* **ui:** the Account screen signs out on other devices ([f45f96a](https://github.com/clericlvl2/combat-planner-v2/commit/f45f96a6603556faf1b3b1d1fcd2e1a1025c9adf))


### Bug Fixes

* **api:** a client over its per-minute request budget gets 429 with Retry-After ([919b815](https://github.com/clericlvl2/combat-planner-v2/commit/919b815390555119deec2ef63f3494439f0cdd2d))
* **api:** a combat admits at most 12 players ([28814f3](https://github.com/clericlvl2/combat-planner-v2/commit/28814f306bf0d474d7f9fd0d42e05e0092a45cc7))
* **api:** a combat's action log keeps only what undo can reach ([6a555f2](https://github.com/clericlvl2/combat-planner-v2/commit/6a555f2a49d5efd0f8ded9421e692dad1ec2e1a8))
* **api:** a DM keeps at most 25 tags ([72d3f27](https://github.com/clericlvl2/combat-planner-v2/commit/72d3f27bb29e72f7648fe70eef59df27c8e9b4c3))
* **api:** a DM who signs in again keeps the shared link ([5f90978](https://github.com/clericlvl2/combat-planner-v2/commit/5f90978c5bfbbe3bdc2bc6399eca761c22c1ecf4))
* **api:** a player acts only with the key the server issued ([f8de070](https://github.com/clericlvl2/combat-planner-v2/commit/f8de070cea3635a1bb8648125caaf806c8f3c9e2))
* **api:** a request body over 64 KB is refused with 413 ([e193727](https://github.com/clericlvl2/combat-planner-v2/commit/e193727f53d2bdefcabe984058fa85ab91731396))
* **api:** a stored preset with more than 25 tags still loads in the Library ([9be29dc](https://github.com/clericlvl2/combat-planner-v2/commit/9be29dc207457e4034c15020916c5bdb40ac8859))
* **api:** a write waits up to 5 s for a lock instead of failing with SQLITE_BUSY ([1ded556](https://github.com/clericlvl2/combat-planner-v2/commit/1ded55660d52690940afd39e28debb5d26cca71e))
* **api:** a write waits up to 5 s for a lock; deploy files for a VPS ([f30871e](https://github.com/clericlvl2/combat-planner-v2/commit/f30871e429018068a80667cd298739c9e1f8ec87))
* **api:** every response carries HSTS, a strict content security policy and anti-framing headers ([f43c582](https://github.com/clericlvl2/combat-planner-v2/commit/f43c582bfc33c8a5b2fd3041289fb3726620f1d1))
* **api:** heroes claimed before the update can be claimed again ([eef292b](https://github.com/clericlvl2/combat-planner-v2/commit/eef292b8c9c1b807b4ac929ca6769fdaf7b53ed1))
* **api:** tables sharing one address get separate play, action and live-update budgets per combat ([2e0d9b0](https://github.com/clericlvl2/combat-planner-v2/commit/2e0d9b0ea686404239f8d6ec91e8432195222053))
* **api:** the 6th email sign-in or 4th sign-up from one address within a minute gets 429 ([932f257](https://github.com/clericlvl2/combat-planner-v2/commit/932f25732aba99cc633f5c427520ce221b805cba))
* **api:** the update marks as shared only combats with players ([d9f193d](https://github.com/clericlvl2/combat-planner-v2/commit/d9f193dbc44144d05297921d05001b73acf3248e))
* **domain:** a unit's HP history keeps its newest 100 entries ([9f1f46b](https://github.com/clericlvl2/combat-planner-v2/commit/9f1f46b6a36317a1a714c0e4b23e626369bd1513))
* **domain:** claiming a hero leaves the DM's undo untouched ([49f9095](https://github.com/clericlvl2/combat-planner-v2/commit/49f90957830980205f5671c2d61d876b927dd659))
* **domain:** undo works as a stack of the last 10 actions ([236ca40](https://github.com/clericlvl2/combat-planner-v2/commit/236ca405b9818b893f3452fc9096d78f06b54de3))
* **server:** one broken combat no longer stops link and player timeouts ([d23e996](https://github.com/clericlvl2/combat-planner-v2/commit/d23e996b1e52cedb2a3a3ce4e6808302063f6eb8))
* **server:** shortened test timers never apply in production ([651bd59](https://github.com/clericlvl2/combat-planner-v2/commit/651bd5978af3f80d37f90462c017c05323e2d89f))
* **ui:** the Library says when the tag limit is reached ([cf99db3](https://github.com/clericlvl2/combat-planner-v2/commit/cf99db34b15c9ee24f789cbf801184bd172d1084))
* **ui:** too many requests shows "wait a minute" instead of wrong credentials or a generic error ([67d5bdf](https://github.com/clericlvl2/combat-planner-v2/commit/67d5bdf1475ed054964424724beb8fd9cd39c6cf))

## [0.1.1](https://github.com/clericlvl2/combat-planner-v2/compare/v0.1.0...v0.1.1) (2026-10-22)


### Features

* **api:** a new account takes its language from the sign-up Accept-Language header ([7a05ab0](https://github.com/clericlvl2/combat-planner-v2/commit/7a05ab01f5a607856a1498beade2ad4e6a8aa6be))
* phone layout from 320 to 440 and a phone frame on wide screens ([5ae0943](https://github.com/clericlvl2/combat-planner-v2/commit/5ae0943320695e1d950bbb4c1ce91cd4b455beae))
* **ui:** a labelled stepper shows its value under the label with the keys on the right ([08981af](https://github.com/clericlvl2/combat-planner-v2/commit/08981afebb671d4c50de3812bee3deb1b37683ec))
* **ui:** a preset card opens on tap, with chips under the name and an HP box on the right ([3e63a8a](https://github.com/clericlvl2/combat-planner-v2/commit/3e63a8a321ef66f6d1b12581645c635f8b4f54fc))
* **ui:** an HP history row shows the change type over its round on two lines ([65881bd](https://github.com/clericlvl2/combat-planner-v2/commit/65881bd9d5bbb3358e528af09308e3f775dd7177))
* **ui:** an icon-only tool shows its count as a badge on the corner ([02b9ee2](https://github.com/clericlvl2/combat-planner-v2/commit/02b9ee2b6554e6702e16770bd108ca64da3c7476))
* **ui:** defenses show as three white chips on one line ([76d5f20](https://github.com/clericlvl2/combat-planner-v2/commit/76d5f2084d327b19839c3810ef2ef1fab3d79427))
* **ui:** forms keep the focused field visible when the keyboard opens ([a8ce326](https://github.com/clericlvl2/combat-planner-v2/commit/a8ce326d4949a5947a690fff67a3f10859d9f687))
* **ui:** HP history lines up its two-line rows and scrolls after six of them ([4275f0c](https://github.com/clericlvl2/combat-planner-v2/commit/4275f0c1cf8788b86abd5e989c2811715df77ecb))
* **ui:** player rows show [@player](https://github.com/player) on the name line and keep the note in the middle column ([1486b63](https://github.com/clericlvl2/combat-planner-v2/commit/1486b632f8a562a06a0c33d58dfbe62c54a449c5))
* **ui:** players follow the combat on the same header ticket, with Heroes in its menu ([330f3cf](https://github.com/clericlvl2/combat-planner-v2/commit/330f3cfedfdbccfc6dd5ccf7ede944dbda319dab))
* **ui:** sign-up and sign-in show the logo beside a smaller title ([908a429](https://github.com/clericlvl2/combat-planner-v2/commit/908a429683e864a6c9a73b8a5e48d6e60ed601c2))
* **ui:** the combat header shows round and escalation on a ticket under the title ([b149eb0](https://github.com/clericlvl2/combat-planner-v2/commit/b149eb01bfcdef227f4715393fed94ce9b4190ea))
* **ui:** the HP box shows a status tint, two pips and a temp badge ([366472c](https://github.com/clericlvl2/combat-planner-v2/commit/366472c3cd8b4afa8e573f37a7be7b5ba92c652b))
* **ui:** the HP calculator shows two pips and a temp badge, a 4-column keypad and Damage over the other actions ([02dcb57](https://github.com/clericlvl2/combat-planner-v2/commit/02dcb5788e178c123507cdab90de380e3a12aa12))
* **ui:** the page header search row fits 320 with square Sort and Tags tools ([591c2f7](https://github.com/clericlvl2/combat-planner-v2/commit/591c2f7633085cbdbb164198134370598c90628e))
* **ui:** the role spine is 48 wide with the initiative over a caps role label ([59b6683](https://github.com/clericlvl2/combat-planner-v2/commit/59b6683cc97db60bf087ceaea39e6c3fee1ca968))
* **ui:** the share sheet copies through a round icon button beside the link ([083385e](https://github.com/clericlvl2/combat-planner-v2/commit/083385e4b369c1b80dc17ebb9d695a8748182620))
* **ui:** the unit row taps open by its name, shows [@player](https://github.com/player) and a one-line note ([486699d](https://github.com/clericlvl2/combat-planner-v2/commit/486699d2cb27ac30473d74d857a4be398e848489))
* **ui:** unit and preset forms use the labelled steppers without the value pill ([ac925b9](https://github.com/clericlvl2/combat-planner-v2/commit/ac925b905afd3ccc3a8818be330434eab7cbed6f))
* **web:** a wide window shows the app as a centered phone column ([a14e7dd](https://github.com/clericlvl2/combat-planner-v2/commit/a14e7dd190a9a76440c7ee20814669c4dca5213c))
* **web:** a wide window shows the app as a white phone frame on a dotted field ([614d79a](https://github.com/clericlvl2/combat-planner-v2/commit/614d79a07f27e2ccff7ba4d362b14a1f0ff9b6a4))
* **web:** a window from 1180 wide shows the app name and tagline left of the phone frame ([bcf2670](https://github.com/clericlvl2/combat-planner-v2/commit/bcf2670c936714a2b86eb949cab18778f2bf23e2))


### Bug Fixes

* **ui:** a claimed hero's [@player](https://github.com/player) flows on the same line as the end of the name ([c5e7bde](https://github.com/clericlvl2/combat-planner-v2/commit/c5e7bde8008fc3287a12fcda96ef91d858a38bf4))
* **ui:** a disabled active status chip is greyed out ([490c05e](https://github.com/clericlvl2/combat-planner-v2/commit/490c05ec5ced16f2bb612738a7605326999cbb32))
* **ui:** a disabled active tag chip is greyed out ([a7b8b5b](https://github.com/clericlvl2/combat-planner-v2/commit/a7b8b5baf5eeb76f883c8cc652556b655f6953bf))
* **ui:** a labelled stepper shows its focus outline in the focus state ([0eb844a](https://github.com/clericlvl2/combat-planner-v2/commit/0eb844a58bef8f80e1d1c9cd3c506b2f21f3559d))
* **ui:** a message screen with long text scrolls on a short phone ([7ed5e96](https://github.com/clericlvl2/combat-planner-v2/commit/7ed5e96379a8f61b5c9fb4c7c9f3e897bc90aebd))
* **ui:** a sheet fits the height of the phone column ([1e91c73](https://github.com/clericlvl2/combat-planner-v2/commit/1e91c7314ab095ed93ba3281d8237cc5033e6064))
* **ui:** a toast action moves under the message when the message would get too narrow ([7472cb4](https://github.com/clericlvl2/combat-planner-v2/commit/7472cb48043ef383345c16b24886e2b2e36f0457))
* **ui:** an action after the session expired leads to sign-in ([efbdec2](https://github.com/clericlvl2/combat-planner-v2/commit/efbdec2a09f1837feef6d5fe9da2349fd8ddbb5f))
* **ui:** an open preset card in a long library list keeps its height and its actions stay tappable ([d9f7de7](https://github.com/clericlvl2/combat-planner-v2/commit/d9f7de7f06a9902e19a25b067d24b419069b32ba))
* **ui:** card spines keep their rounded corners whatever order the styles load in ([e288c71](https://github.com/clericlvl2/combat-planner-v2/commit/e288c717cc4a492f99e6f02e507cbc97b4283b47))
* **ui:** dialog buttons stack when their labels do not fit side by side ([a19d371](https://github.com/clericlvl2/combat-planner-v2/commit/a19d371b530269bb2bb733c3d1ce8ba6d9d880ff))
* **ui:** numpad actions stay visible in the sheet footer on small phones ([b9eb40b](https://github.com/clericlvl2/combat-planner-v2/commit/b9eb40b24a2c4ddbcf517358cb8cda10bced34be))
* **ui:** page header tools and the header button wrap to a new line on narrow phones ([695b50f](https://github.com/clericlvl2/combat-planner-v2/commit/695b50f639af56f20d39a05a53f15118b2133164))
* **ui:** player rows on narrow phones fit condition chips, notes and wrapped detail labels ([4db6855](https://github.com/clericlvl2/combat-planner-v2/commit/4db68553e28149375f04770cebfa212e02a2469f))
* **ui:** sheets stay within the visible viewport height ([1eccf4e](https://github.com/clericlvl2/combat-planner-v2/commit/1eccf4e8ac62efbf85969718d24af5255c7e9f66))
* **ui:** the bottom bar hint wraps to two lines instead of cutting off ([a90b13c](https://github.com/clericlvl2/combat-planner-v2/commit/a90b13ce1f08b729970c1f14c8b07fd9d6b2f978))
* **ui:** the condition picker shows one column on narrow phones ([39958fe](https://github.com/clericlvl2/combat-planner-v2/commit/39958fe8aecbf1c159cbdd63e885e267ca4d3502))
* **ui:** the drawer leaves a 56 px scrim on narrow phones ([52da321](https://github.com/clericlvl2/combat-planner-v2/commit/52da3219650c09c423cb6221d42e5c66daa54df1))
* **ui:** the drawer width follows the phone column ([e4c5005](https://github.com/clericlvl2/combat-planner-v2/commit/e4c50057f7dd5a26de260ac2a45e700b1c768f8c))
* **ui:** the escalation picker shows all seven faces in one row when the screen is wide enough ([11c5728](https://github.com/clericlvl2/combat-planner-v2/commit/11c5728cb09b68f1759fcb9b11ccac2c14800a33))
* **ui:** the German ally label breaks at a syllable with a hyphen ([a9d8bff](https://github.com/clericlvl2/combat-planner-v2/commit/a9d8bff0ab69cec89e5f82d48ecad2f1ac5de26a))
* **ui:** the German temp and max HP keys fit their buttons ([7ad4c57](https://github.com/clericlvl2/combat-planner-v2/commit/7ad4c57c106cbde0657490d5b20a802950cb9bb6))
* **ui:** the initiative popover stays inside the phone column ([4e78f0c](https://github.com/clericlvl2/combat-planner-v2/commit/4e78f0cf01db62afd6507aa17a5f1bd12e4a1b14))
* **ui:** the toast close button stays centred when the action moves under the message ([da93ca4](https://github.com/clericlvl2/combat-planner-v2/commit/da93ca4e9aa325c30aa80bbdea3d0552a1663b01))
* **ui:** the turn bar cuts a long blocked reason with an ellipsis ([3605808](https://github.com/clericlvl2/combat-planner-v2/commit/3605808346b950af0872f4d7afb0ded27bf1ff9d))
* **ui:** the turn bar wraps long titles and hints to two lines ([cd87a00](https://github.com/clericlvl2/combat-planner-v2/commit/cd87a0092f48d664d2fbc83dfa523a2e5ff78785))
* **ui:** unit and preset forms fit a 320 px phone in every language ([7dc1be8](https://github.com/clericlvl2/combat-planner-v2/commit/7dc1be89622db174ed3502daedcb10bd68de13f6))
* **web:** only touch and pen open the drawer from the screen edge ([0718491](https://github.com/clericlvl2/combat-planner-v2/commit/07184919c20a660ace6a170c3ac050d6fcd92f28))
* **web:** the edge swipe opens the drawer from the column's left edge ([ead03e5](https://github.com/clericlvl2/combat-planner-v2/commit/ead03e550142cc0338b9f1bd3b0299ece8360240))
* **web:** the wide-window phone frame has softer 28px corners ([dce09cf](https://github.com/clericlvl2/combat-planner-v2/commit/dce09cfe0da02e29501c86356acc77c617537a54))

## 0.1.0 (2026-10-20)

First public release.

- DM accounts with email sign-in, plus Google and GitHub when configured.
- Combats with heroes, enemies and allies; units come from the form or from a library of presets with tags.
- Initiative order, rounds, the escalation die, and undo for the last actions.
- HP calculator for damage, healing, temp HP and max HP, with a per-unit HP history.
- 13th Age conditions and health statuses: wounded, staggered, dead.
- Player link and QR code: players claim their heroes and follow the combat live, without seeing enemy HP or defenses.
- Interface in English, German, Spanish, French, Japanese and Russian.
- Self-hosting with one Docker image and SQLite; secrets are generated on first start.
