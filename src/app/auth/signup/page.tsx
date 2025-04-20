'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
// import { useTranslations } from 'next-intl';

export default function SignupPage() {
  // const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // تعريف مخطط التحقق من البيانات
  const signupSchema = z.object({
    fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    confirmPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    role: z.enum(['student', 'supervisor'], {
      required_error: 'يجب أن يختار الدور',
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'كلمة المرور وتأكيد كلمة المرور غير متطابقين',
    path: ['confirmPassword'],
  });

  type SignupFormValues = z.infer<typeof signupSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { user, error } = await signUp(data.email, data.password, data.fullName, data.role);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('تم إنشاء الحساب بنجاح');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err) {
      setError('فشل إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      // سيتم إعادة توجيه المستخدم تلقائيًا بواسطة Supabase
    } catch (err) {
      setError('فشل تسجيل الدخول بواسطة Google');
      setIsLoading(false);
    }
  };

  // استخراج مكونات واجهة المستخدم الفرعية لتحسين قابلية القراءة
  const FormHeader = () => (
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">
        إنشاء حساب
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        أو
        <a
          href="/auth/login"
          className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          تسجيل الدخول بدلاً من ذلك
        </a>
      </p>
    </div>
  );

  const StatusMessages = () => (
    <>
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-100 shadow-sm animate-fadeIn">
          <div className="flex">
            <div className="text-sm text-red-700 font-medium">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4 border border-green-100 shadow-sm animate-fadeIn">
          <div className="flex">
            <div className="text-sm text-green-700 font-medium">{success}</div>
          </div>
        </div>
      )}
    </>
  );

  const FormInput = ({ id, label, type, placeholder, error }: { id: string, label: string, type: string, placeholder: string, error: any }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 text-right">
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...register(id as keyof SignupFormValues)}
        className="relative block w-full rounded-md border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition-all"
        placeholder={placeholder}
        dir="rtl"
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );

  const FormInputs = () => (
    <div className="rounded-md shadow-sm space-y-4">
      <FormInput
        id="fullName"
        label="الاسم الكامل"
        type="text"
        placeholder="أدخل الاسم الكامل"
        error={errors.fullName}
      />
      
      <FormInput
        id="email"
        label="البريد الإلكتروني"
        type="email"
        placeholder="أدخل البريد الإلكتروني"
        error={errors.email}
      />
      
      <FormInput
        id="password"
        label="كلمة المرور"
        type="password"
        placeholder="أدخل كلمة المرور"
        error={errors.password}
      />
      
      <FormInput
        id="confirmPassword"
        label="تأكيد كلمة المرور"
        type="password"
        placeholder="أدخل تأكيد كلمة المرور"
        error={errors.confirmPassword}
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
          الدور
        </label>
        <div className="flex space-x-4 space-x-reverse justify-end">
          <div className="flex items-center">
            <input
              id="role-student"
              type="radio"
              value="student"
              {...register("role")}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              defaultChecked
            />
            <label htmlFor="role-student" className="mr-2 block text-sm text-gray-700">
              طالب
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="role-supervisor"
              type="radio"
              value="supervisor"
              {...register("role")}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="role-supervisor" className="mr-2 block text-sm text-gray-700">
              مشرف
            </label>
          </div>
        </div>
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>
    </div>
  );

  const SubmitButton = () => (
    <button
      type="submit"
      disabled={isLoading}
      className="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70 transition-colors"
    >
      {isLoading ? 'جاري التحقق...' : 'إنشاء حساب'}
    </button>
  );

  const SocialSignup = () => (
    <div className="mt-8">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-50 px-4 text-gray-500 font-medium">أو تسجيل الدخول بواسطة</span>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="group relative flex w-full justify-center items-center rounded-md border border-gray-300 bg-white py-2.5 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300 disabled:opacity-70 transition-colors"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          تسجيل الدخول بواسطة Google
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-lg shadow-md">
        <FormHeader />
        <StatusMessages />

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <FormInputs />
          <SubmitButton />
        </form>

        <SocialSignup />
      </div>
    </div>
  );
} 