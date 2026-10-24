// Authentication and Role-Based Access Control
import { User, UserRole } from '../types';

export const DEMO_USERS: Record<UserRole, User> = {
  Admin: {
    id: 'usr-admin-01',
    name: 'Dr. Rajesh Sharma',
    email: 'admin.rajesh@demo.edu.in',
    role: 'Admin',
    institution: 'National Institute of Technology (Demo Staff)',
  },
  Reviewer: {
    id: 'usr-reviewer-01',
    name: 'Prof. Priya Nair',
    email: 'reviewer.priya@demo.edu.in',
    role: 'Reviewer',
    institution: 'National Institute of Technology (Demo Staff)',
  },
  Viewer: {
    id: 'usr-viewer-01',
    name: 'Arun Kulkarni',
    email: 'viewer.arun@demo.edu.in',
    role: 'Viewer',
    institution: 'National Institute of Technology (Demo Staff)',
  },
};

export type AppAction =
  | 'create:student'
  | 'edit:student'
  | 'delete:student'
  | 'run:validation'
  | 'update:review_status'
  | 'manage:settings'
  | 'reset:demo_data'
  | 'export:data'
  | 'import:data';

export function can(role: UserRole | undefined, action: AppAction): boolean {
  if (!role) return false;

  switch (action) {
    case 'delete:student':
    case 'manage:settings':
    case 'reset:demo_data':
      return role === 'Admin';

    case 'create:student':
    case 'edit:student':
    case 'run:validation':
    case 'update:review_status':
    case 'import:data':
      return role === 'Admin' || role === 'Reviewer';

    case 'export:data':
      return role === 'Admin' || role === 'Reviewer' || role === 'Viewer';

    default:
      return false;
  }
}
