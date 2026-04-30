"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/utils/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

/* ════════════════════ types ════════════════════ */

interface AuthState {
  /** Firebase user (null while loading or unauthenticated) */
  user: User | null;
  /** Firestore /users/{uid} document data */
  userData: Record<string, string> | null;
  /** True while the initial auth check is running */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  userData: null,
  loading: true,
});

/* ═══════════════════ provider ═══════════════════ */

/**
 * AuthProvider
 *
 * Wraps dashboard/analytics routes.
 * - Listens to Firebase auth state once.
 * - Fetches the user doc from Firestore.
 * - Redirects to / if unauthenticated, /onboarding if no user doc.
 * - Shows a loading spinner while resolving.
 * - Provides { user, userData } to all children via context.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            setState({
              user: u,
              userData: userDoc.data() as Record<string, string>,
              loading: false,
            });
          } else {
            router.push("/onboarding");
          }
        } else {
          router.push("/");
        }
      } catch (err) {
        console.error("[AuthProvider]", err);
        router.push("/");
      }
    });
    return () => unsub();
  }, [router]);

  // Full-page spinner while auth resolves
  if (state.loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #e5e7eb",
            borderTopColor: "#10b981",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
  );
}

/* ═══════════════════ hook ═══════════════════ */

export function useAuth() {
  return useContext(AuthContext);
}
