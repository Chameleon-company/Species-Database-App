export interface User {
  user_id: number;
  name: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
