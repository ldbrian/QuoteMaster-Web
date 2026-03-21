import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. 去密码本里查，有没有这个手机号对应的这个验证码？
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 2. 如果查不到，或者报错了
    if (error || !data) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 3. 检查时间有没有超过 5 分钟
    const now = new Date();
    const createdAt = new Date(data.created_at);
    const diffMinutes = (now.getTime() - createdAt.getTime()) / 60000;

    if (diffMinutes > 5) {
      return NextResponse.json({ error: '验证码已过期' }, { status: 400 });
    }

    // 4. 验证成功！把这条验证码删掉，防止被重复使用
    await supabase.from('otp_codes').delete().eq('id', data.id);

    return NextResponse.json({ success: true, message: '验证成功！' });

  } catch (error: any) {
    console.error("验证接口报错:", error);
    return NextResponse.json({ error: '系统错误，请重试' }, { status: 500 });
  }
}