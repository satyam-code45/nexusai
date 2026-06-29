import { AuthButton } from "./AuthButton";
import { useSession, signOut } from 'next-auth/react';

const AccountButton = () => {

  
  const { data: session } = useSession()

  return (
    <div className="border-t border-border mt-auto p-2">
      <div
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2
                   transition-colors hover:bg-muted"
      >
        {/* Avatar */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
          <AuthButton session={session} />
        </span>

        {/* User info */}
        <div className="flex min-w-0 flex-1 flex-col text-left">
          <p className="truncate text-sm font-medium text-foreground">
             {session?.user?.name}
          </p>
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            Personal account
          </p>
        </div>

      
      </div>
    </div>
  );
};


export default AccountButton;