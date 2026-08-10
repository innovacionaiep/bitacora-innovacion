import NextAuth, { type NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getUserRoles } from '@/lib/auth-utils';
import {
  buildRoleClaims,
  shouldRefreshJwtRoles,
} from '@/lib/auth/sync-session-roles';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y password son requeridos');
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            image: true,
            activeRole: true,
          },
        });

        if (!user || !user.password) {
          throw new Error('Email o password incorrectos');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Email o password incorrectos');
        }

        // last_active: fire-and-forget (same pattern as session callback)
        prisma
          .$executeRaw`UPDATE users SET last_active_at = NOW() WHERE id = ${user.id}`
          .catch(() => {});

        // Obtener roles del usuario
        const roles = await getUserRoles(user.id);

        // Eliminar duplicados de roles antes de retornar
        const uniqueRoles = Array.from(new Set(roles));

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          activeRole: user.activeRole,
          availableRoles: uniqueRoles,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.activeRole = user.activeRole;
        token.availableRoles = user.availableRoles || [];
        token.rolesRefreshedAt = Date.now();
      }

      // Client session.update({ name }) etc.
      if (trigger === 'update' && session?.name !== undefined) {
        token.name = session.name;
      }

      // Re-sync enabled roles from DB while the user stays logged in.
      // Throttled so getSession()/server actions do not pay 2 DB queries every time.
      // Client SessionProvider refetch + session.update() still rewrite the cookie.
      if (token.id) {
        const now = Date.now();
        const forceRefresh = trigger === 'update';
        if (
          forceRefresh ||
          shouldRefreshJwtRoles(
            token.rolesRefreshedAt as number | undefined,
            now
          )
        ) {
          try {
            const [roles, dbUser] = await Promise.all([
              getUserRoles(token.id as string),
              prisma.user.findUnique({
                where: { id: token.id as string },
                select: { activeRole: true },
              }),
            ]);
            const claims = buildRoleClaims(roles, dbUser?.activeRole ?? null);
            token.availableRoles = claims.availableRoles;
            token.activeRole = claims.activeRole;
            token.rolesRefreshedAt = now;
          } catch {
            // Keep existing roles on refresh failure
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Actualizar "última actividad" cuando el usuario usa la plataforma (throttle: máx. 1 vez cada 5 min por usuario)
      if (token.id) {
        prisma
          .$executeRaw`UPDATE users SET last_active_at = NOW() WHERE id = ${token.id} AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '5 minutes')`
          .catch(() => {});
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.activeRole = token.activeRole as string | null;
        session.user.availableRoles = token.availableRoles as string[];
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Solo con NEXTAUTH_DEBUG=true para evitar el warning DEBUG_ENABLED en desarrollo
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
