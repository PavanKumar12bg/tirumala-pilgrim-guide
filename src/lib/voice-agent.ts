import type { Lang } from "./i18n";
import { pickLocalized } from "./i18n";
import { interpretCommand } from "./voice-commands";
import { haversineMeters, type LatLng } from "./geo";
import type { Place } from "./places";

/** Deterministic, zero-cost intent engine for the site-wide voice helper. No AI calls. */
export type AgentPage = "/" | "/map" | "/transport" | "/journey" | "/darshan" | "/emergency" | "/ttd" | "/about" | "/blogs";
export type AgentIntent =
  | { kind: "stopSpeaking" | "repeat" | "slower" | "faster" | "pause" | "help" | "scrollDown" | "scrollUp" | "back" | "readPage" | "announcement" | "outside" | "locate" | "nearbyAll" | "stopNav" }
  | { kind: "open"; page: AgentPage }
  | { kind: "language"; language: Lang }
  | { kind: "nearest"; category: string }
  | { kind: "freeFood" | "darshanStatus" }
  | { kind: "category"; category: string }
  | { kind: "blogsLatest" | "readBlog" }
  | { kind: "blogSearch"; query: string }
  | { kind: "navigate"; query: string }
  | { kind: "info"; query: string }
  | { kind: "query"; text: string };

const rx = (s: string) => new RegExp(s, "iu");
const CONTROL: [AgentIntent, RegExp][] = [
  [{ kind: "stopNav" }, rx("stop\\s*(navigation|route)|నావిగేషన్.*(ఆపు|నిలిపి)|வழிகாட்ட.*நிறுத்த|ನ್ಯಾವಿಗೇಷನ್.*ನಿಲ್ಲಿ|നാവിഗേഷൻ.*നിർത്ത|नेविगेशन.*(रोको|बंद)|ନେଭିଗେସନ୍.*ବନ୍ଦ")],
  [{ kind: "pause" }, rx("stop listening|pause|వినడం ఆపు|కేట్పதை நிறுத்து|கேட்பதை நிறுத்து|ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸ|കേൾക്കൽ നിർത്ത|सुनना (बंद|रोको)|ଶୁଣିବା ବନ୍ଦ")],
  [{ kind: "stopSpeaking" }, rx("^(stop|quiet|silence|be quiet)$|stop speaking|stop talking|మాట్లాడటం ఆపు|ఆపు$|నిశ్శబ్ద|பேசுவதை நிறுத்து|நிறுத்து$|ಮಾತು ನಿಲ್ಲಿಸ|ನಿಲ್ಲಿಸು$|സംസാരം നിർത്ത|നിർത്തൂ?$|बोलना बंद|चुप|बंद करो$|କହିବା ବନ୍ଦ|ଚୁପ୍")],
  [{ kind: "repeat" }, rx("repeat|say (that|it) again|once more|మళ్ళీ చెప్పు|మళ్లీ చెప్పు|மீண்டும் சொல்|ಮತ್ತೆ ಹೇಳ|വീണ്ടും പറയ|फिर से (बोलो|कहो)|दोहराओ|दोहराएँ|ପୁଣି କୁହ")],
  [{ kind: "slower" }, rx("slow(er)?|speak slowly|నెమ్మదిగా|మెల్లగా|மெதுவாக|ನಿಧಾನ|പതുക്കെ|धीरे|धीमा|ଧୀରେ")],
  [{ kind: "faster" }, rx("fast(er)?|speak quickly|వేగంగా|வேகமாக|ವೇಗವಾಗಿ|വേഗത്തിൽ|तेज़|तेज|ଶୀଘ୍ର")],
  [{ kind: "outside" }, rx("\\bbook|booking|reserve|reservation|\\bpay\\b|payment|buy ticket|బుక్|బుకింగ్|చెల్లింపు|முன்பதிவு|பணம் செலுத்து|ಬುಕ್|ಪಾವತಿ|ബുക്ക്|പണമടയ്|बुक|बुकिंग|भुगतान|ବୁକ୍|ଦେୟ")],
  [{ kind: "help" }, rx("^help$|what can you do|how to use|సహాయం|ఏం చేయగలవు|உதவி|ಸಹಾಯ|സഹായം|मदद|सहायता|ସାହାଯ୍ୟ")],
  [{ kind: "scrollDown" }, rx("scroll down|go down|^down$|కిందికి|క్రిందికి|கீழே|ಕೆಳಗೆ|താഴേക്ക്|नीचे|ତଳକୁ")],
  [{ kind: "scrollUp" }, rx("scroll up|go up|^up$|పైకి|மேலே|ಮೇಲೆ|മുകളിലേക്ക്|ऊपर|ଉପରକୁ")],
  [{ kind: "back" }, rx("go back|^back$|previous page|వెనక్కి|వెనుకకు|பின்னால்|பின் செல்|ಹಿಂದೆ|പിന്നോട്ട്|वापस|पीछे|ପଛକୁ")],
  [{ kind: "readPage" }, rx("read (this|the)? ?page|read aloud|what is (on|in) (this|the) (page|screen)|పేజీ చదువు|ఈ పేజీ|చదివి వినిపించు|பக்கத்தைப் படி|படித்துக் காட்டு|ಪುಟ ಓದು|ഈ പേജ് വായിക്ക|पेज पढ़ो|पढ़कर सुनाओ|ପୃଷ୍ଠା ପଢ")],
  [{ kind: "announcement" }, rx("announcement|ప్రకటన|அறிவிப்பு|ಪ್ರಕಟಣೆ|അറിയിപ്പ്|घोषणा|ଘୋଷଣା")],
  [{ kind: "locate" }, rx("my location|where am i|నా (స్థానం|లొకేషన్)|నేను ఎక్కడ|என் இருப்பிடம்|ನನ್ನ ಸ್ಥಳ|എന്റെ സ്ഥാനം|मेरा स्थान|मैं कहाँ|ମୋ ସ୍ଥାନ")],
  [{ kind: "nearbyAll" }, rx("nearby places|what is near|దగ్గరలో.*ప్రదేశ|సమీప.*ప్రదేశ|அருகி.*இடங்கள்|ಹತ್ತಿರ.*ಸ್ಥಳಗಳು|അടുത്ത.*സ്ഥലങ്ങൾ|आस.?पास.*(स्थान|जगह)|ନିକଟ.*ସ୍ଥାନ")],
];
const PAGES: [AgentPage, RegExp][] = [
  ["/", rx("^(go )?home( page)?$|go home|home page|హోమ్|ముఖపేజీ|முகப்பு|ಮುಖಪುಟ|ഹോം|होम|मुख्य पृष्ठ|ମୁଖ୍ୟ ପୃଷ୍ଠା")],
  ["/map", rx("open (the )?map|show (the )?map|^map$|మ్యాప్|పటం|வரைபட|ನಕ್ಷೆ|മാപ്പ്|नक्शा|मैप|ମାନଚିତ୍ର")],
  ["/transport", rx("transport|bus|travel|ట్రాన్స్పోర్ట్|ట్రాన్స్ పోర్ట్|ట్రాన్స్‌పోర్ట్|రవాణా|బస్సు|బస్|போக்குவரத்து|பேருந்து|ಸಾರಿಗೆ|ಬಸ್|ഗതാഗതം|ബസ്|परिवहन|बस|ପରିବହନ|ବସ୍")],
  ["/journey", rx("journey|itinerary|plan(ner)?|ప్రయాణ ప్రణాళిక|ప్రణాళిక|பயணத் திட்ட|ಪ್ರಯಾಣ ಯೋಜನೆ|യാത്രാ പദ്ധതി|यात्रा योजना|ଯାତ୍ରା ଯୋଜନା")],
  ["/darshan", rx("darshan|waiting time|wait time|దర్శన|వేచి ఉండే|தரிசன|ದರ್ಶನ|ദർശന|दर्शन|ଦର୍ଶନ")],
  ["/emergency", rx("emergency|అత్యవసర|அவசர|ತುರ್ತು|അടിയന്തര|आपातकाल|आपात|ଜରୁରୀ")],
  ["/ttd", rx("ttd (links|website)|official (links|website)|టీటీడీ|తితిదే")],
  ["/blogs", rx("blogs?|బ్లాగ్|బ్లాగులు|வலைப்பதிவு|ப்ளாக்|ಬ್ಲಾಗ್|ബ്ലോഗ്|ब्लॉग|ବ୍ଲଗ୍")],
  ["/about", rx("about (this|the) (site|website|app)|మా గురించి")],
];
const OPEN_WORD = rx("open|ఓపెన్|తెరవు|తెరిచి|చేయి|చెయ్యి|వెళ్ళు|వెళ్లు|show|go to|take me|తెరువు|చూపించు|చూపు|తీసుకెళ్ళు|తీసుకెళ్లు|திற|காட்டு|ತೆರೆ|ತೋರಿಸು|തുറക്ക|കാണിക്ക|खोलो|दिखाओ|ले चलो|ଖୋଲ|ଦେଖାଅ");

/** Category synonyms. Only categories the data actually has will produce results. */
export const CATEGORY_WORDS: [string, RegExp][] = [
  ["toilet", rx("toilet|bathroom|restroom|washroom|lavatory|టాయిలెట్|మరుగుదొడ్|బాత్రూమ్|கழிப்பறை|கழிவறை|ಶೌಚಾಲಯ|ಟಾಯ್ಲೆಟ್|ശൗചാലയ|ടോയ്‌ലറ്റ്|ടോയ്ലറ്റ്|शौचालय|टॉयलेट|बाथरूम|ଶୌଚାଳୟ|ଟଏଲେଟ")],
  ["water", rx("drinking water|water|త్రాగునీరు|తాగునీరు|మంచినీరు|నీళ్ళు|నీరు|குடிநீர்|தண்ணீர்|ಕುಡಿಯುವ ನೀರು|ನೀರು|കുടിവെള്ളം|വെള്ളം|पीने का पानी|पानी|ପାନୀୟ ଜଳ|ପାଣି")],
  ["medical", rx("hospital|medical|doctor|clinic|first aid|హాస్పిటల్|ఆసుపత్ర|వైద్య|డాక్టర్|மருத்துவ|டாக்டர்|ಆಸ್ಪತ್ರೆ|ವೈದ್ಯ|ആശുപത്രി|ഡോക്ടർ|अस्पताल|डॉक्टर|चिकित्सा|ଡାକ୍ତର")],
  ["food", rx("food|eat|meal|annaprasad|canteen|hungry|అన్నప్రసాద|భోజన|ఆహార|அன்னப்பிரசாத|உணவு|ಅನ್ನಪ್ರಸಾದ|ಊಟ|ആഹാര|അന്നപ്രസാദ|भोजन|खाना|अन्नप्रसाद|ଖାଦ୍ୟ|ଅନ୍ନପ୍ରସାଦ")],
  ["hotel", rx("hotel|room|stay|accommodation|cottage|guest ?house|హోటల్|గది|వసతి|ஹோட்டல்|தங்குமிட|ಹೋಟೆಲ್|ವಸತಿ|ഹോട്ടൽ|താമസ|होटल|कमरा|ठहर|ହୋଟେଲ|ରହିବା")],
  ["parking", rx("parking|park (my|the) (car|vehicle)|పార్కింగ్|வாகன நிறுத்த|பார்க்கிங்|ಪಾರ್ಕಿಂಗ್|പാർക്കിംഗ്|पार्किंग|ପାର୍କିଂ")],
  ["transport", rx("bus stop|bus stand|bus station|taxi|బస్ స్టాప్|బస్ స్టాండ్|பேருந்து நிலைய|ಬಸ್ ನಿಲ್ದಾಣ|ബസ് സ്റ്റാൻഡ്|बस स्टैंड|बस अड्डा|ବସ୍ ଷ୍ଟାଣ୍ଡ")],
  ["temple", rx("temple|shrine|ఆలయం|గుడి|దేవాలయ|கோவில்|கோயில்|ದೇವಾಲಯ|ದೇವಸ್ಥಾನ|ക്ഷേത്ര|मंदिर|ମନ୍ଦିର")],
  ["office", rx("office|counter|కార్యాలయ|కౌంటర్|அலுவலக|கவுண்டர்|ಕಚೇರಿ|ಕೌಂಟರ್|ഓഫീസ്|കൗണ്ടർ|कार्यालय|काउंटर|କାର୍ଯ୍ୟାଳୟ")],
  ["enquiry", rx("enquiry|inquiry|information (desk|centre|center)|help ?desk|విచారణ|சாரணை|விசாரணை|ವಿಚಾರಣೆ|അന്വേഷണ|पूछताछ|ପଚରାଉଚରା")],
  ["amenity", rx("amenit|facilit|locker|cloak|సౌకర్య|వసతులు|வசதி|ಸೌಲಭ್ಯ|സൗകര്യ|सुविधा|ସୁବିଧା")],
];
const NAV = rx("^(?:please )?(?:take me to|navigate to|directions? to|route to|way to|go to|show me|show|find|where is|where's)\\s+(.+?)(?:\\s+on (?:the )?map)?$");
const NAV_SUFFIX = rx("^(.+?)\\s*(?:కి|కు|కీ)?\\s*(?:తీసుకెళ్ళు|తీసుకెళ్లు|దారి చూపు|దారి|ఎక్కడ ఉంది|ఎక్కడ|చూపించు)$|^(.+?)\\s*(?:க்கு|கு)?\\s*(?:வழி காட்டு|வழி|அழைத்துச் செல்|எங்கே)$|^(.+?)\\s*(?:ಗೆ|ಕ್ಕೆ)?\\s*(?:ದಾರಿ|ಕರೆದುಕೊಂಡು ಹೋಗು|ಎಲ್ಲಿದೆ)$|^(.+?)\\s*(?:ലേക്ക്)?\\s*(?:വഴി|കൊണ്ടുപോകൂ|എവിടെ)$|^(.+?)\\s*(?:तक|पर|का|की)?\\s*(?:ले चलो|ले जाओ|रास्ता|कहाँ है|कहां है)$|^(.+?)\\s*(?:କୁ)?\\s*(?:ବାଟ|ନେଇଯାଅ|କେଉଁଠି)$");
const INFO = rx("^(?:tell me about|what is|what's|info(?:rmation)? (?:about|on)|details of)\\s+(.+)$|^(.+?)\\s*(?:గురించి(?: చెప్పు)?|వివరాలు)$|^(.+?)\\s*(?:பற்றி(?: சொல்)?)$|^(.+?)\\s*(?:ಬಗ್ಗೆ(?: ಹೇಳು)?)$|^(.+?)\\s*(?:നെക്കുറിച്ച്|കുറിച്ച്)(?: പറയൂ)?$|^(.+?)\\s*(?:के बारे में(?: बताओ)?)$|^(.+?)\\s*(?:ବିଷୟରେ(?: କୁହ)?)$");
const NEAR_WORD = rx("near|closest|nearest|need|where|want|find|దొరుకు|దగ్గర|సమీప|కావాలి|ఎక్కడ|அருகில்|அருகிலுள்ள|வேண்டும்|எங்கே|ಹತ್ತಿರ|ಬೇಕು|ಎಲ್ಲಿ|അടുത്ത|വേണം|എവിടെ|नज़दीक|नजदीक|पास|चाहिए|कहाँ|କହିଁ|ନିକଟ|ଦରକାର|କେଉଁଠି");

const firstGroup = (m: RegExpMatchArray | null) => m?.slice(1).find(Boolean)?.trim();
/** Free meals / Annaprasadam: spoken variants (with or without spaces, Telugu and transliterated). */
export const FREE_FOOD = rx("అన్న ?సత్ర|అన్న ?సత్త్ర|అన్న ?దాన|అన్న ?ప్రసాద|ఉచిత ?(అన్న|భోజన|ఆహార)|free ?(food|meals?|lunch|dinner|annadanam)|anna ?(satram|sathram|chatram|danam|dhanam|prasad)|annadhanam|అన్నదానం|அன்னதான|அன்னப்பிரசாத|இலவச உணவு|ಅನ್ನದಾನ|ಅನ್ನಪ್ರಸಾದ|ಉಚಿತ ಊಟ|അന്നദാന|അന്നപ്രസാദ|സൗജന്യ ഭക്ഷണ|अन्नदान|अन्नप्रसाद|मुफ्त भोजन|मुफ़्त भोजन|मुफ्त खाना|ଅନ୍ନଦାନ|ଅନ୍ନପ୍ରସାଦ|ମାଗଣା ଖାଦ୍ୟ");
/** Words in stored listings that denote free meals; only real listing text is matched. */
const FREE_FOOD_DATA = rx("annaprasad|annadan|anna ?satram|free (food|meal)|అన్నప్రసాద|అన్నదాన|అన్న ?సత్ర|ఉచిత భోజన|அன்னப்பிரசாத|ಅನ್ನಪ್ರಸಾದ|അന്നപ്രസാദ|अन्नप्रसाद|ଅନ୍ନପ୍ରସାଦ");
export function findFreeFood(places: Place[]) {
  return places.filter(p => p.visible && [...Object.values(p.name ?? {}), ...Object.values((p.description as Record<string, string | undefined> | null) ?? {}), p.slug.replaceAll("-", " "), ...(p.aliases ?? [])].some(v => !!v && FREE_FOOD_DATA.test(normalize(v))));
}
export const normalize = (s: string) => s.normalize("NFC").replace(/[\u200b-\u200d\ufeff]/gu, "").toLowerCase().replace(/[.,!?।॥"“”'’]/gu, " ").replace(/\s+/gu, " ").trim();

/** Spoken phrases that mean the same real place; expanded into search terms matched against actual listings only. */
export const SYNONYM_GROUPS: { re: RegExp; terms: string[] }[] = [
  { re: rx("శ్రీవారి|స్వామివారి|srivari|sri ?vari|balaji|బాలాజీ|main temple|ప్రధాన ఆలయ|venkateswara|వేంకటేశ్వర|వెంకటేశ్వర|ஏழுமலையான்|வெங்கடேச|ಶ್ರೀವಾರಿ|ವೆಂಕಟೇಶ್ವರ|ശ്രീവാരി|വെങ്കിടേശ്വര|श्रीवारी|बालाजी|वेंकटेश्वर|ଶ୍ରୀବାରି|ବାଲାଜୀ|ଭେଙ୍କଟେଶ୍ୱର"), terms: ["srivari", "venkateswara", "balaji", "శ్రీవారి", "వేంకటేశ్వర", "main temple", "sri venkateswara swamy"] },
  { re: FREE_FOOD_RE(), terms: ["annaprasadam", "annadanam", "anna satram", "అన్నసత్రం", "అన్నప్రసాద", "అన్నదాన", "vengamamba", "వెంగమాంబ"] },
  { re: rx("వెంగమాంబ|vengamamba|tarigonda|తరిగొండ|మాతృశ్రీ"), terms: ["vengamamba", "వెంగమాంబ", "tarigonda", "తరిగొండ"] },
];
function FREE_FOOD_RE() { return rx("అన్న ?సత్ర|అన్న ?దాన|ఉచిత ?(అన్న|భోజన)|free ?(food|meals?)|food distribution|anna ?(satram|danam|prasad)"); }
export const expandQuery = (q: string) => { const n = normalize(q); return [n, ...SYNONYM_GROUPS.filter(g => g.re.test(n)).flatMap(g => g.terms)]; };

const BLOG_WORD = rx("blogs?|articles?|బ్లాగ్|బ్లాగులు|వ్యాసా?ల?|வலைப்பதிவு|ப்ளாக்|ಬ್ಲಾಗ್|ബ്ലോഗ്|ब्लॉग|लेख|ବ୍ଲଗ୍");
const LATEST_WORD = rx("latest|new|recent|తాజా|కొత్త|சமீபத்திய|புதிய|ಇತ್ತೀಚಿನ|ಹೊಸ|പുതിയ|नए|नया|ताज़ा|ନୂଆ");
const READ_WORD = rx("read|చదువు|చదివి|படி|ಓದು|വായിക്ക|पढ़|ପଢ");
const BLOG_FILLER = rx("\\b(show|find|search|open|about|on|for|me|the|a|blogs?|articles?)\\b|బ్లాగ్\\S*|బ్లాగులు|గురించి|వెతుకు|చూపించు|చూపు|ఓపెన్|చేయి|ब्लॉग|के बारे में|खोजो|दिखाओ|வலைப்பதிவு\\S*|பற்றி|ಬ್ಲಾಗ್\\S*|ಬಗ್ಗೆ|ബ്ലോഗ്\\S*|കുറിച്ച്|ବ୍ଲଗ୍\\S*|ବିଷୟରେ");

export function parseIntent(raw: string): AgentIntent | null {
  const text = normalize(raw);
  if (!text) return null;
  const lang = interpretCommand(text);
  if (lang?.kind === "language") return { kind: "language", language: lang.language };
  if (READ_WORD.test(text) && rx("this blog|ఈ బ్లాగ్|blog").test(text)) return { kind: "readBlog" };
  const informationQuestion = rx("what|how|tell|rules|details|policy|గురించి|వివర|ఎలా|నియమ|பற்றி|ಬಗ್ಗೆ|കുറിച്ച്|बारे|नियम|ବିଷୟ").test(text);
  for (const [intent, re] of CONTROL) if (re.test(text) && !(intent.kind === "outside" && informationQuestion)) return intent;
  if (BLOG_WORD.test(text)) {
    if (LATEST_WORD.test(text)) return { kind: "blogsLatest" };
    const rest = text.replace(new RegExp(BLOG_FILLER.source, "giu"), " ").replace(/\s+/g, " ").trim();
    if (rest.length > 1) return { kind: "blogSearch", query: rest };
    return { kind: "open", page: "/blogs" };
  }
  // Status answers reuse actual guide figures; never infer live conditions.
  if (rx("(?:darshan|waiting|wait|compartments?).*(?:time|today|current|how|count)|(?:today|current|how).*(?:darshan|compartments?)|దర్శన.*(?:సమయం|టైమింగ్|ఎంత)|కంపార్ట్.?మెంట్|తిరుమల.*(?:ప్రస్తుతం|పరిస్థితి)|தரிசன.*நேரம்|ದರ್ಶನ.*ಸಮಯ|ദർശന.*സമയം|दर्शन.*समय|ଦର୍ଶନ.*ସମୟ").test(text)) return { kind: "darshanStatus" };
  const explicitInfo = firstGroup(text.match(INFO));
  if (explicitInfo) return { kind: "info", query: explicitInfo };
  // Specific entities win over broad food/category matching; never substitute another food centre.
  if (rx("వెంగమాంబ|vengamamba|tarigonda|తరిగొండ").test(text)) return { kind: "navigate", query: text };
  if (FREE_FOOD.test(text) || rx("భోజనం ఎక్కడ దొరుకుతుంది|ఫ్రీ ఫుడ్").test(text)) return { kind: "freeFood" };
  if ((SYNONYM_GROUPS[0]?.re.test(text) || rx("^(గుడికి ఎలా వెళ్లాలి|i want to visit the temple)$").test(text)) && !rx("darshan|దర్శన|தரிசன|ದರ್ಶನ|ദർശന|दर्शन|ଦର୍ଶନ").test(text)) return { kind: "navigate", query: text === "గుడికి ఎలా వెళ్లాలి" || text === "i want to visit the temple" ? "main temple" : text };
  const cat = CATEGORY_WORDS.find(([, re]) => re.test(text))?.[0];
  if (cat && OPEN_WORD.test(text) && !rx("near|nearest|closest|దగ్గర|సమీప|அருக|ಹತ್ತಿರ|അടുത്ത|नजदीक|नज़दीक|ନିକଟ").test(text)) return { kind: "category", category: cat };
  if (cat && (NEAR_WORD.test(text) || text.split(" ").length <= 3)) return { kind: "nearest", category: cat };
  const nav = firstGroup(text.match(NAV)) ?? firstGroup(text.match(NAV_SUFFIX));
  const info = firstGroup(text.match(INFO));
  for (const [page, re] of PAGES) if (re.test(text) && (OPEN_WORD.test(text) || text.split(" ").length <= 2) && !(nav && nav.split(" ").length > 2)) return { kind: "open", page };
  if (nav) return { kind: "navigate", query: nav };
  if (info) return { kind: "info", query: info };
  return { kind: "query", text };
}

const tokens = (s: string) => normalize(s).split(" ").filter(w => w.length > 1);
/** Score how well `query` matches any localized name. 1 = exact. */
export function nameScore(query: string, names: (string | undefined)[]) {
  const q = normalize(query);
  if (!q) return 0;
  const qt = tokens(q);
  let best = 0;
  for (const raw of names) {
    if (!raw) continue;
    const n = normalize(raw);
    if (n === q) return 1;
    if (n.includes(q) || (q.includes(n) && n.length > 3)) best = Math.max(best, 0.85);
    const nt = tokens(n);
    if (qt.length && nt.length) {
      const hit = qt.filter(w => nt.some(x => x.startsWith(w) || w.startsWith(x))).length;
      best = Math.max(best, (hit / qt.length) * 0.8);
    }
  }
  return best;
}

export function findPlaces(query: string, places: Place[]) {
  const scored = places.filter(p => p.visible)
    .map(p => {
      const names = [...Object.values(p.name), p.slug.replaceAll("-", " "), ...(p.aliases ?? [])];
      const specificFood = /వెంగమాంబ|vengamamba|tarigonda|తరిగొండ/iu.test(query);
      const terms = specificFood ? [normalize(query), "vengamamba", "వెంగమాంబ", "tarigonda", "తరిగొండ"] : expandQuery(query);
      const direct = nameScore(query, names);
      const viaSyn = Math.max(0, ...terms.slice(1).map(t => names.some(n => n && normalize(n).includes(t)) ? 0.85 * 0.95 : 0));
      const descs = Object.values((p.description as Record<string, string | undefined> | null) ?? {});
      const viaDesc = terms.some(t => t.length > 3 && descs.some(d => d && normalize(d).includes(t))) ? 0.55 : 0;
      // "Srivari / Balaji temple" means the temple, not guest houses that share the name.
      const templeBoost = p.category === "temple" && SYNONYM_GROUPS[0]?.re.test(normalize(query)) ? 0.1 : 0;
      return { place: p, score: Math.min(1, Math.max(direct, viaSyn, viaDesc) + (Math.max(direct, viaSyn, viaDesc) >= 0.5 ? templeBoost : 0)) };
    })
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return { match: null, options: [] as Place[] };
  const close = scored.filter(x => x.score >= top.score - 0.05);
  if (close.length === 1 || top.score === 1 && (scored[1]?.score ?? 0) < 1) return { match: top.place, options: [] as Place[] };
  return { match: null, options: close.slice(0, 4).map(x => x.place) };
}

export const hasCoords = (p: Place): p is Place & { lat: number; lng: number } => p.coords_verified && typeof p.lat === "number" && typeof p.lng === "number";

/** Only visible, coordinate-verified places; sorted by real distance. Water has no category, so match by name. */
export function nearestPlaces(category: string, places: Place[], from: LatLng | null) {
  const waterName = /water|నీరు|నీళ్ళ|குடிநீர்|ನೀರು|വെള്ള|पानी|ପାଣି|ଜଳ/iu;
  const pool = places.filter(p => p.visible && (category === "water" ? Object.values(p.name).some(n => waterName.test(n ?? "")) : p.category === category));
  const mapped = pool.filter(hasCoords);
  const list = from ? mapped.map(p => ({ place: p, meters: haversineMeters(from, [p.lat, p.lng]) })).sort((a, b) => a.meters - b.meters) : mapped.map(p => ({ place: p, meters: null as number | null }));
  return { total: pool.length, mapped: list };
}

export type Knowledge = { id: string; question: Record<string, string | undefined>; answer: Record<string, string | undefined>; keywords: string[]; category: string; source_label: string | null; source_url: string | null; ttd_verified: boolean };
export function findKnowledge(query: string, entries: Knowledge[]) {
  const qt = tokens(query);
  if (!qt.length) return null;
  let best: { entry: Knowledge; score: number } | null = null;
  for (const entry of entries) {
    const pool = [...Object.values(entry.question), ...entry.keywords].filter(Boolean).flatMap(s => tokens(s as string));
    const hit = qt.filter(w => pool.some(x => x.startsWith(w) || w.startsWith(x))).length;
    const kw = entry.keywords.some(k => k && normalize(query).includes(normalize(k))) ? 0.3 : 0;
    const score = hit / qt.length + kw;
    if (!best || score > best.score) best = { entry, score };
  }
  return best && best.score >= 0.6 ? best.entry : null;
}

/** Localized text, flagging when the visitor's language had to fall back. */
export function localizedWithFlag(obj: unknown, lang: Lang) {
  const text = pickLocalized(obj, lang);
  const own = !!(obj && typeof obj === "object" && (obj as Record<string, string | undefined>)[lang]?.trim());
  return { text, fallback: !!text && !own };
}

export const fill = (template: string, vars: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
