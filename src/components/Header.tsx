'use client';

import Link from 'next/link';
import Logo from './Logo';

// El componente ahora recibe user como prop en lugar de usar useAuth()
export default function Header({ user }) {
  // Si no hay usuario, no mostramos el header
  if (!user) return null;

  const userDisplayName = user.full_name || user.email || '';
  const userInitial = userDisplayName.charAt(0);

  return (
    <header className="bg-white backdrop-blur-md bg-opacity-95 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Logo />
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <Link href="/profile" className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={userDisplayName}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="text-indigo-600 font-semibold">
                  {userInitial}
                </span>
              )}
            </div>
            <span className="text-gray-700">{userDisplayName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}