import { redirect } from 'next/navigation';

export default async function CallbackPage({
  searchParams
}: {
  searchParams: { code?: string; state?: string; error?: string }
}) {
  // Get the query parameters from the URL
  const code = searchParams.code;
  const state = searchParams.state;
  const error = searchParams.error;

  // Construct the API URL with the same parameters
  const apiUrl = new URL('/api/auth/callback', 'http://localhost:3000');
  
  if (code) {
    apiUrl.searchParams.set('code', code);
  }
  
  if (state) {
    apiUrl.searchParams.set('state', state);
  }
  
  if (error) {
    apiUrl.searchParams.set('error', error);
  }
  
  // Redirect to the API route
  redirect(apiUrl.pathname + apiUrl.search);
} 