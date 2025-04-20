import { supabase } from './client';
import { User } from './schema';

export type AuthError = {
  message: string;
};

export type AuthResponse = {
  user: User | null;
  error: AuthError | null;
};

// تسجيل الدخول باستخدام البريد الإلكتروني وكلمة المرور
export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: { message: error.message } };
    }

    return { user: data.user as User, error: null };
  } catch (error) {
    return { user: null, error: { message: 'حدث خطأ أثناء تسجيل الدخول' } };
  }
}

// تسجيل الدخول باستخدام Google
export async function signInWithGoogle(): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { user: null, error: { message: error.message } };
    }

    return { user: data.user as User, error: null };
  } catch (error) {
    return { user: null, error: { message: 'حدث خطأ أثناء تسجيل الدخول باستخدام Google' } };
  }
}

// إنشاء حساب جديد
export async function signUp(email: string, password: string, fullName: string, role: 'student' | 'supervisor' = 'student'): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) {
      return { user: null, error: { message: error.message } };
    }

    // إنشاء سجل في جدول المستخدمين للمعلومات الإضافية
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: role
        });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return { user: data.user as User, error: null };
  } catch (error) {
    return { user: null, error: { message: 'حدث خطأ أثناء إنشاء الحساب' } };
  }
}

// تسجيل الخروج
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (error) {
    return { error: { message: 'حدث خطأ أثناء تسجيل الخروج' } };
  }
}

// الحصول على المستخدم الحالي
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    
    if (!data.user) return null;
    
    // الحصول على بيانات المستخدم الإضافية من جدول الملفات الشخصية
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, full_name, avatar_url')
      .eq('id', data.user.id)
      .single();
    
    if (userError) {
      console.error('Error getting user data:', userError);
    }
    
    return {
      id: data.user.id,
      email: data.user.email,
      role: userData?.role || 'student',
      full_name: userData?.full_name || null,
      avatar_url: userData?.avatar_url || null,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at || data.user.created_at
    };
  } catch (error) {
    return null;
  }
}

// تحديث بيانات المستخدم
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
): Promise<{ success: boolean; error: AuthError | null }> {
  try {
    // تحقق من البيانات المحدثة
    const validUpdates: any = {};
    
    // فقط قم بتضمين الحقول المسموح بها
    if (updates.full_name !== undefined) validUpdates.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) validUpdates.avatar_url = updates.avatar_url;
    if (updates.cloudinary_avatar_id !== undefined) validUpdates.cloudinary_avatar_id = updates.cloudinary_avatar_id;
    
    // تحديث بيانات المستخدم في جدول المستخدمين
    const { error } = await supabase
      .from('users')
      .update(validUpdates)
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: { message: error.message } };
    }
    
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: { message: 'حدث خطأ أثناء تحديث البيانات' } };
  }
}

// إعادة تعيين كلمة المرور
export async function resetPassword(email: string): Promise<{ success: boolean; error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: { message: 'حدث خطأ أثناء إرسال رابط إعادة تعيين كلمة المرور' } };
  }
}
