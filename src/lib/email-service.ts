'use server';
import nodemailer from 'nodemailer';

// تكوين nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * إرسال بريد دعوة للانضمام
 */
export async function sendInvitationEmail(
  email: string,
  inviteCode: string,
  projectId: string,
  role: string = 'supervisor'
): Promise<boolean> {
  try {
    // التحقق من اتصال البريد الإلكتروني
    await transporter.verify();
    
    // الحصول على بيانات المشروع من قاعدة البيانات
    // ملاحظة: يجب استخدام createClient على جانب الخادم فقط
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: projectData } = await supabaseServer
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();
    
    const projectTitle = projectData?.title || `المشروع #${projectId}`;
    let roleText;
    switch (role) {
      case 'supervisor': roleText = 'مشرف'; break;
      case 'member': roleText = 'عضو'; break;
      case 'viewer': roleText = 'مشاهد'; break;
      default: roleText = 'مستخدم';
    }
    
    const mailOptions = {
      from: `"منصة المشاريع" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `دعوة للانضمام كـ ${roleText} إلى ${projectTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>دعوة للانضمام إلى مشروع</h2>
          <p>تمت دعوتك للانضمام كـ <strong>${roleText}</strong> إلى المشروع "${projectTitle}".</p>
          <p>لقبول الدعوة، يرجى النقر على الرابط أدناه:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?code=${inviteCode}&project=${projectId}" 
            style="display: inline-block; padding: 12px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">
            قبول الدعوة
          </a>
          <p style="margin-top: 20px;">تنتهي صلاحية هذه الدعوة بعد 7 أيام.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`تم إرسال بريد الدعوة إلى ${email} بنجاح`);
    return true;
  } catch (error) {
    console.error('خطأ في إرسال بريد الدعوة:', error);
    return false;
  }
}

/**
 * إرسال بريد إشعار للمستخدم
 */
export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string
): Promise<boolean> {
  try {
    // التحقق من اتصال البريد الإلكتروني
    await transporter.verify();
    
    const mailOptions = {
      from: `"منصة المشاريع" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <p style="margin-top: 20px;">يمكنك الوصول إلى المنصة من خلال <a href="${process.env.NEXT_PUBLIC_APP_URL}">هذا الرابط</a>.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`تم إرسال بريد الإشعار إلى ${email} بنجاح`);
    return true;
  } catch (error) {
    console.error('خطأ في إرسال بريد الإشعار:', error);
    return false;
  }
}
