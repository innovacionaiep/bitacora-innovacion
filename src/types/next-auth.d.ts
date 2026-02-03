import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      activeRole: string | null;
      availableRoles: string[];
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    activeRole: string | null;
    availableRoles?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    activeRole: string | null;
    availableRoles: string[];
  }
}
