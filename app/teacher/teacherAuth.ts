import supabase from "@/lib/supabaseClient";

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  school_name: string | null;
  class_name: string | null;
  class_code: string | null;
}

const TTL = 5 * 60_000;
let _cached: TeacherProfile | null = null;
let _expires = 0;
let _pending: Promise<TeacherProfile | null> | null = null;

export function getCachedTeacher(): Promise<TeacherProfile | null> {
  if (_cached && Date.now() < _expires) return Promise.resolve(_cached);
  if (_pending) return _pending;
  _pending = supabase.auth.getUser()
    .then(({ data: { user } }) => {
      if (!user) { _pending = null; return null; }
      return supabase
        .from("teacher_profiles")
        .select("id, name, email, school_name, class_name, class_code")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          _cached = data ?? null;
          _expires = Date.now() + TTL;
          _pending = null;
          return _cached;
        });
    })
    .catch(err => { _pending = null; throw err; });
  return _pending;
}

export function clearTeacherCache() {
  _cached = null;
  _expires = 0;
  _pending = null;
}
