import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { getUserRoles } from '@/lib/auth-utils';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
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
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
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
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Email o password incorrectos');
        }

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
      }

      // Update session (cuando se llama update() desde el cliente)
      if (trigger === 'update' && session) {
        console.log('JWT callback - trigger update:', session);
        
        if (session.activeRole !== undefined) {
          token.activeRole = session.activeRole;
          console.log('Updated activeRole to:', session.activeRole);
        }
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.image !== undefined) {
          token.picture = session.image;
        }

        // Refrescar roles disponibles
        if (token.id) {
          try {
            const roles = await getUserRoles(token.id as string);
            // Eliminar duplicados
            token.availableRoles = Array.from(new Set(roles));
            console.log('Refreshed availableRoles:', token.availableRoles);
          } catch (error) {
            console.error('Error refreshing roles:', error);
            // Mantener los roles existentes si hay error
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.activeRole = token.activeRole as string | null;
        session.user.availableRoles = token.availableRoles as string[];
        
        console.log('Session callback - User data:', {
          id: session.user.id,
          activeRole: session.user.activeRole,
          availableRoles: session.user.availableRoles
        });
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

