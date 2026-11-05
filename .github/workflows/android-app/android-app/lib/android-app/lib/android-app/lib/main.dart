import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'data.dart';
import 'strings.dart';

const saffron = Color(0xFFB4491B);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseKey);
  final p = await SharedPreferences.getInstance();
  L.i.lang = p.getString('lang') ?? 'te';
  runApp(const App());
}

Future<void> open(String url) => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: L.i,
        builder: (_, __) => MaterialApp(
          title: L.i.t('app'),
          debugShowCheckedModeBanner: false,
          theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: saffron), useMaterial3: true,
              cardTheme: CardThemeData(elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: Colors.brown.shade100)))),
          home: const Shell(),
        ),
      );
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int tab = 0;
  late Future<List<Place>> places = fetchPlaces();
  void reload() => setState(() => places = fetchPlaces());

  @override
  Widget build(BuildContext context) {
    final t = L.i.t;
    return Scaffold(
      appBar: AppBar(
        title: Text(t('app')),
        actions: [
          TextButton(
            onPressed: () async {
              L.i.toggle();
              (await SharedPreferences.getInstance()).setString('lang', L.i.lang);
            },
            child: Text(t('lang')),
          ),
        ],
      ),
      body: FutureBuilder<List<Place>>(
        future: places,
        builder: (ctx, snap) {
          final data = snap.data ?? const <Place>[];
          final failed = snap.hasError;
          final pages = [
            HomePage(places: data, onTab: (i) => setState(() => tab = i)),
            MapPage(places: data),
            PlacesPage(places: data, loading: snap.connectionState != ConnectionState.done, failed: failed, onRetry: reload),
            HelpPage(places: data),
          ];
          return IndexedStack(index: tab, children: pages);
        },
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (i) => setState(() => tab = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), label: t('home')),
          NavigationDestination(icon: const Icon(Icons.map_outlined), label: t('map')),
          NavigationDestination(icon: const Icon(Icons.list_alt), label: t('places')),
          NavigationDestination(icon: const Icon(Icons.support_agent), label: t('help')),
        ],
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  final List<Place> places;
  final ValueChanged<int> onTab;
  const HomePage({super.key, required this.places, required this.onTab});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Future<Darshan?> d = fetchDarshan();
  @override
  Widget build(BuildContext context) {
    final t = L.i.t;
    return ListView(padding: const EdgeInsets.all(14), children: [
      FutureBuilder<Darshan?>(
        future: d,
        builder: (_, s) {
          if (s.connectionState != ConnectionState.done) return const Card(child: Padding(padding: EdgeInsets.all(30), child: Center(child: CircularProgressIndicator())));
          final r = s.data;
          if (r == null) {
            return Card(child: ListTile(title: Text(t('unavail')), trailing: TextButton(onPressed: () => setState(() => d = fetchDarshan()), child: Text(t('retry'))), onTap: () => open('https://news.tirumala.org/')));
          }
          return Card(
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t('darshan'), style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text('${waitText(r)} ${t('hours')}', style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.bold)),
                if (r.comps != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${t('comp')}: ${r.comps}', style: Theme.of(context).textTheme.titleMedium)),
                const SizedBox(height: 10),
                InkWell(onTap: () => open(r.url), child: Text('${t('source')} · ${r.date} · ${t('notlive')}', style: const TextStyle(decoration: TextDecoration.underline, fontSize: 13))),
              ]),
            ),
          );
        },
      ),
      const SizedBox(height: 10),
      Row(children: [
        for (final e in [(Icons.map_outlined, 'map', 1), (Icons.list_alt, 'places', 2), (Icons.support_agent, 'help', 3)])
          Expanded(child: Card(child: InkWell(onTap: () => widget.onTab(e.$3), child: Padding(padding: const EdgeInsets.symmetric(vertical: 18), child: Column(children: [Icon(e.$1, size: 30, color: saffron), const SizedBox(height: 6), Text(t(e.$2))]))))),
      ]),
      Card(child: ListTile(leading: const Icon(Icons.open_in_new), title: Text(t('book')), subtitle: const Text('tirumala.org'), onTap: () => open('https://www.tirumala.org/'))),
      Card(child: ListTile(leading: const Icon(Icons.newspaper), title: Text(t('news')), onTap: () => open('https://news.tirumala.org/'))),
      Padding(padding: const EdgeInsets.all(10), child: Text(t('disc'), style: const TextStyle(fontSize: 12, color: Colors.black54))),
    ]);
  }
}

class MapPage extends StatelessWidget {
  final List<Place> places;
  const MapPage({super.key, required this.places});
  @override
  Widget build(BuildContext context) {
    final pts = places.where((p) => p.hasCoords).toList();
    return Stack(children: [
      FlutterMap(
        options: const MapOptions(initialCenter: LatLng(13.6833, 79.3474), initialZoom: 15),
        children: [
          TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'in.pavanaitech.tirumala_guide'),
          MarkerLayer(markers: [
            for (final p in pts)
              Marker(
                point: LatLng(p.lat!, p.lng!), width: 40, height: 40,
                child: GestureDetector(
                  onTap: () => showPlace(context, p),
                  child: Container(decoration: const BoxDecoration(color: saffron, shape: BoxShape.circle), child: Icon(catIcons[p.category] ?? Icons.place, color: Colors.white, size: 22)),
                ),
              ),
          ]),
        ],
      ),
      Positioned(left: 8, bottom: 6, child: Text(L.i.t('osm'), style: const TextStyle(fontSize: 11, backgroundColor: Colors.white70))),
    ]);
  }
}

void showPlace(BuildContext context, Place p) {
  final t = L.i.t;
  showModalBottomSheet(
    context: context, isScrollControlled: true,
    builder: (_) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (p.image != null) ClipRRect(borderRadius: BorderRadius.circular(8), child: CachedNetworkImage(imageUrl: p.image!, height: 160, width: double.infinity, fit: BoxFit.cover, errorWidget: (_, __, ___) => const SizedBox())),
          const SizedBox(height: 8),
          Text(L.i.loc(p.name), style: Theme.of(context).textTheme.titleLarge),
          if (L.i.loc(p.description).isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(L.i.loc(p.description))),
          const SizedBox(height: 12),
          if (p.hasCoords)
            FilledButton.icon(onPressed: () => open('https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking'), icon: const Icon(Icons.directions_walk), label: Text(t('walk')))
          else
            Text(t('nocoord'), style: const TextStyle(color: Colors.black54)),
        ]),
      ),
    ),
  );
}

class PlacesPage extends StatefulWidget {
  final List<Place> places;
  final bool loading, failed;
  final VoidCallback onRetry;
  const PlacesPage({super.key, required this.places, required this.loading, required this.failed, required this.onRetry});
  @override
  State<PlacesPage> createState() => _PlacesPageState();
}

class _PlacesPageState extends State<PlacesPage> {
  String cat = 'all', q = '';
  @override
  Widget build(BuildContext context) {
    final t = L.i.t;
    if (widget.loading) return const Center(child: CircularProgressIndicator());
    if (widget.failed) return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(t('err')), TextButton(onPressed: widget.onRetry, child: Text(t('retry')))]));
    final cats = widget.places.map((p) => p.category).toSet().toList()..sort();
    final list = widget.places.where((p) {
      if (cat != 'all' && p.category != cat) return false;
      if (q.isEmpty) return true;
      final s = q.toLowerCase();
      return (p.name is Map ? (p.name as Map).values.join(' ') : '').toLowerCase().contains(s);
    }).toList();
    return Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(12, 10, 12, 4), child: TextField(decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: t('search'), border: const OutlineInputBorder(), isDense: true), onChanged: (v) => setState(() => q = v))),
      SizedBox(height: 46, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 8), children: [
        for (final c in ['all', ...cats]) Padding(padding: const EdgeInsets.all(4), child: ChoiceChip(label: Text(c == 'all' ? t('all') : c), selected: cat == c, onSelected: (_) => setState(() => cat = c))),
      ])),
      Expanded(child: ListView.builder(itemCount: list.length, itemBuilder: (_, i) {
        final p = list[i];
        return ListTile(leading: Icon(catIcons[p.category] ?? Icons.place, color: saffron), title: Text(L.i.loc(p.name)), subtitle: Text(p.category), onTap: () => showPlace(context, p));
      })),
    ]);
  }
}

class HelpPage extends StatelessWidget {
  final List<Place> places;
  const HelpPage({super.key, required this.places});

  Future<void> shareLocation() async {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
    final pos = await Geolocator.getCurrentPosition();
    final msg = Uri.encodeComponent('నేను ఇక్కడ ఉన్నాను / I am here: https://maps.google.com/?q=${pos.latitude},${pos.longitude}');
    await open('https://wa.me/?text=$msg');
  }

  @override
  Widget build(BuildContext context) {
    final t = L.i.t;
    final med = places.where((p) => p.category == 'medical').toList();
    return ListView(padding: const EdgeInsets.all(14), children: [
      Text(t('emerg'), style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700, minimumSize: const Size(0, 52)), onPressed: () => open('tel:112'), icon: const Icon(Icons.call), label: Text(t('call112')))),
        const SizedBox(width: 8),
        Expanded(child: FilledButton.icon(style: FilledButton.styleFrom(backgroundColor: Colors.red.shade700, minimumSize: const Size(0, 52)), onPressed: () => open('tel:108'), icon: const Icon(Icons.local_hospital), label: Text(t('call108')))),
      ]),
      const SizedBox(height: 8),
      OutlinedButton.icon(style: OutlinedButton.styleFrom(minimumSize: const Size(0, 52)), onPressed: shareLocation, icon: const Icon(Icons.share_location), label: Text(t('share'))),
      const SizedBox(height: 16),
      Text(t('lostT'), style: Theme.of(context).textTheme.titleMedium),
      Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Text('${t('lost1')}\n${t('lost2')}\n${t('lost3')}', style: const TextStyle(height: 1.6))),
      const SizedBox(height: 10),
      Text(t('medical'), style: Theme.of(context).textTheme.titleMedium),
      for (final p in med) ListTile(leading: const Icon(Icons.local_hospital_outlined, color: saffron), title: Text(L.i.loc(p.name)), onTap: () => showPlace(context, p)),
    ]);
  }
}
