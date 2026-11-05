import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

const supabaseUrl = 'https://ndewvkbonpjmuxwwqeex.supabase.co';
const supabaseKey = 'sb_publishable_QTho06p3gH0Xxvo9KtB0Fw_ic66D18c';

class Place {
  final String id, category;
  final dynamic name, description;
  final double? lat, lng;
  final bool verified;
  String? image;
  final String? imagePath;
  Place(Map<String, dynamic> r)
      : id = r['id'], category = r['category'] ?? 'other', name = r['name'], description = r['description'],
        lat = (r['lat'] as num?)?.toDouble(), lng = (r['lng'] as num?)?.toDouble(),
        verified = r['coords_verified'] == true, imagePath = r['image_path'];
  bool get hasCoords => verified && lat != null && lng != null;
}

Future<List<Place>> fetchPlaces() async {
  final c = Supabase.instance.client;
  final rows = await c.from('places').select().eq('visible', true).order('sort_order');
  final list = (rows as List).map((e) => Place(Map<String, dynamic>.from(e))).toList();
  final paths = list.map((p) => p.imagePath).whereType<String>().toList();
  if (paths.isNotEmpty) {
    try {
      final signed = await c.storage.from('place-images').createSignedUrls(paths, 86400);
      final m = {for (final s in signed) s.path: s.signedUrl};
      for (final p in list) { if (p.imagePath != null) p.image = m[p.imagePath]; }
    } catch (_) {}
  }
  return list;
}

class Darshan {
  final String date, url;
  final double minH, maxH;
  final int? comps;
  Darshan(this.date, this.url, this.minH, this.maxH, this.comps);
}

String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
String waitText(Darshan d) => d.minH == d.maxH ? _fmt(d.maxH) : '${_fmt(d.minH)}-${_fmt(d.maxH)}';

/// Same official-only parsing as the website: explicit figures only, nothing inferred.
Future<Darshan?> fetchDarshan() async {
  const base = 'https://news.tirumala.org/';
  final res = await http.get(Uri.parse('${base}wp-json/wp/v2/posts?search=Total%20pilgrims&per_page=3&orderby=date&order=desc'),
      headers: {'Accept': 'application/json'}).timeout(const Duration(seconds: 12));
  if (res.statusCode != 200) return null;
  for (final post in jsonDecode(res.body) as List) {
    final html = '${post['content']?['rendered'] ?? ''}';
    final text = html.replaceAll(RegExp(r'<[^>]*>'), ' ').replaceAll('&#8211;', '-').replaceAll('&#8230;', '…').replaceAll('&nbsp;', ' ').replaceAll(RegExp(r'\s+'), ' ');
    final d = RegExp(r'Present Situation on\s+(\d{2})[-.](\d{2})[-.](\d{4})', caseSensitive: false).firstMatch(text);
    final w = RegExp(r'Approx\.?\s*Darshan Time for Sarva\s*darshanam\s*\(with\s*out SSD Tokens\)[\s.…:–-]*(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(?:H\b|hours?\b)', caseSensitive: false).firstMatch(text);
    if (d == null || w == null) continue;
    final mn = double.parse(w.group(1)!);
    final mx = double.parse(w.group(2) ?? w.group(1)!);
    if (mx < mn || mx > 168) continue;
    final c = RegExp(r'Waiting Compartments[\s.…:–-]*(\d+)\b', caseSensitive: false).firstMatch(text);
    return Darshan('${d.group(1)}-${d.group(2)}-${d.group(3)}', '${post['link']}', mn, mx, c == null ? null : int.parse(c.group(1)!));
  }
  return null;
}
