import 'package:flutter/material.dart';

class L extends ChangeNotifier {
  static final L i = L();
  String lang = 'te';
  static const _t = {
    'te': {
      'app': 'తిరుమల గైడ్', 'home': 'హోమ్', 'map': 'మ్యాప్', 'places': 'ప్రదేశాలు', 'help': 'సహాయం',
      'darshan': 'సర్వదర్శనం వేచి ఉండే సమయం', 'comp': 'వేచి ఉన్న కంపార్ట్‌మెంట్లు', 'hours': 'గంటలు',
      'source': 'టీటీడీ నివేదిక', 'notlive': 'ప్రత్యక్షం కాదు', 'unavail': 'ప్రస్తుతం నివేదిక చదవలేకపోయాం',
      'search': 'వెతకండి', 'all': 'అన్నీ', 'walk': 'దారి చూపు (Google Maps)', 'nocoord': 'ఈ ప్రదేశం మ్యాప్ స్థానం ఇంకా ధృవీకరించలేదు',
      'disc': 'ఇది స్వతంత్ర భక్త గైడ్. టీటీడీకి సంబంధం లేదు. బుకింగ్‌కు అధికారిక సైట్‌నే వాడండి.',
      'book': 'అధికారిక టీటీడీ సైట్', 'news': 'టీటీడీ వార్తలు', 'share': 'నా లొకేషన్ కుటుంబానికి పంపండి',
      'lostT': 'తప్పిపోతే', 'lost1': '1. అక్కడే ఉండండి, భయపడకండి.', 'lost2': '2. దగ్గరలోని టీటీడీ సిబ్బంది / పోలీసు వద్దకు వెళ్లండి.',
      'lost3': '3. ఆ ప్రదేశం పేరు, ఫోటో కుటుంబానికి పంపండి.', 'emerg': 'అత్యవసర నంబర్లు', 'call112': '112 కి కాల్ చేయండి', 'call108': '108 అంబులెన్స్',
      'medical': 'దగ్గరలోని వైద్య కేంద్రాలు', 'retry': 'మళ్లీ ప్రయత్నించండి', 'err': 'లోడ్ కాలేదు', 'osm': 'మ్యాప్: © OpenStreetMap',
      'lang': 'English',
    },
    'en': {
      'app': 'Tirumala Guide', 'home': 'Home', 'map': 'Map', 'places': 'Places', 'help': 'Help',
      'darshan': 'Sarva Darshan wait time', 'comp': 'Waiting compartments', 'hours': 'hours',
      'source': 'TTD report', 'notlive': 'not live', 'unavail': 'Could not read the latest report',
      'search': 'Search', 'all': 'All', 'walk': 'Directions (Google Maps)', 'nocoord': 'Map position for this place is not verified yet',
      'disc': 'Independent pilgrim guide, not affiliated with TTD. Use official sites for booking.',
      'book': 'Official TTD site', 'news': 'TTD news', 'share': 'Send my location to family',
      'lostT': 'If you are lost', 'lost1': '1. Stay where you are and stay calm.', 'lost2': '2. Go to the nearest TTD staff or police.',
      'lost3': '3. Send the place name or a photo to your family.', 'emerg': 'Emergency numbers', 'call112': 'Call 112', 'call108': 'Ambulance 108',
      'medical': 'Nearby medical places', 'retry': 'Retry', 'err': 'Failed to load', 'osm': 'Map: © OpenStreetMap',
      'lang': 'తెలుగు',
    },
  };
  String t(String k) => _t[lang]?[k] ?? _t['en']![k] ?? k;
  void toggle() {
    lang = lang == 'te' ? 'en' : 'te';
    notifyListeners();
  }
  String loc(dynamic json) {
    if (json is Map) {
      final v = json[lang] ?? json['en'] ?? json['te'] ?? json.values.firstWhere((e) => e is String && e.isNotEmpty, orElse: () => '');
      return '$v';
    }
    return '';
  }
}

const catIcons = <String, IconData>{
  'temple': Icons.temple_hindu_outlined, 'food': Icons.restaurant_outlined, 'office': Icons.account_balance_outlined,
  'enquiry': Icons.info_outline, 'transport': Icons.directions_bus_outlined, 'parking': Icons.local_parking,
  'amenity': Icons.self_improvement, 'toilet': Icons.wc, 'medical': Icons.local_hospital_outlined,
  'hotel': Icons.hotel_outlined, 'landmark': Icons.place_outlined, 'other': Icons.circle_outlined,
};
