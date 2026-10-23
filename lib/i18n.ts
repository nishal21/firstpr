export const UI_LANGS = ["en", "ml", "hi"] as const;
export type UiLang = (typeof UI_LANGS)[number];

/** Default UI language for first visit / unknown storage. */
export const DEFAULT_UI_LANG: UiLang = "en";

export const UI_LANG_STORAGE_KEY = "firstpr-lang";

/** Native name shown in the navbar button and dropdown. */
export const UI_LANG_NATIVE: Record<UiLang, string> = {
  en: "English",
  ml: "മലയാളം",
  hi: "हिन्दी",
};

const en = {
  "nav.findIssue": "Find an issue",
  "nav.explain": "Explain",
  "nav.review": "Review my PR",
  "nav.language": "Language",
  "nav.progress": "FirstPR progress",

  "footer.built": "Built at AIBoomi Startup Weekend Kochi by DuoMatter",

  "hero.title": "Your first PR, written by you, ready to merge.",
  "hero.subtitle":
    "FirstPR finds a real beginner issue, shows you exactly where to look, and checks your PR before a maintainer sees it.",
  "hero.trust":
    "FirstPR never writes your code. It shows you where to look and checks your PR before a maintainer sees it.",

  "home.matchHeading": "Match",

  "steps.step": "Step {n}",
  "steps.match.title": "Match",
  "steps.match.line":
    "Enter a GitHub username. We pick an open good first issue nobody claimed.",
  "steps.explain.title": "Explain",
  "steps.explain.line":
    "Plain English, real files and lines — hints in three levels, never the fix.",
  "steps.review.title": "Review",
  "steps.review.line":
    "Paste your PR or diff. We score it against the issue and CONTRIBUTING.md.",

  "flow.match": "Match",
  "flow.explain": "Explain",
  "flow.review": "Review",

  "match.username": "GitHub username",
  "match.usernamePlaceholder": "octocat",
  "match.repo": "Repo (optional)",
  "match.repoPlaceholder": "NekoDroid or owner/repo",
  "match.submit": "Find my first issue",
  "match.finding": "Finding…",
  "match.retry": "Retry",
  "match.failed": "Match failed",
  "match.youWrite": "You write:",
  "match.noPublicRepos":
    "No public repos yet, so we'll pick beginner-friendly docs issues.",
  "match.explainIssue": "Explain this issue",
  "match.otherFits": "Other fits",
  "match.alreadyTaken": "Already taken",
  "match.noIssuesBefore": "No open good first issues here. Try ",
  "match.noIssuesAfter": " or another repo.",
  "match.progress.repos": "Reading your public repos",
  "match.progress.issues": "Finding open good first issues",
  "match.progress.skip": "Skipping ones already taken",

  "badge.beginnerFriendly": "Beginner-friendly",
  "badge.stretch": "Stretch",
  "badge.hard": "Hard",

  "verdict.ready": "Ready to merge",
  "verdict.almost": "Almost ready",
  "verdict.needs": "Needs changes",

  "explain.loading.issue": "Reading the issue",
  "explain.loading.files": "Finding the files that matter",
  "explain.loading.lines": "Checking every line reference",
  "explain.failed": "Explain failed",
  "explain.somethingWrong": "Something went wrong.",
  "explain.retry": "Retry",
  "explain.invalidNumber": "Invalid issue number.",
  "explain.whatAsking": "What this issue is asking",
  "explain.whyMatters": "Why it matters",
  "explain.words": "Words you might not know",
  "explain.whereLook": "Where to look",
  "explain.doneWhen": "You're done when",
  "explain.howCheck": "How to check your work",
  "explain.noCommands": "No commands listed in CONTRIBUTING for this change.",
  "explain.learnFirst": "Learn this first",
  "explain.findAnother": "Find another issue",
  "explain.reviewPr": "Review my PR",
  "explain.noCitations":
    "No verified line references yet. Open the issue and explore the repo tree.",
  "explain.openOnGithub": "Open on GitHub",
  "explain.checkedFile": "Checked against the real file",
  "explain.noChecklist": "No checklist items yet.",
  "explain.searchBySerpapi": "Search by SerpApi",

  "hint.title": "Hints",
  "hint.subtitle": "Three steps. FirstPR never writes the fix for you.",
  "hint.where": "Where to look",
  "hint.what": "What to change",
  "hint.pseudo": "Pseudocode",
  "hint.level": "Level {n}: {label}",
  "hint.checkYourself": "Check yourself:",
  "hint.showNext": "Show next hint",
  "hint.loading": "Thinking…",
  "hint.askTitle": "Ask FirstPR",
  "hint.askPlaceholder": "Ask a question about the issue…",
  "hint.send": "Send",
  "hint.refuseChip": "Just write the fix for me",
  "hint.locked": "Unlock previous hints first",
  "hint.failed": "Hint failed",
  "hint.askFailed": "Ask failed",
  "hint.requestFailed": "Request failed",
  "hint.wontWrite": "I won't write the fix for you.",
  "hint.allUnlocked": "All hints unlocked",
  "hint.pressNext": "Press \"Show next hint\" to unlock where to look.",
  "hint.thinking": "FirstPR is thinking…",

  "review.title": "Review my PR",
  "review.subtitle":
    "Paste a pull request URL or a diff. FirstPR scores it against the linked issue, CONTRIBUTING.md, and the change itself — without writing your fix.",
  "review.tabPr": "PR link",
  "review.tabDiff": "Paste a diff",
  "review.prUrl": "Pull request URL",
  "review.prUrlPlaceholder": "https://github.com/owner/repo/pull/123",
  "review.diff": "Unified diff",
  "review.diffPlaceholder": "diff --git a/…",
  "review.repo": "Repo (optional)",
  "review.repoPlaceholder": "owner/repo",
  "review.issueNumber": "Issue number (optional)",
  "review.issuePlaceholder": "4",
  "review.submit": "Run maintainer-ready check",
  "review.running": "Running…",
  "review.retry": "Retry",
  "review.failed": "Review failed",
  "review.reviewing": "Reviewing",
  "review.loading.pr": "Reading your PR",
  "review.loading.contributing": "Reading CONTRIBUTING.md",
  "review.loading.issue": "Checking against the issue",
  "review.loading.diff": "Reviewing the diff",

  "score.outOf": "out of 100",
  "score.copy": "Copy as PR comment",
  "score.copied": "Copied",
  "score.checklist": "Checklist",
  "score.notApplicable": "Not applicable",
  "score.rule": "Rule",
  "score.ai": "AI",
  "score.lineComments": "Line comments",
  "score.filesChanged": "Files changed",
  "score.questions": "Questions a maintainer would ask",
  "score.blocker": "blocker",
  "score.suggestion": "suggestion",
  "score.nit": "nit",
} as const;

export type I18nKey = keyof typeof en;

const ml: Record<I18nKey, string> = {
  "nav.findIssue": "ഒരു issue കണ്ടെത്തുക",
  "nav.explain": "Explain",
  "nav.review": "എന്റെ PR Review ചെയ്യുക",
  "nav.language": "ഭാഷ",
  "nav.progress": "FirstPR പുരോഗതി",

  "footer.built":
    "AIBoomi Startup Weekend Kochi-യിൽ DuoMatter നിർമ്മിച്ചത്",

  "hero.title": "നിങ്ങളുടെ ആദ്യ PR, നിങ്ങൾ എഴുതിയത്, merge ചെയ്യാൻ തയ്യാർ.",
  "hero.subtitle":
    "FirstPR ഒരു യഥാർത്ഥ beginner issue കണ്ടെത്തി, എവിടെ നോക്കണമെന്ന് കാണിച്ചുതരുന്നു, maintainer കാണുന്നതിന് മുമ്പ് നിങ്ങളുടെ PR പരിശോധിക്കുന്നു.",
  "hero.trust":
    "FirstPR നിങ്ങളുടെ കോഡ് എഴുതില്ല. എവിടെ നോക്കണമെന്ന് കാണിക്കുകയും maintainer കാണുന്നതിന് മുമ്പ് PR പരിശോധിക്കുകയും ചെയ്യുന്നു.",

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
};

const hi: Record<I18nKey, string> = {
  "nav.findIssue": "Issue खोजें",
  "nav.explain": "Explain",
  "nav.review": "मेरा PR Review करें",
  "nav.language": "भाषा",
  "nav.progress": "FirstPR प्रगति",

  "footer.built":
    "AIBoomi Startup Weekend Kochi में DuoMatter द्वारा बनाया गया",

  "hero.title": "आपका पहला PR, आपके लिखे हुए, merge के लिए तैयार।",
  "hero.subtitle":
    "FirstPR एक असली beginner issue ढूँढता है, कहाँ देखना है दिखाता है, और maintainer से पहले आपके PR की जाँच करता है।",
  "hero.trust":
    "FirstPR आपका कोड नहीं लिखता। यह दिखाता है कहाँ देखें, और maintainer से पहले PR जाँचता है।",

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
};

export const dictionaries: Record<UiLang, Record<I18nKey, string>> = {
  en: en as Record<I18nKey, string>,
  ml,
  hi,
};

export function parseUiLang(value: string | null | undefined): UiLang {
  const v = value?.trim().toLowerCase();
  if (v === "ml" || v === "hi" || v === "en") return v;
  return DEFAULT_UI_LANG;
}

export type TParams = Record<string, string | number>;

/** Look up a UI string; fall back to English; replace `{name}` params. */
export function translate(
  lang: UiLang,
  key: I18nKey,
  params?: TParams,
): string {
  const raw =
    dictionaries[lang][key] ?? dictionaries.en[key] ?? String(key);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{${name}}`,
  );
}

/** Map API English difficulty badge → i18n key. */
export function difficultyBadgeKey(
  label: string,
): I18nKey | null {
  const n = label.trim().toLowerCase();
  if (n === "beginner-friendly" || n === "beginner friendly")
    return "badge.beginnerFriendly";
  if (n === "stretch") return "badge.stretch";
  if (n === "hard") return "badge.hard";
  return null;
}
