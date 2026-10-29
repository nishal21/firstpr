import type { I18nKey } from "@/lib/i18n-en";
import { fill } from "@/lib/i18n-world";

export const ml: Record<I18nKey, string> = fill({
  "nav.findIssue": "ഒരു issue കണ്ടെത്തുക",
  "nav.explain": "Explain",
  "nav.review": "എന്റെ PR Review ചെയ്യുക",
  "nav.language": "ഭാഷ",
  "nav.progress": "FirstPR പുരോഗതി",
  "nav.menuOpen": "മെനു തുറക്കുക",
  "nav.menuClose": "മെനു അടയ്ക്കുക",

  "footer.built":
    "AIBoomi Startup Weekend Kochi-യിൽ DuoMatter നിർമ്മിച്ചത്",
  "footer.tagline": "Match. Explain. Review. നിങ്ങൾ എഴുതുക.",
  "footer.botTitle": "FirstPRbot",
  "footer.botAbout":
    "റിപ്പോയിൽ GitHub App ഇൻസ്റ്റാൾ ചെയ്യുക. ഒരു issue-ൽ /firstpr explain കമന്റ് ചെയ്താൽ ലളിതമായ വിശദീകരണം കിട്ടും. PR തുറക്കുകയോ അപ്ഡേറ്റ് ചെയ്യുകയോ ചെയ്താൽ score card വരും. FirstPRbot നിങ്ങളുടെ fix എഴുതില്ല.",
  "footer.botLink": "GitHub-ൽ FirstPRbot കാണുക",
  "footer.sourceLink": "GitHub-ൽ സോഴ്‌സ് കോഡ്",
  "footer.ctaTitle": "നിങ്ങളുടെ ആദ്യ PR ഇവിടെ തുടങ്ങുന്നു.",
  "footer.colProduct": "ഉൽപ്പന്നം",
  "footer.colOpenSource": "സോഴ്‌സ്",
  "footer.colTeam": "ടീം",
  "footer.license": "AGPL-3.0",
  "bot.heading": "GitHub-ൽ ഉപയോഗിക്കുക",
  "bot.body":
    "FirstPRbot Match → Explain → Review issue/PR കമന്റുകളിലേക്ക് കൊണ്ടുവരുന്നു. ഇൻസ്റ്റാൾ ചെയ്ത് ഒരു good first issue-ൽ /firstpr explain കമന്റ് ചെയ്യുക — അല്ലെങ്കിൽ ഒരു PR തുറന്ന് GitHub വിടാതെ score card നേടുക.",
  "bot.cta": "FirstPRbot-നെക്കുറിച്ച്",

  "error.notFound.code": "404",
  "error.notFound.title": "പേജ് കണ്ടെത്തിയില്ല",
  "error.notFound.body":
    "ഈ ലിങ്ക് FirstPR പേജുമായി പൊരുത്തപ്പെടുന്നില്ല. ഹോമിലേക്ക് പോയി Match, Explain, അല്ലെങ്കിൽ Review തിരഞ്ഞെടുക്കുക.",
  "error.notFound.home": "ഹോം",
  "error.crash.eyebrow": "എന്തോ തെറ്റി",
  "error.crash.title": "പ്രശ്നം ഉണ്ടായി",
  "error.crash.body":
    "ഒരു നിമിഷം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക. നിങ്ങളുടെ ജോലി GitHub-ൽ തന്നെയുണ്ട്. FirstPR ഈ പേജ് ലോഡ് ചെയ്യാനായില്ല.",
  "error.crash.retry": "വീണ്ടും ശ്രമിക്കുക",
  "error.crash.home": "ഹോം",

  "hero.eyebrow": "FirstPR നിങ്ങളുടെ കോഡ് എഴുതില്ല.",
  "hero.title": "നിങ്ങളുടെ ആദ്യ PR, നിങ്ങൾ എഴുതിയത്, merge ചെയ്യാൻ തയ്യാർ.",
  "hero.subtitle":
    "FirstPR ഒരു യഥാർത്ഥ beginner issue കണ്ടെത്തി, എവിടെ നോക്കണമെന്ന് കാണിച്ചുതരുന്നു, maintainer കാണുന്നതിന് മുമ്പ് നിങ്ങളുടെ PR പരിശോധിക്കുന്നു.",
  "hero.trust":
    "FirstPR നിങ്ങളുടെ കോഡ് എഴുതില്ല. എവിടെ നോക്കണമെന്ന് കാണിക്കുകയും maintainer കാണുന്നതിന് മുമ്പ് PR പരിശോധിക്കുകയും ചെയ്യുന്നു.",
  "hero.cta": "എന്റെ ആദ്യ issue കണ്ടെത്തുക",

  "home.matchHeading": "Match",

  "steps.step": "ഘട്ടം {n}",
  "steps.match.title": "Match",
  "steps.match.line":
    "GitHub username നൽകുക. ആരും എടുക്കാത്ത open good first issue ഞങ്ങൾ തിരഞ്ഞെടുക്കും.",
  "steps.explain.title": "Explain",
  "steps.explain.line":
    "ലളിതമായ ഭാഷ, യഥാർത്ഥ ഫയലുകളും ലൈനുകളും — മൂന്ന് തലങ്ങളിലുള്ള hints, ഒരിക്കലും fix അല്ല.",
  "steps.review.title": "Review",
  "steps.review.line":
    "നിങ്ങളുടെ PR അല്ലെങ്കിൽ diff ഒട്ടിക്കുക. issue-ഉം CONTRIBUTING.md-ഉം അടിസ്ഥാനമാക്കി സ്കോർ ചെയ്യും.",

  "flow.match": "Match",
  "flow.explain": "Explain",
  "flow.review": "Review",

  "match.username": "GitHub username",
  "match.usernamePlaceholder": "octocat",
  "match.repo": "Repo (ഓപ്ഷണൽ)",
  "match.repoPlaceholder": "NekoDroid അല്ലെങ്കിൽ owner/repo",
  "match.submit": "എന്റെ ആദ്യ issue കണ്ടെത്തുക",
  "match.finding": "തിരയുന്നു…",
  "match.retry": "വീണ്ടും ശ്രമിക്കുക",
  "match.failed": "Match പരാജയപ്പെട്ടു",
  "match.youWrite": "നിങ്ങൾ എഴുതുന്നത്:",
  "match.noPublicRepos":
    "പബ്ലിക് repo ഇതുവരെ ഇല്ല, അതിനാൽ beginner-friendly docs issues തിരഞ്ഞെടുക്കും.",
  "match.explainIssue": "ഈ issue Explain ചെയ്യുക",
  "match.otherFits": "മറ്റ് യോജിപ്പുകൾ",
  "match.alreadyTaken": "ഇതിനകം എടുത്തവ",
  "match.noIssuesBefore": "ഇവിടെ open good first issues ഇല്ല. ",
  "match.noIssuesAfter": " അല്ലെങ്കിൽ മറ്റൊരു repo ശ്രമിക്കുക.",
  "match.progress.repos": "നിങ്ങളുടെ പബ്ലിക് repo-കൾ വായിക്കുന്നു",
  "match.progress.issues": "open good first issues കണ്ടെത്തുന്നു",
  "match.progress.skip": "ഇതിനകം എടുത്തവ ഒഴിവാക്കുന്നു",

  "badge.beginnerFriendly": "Beginner-friendly",
  "badge.stretch": "Stretch",
  "badge.hard": "Hard",

  "verdict.ready": "Ready to merge",
  "verdict.almost": "Almost ready",
  "verdict.needs": "Needs changes",

  "explain.loading.issue": "issue വായിക്കുന്നു",
  "explain.loading.files": "പ്രധാനപ്പെട്ട ഫയലുകൾ കണ്ടെത്തുന്നു",
  "explain.loading.lines": "ഓരോ ലൈൻ റഫറൻസും പരിശോധിക്കുന്നു",
  "explain.failed": "Explain പരാജയപ്പെട്ടു",
  "explain.somethingWrong": "എന്തോ തെറ്റി.",
  "explain.retry": "വീണ്ടും ശ്രമിക്കുക",
  "explain.invalidNumber": "അസാധുവായ issue നമ്പർ.",
  "explain.whatAsking": "ഈ issue എന്താണ് ആവശ്യപ്പെടുന്നത്",
  "explain.whyMatters": "എന്തുകൊണ്ട് ഇത് പ്രധാനം",
  "explain.words": "നിങ്ങൾക്ക് അറിയാത്ത വാക്കുകൾ",
  "explain.whereLook": "എവിടെ നോക്കണം",
  "explain.doneWhen": "നിങ്ങൾ പൂർത്തിയാക്കിയത് ഇങ്ങനെ",
  "explain.howCheck": "നിങ്ങളുടെ ജോലി എങ്ങനെ പരിശോധിക്കാം",
  "explain.noCommands":
    "ഈ മാറ്റത്തിന് CONTRIBUTING-ൽ കമാൻഡുകളൊന്നും ലിസ്റ്റ് ചെയ്തിട്ടില്ല.",
  "explain.learnFirst": "ആദ്യം ഇത് പഠിക്കുക",
  "explain.findAnother": "മറ്റൊരു issue കണ്ടെത്തുക",
  "explain.reviewPr": "എന്റെ PR Review ചെയ്യുക",
  "explain.noCitations":
    "സ്ഥിരീകരിച്ച ലൈൻ റഫറൻസുകളൊന്നും ഇതുവരെ ഇല്ല. issue തുറന്ന് repo tree നോക്കുക.",
  "explain.openOnGithub": "GitHub-ൽ തുറക്കുക",
  "explain.checkedFile": "യഥാർത്ഥ ഫയലുമായി പൊരുത്തപ്പെടുത്തി",
  "explain.noChecklist": "ഇതുവരെ checklist ഇനങ്ങളില്ല.",
  "explain.searchBySerpapi": "Search by SerpApi",

  "hint.title": "Hints",
  "hint.subtitle":
    "മൂന്ന് ഘട്ടങ്ങൾ. FirstPR നിങ്ങൾക്കായി fix എഴുതില്ല.",
  "hint.where": "എവിടെ നോക്കണം",
  "hint.what": "എന്ത് മാറ്റണം",
  "hint.pseudo": "Pseudocode",
  "hint.level": "ലെവൽ {n}: {label}",
  "hint.checkYourself": "സ്വയം പരിശോധിക്കുക:",
  "hint.showNext": "അടുത്ത hint കാണിക്കുക",
  "hint.loading": "ആലോചിക്കുന്നു…",
  "hint.askTitle": "FirstPR-യോട് ചോദിക്കുക",
  "hint.askPlaceholder": "issue-നെക്കുറിച്ച് ഒരു ചോദ്യം ചോദിക്കുക…",
  "hint.send": "അയയ്ക്കുക",
  "hint.refuseChip": "എനിക്കായി fix എഴുതിക്കോ",
  "hint.locked": "ആദ്യം മുൻ hints അൺലോക്ക് ചെയ്യുക",
  "hint.failed": "Hint പരാജയപ്പെട്ടു",
  "hint.askFailed": "ചോദ്യം പരാജയപ്പെട്ടു",
  "hint.requestFailed": "അഭ്യർത്ഥന പരാജയപ്പെട്ടു",
  "hint.wontWrite": "ഞാൻ നിങ്ങൾക്കായി fix എഴുതില്ല.",
  "hint.allUnlocked": "എല്ലാ hints അൺലോക്ക് ചെയ്തു",
  "hint.pressNext":
    "എവിടെ നോക്കണമെന്ന് അൺലോക്ക് ചെയ്യാൻ \"Show next hint\" അമർത്തുക.",
  "hint.thinking": "FirstPR ആലോചിക്കുന്നു…",

  "review.title": "എന്റെ PR Review ചെയ്യുക",
  "review.subtitle":
    "ഒരു pull request URL അല്ലെങ്കിൽ diff ഒട്ടിക്കുക. ലിങ്ക് ചെയ്ത issue, CONTRIBUTING.md, മാറ്റം എന്നിവ അടിസ്ഥാനമാക്കി FirstPR സ്കോർ ചെയ്യുന്നു — നിങ്ങളുടെ fix എഴുതാതെ.",
  "review.tabPr": "PR ലിങ്ക്",
  "review.tabDiff": "diff ഒട്ടിക്കുക",
  "review.prUrl": "Pull request URL",
  "review.prUrlPlaceholder": "https://github.com/owner/repo/pull/123",
  "review.diff": "Unified diff",
  "review.diffPlaceholder": "diff --git a/…",
  "review.repo": "Repo (ഓപ്ഷണൽ)",
  "review.repoPlaceholder": "owner/repo",
  "review.issueNumber": "Issue നമ്പർ (ഓപ്ഷണൽ)",
  "review.issuePlaceholder": "4",
  "review.submit": "maintainer-ready ചെക്ക് ഓടിക്കുക",
  "review.running": "ഓടുന്നു…",
  "review.retry": "വീണ്ടും ശ്രമിക്കുക",
  "review.failed": "Review പരാജയപ്പെട്ടു",
  "review.reviewing": "Review ചെയ്യുന്നു",
  "review.loading.pr": "നിങ്ങളുടെ PR വായിക്കുന്നു",
  "review.loading.contributing": "CONTRIBUTING.md വായിക്കുന്നു",
  "review.loading.issue": "issue-നോട് താരതമ്യം ചെയ്യുന്നു",
  "review.loading.diff": "diff Review ചെയ്യുന്നു",

  "score.outOf": "100-ൽ",
  "score.copy": "PR comment ആയി പകർത്തുക",
  "score.copied": "പകർത്തി",
  "score.checklist": "Checklist",
  "score.notApplicable": "ബാധകമല്ല",
  "score.rule": "Rule",
  "score.ai": "AI",
  "score.lineComments": "ലൈൻ കമന്റുകൾ",
  "score.filesChanged": "Files changed",
  "score.questions": "ഒരു maintainer ചോദിക്കാവുന്ന ചോദ്യങ്ങൾ",
  "score.blocker": "blocker",
  "score.suggestion": "suggestion",
  "score.nit": "nit",

  "nav.how": "എങ്ങനെ പ്രവർത്തിക്കുന്നു",
  "nav.bot": "Bot",
  "nav.pro": "Pro",
  "nav.ready": "റിപ്പോ സ്കോർകാർഡ്",
  "nav.journey": "എന്റെ യാത്ര",
  "nav.skip": "ഉള്ളടക്കത്തിലേക്ക്",

  "hero.titleMark": "നിങ്ങൾ എഴുതിയത്",
  "hero.proof1": "യഥാർത്ഥ GitHub issues. വ്യാജ ബോർഡല്ല.",
  "hero.proof2": "മൂന്ന് തലത്തിലുള്ള hints. patch ഒരിക്കലുമല്ല.",
  "hero.proof3": "സ്കോർ കോഡിലെ checklist ആണ്, ഒരു ഊഹമല്ല.",
  "hero.preview": "ഉൽപ്പന്ന കാഴ്ച",

  "landing.contrastTitle": "അതേ issue. തുടക്കം രണ്ട് തരം.",
  "landing.contrastLead":
    "good-first-issue ലേബൽ ഏത് ഫയൽ തുറക്കണമെന്ന് പറയില്ല. FirstPR പറയും, fix എഴുതാൻ വിസമ്മതിക്കുകയും ചെയ്യും.",
  "landing.rawTitle": "GitHub-ൽ",
  "landing.raw1": "ലേബലുകളുടെ മതിലും, റിപ്പോ അറിയാവുന്നവർക്ക് വേണ്ടി എഴുതിയ body-യും",
  "landing.raw2": "പ്രധാന ഫയലുകളുടെ മാപ്പ് ഇല്ല",
  "landing.raw3": "മറ്റാരുടെയെങ്കിലും PR ഇതിനകം തുറന്നിട്ടുണ്ടാകാം",
  "landing.firstTitle": "FirstPR-ൽ",
  "landing.first1": "issue എന്ത് ചോദിക്കുന്നു എന്നതിന്റെ ലളിതമായ സംഗ്രഹം",
  "landing.first2": "റിപ്പോയുമായി ചേർത്ത് പരിശോധിച്ച ഫയൽ, ലൈൻ ലിങ്കുകൾ",
  "landing.first3": "എപ്പോൾ തീർന്നു എന്ന പട്ടിക, കുഴങ്ങിയാൽ hints",

  "landing.researchTitle": "ആദ്യ മൈലിലാണ് പലരും നിർത്തുന്നത്",
  "landing.researchBody":
    "ഈ സംഖ്യകൾ good first issues-നെക്കുറിച്ചുള്ള പ്രസിദ്ധീകരിച്ച പഠനത്തിൽ നിന്നാണ്. FirstPR ഉപയോക്തൃ എണ്ണമല്ല.",
  "landing.stat1":
    "പഠനത്തിലെ good first issues-ൽ 40.9% പുതുമുഖങ്ങൾ പരിഹരിച്ചില്ല.",
  "landing.stat2":
    "good first issue വഴി ഒരു മാറ്റം എത്തിച്ച പുതുമുഖങ്ങളിൽ 58.4% തിരിച്ചുവന്നില്ല.",
  "landing.statSource":
    "Xin Tan, Minghui Zhou, Zeyu Sun. A First Look at Good First Issues on GitHub. ESEC/FSE 2020. 9,368 issues.",
  "landing.statLink": "പേപ്പർ വായിക്കുക",

  "landing.howTitle": "മൂന്ന് ഘട്ടങ്ങൾ. കോഡ് നിങ്ങൾ എഴുതും.",
  "landing.audienceTitle": "ആർക്കുവേണ്ടി",
  "landing.studentsTitle": "അവസാന വർഷ, പ്ലേസ്മെന്റ് വിദ്യാർത്ഥികൾ",
  "landing.studentsBody":
    "ട്യൂട്ടോറിയൽ റിപ്പോയല്ല, യഥാർത്ഥ merged PR വേണം. FirstPR ഒരു fit തിരഞ്ഞെടുക്കും, ഫയലുകൾ കാണിക്കും, maintainer-ന് മുമ്പ് PR പരിശോധിക്കും.",
  "landing.maintainersTitle": "Maintainers",
  "landing.maintainersBody":
    "FirstPRbot ഇൻസ്റ്റാൾ ചെയ്യുക. issue-ൽ /firstpr explain, PR-ൽ /firstpr review. issue-നോട് ചേരാത്ത ആദ്യ PR-കൾ കുറയും.",
  "landing.maintainersCta": "എന്റെ റിപ്പോ സ്കോർ ചെയ്യുക",

  "landing.proBadge": "പ്ലാൻ ചെയ്തത്",
  "landing.proTitle": "Pro, കോഡ് ഇതിനകം എഴുതുന്നവർക്ക്",
  "landing.proBody":
    "സൗജന്യം good-first-issue വഴി തന്നെ. പ്രോഗ്രാമിംഗിൽ പുതിയയാളല്ല, റിപ്പോയിൽ പുതിയയാളാണെങ്കിൽ സാധാരണ issue വിശദീകരിക്കുകയാണ് Pro. ഇതുവരെ വിൽപ്പനയില്ല. വില ഇട്ടിട്ടില്ല.",

  "landing.faqTitle": "വിശ്വസിക്കും മുമ്പ് ചോദിക്കുന്ന ചോദ്യങ്ങൾ",
  "faq.q1": "FirstPR എന്റെ കോഡ് എഴുതുമോ?",
  "faq.a1": "ഇല്ല. fix എഴുതാൻ ചോദിച്ചാൽ hints നിർത്തും. patch നിങ്ങളുടേതാണ്.",
  "faq.q2": "അക്കൗണ്ട് വേണോ?",
  "faq.a2": "വേണ്ട. യാത്രാ കാർഡ് ഈ ബ്രൗസറിൽ തന്നെ നിൽക്കും, ലിങ്ക് പങ്കിടും വരെ.",
  "faq.q3": "സ്വകാര്യ റിപ്പോകളിൽ പ്രവർത്തിക്കുമോ?",
  "faq.a3": "ഇല്ല. പബ്ലിക് റിപ്പോകൾ മാത്രം.",
  "faq.q4": "FirstPRbot എന്താണ്?",
  "faq.a4":
    "ഒരു GitHub App. issue-ൽ /firstpr explain അല്ലെങ്കിൽ pull request-ൽ /firstpr review കമന്റ് ചെയ്യുക.",
  "faq.q5": "സ്കോർ AI-യുടേതാണോ?",
  "faq.a5":
    "അല്ല. സംഖ്യ checklist-ിൽ നിന്ന് കോഡ് കണക്കാക്കുന്നു. മോഡൽ തെളിവ് മാത്രം നിറയ്ക്കുന്നു.",
  "faq.q6": "ഏത് ഭാഷകൾ?",
  "faq.a6":
    "ഇന്റർഫേസിൽ 15 ഭാഷകൾ. ഇംഗ്ലീഷ്, മലയാളം, ഹിന്ദി കൈയ്യെഴുത്താണ്. വരി കുറയുന്നിടത്ത് ബാക്കിയുള്ളവ ഇംഗ്ലീഷിലേക്ക് മടങ്ങും. വിശദീകരണം ഇംഗ്ലീഷാണ്.",

  "landing.finalTitle": "നിങ്ങളുടെ ആദ്യ PR ഇവിടെ തുടങ്ങുന്നു.",
  "landing.finalBody": "ഒരു യഥാർത്ഥ issue തിരഞ്ഞെടുക്കുക. ഫയലുകൾ കാണുക. review ചോദിക്കും മുമ്പ് PR പരിശോധിക്കുക.",

  "match.sample": "മാതൃക username ഉപയോഗിക്കുക",
  "match.noIssues":
    "തുറന്ന beginner issue ഒന്നും ചേർന്നില്ല. പബ്ലിക് പ്രൊഫൈലിലെ ഭാഷകൾ വച്ച് തിരയാൻ റിപ്പോ ഒഴിവാക്കുക, അല്ലെങ്കിൽ മറ്റൊരു owner/repo ശ്രമിക്കുക.",
  "match.searchLabel": "Beginner issues തിരയുക",
  "match.searchPlaceholder": "docs, rust, accessibility…",
  "match.searchSubmit": "തിരയുക",
  "match.searchEmpty": "ചേരുന്ന തുറന്ന good-first issues ഇല്ല.",
  "match.searchGithub": "GitHub-ൽ തിരയുന്നു. search-only key വെച്ചാൽ Algolia ഉപയോഗിക്കും.",
  "match.searchAlgolia": "Search by Algolia",
  "match.free": "സ്വതന്ത്രമാണെന്ന് തോന്നുന്നു",

  "availability.free": "സ്വതന്ത്രമാണെന്ന് തോന്നുന്നു",
  "availability.assigned": "Assign ചെയ്തു",
  "availability.linked_pr": "PR ഇതിനകം തുറന്നു",
  "availability.claimed": "ആരോ ഏറ്റെടുത്തു",
  "availability.closed": "അടച്ചു",
  "availability.unknown": "പരിശോധന പൂർത്തിയായില്ല",
  "availability.title": "ഈ issue സ്വതന്ത്രമാണോ?",

  "setup.title": "ആദ്യ റൺ കണക്ക്",
  "setup.minutes": "ഏകദേശം {low}–{high} മിനിറ്റ്",
  "setup.empty": "README-യിൽ setup ഘട്ടങ്ങൾ വ്യക്തമായില്ല. clone ചെയ്യും മുമ്പ് CONTRIBUTING വായിക്കുക.",

  "ready.title": "ഈ റിപ്പോ പുതുമുഖങ്ങൾക്ക് തയ്യാറാണോ?",
  "ready.subtitle":
    "പബ്ലിക് റിപ്പോയിൽ നിന്ന് കോഡ് കണക്കാക്കുന്ന checklist: ലൈസൻസ്, contributing ഗൈഡ്, ടെംപ്ലേറ്റുകൾ, setup, തുറന്ന beginner issues. ജനപ്രീതി മത്സരമല്ല.",
  "ready.repo": "പബ്ലിക് റിപ്പോ",
  "ready.repoPlaceholder": "owner/repo",
  "ready.submit": "ഈ റിപ്പോ സ്കോർ ചെയ്യുക",
  "ready.running": "റിപ്പോ വായിക്കുന്നു…",
  "ready.failed": "ആ റിപ്പോ സ്കോർ ചെയ്യാനായില്ല",
  "ready.outOf": "100-ൽ",
  "ready.openIssues": "assignee ഇല്ലാത്ത {n} തുറന്ന beginner issues",

  "journey.title": "നിങ്ങളുടെ contributor യാത്ര",
  "journey.subtitle":
    "issue ചേർക്കുമ്പോഴും, വിശദീകരണം തുറക്കുമ്പോഴും, PR സ്കോർ ചെയ്യുമ്പോഴും ഇത് ഈ ബ്രൗസറിൽ സേവ് ചെയ്യും. പങ്കിടൽ ലിങ്ക് പകർത്തും വരെ ഒന്നും അപ്‌ലോഡ് ആകില്ല.",
  "journey.empty":
    "ഇതുവരെ ഘട്ടങ്ങളില്ല. ഒരു issue കണ്ടെത്തുക, വിശദീകരണം തുറക്കുക, പിന്നെ തിരിച്ചുവരിക. ഇവിടെ ചെയ്തത് മാത്രം ഈ പേജ് കാണിക്കും.",
  "journey.share": "പങ്കിടൽ ലിങ്ക് പകർത്തുക",
  "journey.copied": "ലിങ്ക് പകർത്തി",
  "journey.shared": "പങ്കിട്ട സ്നാപ്പ്ഷോട്ട്",
  "journey.sharedBody":
    "ഈ കാർഡ് ഒരു ലിങ്കിൽ നിന്നാണ്. മറ്റൊരാളുടെ ബ്രൗസർ ചരിത്രത്തിന്റെ സ്നാപ്പ്ഷോട്ടാണ്, തത്സമയ പ്രൊഫൈലല്ല.",
  "journey.mine": "ഈ ബ്രൗസർ",
  "journey.prLabel": "ഒരു pull request പരിശോധിക്കുക",
  "journey.prPlaceholder": "https://github.com/owner/repo/pull/1",
  "journey.prSubmit": "merge സ്ഥിതി പരിശോധിക്കുക",
  "journey.merged": "Merge ആയി",
  "journey.open": "ഇപ്പോഴും തുറന്നിരിക്കുന്നു",
  "journey.closed": "Merge കൂടാതെ അടച്ചു",
  "journey.kind.match": "ചേർത്തു",
  "journey.kind.explain": "വിശദീകരിച്ചു",
  "journey.kind.review": "Review ചെയ്തു",
  "journey.kind.pr": "Pull request",

  "review.history": "ഈ ബ്രൗസറിലെ സമീപകാല പരിശോധനകൾ",
  "review.historyEmpty": "ഇവിടെ ഓടിക്കുന്ന സ്കോറുകൾ ഈ പട്ടികയിൽ വരും.",

  "explain.share": "ലിങ്ക് പകർത്തുക",
  "explain.shared": "ലിങ്ക് പകർത്തി",

  "bot.exampleLabel": "മാതൃക മറുപടി",
  "bot.installTitle": "FirstPRbot ഇൻസ്റ്റാൾ ചെയ്യുക",
  "bot.installBody":
    "പബ്ലിക് റിപ്പോയിൽ GitHub App ഇൻസ്റ്റാൾ ചെയ്ത് issue-യിലോ pull request-ിലോ കമന്റ് ചെയ്യുക. FirstPRbot fix എഴുതില്ല.",
  "bot.step1": "GitHub-ൽ നിന്ന് ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്ത് വേണ്ട റിപ്പോകൾ അനുവദിക്കുക.",
  "bot.step2": "good first issue-ൽ /firstpr explain കമന്റ് ചെയ്യുക.",
  "bot.step3": "pull request-ൽ /firstpr review കമന്റ് ചെയ്യുക, അല്ലെങ്കിൽ PR തുറന്ന് score card കാത്തിരിക്കുക.",
  "bot.step4":
    "ഒന്നും വരുന്നില്ലെങ്കിൽ, ആ റിപ്പോയിൽ ആപ്പ് ഉണ്ടോ എന്നും കമന്റ് കൃത്യം /firstpr explain അല്ലെങ്കിൽ /firstpr review ആണോ എന്നും നോക്കുക.",

  "search.algoliaHome": "Search by Algolia",
});

export const hi: Record<I18nKey, string> = fill({
  "nav.findIssue": "Issue खोजें",
  "nav.explain": "Explain",
  "nav.review": "मेरा PR Review करें",
  "nav.language": "भाषा",
  "nav.progress": "FirstPR प्रगति",
  "nav.menuOpen": "मेनू खोलें",
  "nav.menuClose": "मेनू बंद करें",

  "footer.built":
    "AIBoomi Startup Weekend Kochi में DuoMatter द्वारा बनाया गया",
  "footer.tagline": "Match. Explain. Review. आप लिखते हैं।",
  "footer.botTitle": "FirstPRbot",
  "footer.botAbout":
    "रेपो पर GitHub App इंस्टॉल करें। किसी issue पर /firstpr explain कमेंट करें — सादा विवरण मिलेगा। PR खोलें या अपडेट करें तो score card आएगा। FirstPRbot आपका fix नहीं लिखता।",
  "footer.botLink": "GitHub पर FirstPRbot देखें",
  "footer.sourceLink": "GitHub पर सोर्स कोड",
  "footer.ctaTitle": "आपका पहला PR यहीं से शुरू होता है।",
  "footer.colProduct": "प्रोडक्ट",
  "footer.colOpenSource": "सोर्स",
  "footer.colTeam": "टीम",
  "footer.license": "AGPL-3.0",
  "bot.heading": "GitHub पर इस्तेमाल करें",
  "bot.body":
    "FirstPRbot Match → Explain → Review को issue और PR कमेंट्स में लाता है। इंस्टॉल करें, फिर good first issue पर /firstpr explain लिखें — या PR खोलकर बिना GitHub छोड़े score card पाएँ।",
  "bot.cta": "FirstPRbot के बारे में",

  "error.notFound.code": "404",
  "error.notFound.title": "पेज नहीं मिला",
  "error.notFound.body":
    "यह लिंक FirstPR पेज से मेल नहीं खाता। होम पर जाकर Match, Explain, या Review चुनें।",
  "error.notFound.home": "होम",
  "error.crash.eyebrow": "कुछ गलत हो गया",
  "error.crash.title": "समस्या आई",
  "error.crash.body":
    "थोड़ी देर बाद फिर कोशिश करें। आपका काम GitHub पर ही है। FirstPR यह पेज लोड नहीं कर सका।",
  "error.crash.retry": "फिर कोशिश करें",
  "error.crash.home": "होम",

  "hero.eyebrow": "FirstPR आपका कोड नहीं लिखता।",
  "hero.title": "आपका पहला PR, आपके लिखे हुए, merge के लिए तैयार।",
  "hero.subtitle":
    "FirstPR एक असली beginner issue ढूँढता है, कहाँ देखना है दिखाता है, और maintainer से पहले आपके PR की जाँच करता है।",
  "hero.trust":
    "FirstPR आपका कोड नहीं लिखता। यह दिखाता है कहाँ देखें, और maintainer से पहले PR जाँचता है।",
  "hero.cta": "मेरा पहला issue खोजें",

  "home.matchHeading": "Match",

  "steps.step": "चरण {n}",
  "steps.match.title": "Match",
  "steps.match.line":
    "GitHub username डालें। हम एक खुला good first issue चुनते हैं जिसे किसी ने नहीं लिया।",
  "steps.explain.title": "Explain",
  "steps.explain.line":
    "सादी भाषा, असली फ़ाइलें और लाइनें — तीन स्तर के hints, कभी fix नहीं।",
  "steps.review.title": "Review",
  "steps.review.line":
    "अपना PR या diff चिपकाएँ। हम issue और CONTRIBUTING.md के हिसाब से स्कोर करते हैं।",

  "flow.match": "Match",
  "flow.explain": "Explain",
  "flow.review": "Review",

  "match.username": "GitHub username",
  "match.usernamePlaceholder": "octocat",
  "match.repo": "Repo (वैकल्पिक)",
  "match.repoPlaceholder": "NekoDroid या owner/repo",
  "match.submit": "मेरा पहला issue खोजें",
  "match.finding": "खोज रहे हैं…",
  "match.retry": "फिर कोशिश करें",
  "match.failed": "Match असफल रहा",
  "match.youWrite": "आप लिखते हैं:",
  "match.noPublicRepos":
    "अभी कोई पब्लिक repo नहीं, इसलिए हम beginner-friendly docs issues चुनेंगे।",
  "match.explainIssue": "इस issue को Explain करें",
  "match.otherFits": "और मेल",
  "match.alreadyTaken": "पहले से लिए गए",
  "match.noIssuesBefore": "यहाँ कोई खुला good first issue नहीं। ",
  "match.noIssuesAfter": " या कोई और repo आज़माएँ।",
  "match.progress.repos": "आपके पब्लिक repo पढ़ रहे हैं",
  "match.progress.issues": "खुले good first issues ढूँढ रहे हैं",
  "match.progress.skip": "पहले से लिए गए छोड़ रहे हैं",

  "badge.beginnerFriendly": "Beginner-friendly",
  "badge.stretch": "Stretch",
  "badge.hard": "Hard",

  "verdict.ready": "Ready to merge",
  "verdict.almost": "Almost ready",
  "verdict.needs": "Needs changes",

  "explain.loading.issue": "issue पढ़ रहे हैं",
  "explain.loading.files": "ज़रूरी फ़ाइलें ढूँढ रहे हैं",
  "explain.loading.lines": "हर लाइन रेफ़रेंस जाँच रहे हैं",
  "explain.failed": "Explain असफल रहा",
  "explain.somethingWrong": "कुछ गलत हुआ।",
  "explain.retry": "फिर कोशिश करें",
  "explain.invalidNumber": "अमान्य issue नंबर।",
  "explain.whatAsking": "यह issue क्या माँग रहा है",
  "explain.whyMatters": "यह क्यों ज़रूरी है",
  "explain.words": "शब्द जो आपको न पता हों",
  "explain.whereLook": "कहाँ देखें",
  "explain.doneWhen": "आप तब पूरे हैं जब",
  "explain.howCheck": "अपना काम कैसे जाँचें",
  "explain.noCommands":
    "इस बदलाव के लिए CONTRIBUTING में कोई कमांड नहीं है।",
  "explain.learnFirst": "पहले यह सीखें",
  "explain.findAnother": "दूसरा issue खोजें",
  "explain.reviewPr": "मेरा PR Review करें",
  "explain.noCitations":
    "अभी कोई सत्यापित लाइन रेफ़रेंस नहीं। issue खोलें और repo tree देखें।",
  "explain.openOnGithub": "GitHub पर खोलें",
  "explain.checkedFile": "असली फ़ाइल से मिलाया गया",
  "explain.noChecklist": "अभी कोई checklist आइटम नहीं।",
  "explain.searchBySerpapi": "Search by SerpApi",

  "hint.title": "Hints",
  "hint.subtitle": "तीन कदम। FirstPR आपके लिए fix नहीं लिखता।",
  "hint.where": "कहाँ देखें",
  "hint.what": "क्या बदलें",
  "hint.pseudo": "Pseudocode",
  "hint.level": "लेवल {n}: {label}",
  "hint.checkYourself": "खुद जाँचें:",
  "hint.showNext": "अगला hint दिखाएँ",
  "hint.loading": "सोच रहे हैं…",
  "hint.askTitle": "FirstPR से पूछें",
  "hint.askPlaceholder": "issue के बारे में सवाल पूछें…",
  "hint.send": "भेजें",
  "hint.refuseChip": "मेरे लिए fix लिख दो",
  "hint.locked": "पहले पिछले hints अनलॉक करें",
  "hint.failed": "Hint असफल रहा",
  "hint.askFailed": "सवाल असफल रहा",
  "hint.requestFailed": "अनुरोध असफल रहा",
  "hint.wontWrite": "मैं आपके लिए fix नहीं लिखूँगा।",
  "hint.allUnlocked": "सभी hints अनलॉक",
  "hint.pressNext":
    "कहाँ देखना है अनलॉक करने के लिए \"Show next hint\" दबाएँ।",
  "hint.thinking": "FirstPR सोच रहा है…",

  "review.title": "मेरा PR Review करें",
  "review.subtitle":
    "एक pull request URL या diff चिपकाएँ। FirstPR लिंक किए issue, CONTRIBUTING.md और बदलाव के हिसाब से स्कोर करता है — आपका fix लिखे बिना।",
  "review.tabPr": "PR लिंक",
  "review.tabDiff": "diff चिपकाएँ",
  "review.prUrl": "Pull request URL",
  "review.prUrlPlaceholder": "https://github.com/owner/repo/pull/123",
  "review.diff": "Unified diff",
  "review.diffPlaceholder": "diff --git a/…",
  "review.repo": "Repo (वैकल्पिक)",
  "review.repoPlaceholder": "owner/repo",
  "review.issueNumber": "Issue नंबर (वैकल्पिक)",
  "review.issuePlaceholder": "4",
  "review.submit": "maintainer-ready चेक चलाएँ",
  "review.running": "चल रहा है…",
  "review.retry": "फिर कोशिश करें",
  "review.failed": "Review असफल रहा",
  "review.reviewing": "Review हो रहा है",
  "review.loading.pr": "आपका PR पढ़ रहे हैं",
  "review.loading.contributing": "CONTRIBUTING.md पढ़ रहे हैं",
  "review.loading.issue": "issue से मिला रहे हैं",
  "review.loading.diff": "diff Review कर रहे हैं",

  "score.outOf": "100 में से",
  "score.copy": "PR comment के रूप में कॉपी करें",
  "score.copied": "कॉपी हो गया",
  "score.checklist": "Checklist",
  "score.notApplicable": "लागू नहीं",
  "score.rule": "Rule",
  "score.ai": "AI",
  "score.lineComments": "लाइन कमेंट्स",
  "score.filesChanged": "Files changed",
  "score.questions": "जो सवाल एक maintainer पूछेगा",
  "score.blocker": "blocker",
  "score.suggestion": "suggestion",
  "score.nit": "nit",

  "nav.how": "कैसे चलता है",
  "nav.bot": "Bot",
  "nav.pro": "Pro",
  "nav.ready": "रेपो स्कोरकार्ड",
  "nav.journey": "मेरी यात्रा",
  "nav.skip": "सामग्री पर जाएँ",

  "hero.titleMark": "आपके लिखे हुए",
  "hero.proof1": "असली GitHub issues, नकली बोर्ड नहीं",
  "hero.proof2": "तीन स्तर के hints, पैच कभी नहीं",
  "hero.proof3": "स्कोर कोड की checklist है, अंदाज़ा नहीं",
  "hero.preview": "प्रोडक्ट झलक",

  "landing.contrastTitle": "वही issue. शुरुआत बिलकुल अलग.",
  "landing.contrastLead":
    "good-first-issue लेबल नहीं बताता कौन सी फ़ाइल खोलनी है. FirstPR बताता है, और fix लिखने से इनकार भी करता है.",
  "landing.rawTitle": "GitHub पर",
  "landing.raw1": "लेबलों की दीवार और एक body जो रेपो जानने वालों के लिए लिखी है",
  "landing.raw2": "ज़रूरी फ़ाइलों का नक्शा नहीं",
  "landing.raw3": "किसी और का PR पहले से खुला हो सकता है",
  "landing.firstTitle": "FirstPR में",
  "landing.first1": "issue क्या माँग रहा है, इसकी सीधी सार",
  "landing.first2": "रेपो से मिलाकर जाँचे फ़ाइल और लाइन लिंक",
  "landing.first3": "काम पूरा कब है, इसकी सूची, फिर अटकने पर hints",

  "landing.researchTitle": "पहली मील पर लोग रुक जाते हैं",
  "landing.researchBody":
    "ये आँकड़े good first issues के एक छपे अध्ययन से हैं. ये FirstPR के यूज़र काउंट नहीं हैं.",
  "landing.stat1":
    "अध्ययन के good first issues में से 40.9% नए लोगों ने हल नहीं किए.",
  "landing.stat2":
    "जिन नए लोगों ने good first issue से एक बदलाव पहुँचाया, उनमें 58.4% वापस नहीं आए.",
  "landing.statSource":
    "Xin Tan, Minghui Zhou, Zeyu Sun. A First Look at Good First Issues on GitHub. ESEC/FSE 2020. 9,368 issues.",
  "landing.statLink": "पेपर पढ़ें",

  "landing.howTitle": "तीन कदम. कोड फिर भी आप लिखते हैं.",
  "landing.audienceTitle": "यह किसके लिए है",
  "landing.studentsTitle": "अंतिम वर्ष और प्लेसमेंट के छात्र",
  "landing.studentsBody":
    "ट्यूटोरियल रेपो नहीं, असली merged PR चाहिए. FirstPR फिट चुनता है, फ़ाइलें दिखाता है, और maintainer से पहले PR जाँचता है.",
  "landing.maintainersTitle": "Maintainers",
  "landing.maintainersBody":
    "FirstPRbot लगाएँ. issue पर /firstpr explain, PR पर /firstpr review. issue से हटे पहले PR कम होंगे.",
  "landing.maintainersCta": "मेरा रेपो स्कोर करें",

  "landing.proBadge": "योजना में",
  "landing.proTitle": "Pro, जो पहले से कोड लिखते हैं",
  "landing.proBody":
    "मुफ़्त रास्ता good-first-issue का ही रहेगा. Pro सामान्य issue समझाएगा जब आप प्रोग्रामिंग में नए नहीं, रेपो में नए हों. अभी बिक्री पर नहीं, और कीमत तब तक नहीं जब तक तय न हो.",

  "landing.faqTitle": "भरोसा करने से पहले लोग यही पूछते हैं",
  "faq.q1": "क्या FirstPR मेरा कोड लिखता है?",
  "faq.a1": "नहीं. fix लिखने को कहोगे तो hints रुक जाते हैं. पैच तुम्हारा है.",
  "faq.q2": "क्या अकाउंट चाहिए?",
  "faq.a2": "नहीं. यात्रा कार्ड इस ब्राउज़र में रहता है, जब तक लिंक साझा न करो.",
  "faq.q3": "क्या यह प्राइवेट रेपो पर चलता है?",
  "faq.a3": "नहीं. सिर्फ़ पब्लिक रेपो.",
  "faq.q4": "FirstPRbot क्या है?",
  "faq.a4":
    "एक GitHub App. issue पर /firstpr explain या pull request पर /firstpr review कमेंट करें.",
  "faq.q5": "क्या स्कोर AI का है?",
  "faq.a5":
    "नहीं. संख्या checklist से कोड गिनता है. मॉडल सिर्फ़ सबूत भरता है.",
  "faq.q6": "कौन सी भाषाएँ?",
  "faq.a6":
    "इंटरफ़ेस में 15 भाषाएँ हैं. अंग्रेज़ी, मलयालम और हिन्दी हाथ से लिखी गई हैं. जहाँ पंक्ति नहीं है, बाकी अंग्रेज़ी पर लौटती हैं. व्याख्या अंग्रेज़ी में है.",

  "landing.finalTitle": "आपका पहला PR यहीं से शुरू होता है.",
  "landing.finalBody": "असली issue चुनो. फ़ाइलें देखो. रिव्यू माँगने से पहले PR जाँचो.",

  "match.sample": "नमूना username इस्तेमाल करें",
  "match.noIssues":
    "कोई खुला beginner issue नहीं मिला. अपनी पब्लिक प्रोफ़ाइल की भाषाओं से खोजने के लिए रेपो खाली छोड़ो, या दूसरा owner/repo आज़माओ.",
  "match.searchLabel": "Beginner issues खोजें",
  "match.searchPlaceholder": "docs, rust, accessibility…",
  "match.searchSubmit": "खोजें",
  "match.searchEmpty": "मेल खाते खुले good-first issues नहीं मिले.",
  "match.searchGithub": "GitHub पर खोज. search-only key होने पर Algolia चलेगा.",
  "match.searchAlgolia": "Search by Algolia",
  "match.free": "खाली लगता है",

  "availability.free": "खाली लगता है",
  "availability.assigned": "असाइन है",
  "availability.linked_pr": "PR पहले से खुला है",
  "availability.claimed": "किसी ने ले लिया",
  "availability.closed": "बंद",
  "availability.unknown": "जाँच अधूरी",
  "availability.title": "क्या यह issue खाली है?",

  "setup.title": "पहली बार चलाने का अनुमान",
  "setup.minutes": "लगभग {low}–{high} मिनट",
  "setup.empty": "README में setup के कदम साफ़ नहीं थे. clone करने से पहले CONTRIBUTING पढ़ो.",

  "ready.title": "क्या यह रेपो नए लोगों के लिए तैयार है?",
  "ready.subtitle":
    "पब्लिक रेपो से कोड की checklist: लाइसेंस, contributing गाइड, टेम्पलेट, setup, और खुले beginner issues. लोकप्रियता की दौड़ नहीं.",
  "ready.repo": "पब्लिक रेपो",
  "ready.repoPlaceholder": "owner/repo",
  "ready.submit": "इस रेपो का स्कोर लो",
  "ready.running": "रेपो पढ़ रहे हैं…",
  "ready.failed": "उस रेपो का स्कोर नहीं बन पाया",
  "ready.outOf": "100 में से",
  "ready.openIssues": "बिना assignee के {n} खुले beginner issues",

  "journey.title": "आपकी contributor यात्रा",
  "journey.subtitle":
    "issue मिलाने, व्याख्या खोलने, या PR स्कोर करने पर यह इस ब्राउज़र में बचता है. शेयर लिंक कॉपी करने तक कुछ अपलोड नहीं होता.",
  "journey.empty":
    "अभी कोई कदम नहीं. एक issue ढूँढो, व्याख्या खोलो, फिर लौटो. यह पेज सिर्फ़ वही दिखाता है जो तुमने यहाँ किया.",
  "journey.share": "शेयर लिंक कॉपी करें",
  "journey.copied": "लिंक कॉपी हो गया",
  "journey.shared": "साझा स्नैपशॉट",
  "journey.sharedBody":
    "यह कार्ड एक लिंक से आया है. यह किसी और के ब्राउज़र इतिहास का स्नैपशॉट है, लाइव प्रोफ़ाइल नहीं.",
  "journey.mine": "यह ब्राउज़र",
  "journey.prLabel": "एक pull request जाँचो",
  "journey.prPlaceholder": "https://github.com/owner/repo/pull/1",
  "journey.prSubmit": "merge स्थिति जाँचो",
  "journey.merged": "Merge हो गया",
  "journey.open": "अभी खुला है",
  "journey.closed": "बिना merge बंद",
  "journey.kind.match": "मिलाया",
  "journey.kind.explain": "समझाया",
  "journey.kind.review": "Review किया",
  "journey.kind.pr": "Pull request",

  "review.history": "इस ब्राउज़र की हाल की जाँच",
  "review.historyEmpty": "यहाँ चलाए स्कोर इस सूची में आएँगे.",

  "explain.share": "लिंक कॉपी करें",
  "explain.shared": "लिंक कॉपी हो गया",

  "bot.exampleLabel": "उदाहरण जवाब",
  "bot.installTitle": "FirstPRbot इंस्टॉल करें",
  "bot.installBody":
    "पब्लिक रेपो पर GitHub App लगाओ, फिर issue या pull request पर कमेंट करो. FirstPRbot fix नहीं लिखता.",
  "bot.step1": "GitHub से ऐप इंस्टॉल करो और जिन रेपो पर चाहिए उन्हें अनुमति दो.",
  "bot.step2": "good first issue पर /firstpr explain कमेंट करो.",
  "bot.step3": "pull request पर /firstpr review कमेंट करो, या PR खोलकर score card का इंतज़ार करो.",
  "bot.step4":
    "कुछ न आए तो देखो कि ऐप उसी रेपो पर लगा है और कमेंट ठीक /firstpr explain या /firstpr review है.",

  "search.algoliaHome": "Search by Algolia",
});

