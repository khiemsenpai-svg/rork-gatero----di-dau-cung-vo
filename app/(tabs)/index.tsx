import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function RootIndex() {
  const { user } = useAuth();
  
  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }
  
  return <Redirect href="/home" />;
}