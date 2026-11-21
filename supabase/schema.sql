-- ============================================================================
-- Mimar Engineering Workspace — Smart Archive (الأرشيف الذكي)
-- Supabase Cloud Schema, Constraints, Indexes, Triggers, Table RLS & Storage RLS
-- ============================================================================
-- ملاحظة مهمة:
--   1) هذا الملف مرجعي للمراجعة والتنفيذ اليدوي في Supabase SQL Editor بعد الموافقة.
--   2) يتطلب PostgreSQL 15+ (المعتمد افتراضيًا في Supabase) لدعم:
--      ON DELETE SET NULL (folder_id) على المفتاح الأجنبي المركب.
--   3) لا يتضمن جدول archive_projects في هذه المرحلة (مؤجل لمرحلة لاحقة).
--   4) يعتمد كليًا على auth.uid() و RLS بدون الحاجة لأي Secret / Service Role Key في الواجهة.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. دوال الـ Triggers المساعدة والأمنية
-- ----------------------------------------------------------------------------

-- 0.1 تحديث عمود updated_at تلقائيًا عند أي تعديل مشروع
create or replace function public.set_archive_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- 0.2 حماية المجلدات النظامية (is_system = true) على مستوى محرك PostgreSQL:
--     - منع أي تعديل على المجلدات التي تحمل is_system = true.
--     - منع تغيير قيمة العمود is_system في كلا الاتجاهين (منع التحايل على سياسة الحذف).
--     - منع تغيير معرف المجلد (id) أو مالك المجلد (user_id).
--     - منع حذف المجلدات النظامية للمستخدمين (authenticated / anon)،
--       مع السماح بالحذف المتسلسل (ON DELETE CASCADE) عند حذف الحساب من auth.users.
create or replace function public.protect_system_archive_folders()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.is_system is true then
      raise exception 'System archive folders (is_system = true) cannot be modified (folder id: %).', old.id
        using errcode = '42501';
    end if;

    if new.is_system is distinct from old.is_system then
      raise exception 'Column is_system is immutable and cannot be changed (folder id: %).', old.id
        using errcode = '42501';
    end if;

    if new.id is distinct from old.id then
      raise exception 'Folder identifier (id) cannot be changed (folder id: %).', old.id
        using errcode = '42501';
    end if;

    if new.user_id is distinct from old.user_id then
      raise exception 'Folder owner (user_id) cannot be changed.'
        using errcode = '42501';
    end if;

    return new;
  elsif tg_op = 'DELETE' then
    if old.is_system is true and current_user in ('authenticated', 'anon') then
      raise exception 'System archive folders (is_system = true) cannot be deleted (folder id: %).', old.id
        using errcode = '42501';
    end if;

    return old;
  end if;

  return null;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. جدول المجلدات والأقسام: public.archive_folders
--    المفتاح الأساسي مركب (user_id, id) لعزل المجلدات النظامية والمخصصة لكل مستخدم
--    متوافق مع ArchiveFolder في src/types/smartArchive.ts و DEFAULT_ARCHIVE_FOLDERS
-- ----------------------------------------------------------------------------
create table if not exists public.archive_folders (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  section text not null,
  color text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pk_archive_folders primary key (user_id, id),
  constraint chk_archive_folders_id_nonempty check (length(btrim(id)) > 0),
  constraint chk_archive_folders_name_nonempty check (length(btrim(name)) > 0),
  constraint chk_archive_folders_section_nonempty check (length(btrim(section)) > 0),
  constraint chk_archive_folders_color_nullable check (
    color is null or length(btrim(color)) > 0
  )
);

-- يُنفَّذ Trigger الحماية قبل Trigger تحديث الوقت (الترتيب الأبجدي لأسماء الـ Triggers في PostgreSQL)
drop trigger if exists trg_archive_folders_a_protect_system on public.archive_folders;
create trigger trg_archive_folders_a_protect_system
  before update or delete on public.archive_folders
  for each row
  execute function public.protect_system_archive_folders();

drop trigger if exists trg_archive_folders_updated_at on public.archive_folders;
create trigger trg_archive_folders_updated_at
  before update on public.archive_folders
  for each row
  execute function public.set_archive_updated_at();

-- ----------------------------------------------------------------------------
-- 2. جدول البيانات الوصفية للملفات: public.archive_files
--    متوافق حقلًا بحقل مع ArchiveFileMetadata في src/types/smartArchive.ts
-- ----------------------------------------------------------------------------
create table if not exists public.archive_files (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  original_name text not null,
  extension text not null,
  mime_type text not null default 'application/octet-stream',
  file_group text not null,
  file_type_label text not null,
  size_bytes bigint not null,
  storage_bucket text not null default 'mimar-archive',
  storage_path text not null,
  checksum_hint text,
  checksum_sha256 text,
  added_at timestamptz not null default now(),
  last_modified_at timestamptz not null default now(),
  -- nullable لدعم حالة تفريغ حقل <input type="date"> في الواجهة (documentDate = "" <-> NULL)
  document_date date default current_date,
  section text not null,
  category text not null,
  -- NULL تمثل «بدون مجلد فرعي / القسم العام» (folderId = "" في الواجهة <-> NULL في القاعدة)
  folder_id text,
  project_id text not null default '',
  project_name text not null default '',
  discipline text not null default 'عام / متعدد التخصصات',
  drawing_code text,
  revision text,
  tags text[] not null default '{}',
  notes text not null default '',
  ai_status text not null default 'not-configured',
  is_original_preserved boolean not null default true,
  migrated_from_local_id text,
  updated_at timestamptz not null default now(),

  constraint pk_archive_files primary key (id),
  -- قيد فريد مركب يُلزم جدول العلاقات بأن يتبع كلا الملفين نفس المستخدم المالك
  constraint uq_archive_files_user_id unique (user_id, id),
  constraint uq_archive_files_storage_path unique (storage_path),

  -- قيود التطابق مع أنواع وقيم التطبيق الفعلي
  constraint chk_archive_files_name_nonempty check (length(btrim(name)) > 0),
  constraint chk_archive_files_original_name_nonempty check (length(btrim(original_name)) > 0),
  constraint chk_archive_files_extension_nonempty check (length(btrim(extension)) > 0),
  constraint chk_archive_files_mime_type_nonempty check (length(btrim(mime_type)) > 0),
  constraint chk_archive_files_group check (
    file_group in ('office', 'cad', 'bim', 'navisworks', 'image', 'other')
  ),
  constraint chk_archive_files_type_label_nonempty check (length(btrim(file_type_label)) > 0),
  constraint chk_archive_files_size_nonnegative check (size_bytes >= 0),
  constraint chk_archive_files_bucket check (storage_bucket = 'mimar-archive'),

  -- ضمان أن مسار الملف داخل Storage يبدأ بمعرف المستخدم المالك نفسه ومنع اجتياز المسار (Path Traversal)
  constraint chk_archive_files_storage_path_owner check (
    split_part(storage_path, '/', 1) = user_id::text
    and length(btrim(split_part(storage_path, '/', 2))) > 0
    and position('..' in storage_path) = 0
    and position('//' in storage_path) = 0
    and position('\' in storage_path) = 0
    and left(storage_path, 1) <> '/'
    and right(storage_path, 1) <> '/'
  ),

  constraint chk_archive_files_checksum_hint_nullable check (
    checksum_hint is null or length(btrim(checksum_hint)) > 0
  ),
  constraint chk_archive_files_checksum_sha256_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-fA-F]{64}$'
  ),
  constraint chk_archive_files_section_nonempty check (length(btrim(section)) > 0),
  constraint chk_archive_files_category_nonempty check (length(btrim(category)) > 0),
  constraint chk_archive_files_folder_nullable check (
    folder_id is null or length(btrim(folder_id)) > 0
  ),

  -- التخصصات الهندسية العشرة المعتمدة حرفيًا في EngineeringDiscipline و ALL_DISCIPLINES
  constraint chk_archive_files_discipline check (
    discipline in (
      'معماري (Architectural)',
      'إنشائي (Structural)',
      'ميكانيكا وتكييف (MEP / HVAC)',
      'كهرباء (Electrical)',
      'صحي ومكافحة حريق (Plumbing & FF)',
      'مدني وبنية تحتية (Civil)',
      'إدارة مشاريع وعقود (PM & Contracts)',
      'تشغيل وصيانة (O&M)',
      'مساحة وجيوتقنية (Survey)',
      'عام / متعدد التخصصات'
    )
  ),

  constraint chk_archive_files_drawing_code_nullable check (
    drawing_code is null or length(btrim(drawing_code)) > 0
  ),
  constraint chk_archive_files_revision_nullable check (
    revision is null or length(btrim(revision)) > 0
  ),
  constraint chk_archive_files_tags_no_nulls check (
    array_position(tags, null) is null
  ),
  constraint chk_archive_files_ai_status check (
    ai_status in ('not-configured', 'queued', 'analyzed')
  ),

  -- عند حذف مجلد مخصص يتم تصفير العمود (folder_id) وحده إلى NULL ليعود الملف إلى القسم العام
  -- دون المساس بعمود (user_id) ودون حذف الملف أو المستخدم
  constraint fk_archive_files_folder
    foreign key (user_id, folder_id)
    references public.archive_folders (user_id, id)
    on update cascade
    on delete set null (folder_id)
);

drop trigger if exists trg_archive_files_updated_at on public.archive_files;
create trigger trg_archive_files_updated_at
  before update on public.archive_files
  for each row
  execute function public.set_archive_updated_at();

-- ----------------------------------------------------------------------------
-- 3. جدول العلاقات التبادلية بين الملفات: public.archive_file_relations
--    يمثل relatedFileIds: string[] بعلاقة ثنائية الاتجاه متماثلة لنفس المستخدم حصريًا
-- ----------------------------------------------------------------------------
create table if not exists public.archive_file_relations (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_a_id uuid not null,
  file_b_id uuid not null,
  created_at timestamptz not null default now(),

  constraint pk_archive_file_relations primary key (file_a_id, file_b_id),

  -- ترتيب معياري يمنع ربط الملف بنفسه ويمنع تكرار العلاقة المعكوسة (B, A) مع (A, B)
  constraint chk_archive_file_relations_order check (file_a_id < file_b_id),

  -- مفاتيح أجنبية مركبة تلزم أن ينتمي كلا الملفين إلى نفس user_id الموجود في صف العلاقة
  constraint fk_archive_rel_file_a_owner
    foreign key (user_id, file_a_id)
    references public.archive_files (user_id, id)
    on delete cascade,
  constraint fk_archive_rel_file_b_owner
    foreign key (user_id, file_b_id)
    references public.archive_files (user_id, id)
    on delete cascade
);

-- ----------------------------------------------------------------------------
-- 4. الفهارس المخصصة للأداء (Indexes) — تغطي كل فهارس IndexedDB وفلاتر الواجهة
-- ----------------------------------------------------------------------------
-- فهارس المجلدات
create index if not exists idx_archive_folders_user_created
  on public.archive_folders (user_id, created_at asc);

create index if not exists idx_archive_folders_user_section
  on public.archive_folders (user_id, section);

-- فهارس الملفات (تغطي by_addedAt, by_folderId, by_projectId, by_section + فلاتر الواجهة)
create index if not exists idx_archive_files_user_added
  on public.archive_files (user_id, added_at desc);

create index if not exists idx_archive_files_user_folder
  on public.archive_files (user_id, folder_id);

create index if not exists idx_archive_files_user_project
  on public.archive_files (user_id, project_id);

create index if not exists idx_archive_files_user_section
  on public.archive_files (user_id, section);

create index if not exists idx_archive_files_user_group
  on public.archive_files (user_id, file_group);

create index if not exists idx_archive_files_user_discipline
  on public.archive_files (user_id, discipline);

create index if not exists idx_archive_files_user_doc_date
  on public.archive_files (user_id, document_date desc);

create index if not exists idx_archive_files_tags_gin
  on public.archive_files using gin (tags);

-- فهرس فريد جزئي يمنع تكرار ترحيل نفس الملف المحلي من IndexedDB أكثر من مرة
create unique index if not exists uq_archive_files_user_migrated_local
  on public.archive_files (user_id, migrated_from_local_id)
  where migrated_from_local_id is not null;

-- فهارس العلاقات لتسريع الاستعلام العكسي وحذف الملفات المرتبطة (ON DELETE CASCADE)
create index if not exists idx_archive_rel_user_file_a
  on public.archive_file_relations (user_id, file_a_id);

create index if not exists idx_archive_rel_user_file_b
  on public.archive_file_relations (user_id, file_b_id);

-- ----------------------------------------------------------------------------
-- 5. مراجعة وسحب صلاحيات PUBLIC و anon وتفعيل Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- سحب أي صلاحيات عامة من دور PUBLIC ودور anon على الدوال والجداول الثلاثة
revoke all privileges on function public.set_archive_updated_at() from public, anon;
revoke all privileges on function public.protect_system_archive_folders() from public, anon;
grant execute on function public.set_archive_updated_at() to authenticated, service_role;
grant execute on function public.protect_system_archive_folders() to authenticated, service_role;

revoke all privileges on table public.archive_folders from public, anon;
revoke all privileges on table public.archive_files from public, anon;
revoke all privileges on table public.archive_file_relations from public, anon;

-- منح الصلاحيات اللازمة فقط لدور authenticated دون أي صلاحيات إضافية (مثل TRUNCATE أو TRIGGER)
grant select, insert, update, delete on table public.archive_folders to authenticated;
grant select, insert, update, delete on table public.archive_files to authenticated;
-- جدول العلاقات لا يقبل UPDATE (يُكتفى بالقراءة والإنشاء والحذف فقط)
grant select, insert, delete on table public.archive_file_relations to authenticated;

alter table public.archive_folders enable row level security;
alter table public.archive_files enable row level security;
alter table public.archive_file_relations enable row level security;

-- سياسات جدول المجلدات: public.archive_folders
drop policy if exists "archive_folders_select_own" on public.archive_folders;
create policy "archive_folders_select_own"
  on public.archive_folders
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- منع إنشاء مجلد مخصص بأي معرف من المعرفات السبعة المحجوزة للنظام،
-- وقصر إنشاء المجلدات النظامية (is_system = true) على المعرفات والأسماء والأقسام الرسمية السبعة حصريًا دون تزوير
-- (مع تكفّل المفتاح الأساسي المركب (user_id, id) بمنع تكرارها لنفس المستخدم)
drop policy if exists "archive_folders_insert_own" on public.archive_folders;
create policy "archive_folders_insert_own"
  on public.archive_folders
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      (
        is_system = false
        and id not in (
          'fld-arch-drawings',
          'fld-as-built',
          'fld-bim-models',
          'fld-clash-coord',
          'fld-specs-contracts',
          'fld-boq-schedules',
          'fld-site-photos'
        )
      )
      or (
        is_system = true
        and color is null
        and (id, name, section) in (
          ('fld-arch-drawings', 'المخططات التنفيذية (Shop Drawings)', 'المخططات الهندسية (CAD)'),
          ('fld-as-built', 'مخططات مطابق للواقع (As-Built)', 'المخططات الهندسية (CAD)'),
          ('fld-bim-models', 'نماذج Revit و IFC المركزية', 'نماذج معلومات البناء (BIM)'),
          ('fld-clash-coord', 'ملفات التنسيق وكشف التعارضات', 'التنسيق والفحص (Navisworks & DWF)'),
          ('fld-specs-contracts', 'المواصفات والعقود والمحاضر', 'المستندات والتقارير الفنية'),
          ('fld-boq-schedules', 'حصر الكميات والجداول الزمنية', 'الجداول وحساب الكميات (BOQ)'),
          ('fld-site-photos', 'صور الموقع والتقارير المصورة', 'الصور والتوثيق الميداني')
        )
      )
    )
  );

-- منع تعديل المجلدات النظامية (USING is_system = false) ومنع تحويل أي مجلد مخصص إلى نظامي (WITH CHECK is_system = false)
drop policy if exists "archive_folders_update_own" on public.archive_folders;
drop policy if exists "archive_folders_update_own_custom" on public.archive_folders;
create policy "archive_folders_update_own_custom"
  on public.archive_folders
  for update
  to authenticated
  using ((select auth.uid()) = user_id and is_system = false)
  with check ((select auth.uid()) = user_id and is_system = false);

-- منع حذف المجلدات النظامية والسماح بحذف المجلدات المخصصة للمالك فقط
drop policy if exists "archive_folders_delete_own_custom" on public.archive_folders;
create policy "archive_folders_delete_own_custom"
  on public.archive_folders
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_system = false);

-- سياسات جدول الملفات: public.archive_files
drop policy if exists "archive_files_select_own" on public.archive_files;
create policy "archive_files_select_own"
  on public.archive_files
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "archive_files_insert_own" on public.archive_files;
create policy "archive_files_insert_own"
  on public.archive_files
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "archive_files_update_own" on public.archive_files;
create policy "archive_files_update_own"
  on public.archive_files
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "archive_files_delete_own" on public.archive_files;
create policy "archive_files_delete_own"
  on public.archive_files
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- سياسات جدول العلاقات بين الملفات: public.archive_file_relations
drop policy if exists "archive_relations_select_own" on public.archive_file_relations;
create policy "archive_relations_select_own"
  on public.archive_file_relations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "archive_relations_insert_own" on public.archive_file_relations;
create policy "archive_relations_insert_own"
  on public.archive_file_relations
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.archive_files fa
      where fa.id = file_a_id
        and fa.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.archive_files fb
      where fb.id = file_b_id
        and fb.user_id = (select auth.uid())
    )
  );

drop policy if exists "archive_relations_delete_own" on public.archive_file_relations;
create policy "archive_relations_delete_own"
  on public.archive_file_relations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 6. إعداد Bucket التخزين الخاص (mimar-archive) وسياسات Storage RLS
--    ملاحظة: جدول storage.objects مفعّل عليه RLS افتراضيًا في Supabase.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('mimar-archive', 'mimar-archive', false)
on conflict (id) do update
set public = false;

drop policy if exists "mimar_archive_storage_select_own" on storage.objects;
create policy "mimar_archive_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'mimar-archive'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and length(btrim(split_part(name, '/', 2))) > 0
    and position('..' in name) = 0
    and position('//' in name) = 0
    and position('\' in name) = 0
    and left(name, 1) <> '/'
    and right(name, 1) <> '/'
  );

drop policy if exists "mimar_archive_storage_insert_own" on storage.objects;
create policy "mimar_archive_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'mimar-archive'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and length(btrim(split_part(name, '/', 2))) > 0
    and position('..' in name) = 0
    and position('//' in name) = 0
    and position('\' in name) = 0
    and left(name, 1) <> '/'
    and right(name, 1) <> '/'
  );

drop policy if exists "mimar_archive_storage_update_own" on storage.objects;
create policy "mimar_archive_storage_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'mimar-archive'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and position('..' in name) = 0
  )
  with check (
    bucket_id = 'mimar-archive'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and length(btrim(split_part(name, '/', 2))) > 0
    and position('..' in name) = 0
    and position('//' in name) = 0
    and position('\' in name) = 0
    and left(name, 1) <> '/'
    and right(name, 1) <> '/'
  );

drop policy if exists "mimar_archive_storage_delete_own" on storage.objects;
create policy "mimar_archive_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'mimar-archive'
    and (select auth.uid()) is not null
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and split_part(name, '/', 1) = (select auth.uid())::text
    and position('..' in name) = 0
  );

commit;
