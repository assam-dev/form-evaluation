"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { currentUser, logoutUser, useDB } from "../../lib/store";

// "Account" dropdown in the navbar. Shows the logged-in user's name.
export default function AccountMenu() {
  const db = useDB();
  const router = useRouter();
  const user = currentUser(db);

  return (
    <div className="group relative">
      <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm">
        {user ? user.name : "Account"}
        <span className="text-xs transition-transform group-hover:rotate-180">▾</span>
      </button>
      <div className="dropdown-menu absolute right-0 top-full z-50 hidden min-w-48 overflow-hidden rounded-lg py-1 shadow-lg group-focus-within:block group-hover:block">
        {user && <p className="px-4 py-2 text-xs opacity-70">{user.email}</p>}
        <Link href="/about" className="dropdown-link block px-4 py-2 text-sm">
          About
        </Link>
        {user ? (
          <button
            type="button"
            className="dropdown-link block w-full px-4 py-2 text-left text-sm font-normal"
            onClick={() => {
              logoutUser();
              router.push("/login");
            }}
          >
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="dropdown-link block px-4 py-2 text-sm">
              Login
            </Link>
            <Link href="/register" className="dropdown-link block px-4 py-2 text-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
