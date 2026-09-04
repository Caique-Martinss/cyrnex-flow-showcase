import { LoadingState } from '../../components/ui/PageState';
import { usePlatformAdminSession } from '../../hooks/usePlatformAdminSession';
import { PlatformAdminDashboard } from './PlatformAdminDashboard';
import { PlatformAdminLogin } from './PlatformAdminLogin';

export function PlatformAdminApp() {
  const auth = usePlatformAdminSession();
  if (auth.loading) return <LoadingState />;
  if (!auth.session) {
    return (
      <PlatformAdminLogin
        submitting={auth.submitting}
        error={auth.error}
        onSubmit={auth.signIn}
      />
    );
  }
  return <PlatformAdminDashboard session={auth.session} onLogout={auth.signOut} />;
}
