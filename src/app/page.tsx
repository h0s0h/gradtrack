'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

// Props interfaces for components
interface ButtonProps {
  children: ReactNode;
  primary?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}

interface StatCounterProps {
  value: number;
  label: string;
  suffix?: string;
  icon: ReactNode;
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

interface TestimonialCardProps {
  name: string;
  role: string;
  text: string;
}

interface HowToStepProps {
  number: number;
  title: string;
  description: string;
  isReversed?: boolean;
}

// مكونات أساسية
const Button = ({ children, primary = false, onClick, href, className = "" }: ButtonProps) => {
  const baseClass = primary 
    ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md" 
    : "bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all";
  
  const btnClass = `${baseClass} ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={btnClass}>
        {children}
      </Link>
    );
  }
  
  return (
    <button onClick={onClick} className={btnClass}>
      {children}
    </button>
  );
};

// مكون العداد للإحصائيات - تحسين المظهر بإضافة تأثيرات وأيقونات
const StatCounter = ({ value, label, suffix = "", icon }: StatCounterProps) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let startValue = 0;
          const increment = Math.ceil(value / 50);
          
          const timer = setInterval(() => {
            startValue += increment;
            if (startValue > value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(startValue);
            }
          }, 20);
          
          if (counterRef.current) {
            observer.unobserve(counterRef.current);
          }
        }
      },
      { threshold: 0.5 }
    );
    
    if (counterRef.current) {
      observer.observe(counterRef.current);
    }
    
    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, [value]);
  
  return (
    <div className="text-center" ref={counterRef}>
      <div className="bg-white/30 rounded-xl py-8 px-6 backdrop-blur-sm hover:bg-white/40 transition-all transform hover:-translate-y-1 border-t border-white/50 shadow-lg">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white">
            {icon}
          </div>
        </div>
        <p className="text-4xl font-bold mb-2 text-white drop-shadow-md">
          {count.toLocaleString()}{suffix}
        </p>
        <p className="text-lg text-white/90">{label}</p>
      </div>
    </div>
  );
};

// مكون الميزة - تحسين مظهر البطاقات
const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-b-4 border-blue-500 relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-100/80 to-transparent rounded-bl-full -mr-20 -mt-20 group-hover:scale-110 transition-all"></div>
    <div className="relative z-10">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-6 text-white shadow-md transform group-hover:rotate-6 transition-all">
        {icon}
      </div>
      <h4 className="text-2xl font-semibold mb-3 text-gray-800">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  </div>
);

// مكون الشهادة - تحسين مظهر البطاقات
const TestimonialCard = ({ name, role, text }: TestimonialCardProps) => (
  <div className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100/50 rounded-full -ml-16 -mt-16 group-hover:scale-110 transition-all"></div>
    <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full -mr-16 -mb-16 group-hover:scale-110 transition-all"></div>
    
    <div className="relative z-10">
      <div className="flex items-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mr-4 flex items-center justify-center text-white font-bold text-xl shadow-md">
          {name.charAt(0)}
        </div>
        <div>
          <h4 className="font-semibold text-lg">{name}</h4>
          <p className="text-blue-600 text-sm">{role}</p>
        </div>
      </div>
      <div className="relative">
        <svg className="text-blue-200 w-12 h-12 absolute -top-6 -right-2 opacity-40" fill="currentColor" viewBox="0 0 32 32">
          <path d="M10 8c-2.2 0-4 1.8-4 4v10h8V12h-4c0-2.2 1.8-4 4-4V8zm12 0c-2.2 0-4 1.8-4 4v10h8V12h-4c0-2.2 1.8-4 4-4V8z" />
        </svg>
        <p className="text-gray-700 leading-relaxed relative z-10">{text}</p>
      </div>
    </div>
  </div>
);

// مكون خطوة الاستخدام - تحسين المظهر
const HowToStep = ({ number, title, description, isReversed = false }: HowToStepProps) => (
  <div className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center mb-48 gap-10`}>
    <div className={`md:w-1/2 mb-6 md:mb-0 ${isReversed ? 'md:pl-12' : 'md:pr-12'} mx-10`}>
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 ">
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 flex items-center px-4">
            <div className="flex space-x-2 rtl:space-x-reverse">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 aspect-video flex items-center justify-center p-6">
            <div className="text-7xl font-bold text-blue-500/10 absolute">{number}</div>
            <div className="relative z-10 bg-white/80 backdrop-blur-sm py-5 px-8 rounded-xl shadow-md border border-blue-100 transform rotate-1 hover:rotate-0 transition-all">
              <p className="text-blue-800 font-medium text-xl">{title}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="md:w-1/2">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-lg border-r-4 border-blue-500">
        <div className="inline-block bg-blue-100 text-blue-700 rounded-full px-4 py-1 text-sm font-medium mb-4">خطوة {number}</div>
        <h4 className="text-2xl font-semibold mb-4 text-gray-800">{title}</h4>
        <p className="text-gray-700 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const featuresRef = useRef<HTMLElement>(null);

  // التمرير إلى قسم المميزات
  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // بيانات المميزات
  const features = [
    {
      title: "تتبع التقدم الأكاديمي",
      description: "متابعة تقدم المشاريع بشكل مرئي وسهل، مع إحصائيات تفصيلية عن الإنجازات والمهام المتبقية والمواعيد النهائية.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      title: "تفاعل مباشر",
      description: "تواصل فعال بين الطلاب والمشرفين من خلال نظام تعليقات متطور ومشاركة الملفات ومحادثات في الوقت الحقيقي.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      )
    },
    {
      title: "تنبيهات ذكية",
      description: "إشعارات فورية عند وجود تحديثات أو تعليقات جديدة، مع تنبيهات عند تباطؤ العمل والمواعيد القادمة المهمة.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      title: "تقارير وإحصائيات",
      description: "احصل على تقارير تفصيلية وإحصائيات دقيقة حول تقدم المشروع والمهام المنجزة مع رسوم بيانية تفاعلية وتحليلات متقدمة.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  // بيانات الشهادات
  const testimonials = [
    {
      name: "عبدالله محمد",
      role: "طالب دكتوراه",
      text: "ساعدتني منصة GradTrack في تنظيم مشروع أطروحتي وسهلت التواصل مع المشرف بشكل كبير. الآن أستطيع تتبع تقدمي بسهولة والحصول على تعليقات فورية حول عملي."
    },
    {
      name: "سارة أحمد",
      role: "أستاذة مساعدة",
      text: "أصبح الإشراف على مشاريع الطلاب أكثر فعالية وتنظيماً مع استخدام منصة GradTrack. أستطيع متابعة تقدم جميع طلابي من مكان واحد والتواصل معهم بسهولة."
    },
    {
      name: "محمد خالد",
      role: "طالب ماجستير",
      text: "التنبيهات الذكية والمتابعة اليومية ساعدتني على البقاء ملتزماً بجدول مشروعي. التقارير الإحصائية تعطيني دافعاً للاستمرار وتحسين أدائي باستمرار."
    }
  ];

  const howToSteps = [
    {
      title: "إنشاء حساب وبدء مشروع جديد",
      description: "قم بالتسجيل في المنصة وإنشاء مشروعك الأول بخطوات بسيطة، ثم أضف المشرفين وزملاء الفريق. يمكنك تخصيص المشروع حسب احتياجاتك وتحديد المهام والمراحل الرئيسية."
    },
    {
      title: "نشر التحديثات والتقدم",
      description: "شارك تقدمك في المشروع من خلال منشورات تتضمن النص والصور ومقتطفات الكود، وتلقى تعليقات المشرفين. يمكنك استخدام أدوات التنسيق المتقدمة لتنظيم محتواك بشكل احترافي."
    },
    {
      title: "متابعة الإحصائيات والتقدم",
      description: "استعرض إحصائيات تقدمك وتفاعل المشرفين مع منشوراتك، واحصل على تنبيهات ذكية لتحسين أدائك. يمكنك تحليل معدل إنجازك وتحديد المجالات التي تحتاج إلى تحسين."
    }
  ];

  // أيقونات للإحصائيات
  const statIcons = [
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" key="1">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>,
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" key="2">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>,
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" key="3">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" key="4">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  ];

  // معرض الصور المحسن
  const screenshots = [
    { title: "لوحة التحكم", color: "from-blue-100 to-blue-50", icon: "📊" },
    { title: "متابعة المشاريع", color: "from-indigo-100 to-indigo-50", icon: "📈" },
    { title: "التفاعل مع المشرفين", color: "from-blue-100 to-blue-50", icon: "💬" },
    { title: "التقارير الإحصائية", color: "from-indigo-100 to-indigo-50", icon: "📑" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 ">
      {/* الشريط العلوي - يظهر فقط للزوار غير المسجلين */}
      {!user && (
        <header className="bg-white backdrop-blur-md bg-opacity-95 shadow-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-3 py-1 rounded-lg mr-2 shadow-md">G</div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">GradTrack</h1>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Link href="/auth/login" className="text-gray-600 hover:text-blue-600 ml-4 transition-colors">
                تسجيل الدخول
              </Link>
              <Button primary href="/auth/signup">إنشاء حساب</Button>
            </div>
          </div>
        </header>
      )}

      {/* أزرار للمستخدمين المسجلين */}
      {user && (
        <div className="fixed bottom-8 left-8 z-50 flex gap-4">
          <Link href="/dashboard" className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">لوحة التحكم</span>
          </Link>
          
          <Link href="/projects/new" className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 border border-blue-200 rounded-full shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all transform hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-medium">مشروع جديد</span>
          </Link>
        </div>
      )}

      {/* القسم الرئيسي */}
      <main>
        {/* قسم الترحيب */}
        <section className={`${user ? 'py-20' : 'py-20'} bg-[url('/images/dots-pattern.png')] bg-repeat relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full opacity-20 blur-3xl"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-block mb-6 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 px-6 py-2 rounded-full text-blue-800 font-medium">
                منصة تعليمية متكاملة
              </div>
              <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent leading-tight">
                {user ? 'أهلاً بك في GradTrack' : 'تتبع مشاريعك الأكاديمية بسهولة وفعالية'}
              </h2>
              <p className="text-xl text-gray-700 mb-10 leading-relaxed">
                منصة متكاملة للطلاب والمشرفين لإدارة المشاريع الأكاديمية والتفاعل حولها بطريقة سلسة، مع أدوات متطورة للتحليل والمتابعة
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                {!user ? (
                  <>
                    <Button primary href="/auth/signup" className="text-lg px-8 py-4">ابدأ الآن مجاناً</Button>
                    <Button onClick={scrollToFeatures} className="text-lg">تعرف على المميزات</Button>
                  </>
                ) : (
                  <>
                    <Button primary href="/dashboard" className="text-lg px-8 py-4">الذهاب إلى لوحة التحكم</Button>
                    <Button href="/projects/new" className="text-lg">إنشاء مشروع جديد</Button>
                  </>
                )}
              </div>
            </div>

            {/* عرض الصور المحسن */}
            <div className="mt-20 text-center">
              <div className="max-w-5xl mx-auto overflow-hidden rounded-2xl shadow-2xl transform hover:-translate-y-2 transition-all">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-3 rounded-2xl">
                  <div className="bg-white p-4 rounded-xl">
                    <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 flex items-center px-4 rounded-t-lg">
                      <div className="flex space-x-2 rtl:space-x-reverse">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 w-full p-6">
                      {screenshots.map((screen, idx) => (
                        <div 
                          key={idx} 
                          className={`
                            bg-gradient-to-r ${screen.color}
                            rounded-xl flex items-center justify-center p-10 shadow-md hover:shadow-lg transition-all
                          `}
                        >
                          <div className="flex flex-col items-center">
                            <div className="text-4xl mb-4">{screen.icon}</div>
                            <p className="text-gray-700 font-medium">{screen.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* إحصائيات المنصة */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-800 skew-y-3 transform origin-top-right z-0"></div>
          <div className="absolute inset-0 bg-[url('/images/pattern.svg')] bg-repeat opacity-10 z-0"></div>
          
          <div className="container mx-auto px-4 relative z-10 py-12">
            <h3 className="text-4xl font-bold text-center mb-16 text-white drop-shadow-lg">إحصائيات المنصة</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <StatCounter value={5000} label="طالب مسجل" icon={statIcons[0]} />
              <StatCounter value={1200} label="مشرف أكاديمي" icon={statIcons[1]} />
              <StatCounter value={8500} label="مشروع منجز" icon={statIcons[2]} />
              <StatCounter value={98} suffix="%" label="رضا المستخدمين" icon={statIcons[3]} />
            </div>
          </div>
        </section>

        {/* قسم المميزات */}
        <section id="features" className="py-24 bg-white" ref={featuresRef}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 bg-blue-100 px-6 py-2 rounded-full text-blue-800 font-medium">
                ميزات فريدة
              </div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">مميزات المنصة</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <FeatureCard 
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              ))}
            </div>
          </div>
        </section>

        {/* شهادات المستخدمين */}
        <section className="py-24 bg-gradient-to-b from-blue-50 to-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full opacity-50 blur-3xl -ml-48 -mt-48"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full opacity-50 blur-3xl -mr-48 -mb-48"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-block mb-4 bg-blue-100 px-6 py-2 rounded-full text-blue-800 font-medium">
                تجارب حقيقية
              </div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">آراء المستخدمين</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, idx) => (
                <TestimonialCard
                  key={idx}
                  name={testimonial.name}
                  role={testimonial.role}
                  text={testimonial.text}
                />
              ))}
            </div>
          </div>
        </section>

        {/* كيفية الاستخدام */}
        <section className="py-24 bg-[url('/images/wave-pattern.svg')] bg-cover bg-center relative">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-block mb-4 bg-blue-100 px-6 py-2 rounded-full text-blue-800 font-medium">
                خطوات بسيطة
              </div>
              <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">كيفية الاستخدام</h3>
            </div>
            
            <div className="max-w-5xl mx-auto">
              {howToSteps.map((step, idx) => (
                <HowToStep
                  key={idx}
                  number={idx + 1}
                  title={step.title}
                  description={step.description}
                  isReversed={idx % 2 !== 0}
                />
              ))}
            </div>
          </div>
        </section>

        {/* دعوة للعمل */}
        <section className="py-24 bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-t-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] bg-repeat opacity-5"></div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              {!user ? (
                // للزوار: دعوة للتسجيل
                <>
                  <h3 className="text-5xl font-bold mb-8 leading-tight">جاهز للبدء؟</h3>
                  <p className="text-xl text-blue-100 mb-12 leading-relaxed">
                    انضم إلى مجتمع GradTrack اليوم وارتقِ بمستوى مشاريعك الأكاديمية. اكتشف كيف يمكن لمنصتنا أن تساعدك في تحقيق النجاح الأكاديمي.
                  </p>
                  <div className="flex justify-center">
                    <Button
                      href="/auth/signup"
                      className="bg-white text-blue-700 hover:bg-blue-500 hover:text-white rounded-full text-lg px-10 py-5 shadow-lg transition duration-300"
                    >
                      سجل الآن مجاناً
                    </Button>
                  </div>
                </>
              ) : (
                // للمستخدمين المسجلين: دعوة للذهاب للوحة التحكم أو إنشاء مشروع جديد
                <>
                  <h3 className="text-5xl font-bold mb-8 leading-tight">مرحباً بعودتك!</h3>
                  <p className="text-xl text-blue-100 mb-12 leading-relaxed">
                    استمر في العمل على مشاريعك أو ابدأ مشروعاً جديداً الآن. لوحة التحكم الخاصة بك جاهزة مع كل أدوات التحليل والمتابعة.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <Button
                      href="/dashboard"
                      className="bg-white text-blue-700 hover:bg-blue-500 hover:text-white rounded-full text-lg px-8 py-4 shadow-lg transition duration-300"
                    >
                      لوحة التحكم
                    </Button>
                    <Button
                      href="/projects/new"
                      className="bg-blue-600 border  text-slate-600 hover:text-white hover:bg-blue-700 rounded-full text-lg px-8 py-4 shadow-lg transition duration-300"
                    >
                      إنشاء مشروع جديد
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

     
    </div>
  );
}