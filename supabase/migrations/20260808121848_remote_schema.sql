-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE TABLE public.follows (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  follower_name  text                     NOT NULL,
  following_name text                     NOT NULL,
  created_at     timestamp with time zone DEFAULT now()
);

ALTER TABLE public.follows
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_name_following_name_key UNIQUE (follower_name, following_name);

ALTER TABLE public.follows
  ADD CONSTRAINT follows_pkey PRIMARY KEY (id);

GRANT ALL ON public.follows TO anon;

GRANT ALL ON public.follows TO authenticated;

GRANT ALL ON public.follows TO service_role;

CREATE POLICY "自分のフォローを消せる" ON public.follows
  FOR DELETE
  USING (true);

CREATE POLICY "誰でもフォローできる" ON public.follows
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "誰でもフォロー情報を見れる" ON public.follows
  FOR SELECT
  USING (true);

CREATE TABLE public.likes (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  post_id    uuid,
  user_name  text                     NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.likes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.likes
  ADD CONSTRAINT likes_pkey PRIMARY KEY (id);

ALTER TABLE public.likes
  ADD CONSTRAINT likes_post_id_user_name_key UNIQUE (post_id, user_name);

GRANT ALL ON public.likes TO anon;

GRANT ALL ON public.likes TO authenticated;

GRANT ALL ON public.likes TO service_role;

CREATE POLICY "誰でもいいねできる" ON public.likes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "誰でもいいねを消せる" ON public.likes
  FOR DELETE
  USING (true);

CREATE POLICY "誰でもいいねを見れる" ON public.likes
  FOR SELECT
  USING (true);

CREATE TABLE public.posts (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_name   text                     NOT NULL,
  content     text                     NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  reply_to    uuid,
  reply_count integer                  DEFAULT 0
);

ALTER TABLE public.posts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE public.likes
  ADD CONSTRAINT likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_reply_to_fkey FOREIGN KEY (reply_to) REFERENCES public.posts(id) ON DELETE CASCADE;

GRANT ALL ON public.posts TO anon;

GRANT ALL ON public.posts TO authenticated;

GRANT ALL ON public.posts TO service_role;

CREATE POLICY "自分の投稿を削除出来る" ON public.posts
  FOR DELETE
  USING (true);

CREATE POLICY "誰でも投稿できる" ON public.posts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "誰でも投稿を見れる" ON public.posts
  FOR SELECT
  USING (true);

CREATE TABLE public.users (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_name    text                     NOT NULL,
  display_name text,
  bio          text,
  created_at   timestamp with time zone DEFAULT now(),
  avatar_url   text
);

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.users
  ADD CONSTRAINT users_user_name_key UNIQUE (user_name);

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE POLICY "自分のプロフィールだけ更新できる" ON public.users
  FOR UPDATE
  USING (true);

CREATE POLICY "誰でもユーザーを作れる" ON public.users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "誰でもユーザーを見れる" ON public.users
  FOR SELECT
  USING (true);

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
