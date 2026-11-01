create policy "Anyone can view place images" on storage.objects for select to anon, authenticated using (bucket_id = 'place-images');
create policy "Admins upload place images" on storage.objects for insert to authenticated with check (bucket_id = 'place-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins update place images" on storage.objects for update to authenticated using (bucket_id = 'place-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete place images" on storage.objects for delete to authenticated using (bucket_id = 'place-images' and public.has_role(auth.uid(), 'admin'));
