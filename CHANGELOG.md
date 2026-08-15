# Changelog

## [0.10.0](https://github.com/Thomasevano/musickeeper/compare/v0.9.0...v0.10.0) (2026-08-15)


### Features

* wire error pages with Inertia and navigation ([d0c6ca8](https://github.com/Thomasevano/musickeeper/commit/d0c6ca803f38c44b4f077a14e188e74e7f92451e)), closes [#54](https://github.com/Thomasevano/musickeeper/issues/54)

## [0.9.0](https://github.com/Thomasevano/musickeeper/compare/v0.8.1...v0.9.0) (2026-08-13)


### ⚠ BREAKING CHANGES

* **deps:** the frontend now requires the Inertia v3 client, Vite 8, and `@sveltejs/vite-plugin-svelte` 7.
* **deps:** requires Node.js 24 or above.

### Features

* **listen-later:** show link fetch progress ([11a17c2](https://github.com/Thomasevano/musickeeper/commit/11a17c2750a80aaefb80b4ee89b9e89167be5e6f)), closes [#45](https://github.com/Thomasevano/musickeeper/issues/45)
* **ui:** mobile-first library and touch targets ([7b08741](https://github.com/Thomasevano/musickeeper/commit/7b087414528fb34844d6f7bf28bfdd4163b91955))


### Bug Fixes

* **a11y:** announce a sort change ([9936eb7](https://github.com/Thomasevano/musickeeper/commit/9936eb750b581f5e84afd396b55cf1780cabeec9)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** announce the state the duplicate dialog resolves to ([7e0ce6a](https://github.com/Thomasevano/musickeeper/commit/7e0ce6ae78d0f53f0acb8ac995c2e87ce37fb983)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** bring the palette to WCAG AA in light and dark ([b7aad49](https://github.com/Thomasevano/musickeeper/commit/b7aad49d38bb9660c6a7d2952fdcd6cb86d0bb96)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36)
* **a11y:** give a result option its artists ([3b77328](https://github.com/Thomasevano/musickeeper/commit/3b77328b164d3a41c5a7a9537d4db090b2e710c3)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** head each row with its title ([71285bb](https://github.com/Thomasevano/musickeeper/commit/71285bbf84665d410243457fbd04b0f384c2ad0f)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** head every column with its own name ([6cae89a](https://github.com/Thomasevano/musickeeper/commit/6cae89a4eee5233bfef979647676a34e25cf87bd)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** hold the columns menu open on a tick ([2041c0a](https://github.com/Thomasevano/musickeeper/commit/2041c0a73b61ebd15438e2cf85bb22817ec01b2c)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** honour prefers-reduced-motion on every animated surface ([061af45](https://github.com/Thomasevano/musickeeper/commit/061af458238c22105d1915fa7e3222d6f7141bb0))
* **a11y:** keep the row badges from reading as pictures ([31261e1](https://github.com/Thomasevano/musickeeper/commit/31261e1bba4bdf6b61a5a7ca647e39747e9ff3ab)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** kill the tap delay on interactive controls ([cd358d4](https://github.com/Thomasevano/musickeeper/commit/cd358d4f823b7d9acb0e021c5f1c36d7e4c5ac3d)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36)
* **a11y:** let a menu paint before it takes focus ([990086a](https://github.com/Thomasevano/musickeeper/commit/990086aa859a1a7bfcf9f26608ec5f1333da0c91)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** let the platform draw the selects ([f653ea0](https://github.com/Thomasevano/musickeeper/commit/f653ea08844349e6f7c2beb31dd1f8e39122743b)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** let the results listbox own its options ([60cc2d4](https://github.com/Thomasevano/musickeeper/commit/60cc2d4dd4e4f8063cb542a2f4fb3192004a266d)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** let the select triggers say what they hold ([ba5d2d6](https://github.com/Thomasevano/musickeeper/commit/ba5d2d68bd1c4cacb41102bb01d004a7cd45f6ea)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** name a result option by what it prints ([45ce718](https://github.com/Thomasevano/musickeeper/commit/45ce7183117c8d50518c085b0a69683d522821f8)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** name every row menu after its item ([21e07a3](https://github.com/Thomasevano/musickeeper/commit/21e07a38327e5db65d93bb51e2dbc94c2ce26561)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** name the dialog a reader lands on ([60f8719](https://github.com/Thomasevano/musickeeper/commit/60f8719ac469c78e6df43329c87100cf24151b5e)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** name the item each menu action acts on ([d5d9049](https://github.com/Thomasevano/musickeeper/commit/d5d90492ed1d24031e6acf93903fd7361e5613ec)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** name what the delete dialog will remove ([e4a3d18](https://github.com/Thomasevano/musickeeper/commit/e4a3d189b917271d7b461f915335998a3ca8ef06)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** put the artists in every list toast ([e10d114](https://github.com/Thomasevano/musickeeper/commit/e10d1143809d52e6e103cc01da227fe37ccbcb59)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** say "artists" where a duplicate needs the whole set ([de51506](https://github.com/Thomasevano/musickeeper/commit/de51506dc0469c6d3cf56257d5e274d7f10340ca)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36)
* **a11y:** say when an item is marked listened ([25e7a4e](https://github.com/Thomasevano/musickeeper/commit/25e7a4e79783d28a8eb1ae82a87d628ba9e90a8e)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** say which key reaches the search results ([58fba3a](https://github.com/Thomasevano/musickeeper/commit/58fba3a8b392338e07cca3ffa5e088537c04721b)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **a11y:** say which row a control belongs to ([547192e](https://github.com/Thomasevano/musickeeper/commit/547192e45779ec0b98585f370c0414cea3a53f47)), closes [#36](https://github.com/Thomasevano/musickeeper/issues/36) [#56](https://github.com/Thomasevano/musickeeper/issues/56)
* **ci:** declare a build decision for core-js ([b529988](https://github.com/Thomasevano/musickeeper/commit/b52998874edc0aaad8e25759cc7feefbede76d4d))
* **search:** pulse a skeleton block for the cover while results load ([82e89fd](https://github.com/Thomasevano/musickeeper/commit/82e89fda3273fdb00c832d103a5f5003b1d7074a))
* **types:** check Svelte frontend ([f3e13dc](https://github.com/Thomasevano/musickeeper/commit/f3e13dc11a7cf8d4fe5cf33ebf550608a0b37dd8)), closes [#52](https://github.com/Thomasevano/musickeeper/issues/52)
* **ui:** correct mobile list controls ([e121908](https://github.com/Thomasevano/musickeeper/commit/e1219086e541cefb6fd7c17e77550973d9f92e43))
* **ui:** correct the default mobile sort label ([51c4500](https://github.com/Thomasevano/musickeeper/commit/51c45003363b5a8b22eb49a46838666f3b0ead2d))
* **ui:** hide the column chooser on mobile ([04ebb5b](https://github.com/Thomasevano/musickeeper/commit/04ebb5b25daa8b4b9d165b290ed594b195ead73a))
* **ui:** make library page mobile-first ([3a1480e](https://github.com/Thomasevano/musickeeper/commit/3a1480e067598021bd26acc81e16880b5435cb1c))
* **ui:** refine mobile cards and list controls ([9001b91](https://github.com/Thomasevano/musickeeper/commit/9001b91a61946d0dd2f7e33d0dd9b8a130d7396f))
* **ui:** widen max container width to screen-2xl ([091eaf3](https://github.com/Thomasevano/musickeeper/commit/091eaf39c6924a80b0299e803ffa570c9bf16530))


### Performance Improvements

* **link:** stop searching for cover art the platform already supplied ([1634366](https://github.com/Thomasevano/musickeeper/commit/1634366f44d946bcad958be20c40fcab3bf6c865))
* **search:** cache MusicBrainz search results in memory ([29a3386](https://github.com/Thomasevano/musickeeper/commit/29a3386691b282c0b3f8bf89b5578308a245c722))
* **search:** derive cover art urls instead of fetching them per result ([f8ee406](https://github.com/Thomasevano/musickeeper/commit/f8ee406da22760ee21505583a6db99ca8afa3704))
* **ui:** render added items before external links resolve ([482f09a](https://github.com/Thomasevano/musickeeper/commit/482f09ae6df358d77d545ff66633f7c070084c0e))


### Miscellaneous Chores

* prepare release 0.9.0 ([399bf8a](https://github.com/Thomasevano/musickeeper/commit/399bf8a7d73f8c68729732638b0b395a6bd2e116))


### Build System

* **deps:** adopt Inertia v3 ([917a2e3](https://github.com/Thomasevano/musickeeper/commit/917a2e32e89dc9997a0be1d5ff05425e1ebad962))
* **deps:** upgrade to AdonisJS v7 ([e5d64e8](https://github.com/Thomasevano/musickeeper/commit/e5d64e86b38ccbf5b4a298095cd6f53cd75f719f))

## [0.8.1](https://github.com/Thomasevano/musickeeper/compare/v0.8.0...v0.8.1) (2026-07-30)


### Bug Fixes

* **search:** allow artist-only searches ([b37f6b8](https://github.com/Thomasevano/musickeeper/commit/b37f6b8a7d667f0646f8e395c77e231f01c16607))
* **search:** omit empty title query ([9a92f67](https://github.com/Thomasevano/musickeeper/commit/9a92f676f5a68ab2f2c17f79e2e2bc19c3651810))


### Performance Improvements

* **docker:** builds natifs par architecture et image runtime minimale ([38a88b0](https://github.com/Thomasevano/musickeeper/commit/38a88b05a4fe4a84727d2601c7dd1e78da54b958))

## [0.8.0](https://github.com/Thomasevano/musickeeper/compare/v0.6.0...v0.8.0) (2026-07-25)


### Features

* add releaseDate column to listenlateritem ([48a16ab](https://github.com/Thomasevano/musickeeper/commit/48a16ab0622825c7537a78763f409f9ecf89e80c))
* **api:** add GET /api/links endpoint ([0500af8](https://github.com/Thomasevano/musickeeper/commit/0500af838072ed66490db32cede62ff2b3f79ea6))
* **domain:** add ExternalLink type and platform registry ([b6402b4](https://github.com/Thomasevano/musickeeper/commit/b6402b4271a6a91756174945dc0b9b989b98eddf))
* fetch external links when adding items to listen-later ([1a56279](https://github.com/Thomasevano/musickeeper/commit/1a56279fb1aa7f106b0eed4c6c5a0130f0db027e))
* filter on list item status ([dde901c](https://github.com/Thomasevano/musickeeper/commit/dde901cefca62ab66ddc2a7e00fb64bf14ca82d7))
* filter on listenlateritem type ([b780ced](https://github.com/Thomasevano/musickeeper/commit/b780ced1e46438e4972261c60b899d1fc1092e36))
* **front:** add link to platform on listenlateritem ([8d36262](https://github.com/Thomasevano/musickeeper/commit/8d36262a6c49adb7609c3fe1452b2b961a381374))
* **links:** add MusicBrainz external links service ([5aa8961](https://github.com/Thomasevano/musickeeper/commit/5aa89613b642d75435470c2324c38ca084d918d1))
* **search:** add platform search service for Deezer, Apple, Qobuz, Bandcamp ([ee3544f](https://github.com/Thomasevano/musickeeper/commit/ee3544f21b44ec70ad9e30639b75614b8af06e56))
* sort by title, artist and added date ([fd061aa](https://github.com/Thomasevano/musickeeper/commit/fd061aa3cfb5bd12bd0597404502f7c3d62db26e))
* **storage:** add externalLinks field with DB migration v3 ([a01057e](https://github.com/Thomasevano/musickeeper/commit/a01057ee76b1ca23a07941fcb822def0d6e609a6))
* **ui:** add Links column to listen-later table ([faf0c19](https://github.com/Thomasevano/musickeeper/commit/faf0c198972111837afcca4adf66b652cd3531e9))
* **ui:** add logo ([a756afc](https://github.com/Thomasevano/musickeeper/commit/a756afca97df8f7b66a73d2409a33969921034e2))
* **ui:** animate status badge on listened toggle ([baae37e](https://github.com/Thomasevano/musickeeper/commit/baae37e30589155d43dfcfb61c5af8bdfc63ae09))
* **ui:** use a badge and icon for listenlateritem type ([2c485d2](https://github.com/Thomasevano/musickeeper/commit/2c485d25b3e2987c6ae3fcc8726333d1aa69cbcc))
* **ux:** confirm delete dialog ([9932ac8](https://github.com/Thomasevano/musickeeper/commit/9932ac8efa04160aa88f637171b8ff8b5b965450))


### Bug Fixes

* **a11y:** error pages ([cdd8925](https://github.com/Thomasevano/musickeeper/commit/cdd89255e54e49ed86b83422d37f4ba71f4914b3))
* **a11y:** landing components ([d1816af](https://github.com/Thomasevano/musickeeper/commit/d1816af9bdab7ffd38302d0fe890ed19f7056187))
* **a11y:** listen-later and confirm dialog component ([f6803ac](https://github.com/Thomasevano/musickeeper/commit/f6803acb734ee6111db3545f94ebab54c76f8ad9))
* **a11y:** navigation ([8fc9859](https://github.com/Thomasevano/musickeeper/commit/8fc98591c470ac6c7d6bc08caac7119f7d9da59c))
* **a11y:** trackItem ([0e483ea](https://github.com/Thomasevano/musickeeper/commit/0e483ea334411814ff065852454e2bf712d31963))
* Apple Music paste link metadata fetch ([bec9721](https://github.com/Thomasevano/musickeeper/commit/bec9721289f48047637a548ccc384f012b60455e))
* **listen-later:** set page title via inertia page props ([19d7c8e](https://github.com/Thomasevano/musickeeper/commit/19d7c8efa7dc6bbd0463c263d5766d36403e8e0f))
* musicbrainz-api vendor types no longer leak past adapter layer ([370e9c9](https://github.com/Thomasevano/musickeeper/commit/370e9c9374f0b43f0b08e7f3f0b65c4d082e81ee))
* replaced (musicbrainzApi.lookup as any) + local EntityWithRelations with vendor types from musicbrainz-api ([15ac1d7](https://github.com/Thomasevano/musickeeper/commit/15ac1d7fcd39d14441a0a0f5bcccb06463e1d60b))
* row used id ([db97adf](https://github.com/Thomasevano/musickeeper/commit/db97adf0ef3b738e7a9870304b078148815a8a59))
* **search:** require explicit search type ([1d642eb](https://github.com/Thomasevano/musickeeper/commit/1d642eb452955f4dc08bd000490cd81047445f74))
* **search:** validate listen-later queries ([ce90904](https://github.com/Thomasevano/musickeeper/commit/ce909046211cc3649aa831fcac0cc69ebf5262f9))
* **test:** configure HTTP test base URL ([673affd](https://github.com/Thomasevano/musickeeper/commit/673affdd836109e86f1d20a6290419c4cab96305))
* **ui:** animation when adding/deleting a trackItem ([a2a3114](https://github.com/Thomasevano/musickeeper/commit/a2a3114f83aaa34e496e10d528a591b8d39e3436))
* **ui:** Landing Page ([49b078c](https://github.com/Thomasevano/musickeeper/commit/49b078ceca6a77f849be5fa649886b942f6ddf61))
* **ui:** listen later page ([fa9a246](https://github.com/Thomasevano/musickeeper/commit/fa9a2467ca9ed94e7f7182970c9d74f8065ea058))
* **ui:** remove album name as column and show the album name in the title for a track ([860e2b8](https://github.com/Thomasevano/musickeeper/commit/860e2b8ff87fb44175277699e5cfd39ef830a12c))
* **ui:** text spaces on landing page ([158c390](https://github.com/Thomasevano/musickeeper/commit/158c39042a5596ddae19aa44da5939b5377089f2))
* **ui:** toggleTheme animation ([0bd73c6](https://github.com/Thomasevano/musickeeper/commit/0bd73c658f0885113f414799a92129e9f0639322))
* **ui:** update navigation music note icon stroke ([fd4b864](https://github.com/Thomasevano/musickeeper/commit/fd4b864a9cd479990a708944d5566617f1b64b1f))
* **ui:** use dynamic viewport to avoid glitch on mobile ([1b75bd0](https://github.com/Thomasevano/musickeeper/commit/1b75bd0b0ff40021afa4c6b2e6ccc2a655317b27))
* **ui:** use tabular-nums for cells containing dates and numbers ([af72a06](https://github.com/Thomasevano/musickeeper/commit/af72a06e620509bc06ac281761618026c40fce22))
* **ux:** debounce search ([660b281](https://github.com/Thomasevano/musickeeper/commit/660b28188c6068a9eecb50f44dcd6ccafc24247a))
* **ux:** search trackItem ([db75012](https://github.com/Thomasevano/musickeeper/commit/db75012b21ffb1012cd3a873c7a77c1fe8be8032))


### Performance Improvements

* **musicbrainz:** reuse serialized cover art ([d9d79e5](https://github.com/Thomasevano/musickeeper/commit/d9d79e53d80a2a3ca9e055f52d23f71a22fd766b))

## [0.6.0](https://github.com/Thomasevano/musickeeper/compare/v0.5.0...v0.6.0) (2026-04-01)


### Features

* edit fetch data ([6acc587](https://github.com/Thomasevano/musickeeper/commit/6acc587bdfd3b992eda2513d69b8da21ec49ef6a))
* enrich spotify metadata with artist and album from page HTML ([59ce4ef](https://github.com/Thomasevano/musickeeper/commit/59ce4ef08b4a4006706df887a426bf281a65ab44))
* **ui:** add toast notification when an item is added/deleted in the list ([332ca87](https://github.com/Thomasevano/musickeeper/commit/332ca878c4e61437bf104a51121f64b24f9fc082))
* US-001 - Create LinkParserService for URL parsing ([c591634](https://github.com/Thomasevano/musickeeper/commit/c5916345c00b9bc3addffb33b188e0670de40165))
* US-002 - Add oEmbed proxy endpoint for streaming services ([6fa17be](https://github.com/Thomasevano/musickeeper/commit/6fa17bec9e13f8b173db96cb0d1d30f06bb25a9b))
* US-003 - Add Apple Music metadata endpoint ([d115348](https://github.com/Thomasevano/musickeeper/commit/d11534847521193209771c14ac1d61fb64736ad6))
* US-004 - Create LinkMetadataService to fetch and enrich metadata ([c6c0aa5](https://github.com/Thomasevano/musickeeper/commit/c6c0aa50c75600e68a514cbc3c0c65c08569f564))
* US-005 - Add sourceUrl field to ListenLaterItem data model ([9a573fa](https://github.com/Thomasevano/musickeeper/commit/9a573fa5652b8a0cc169136224010f111d19f1c3))
* US-006 - Add paste link input to Listen Later page ([61c8eac](https://github.com/Thomasevano/musickeeper/commit/61c8eacf8a9cfd7ac00769e2406144eec0e436ad))
* US-007 - Create confirmation dialog for pasted link ([ae9f198](https://github.com/Thomasevano/musickeeper/commit/ae9f19803548c6b297ade6f1e2eaff29c0e09e78))
* US-008 - Implement duplicate detection with user options ([fd6a5d7](https://github.com/Thomasevano/musickeeper/commit/fd6a5d7060fba3fc7ab8e3ef6f76ef8bc14e2bca))
* US-009 - Add loading and error states for link processing ([6e302f0](https://github.com/Thomasevano/musickeeper/commit/6e302f0e184f7fe4df65772498de8ecd3205506f))
* US-010 - Wire up save flow with sourceUrl ([e361172](https://github.com/Thomasevano/musickeeper/commit/e361172021845fbef67b40e0a6fc1c1d02705259))


### Bug Fixes

* align IndexedDB version in trackItem to match listen-later (v3) ([e280049](https://github.com/Thomasevano/musickeeper/commit/e2800492eae55d2a0a497ba21bfe64b9727a9227))
* correct title and artist name for Apple Music fetch ([de02b07](https://github.com/Thomasevano/musickeeper/commit/de02b071706a390c3904d8d43e89bb1ea5071b75))
* decode html entities and strip feat. suffix for better musicbrainz matching ([e188ee7](https://github.com/Thomasevano/musickeeper/commit/e188ee79979221efe18344a91c6b33fef3cfd9d7))
* detect soundcloud sets/playlists as album type ([9ae7f22](https://github.com/Thomasevano/musickeeper/commit/9ae7f2272b6b13e528a0eb9c462acde204300039))
* extract youtube album from auto-generated video description ([f8dee63](https://github.com/Thomasevano/musickeeper/commit/f8dee633086c422f1429329db18e127e549d9291))
* handle multiple youtube artists as comma-separated list ([8ec2741](https://github.com/Thomasevano/musickeeper/commit/8ec2741d95e5c3c7eddfa2b84da14e3a1db24a62))
* look up album cover directly when recording links to wrong release ([750226c](https://github.com/Thomasevano/musickeeper/commit/750226ca9adf043126b9d3640beff4931ef214b2))
* only show title on confirm dialog when type is an album ([4e85365](https://github.com/Thomasevano/musickeeper/commit/4e85365a171d798fba0b7d460f66b85f0eb4abf2))
* prefer album-type release for musicbrainz cover art matching ([e474ff8](https://github.com/Thomasevano/musickeeper/commit/e474ff88a92dfd1900ad49c7227bda8b7d0b6737))
* strip soundcloud 'by author' suffix using page HTML fallback ([66f6c31](https://github.com/Thomasevano/musickeeper/commit/66f6c3175dfc9bce8bfe4fdf9b3ca89e1bc140d6))
* strip youtube '- Topic' suffix using youtube music page HTML ([dabb713](https://github.com/Thomasevano/musickeeper/commit/dabb71357d19b8e699f4bb1fc9f4a65d2ee70edf))
* support youtube music playlist urls as album type ([fd3e301](https://github.com/Thomasevano/musickeeper/commit/fd3e301252105fdf9107a1bb41ab16996ff4d7d9))
* **ui:** hide album field in confirmation dialog for album type ([4e85365](https://github.com/Thomasevano/musickeeper/commit/4e85365a171d798fba0b7d460f66b85f0eb4abf2))
* use platform cover by default instead of MusicBrainz cover ([08b3710](https://github.com/Thomasevano/musickeeper/commit/08b37106454d1a2b112f766e4feaf6658acf69e2))
* use streaming platform cover art when musicbrainz has none ([2a69697](https://github.com/Thomasevano/musickeeper/commit/2a69697e89ae171cee5bdf299ed6f39f3f4c8ac5))

## [0.5.0](https://github.com/Thomasevano/musickeeper/compare/v0.4.0...v0.5.0) (2026-03-07)


### Features

* add PWA with offline support ([c28d3d6](https://github.com/Thomasevano/musickeeper/commit/c28d3d62878f4b2080205247fb3a4d7f035d623f))
* **ui:** add feature card for PWA and Offline support ([10476c9](https://github.com/Thomasevano/musickeeper/commit/10476c9b48a043703547ae21610269796abacb44))
* **ui:** add offline indicator with Alert component ([3bcb7c0](https://github.com/Thomasevano/musickeeper/commit/3bcb7c07d266aba35c4c130978286d4a9596277a))
* **ui:** change source code label to version and link to changelog ([1280c2a](https://github.com/Thomasevano/musickeeper/commit/1280c2a6796f5f1a087f0f0cc52dd7f98f490335))

## [0.4.0](https://github.com/Thomasevano/musickeeper/compare/v0.3.4...v0.4.0) (2026-01-27)


### Features

* add artist search ([81d44b4](https://github.com/Thomasevano/musickeeper/commit/81d44b4177444e8792a0867fe2cb19f5db144bd9))


### Bug Fixes

* return response in controller ([eb7a26a](https://github.com/Thomasevano/musickeeper/commit/eb7a26a33caebb9990049dbc08288bcdd9e771bc))

## [0.3.4](https://github.com/Thomasevano/musickeeper/compare/v0.3.3...v0.3.4) (2026-01-26)


### Bug Fixes

* **build:** favicon ([98da2bf](https://github.com/Thomasevano/musickeeper/commit/98da2bfb1c686abd681f0c845bd066e484e542a9))

## [0.3.3](https://github.com/Thomasevano/musickeeper/compare/v0.3.2...v0.3.3) (2026-01-26)


### Bug Fixes

* **ui:** footer to bottom of page ([713b969](https://github.com/Thomasevano/musickeeper/commit/713b969cbfeeb6907f3f8220a96d53ef9f7a2a16))
* **ui:** show the correct tooltip content while searching ([235dfe0](https://github.com/Thomasevano/musickeeper/commit/235dfe02d46aa105a91af385ef0f33dca4f5bb6a))
* **ui:** table must take all width available ([a301e20](https://github.com/Thomasevano/musickeeper/commit/a301e205bf64242a5bc621f20b8f9f2ac6759f03))


### Performance Improvements

* reduce debounce time ([aad4d47](https://github.com/Thomasevano/musickeeper/commit/aad4d47122b5484525eb98ca76dbbbebfbc294d9))
* **ui:** bundle a placeholder svg instead of using url ([445eaf0](https://github.com/Thomasevano/musickeeper/commit/445eaf094408378bdf2da487dc2adc025499679e))
* **ui:** use thumbnail instead of full image for covert and use a loading skeleton ([0ffabd4](https://github.com/Thomasevano/musickeeper/commit/0ffabd465906930d7ad7ec57f4f008a9e6f29434))

## [0.3.2](https://github.com/Thomasevano/musickeeper/compare/v0.3.1...v0.3.2) (2026-01-20)

### Bug Fixes

- **ci:** typo version ([31a3557](https://github.com/Thomasevano/musickeeper/commit/31a355763184f956a0938c24a19b486d28bc0f25))

## [0.3.1](https://github.com/Thomasevano/musickeeper/compare/v0.3.0...v0.3.1) (2026-01-20)

### Bug Fixes

* remove need of base url ([3f29966](https://github.com/Thomasevano/musickeeper/commit/3f29966c68f85c95496a8c7b2fa95f855f1cfee5))

## [0.3.0](https://github.com/Thomasevano/musickeeper/compare/v0.2.0...v0.3.0) (2026-01-19)


### Features

* add art cover to music item ([810f2b8](https://github.com/Thomasevano/musickeeper/commit/810f2b838c0a2c2cc6943652434708f5609c6ee5))
* add MusicBrainz API ([7b7da1d](https://github.com/Thomasevano/musickeeper/commit/7b7da1dc9a89cb096eaad53a1bd3c6fa451601de))
* **ui:** remove sidebar and use navbar instead ([6267baa](https://github.com/Thomasevano/musickeeper/commit/6267baad589193ab13b5bb162c30de82099a9aed))


### Bug Fixes

* **api:** access package.json varaibles in production for musicbrainz api ([5ae5e2c](https://github.com/Thomasevano/musickeeper/commit/5ae5e2ce1242d434056d1195da2d80d5cd2e6760))
* docker build ([70b37b7](https://github.com/Thomasevano/musickeeper/commit/70b37b767a4d62120b321bf28b00c08c4d6dd62d))
* sorting listenlater items ([8972a5b](https://github.com/Thomasevano/musickeeper/commit/8972a5b4244db817bd35c3935251a2cf99ae7c9a))
* **ui:** show app version in footer ([5dab5c6](https://github.com/Thomasevano/musickeeper/commit/5dab5c6621786ba257eaa99828e95382f4b4cf80))

## [0.2.0](https://github.com/Thomasevano/musickeeper/compare/v0.1.0...v0.2.0) (2025-12-18)


### Features

* add album type ([99391a8](https://github.com/Thomasevano/musickeeper/commit/99391a8e88c9246c1eca639e0edc8c05a312ff9f))
* add check icon on current theme ([7e4aa37](https://github.com/Thomasevano/musickeeper/commit/7e4aa37b09c1f75b49ae46668fccbe835ad90ad9))
* add listen later and remove playlists ([e3e2267](https://github.com/Thomasevano/musickeeper/commit/e3e22671032ec415eaf2caa3f04f16ce5a14a59f))
* delete an item from the list ([5c58269](https://github.com/Thomasevano/musickeeper/commit/5c582698ac8efce954cf64a43ed3887f94215408))
* mark en entry has listened ([e3483d0](https://github.com/Thomasevano/musickeeper/commit/e3483d0a82875379481af767242a42cc6617e82e))
* remove playlists extract ([921a4be](https://github.com/Thomasevano/musickeeper/commit/921a4be368e7d37c92f79c0a188bdc4f3a6c37ff))


### Bug Fixes

* order list items by added date ([34444d1](https://github.com/Thomasevano/musickeeper/commit/34444d176d6c96c4ce3f809368c7660517e4b88d))
* show an error page when user unauthorized try to access the app closes [#2](https://github.com/Thomasevano/musickeeper/issues/2) ([c5797ea](https://github.com/Thomasevano/musickeeper/commit/c5797ea35158e493bc02c5ad7c3134bb0d4e72b9))
* show app version in footer in production ([31858c3](https://github.com/Thomasevano/musickeeper/commit/31858c367e015ad6a3363e1152ccb1612a623356))
* use lucide icons instead of emoji ([933db5f](https://github.com/Thomasevano/musickeeper/commit/933db5f85261a11b73f5b8f5af52e436311a451c))

## [0.1.0](https://github.com/Thomasevano/musickeeper/compare/v0.0.3...v0.1.0) (2025-03-31)


### Features

* add link to open playlist on Spotify ([ad61506](https://github.com/Thomasevano/musickeeper/commit/ad61506a39bde8e75fc3d98b10e335a70ba45321))
* add sidebar ([1789b5d](https://github.com/Thomasevano/musickeeper/commit/1789b5df86f6548265c9fde220341eea5c0c9f47))
* add total tracks of a playlist ([5c66faf](https://github.com/Thomasevano/musickeeper/commit/5c66faf18e266e5f046ccf75c3beb5897a33bb29))
* add user infos in sidebar ([c36eb02](https://github.com/Thomasevano/musickeeper/commit/c36eb02c465fe34da43f6abd965fe7c3d0fe5e74))


### Bug Fixes

* show app name and version in footer ([db3bfc4](https://github.com/Thomasevano/musickeeper/commit/db3bfc4035724c3d1cc3dff63268401aaa76f1b3))
* theme wasn't toggling ([548b9ce](https://github.com/Thomasevano/musickeeper/commit/548b9ce21e80fd62a44d42adb42dcde15d32cc46))
* typo on playlists page subtitle ([485cb18](https://github.com/Thomasevano/musickeeper/commit/485cb180a433d8872caa4d36bb50c5e5bdce8dd9))

## [0.0.3](https://github.com/Thomasevano/musickeeper/compare/v0.0.2...v0.0.3) (2025-03-19)


### Bug Fixes

* playlist extract when playlistName contain an emoji ([e0b6a57](https://github.com/Thomasevano/musickeeper/commit/e0b6a57e764806709b13fe08cf7a6e013029b061))
* redirect to home when user try to access library pages when logged in ([5a1a501](https://github.com/Thomasevano/musickeeper/commit/5a1a50121accde1ccd30c01d4ce3e11c577a82ba))
* request not being executed when acces_token is expired ([30d99c2](https://github.com/Thomasevano/musickeeper/commit/30d99c2089640d4be59657717d34bd3a7d8c2d5a))
