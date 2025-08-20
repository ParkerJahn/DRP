import { Timestamp } from 'firebase/firestore';

// Core User Types
export type UserRole = 'PRO' | 'STAFF' | 'ATHLETE';
export type ProStatus = 'inactive' | 'active';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoURL?: string;
  role: UserRole;
  proId?: string; // which PRO owns this user (self if PRO)
  seats?: {
    staffLimit: number;
    athleteLimit: number;
  }; // only for PRO
  createdAt: Timestamp;
  updatedAt: Timestamp;
  proStatus?: ProStatus; // for PRO billing status
}

// Team Management
export interface Team {
  proId: string;
  name: string;
  membersCount: {
    staff: number;
    athlete: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Invite System
export interface Invite {
  proId: string;
  role: 'STAFF' | 'ATHLETE';
  email?: string; // optional email constraint
  tokenHash: string; // hashed, signed token
  expiresAt: Timestamp;
  claimedBy?: string; // uid if claimed
  createdAt: Timestamp;
}

// Chat System
export interface Chat {
  proId: string;
  createdBy: string; // uid
  lastMessage?: {
    text: string;
    at: Timestamp;
    by: string;
  };
  members: string[]; // array of uids (size-limited)
  createdAt: Timestamp;
}

export interface Message {
  chatId: string;
  by: string;
  text: string;
  createdAt: Timestamp;
}

// Calendar & Events
export type EventType = 'availability' | 'session' | 'booking' | 'meeting';
export type EventVisibility = 'team' | 'attendees';

export interface Event {
  proId: string;
  title: string;
  type: EventType;
  startsAt: Timestamp;
  endsAt: Timestamp;
  createdBy: string;
  attendees: string[]; // uids (athlete included if relevant)
  visibility: EventVisibility;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Payment System
export type PaymentStatus = 'succeeded' | 'processing' | 'requires_action' | 'failed';

export interface Payment {
  proId: string;
  payerUid: string; // athlete uid
  amount: number; // cents
  currency: string;
  stripePaymentIntentId: string;
  status: PaymentStatus;
  createdAt: Timestamp;
}

// SWEATsheet Program System
export type ProgramStatus = 'current' | 'archived' | 'draft';

export interface Program {
  id?: string; // Firestore document id (present on reads)
  proId: string;
  athleteUid: string;
  title: string;
  status: ProgramStatus;
  phases: [Phase, Phase, Phase, Phase]; // fixed 4 phases
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Phase {
  name: string; // e.g., Prep, Strength, Power, Recovery
  blocks: Block[];
}

export interface Block {
  muscleGroup: string;
  exercises: Exercise[];
  notes?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  load?: string; // optional weight prescription
  tempo?: string;
  restSec?: number;
  // UI-extended fields (optional) used by Programs page
  category?: string;
  exerciseName?: string;
  completed?: boolean;
  // Per-set selections (render-only; optional for persistence)
  repsBySet?: Record<number, string>;
  weightBySet?: Record<number, string>;
  // Back-compat with current save shape
  repsMap?: Record<number, string>;
  weightMap?: Record<number, string>;
  // Current implementation uses these keys in saves
  repsObject?: Record<number, string>;
  weightObject?: Record<number, string>;
  // Some code writes directly as reps/weight objects
  repsValues?: Record<number, string>;
  weightValues?: Record<number, string>;
  // Allow generic maps named reps/weight as well
  repsRecord?: Record<number, string>;
  weightRecord?: Record<number, string>;
  repsOptional?: Record<number, string>;
  weightOptional?: Record<number, string>;
  // Minimal compatibility: allow extra keys without failing type checks
  [key: string]: unknown;
}

// Auth Context Types
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  proId: string | null;
  proStatus: ProStatus | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Form Types
export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  accountType: 'client' | 'pro' | 'staff';
}

export interface SignInFormData {
  email: string;
  password: string;
} 