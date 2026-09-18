"use client";
import { Suspense } from "react";
import ClaimForm from "@/components/claims/ClaimForm";

export default function NewClaimPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Claim</h1>
      <Suspense fallback={null}>
        <ClaimForm />
      </Suspense>
    </div>
  );
}
