// app/layout.tsx
import { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import Navbar from '@/components/ui/Navbar';
import './globals.css';
import Footer from '@/components/footer';
export const metadata = {
  title: 'GradTrack',
  description: 'GradTrack - تتبع تقدم مشروع تخرجك',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              {children}
            </main>
           <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}