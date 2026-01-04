import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서만 사용하는 Admin 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 서비스 역할 키 필요
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Service Role Key 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 환경 변수를 확인해주세요.' },
        { status: 500 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'email이 필요합니다.' },
        { status: 400 }
      );
    }

    // 이메일로 사용자 찾기
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Auth 사용자 목록 조회 실패:', listError);
      return NextResponse.json(
        { error: `사용자 목록 조회 실패: ${listError.message}` },
        { status: 500 }
      );
    }

    if (!users || !users.users) {
      return NextResponse.json(
        { error: '사용자 목록을 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return NextResponse.json(
        { error: '해당 이메일의 사용자를 찾을 수 없습니다.', foundUsers: users.users.length },
        { status: 404 }
      );
    }

    console.log(`Auth 사용자 삭제 시도: ${email} (ID: ${user.id})`);

    // Supabase Auth에서 사용자 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Auth 사용자 삭제 실패:', deleteError);
      return NextResponse.json(
        { error: `삭제 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`Auth 사용자 삭제 성공: ${email} (ID: ${user.id})`);

    return NextResponse.json({ success: true, userId: user.id, email: user.email });
  } catch (error: any) {
    console.error('API 오류:', error);
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

