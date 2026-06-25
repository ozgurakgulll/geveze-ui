import { createContext, useContext, type ReactNode } from 'react';
import type { User } from '@/types';

const UsersContext = createContext<User[]>([]);

export function UsersProvider({ users, children }: { users: User[]; children: ReactNode }) {
  return <UsersContext.Provider value={users}>{children}</UsersContext.Provider>;
}

export function useUsers(): User[] {
  return useContext(UsersContext);
}
