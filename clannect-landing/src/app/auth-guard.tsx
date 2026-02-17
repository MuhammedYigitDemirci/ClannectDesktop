"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("🔍 Calling check-session API...");
        
        // Call the app's session check endpoint
        const response = await fetch("https://app.clannect.com/api/check-session", {
          method: "GET",
          credentials: "include", // Include cookies from app.clannect.com
        });

        console.log("📡 API Response status:", response.status);
        
        const data = await response.json();
        console.log("📋 API Response data:", data);

        if (data.authenticated && data.user) {
          // User is logged in, redirect to hub
          console.log("✅ User authenticated:", data.user.email);
          console.log("🔄 Redirecting to hub...");
          router.push("https://app.clannect.com/hub");
          return;
        } else {
          console.log("❌ Not authenticated");
        }
      } catch (error) {
        console.error("❌ Session check error:", error);
      }

      setIsChecked(true);
    };

    console.log("🚀 AuthGuard mounted, starting session check");
    checkSession();
  }, [router]);

  if (!isChecked) {
    console.log("⏳ Waiting for auth check...");
    return null;
  }

  return <>{children}</>;
}
