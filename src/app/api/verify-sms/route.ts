import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { phone, code, userId } = await req.json(); // ⚠️ 增加了 userId 参数，用来发奖

    if (!userId) {
       return NextResponse.json({ error: '缺失用户信息，无法绑定' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. 去密码本里查验证码
    const { data, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 2. 如果查不到
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

    // 4. 验证成功！把这条验证码删掉
    await supabase.from('otp_codes').delete().eq('id', data.id);

    // ==========================================
    // 🎁 5. 核心：呼叫数据库发奖程序！给用户加 15 次额度！
    // ==========================================
    const { error: rewardError } = await supabase.rpc('reward_phone_binding', {
      user_id: userId,
      user_phone: phone
    });

    if (rewardError) {
      console.error("发奖失败:", rewardError);
      return NextResponse.json({ error: '验证成功，但额度发放失败，请联系客服' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '验证成功并已发放额度！' });

  } catch (error: any) {
    console.error("验证接口报错:", error);
    return NextResponse.json({ error: '系统错误，请重试' }, { status: 500 });
  }
}