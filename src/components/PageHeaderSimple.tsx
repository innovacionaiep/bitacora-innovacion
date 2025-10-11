'use client';

import { UserAvatar } from '@/components/UserAvatar';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], weight: ['700'] }); // Bold para el título

export default function PageHeaderSimple() {
  return (
    <div className="relative w-full bg-background">
      <header className="border-b shadow-sm">
        <div className="px-4 py-2 flex justify-between items-center">
          {/* Título BITACORA en el extremo izquierdo */}
          <div className="flex-shrink-0">
            <h1 className={`${inter.className} text-3xl font-bold tracking-tight text-gray-900`}>BITACORA</h1>
          </div>

          {/* Avatar de usuario en el extremo derecho */}
          <div className="flex-shrink-0">
            <UserAvatar />
          </div>
        </div>
      </header>
    </div>
  );
}
