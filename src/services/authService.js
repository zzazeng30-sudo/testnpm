import { supabase } from '../0005_Lib/supabaseClient';

export const authService = {
  // 1. 회원가입
  signUp: async ({ email, password, name, phone, position, address }) => {
    // 1-1. Supabase Auth 가입 (계정 생성)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone, position, address } // 메타데이터 저장
      }
    });

    if (error) throw error;

    // 1-2. DB(profiles 테이블)에 상세 정보 저장 + 'pending' 상태 설정
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: email,
            name: name,
            phone: phone,
            position: position,
            address: address,
            status: 'pending', // ★ [핵심] 가입 시 '승인 대기' 상태로 저장
            role: 2            // 기본값: 사원
          }
        ]);

      if (profileError) {
        // DB 저장이 실패하면 꼬일 수 있으므로 로그아웃 후 에러 처리
        console.error('프로필 저장 실패:', profileError);
        await supabase.auth.signOut();
        throw new Error('회원 정보 저장에 실패했습니다.');
      }

      // ★ [핵심] 가입 직후 자동 로그인을 막기 위해 강제 로그아웃
      await supabase.auth.signOut();
    }

    return data;
  },

  // 2. 로그인 (승인 여부 확인 로직 추가)
  signIn: async ({ email, password }) => {
    // 2-1. 1차 검사: 아이디/비밀번호 확인 (Supabase Auth)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // 2-2. 2차 검사: DB에서 승인 상태(status) 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw new Error("회원 정보를 찾을 수 없습니다.");
    }

    // ★ [핵심] 운영자(0)가 아니면서, 상태가 'pending'이면 로그인 차단
    if (profile.role !== 0 && profile.status === 'pending') {
      await supabase.auth.signOut(); // 로그인 세션 삭제
      throw new Error("관리자 승인 대기 중입니다. 승인 후 이용 가능합니다.");
    }

    // 거절된 사용자 차단
    if (profile.status === 'rejected') {
      await supabase.auth.signOut();
      throw new Error("가입이 승인되지 않았습니다. 관리자에게 문의하세요.");
    }

    // 모든 검사 통과 시 로그인 성공 리턴
    return { user: data.user, profile };
  },

  // 3. 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 4. 세션 가져오기
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data;
  },
  
  // 5. [관리자용] 전체 회원 목록 조회
  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  
  // 6. [관리자용] 회원 승인/등급 변경
  updateUserStatus: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    if (error) throw error;
    return data;
  }
};