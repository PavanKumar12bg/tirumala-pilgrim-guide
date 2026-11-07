/** Blogs page + voice-helper blog copy. {placeholders} filled by fill(). */
const en = {
  blogs: "Blogs",
  blogsSearch: "Search blogs",
  blogsAllCats: "All",
  blogsThisLang: "My language",
  blogsAllLangs: "All languages",
  blogsEmpty: "No blogs published yet.",
  blogsNoMatch: "No blogs match your search.",
  blogsShare: "Share",
  blogsCopyLink: "Copy link",
  blogsCopied: "Link copied",
  blogsBack: "All blogs",
  blogsNotFound: "This blog is not available.",
  blogCat_general: "General", blogCat_temples: "Temples", blogCat_darshan: "Darshan", blogCat_annadanam: "Annadanam",
  blogCat_travel: "Travel", blogCat_festivals: "Festivals", blogCat_history: "History", blogCat_tips: "Tips",
  agentBlogsNone: "No published blog matches that yet.",
  agentBlogsFound: "Blogs found: {list}. Say a number to open one.",
  agentBlogsLatest: "Latest blogs: {list}. Say a number to open one.",
  agentBlogOpening: "Opening {name}.",
};
type Copy = typeof en;
const te: Copy = {
  blogs: "బ్లాగులు", blogsSearch: "బ్లాగులు వెతకండి", blogsAllCats: "అన్నీ", blogsThisLang: "నా భాష", blogsAllLangs: "అన్ని భాషలు",
  blogsEmpty: "ఇంకా బ్లాగులు ప్రచురించలేదు.", blogsNoMatch: "మీ శోధనకు సరిపడే బ్లాగులు లేవు.", blogsShare: "షేర్", blogsCopyLink: "లింక్ కాపీ",
  blogsCopied: "లింక్ కాపీ అయింది", blogsBack: "అన్ని బ్లాగులు", blogsNotFound: "ఈ బ్లాగ్ అందుబాటులో లేదు.",
  blogCat_general: "సాధారణం", blogCat_temples: "ఆలయాలు", blogCat_darshan: "దర్శనం", blogCat_annadanam: "అన్నదానం",
  blogCat_travel: "ప్రయాణం", blogCat_festivals: "ఉత్సవాలు", blogCat_history: "చరిత్ర", blogCat_tips: "సూచనలు",
  agentBlogsNone: "దానికి సరిపడే ప్రచురిత బ్లాగ్ ఇంకా లేదు.", agentBlogsFound: "బ్లాగులు: {list}. తెరవడానికి సంఖ్య చెప్పండి.",
  agentBlogsLatest: "తాజా బ్లాగులు: {list}. తెరవడానికి సంఖ్య చెప్పండి.", agentBlogOpening: "{name} తెరుస్తున్నాను.",
};
const ta: Copy = {
  blogs: "வலைப்பதிவுகள்", blogsSearch: "வலைப்பதிவுகளைத் தேடு", blogsAllCats: "அனைத்தும்", blogsThisLang: "என் மொழி", blogsAllLangs: "அனைத்து மொழிகள்",
  blogsEmpty: "இன்னும் வலைப்பதிவுகள் வெளியிடப்படவில்லை.", blogsNoMatch: "உங்கள் தேடலுக்கு பொருந்தும் பதிவுகள் இல்லை.", blogsShare: "பகிர்", blogsCopyLink: "இணைப்பை நகலெடு",
  blogsCopied: "இணைப்பு நகலெடுக்கப்பட்டது", blogsBack: "அனைத்து பதிவுகள்", blogsNotFound: "இந்தப் பதிவு கிடைக்கவில்லை.",
  blogCat_general: "பொது", blogCat_temples: "கோவில்கள்", blogCat_darshan: "தரிசனம்", blogCat_annadanam: "அன்னதானம்",
  blogCat_travel: "பயணம்", blogCat_festivals: "திருவிழாக்கள்", blogCat_history: "வரலாறு", blogCat_tips: "குறிப்புகள்",
  agentBlogsNone: "அதற்குப் பொருந்தும் வெளியிடப்பட்ட பதிவு இல்லை.", agentBlogsFound: "பதிவுகள்: {list}. திறக்க எண்ணைச் சொல்லுங்கள்.",
  agentBlogsLatest: "சமீபத்திய பதிவுகள்: {list}. திறக்க எண்ணைச் சொல்லுங்கள்.", agentBlogOpening: "{name} திறக்கிறேன்.",
};
const kn: Copy = {
  blogs: "ಬ್ಲಾಗ್‌ಗಳು", blogsSearch: "ಬ್ಲಾಗ್ ಹುಡುಕಿ", blogsAllCats: "ಎಲ್ಲಾ", blogsThisLang: "ನನ್ನ ಭಾಷೆ", blogsAllLangs: "ಎಲ್ಲಾ ಭಾಷೆಗಳು",
  blogsEmpty: "ಇನ್ನೂ ಬ್ಲಾಗ್‌ಗಳು ಪ್ರಕಟವಾಗಿಲ್ಲ.", blogsNoMatch: "ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದುವ ಬ್ಲಾಗ್ ಇಲ್ಲ.", blogsShare: "ಹಂಚಿ", blogsCopyLink: "ಲಿಂಕ್ ನಕಲಿಸಿ",
  blogsCopied: "ಲಿಂಕ್ ನಕಲಾಯಿತು", blogsBack: "ಎಲ್ಲಾ ಬ್ಲಾಗ್‌ಗಳು", blogsNotFound: "ಈ ಬ್ಲಾಗ್ ಲಭ್ಯವಿಲ್ಲ.",
  blogCat_general: "ಸಾಮಾನ್ಯ", blogCat_temples: "ದೇವಾಲಯಗಳು", blogCat_darshan: "ದರ್ಶನ", blogCat_annadanam: "ಅನ್ನದಾನ",
  blogCat_travel: "ಪ್ರಯಾಣ", blogCat_festivals: "ಉತ್ಸವಗಳು", blogCat_history: "ಇತಿಹಾಸ", blogCat_tips: "ಸಲಹೆಗಳು",
  agentBlogsNone: "ಅದಕ್ಕೆ ಹೊಂದುವ ಪ್ರಕಟಿತ ಬ್ಲಾಗ್ ಇಲ್ಲ.", agentBlogsFound: "ಬ್ಲಾಗ್‌ಗಳು: {list}. ತೆರೆಯಲು ಸಂಖ್ಯೆ ಹೇಳಿ.",
  agentBlogsLatest: "ಇತ್ತೀಚಿನ ಬ್ಲಾಗ್‌ಗಳು: {list}. ತೆರೆಯಲು ಸಂಖ್ಯೆ ಹೇಳಿ.", agentBlogOpening: "{name} ತೆರೆಯುತ್ತಿದ್ದೇನೆ.",
};
const ml: Copy = {
  blogs: "ബ്ലോഗുകൾ", blogsSearch: "ബ്ലോഗുകൾ തിരയുക", blogsAllCats: "എല്ലാം", blogsThisLang: "എന്റെ ഭാഷ", blogsAllLangs: "എല്ലാ ഭാഷകളും",
  blogsEmpty: "ഇതുവരെ ബ്ലോഗുകൾ പ്രസിദ്ധീകരിച്ചിട്ടില്ല.", blogsNoMatch: "തിരയലിന് യോജിക്കുന്ന ബ്ലോഗുകളില്ല.", blogsShare: "പങ്കിടുക", blogsCopyLink: "ലിങ്ക് പകർത്തുക",
  blogsCopied: "ലിങ്ക് പകർത്തി", blogsBack: "എല്ലാ ബ്ലോഗുകളും", blogsNotFound: "ഈ ബ്ലോഗ് ലഭ്യമല്ല.",
  blogCat_general: "പൊതു", blogCat_temples: "ക്ഷേത്രങ്ങൾ", blogCat_darshan: "ദർശനം", blogCat_annadanam: "അന്നദാനം",
  blogCat_travel: "യാത്ര", blogCat_festivals: "ഉത്സവങ്ങൾ", blogCat_history: "ചരിത്രം", blogCat_tips: "നുറുങ്ങുകൾ",
  agentBlogsNone: "അതിന് യോജിക്കുന്ന പ്രസിദ്ധീകരിച്ച ബ്ലോഗ് ഇല്ല.", agentBlogsFound: "ബ്ലോഗുകൾ: {list}. തുറക്കാൻ നമ്പർ പറയൂ.",
  agentBlogsLatest: "പുതിയ ബ്ലോഗുകൾ: {list}. തുറക്കാൻ നമ്പർ പറയൂ.", agentBlogOpening: "{name} തുറക്കുന്നു.",
};
const hi: Copy = {
  blogs: "ब्लॉग", blogsSearch: "ब्लॉग खोजें", blogsAllCats: "सभी", blogsThisLang: "मेरी भाषा", blogsAllLangs: "सभी भाषाएँ",
  blogsEmpty: "अभी कोई ब्लॉग प्रकाशित नहीं है।", blogsNoMatch: "आपकी खोज से मेल खाता कोई ब्लॉग नहीं।", blogsShare: "साझा करें", blogsCopyLink: "लिंक कॉपी करें",
  blogsCopied: "लिंक कॉपी हुआ", blogsBack: "सभी ब्लॉग", blogsNotFound: "यह ब्लॉग उपलब्ध नहीं है।",
  blogCat_general: "सामान्य", blogCat_temples: "मंदिर", blogCat_darshan: "दर्शन", blogCat_annadanam: "अन्नदान",
  blogCat_travel: "यात्रा", blogCat_festivals: "उत्सव", blogCat_history: "इतिहास", blogCat_tips: "सुझाव",
  agentBlogsNone: "इससे मेल खाता कोई प्रकाशित ब्लॉग नहीं है।", agentBlogsFound: "ब्लॉग: {list}। खोलने के लिए नंबर बोलें।",
  agentBlogsLatest: "नए ब्लॉग: {list}। खोलने के लिए नंबर बोलें।", agentBlogOpening: "{name} खोल रहा हूँ।",
};
const or: Copy = {
  blogs: "ବ୍ଲଗ୍", blogsSearch: "ବ୍ଲଗ୍ ଖୋଜନ୍ତୁ", blogsAllCats: "ସବୁ", blogsThisLang: "ମୋ ଭାଷା", blogsAllLangs: "ସବୁ ଭାଷା",
  blogsEmpty: "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବ୍ଲଗ୍ ପ୍ରକାଶିତ ହୋଇନାହିଁ।", blogsNoMatch: "ଆପଣଙ୍କ ଖୋଜ ସହ ମେଳ ଖାଉଥିବା ବ୍ଲଗ୍ ନାହିଁ।", blogsShare: "ସେୟାର", blogsCopyLink: "ଲିଙ୍କ କପି",
  blogsCopied: "ଲିଙ୍କ କପି ହେଲା", blogsBack: "ସବୁ ବ୍ଲଗ୍", blogsNotFound: "ଏହି ବ୍ଲଗ୍ ଉପଲବ୍ଧ ନାହିଁ।",
  blogCat_general: "ସାଧାରଣ", blogCat_temples: "ମନ୍ଦିର", blogCat_darshan: "ଦର୍ଶନ", blogCat_annadanam: "ଅନ୍ନଦାନ",
  blogCat_travel: "ଯାତ୍ରା", blogCat_festivals: "ଉତ୍ସବ", blogCat_history: "ଇତିହାସ", blogCat_tips: "ପରାମର୍ଶ",
  agentBlogsNone: "ଏହା ସହ ମେଳ ଖାଉଥିବା ପ୍ରକାଶିତ ବ୍ଲଗ୍ ନାହିଁ।", agentBlogsFound: "ବ୍ଲଗ୍: {list}। ଖୋଲିବାକୁ ନମ୍ବର କୁହନ୍ତୁ।",
  agentBlogsLatest: "ନୂଆ ବ୍ଲଗ୍: {list}। ଖୋଲିବାକୁ ନମ୍ବର କୁହନ୍ତୁ।", agentBlogOpening: "{name} ଖୋଲୁଛି।",
};
export const BLOG_COPY = { en, te, ta, kn, ml, hi, or };
