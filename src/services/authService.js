import { supabase } from '../0005_Lib/supabaseClient';

export const authService = {
  // [수정] 회원가입 시 추가 정보(이름, 주소, 연락처, 직책)를 받아서 저장
  signUp: async ({ email, password, full_name, address, phone_number, job_title }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          address,
          phone_number,
          job_title,
        },
      },
    });
    return { data, error };
  },

  // 로그인
  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // 현재 세션 가져오기
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  }
};