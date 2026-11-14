import type { Lang } from "./i18n";
export type VoiceAction = { kind: "category"; category: string } | { kind: "location" | "nearby" | "stop" | "map" | "temple" | "navigate" } | { kind: "language"; language: Lang } | { kind: "search"; text: string };
const patterns: [VoiceAction, RegExp][] = [
 [{ kind: "stop" }, /నావిగేషన్\s*ఆపు|నావిగేషన్\s*నిలిపి|stop\s*(navigation|route)|வழிகாட்ட.*நிறுத்த|வழிசெலுத்த.*நிறுத்த|ನ್ಯಾವಿಗೇಷನ್.*ನಿಲ್ಲಿ|നാവിഗേഷൻ.*നിർത്ത|नेविगेशन.*(रोको|बंद)|ନେଭିଗେସନ୍.*ବନ୍ଦ/iu],
 [{ kind: "language", language: "en" }, /ఇంగ్లీష్|ఆంగ్ల|switch.*english|change.*english|english.*(change|switch)|ஆங்கில|ಇಂಗ್ಲಿಷ್|ഇംഗ്ലീഷ്|अंग्रेजी|अंग्रेज़ी|ଇଂରାଜୀ/iu],
 [{ kind: "language", language: "te" }, /తెలుగు.*(మార్చు|భాష)|switch.*telugu|change.*telugu|தெலுங்கு.*மாற்ற|ತೆಲುಗು.*ಬದಲ|തെലുങ്ക്.*മാറ്റ|तेलुगु.*बदल|ତେଲୁଗୁ.*ବଦଳ/iu],
 [{ kind: "language", language: "ta" }, /switch.*tamil|தமிழ்.*மாற்ற/iu],
 [{ kind: "language", language: "kn" }, /switch.*kannada|ಕನ್ನಡ.*ಬದಲ/iu],
 [{ kind: "language", language: "ml" }, /switch.*malayalam|മലയാള.*മാറ്റ/iu],
 [{ kind: "language", language: "hi" }, /switch.*hindi|हिंदी.*बदल/iu],
 [{ kind: "language", language: "or" }, /switch.*odia|ଓଡ଼ିଆ.*ବଦଳ/iu],
 [{ kind: "category", category: "medical" }, /హాస్పిటల్|ఆసుపత్ర|hospital|medical|மருத்துவமனை|ಆಸ್ಪತ್ರೆ|ആശുപത്രി|अस्पताल|डॉक्टर|ଡାକ୍ତରଖାନା/iu],
 [{ kind: "category", category: "toilet" }, /టాయిలెట్|మరుగుదొడ|toilet|bathroom|கழிப்பறை|ಶೌಚಾಲಯ|ശൗചാലയം|शौचालय|ଟଏଲେଟ|ଶୌଚାଳୟ/iu],
 [{ kind: "category", category: "food" }, /అన్నప్రసాద|annaprasad|food|அன்னப்பிரசாத|ಅನ್ನಪ್ರಸಾದ|അന്നപ്രസാദ|अन्नप्रसाद|ଅନ୍ନପ୍ରସାଦ/iu],
 [{ kind: "location" }, /నా.*(స్థానం|లొకేషన్)|my.*location|recenter|என்.*இருப்பிடம்|ನನ್ನ.*ಸ್ಥಳ|എന്റെ.*സ്ഥാനം|मेरा.*स्थान|मेरी.*लोकेशन|ମୋ.*ସ୍ଥାନ/iu],
 [{ kind: "nearby" }, /దగ్గరలో.*ప్రదేశ|సమీప.*ప్రదేశ|nearby.*places|அருகி.*இடங்கள்|ಹತ್ತಿರ.*ಸ್ಥಳ|അടുത്ത.*സ്ഥല|आस.?पास.*(स्थान|जगह)|ନିକଟ.*ସ୍ଥାନ/iu],
 [{ kind: "temple" }, /స్వామివారి.*ఆలయ|ప్రధాన.*ఆలయ|main.*temple|venkateswara|பிரதான.*கோவில்|ಮುಖ್ಯ.*ದೇವಾಲಯ|പ്രധാന.*ക്ഷേത്ര|मुख्य.*मंदिर|ମୁଖ୍ୟ.*ମନ୍ଦିର/iu],
 [{ kind: "navigate" }, /నావిగేషన్.*(ప్రారంభ|మొదలు)|start.*navigation|வழிகாட்ட.*தொடங்கு|ನ್ಯಾವಿಗೇಷನ್.*ಪ್ರಾರಂಭ|നാവിഗേഷൻ.*തുടങ്ങ|नेविगेशन.*शुरू|ନେଭିଗେସନ୍.*ଆରମ୍ଭ/iu],
 [{ kind: "map" }, /మ్యాప్.*(ఓపెన్|తెర)|పటం.*తెర|open.*map|வரைபட.*திற|ನಕ್ಷೆ.*ತೆರೆ|മാപ്പ്.*തുറ|नक्शा.*खोल|ମାନଚିତ୍ର.*ଖୋଲ/iu],
];
export function interpretCommand(text: string): VoiceAction | null {
 const normalized = text.normalize("NFC").trim();
 if (!normalized) return null;
 return patterns.find(([, pattern]) => pattern.test(normalized))?.[0] ?? { kind: "search", text: normalized };
}